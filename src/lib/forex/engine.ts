import type { Candle } from "@/lib/market/types";
import type { SourceQuality } from "@/lib/data-quality";
import { qualityPenalty } from "@/lib/data-quality";
import { forexSnapshot } from "@/lib/forex/indicators";

const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));

export type ForexSignal={
  side:"COMPRA"|"VENDA"|"AGUARDAR";
  confidence:number;
  score:number;
  risk:"BAIXO"|"MÉDIO"|"ALTO";
  reasons:string[];
  warnings:string[];
  setup:string[];
};

export function analyzeForex(candles:Candle[],opts?:{
  sourceQuality?:SourceQuality;
  newsRisk?:number;
  macroBias?:number;
  sessionBias?:number;
}){
  const s=forexSnapshot(candles);
  let score=0;
  const reasons:string[]=[];
  const warnings:string[]=[];
  const setup:string[]=[];

  if(s.trend.direction==="alta"){score+=18;reasons.push("Estrutura de tendência de alta");}
  if(s.trend.direction==="baixa"){score-=18;reasons.push("Estrutura de tendência de baixa");}
  if(s.trend.direction==="lateral") warnings.push("Mercado lateral: reduzir convicção direcional");

  if(s.ema9>s.ema21&&s.ema21>s.ema50){score+=14;reasons.push("Médias móveis alinhadas para alta");}
  if(s.ema9<s.ema21&&s.ema21<s.ema50){score-=14;reasons.push("Médias móveis alinhadas para baixa");}

  if(s.sma20>s.sma50&&s.price>s.sma20){score+=5;reasons.push("SMA 20/50 confirma estrutura compradora");}
  if(s.sma20<s.sma50&&s.price<s.sma20){score-=5;reasons.push("SMA 20/50 confirma estrutura vendedora");}

  if(s.price>s.vwap){score+=4;reasons.push("Preço acima da VWAP");}
  if(s.price<s.vwap){score-=4;reasons.push("Preço abaixo da VWAP");}

  const bbMid=(s.bollinger.upper+s.bollinger.lower)/2;
  if(s.price>bbMid){score+=2;} else if(s.price<bbMid){score-=2;}
  if(s.price>=s.bollinger.upper) warnings.push("Preço na banda superior de Bollinger");
  if(s.price<=s.bollinger.lower) warnings.push("Preço na banda inferior de Bollinger");

  if(s.macd.histogram>0){score+=8;reasons.push("MACD com momentum comprador");}
  if(s.macd.histogram<0){score-=8;reasons.push("MACD com momentum vendedor");}

  if(s.rsi14>52&&s.rsi14<72){score+=6;reasons.push("RSI confirma força compradora");}
  if(s.rsi14<48&&s.rsi14>28){score-=6;reasons.push("RSI confirma força vendedora");}
  if(s.rsi14>=72) warnings.push("RSI em sobrecompra");
  if(s.rsi14<=28) warnings.push("RSI em sobrevenda");

  if(s.adx14>=25){
    score+=score>=0?8:-8;
    reasons.push("ADX confirma força de tendência");
  }else warnings.push("ADX abaixo de 25: tendência menos definida");

  if(s.pullback.score>0){score+=10;setup.push("Pullback comprador próximo à EMA 21");}
  if(s.pullback.score<0){score-=10;setup.push("Pullback vendedor próximo à EMA 21");}

  const cloudTop=Math.max(s.ichimoku.spanA,s.ichimoku.spanB);
  const cloudBottom=Math.min(s.ichimoku.spanA,s.ichimoku.spanB);
  if(Number.isFinite(cloudTop)&&s.price>cloudTop){score+=6;reasons.push("Preço acima da nuvem de Ichimoku");}
  if(Number.isFinite(cloudBottom)&&s.price<cloudBottom){score-=6;reasons.push("Preço abaixo da nuvem de Ichimoku");}

  if(s.stochastic.k>s.stochastic.d&&s.stochastic.k<80){score+=4;}
  if(s.stochastic.k<s.stochastic.d&&s.stochastic.k>20){score-=4;}

  if(s.cci20>50){score+=3;}
  if(s.cci20<-50){score-=3;}
  if(s.roc12>0){score+=3;}else if(s.roc12<0){score-=3;}

  if(s.williamsR14>-50&&s.williamsR14<-20){score+=2;}
  if(s.williamsR14<-50&&s.williamsR14>-80){score-=2;}
  if(s.williamsR14>=-20) warnings.push("Williams %R em zona de sobrecompra");
  if(s.williamsR14<=-80) warnings.push("Williams %R em zona de sobrevenda");

  if(s.price>s.donchian20.upper){score+=5;setup.push("Rompimento superior de Donchian");}
  if(s.price<s.donchian20.lower){score-=5;setup.push("Rompimento inferior de Donchian");}

  if(s.price>s.pivots.pivot){score+=2;}else if(s.price<s.pivots.pivot){score-=2;}

  if(s.volumeRatio>=1.3){
    score+=score>=0?5:-5;
    reasons.push("Volume/tick volume acima da média confirma o movimento");
  }

  const nearestFib=Object.entries(s.fib.levels)
    .map(([level,value])=>({level,value,dist:Math.abs(s.price-value)}))
    .sort((a,b)=>a.dist-b.dist)[0];
  if(nearestFib && nearestFib.dist<=(s.atr14||0)*.35){
    setup.push(`Preço próximo da retração Fibonacci ${nearestFib.level}`);
  }

  const support=s.levels.support.filter(x=>x<=s.price).sort((a,b)=>b-a)[0];
  const resistance=s.levels.resistance.filter(x=>x>=s.price).sort((a,b)=>a-b)[0];
  if(support) setup.push(`Suporte técnico próximo: ${support.toFixed(5)}`);
  if(resistance) setup.push(`Resistência técnica próxima: ${resistance.toFixed(5)}`);

  const macro=clamp(opts?.macroBias??0,-1,1);
  score+=macro*12;
  if(Math.abs(macro)>.2) reasons.push("Contexto macro incluiu viés direcional");

  const session=clamp(opts?.sessionBias??0,-1,1);
  score+=session*4;

  if(s.realizedVolatility>=55) warnings.push("Volatilidade realizada elevada");
  if(s.realizedVolatility<=8) warnings.push("Volatilidade realizada baixa");

  const newsRisk=clamp(opts?.newsRisk??.15,0,1);
  if(newsRisk>=.65) warnings.push("Notícias/eventos de alto impacto: risco de gap, spike e slippage");
  const rawConfidence=clamp(Math.abs(score)*1.18,5,95);
  const quality=qualityPenalty(opts?.sourceQuality??"imported");
  const confidence=Math.round(rawConfidence*quality*(1-newsRisk*.38));

  let side:ForexSignal["side"]="AGUARDAR";
  if(score>=30&&confidence>=45) side="COMPRA";
  if(score<=-30&&confidence>=45) side="VENDA";

  const indicatorsEvaluated={
    trend:s.trend,
    ema:{ema9:s.ema9,ema21:s.ema21,ema50:s.ema50},
    sma:{sma20:s.sma20,sma50:s.sma50},
    rsi:s.rsi14,
    macd:s.macd,
    adx:s.adx14,
    atr:s.atr14,
    bollinger:s.bollinger,
    vwap:s.vwap,
    stochastic:s.stochastic,
    roc:s.roc12,
    williamsR:s.williamsR14,
    cci:s.cci20,
    donchian:s.donchian20,
    fibonacci:s.fib,
    pivots:s.pivots,
    supportResistance:s.levels,
    pullback:s.pullback,
    ichimoku:s.ichimoku,
    volumeRatio:s.volumeRatio,
    realizedVolatility:s.realizedVolatility
  };

  return {
    generatedAt:new Date().toISOString(),
    regime:s.trend.direction,
    sourceQuality:opts?.sourceQuality??"imported",
    snapshot:s,
    indicatorsEvaluated,
    indicatorCoverage:Object.keys(indicatorsEvaluated).length,
    signal:{
      side,
      confidence,
      score:Math.round(score),
      risk:newsRisk>=.65?"ALTO":newsRisk>=.35?"MÉDIO":"BAIXO",
      reasons,
      warnings,
      setup
    } satisfies ForexSignal,
    note:"Acurácia deve ser medida em backtest e forward test; não existe garantia técnica de 99%."
  };
}
