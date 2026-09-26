import { NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth/tenant";

export async function GET(){
  const ctx=await getTenantContext();
  if(!ctx)return NextResponse.json({error:"Não autenticado"},{status:401});
  return NextResponse.json(ctx);
}
