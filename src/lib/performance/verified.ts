export type VerifiedPerformance={
  symbol:string;
  timeframe:string;
  provider:string;
  signals:number;
  winRate:number;
  profitFactor:number|null;
  maxDrawdownPct:number;
  measuredAt:string;
  accuracyClaimAllowed:boolean;
  accuracyLabel:string|null;
};

const g=globalThis as typeof globalThis & {__verifiedPerformance?:Map<string,VerifiedPerformance>};
if(!g.__verifiedPerformance)g.__verifiedPerformance=new Map();

function key(symbol:string,timeframe:string,provider:string){return [provider,symbol.toUpperCase(),timeframe].join(":");}

export function recordVerifiedPerformance(input:Omit<VerifiedPerformance,"measuredAt"|"accuracyClaimAllowed"|"accuracyLabel">){
  const accuracyClaimAllowed=input.signals>=100&&input.winRate>=99;
  const value:VerifiedPerformance={
    ...input,
    measuredAt:new Date().toISOString(),
    accuracyClaimAllowed,
    accuracyLabel:accuracyClaimAllowed?input.winRate.toFixed(2)+"% verificado":null
  };
  g.__verifiedPerformance!.set(key(input.symbol,input.timeframe,input.provider),value);
  return value;
}

export function getVerifiedPerformance(symbol:string,timeframe:string,provider:string){
  return g.__verifiedPerformance!.get(key(symbol,timeframe,provider))??null;
}
