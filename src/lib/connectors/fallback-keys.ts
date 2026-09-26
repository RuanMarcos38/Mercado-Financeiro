import crypto from "node:crypto";
import { withRedis } from "@/lib/shared/redis";

export type FallbackConnectorKey={
  id:string;
  tenantId:string;
  label:string;
  source:"mt5"|"profit"|"generic";
  keyHash:string;
  last4:string;
  active:boolean;
  createdAt:string;
  lastSeenAt:string|null;
};

const g=globalThis as typeof globalThis & {
  __fallbackConnectorKeys?:FallbackConnectorKey[];
};
if(!g.__fallbackConnectorKeys)g.__fallbackConnectorKeys=[];

function hash(v:string){
  return crypto.createHash("sha256").update(v).digest("hex");
}
function redisKey(h:string){return "mercadoai:connector-key:"+h;}
function redisTenantSet(tenantId:string){return "mercadoai:connector-keys:"+tenantId;}

export async function createFallbackConnectorKey(tenantId:string,label:string,source:FallbackConnectorKey["source"]){
  const plain="mai_"+crypto.randomBytes(32).toString("base64url");
  const row:FallbackConnectorKey={
    id:crypto.randomUUID(),tenantId,label,source,
    keyHash:hash(plain),last4:plain.slice(-4),active:true,
    createdAt:new Date().toISOString(),lastSeenAt:null
  };
  g.__fallbackConnectorKeys!.unshift(row);

  await withRedis(async redis=>{
    const tx=redis.multi();
    tx.set(redisKey(row.keyHash),JSON.stringify(row));
    tx.sadd(redisTenantSet(tenantId),row.keyHash);
    await tx.exec();
    return true;
  });
  return {plain,row};
}

export async function listFallbackConnectorKeys(tenantId:string){
  const local=g.__fallbackConnectorKeys!.filter(x=>x.tenantId===tenantId);
  const remote=await withRedis(async redis=>{
    const hashes=await redis.smembers(redisTenantSet(tenantId));
    if(!hashes.length)return [] as string[];
    const values=await redis.mget(hashes.map(redisKey));
    return values.filter(Boolean) as string[];
  });

  const merged=new Map<string,FallbackConnectorKey>();
  for(const row of local)merged.set(row.id,row);
  for(const raw of remote??[]){
    try{
      const row=JSON.parse(raw) as FallbackConnectorKey;
      if(row?.id&&row.tenantId===tenantId)merged.set(row.id,row);
    }catch{}
  }
  return [...merged.values()].sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
}

export async function revokeFallbackConnectorKey(tenantId:string,id:string){
  const rows=await listFallbackConnectorKeys(tenantId);
  const row=rows.find(x=>x.id===id);
  if(!row)return false;
  row.active=false;
  const local=g.__fallbackConnectorKeys!.find(x=>x.id===id);
  if(local)local.active=false;
  await withRedis(async redis=>{
    await redis.set(redisKey(row.keyHash),JSON.stringify(row));
    return true;
  });
  return true;
}

export async function resolveFallbackConnectorKey(value:string){
  const h=hash(value);
  let row=g.__fallbackConnectorKeys!.find(x=>x.keyHash===h&&x.active)??null;
  if(!row){
    const raw=await withRedis(redis=>redis.get(redisKey(h)));
    if(raw){
      try{
        const parsed=JSON.parse(raw) as FallbackConnectorKey;
        if(parsed.active)row=parsed;
      }catch{}
    }
  }
  if(!row)return null;
  row.lastSeenAt=new Date().toISOString();
  const existing=g.__fallbackConnectorKeys!.find(x=>x.id===row!.id);
  if(existing)existing.lastSeenAt=row.lastSeenAt;
  else g.__fallbackConnectorKeys!.unshift(row);
  await withRedis(async redis=>{
    await redis.set(redisKey(h),JSON.stringify(row));
    return true;
  });
  return row;
}
