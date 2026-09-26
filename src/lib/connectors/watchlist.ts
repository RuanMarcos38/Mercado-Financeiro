import { withRedis } from "@/lib/shared/redis";

type WatchItem={symbol:string;timeframe:string;updatedAt:string};

const g=globalThis as typeof globalThis & {__marketWatchlist?:Map<string,Map<string,WatchItem>>};
if(!g.__marketWatchlist)g.__marketWatchlist=new Map();

function memTenant(tenantId:string){
  if(!g.__marketWatchlist!.has(tenantId))g.__marketWatchlist!.set(tenantId,new Map());
  return g.__marketWatchlist!.get(tenantId)!;
}
function key(tenantId:string){return "mercadoai:watchlist:"+tenantId;}

export async function addWatchItem(tenantId:string,symbol:string,timeframe:string){
  const item={symbol:symbol.toUpperCase(),timeframe,updatedAt:new Date().toISOString()};
  memTenant(tenantId).set(item.symbol+"|"+timeframe,item);
  await withRedis(async redis=>{
    await redis.hset(key(tenantId),item.symbol+"|"+timeframe,JSON.stringify(item));
    await redis.expire(key(tenantId),60*60*24);
    return true;
  });
  return item;
}

export async function listWatchItems(tenantId:string){
  const remote=await withRedis(redis=>redis.hgetall(key(tenantId)));
  if(remote){
    for(const raw of Object.values(remote)){
      try{
        const item=JSON.parse(raw) as WatchItem;
        if(item?.symbol&&item?.timeframe)memTenant(tenantId).set(item.symbol+"|"+item.timeframe,item);
      }catch{}
    }
  }
  const cutoff=Date.now()-30*60*1000;
  return [...memTenant(tenantId).values()].filter(x=>new Date(x.updatedAt).getTime()>=cutoff);
}
