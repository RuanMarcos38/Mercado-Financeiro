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
type TenantState={
  config:AutoTradeConfig;
  intents:ExecutionIntent[];
  audit:Audit[];
  candidates:TradeCandidate[];
};

const g=globalThis as typeof globalThis & {
  __tenantAutoTrade?:Map<string,TenantState>;
};
if(!g.__tenantAutoTrade)g.__tenantAutoTrade=new Map();

function state(tenantId:string){
  let s=g.__tenantAutoTrade!.get(tenantId);
  if(!s){
    s={config:{...DEFAULT_AUTOTRADE_CONFIG},intents:[],audit:[],candidates:[]};
    g.__tenantAutoTrade!.set(tenantId,s);
  }
  return s;
}

export function getAutoTradeConfig(tenantId:string){return state(tenantId).config;}
export function setAutoTradeConfig(tenantId:string,patch:Partial<AutoTradeConfig>){
  const s=state(tenantId);
  s.config={...s.config,...patch};
  audit(tenantId,"CONFIG","Configuração AutoTrade atualizada",s.config);
  return s.config;
}
export function setCandidates(tenantId:string,c:TradeCandidate[]){state(tenantId).candidates=c;return c;}
export function getCandidates(tenantId:string){return state(tenantId).candidates;}
export function audit(tenantId:string,type:string,message:string,data?:unknown){
  const s=state(tenantId);
  s.audit.unshift({time:new Date().toISOString(),type,message,data});
  s.audit=s.audit.slice(0,500);
}
export function getAudit(tenantId:string){return state(tenantId).audit;}

export function enqueueIntent(tenantId:string,candidate:TradeCandidate,mode:"paper"|"live"){
  if(candidate.status!=="APTO"||!candidate.side)throw new Error("Candidato não está apto.");
  const s=state(tenantId);
  const now=Date.now();
  const existing=s.intents.find(x=>x.source===candidate.source&&x.symbol===candidate.symbol&&x.timeframe===candidate.timeframe&&["PENDING","CLAIMED"].includes(x.status)&&new Date(x.expiresAt).getTime()>now);
  if(existing)return existing;

  const intent:ExecutionIntent={
    id:crypto.randomUUID(),
    createdAt:new Date(now).toISOString(),
    expiresAt:new Date(now+candidate.validForSeconds*1000).toISOString(),
    source:candidate.source,symbol:candidate.symbol,timeframe:candidate.timeframe,
    side:candidate.side,mode,entry:candidate.entry,stopLoss:candidate.stopLoss,takeProfit:candidate.takeProfit,
    confidence:candidate.confidence,score:candidate.score,status:"PENDING"
  };
  s.intents.unshift(intent);
  s.intents=s.intents.slice(0,500);
  audit(tenantId,"INTENT","Nova intenção de execução",intent);
  return intent;
}

export function listIntents(tenantId:string){
  const s=state(tenantId);
  const now=Date.now();
  for(const x of s.intents){
    if(x.status==="PENDING"&&new Date(x.expiresAt).getTime()<=now)x.status="EXPIRED";
  }
  return s.intents;
}

export function claimNextIntent(tenantId:string,source:string,symbol?:string){
  const now=Date.now();
  const x=listIntents(tenantId).find(i=>i.source===source&&(!symbol||i.symbol===symbol)&&i.status==="PENDING"&&new Date(i.expiresAt).getTime()>now);
  if(x){x.status="CLAIMED";audit(tenantId,"CLAIM","Bridge coletou intenção",x);}
  return x??null;
}

export function updateIntent(tenantId:string,id:string,status:ExecutionIntent["status"],note?:string){
  const x=state(tenantId).intents.find(i=>i.id===id);
  if(!x)throw new Error("Intenção não encontrada.");
  x.status=status;x.note=note;
  audit(tenantId,"EXECUTION",`Intenção ${status}`,x);
  return x;
}

export function canCreateIntent(tenantId:string,candidate:TradeCandidate,cfg:AutoTradeConfig){
  const s=state(tenantId);
  const now=Date.now();
  const sameKey=s.intents.filter(x=>x.source===candidate.source&&x.symbol===candidate.symbol&&x.timeframe===candidate.timeframe);
  if(sameKey.some(x=>now-new Date(x.createdAt).getTime()<cfg.cooldownSeconds*1000))return false;

  const hourAgo=now-3600000;
  if(s.intents.filter(x=>new Date(x.createdAt).getTime()>=hourAgo).length>=cfg.maxTradesPerHour)return false;
  if(s.intents.filter(x=>["PENDING","CLAIMED"].includes(x.status)).length>=cfg.maxOpenPositions)return false;
  return true;
}
