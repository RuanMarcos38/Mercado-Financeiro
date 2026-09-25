import { NextResponse } from "next/server";
import { connectorStoreWarning,listMarketStreams } from "@/lib/connectors/market-stream";

export const dynamic="force-dynamic";

export async function GET(){
  const streams=listMarketStreams();
  const now=Date.now();
  return NextResponse.json({
    generatedAt:new Date().toISOString(),
    configured:{
      ingestKey:Boolean(process.env.CONNECTOR_INGEST_KEY),
      redis:Boolean(process.env.REDIS_URL),
      database:Boolean(process.env.DATABASE_URL)
    },
    streams:streams.map(s=>({
      ...s,
      ageSeconds:Math.max(0,Math.round((now-new Date(s.lastSeen).getTime())/1000)),
      online:(now-new Date(s.lastSeen).getTime())<120000
    })),
    warning:connectorStoreWarning()
  });
}
