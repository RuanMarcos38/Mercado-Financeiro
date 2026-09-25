import { DEFAULT_AUTOTRADE_CONFIG,type AutoTradeConfig,type TradeCandidate } from "@/lib/autotrade/policy";

export type ExecutionIntent={
  id:string;
  createdAt:string;
  expiresAt:string;
  source:string;
  symbol:string;
  timeframe:string;
  side:"BUY"|"SELL";
  mode:"paper"|"live";
  entry:number;
  stopLoss?:number;
  takeProfit?:number;
  confidence:number;
  score:number;
  status:"PENDING"|"CLAIMED"|"EXECUTED"|"REJECTED"|"EXPIRED";
  note?:string;
};

type Audit={time:string;type:string;message:string;data?:unknown};

const g=globalThis as typeof globalThis & {
  __autoTradeConfig?:AutoTradeConfig;
  __executionIntents?:ExecutionIntent[];
  __autoTradeAudit?:Audit[];
  __candidateCache?:TradeCandidate[];
};
if(!g.__autoTradeConfig) g.__autoTradeConfig={...DEFAULT_AUTOTRADE_CONFIG};
if(!g.__executionIntents) g.__executionIntents=[];
if(!g.__autoTradeAudit) g.__autoTradeAudit=[];
if(!g.__candidateCache) g.__candidateCache=[];

export function getAutoTradeConfig(){return g.__autoTradeConfig!;}
export function setAutoTradeConfig(patch:Partial<AutoTradeConfig>){
  g.__autoTradeConfig={...g.__autoTradeConfig!,...patch};
  audit("CONFIG","Configuração AutoTrade atualizada",g.__autoTradeConfig);
  return g.__autoTradeConfig;
}
export function setCandidates(c:TradeCandidate[]){g.__candidateCache=c;return c;}
export function getCandidates(){return g.__candidateCache??[];}
export function audit(type:string,message:string,data?:unknown){
  g.__autoTradeAudit!.unshift({time:new Date().toISOString(),type,message,data});
  g.__autoTradeAudit=g.__autoTradeAudit!.slice(0,500);
}
export function getAudit(){return g.__autoTradeAudit??[];}
export function enqueueIntent(candidate:TradeCandidate,mode:"paper"|"live"){
  if(candidate.status!=="APTO"||!candidate.side) throw new Error("Candidato não está apto.");
  const now=Date.now();
  const existing=g.__executionIntents!.find(x=>x.source===candidate.source&&x.symbol===candidate.symbol&&x.timeframe===candidate.timeframe&&["PENDING","CLAIMED"].includes(x.status)&&new Date(x.expiresAt).getTime()>now);
  if(existing)return existing;
  const intent:ExecutionIntent={
    id:crypto.randomUUID(),
    createdAt:new Date(now).toISOString(),
    expiresAt:new Date(now+candidate.validForSeconds*1000).toISOString(),
    source:candidate.source,symbol:candidate.symbol,timeframe:candidate.timeframe,
    side:candidate.side,mode,entry:candidate.entry,stopLoss:candidate.stopLoss,takeProfit:candidate.takeProfit,
    confidence:candidate.confidence,score:candidate.score,status:"PENDING"
  };
  g.__executionIntents!.unshift(intent);
  g.__executionIntents=g.__executionIntents!.slice(0,500);
  audit("INTENT","Nova intenção de execução",intent);
  return intent;
}
export function listIntents(){
  const now=Date.now();
  for(const x of g.__executionIntents!){if(x.status==="PENDING"&&new Date(x.expiresAt).getTime()<=now)x.status="EXPIRED";}
  return g.__executionIntents!;
}
export function claimNextIntent(source:string,symbol?:string){
  const now=Date.now();
  const x=listIntents().find(i=>i.source===source&&(!symbol||i.symbol===symbol)&&i.status==="PENDING"&&new Date(i.expiresAt).getTime()>now);
  if(x){x.status="CLAIMED";audit("CLAIM","Bridge coletou intenção",x);}
  return x??null;
}
export function updateIntent(id:string,status:ExecutionIntent["status"],note?:string){
  const x=g.__executionIntents!.find(i=>i.id===id);
  if(!x)throw new Error("Intenção não encontrada.");
  x.status=status;x.note=note;
  audit("EXECUTION",`Intenção ${status}`,x);
  return x;
}
