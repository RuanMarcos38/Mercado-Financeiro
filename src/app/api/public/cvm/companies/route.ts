import { NextRequest, NextResponse } from "next/server";
import { getCvmCompanies } from "@/lib/public/cvm";

export const dynamic="force-dynamic";

export async function GET(req:NextRequest){
  try{
    const q=req.nextUrl.searchParams.get("q")??undefined;
    const data=await getCvmCompanies(q);
    return NextResponse.json({source:"CVM Dados Abertos",count:data.length,data});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Falha ao consultar CVM"},{status:502});
  }
}
