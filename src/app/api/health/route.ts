import { NextResponse } from "next/server";
import { listMarketStreams } from "@/lib/connectors/market-stream";
import { getAutoTradeConfig,getCandidates,listIntents } from "@/lib/autotrade/store";

export const dynamic="force-dynamic";

export async function GET(){
  const streams=listMarketStreams();
  const cfg=getAutoTradeConfig();
  const candidates=getCandidates();
  const now=Date.now();
  const online=streams.filter(s=>now-new Date(s.lastSeen).getTime()<120000);

  return NextResponse.json({
    ok:true,
    service:"mercado-financeiro",
    timestamp:new Date().toISOString(),
    runtime:{
      port:process.env.PORT??null,
      nodeEnv:process.env.NODE_ENV??null
    },
    backend:{
      connectorIngestKey:Boolean(process.env.CONNECTOR_INGEST_KEY),
      databaseUrlConfigured:Boolean(process.env.DATABASE_URL),
      redisUrlConfigured:Boolean(process.env.REDIS_URL),
      autotradeAdminKey:Boolean(process.env.AUTOTRADE_ADMIN_KEY),
      autotradeLiveEnabled:process.env.AUTOTRADE_LIVE_ENABLED==="true"
    },
    market:{
      streams:streams.length,
      onlineStreams:online.length,
      candidates:candidates.length,
      aptCandidates:candidates.filter(x=>x.status==="APTO").length,
      pendingIntents:listIntents().filter(x=>["PENDING","CLAIMED"].includes(x.status)).length
    },
    autotrade:{
      mode:cfg.mode,
      minConfidence:cfg.minConfidence,
      minAbsScore:cfg.minAbsScore
    },
    providers:{
      b3:Boolean(process.env.B3_MARKET_DATA_URL&&process.env.B3_MARKET_DATA_TOKEN),
      cme:Boolean(process.env.CME_API_URL&&process.env.CME_API_KEY),
      fred:Boolean(process.env.FRED_API_KEY),
      broker:Boolean(process.env.BROKER_API_URL&&process.env.BROKER_API_KEY),
      oanda:Boolean(process.env.OANDA_API_TOKEN),
      twelveData:Boolean(process.env.TWELVE_DATA_API_KEY)
    },
    notes:[
      !process.env.CONNECTOR_INGEST_KEY?"CONNECTOR_INGEST_KEY ausente: MT5/Profit serão rejeitados em produção.":null,
      streams.length===0?"Nenhum stream MT5/Profit recebido ainda.":null,
      "databaseUrlConfigured/redisUrlConfigured indicam presença da variável; conectividade real deve ser validada separadamente."
    ].filter(Boolean)
  });
}
