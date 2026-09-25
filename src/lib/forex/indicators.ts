import type { Candle } from "@/lib/market/types";
import { ema, sma, rsi, macd, atr, bollinger, vwap, adx, volumeRatio, realizedVolatility } from "@/lib/indicators";

const avg=(xs:number[])=>xs.reduce((a,b)=>a+b,0)/(xs.length||1);

export function stochastic(c:Candle[],period=14,smooth=3){
  if(c.length<period+smooth) return {k:NaN,d:NaN};
  const ks:number[]=[];
  for(let i=Math.max(period-1,c.length-smooth);i<c.length;i++){
    const w=c.slice(i-period+1,i+1);
    const lo=Math.min(...w.map(x=>x.low));
    const hi=Math.max(...w.map(x=>x.high));
    ks.push(hi===lo?50:((c[i].close-lo)/(hi-lo))*100);
  }
  return {k:ks.at(-1)??NaN,d:avg(ks)};
}

export function roc(values:number[],period=12){
  if(values.length<=period) return NaN;
  const prev=values[values.length-1-period];
  return prev?((values.at(-1)!-prev)/prev)*100:0;
}

export function williamsR(c:Candle[],period=14){
  if(c.length<period) return NaN;
  const w=c.slice(-period);
  const hi=Math.max(...w.map(x=>x.high));
  const lo=Math.min(...w.map(x=>x.low));
  return hi===lo?-50:-100*((hi-c.at(-1)!.close)/(hi-lo));
}

export function cci(c:Candle[],period=20){
  if(c.length<period) return NaN;
  const tps=c.slice(-period).map(x=>(x.high+x.low+x.close)/3);
  const mean=avg(tps);
  const dev=avg(tps.map(x=>Math.abs(x-mean)));
  return dev?((tps.at(-1)!-mean)/(.015*dev)):0;
}

export function donchian(c:Candle[],period=20){
  if(c.length<period) return {upper:NaN,lower:NaN,middle:NaN};
  const w=c.slice(-period);
  const upper=Math.max(...w.map(x=>x.high));
  const lower=Math.min(...w.map(x=>x.low));
  return {upper,lower,middle:(upper+lower)/2};
}

export function fibonacci(c:Candle[],period=60){
  const w=c.slice(-Math.min(period,c.length));
  const hi=Math.max(...w.map(x=>x.high));
  const lo=Math.min(...w.map(x=>x.low));
  const d=hi-lo;
  return {high:hi,low:lo,levels:{
    "0.236":hi-d*.236,"0.382":hi-d*.382,"0.5":hi-d*.5,"0.618":hi-d*.618,"0.786":hi-d*.786
  }};
}

export function pivotPoints(c:Candle[]){
  const p=c.at(-2)??c.at(-1);
  if(!p) return {pivot:NaN,r1:NaN,r2:NaN,s1:NaN,s2:NaN};
  const pivot=(p.high+p.low+p.close)/3;
  return {pivot,r1:2*pivot-p.low,s1:2*pivot-p.high,r2:pivot+(p.high-p.low),s2:pivot-(p.high-p.low)};
}

export function supportResistance(c:Candle[],lookback=80,toleranceAtr=.35){
  const w=c.slice(-Math.min(lookback,c.length));
  const a=atr(w,14)||0;
  const highs:number[]=[]; const lows:number[]=[];
  for(let i=2;i<w.length-2;i++){
    if(w[i].high>w[i-1].high&&w[i].high>w[i-2].high&&w[i].high>=w[i+1].high&&w[i].high>=w[i+2].high) highs.push(w[i].high);
    if(w[i].low<w[i-1].low&&w[i].low<w[i-2].low&&w[i].low<=w[i+1].low&&w[i].low<=w[i+2].low) lows.push(w[i].low);
  }
  const cluster=(xs:number[])=>{
    const out:number[]=[];
    xs.sort((a,b)=>a-b).forEach(x=>{
      const idx=out.findIndex(v=>Math.abs(v-x)<=a*toleranceAtr);
      if(idx>=0) out[idx]=(out[idx]+x)/2; else out.push(x);
    });
    return out;
  };
  return {support:cluster(lows).slice(-4),resistance:cluster(highs).slice(-4)};
}

export function trendStructure(c:Candle[],lookback=50){
  const w=c.slice(-Math.min(lookback,c.length));
  if(w.length<10) return {direction:"lateral" as const,slope:0,higherHighs:0,higherLows:0};
  const closes=w.map(x=>x.close);
  const n=closes.length;
  const meanX=(n-1)/2,meanY=avg(closes);
  let num=0,den=0;
  closes.forEach((y,x)=>{num+=(x-meanX)*(y-meanY);den+=(x-meanX)**2});
  const slope=den?num/den:0;
  let hh=0,hl=0;
  for(let i=1;i<w.length;i++){if(w[i].high>w[i-1].high)hh++;if(w[i].low>w[i-1].low)hl++;}
  const norm=slope/(meanY||1);
  const direction=norm>0.00015&&hh>n*.45&&hl>n*.45?"alta":norm<-.00015&&hh<n*.55&&hl<n*.55?"baixa":"lateral";
  return {direction,slope:norm,higherHighs:hh,higherLows:hl};
}

export function pullbackState(c:Candle[]){
  const closes=c.map(x=>x.close);
  const last=c.at(-1);
  if(!last||closes.length<30) return {state:"insuficiente" as const,score:0};
  const e9=ema(closes,9),e21=ema(closes,21),a=atr(c,14)||0;
  const dist21=Math.abs(last.close-e21);
  if(e9>e21&&last.close>=e21&&dist21<=a*.65) return {state:"pullback_alta" as const,score:1};
  if(e9<e21&&last.close<=e21&&dist21<=a*.65) return {state:"pullback_baixa" as const,score:-1};
  return {state:"sem_pullback" as const,score:0};
}

export function ichimoku(c:Candle[]){
  if(c.length<52) return {tenkan:NaN,kijun:NaN,spanA:NaN,spanB:NaN};
  const mid=(p:number)=>{const w=c.slice(-p);return (Math.max(...w.map(x=>x.high))+Math.min(...w.map(x=>x.low)))/2};
  const tenkan=mid(9),kijun=mid(26),spanB=mid(52);
  return {tenkan,kijun,spanA:(tenkan+kijun)/2,spanB};
}

export function forexSnapshot(c:Candle[]){
  if(c.length<60) throw new Error("Forex exige pelo menos 60 candles para análise completa.");
  const closes=c.map(x=>x.close);
  return {
    price:c.at(-1)!.close,
    ema9:ema(closes,9),ema21:ema(closes,21),ema50:ema(closes,50),
    sma20:sma(closes,20),sma50:sma(closes,50),
    rsi14:rsi(closes,14),macd:macd(closes),atr14:atr(c,14),
    bollinger:bollinger(closes,20,2),vwap:vwap(c),adx14:adx(c,14),
    volumeRatio:volumeRatio(c,20),realizedVolatility:realizedVolatility(closes,20),
    stochastic:stochastic(c),roc12:roc(closes),williamsR14:williamsR(c),
    cci20:cci(c),donchian20:donchian(c),fib:fibonacci(c),pivots:pivotPoints(c),
    levels:supportResistance(c),trend:trendStructure(c),pullback:pullbackState(c),ichimoku:ichimoku(c)
  };
}
