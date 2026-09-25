import { NextRequest,NextResponse } from "next/server";
import { getForexNews,estimateNewsRisk } from "@/lib/forex/news";

export const dynamic="force-dynamic";

export async function GET(req:NextRequest){
  try{
    const pair=req.nextUrl.searchParams.get("pair")??undefined;
    const hours=Number(req.nextUrl.searchParams.get("hours")??24);
    const items=await getForexNews(pair,hours);
    return NextResponse.json({
      generatedAt:new Date().toISOString(),
      pair:pair??"global",
      hours,
      risk:estimateNewsRisk(items),
      items
    });
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Falha ao consultar notícias"},{status:502});
  }
}
