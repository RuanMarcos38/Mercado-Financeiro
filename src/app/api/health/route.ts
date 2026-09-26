import { NextResponse } from "next/server";

export const dynamic="force-dynamic";

export async function GET(){
  return NextResponse.json({
    ok:true,
    service:"mercado-financeiro",
    timestamp:new Date().toISOString(),
    runtime:{port:process.env.PORT??null,nodeEnv:process.env.NODE_ENV??null},
    auth:{
      supabaseUrl:Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      publishableKey:Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
      secretKey:Boolean(process.env.SUPABASE_SECRET_KEY)
    },
    infrastructure:{
      databaseUrlConfigured:Boolean(process.env.DATABASE_URL),
      redisUrlConfigured:Boolean(process.env.REDIS_URL),
      autotradeLiveEnabled:process.env.AUTOTRADE_LIVE_ENABLED==="true"
    },
    providers:{
      b3:Boolean(process.env.B3_MARKET_DATA_URL&&process.env.B3_MARKET_DATA_TOKEN),
      cme:Boolean(process.env.CME_API_URL&&process.env.CME_API_KEY),
      fred:Boolean(process.env.FRED_API_KEY),
      broker:Boolean(process.env.BROKER_API_URL&&process.env.BROKER_API_KEY),
      oanda:Boolean(process.env.OANDA_API_TOKEN),
      twelveData:Boolean(process.env.TWELVE_DATA_API_KEY)
    }
  });
}
