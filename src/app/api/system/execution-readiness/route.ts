import { NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth/tenant";
import { listMarketStreams } from "@/lib/connectors/market-stream";
import { getAutoTradeConfig } from "@/lib/autotrade/store";

export const dynamic="force-dynamic";

export async function GET(){
  const ctx=await getTenantContext();
  if(!ctx)return NextResponse.json({error:"Não autenticado"},{status:401});

  const streams=listMarketStreams(ctx.tenantId);
  const now=Date.now();
  const mt5=streams.filter(s=>s.source==="mt5");
  const profit=streams.filter(s=>s.source==="profit");
  const online=(x:any)=>now-new Date(x.lastSeen).getTime()<15000;
  const cfg=getAutoTradeConfig(ctx.tenantId);

  return NextResponse.json({
    generatedAt:new Date().toISOString(),
    market:{
      mt5:{configured:mt5.length>0,online:mt5.some(online),streams:mt5.length},
      profit:{configured:profit.length>0,online:profit.some(online),streams:profit.length}
    },
    analysis:{
      unifiedEngine:true,
      mode:cfg.mode,
      minConfidence:cfg.minConfidence,
      minAbsScore:cfg.minAbsScore
    },
    whatsapp:{
      metaConfigured:Boolean(process.env.META_WHATSAPP_TOKEN&&process.env.META_WHATSAPP_PHONE_NUMBER_ID&&process.env.META_WHATSAPP_SIGNAL_TEMPLATE),
      fallbackDestinationConfigured:Boolean(process.env.MARKET_ALERT_WHATSAPP_E164),
      minConfidence:Number(process.env.MARKET_ALERT_MIN_CONFIDENCE||75)
    },
    execution:{
      paperReady:true,
      liveServerEnabled:process.env.AUTOTRADE_LIVE_ENABLED==="true",
      note:"Execução real deve permanecer condicionada às credenciais da corretora e confirmação operacional."
    }
  });
}
