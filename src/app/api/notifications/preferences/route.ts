import { NextRequest,NextResponse } from "next/server";
import { getTenantContext,canManageUsers } from "@/lib/auth/tenant";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic="force-dynamic";

export async function GET(){
  const ctx=await getTenantContext();
  if(!ctx)return NextResponse.json({error:"Não autenticado"},{status:401});
  try{
    const admin=createSupabaseAdminClient();
    const {data}=await admin.from("notification_preferences").select("*").eq("tenant_id",ctx.tenantId).maybeSingle();
    return NextResponse.json(data??{tenant_id:ctx.tenantId,whatsapp_enabled:false,whatsapp_e164:"",min_confidence:75,browser_enabled:true});
  }catch{
    return NextResponse.json({tenant_id:ctx.tenantId,whatsapp_enabled:false,whatsapp_e164:"",min_confidence:75,browser_enabled:true,warning:"Supabase admin ainda não configurado."});
  }
}

export async function POST(req:NextRequest){
  const ctx=await getTenantContext();
  if(!ctx)return NextResponse.json({error:"Não autenticado"},{status:401});
  if(!canManageUsers(ctx.role))return NextResponse.json({error:"Sem permissão"},{status:403});
  try{
    const body=await req.json();
    const e164=String(body.whatsapp_e164??"").replace(/\D/g,"");
    const min=Math.max(0,Math.min(100,Number(body.min_confidence??75)));
    const admin=createSupabaseAdminClient();
    const {error}=await admin.from("notification_preferences").upsert({
      tenant_id:ctx.tenantId,
      whatsapp_e164:e164||null,
      whatsapp_enabled:Boolean(body.whatsapp_enabled)&&Boolean(e164),
      browser_enabled:body.browser_enabled!==false,
      min_confidence:min,
      updated_at:new Date().toISOString(),
      updated_by:ctx.userId
    });
    if(error)throw new Error(error.message);
    return NextResponse.json({ok:true});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Falha ao salvar alertas"},{status:400});
  }
}
