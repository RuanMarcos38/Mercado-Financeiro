export type TradeSide="BUY"|"SELL";
export type TradeMode="off"|"paper"|"live";

export type AutoTradeConfig={
  mode:TradeMode;
  minConfidence:number;
  minAbsScore:number;
  maxNewsRisk:number;
  maxSpreadPct:number;
  maxOpenPositions:number;
  maxTradesPerHour:number;
  riskPerTradePct:number;
  dailyLossLimitPct:number;
  takeProfitR:number;
  stopAtrMultiple:number;
  cooldownSeconds:number;
  allowBuy:boolean;
  allowSell:boolean;
};

export const DEFAULT_AUTOTRADE_CONFIG:AutoTradeConfig={
  mode:"paper",
  minConfidence:72,
  minAbsScore:48,
  maxNewsRisk:.45,
  maxSpreadPct:.12,
  maxOpenPositions:2,
  maxTradesPerHour:6,
  riskPerTradePct:.5,
  dailyLossLimitPct:2,
  takeProfitR:1.8,
  stopAtrMultiple:1.25,
  cooldownSeconds:180,
  allowBuy:true,
  allowSell:true
};

export type CandidateInput={
  source:string;
  symbol:string;
  timeframe:string;
  signal:{side:string;confidence:number;score:number;risk?:string;warnings?:string[];reasons?:string[];setup?:string[]};
  price:number;
  atr?:number;
  spread?:number;
  newsRisk?:number;
  sourceAgeSeconds?:number;
};

export type TradeCandidate={
  source:string;
  symbol:string;
  timeframe:string;
  status:"APTO"|"BLOQUEADO"|"AGUARDAR";
  side?:TradeSide;
  confidence:number;
  score:number;
  entry:number;
  stopLoss?:number;
  takeProfit?:number;
  rr?:number;
  reasons:string[];
  blocks:string[];
  validForSeconds:number;
};

const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));

export function evaluateCandidate(i:CandidateInput,cfg:AutoTradeConfig=DEFAULT_AUTOTRADE_CONFIG):TradeCandidate{
  const reasons=[...(i.signal.reasons??[]),...(i.signal.setup??[])];
  const blocks:string[]=[];
  const side:TradeSide|undefined=i.signal.side==="COMPRA"?"BUY":i.signal.side==="VENDA"?"SELL":undefined;
  const spreadPct=i.spread&&i.price?Math.abs(i.spread/i.price)*100:0;

  if(!side) blocks.push("Motor recomenda AGUARDAR");
  if(i.signal.confidence<cfg.minConfidence) blocks.push(`Confiança abaixo de ${cfg.minConfidence}%`);
  if(Math.abs(i.signal.score)<cfg.minAbsScore) blocks.push(`Score abaixo de ${cfg.minAbsScore}`);
  if((i.newsRisk??0)>cfg.maxNewsRisk) blocks.push("Risco de notícia acima do limite");
  if(spreadPct>cfg.maxSpreadPct) blocks.push("Spread acima do limite");
  if((i.sourceAgeSeconds??0)>120) blocks.push("Feed desatualizado");
  if(side==="BUY"&&!cfg.allowBuy) blocks.push("Compras desativadas");
  if(side==="SELL"&&!cfg.allowSell) blocks.push("Vendas desativadas");

  const atr=Math.max(Number(i.atr??0),i.price*.0005);
  const stopDistance=atr*cfg.stopAtrMultiple;
  const stopLoss=side==="BUY"?i.price-stopDistance:side==="SELL"?i.price+stopDistance:undefined;
  const takeProfit=side==="BUY"?i.price+stopDistance*cfg.takeProfitR:side==="SELL"?i.price-stopDistance*cfg.takeProfitR:undefined;

  return {
    source:i.source,symbol:i.symbol,timeframe:i.timeframe,
    status:!side?"AGUARDAR":blocks.length?"BLOQUEADO":"APTO",
    side,
    confidence:clamp(Math.round(i.signal.confidence),0,100),
    score:Math.round(i.signal.score),
    entry:i.price,
    stopLoss,takeProfit,
    rr:side?cfg.takeProfitR:undefined,
    reasons,
    blocks,
    validForSeconds:60
  };
}
