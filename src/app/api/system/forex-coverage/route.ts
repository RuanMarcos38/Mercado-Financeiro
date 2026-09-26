import { NextRequest,NextResponse } from "next/server";
import { resolveRequestTenant } from "@/lib/auth/request-tenant";
import { hydrateSharedMarketStreams } from "@/lib/connectors/shared-streams";
import { listMarketStreams } from "@/lib/connectors/market-stream";
import { FOREX_PAIRS } from "@/lib/forex/catalog";

export const dynamic="force-dynamic";

export async function GET(req:NextRequest){
  const tenant=await resolveRequestTenant(req);
  if(!tenant)return NextResponse.json({error:"Não autenticado"},{status:401});
  await hydrateSharedMarketStreams(tenant.tenantId);

  const now=Date.now();
  const streams=listMarketStreams(tenant.tenantId).filter(s=>s.source==="mt5"&&s.symbol.includes("/"));
  const bySymbol=new Map<string,{timeframes:Set<string>;fresh:number;lastSeen:string}>();
  for(const s of streams){
    const row=bySymbol.get(s.symbol)??{timeframes:new Set<string>(),fresh:0,lastSeen:s.lastSeen};
    row.timeframes.add(s.timeframe);
    if(now-new Date(s.lastSeen).getTime()<=20000)row.fresh++;
    if(new Date(s.lastSeen)>new Date(row.lastSeen))row.lastSeen=s.lastSeen;
    bySymbol.set(s.symbol,row);
  }

  const symbols=[...bySymbol.entries()].map(([symbol,row])=>({
    symbol,
    timeframes:[...row.timeframes].sort(),
    freshStreams:row.fresh,
    complete:["1m","5m","10m","1h"].every(tf=>row.timeframes.has(tf)),
    lastSeen:row.lastSeen
  })).sort((a,b)=>a.symbol.localeCompare(b.symbol));

  return NextResponse.json({
    generatedAt:new Date().toISOString(),
    fallbackCatalog:FOREX_PAIRS.length,
    receivedPairs:symbols.length,
    completePairs:symbols.filter(x=>x.complete).length,
    freshPairs:symbols.filter(x=>x.freshStreams>0).length,
    streams:streams.length,
    symbols
  });
}
