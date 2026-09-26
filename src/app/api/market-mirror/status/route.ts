import { NextResponse } from "next/server";
import { listGlobalMarketStreams } from "@/lib/connectors/market-stream";
export const dynamic="force-dynamic";
export async function GET(){
  const now=Date.now();
  const streams=listGlobalMarketStreams().map(s=>({
    source:s.source,symbol:s.symbol,timeframe:s.timeframe,lastSeen:s.lastSeen,candles:s.candles.length,
    ageSeconds:Math.max(0,Math.round((now-new Date(s.lastSeen).getTime())/1000)),
    online:(now-new Date(s.lastSeen).getTime())<120000,
    bid:s.bid,ask:s.ask,spread:s.spread
  }));
  return NextResponse.json({
    generatedAt:new Date().toISOString(),
    workerConfigured:Boolean(process.env.MARKET_WORKER_KEY),
    streams,
    online:streams.filter(x=>x.online).length
  });
}
