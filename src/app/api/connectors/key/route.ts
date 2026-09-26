import crypto from "node:crypto";
import { NextRequest,NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { canManageUsers,getTenantContext } from "@/lib/auth/tenant";
import { createFallbackConnectorKey,listFallbackConnectorKeys,revokeFallbackConnectorKey } from "@/lib/connectors/fallback-keys";

function hashKey(v:string){return crypto.createHash("sha256").update(v).digest("hex");}

function fallbackRows(tenantId:string){
  return listFallbackConnectorKeys(tenantId).map(x=>({
    id:x.id,label:x.label,source:x.source,last4:x.last4,active:x.active,
    created_at:x.createdAt,last_seen_at:x.lastSeenAt,mode:"temporary"
  }));
}

export async function GET(){
  const ctx=await getTenantContext();
  if(!ctx)return NextResponse.json({error:"Não autenticado"},{status:401});
  if(!canManageUsers(ctx.role))return NextResponse.json({error:"Sem permissão"},{status:403});

  try{
    const admin=createSupabaseAdminClient();
    const {data,error}=await admin.from("connector_credentials")
      .select("id,label,source,last4,active,created_at,last_seen_at")
      .eq("tenant_id",ctx.tenantId)
      .order("created_at",{ascending:false});
    if(error)throw new Error(error.message);
    return NextResponse.json({keys:data??[],storage:"supabase",persistent:true});
  }catch{
    return NextResponse.json({
      keys:fallbackRows(ctx.tenantId),
      storage:"temporary",
      persistent:false,
      warning:"Supabase admin ainda não configurado. As chaves funcionam para continuar o teste do MT5, mas devem ser regeneradas após configurar SUPABASE_SECRET_KEY para ficarem persistentes."
    });
  }
}

export async function POST(req:NextRequest){
  const ctx=await getTenantContext();
  if(!ctx)return NextResponse.json({error:"Não autenticado"},{status:401});
  if(!canManageUsers(ctx.role))return NextResponse.json({error:"Sem permissão"},{status:403});

  try{
    const body=await req.json();
    const source=String(body.source??"generic") as "mt5"|"profit"|"generic";
    const label=String(body.label??"Bridge principal").trim();
    if(!["mt5","profit","generic"].includes(source))throw new Error("Fonte inválida.");

    try{
      const plain="mai_"+crypto.randomBytes(32).toString("base64url");
      const admin=createSupabaseAdminClient();
      const {data,error}=await admin.from("connector_credentials").insert({
        tenant_id:ctx.tenantId,label,source,key_hash:hashKey(plain),last4:plain.slice(-4),created_by:ctx.userId
      }).select("id,label,source,last4,active,created_at").single();
      if(error)throw new Error(error.message);
      return NextResponse.json({
        ok:true,key:plain,credential:data,storage:"supabase",persistent:true,
        note:"Copie agora. A chave completa não será exibida novamente."
      });
    }catch{
      const {plain,row}=createFallbackConnectorKey(ctx.tenantId,label,source);
      return NextResponse.json({
        ok:true,key:plain,
        credential:{id:row.id,label:row.label,source:row.source,last4:row.last4,active:row.active,created_at:row.createdAt},
        storage:"temporary",persistent:false,
        note:"Chave temporária criada para continuar a integração. Ela vale enquanto o processo atual estiver ativo; depois configure SUPABASE_SECRET_KEY e gere uma chave persistente."
      });
    }
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

  try{
    const admin=createSupabaseAdminClient();
    const {error}=await admin.from("connector_credentials").update({active:false}).eq("id",id).eq("tenant_id",ctx.tenantId);
    if(error)throw new Error(error.message);
    return NextResponse.json({ok:true,storage:"supabase"});
  }catch{
    const ok=revokeFallbackConnectorKey(ctx.tenantId,id);
    return ok
      ?NextResponse.json({ok:true,storage:"temporary"})
      :NextResponse.json({error:"Chave não encontrada"},{status:404});
  }
}
