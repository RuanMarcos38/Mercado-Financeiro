import type { Candle } from "@/lib/market/types";
import { analyzeCandles } from "@/lib/analysis-engine";

export function simpleBacktest(candles:Candle[], lookback=60, horizon=5){
  if(candles.length<lookback+horizon+10) throw new Error("Histórico insuficiente para backtest.");
  let signals=0,wins=0,losses=0,flat=0;
  const returns:number[]=[];
  for(let i=lookback;i<candles.length-horizon;i++){
    const window=candles.slice(i-lookback,i+1);
    const a=analyzeCandles(window,{sourceQuality:"imported"});
    if(a.signal.side==="AGUARDAR"){flat++;continue;}
    const entry=candles[i].close;
    const exit=candles[i+horizon].close;
    const ret=(exit-entry)/entry*(a.signal.side==="COMPRA"?1:-1);
    returns.push(ret); signals++;
    if(ret>0) wins++; else losses++;
  }
  const avg=returns.length?returns.reduce((a,b)=>a+b,0)/returns.length:0;
  const winRate=signals?wins/signals*100:0;
  const grossWin=returns.filter(x=>x>0).reduce((a,b)=>a+b,0);
  const grossLoss=Math.abs(returns.filter(x=>x<0).reduce((a,b)=>a+b,0));
  return {
    signals,wins,losses,ignored:flat,
    winRate:Number(winRate.toFixed(2)),
    averageReturnPct:Number((avg*100).toFixed(4)),
    profitFactor:grossLoss?Number((grossWin/grossLoss).toFixed(2)):null,
    horizonCandles:horizon,
    methodology:"rolling out-of-sample simplificado; custos e slippage ainda não aplicados"
  };
}
