import { analyzeCandles } from "@/lib/analysis-engine";
import { analyzeForex } from "@/lib/forex/engine";
import { evaluateCandidate,type TradeCandidate } from "@/lib/autotrade/policy";
import {
  enqueueIntent,
  getAutoTradeConfig,
  getCandidates,
  setCandidates,
  canCreateIntent
} from "@/lib/autotrade/store";

export type ProcessResult={
  ready:boolean;
  warmup?:{required:number;received:number;missing:number};
  candidate?:TradeCandidate;
  analysis?:unknown;
  intent?:unknown;
};

export function processStream(input:{
  source:string;
  symbol:string;
  timeframe:string;
  lastSeen:string;
  candles:any[];
  bid?:number;
  ask?:number;
  spread?:number;
  meta?:Record<string,unknown>;
  newsRisk?:number;
}):ProcessResult{
  const required=60;
  if(input.candles.length<required){
    return {
      ready:false,
      warmup:{
        required,
        received:input.candles.length,
        missing:Math.max(0,required-input.candles.length)
      }
    };
  }

  const forex=input.source==="mt5"||input.symbol.includes("/")||String(input.meta?.assetClass??"").toLowerCase()==="forex";
  const newsRisk=Number.isFinite(input.newsRisk)?Number(input.newsRisk):0.15;
  const analysis:any=forex
    ? analyzeForex(input.candles,{sourceQuality:"licensed",newsRisk})
    : analyzeCandles(input.candles,{sourceQuality:"licensed",newsRisk});

  const signal:any=analysis.signal;
  const snapshot:any=analysis.snapshot??analysis.indicators??{};
  const price=Number(input.bid??input.candles.at(-1)?.close??0);
  const ageSeconds=Math.max(0,Math.round((Date.now()-new Date(input.lastSeen).getTime())/1000));
  const cfg=getAutoTradeConfig();

  const candidate=evaluateCandidate({
    source:input.source,
    symbol:input.symbol,
    timeframe:input.timeframe,
    signal,
    price,
    atr:Number(snapshot.atr14??0),
    spread:input.spread,
    newsRisk,
    sourceAgeSeconds:ageSeconds
  },cfg);

  const current=getCandidates().filter(x=>!(x.source===candidate.source&&x.symbol===candidate.symbol&&x.timeframe===candidate.timeframe));
  current.push(candidate);
  current.sort((a,b)=>{
    if(a.status==="APTO"&&b.status!=="APTO")return -1;
    if(b.status==="APTO"&&a.status!=="APTO")return 1;
    return b.confidence-a.confidence;
  });
  setCandidates(current);

  const sameSymbol=getCandidates().filter(x=>x.source===candidate.source&&x.symbol===candidate.symbol);
  const sameSideApt=sameSymbol.filter(x=>x.status==="APTO"&&x.side===candidate.side);
  const confirmations=sameSideApt.length;
  const availableTimeframes=new Set(sameSymbol.map(x=>x.timeframe)).size;
  const consensusRequired=availableTimeframes>=2?2:1;
  const consensusPassed=candidate.status==="APTO"&&confirmations>=consensusRequired;

  let intent:unknown=undefined;
  if(cfg.mode!=="off"&&consensusPassed&&canCreateIntent(candidate,cfg)){
    intent=enqueueIntent(candidate,cfg.mode);
  }

  return {
    ready:true,
    candidate:{
      ...candidate,
      reasons:[
        ...candidate.reasons,
        `Consenso multi-timeframe: ${confirmations}/${availableTimeframes} confirmações ${candidate.side??""}`
      ]
    },
    analysis:{
      ...analysis,
      consensus:{confirmations,availableTimeframes,required:consensusRequired,passed:consensusPassed}
    },
    intent
  };
}
