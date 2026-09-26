import { NextRequest,NextResponse } from "next/server";
import { getBestMarketStream,getMarketStream } from "@/lib/connectors/market-stream";
import { analyzeForex } from "@/lib/forex/engine";
import { analyzeCandles } from "@/lib/analysis-engine";
import { resolveRequestTenant } from "@/lib/auth/request-tenant";
import { getCandidates } from "@/lib/autotrade/store";

export const dynamic="force-dynamic";

export async function GET(req:NextRequest){
  const tenant=await resolveRequestTenant(req,{allowConnector:true});
  if(!tenant)return NextResponse.json({error:"Não autorizado"},{status:401});

  const requestedSource=req.nextUrl.searchParams.get("source")??"auto";
  const symbol=(req.nextUrl.searchParams.get("symbol")??"EUR/USD").toUpperCase();
  const timeframe=req.nextUrl.searchParams.get("timeframe")??"5m";

  const stream=requestedSource==="auto"
    ?getBestMarketStream(tenant.tenantId,symbol,timeframe)
    :getMarketStream(tenant.tenantId,requestedSource,symbol,timeframe);

  if(!stream){
    return NextResponse.json({
      ready:false,
      error:"Stream ainda não recebido.",
      source:requestedSource,
      symbol,timeframe
    },{status:404});
  }

  try{
    const professionalConnector=stream.source==="mt5"||stream.source==="profit";
    const isForex=String(stream.meta?.assetClass??"").toLowerCase()==="forex"||symbol.includes("/");
    const external=(stream.meta?.externalContext??{}) as any;
    const newsRisk=Number.isFinite(Number(external.newsRisk))?Number(external.newsRisk):.15;
    const analysis=(professionalConnector||isForex)
      ?analyzeForex(stream.candles,{sourceQuality:"licensed",newsRisk})
      :analyzeCandles(stream.candles,{sourceQuality:"licensed",newsRisk});

    const candidate=getCandidates(tenant.tenantId).find(
      x=>x.source===stream.source&&x.symbol===symbol&&x.timeframe===timeframe
    )??null;

    return NextResponse.json({
      ready:true,
      source:stream.source,
      symbol,timeframe,
      lastSeen:stream.lastSeen,
      bid:stream.bid,ask:stream.ask,spread:stream.spread,
      candleCount:stream.candles.length,
      series:stream.candles.slice(-300),
      candidate,
      externalContext:stream.meta?.externalContext??null,
      analysis
    });
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Falha na análise"},{status:400});
  }
}
