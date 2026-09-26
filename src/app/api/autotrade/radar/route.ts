import { NextRequest,NextResponse } from "next/server";
import { listMarketStreams,getBestMarketStream } from "@/lib/connectors/market-stream";
import { getAutoTradeConfig,getCandidates,setCandidates } from "@/lib/autotrade/store";
import { processStream } from "@/lib/autotrade/engine";
import { resolveRequestTenant } from "@/lib/auth/request-tenant";
import { MARKET_ANALYSIS_MAX_AGE_SECONDS } from "@/lib/market-intelligence/cadence";

export const dynamic="force-dynamic";

export async function GET(req:NextRequest){
 try{
  const tenant=await resolveRequestTenant(req);
  if(!tenant)return NextResponse.json({error:"Não autenticado"},{status:401});

  const now=Date.now();
  const allStreams=listMarketStreams(tenant.tenantId);
  const activeStreams=allStreams.filter(s=>(now-new Date(s.lastSeen).getTime())<=MARKET_ANALYSIS_MAX_AGE_SECONDS*1000);
  const warmup:any[]=[];
  const activeKeys=new Set<string>();

  for(const s of activeStreams){
    const stream=getBestMarketStream(tenant.tenantId,s.symbol,s.timeframe);
    if(!stream)continue;

    activeKeys.add([stream.source,stream.symbol,stream.timeframe].join(":"));

    const result=processStream(tenant.tenantId,{
      source:stream.source,
      symbol:stream.symbol,
      timeframe:stream.timeframe,
      lastSeen:stream.lastSeen,
      candles:stream.candles,
      bid:stream.bid,
      ask:stream.ask,
      spread:stream.spread,
      meta:stream.meta
    });
    if(!result.ready&&result.warmup){
      warmup.push({source:stream.source,symbol:stream.symbol,timeframe:stream.timeframe,...result.warmup});
    }
  }

  // Remove candidatos antigos, inclusive timeframes que o bridge deixou de transmitir.
  setCandidates(
    tenant.tenantId,
    getCandidates(tenant.tenantId).filter(c=>activeKeys.has([c.source,c.symbol,c.timeframe].join(":")))
  );

  const cfg=getAutoTradeConfig(tenant.tenantId);
  const candidates=getCandidates(tenant.tenantId);

  const groups=new Map<string,typeof candidates>();
  for(const c of candidates){
    const k=c.source+":"+c.symbol;
    groups.set(k,[...(groups.get(k)??[]),c]);
  }

  const consensus=[...groups.entries()].map(([key,items])=>{
    const buy=items.filter(x=>x.status==="APTO"&&x.side==="BUY");
    const sell=items.filter(x=>x.status==="APTO"&&x.side==="SELL");
    const direction=buy.length>sell.length?"BUY":sell.length>buy.length?"SELL":"WAIT";
    const selected=direction==="BUY"?buy:direction==="SELL"?sell:[];
    return {
      key,source:items[0]?.source,symbol:items[0]?.symbol,direction,
      confirmations:selected.length,
      timeframes:items.map(x=>x.timeframe),
      confidence:selected.length?Math.round(selected.reduce((a,b)=>a+b.confidence,0)/selected.length):0,
      ready:selected.length>=Math.min(2,items.length)
    };
  }).sort((a,b)=>Number(b.ready)-Number(a.ready)||b.confidence-a.confidence);

  return NextResponse.json({
    generatedAt:new Date().toISOString(),
    mode:cfg.mode,
    liveAllowed:process.env.AUTOTRADE_LIVE_ENABLED==="true",
    total:candidates.length,
    aptos:candidates.filter(x=>x.status==="APTO").length,
    bloqueados:candidates.filter(x=>x.status==="BLOQUEADO").length,
    aguardando:candidates.filter(x=>x.status==="AGUARDAR").length,
    candidates,consensus,warmup,
    streams:activeStreams.length,
    staleStreams:allStreams.length-activeStreams.length
  });
 }catch(error){
  return NextResponse.json({error:error instanceof Error?error.message:"Falha ao carregar Radar"},{status:500});
 }
}
