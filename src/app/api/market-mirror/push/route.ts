import { NextRequest,NextResponse } from "next/server";
import { ingestGlobalMarketPush,type MarketPush } from "@/lib/connectors/market-stream";

export const dynamic="force-dynamic";

function authorized(req:NextRequest){
  const expected=process.env.MARKET_WORKER_KEY;
  return Boolean(expected)&&req.headers.get("x-market-worker-key")===expected;
}

export async function POST(req:NextRequest){
  if(!authorized(req))return NextResponse.json({error:"Não autorizado"},{status:401});
  try{
    const body=await req.json() as MarketPush;
    if(!body.symbol||!body.timeframe||!Array.isArray(body.candles))throw new Error("symbol, timeframe e candles são obrigatórios");
    const saved=ingestGlobalMarketPush(body);
    return NextResponse.json({
      ok:true,scope:"global",source:saved.source,symbol:saved.symbol,timeframe:saved.timeframe,
      candles:saved.candles.length,lastSeen:saved.lastSeen
    });
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Payload inválido"},{status:400});
  }
}
