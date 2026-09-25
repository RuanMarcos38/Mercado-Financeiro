import type { Candle } from "@/lib/market/types";

export type ForexProviderStatus={
  id:string;
  configured:boolean;
  realtime:boolean;
  note:string;
};

export function forexProviderStatus():ForexProviderStatus[]{
  return [
    {
      id:"oanda",
      configured:Boolean(process.env.OANDA_API_TOKEN&&process.env.OANDA_ACCOUNT_ID),
      realtime:true,
      note:"API oficial OANDA; exige conta e token. Suporta preços e candles 24h em dias úteis."
    },
    {
      id:"twelvedata",
      configured:Boolean(process.env.TWELVE_DATA_API_KEY),
      realtime:true,
      note:"API de mercado com chave; lista pares e fornece séries intradiárias conforme plano."
    }
  ];
}

function granularity(tf:Candle["timeframe"]){
  if(tf==="1m") return "M1";
  if(tf==="5m") return "M5";
  if(tf==="15m") return "M15";
  if(tf==="1h") return "H1";
  return "D";
}

export async function getOandaCandles(symbol:string,timeframe:Candle["timeframe"]="5m",count=300):Promise<Candle[]>{
  const token=process.env.OANDA_API_TOKEN;
  if(!token) throw new Error("OANDA_API_TOKEN não configurado.");
  const instrument=symbol.replace("/","_");
  const url=`https://api-fxpractice.oanda.com/v3/instruments/${instrument}/candles?price=M&granularity=${granularity(timeframe)}&count=${Math.min(5000,Math.max(60,count))}`;
  const res=await fetch(url,{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});
  if(!res.ok) throw new Error(`OANDA ${instrument}: HTTP ${res.status}`);
  const json=await res.json() as any;
  return (json.candles??[])
    .filter((x:any)=>x.complete!==false&&x.mid)
    .map((x:any)=>({
      symbol,
      timeframe,
      time:String(x.time),
      open:Number(x.mid.o),
      high:Number(x.mid.h),
      low:Number(x.mid.l),
      close:Number(x.mid.c),
      volume:Number(x.volume??0),
      source:"oanda"
    }))
    .filter((x:Candle)=>[x.open,x.high,x.low,x.close].every(Number.isFinite));
}

export async function getTwelveDataCandles(symbol:string,timeframe:Candle["timeframe"]="5m",count=300):Promise<Candle[]>{
  const key=process.env.TWELVE_DATA_API_KEY;
  if(!key) throw new Error("TWELVE_DATA_API_KEY não configurado.");
  const interval=timeframe==="1h"?"1h":timeframe==="1d"?"1day":timeframe;
  const url=`https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&outputsize=${Math.min(5000,Math.max(60,count))}&apikey=${encodeURIComponent(key)}`;
  const res=await fetch(url,{cache:"no-store"});
  if(!res.ok) throw new Error(`Twelve Data ${symbol}: HTTP ${res.status}`);
  const json=await res.json() as any;
  if(json.status==="error") throw new Error(json.message??"Twelve Data: erro");
  return (json.values??[]).slice().reverse().map((x:any)=>({
    symbol,timeframe,
    time:new Date(String(x.datetime).replace(" ","T")+"Z").toISOString(),
    open:Number(x.open),high:Number(x.high),low:Number(x.low),close:Number(x.close),
    volume:Number(x.volume??0),source:"twelvedata"
  })).filter((x:Candle)=>[x.open,x.high,x.low,x.close].every(Number.isFinite));
}
