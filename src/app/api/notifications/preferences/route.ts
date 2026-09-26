import { NextRequest,NextResponse } from "next/server";
import { getTenantContext,canManageUsers } from "@/lib/auth/tenant";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getRedisNotificationPreferences,saveRedisNotificationPreferences } from "@/lib/notifications/preferences-store";

export const dynamic="force-dynamic";

const defaults=(tenantId:string)=>({
  tenant_id:tenantId,
  whatsapp_enabled:Boolean(process.env.MARKET_ALERT_WHATSAPP_E164),
  whatsapp_e164:process.env.MARKET_ALERT_WHATSAPP_E164??"",
  min_confidence:Number(process.env.MARKET_ALERT_MIN_CONFIDENCE||75),
  browser_enabled:true
});

export async function GET(){
  const ctx=await getTenantContext();
  if(!ctx)return NextResponse.json({error:"Não autenticado"},{status:401});

  try{
    const admin=createSupabaseAdminClient();
    const {data,error}=await admin.from("notification_preferences").select("*").eq("tenant_id",ctx.tenantId).maybeSingle();
    if(error)throw new Error(error.message);
    if(data)return NextResponse.json({...data,storage:"supabase"});
  }catch{}

  const redis=await getRedisNotificationPreferences(ctx.tenantId);
  if(redis)return NextResponse.json({...redis,storage:"redis"});

  return NextResponse.json({...defaults(ctx.tenantId),storage:"environment"});
}

export async function POST(req:NextRequest){
  const ctx=await getTenantContext();
  if(!ctx)return NextResponse.json({error:"Não autenticado"},{status:401});
  if(!canManageUsers(ctx.role))return NextResponse.json({error:"Sem permissão"},{status:403});

  try{
    const body=await req.json();
    const e164=String(body.whatsapp_e164??"").replace(/\D/g,"");
    const min=Math.max(0,Math.min(100,Number(body.min_confidence??75)));
    const payload={
      tenant_id:ctx.tenantId,
      whatsapp_e164:e164,
      whatsapp_enabled:Boolean(body.whatsapp_enabled)&&Boolean(e164),
      browser_enabled:body.browser_enabled!==false,
      min_confidence:min,
      updated_at:new Date().toISOString(),
      updated_by:ctx.userId
    };

    try{
      const admin=createSupabaseAdminClient();
      const {error}=await admin.from("notification_preferences").upsert(payload);
      if(!error)return NextResponse.json({ok:true,storage:"supabase"});
    }catch{}

    const saved=await saveRedisNotificationPreferences(payload);
    if(saved)return NextResponse.json({ok:true,storage:"redis"});

    return NextResponse.json({error:"Não há armazenamento persistente configurado para salvar os alertas."},{status:503});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Falha ao salvar alertas"},{status:400});
  }
}
