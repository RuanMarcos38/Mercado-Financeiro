import { NextRequest,NextResponse } from "next/server";
import { claimNextIntent,listIntents,updateIntent } from "@/lib/autotrade/store";
import { resolveRequestTenant } from "@/lib/auth/request-tenant";
export const dynamic="force-dynamic";

export async function GET(req:NextRequest){
  const tenant=await resolveRequestTenant(req,{allowConnector:true});
  if(!tenant)return NextResponse.json({error:"Não autorizado"},{status:401});
  const source=req.nextUrl.searchParams.get("source")??"mt5";
  const symbol=req.nextUrl.searchParams.get("symbol")??undefined;
  const claim=req.nextUrl.searchParams.get("claim")==="1";
  return NextResponse.json(claim?{intent:claimNextIntent(tenant.tenantId,source,symbol)}:{intents:listIntents(tenant.tenantId).filter(x=>x.source===source)});
}

export async function POST(req:NextRequest){
  const tenant=await resolveRequestTenant(req,{allowConnector:true});
  if(!tenant)return NextResponse.json({error:"Não autorizado"},{status:401});
  try{
    const body=await req.json();
    return NextResponse.json(updateIntent(tenant.tenantId,String(body.id),body.status,body.note));
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Atualização inválida"},{status:400});
  }
}
