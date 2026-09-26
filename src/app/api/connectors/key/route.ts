import crypto from "node:crypto";
import { NextRequest,NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { canManageUsers,getTenantContext } from "@/lib/auth/tenant";

function hashKey(v:string){return crypto.createHash("sha256").update(v).digest("hex");}

export async function GET(){
  const ctx=await getTenantContext();
  if(!ctx)return NextResponse.json({error:"Não autenticado"},{status:401});
  if(!canManageUsers(ctx.role))return NextResponse.json({error:"Sem permissão"},{status:403});
  const admin=createSupabaseAdminClient();
  const {data,error}=await admin.from("connector_credentials")
    .select("id,label,source,last4,active,created_at,last_seen_at")
    .eq("tenant_id",ctx.tenantId)
    .order("created_at",{ascending:false});
  if(error)return NextResponse.json({error:error.message},{status:500});
  return NextResponse.json({keys:data??[]});
}

export async function POST(req:NextRequest){
  const ctx=await getTenantContext();
  if(!ctx)return NextResponse.json({error:"Não autenticado"},{status:401});
  if(!canManageUsers(ctx.role))return NextResponse.json({error:"Sem permissão"},{status:403});
  try{
    const body=await req.json();
    const source=String(body.source??"generic");
    const label=String(body.label??"Bridge principal").trim();
    if(!["mt5","profit","generic"].includes(source))throw new Error("Fonte inválida.");
    const plain="mai_"+crypto.randomBytes(32).toString("base64url");
    const admin=createSupabaseAdminClient();
    const {data,error}=await admin.from("connector_credentials").insert({
      tenant_id:ctx.tenantId,label,source,key_hash:hashKey(plain),last4:plain.slice(-4),created_by:ctx.userId
    }).select("id,label,source,last4,active,created_at").single();
    if(error)throw new Error(error.message);
    return NextResponse.json({ok:true,key:plain,credential:data,note:"Copie agora. A chave completa não será exibida novamente."});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Falha ao criar chave"},{status:400});
  }
}

export async function DELETE(req:NextRequest){
  const ctx=await getTenantContext();
  if(!ctx)return NextResponse.json({error:"Não autenticado"},{status:401});
  if(!canManageUsers(ctx.role))return NextResponse.json({error:"Sem permissão"},{status:403});
  const id=req.nextUrl.searchParams.get("id");
  if(!id)return NextResponse.json({error:"ID obrigatório"},{status:400});
  const admin=createSupabaseAdminClient();
  const {error}=await admin.from("connector_credentials").update({active:false}).eq("id",id).eq("tenant_id",ctx.tenantId);
  if(error)return NextResponse.json({error:error.message},{status:500});
  return NextResponse.json({ok:true});
}
