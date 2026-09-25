import { NextRequest,NextResponse } from "next/server";
import { getAutoTradeConfig,setAutoTradeConfig } from "@/lib/autotrade/store";

export const dynamic="force-dynamic";

function canWrite(req:NextRequest){
  const key=process.env.AUTOTRADE_ADMIN_KEY;
  if(!key)return process.env.NODE_ENV!=="production";
  return req.headers.get("x-autotrade-admin-key")===key;
}

export async function GET(){
  const cfg=getAutoTradeConfig();
  return NextResponse.json({
    ...cfg,
    liveAllowed:process.env.AUTOTRADE_LIVE_ENABLED==="true",
    note:"Modo live requer AUTOTRADE_LIVE_ENABLED=true no servidor."
  });
}

export async function POST(req:NextRequest){
  if(!canWrite(req))return NextResponse.json({error:"Não autorizado"},{status:401});
  try{
    const body=await req.json();
    if(body.mode==="live"&&process.env.AUTOTRADE_LIVE_ENABLED!=="true"){
      return NextResponse.json({error:"Live bloqueado no servidor. Configure AUTOTRADE_LIVE_ENABLED=true."},{status:403});
    }
    const cfg=setAutoTradeConfig(body);
    return NextResponse.json(cfg);
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Configuração inválida"},{status:400});
  }
}
