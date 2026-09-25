import type { Candle } from "@/lib/market/types";
import { snapshot } from "@/lib/indicators";
import { calculateSignal } from "@/lib/signals";
import { qualityPenalty, type SourceQuality } from "@/lib/data-quality";

export function analyzeCandles(candles:Candle[], opts?:{
  sourceQuality?:SourceQuality;
  macroBias?:number;
  newsRisk?:number;
}){
  const s=snapshot(candles);
  const raw=calculateSignal({
    rsi:s.rsi14,
    macdHistogram:s.macd.histogram,
    emaFast:s.ema9,
    emaSlow:s.ema21,
    price:s.price,
    vwap:s.vwap,
    adx:s.adx14,
    volumeRatio:s.volumeRatio,
    macroBias:opts?.macroBias??0,
    newsRisk:opts?.newsRisk??0.15
  });
  const sourceQuality=opts?.sourceQuality??"imported";
  const confidence=Math.round(raw.confidence*qualityPenalty(sourceQuality));
  const regime=s.adx14>=25
    ? (s.ema9>s.ema21?"TREND_ALTA":"TREND_BAIXA")
    : (s.realizedVolatility>35?"LATERAL_VOLATIL":"LATERAL");
  return {
    generatedAt:new Date().toISOString(),
    sourceQuality,
    regime,
    signal:{...raw,confidence},
    indicators:s,
    disclaimer:"Probabilidade analítica; não representa garantia de resultado."
  };
}
