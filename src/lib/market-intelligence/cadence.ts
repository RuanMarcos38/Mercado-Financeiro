export const MARKET_UI_REFRESH_MS=15_000;
export const MARKET_ANALYSIS_MAX_AGE_SECONDS=20;

export function marketDataAgeSeconds(lastSeen?:string|null){
  if(!lastSeen)return Number.POSITIVE_INFINITY;
  return Math.max(0,Math.round((Date.now()-new Date(lastSeen).getTime())/1000));
}

export function isMarketAnalysisFresh(lastSeen?:string|null){
  return marketDataAgeSeconds(lastSeen)<=MARKET_ANALYSIS_MAX_AGE_SECONDS;
}
