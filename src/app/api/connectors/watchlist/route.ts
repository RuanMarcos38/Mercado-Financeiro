import { NextRequest,NextResponse } from "next/server";
import { resolveRequestTenant } from "@/lib/auth/request-tenant";
import { addWatchItem,listWatchItems } from "@/lib/connectors/watchlist";

export const dynamic="force-dynamic";

export async function GET(req:NextRequest){
  const tenant=await resolveRequestTenant(req);
  if(!tenant)return NextResponse.json({error:"Não autenticado"},{status:401});
  return NextResponse.json({items:await listWatchItems(tenant.tenantId)});
}

export async function POST(req:NextRequest){
  const tenant=await resolveRequestTenant(req);
  if(!tenant)return NextResponse.json({error:"Não autenticado"},{status:401});
  try{
    const body=await req.json();
    const symbol=String(body.symbol??"").toUpperCase().replace("_","/");
    const timeframe=String(body.timeframe??"5m");
    if(!/^[A-Z]{3}\/[A-Z]{3}$/.test(symbol))return NextResponse.json({error:"Par inválido"},{status:400});
    if(!["1m","5m","10m","1h"].includes(timeframe))return NextResponse.json({error:"Período inválido"},{status:400});
    return NextResponse.json({ok:true,item:await addWatchItem(tenant.tenantId,symbol,timeframe)});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Falha ao observar ativo"},{status:400});
  }
}
