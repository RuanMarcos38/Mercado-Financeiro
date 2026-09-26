import { NextRequest,NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function slugify(v:string){
  return v.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,50);
}

export async function POST(req:NextRequest){
  try{
    const body=await req.json();
    const companyName=String(body.companyName??"").trim();
    const displayName=String(body.displayName??"").trim();
    const email=String(body.email??"").trim().toLowerCase();
    const password=String(body.password??"");

    if(companyName.length<2)throw new Error("Informe o nome da empresa.");
    if(displayName.length<2)throw new Error("Informe o nome do responsável.");
    if(!email.includes("@"))throw new Error("E-mail inválido.");
    if(password.length<8)throw new Error("A senha deve ter pelo menos 8 caracteres.");

    const admin=createSupabaseAdminClient();
    const {data:userData,error:userError}=await admin.auth.admin.createUser({
      email,password,email_confirm:true,
      user_metadata:{display_name:displayName}
    });
    if(userError||!userData.user)throw new Error(userError?.message??"Não foi possível criar usuário.");

    const user=userData.user;
    const base=slugify(companyName)||"empresa";
    const slug=base+"-"+user.id.slice(0,6);

    const {data:tenant,error:tenantError}=await admin
      .from("tenants")
      .insert({name:companyName,slug})
      .select("id,name")
      .single();

    if(tenantError||!tenant){
      await admin.auth.admin.deleteUser(user.id);
      throw new Error(tenantError?.message??"Não foi possível criar empresa.");
    }

    const {error:membershipError}=await admin
      .from("tenant_memberships")
      .insert({tenant_id:tenant.id,user_id:user.id,role:"owner",active:true});

    if(membershipError){
      await admin.from("tenants").delete().eq("id",tenant.id);
      await admin.auth.admin.deleteUser(user.id);
      throw new Error(membershipError.message);
    }

    await admin.from("profiles").upsert({id:user.id,display_name:displayName});

    return NextResponse.json({
      ok:true,
      tenant:{id:tenant.id,name:tenant.name},
      user:{id:user.id,email:user.email},
      message:"Empresa e usuário proprietário criados."
    });
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Falha no cadastro"},{status:400});
  }
}
