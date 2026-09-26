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
  decision?:{
    action:"COMPRA"|"VENDA"|"AGUARDAR";
    status:"APTO"|"BLOQUEADO"|"AGUARDAR";
    confidence:number;
    score:number;
    price:number;
    entry:number;
    stopLoss:number|null;
    takeProfit:number|null;
    rr:number|null;
    risk:string;
    atr:number|null;
    spread:number|null;
    newsRisk:number;
    support:number|null;
    resistance:number|null;
    indicatorsEvaluated:number;
    reasons:string[];
    blocks:string[];
    updatedAt:string;
  };
  intent?:unknown;
};

export function processStream(tenantId:string,input:{
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
    return {ready:false,warmup:{required,received:input.candles.length,missing:Math.max(0,required-input.candles.length)}};
  }

  const professionalConnector=input.source==="mt5"||input.source==="profit";
  const forex=input.symbol.includes("/")||String(input.meta?.assetClass??"").toLowerCase()==="forex";
  const newsRisk=Number.isFinite(input.newsRisk)?Number(input.newsRisk):0.15;
  // MT5 e Profit usam o mesmo motor completo de confluência técnica.
  // Outras fontes genéricas continuam usando o motor base.
  const analysis:any=(professionalConnector||forex)
    ?analyzeForex(input.candles,{sourceQuality:"licensed",newsRisk})
    :analyzeCandles(input.candles,{sourceQuality:"licensed",newsRisk});

  const signal:any=analysis.signal;
  const snapshot:any=analysis.snapshot??analysis.indicators??{};
  const price=Number(input.bid??input.candles.at(-1)?.close??0);
  const ageSeconds=Math.max(0,Math.round((Date.now()-new Date(input.lastSeen).getTime())/1000));
  const cfg=getAutoTradeConfig(tenantId);

  const candidate=evaluateCandidate({
    source:input.source,symbol:input.symbol,timeframe:input.timeframe,signal,price,
    atr:Number(snapshot.atr14??0),spread:input.spread,newsRisk,sourceAgeSeconds:ageSeconds
  },cfg);

  const current=getCandidates(tenantId).filter(x=>!(x.source===candidate.source&&x.symbol===candidate.symbol&&x.timeframe===candidate.timeframe));
  current.push(candidate);
  current.sort((a,b)=>{
    if(a.status==="APTO"&&b.status!=="APTO")return -1;
    if(b.status==="APTO"&&a.status!=="APTO")return 1;
    return b.confidence-a.confidence;
  });
  setCandidates(tenantId,current);

  const sameSymbol=getCandidates(tenantId).filter(x=>x.source===candidate.source&&x.symbol===candidate.symbol);
  const sameSideApt=sameSymbol.filter(x=>x.status==="APTO"&&x.side===candidate.side);
  const confirmations=sameSideApt.length;
  const availableTimeframes=new Set(sameSymbol.map(x=>x.timeframe)).size;
  const consensusRequired=availableTimeframes>=2?2:1;
  const consensusPassed=candidate.status==="APTO"&&confirmations>=consensusRequired;

  let intent:unknown=undefined;
  if(cfg.mode!=="off"&&consensusPassed&&canCreateIntent(tenantId,candidate,cfg)){
    intent=enqueueIntent(tenantId,candidate,cfg.mode);
  }

  const nearestSupport=Array.isArray(snapshot?.levels?.support)
    ?snapshot.levels.support.filter((x:number)=>x<=price).sort((a:number,b:number)=>b-a)[0]
    :undefined;
  const nearestResistance=Array.isArray(snapshot?.levels?.resistance)
    ?snapshot.levels.resistance.filter((x:number)=>x>=price).sort((a:number,b:number)=>a-b)[0]
    :undefined;
  const action=candidate.side==="BUY"?"COMPRA":candidate.side==="SELL"?"VENDA":"AGUARDAR";

  const decision={
    action:action as "COMPRA"|"VENDA"|"AGUARDAR",
    status:candidate.status,
    confidence:candidate.confidence,
    score:candidate.score,
    price,
    entry:candidate.entry,
    stopLoss:candidate.stopLoss??null,
    takeProfit:candidate.takeProfit??null,
    rr:candidate.rr??null,
    risk:String(signal.risk??"—"),
    atr:Number.isFinite(Number(snapshot?.atr14))?Number(snapshot.atr14):null,
    spread:Number.isFinite(Number(input.spread))?Number(input.spread):null,
    newsRisk,
    support:Number.isFinite(Number(nearestSupport))?Number(nearestSupport):null,
    resistance:Number.isFinite(Number(nearestResistance))?Number(nearestResistance):null,
    indicatorsEvaluated:Number(analysis?.indicatorCoverage??0),
    reasons:[...candidate.reasons],
    blocks:[...candidate.blocks],
    updatedAt:new Date().toISOString()
  };

  return {
    ready:true,
    decision,
    candidate:{
      ...candidate,
      reasons:[...candidate.reasons,`Consenso multi-timeframe: ${confirmations}/${availableTimeframes} confirmações ${candidate.side??""}`]
    },
    analysis:{...analysis,consensus:{confirmations,availableTimeframes,required:consensusRequired,passed:consensusPassed}},
    intent
  };
}
