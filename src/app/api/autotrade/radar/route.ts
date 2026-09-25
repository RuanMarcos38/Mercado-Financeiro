import { NextResponse } from "next/server";
import { listMarketStreams,getMarketStream } from "@/lib/connectors/market-stream";
import { analyzeForex } from "@/lib/forex/engine";
import { analyzeCandles } from "@/lib/analysis-engine";
import { evaluateCandidate } from "@/lib/autotrade/policy";
import { enqueueIntent,getAutoTradeConfig,setCandidates } from "@/lib/autotrade/store";

export const dynamic="force-dynamic";

export async function GET(){
  const cfg=getAutoTradeConfig();
  const streams=listMarketStreams();
  const now=Date.now();
  const candidates=[];

  for(const s of streams){
    const stream=getMarketStream(s.source,s.symbol,s.timeframe);
    if(!stream||stream.candles.length<60)continue;
    try{
      const forex=s.source==="mt5"||s.symbol.includes("/")||String(s.meta?.assetClass??"").toLowerCase()==="forex";
      const analysis=forex?analyzeForex(stream.candles,{sourceQuality:"licensed",newsRisk:.15}):analyzeCandles(stream.candles,{sourceQuality:"licensed",newsRisk:.15});
      const signal:any=analysis.signal;
      const snapshot:any=(analysis as any).snapshot??(analysis as any).indicators??{};
      const price=Number(stream.bid??stream.candles.at(-1)?.close??0);
      const candidate=evaluateCandidate({
        source:s.source,symbol:s.symbol,timeframe:s.timeframe,signal,price,
        atr:Number(snapshot.atr14??0),spread:s.spread,newsRisk:.15,
        sourceAgeSeconds:Math.max(0,Math.round((now-new Date(s.lastSeen).getTime())/1000))
      },cfg);
      candidates.push(candidate);
    }catch{}
  }

  candidates.sort((a,b)=>{
    if(a.status==="APTO"&&b.status!=="APTO")return -1;
    if(b.status==="APTO"&&a.status!=="APTO")return 1;
    return b.confidence-a.confidence;
  });
  setCandidates(candidates);

  const created=[];
  if(cfg.mode!=="off"){
    for(const c of candidates.filter(x=>x.status==="APTO")){
      created.push(enqueueIntent(c,cfg.mode));
    }
  }

  return NextResponse.json({
    generatedAt:new Date().toISOString(),
    mode:cfg.mode,
    liveAllowed:process.env.AUTOTRADE_LIVE_ENABLED==="true",
    total:candidates.length,
    aptos:candidates.filter(x=>x.status==="APTO").length,
    candidates,
    intentsCreated:created.length
  });
}
