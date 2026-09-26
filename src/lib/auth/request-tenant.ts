import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getTenantContext } from "@/lib/auth/tenant";

function hashKey(value:string){
  return crypto.createHash("sha256").update(value).digest("hex");
}

export async function resolveRequestTenant(req:NextRequest,opts?:{allowConnector?:boolean}){
  if(opts?.allowConnector){
    const key=req.headers.get("x-connector-key");
    if(key){
      const admin=createSupabaseAdminClient();
      const hash=hashKey(key);
      const {data}=await admin
        .from("connector_credentials")
        .select("tenant_id,id")
        .eq("key_hash",hash)
        .eq("active",true)
        .maybeSingle();
      if(data){
        await admin.from("connector_credentials").update({last_seen_at:new Date().toISOString()}).eq("id",data.id);
        return {tenantId:data.tenant_id,via:"connector" as const};
      }

      const legacy=process.env.CONNECTOR_INGEST_KEY;
      const legacyTenant=process.env.DEFAULT_TENANT_ID;
      if(legacyTenant&&legacy&&key===legacy){
        return {tenantId:legacyTenant,via:"legacy" as const};
      }
    }
  }

  const ctx=await getTenantContext();
  if(!ctx)return null;
  return {tenantId:ctx.tenantId,via:"session" as const,ctx};
}
