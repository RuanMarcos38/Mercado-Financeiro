import { NextRequest,NextResponse } from "next/server";
import type { Candle } from "@/lib/market/types";
import { parseCandlesCsv } from "@/lib/candle-import";
import { analyzeForex } from "@/lib/forex/engine";
import { getOandaCandles,getTwelveDataCandles } from "@/lib/forex/providers";
import { getForexNews,estimateNewsRisk } from "@/lib/forex/news";

export const dynamic="force-dynamic";

export async function POST(req:NextRequest){
  try{
    const body=await req.json();
    const pair=String(body.pair??"EUR/USD").toUpperCase().replace("_","/");
    const timeframe=(body.timeframe??"5m") as Candle["timeframe"];
    let candles:Candle[]=[];
    let quality:"licensed"|"public"|"imported"="imported";
    let provider=String(body.provider??"import");

    if(provider==="oanda"){
      candles=await getOandaCandles(pair,timeframe,Number(body.count??300));
      quality="licensed";
    }else if(provider==="twelvedata"){
      candles=await getTwelveDataCandles(pair,timeframe,Number(body.count??300));
      quality="public";
    }else if(typeof body.csv==="string"){
      candles=parseCandlesCsv(body.csv,pair,timeframe);
      quality="imported";
      provider="import";
    }else if(Array.isArray(body.candles)){
      candles=body.candles;
      quality=body.sourceQuality??"imported";
    }else{
      return NextResponse.json({error:"Informe provider configurado, CSV ou candles."},{status:400});
    }

    let news:any[]=[];
    let newsRisk=Number(body.newsRisk);
    if(!Number.isFinite(newsRisk)){
      try{
        news=await getForexNews(pair,24);
        newsRisk=estimateNewsRisk(news);
      }catch{newsRisk=.15;}
    }

    const result=analyzeForex(candles,{
      sourceQuality:quality,
      newsRisk,
      macroBias:Number(body.macroBias??0),
      sessionBias:Number(body.sessionBias??0)
    });

    return NextResponse.json({
      pair,timeframe,provider,candles:candles.length,newsRisk,
      news:news.slice(0,10),
      ...result
    });
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Falha na análise Forex"},{status:400});
  }
}
