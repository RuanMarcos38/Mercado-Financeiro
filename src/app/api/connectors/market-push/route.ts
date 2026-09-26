import { NextRequest,NextResponse } from "next/server";
import { ingestMarketPush,type MarketPush } from "@/lib/connectors/market-stream";
import { processStream } from "@/lib/autotrade/engine";
import { resolveRequestTenant } from "@/lib/auth/request-tenant";
export const dynamic="force-dynamic";
export async function POST(req:NextRequest){
  const tenant=await resolveRequestTenant(req,{allowConnector:true});
  if(!tenant)return NextResponse.json({error:"Não autorizado"},{status:401});
  try{
    const body=await req.json() as MarketPush;
    if(!["mt5","profit"].includes(body.source))throw new Error("source deve ser mt5 ou profit");
    if(!body.symbol||!body.timeframe||!Array.isArray(body.candles))throw new Error("symbol, timeframe e candles são obrigatórios");
    const saved=ingestMarketPush(tenant.tenantId,body);
    const decision=processStream(tenant.tenantId,{
      source:saved.source,symbol:saved.symbol,timeframe:saved.timeframe,lastSeen:saved.lastSeen,candles:saved.candles,
      bid:saved.bid,ask:saved.ask,spread:saved.spread,meta:{...(saved.meta??{}),assetClass:body.assetClass}
    });
    return NextResponse.json({ok:true,source:saved.source,symbol:saved.symbol,timeframe:saved.timeframe,candles:saved.candles.length,lastSeen:saved.lastSeen,decision});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Payload inválido"},{status:400});
  }
}
