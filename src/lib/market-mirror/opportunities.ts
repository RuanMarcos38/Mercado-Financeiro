import { analyzeForex } from "@/lib/forex/engine";
import { analyzeCandles } from "@/lib/analysis-engine";
import { DEFAULT_AUTOTRADE_CONFIG,evaluateCandidate,type TradeCandidate } from "@/lib/autotrade/policy";
import type { StreamState } from "@/lib/connectors/market-stream";

export type GlobalOpportunity=TradeCandidate & {
  analyzedAt:string;
  assetClass:string;
  sourceQuality:"licensed"|"public";
};

const g=globalThis as typeof globalThis & {
  __globalOpportunities?:Map<string,GlobalOpportunity>;
};
if(!g.__globalOpportunities)g.__globalOpportunities=new Map();

function k(source:string,symbol:string,timeframe:string){return [source,symbol,timeframe].join(":");}

export function analyzeGlobalStream(stream:StreamState,assetClass:string,quality:"licensed"|"public"="licensed"){
  if(stream.candles.length<60)return null;
  const forex=assetClass==="forex"||stream.symbol.includes("/");
  const analysis:any=forex
    ?analyzeForex(stream.candles,{sourceQuality:quality,newsRisk:.15})
    :analyzeCandles(stream.candles,{sourceQuality:quality,newsRisk:.15});
  const signal:any=analysis.signal;
  const snapshot:any=analysis.snapshot??analysis.indicators??{};
  const price=Number(stream.bid??stream.candles.at(-1)?.close??0);
  const candidate=evaluateCandidate({
    source:stream.source,symbol:stream.symbol,timeframe:stream.timeframe,signal,price,
    atr:Number(snapshot.atr14??0),spread:stream.spread,newsRisk:.15,sourceAgeSeconds:0
  },DEFAULT_AUTOTRADE_CONFIG);
  const value:GlobalOpportunity={...candidate,analyzedAt:new Date().toISOString(),assetClass,sourceQuality:quality};
  g.__globalOpportunities!.set(k(stream.source,stream.symbol,stream.timeframe),value);
  return {candidate:value,analysis};
}

export function listGlobalOpportunities(){
  return [...g.__globalOpportunities!.values()].sort((a,b)=>{
    if(a.status==="APTO"&&b.status!=="APTO")return -1;
    if(b.status==="APTO"&&a.status!=="APTO")return 1;
    return b.confidence-a.confidence;
  });
}
