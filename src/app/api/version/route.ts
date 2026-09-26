import { NextResponse } from "next/server";

export async function GET(){
  return NextResponse.json({
    service:"mercado-financeiro",
    version:"2026-09-26-mt5-key-fallback-v1",
    connectorKeyFallback:true,
    timestamp:new Date().toISOString()
  });
}
