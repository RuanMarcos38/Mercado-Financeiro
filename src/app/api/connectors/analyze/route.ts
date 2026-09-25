import { NextRequest,NextResponse } from "next/server";
import { getMarketStream } from "@/lib/connectors/market-stream";
import { analyzeForex } from "@/lib/forex/engine";
import { analyzeCandles } from "@/lib/analysis-engine";

export const dynamic="force-dynamic";

export async function GET(req:NextRequest){
  const source=req.nextUrl.searchParams.get("source")??"mt5";
  const symbol=(req.nextUrl.searchParams.get("symbol")??"EUR/USD").toUpperCase();
  const timeframe=req.nextUrl.searchParams.get("timeframe")??"5m";
  const stream=getMarketStream(source,symbol,timeframe);
  if(!stream) return NextResponse.json({error:"Stream ainda não recebido.",source,symbol,timeframe},{status:404});
  try{
    const isForex=source==="mt5"||String(stream.meta?.assetClass??"").toLowerCase()==="forex"||symbol.includes("/");
    const analysis=isForex
      ?analyzeForex(stream.candles,{sourceQuality:"licensed",newsRisk:.15})
      :analyzeCandles(stream.candles,{sourceQuality:"licensed",newsRisk:.15});
    return NextResponse.json({
      source,symbol,timeframe,lastSeen:stream.lastSeen,bid:stream.bid,ask:stream.ask,spread:stream.spread,
      candles:stream.candles.length,
      analysis
    });
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Falha na análise"},{status:400});
  }
}
