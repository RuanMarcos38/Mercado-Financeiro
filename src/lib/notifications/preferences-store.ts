import { withRedis } from "@/lib/shared/redis";

export type NotificationPreferences={
  tenant_id:string;
  whatsapp_enabled:boolean;
  whatsapp_e164:string;
  min_confidence:number;
  browser_enabled:boolean;
  updated_at?:string;
  updated_by?:string|null;
};

function key(tenantId:string){return "mercadoai:notification-preferences:"+tenantId;}

export async function getRedisNotificationPreferences(tenantId:string){
  const raw=await withRedis(redis=>redis.get(key(tenantId)));
  if(!raw)return null;
  try{return JSON.parse(raw) as NotificationPreferences;}catch{return null;}
}

export async function saveRedisNotificationPreferences(p:NotificationPreferences){
  const ok=await withRedis(async redis=>{
    await redis.set(key(p.tenant_id),JSON.stringify(p));
    return true;
  });
  return Boolean(ok);
}
