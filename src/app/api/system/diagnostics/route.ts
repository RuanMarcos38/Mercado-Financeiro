import { NextResponse } from "next/server";
import { listMarketStreams } from "@/lib/connectors/market-stream";
import { getCandidates,getAutoTradeConfig } from "@/lib/autotrade/store";
import { getTenantContext } from "@/lib/auth/tenant";

export const dynamic="force-dynamic";

export async function GET(){
  const ctx=await getTenantContext();
  if(!ctx)return NextResponse.json({error:"Não autenticado"},{status:401});

  const now=Date.now();
  const streams=listMarketStreams(ctx.tenantId);
  const candidates=getCandidates(ctx.tenantId);
  const cfg=getAutoTradeConfig(ctx.tenantId);

  const streamHealth=streams.map(s=>{
    const ageSeconds=Math.max(0,Math.round((now-new Date(s.lastSeen).getTime())/1000));
    return {
      source:s.source,
      symbol:s.symbol,
      timeframe:s.timeframe,
      candles:s.candleCount,
      ageSeconds,
      online:ageSeconds<=15,
      stale:ageSeconds>90,
      externalContext:(s.meta as any)?.externalContext??null
    };
  });

  const issues:string[]=[];
  if(!streams.length)issues.push("Nenhum stream recebido.");
  if(streamHealth.some(x=>x.stale))issues.push("Existem streams desatualizados há mais de 90 segundos.");
  if(streamHealth.some(x=>x.candles<60))issues.push("Existem streams com menos de 60 candles para análise completa.");
  if(candidates.some(c=>c.ageSeconds>90))issues.push("Existem candidatos antigos no radar.");

  const mt5=streamHealth.filter(x=>x.source==="mt5");
  const profit=streamHealth.filter(x=>x.source==="profit");

  return NextResponse.json({
    generatedAt:new Date().toISOString(),
    ok:issues.length===0,
    tenant:{id:ctx.tenantId,name:ctx.tenantName},
    engine:{
      minConfidence:cfg.minConfidence,
      minAbsScore:cfg.minAbsScore,
      mode:cfg.mode,
      unifiedMt5Profit:true,
      externalContext:true
    },
    feeds:{
      total:streamHealth.length,
      online:streamHealth.filter(x=>x.online).length,
      mt5:{streams:mt5.length,online:mt5.filter(x=>x.online).length},
      profit:{streams:profit.length,online:profit.filter(x=>x.online).length}
    },
    radar:{
      total:candidates.length,
      aptos:candidates.filter(c=>c.status==="APTO").length,
      bloqueados:candidates.filter(c=>c.status==="BLOQUEADO").length,
      aguardando:candidates.filter(c=>c.status==="AGUARDAR").length
    },
    issues,
    streams:streamHealth,
    candidates:candidates.map(c=>({
      source:c.source,symbol:c.symbol,timeframe:c.timeframe,status:c.status,side:c.side,
      confidence:c.confidence,score:c.score,ageSeconds:c.ageSeconds,blocks:c.blocks
    }))
  });
}
