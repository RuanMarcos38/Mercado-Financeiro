import { NextRequest,NextResponse } from "next/server";
import { ingestMarketPush,type MarketPush } from "@/lib/connectors/market-stream";

export const dynamic="force-dynamic";

function authorized(req:NextRequest){
  const required=process.env.CONNECTOR_INGEST_KEY;
  if(!required) return process.env.NODE_ENV!=="production";
  const got=req.headers.get("x-connector-key")??"";
  return got===required;
}

export async function POST(req:NextRequest){
  if(!authorized(req)) return NextResponse.json({error:"Não autorizado"},{status:401});
  try{
    const body=await req.json() as MarketPush;
    if(!["mt5","profit"].includes(body.source)) throw new Error("source deve ser mt5 ou profit");
    if(!body.symbol||!body.timeframe||!Array.isArray(body.candles)) throw new Error("symbol, timeframe e candles são obrigatórios");
    const saved=ingestMarketPush(body);
    return NextResponse.json({
      ok:true,
      source:saved.source,
      symbol:saved.symbol,
      timeframe:saved.timeframe,
      candles:saved.candles.length,
      lastSeen:saved.lastSeen
    });
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Payload inválido"},{status:400});
  }
}
