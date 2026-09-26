import Redis from "ioredis";

const g=globalThis as typeof globalThis & {__mercadoRedis?:Redis|null};

export function getSharedRedis(){
  if(g.__mercadoRedis!==undefined)return g.__mercadoRedis;
  const url=process.env.REDIS_URL?.trim();
  if(!url){g.__mercadoRedis=null;return null;}
  const client=new Redis(url,{
    lazyConnect:true,
    maxRetriesPerRequest:1,
    enableOfflineQueue:false,
    connectTimeout:3000
  });
  client.on("error",()=>{});
  g.__mercadoRedis=client;
  return client;
}

export async function withRedis<T>(fn:(redis:Redis)=>Promise<T>):Promise<T|null>{
  const redis=getSharedRedis();
  if(!redis)return null;
  try{
    if(redis.status==="wait")await redis.connect();
    return await fn(redis);
  }catch{
    return null;
  }
}
