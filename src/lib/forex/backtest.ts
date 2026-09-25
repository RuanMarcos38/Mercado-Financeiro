import type { Candle } from "@/lib/market/types";
import { analyzeForex } from "@/lib/forex/engine";

export function backtestForex(candles:Candle[],opts?:{lookback?:number;horizon?:number;costBps?:number}){
  const lookback=Math.max(60,Number(opts?.lookback??120));
  const horizon=Math.max(1,Number(opts?.horizon??5));
  const costBps=Math.max(0,Number(opts?.costBps??1.5));
  if(candles.length<lookback+horizon+20) throw new Error("Histórico insuficiente para backtest Forex.");

  let signals=0,wins=0,losses=0,ignored=0;
  let grossWin=0,grossLoss=0;
  const returns:number[]=[];
  let equity=1,peak=1,maxDrawdown=0;

  for(let i=lookback;i<candles.length-horizon;i++){
    const window=candles.slice(i-lookback,i+1);
    const a=analyzeForex(window,{sourceQuality:"imported",newsRisk:.1});
    const side=a.signal.side;
    if(side==="AGUARDAR"){ignored++;continue;}
    const entry=candles[i].close;
    const exit=candles[i+horizon].close;
    const dir=side==="COMPRA"?1:-1;
    const raw=((exit-entry)/entry)*dir;
    const net=raw-(costBps/10000);
    returns.push(net);signals++;
    equity*=1+net;
    peak=Math.max(peak,equity);
    maxDrawdown=Math.max(maxDrawdown,(peak-equity)/peak);
    if(net>0){wins++;grossWin+=net;}else{losses++;grossLoss+=Math.abs(net);}
  }

  const avg=returns.length?returns.reduce((a,b)=>a+b,0)/returns.length:0;
  const winRate=signals?(wins/signals)*100:0;
  const payoff=losses&&wins?(grossWin/wins)/(grossLoss/losses):null;
  const expectancy=avg*100;

  return {
    signals,wins,losses,ignored,
    winRate:Number(winRate.toFixed(2)),
    profitFactor:grossLoss?Number((grossWin/grossLoss).toFixed(2)):null,
    payoff:payoff==null?null:Number(payoff.toFixed(2)),
    expectancyPct:Number(expectancy.toFixed(4)),
    maxDrawdownPct:Number((maxDrawdown*100).toFixed(2)),
    horizonCandles:horizon,
    costBps,
    methodology:"rolling out-of-sample simplificado com custo por operação; usar forward test antes de produção",
    target99:false,
    note:"A plataforma mede a efetividade observada; 99% não é assumido nem garantido."
  };
}
