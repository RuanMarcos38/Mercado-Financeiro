import { NextRequest,NextResponse } from "next/server";
import { claimNextIntent,listIntents,updateIntent } from "@/lib/autotrade/store";

export const dynamic="force-dynamic";

function bridgeAuth(req:NextRequest){
  const key=process.env.CONNECTOR_INGEST_KEY;
  if(!key)return process.env.NODE_ENV!=="production";
  return req.headers.get("x-connector-key")===key;
}

export async function GET(req:NextRequest){
  if(!bridgeAuth(req))return NextResponse.json({error:"Não autorizado"},{status:401});
  const source=req.nextUrl.searchParams.get("source")??"mt5";
  const symbol=req.nextUrl.searchParams.get("symbol")??undefined;
  const claim=req.nextUrl.searchParams.get("claim")==="1";
  return NextResponse.json(claim?{intent:claimNextIntent(source,symbol)}:{intents:listIntents().filter(x=>x.source===source)});
}

export async function POST(req:NextRequest){
  if(!bridgeAuth(req))return NextResponse.json({error:"Não autorizado"},{status:401});
  try{
    const body=await req.json();
    return NextResponse.json(updateIntent(String(body.id),body.status,body.note));
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Atualização inválida"},{status:400});
  }
}
