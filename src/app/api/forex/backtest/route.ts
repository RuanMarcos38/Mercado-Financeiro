import { NextRequest,NextResponse } from "next/server";
import type { Candle } from "@/lib/market/types";
import { parseCandlesCsv } from "@/lib/candle-import";
import { getOandaCandles,getTwelveDataCandles } from "@/lib/forex/providers";
import { backtestForex } from "@/lib/forex/backtest";

export async function POST(req:NextRequest){
  try{
    const body=await req.json();
    const pair=String(body.pair??"EUR/USD").toUpperCase().replace("_","/");
    const timeframe=(body.timeframe??"5m") as Candle["timeframe"];
    const provider=String(body.provider??"import");
    let candles:Candle[]=[];
    if(provider==="oanda") candles=await getOandaCandles(pair,timeframe,Number(body.count??1500));
    else if(provider==="twelvedata") candles=await getTwelveDataCandles(pair,timeframe,Number(body.count??1500));
    else if(typeof body.csv==="string") candles=parseCandlesCsv(body.csv,pair,timeframe);
    else if(Array.isArray(body.candles)) candles=body.candles;
    else return NextResponse.json({error:"Informe provider, CSV ou candles."},{status:400});

    return NextResponse.json({
      pair,timeframe,provider,candles:candles.length,
      ...backtestForex(candles,{lookback:body.lookback,horizon:body.horizon,costBps:body.costBps})
    });
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Falha no backtest Forex"},{status:400});
  }
}
