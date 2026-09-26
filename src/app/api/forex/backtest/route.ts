import { NextRequest,NextResponse } from "next/server";
import type { Candle } from "@/lib/market/types";
import { parseCandlesCsv } from "@/lib/candle-import";
import { getOandaCandles,getTwelveDataCandles } from "@/lib/forex/providers";
import { backtestForex } from "@/lib/forex/backtest";
import { getMarketStream } from "@/lib/connectors/market-stream";
import { resolveRequestTenant } from "@/lib/auth/request-tenant";

function hasCsvData(csv:unknown){
  return typeof csv==="string"&&csv.trim().split(/\r?\n/).filter(Boolean).length>1;
}

export async function POST(req:NextRequest){
  try{
    const body=await req.json();
    const pair=String(body.pair??"EUR/USD").toUpperCase().replace("_","/");
    const timeframe=(body.timeframe??"5m") as Candle["timeframe"];
    let provider=String(body.provider??"auto");
    let candles:Candle[]=[];

    if(provider==="auto"){
      const tenant=await resolveRequestTenant(req);
      if(tenant){
        const stream=getMarketStream(tenant.tenantId,"mt5",pair,timeframe);
        if(stream&&stream.candles.length>=200){candles=stream.candles;provider="mt5";}
      }
      if(!candles.length&&process.env.OANDA_API_TOKEN){candles=await getOandaCandles(pair,timeframe,1500);provider="oanda";}
      if(!candles.length&&process.env.TWELVE_DATA_API_KEY){candles=await getTwelveDataCandles(pair,timeframe,1500);provider="twelvedata";}
      if(!candles.length&&hasCsvData(body.csv)){candles=parseCandlesCsv(body.csv,pair,timeframe);provider="import";}
      if(!candles.length){
        return NextResponse.json({ok:true,ready:false,status:"AWAITING_MARKET_FEED",pair,timeframe,provider:"none",message:"Backtest aguardando histórico real do MT5/OANDA/Twelve Data ou CSV."});
      }
    }else if(provider==="mt5"){
      const tenant=await resolveRequestTenant(req);
      if(!tenant)return NextResponse.json({error:"Sessão/empresa não identificada."},{status:401});
      const stream=getMarketStream(tenant.tenantId,"mt5",pair,timeframe);
      if(!stream)return NextResponse.json({error:"Stream MT5 ainda não recebido."},{status:404});
      candles=stream.candles;
    }else if(provider==="oanda")candles=await getOandaCandles(pair,timeframe,Number(body.count??1500));
    else if(provider==="twelvedata")candles=await getTwelveDataCandles(pair,timeframe,Number(body.count??1500));
    else if(provider==="import"&&hasCsvData(body.csv))candles=parseCandlesCsv(body.csv,pair,timeframe);
    else return NextResponse.json({ok:true,ready:false,status:"CSV_EMPTY",pair,timeframe,provider,message:"Cole candles reais para executar o backtest."});

    return NextResponse.json({ok:true,ready:true,pair,timeframe,provider,candles:candles.length,...backtestForex(candles,{lookback:body.lookback,horizon:body.horizon,costBps:body.costBps})});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Falha no backtest Forex"},{status:400});
  }
}
