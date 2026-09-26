import { NextResponse } from "next/server";
import { getAudit,listIntents } from "@/lib/autotrade/store";
import { getTenantContext } from "@/lib/auth/tenant";
export const dynamic="force-dynamic";
export async function GET(){
  const ctx=await getTenantContext();
  if(!ctx)return NextResponse.json({error:"Não autenticado"},{status:401});
  return NextResponse.json({generatedAt:new Date().toISOString(),intents:listIntents(ctx.tenantId).slice(0,100),audit:getAudit(ctx.tenantId).slice(0,200)});
}
