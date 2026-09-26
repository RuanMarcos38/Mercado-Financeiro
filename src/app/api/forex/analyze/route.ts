import { NextRequest,NextResponse } from "next/server";
import type { Candle } from "@/lib/market/types";
import { parseCandlesCsv } from "@/lib/candle-import";
import { analyzeForex } from "@/lib/forex/engine";
import { getOandaCandles,getTwelveDataCandles } from "@/lib/forex/providers";
import { getForexNews,estimateNewsRisk } from "@/lib/forex/news";
import { getMarketStream } from "@/lib/connectors/market-stream";
import { resolveRequestTenant } from "@/lib/auth/request-tenant";

export const dynamic="force-dynamic";

function hasCsvData(csv:unknown){
  if(typeof csv!=="string")return false;
  const lines=csv.trim().split(/\r?\n/).filter(Boolean);
  return lines.length>1;
}

export async function POST(req:NextRequest){
  try{
    const body=await req.json();
    const pair=String(body.pair??"EUR/USD").toUpperCase().replace("_","/");
    const timeframe=(body.timeframe??"5m") as Candle["timeframe"];
    const requested=String(body.provider??"auto");
    const tenant=await resolveRequestTenant(req);

    let candles:Candle[]=[];
    let quality:"licensed"|"public"|"imported"="imported";
    let provider=requested;

    if(requested==="auto"){
      if(tenant){
        const mt5=getMarketStream(tenant.tenantId,"mt5",pair,timeframe);
        if(mt5&&mt5.candles.length>=60){
          candles=mt5.candles;
          quality="licensed";
          provider="mt5";
        }
      }

      if(!candles.length&&process.env.OANDA_API_TOKEN){
        candles=await getOandaCandles(pair,timeframe,Number(body.count??300));
        quality="licensed";
        provider="oanda";
      }

      if(!candles.length&&process.env.TWELVE_DATA_API_KEY){
        candles=await getTwelveDataCandles(pair,timeframe,Number(body.count??300));
        quality="public";
        provider="twelvedata";
      }

      if(!candles.length&&hasCsvData(body.csv)){
        candles=parseCandlesCsv(body.csv,pair,timeframe);
        quality="imported";
        provider="import";
      }

      if(!candles.length){
        return NextResponse.json({
          ok:true,
          ready:false,
          status:"AWAITING_MARKET_FEED",
          pair,
          timeframe,
          provider:"none",
          message:"Aguardando feed real. Conecte MetaTrader 5/Profit ou configure OANDA/Twelve Data. CSV só é usado quando contém candles reais.",
          candles:0
        });
      }
    }else if(requested==="mt5"){
      if(!tenant)return NextResponse.json({error:"Sessão/empresa não identificada."},{status:401});
      const stream=getMarketStream(tenant.tenantId,"mt5",pair,timeframe);
      if(!stream)return NextResponse.json({error:"Stream MT5 ainda não recebido para este par/timeframe."},{status:404});
      candles=stream.candles;quality="licensed";provider="mt5";
    }else if(requested==="oanda"){
      candles=await getOandaCandles(pair,timeframe,Number(body.count??300));quality="licensed";
    }else if(requested==="twelvedata"){
      candles=await getTwelveDataCandles(pair,timeframe,Number(body.count??300));quality="public";
    }else if(requested==="import"){
      if(!hasCsvData(body.csv)){
        return NextResponse.json({
          ok:true,ready:false,status:"CSV_EMPTY",pair,timeframe,provider:"import",
          message:"Cole candles OHLCV reais para usar o modo importação."
        });
      }
      candles=parseCandlesCsv(body.csv,pair,timeframe);quality="imported";
    }else if(Array.isArray(body.candles)){
      candles=body.candles;quality=body.sourceQuality??"imported";
    }else{
      return NextResponse.json({error:"Fonte de dados inválida."},{status:400});
    }

    if(candles.length<60){
      return NextResponse.json({
        ok:true,ready:false,status:"WARMUP",pair,timeframe,provider,candles:candles.length,
        requiredCandles:60,
        missingCandles:Math.max(0,60-candles.length),
        message:`Histórico insuficiente: ${candles.length}/60 candles recebidos.`
      });
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
      sourceQuality:quality,newsRisk,
      macroBias:Number(body.macroBias??0),
      sessionBias:Number(body.sessionBias??0)
    });

    return NextResponse.json({
      ok:true,ready:true,pair,timeframe,provider,candles:candles.length,newsRisk,
      news:news.slice(0,10),...result
    });
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Falha na análise Forex"},{status:400});
  }
}
