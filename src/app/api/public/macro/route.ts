import { NextResponse } from "next/server";
import { getBrazilMacro } from "@/lib/public/bcb";

export const dynamic="force-dynamic";

export async function GET(){
  try{
    return NextResponse.json(await getBrazilMacro());
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Falha ao consultar BCB"},{status:502});
  }
}
