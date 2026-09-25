import { NextRequest, NextResponse } from "next/server";
import { parseCandlesCsv } from "@/lib/candle-import";
import { simpleBacktest } from "@/lib/backtest";

export async function POST(req:NextRequest){
  try{
    const body=await req.json();
    const candles=typeof body.csv==="string"
      ?parseCandlesCsv(body.csv,body.symbol??"IMPORT",body.timeframe??"1m")
      :body.candles;
    if(!Array.isArray(candles)) return NextResponse.json({error:"Envie csv ou candles."},{status:400});
    return NextResponse.json(simpleBacktest(candles,Number(body.lookback??60),Number(body.horizon??5)));
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Falha no backtest"},{status:400});
  }
}
