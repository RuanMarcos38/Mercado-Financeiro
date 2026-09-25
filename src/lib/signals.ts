export type SignalSide = "COMPRA" | "VENDA" | "AGUARDAR";

export type SignalInput = {
  rsi: number;
  macdHistogram: number;
  emaFast: number;
  emaSlow: number;
  price: number;
  vwap: number;
  adx: number;
  volumeRatio: number;
  macroBias: number; // -1..1
  newsRisk: number; // 0..1
};

export type SignalResult = {
  side: SignalSide;
  score: number;
  confidence: number;
  reasons: string[];
  risk: "BAIXO" | "MÉDIO" | "ALTO";
};

const clamp = (v:number,min:number,max:number)=>Math.min(max,Math.max(min,v));

export function calculateSignal(i: SignalInput): SignalResult {
  let score = 0;
  const reasons:string[]=[];

  if (i.emaFast > i.emaSlow) { score += 18; reasons.push("EMA curta acima da longa"); }
  else { score -= 18; reasons.push("EMA curta abaixo da longa"); }

  if (i.macdHistogram > 0) { score += 14; reasons.push("MACD positivo"); }
  else { score -= 14; reasons.push("MACD negativo"); }

  if (i.rsi >= 52 && i.rsi <= 68) { score += 10; reasons.push("RSI confirma força compradora sem sobrecompra extrema"); }
  if (i.rsi <= 48 && i.rsi >= 32) { score -= 10; reasons.push("RSI confirma força vendedora sem sobrevenda extrema"); }
  if (i.rsi > 75) { score -= 8; reasons.push("RSI em sobrecompra: risco de exaustão"); }
  if (i.rsi < 25) { score += 8; reasons.push("RSI em sobrevenda: risco de repique"); }

  if (i.price > i.vwap) { score += 12; reasons.push("Preço acima da VWAP"); }
  else { score -= 12; reasons.push("Preço abaixo da VWAP"); }

  if (i.adx >= 25) {
    const trendBoost = i.emaFast > i.emaSlow ? 8 : -8;
    score += trendBoost;
    reasons.push("ADX confirma tendência");
  } else {
    reasons.push("ADX indica tendência fraca/lateralização");
  }

  if (i.volumeRatio >= 1.3) {
    score += score >= 0 ? 8 : -8;
    reasons.push("Volume confirma o movimento");
  }

  score += clamp(i.macroBias,-1,1) * 18;

  const absolute = Math.abs(score);
  let side:SignalSide = "AGUARDAR";
  if (score >= 28) side = "COMPRA";
  if (score <= -28) side = "VENDA";

  const confidence = Math.round(clamp(absolute * (1 - i.newsRisk * 0.45), 5, 95));
  const risk = i.newsRisk >= .7 ? "ALTO" : i.newsRisk >= .35 ? "MÉDIO" : "BAIXO";

  return {
    side,
    score: Math.round(score),
    confidence,
    reasons,
    risk
  };
}
