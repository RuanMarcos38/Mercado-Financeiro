import { NextRequest, NextResponse } from "next/server";
import { parseCandlesCsv } from "@/lib/candle-import";
import { analyzeCandles } from "@/lib/analysis-engine";
import type { Candle } from "@/lib/market/types";

export async function POST(req:NextRequest){
  try{
    const body=await req.json();
    let candles:Candle[]=[];
    if(typeof body.csv==="string"){
      candles=parseCandlesCsv(body.csv,body.symbol??"IMPORT",body.timeframe??"1m");
    }else if(Array.isArray(body.candles)){
      candles=body.candles;
    }else{
      return NextResponse.json({error:"Envie csv ou candles."},{status:400});
    }
    const result=analyzeCandles(candles,{
      sourceQuality:body.sourceQuality??"imported",
      macroBias:Number(body.macroBias??0),
      newsRisk:Number(body.newsRisk??0.15)
    });
    return NextResponse.json({symbol:body.symbol??candles.at(-1)?.symbol??"IMPORT",candles:candles.length,...result});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Falha na análise"},{status:400});
  }
}
