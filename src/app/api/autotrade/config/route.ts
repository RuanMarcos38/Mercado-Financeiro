import { NextRequest,NextResponse } from "next/server";
import { getAutoTradeConfig,setAutoTradeConfig } from "@/lib/autotrade/store";
import { getTenantContext,canManageUsers } from "@/lib/auth/tenant";
export const dynamic="force-dynamic";

export async function GET(){
 try{
  const ctx=await getTenantContext();
  if(!ctx)return NextResponse.json({error:"Não autenticado"},{status:401});
  const cfg=getAutoTradeConfig(ctx.tenantId);
  return NextResponse.json({...cfg,liveAllowed:process.env.AUTOTRADE_LIVE_ENABLED==="true",canEdit:canManageUsers(ctx.role)||ctx.role==="trader",role:ctx.role});
 }catch(error){
  return NextResponse.json({error:error instanceof Error?error.message:"Falha ao carregar configuração"},{status:500});
 }
}

export async function POST(req:NextRequest){
  const ctx=await getTenantContext();
  if(!ctx)return NextResponse.json({error:"Não autenticado"},{status:401});
  if(!(canManageUsers(ctx.role)||ctx.role==="trader"))return NextResponse.json({error:"Sem permissão para alterar AutoTrade"},{status:403});
  try{
    const body=await req.json();
    if(body.mode==="live"&&process.env.AUTOTRADE_LIVE_ENABLED!=="true"){
      return NextResponse.json({error:"Live bloqueado no servidor. Configure AUTOTRADE_LIVE_ENABLED=true."},{status:403});
    }
    const cfg=setAutoTradeConfig(ctx.tenantId,body);
    return NextResponse.json(cfg);
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Configuração inválida"},{status:400});
  }
}
