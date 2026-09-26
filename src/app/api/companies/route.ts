import { NextRequest,NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { canManageUsers,getTenantContext } from "@/lib/auth/tenant";

export const dynamic="force-dynamic";

export async function POST(req:NextRequest){
  const ctx=await getTenantContext();
  if(!ctx)return NextResponse.json({error:"Não autenticado"},{status:401});
  if(!canManageUsers(ctx.role))return NextResponse.json({error:"Sem permissão para criar empresas"},{status:403});

  let createdTenantId:string|undefined;
  let createdUserId:string|undefined;

  try{
    const body=await req.json();
    const companyName=String(body.companyName??"").trim();
    const ownerName=String(body.ownerName??"").trim();
    const email=String(body.email??"").trim().toLowerCase();
    const password=String(body.password??"");

    if(companyName.length<2)throw new Error("Informe o nome da empresa.");
    if(ownerName.length<2)throw new Error("Informe o nome do responsável.");
    if(!email.includes("@"))throw new Error("E-mail inválido.");
    if(password.length<8)throw new Error("Senha deve ter pelo menos 8 caracteres.");

    const admin=createSupabaseAdminClient();

    const {data:tenant,error:tenantError}=await admin
      .from("tenants")
      .insert({name:companyName})
      .select("id,name")
      .single();
    if(tenantError||!tenant)throw new Error(tenantError?.message??"Falha ao criar empresa.");
    createdTenantId=tenant.id;

    const {data:userData,error:userError}=await admin.auth.admin.createUser({
      email,password,email_confirm:true,
      user_metadata:{display_name:ownerName,company_name:companyName}
    });
    if(userError||!userData.user)throw new Error(userError?.message??"Falha ao criar responsável.");
    createdUserId=userData.user.id;

    let linked=false;
    const {error:membershipError}=await admin.from("tenant_memberships").insert({
      tenant_id:tenant.id,user_id:userData.user.id,role:"owner",active:true
    });
    if(!membershipError)linked=true;

    if(!linked){
      const {error:legacyError}=await admin.from("profiles").upsert({
        id:userData.user.id,
        tenant_id:tenant.id,
        role:"admin",
        display_name:ownerName
      });
      if(legacyError)throw new Error(membershipError?.message??legacyError.message);
    }else{
      await admin.from("profiles").upsert({
        id:userData.user.id,
        tenant_id:tenant.id,
        role:"admin",
        display_name:ownerName
      }).then(()=>{}).catch(()=>{});
    }

    try{
      await admin.from("tenant_audit_log").insert({
        tenant_id:ctx.tenantId,user_id:ctx.userId,event:"TENANT_CREATED",
        metadata:{created_tenant_id:tenant.id,created_owner_id:userData.user.id,email}
      });
    }catch{}

    return NextResponse.json({
      ok:true,
      company:{id:tenant.id,name:companyName},
      owner:{id:userData.user.id,name:ownerName,email}
    });
  }catch(error){
    try{
      const admin=createSupabaseAdminClient();
      if(createdUserId)await admin.auth.admin.deleteUser(createdUserId);
      if(createdTenantId)await admin.from("tenants").delete().eq("id",createdTenantId);
    }catch{}
    return NextResponse.json({error:error instanceof Error?error.message:"Falha ao criar empresa"},{status:400});
  }
}
