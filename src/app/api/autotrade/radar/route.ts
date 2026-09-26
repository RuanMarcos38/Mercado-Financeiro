import { NextResponse } from "next/server";
import { listMarketStreams,getMarketStream } from "@/lib/connectors/market-stream";
import { getAutoTradeConfig,getCandidates } from "@/lib/autotrade/store";
import { processStream } from "@/lib/autotrade/engine";

export const dynamic="force-dynamic";

export async function GET(){
  const streams=listMarketStreams();
  const warmup:any[]=[];

  for(const s of streams){
    const stream=getMarketStream(s.source,s.symbol,s.timeframe);
    if(!stream)continue;
    const result=processStream({
      source:s.source,
      symbol:s.symbol,
      timeframe:s.timeframe,
      lastSeen:s.lastSeen,
      candles:stream.candles,
      bid:stream.bid,
      ask:stream.ask,
      spread:stream.spread,
      meta:stream.meta
    });
    if(!result.ready&&result.warmup){
      warmup.push({source:s.source,symbol:s.symbol,timeframe:s.timeframe,...result.warmup});
    }
  }

  const cfg=getAutoTradeConfig();
  const candidates=getCandidates();
  return NextResponse.json({
    generatedAt:new Date().toISOString(),
    mode:cfg.mode,
    liveAllowed:process.env.AUTOTRADE_LIVE_ENABLED==="true",
    total:candidates.length,
    aptos:candidates.filter(x=>x.status==="APTO").length,
    candidates,
    warmup,
    streams:streams.length
  });
}
