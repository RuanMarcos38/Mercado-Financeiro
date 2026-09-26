import { NextRequest,NextResponse } from "next/server";
import { connectorStoreWarning,listMarketStreams } from "@/lib/connectors/market-stream";
import { resolveRequestTenant } from "@/lib/auth/request-tenant";
export const dynamic="force-dynamic";
export async function GET(req:NextRequest){
  const tenant=await resolveRequestTenant(req);
  if(!tenant)return NextResponse.json({error:"Não autenticado"},{status:401});
  const streams=listMarketStreams(tenant.tenantId);
  const now=Date.now();
  return NextResponse.json({
    generatedAt:new Date().toISOString(),
    configured:{ingestKey:true,redis:Boolean(process.env.REDIS_URL),database:Boolean(process.env.DATABASE_URL)},
    streams:streams.map(s=>({...s,ageSeconds:Math.max(0,Math.round((now-new Date(s.lastSeen).getTime())/1000)),online:(now-new Date(s.lastSeen).getTime())<120000})),
    warning:connectorStoreWarning()
  });
}
