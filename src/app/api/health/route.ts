import { NextResponse } from "next/server";

export async function GET(){
  return NextResponse.json({
    ok:true,
    service:"mercado-financeiro",
    timestamp:new Date().toISOString(),
    providers:{
      b3:Boolean(process.env.B3_MARKET_DATA_URL && process.env.B3_MARKET_DATA_TOKEN),
      cme:Boolean(process.env.CME_API_URL && process.env.CME_API_KEY),
      fred:Boolean(process.env.FRED_API_KEY),
      broker:Boolean(process.env.BROKER_API_URL && process.env.BROKER_API_KEY)
    }
  });
}
