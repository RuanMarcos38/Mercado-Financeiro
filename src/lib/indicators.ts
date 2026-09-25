import type { Candle } from "@/lib/market/types";

const nums=(c:Candle[])=>c.map(x=>x.close);
const avg=(x:number[])=>x.reduce((a,b)=>a+b,0)/(x.length||1);

export function sma(values:number[], period:number){
  if(values.length<period) return NaN;
  return avg(values.slice(-period));
}

export function emaSeries(values:number[], period:number){
  if(!values.length) return [];
  const k=2/(period+1);
  const out=[values[0]];
  for(let i=1;i<values.length;i++) out.push(values[i]*k+out[i-1]*(1-k));
  return out;
}

export function ema(values:number[], period:number){
  const s=emaSeries(values,period);
  return s.length?s[s.length-1]:NaN;
}

export function rsi(values:number[], period=14){
  if(values.length<=period) return NaN;
  let gains=0, losses=0;
  const start=values.length-period;
  for(let i=start;i<values.length;i++){
    const d=values[i]-values[i-1];
    if(d>=0) gains+=d; else losses-=d;
  }
  if(losses===0) return 100;
  const rs=(gains/period)/(losses/period);
  return 100-(100/(1+rs));
}

export function macd(values:number[], fast=12, slow=26, signal=9){
  const f=emaSeries(values,fast);
  const s=emaSeries(values,slow);
  const start=Math.max(0,s.length-f.length);
  const line=s.map((sv,i)=>f[i+start]-sv);
  const sig=emaSeries(line,signal);
  const m=line.at(-1)??NaN;
  const sg=sig.at(-1)??NaN;
  return { macd:m, signal:sg, histogram:m-sg };
}

export function atr(c:Candle[], period=14){
  if(c.length<=period) return NaN;
  const trs:number[]=[];
  for(let i=1;i<c.length;i++){
    trs.push(Math.max(
      c[i].high-c[i].low,
      Math.abs(c[i].high-c[i-1].close),
      Math.abs(c[i].low-c[i-1].close)
    ));
  }
  return avg(trs.slice(-period));
}

export function bollinger(values:number[], period=20, mult=2){
  if(values.length<period) return {middle:NaN,upper:NaN,lower:NaN};
  const slice=values.slice(-period);
  const middle=avg(slice);
  const variance=avg(slice.map(v=>(v-middle)**2));
  const sd=Math.sqrt(variance);
  return {middle,upper:middle+mult*sd,lower:middle-mult*sd};
}

export function vwap(c:Candle[]){
  const usable=c.filter(x=>Number.isFinite(x.volume) && x.volume>0);
  if(!usable.length) return c.at(-1)?.close ?? NaN;
  let pv=0,v=0;
  for(const x of usable){
    const typical=(x.high+x.low+x.close)/3;
    pv+=typical*x.volume; v+=x.volume;
  }
  return pv/v;
}

export function adx(c:Candle[], period=14){
  if(c.length<=period+1) return NaN;
  const plus:number[]=[]; const minus:number[]=[]; const trs:number[]=[];
  for(let i=1;i<c.length;i++){
    const up=c[i].high-c[i-1].high;
    const down=c[i-1].low-c[i].low;
    plus.push(up>down && up>0?up:0);
    minus.push(down>up && down>0?down:0);
    trs.push(Math.max(c[i].high-c[i].low,Math.abs(c[i].high-c[i-1].close),Math.abs(c[i].low-c[i-1].close)));
  }
  const tr=avg(trs.slice(-period));
  if(!tr) return 0;
  const p=100*(avg(plus.slice(-period))/tr);
  const m=100*(avg(minus.slice(-period))/tr);
  const denom=p+m;
  return denom?100*Math.abs(p-m)/denom:0;
}

export function volumeRatio(c:Candle[], period=20){
  if(c.length<2) return 1;
  const last=c.at(-1)!.volume || 0;
  const prev=c.slice(Math.max(0,c.length-period-1),-1).map(x=>x.volume).filter(v=>v>0);
  const base=avg(prev);
  return base>0?last/base:1;
}

export function realizedVolatility(values:number[], period=20){
  if(values.length<period+1) return NaN;
  const rets:number[]=[];
  const s=values.slice(-(period+1));
  for(let i=1;i<s.length;i++) rets.push(Math.log(s[i]/s[i-1]));
  const mean=avg(rets);
  const variance=avg(rets.map(r=>(r-mean)**2));
  return Math.sqrt(variance)*Math.sqrt(252)*100;
}

export function snapshot(c:Candle[]){
  const closes=nums(c);
  const last=c.at(-1);
  if(!last || closes.length<30) throw new Error("São necessários pelo menos 30 candles.");
  const m=macd(closes);
  const bb=bollinger(closes);
  return {
    price:last.close,
    ema9:ema(closes,9),
    ema21:ema(closes,21),
    sma20:sma(closes,20),
    rsi14:rsi(closes,14),
    macd:m,
    atr14:atr(c,14),
    bollinger:bb,
    vwap:vwap(c),
    adx14:adx(c,14),
    volumeRatio:volumeRatio(c,20),
    realizedVolatility:realizedVolatility(closes,20)
  };
}
