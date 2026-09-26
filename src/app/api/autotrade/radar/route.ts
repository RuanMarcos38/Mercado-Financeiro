import { NextRequest,NextResponse } from "next/server";
import { listMarketStreams,getMarketStream } from "@/lib/connectors/market-stream";
import { getAutoTradeConfig,getCandidates } from "@/lib/autotrade/store";
import { processStream } from "@/lib/autotrade/engine";
import { resolveRequestTenant } from "@/lib/auth/request-tenant";
export const dynamic="force-dynamic";
export async function GET(req:NextRequest){
 try{
  const tenant=await resolveRequestTenant(req);
  if(!tenant)return NextResponse.json({error:"Não autenticado"},{status:401});
  const streams=listMarketStreams(tenant.tenantId);
  const warmup:any[]=[];
  for(const s of streams){
    const stream=getMarketStream(tenant.tenantId,s.source,s.symbol,s.timeframe);
    if(!stream)continue;
    const result=processStream(tenant.tenantId,{source:s.source,symbol:s.symbol,timeframe:s.timeframe,lastSeen:s.lastSeen,candles:stream.candles,bid:stream.bid,ask:stream.ask,spread:stream.spread,meta:stream.meta});
    if(!result.ready&&result.warmup)warmup.push({source:s.source,symbol:s.symbol,timeframe:s.timeframe,...result.warmup});
  }
  const cfg=getAutoTradeConfig(tenant.tenantId);
  const candidates=getCandidates(tenant.tenantId);
  const groups=new Map<string,typeof candidates>();
  for(const c of candidates){const k=c.source+":"+c.symbol;groups.set(k,[...(groups.get(k)??[]),c]);}
  const consensus=[...groups.entries()].map(([key,items])=>{
    const buy=items.filter(x=>x.status==="APTO"&&x.side==="BUY");
    const sell=items.filter(x=>x.status==="APTO"&&x.side==="SELL");
    const direction=buy.length>sell.length?"BUY":sell.length>buy.length?"SELL":"WAIT";
    const selected=direction==="BUY"?buy:direction==="SELL"?sell:[];
    return {key,source:items[0]?.source,symbol:items[0]?.symbol,direction,confirmations:selected.length,timeframes:items.map(x=>x.timeframe),confidence:selected.length?Math.round(selected.reduce((a,b)=>a+b.confidence,0)/selected.length):0,ready:selected.length>=Math.min(2,items.length)};
  }).sort((a,b)=>Number(b.ready)-Number(a.ready)||b.confidence-a.confidence);
  return NextResponse.json({generatedAt:new Date().toISOString(),mode:cfg.mode,liveAllowed:process.env.AUTOTRADE_LIVE_ENABLED==="true",total:candidates.length,aptos:candidates.filter(x=>x.status==="APTO").length,candidates,consensus,warmup,streams:streams.length});
 }catch(error){
  return NextResponse.json({error:error instanceof Error?error.message:"Falha ao carregar Radar"},{status:500});
 }
}
