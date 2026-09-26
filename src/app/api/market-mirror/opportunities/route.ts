import { NextResponse } from "next/server";
import { listGlobalOpportunities } from "@/lib/market-mirror/opportunities";
export const dynamic="force-dynamic";
export async function GET(){
  const opportunities=listGlobalOpportunities();
  return NextResponse.json({
    generatedAt:new Date().toISOString(),
    total:opportunities.length,
    aptos:opportunities.filter(x=>x.status==="APTO").length,
    opportunities
  });
}
