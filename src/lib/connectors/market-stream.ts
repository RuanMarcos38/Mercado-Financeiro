import type { Candle } from "@/lib/market/types";

export type ConnectorSource="mt5"|"profit";

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

type StreamState={
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

const g=globalThis as typeof globalThis & {
  __marketConnectorStore?:Map<string,StreamState>;
};
if(!g.__marketConnectorStore) g.__marketConnectorStore=new Map();

const store=g.__marketConnectorStore;

function key(source:string,symbol:string,timeframe:string){
  return [source,symbol.toUpperCase(),timeframe].join(":");
}

export function ingestMarketPush(push:MarketPush){
  const k=key(push.source,push.symbol,push.timeframe);
  const current=store.get(k);
  const merged=[...(current?.candles??[]),...push.candles]
    .filter(c=>Number.isFinite(c.open)&&Number.isFinite(c.high)&&Number.isFinite(c.low)&&Number.isFinite(c.close))
    .sort((a,b)=>new Date(a.time).getTime()-new Date(b.time).getTime());

  const unique=new Map<string,Candle>();
  for(const c of merged) unique.set(c.time,c);
  const candles=[...unique.values()].slice(-5000);

  const state:StreamState={
    lastSeen:new Date().toISOString(),
    source:push.source,
    symbol:push.symbol.toUpperCase(),
    timeframe:push.timeframe,
    candles,
    bid:push.bid,
    ask:push.ask,
    spread:push.spread,
    meta:push.meta
  };
  store.set(k,state);
  return state;
}

export function getMarketStream(source:string,symbol:string,timeframe:string){
  return store.get(key(source,symbol,timeframe))??null;
}

export function listMarketStreams(){
  return [...store.values()].map(x=>({
    source:x.source,
    symbol:x.symbol,
    timeframe:x.timeframe,
    lastSeen:x.lastSeen,
    candleCount:x.candles.length,
    bid:x.bid,ask:x.ask,spread:x.spread,
    meta:x.meta
  })).sort((a,b)=>b.lastSeen.localeCompare(a.lastSeen));
}

export function connectorStoreWarning(){
  return "Armazenamento em memória é adequado para servidor persistente/dev. Em deploy serverless, configure Redis/Postgres para persistência compartilhada.";
}
