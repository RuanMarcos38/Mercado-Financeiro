import { NextRequest,NextResponse } from "next/server";
import { ingestMarketPush,type MarketPush } from "@/lib/connectors/market-stream";
import { processStream } from "@/lib/autotrade/engine";
import { resolveRequestTenant } from "@/lib/auth/request-tenant";
import { getExternalMarketContext } from "@/lib/market-intelligence/external-context";
import { notifyTenantOpportunity } from "@/lib/notifications/whatsapp";
import { persistSharedMarketStream } from "@/lib/connectors/shared-streams";
export const dynamic="force-dynamic";
export async function POST(req:NextRequest){
  const tenant=await resolveRequestTenant(req,{allowConnector:true});
  if(!tenant)return NextResponse.json({error:"Não autorizado"},{status:401});
  try{
    const body=await req.json() as MarketPush;
    if(!["mt5","profit"].includes(body.source))throw new Error("source deve ser mt5 ou profit");
    if(!body.symbol||!body.timeframe||!Array.isArray(body.candles))throw new Error("symbol, timeframe e candles são obrigatórios");
    const saved=ingestMarketPush(tenant.tenantId,body);
    await persistSharedMarketStream(saved);
    const external=await getExternalMarketContext(saved.symbol,body.assetClass);
    const decision=processStream(tenant.tenantId,{
      source:saved.source,symbol:saved.symbol,timeframe:saved.timeframe,lastSeen:saved.lastSeen,candles:saved.candles,
      bid:saved.bid,ask:saved.ask,spread:saved.spread,
      meta:{...(saved.meta??{}),assetClass:body.assetClass,externalContext:external},
      newsRisk:external.newsRisk
    });
    if(decision.ready&&decision.candidate?.status==="APTO"){
      notifyTenantOpportunity(tenant.tenantId,decision.candidate).catch(()=>{});
    }
    return NextResponse.json({ok:true,source:saved.source,symbol:saved.symbol,timeframe:saved.timeframe,candles:saved.candles.length,lastSeen:saved.lastSeen,external,decision});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Payload inválido"},{status:400});
  }
}
