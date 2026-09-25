import type { Candle } from "@/lib/market/types";

export type PublicMarketAsset = {
  symbol: string;
  name: string;
  currency: string;
  price: number | null;
  changePercent: number | null;
  volume: number | null;
  marketTime: string | null;
  source: "brapi";
  delayed: true;
  delayLabel: string;
  candles: Candle[];
};

const BASE="https://brapi.dev/api/quote";

function asNum(v:unknown):number|null{
  const n=Number(v);
  return Number.isFinite(n)?n:null;
}

export async function getBrapiAsset(symbol:string, opts?:{range?:string;interval?:string}):Promise<PublicMarketAsset>{
  const range=opts?.range??"1d";
  const interval=opts?.interval??"5m";
  const url=`${BASE}/${encodeURIComponent(symbol)}?range=${encodeURIComponent(range)}&interval=${encodeURIComponent(interval)}`;
  const res=await fetch(url,{
    headers:{"accept":"application/json","user-agent":"Mercado-Financeiro-SaaS/1.0"},
    next:{revalidate:60}
  });
  if(!res.ok) throw new Error(`brapi ${symbol}: HTTP ${res.status}`);
  const json=await res.json() as any;
  const r=json?.results?.[0];
  if(!r) throw new Error(`brapi ${symbol}: resposta sem ativo`);

  const history=Array.isArray(r.historicalDataPrice)?r.historicalDataPrice:[];
  const candles:Candle[]=history.map((x:any)=>({
    symbol,
    timeframe:interval==="1m"?"1m":interval==="15m"?"15m":interval==="1h"||interval==="60m"?"1h":interval==="1d"?"1d":"5m",
    time:new Date(Number(x.date)*1000).toISOString(),
    open:Number(x.open),
    high:Number(x.high),
    low:Number(x.low),
    close:Number(x.close),
    volume:Number(x.volume??0),
    source:"brapi"
  })).filter((c:Candle)=>[c.open,c.high,c.low,c.close].every(Number.isFinite));

  return {
    symbol:String(r.symbol??symbol),
    name:String(r.shortName??r.longName??symbol),
    currency:String(r.currency??"BRL"),
    price:asNum(r.regularMarketPrice),
    changePercent:asNum(r.regularMarketChangePercent),
    volume:asNum(r.regularMarketVolume),
    marketTime:r.regularMarketTime?String(r.regularMarketTime):null,
    source:"brapi",
    delayed:true,
    delayLabel:"cotação real com atraso aproximado de 30 min no acesso gratuito",
    candles
  };
}

export async function getPublicB3Assets(){
  const symbols=["PETR4","VALE3","ITUB4","MGLU3"] as const;
  const settled=await Promise.allSettled(symbols.map(s=>getBrapiAsset(s,{range:"1d",interval:"5m"})));
  return settled.map((r,i)=>r.status==="fulfilled"
    ?{ok:true,...r.value}
    :{ok:false,symbol:symbols[i],error:r.reason instanceof Error?r.reason.message:String(r.reason)}
  );
}

export async function getPublicIbov(){
  try{
    return {ok:true,...await getBrapiAsset("^BVSP",{range:"1d",interval:"5m"})};
  }catch(error){
    return {ok:false,symbol:"^BVSP",error:error instanceof Error?error.message:String(error)};
  }
}
