import type { Candle } from "@/lib/market/types";

export type ConnectorSource="mt5"|"profit"|"oanda"|"twelvedata"|"b3feed"|"market";

export type MarketPush={
  source:ConnectorSource;
  symbol:string;
  assetClass:"forex"|"b3"|"cfd"|"index"|"commodity"|"other";
  timeframe:Candle["timeframe"];
  timestamp:string;
  bid?:number;
  ask?:number;
  spread?:number;
  candles:Candle[];
  meta?:Record<string,unknown>;
};

export type StreamState={
  tenantId:string;
  lastSeen:string;
  source:ConnectorSource;
  symbol:string;
  timeframe:Candle["timeframe"];
  candles:Candle[];
  bid?:number;
  ask?:number;
  spread?:number;
  meta?:Record<string,unknown>;
};

const GLOBAL_TENANT="__GLOBAL_MARKET__";

const g=globalThis as typeof globalThis & {
  __marketConnectorStore?:Map<string,StreamState>;
};
if(!g.__marketConnectorStore)g.__marketConnectorStore=new Map();
const store=g.__marketConnectorStore;

function key(tenantId:string,source:string,symbol:string,timeframe:string){
  return [tenantId,source,symbol.toUpperCase(),timeframe].join(":");
}

function ingest(tenantId:string,push:MarketPush){
  const k=key(tenantId,push.source,push.symbol,push.timeframe);
  const current=store.get(k);
  const merged=[...(current?.candles??[]),...push.candles]
    .filter(c=>Number.isFinite(c.open)&&Number.isFinite(c.high)&&Number.isFinite(c.low)&&Number.isFinite(c.close))
    .sort((a,b)=>new Date(a.time).getTime()-new Date(b.time).getTime());

  const unique=new Map<string,Candle>();
  for(const c of merged)unique.set(c.time,c);
  const candles=[...unique.values()].slice(-5000);

  const state:StreamState={
    tenantId,lastSeen:new Date().toISOString(),source:push.source,symbol:push.symbol.toUpperCase(),
    timeframe:push.timeframe,candles,bid:push.bid,ask:push.ask,spread:push.spread,meta:push.meta
  };
  store.set(k,state);
  return state;
}

export function ingestMarketPush(tenantId:string,push:MarketPush){return ingest(tenantId,push);}
export function ingestGlobalMarketPush(push:MarketPush){return ingest(GLOBAL_TENANT,push);}

export function getMarketStream(tenantId:string,source:string,symbol:string,timeframe:string){
  return store.get(key(tenantId,source,symbol,timeframe))??null;
}

export function getBestMarketStream(tenantId:string,symbol:string,timeframe:string){
  const direct=[...store.values()]
    .filter(x=>x.tenantId===tenantId&&x.symbol===symbol.toUpperCase()&&x.timeframe===timeframe)
    .sort((a,b)=>b.lastSeen.localeCompare(a.lastSeen))[0];
  if(direct)return direct;
  return [...store.values()]
    .filter(x=>x.tenantId===GLOBAL_TENANT&&x.symbol===symbol.toUpperCase()&&x.timeframe===timeframe)
    .sort((a,b)=>b.lastSeen.localeCompare(a.lastSeen))[0]??null;
}

export function listMarketStreams(tenantId:string,{includeGlobal=true}:{includeGlobal?:boolean}={}){
  return [...store.values()]
    .filter(x=>x.tenantId===tenantId||(includeGlobal&&x.tenantId===GLOBAL_TENANT))
    .map(x=>({
      scope:x.tenantId===GLOBAL_TENANT?"global":"tenant",
      source:x.source,symbol:x.symbol,timeframe:x.timeframe,lastSeen:x.lastSeen,candleCount:x.candles.length,
      bid:x.bid,ask:x.ask,spread:x.spread,meta:x.meta
    }))
    .sort((a,b)=>b.lastSeen.localeCompare(a.lastSeen));
}

export function listGlobalMarketStreams(){
  return [...store.values()].filter(x=>x.tenantId===GLOBAL_TENANT);
}

export function connectorStoreWarning(){
  return "Streams por empresa e Mercado Espelho central estão em memória. Para alta disponibilidade/múltiplas réplicas, persistir em Redis/Postgres.";
}
