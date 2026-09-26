import type { StreamState } from "@/lib/connectors/market-stream";
import { restoreMarketStreamState } from "@/lib/connectors/market-stream";
import { withRedis } from "@/lib/shared/redis";

function indexKey(tenantId:string){return "mercadoai:streams:"+tenantId;}
function streamKey(s:Pick<StreamState,"tenantId"|"source"|"symbol"|"timeframe">){
  return ["mercadoai","stream",s.tenantId,s.source,s.symbol.toUpperCase(),s.timeframe].join(":");
}

export async function persistSharedMarketStream(state:StreamState){
  const key=streamKey(state);
  await withRedis(async redis=>{
    const tx=redis.multi();
    tx.set(key,JSON.stringify(state),"EX",60*60*24);
    tx.sadd(indexKey(state.tenantId),key);
    tx.expire(indexKey(state.tenantId),60*60*24);
    await tx.exec();
    return true;
  });
}

export async function hydrateSharedMarketStreams(tenantId:string){
  const rows=await withRedis(async redis=>{
    const keys=await redis.smembers(indexKey(tenantId));
    if(!keys.length)return [] as string[];
    const values=await redis.mget(keys);
    return values.filter(Boolean) as string[];
  });
  if(!rows?.length)return 0;
  let count=0;
  for(const raw of rows){
    try{
      const state=JSON.parse(raw) as StreamState;
      if(state?.tenantId===tenantId&&state?.source&&state?.symbol&&state?.timeframe){
        restoreMarketStreamState(state);
        count++;
      }
    }catch{}
  }
  return count;
}
