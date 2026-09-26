import { NextRequest,NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { canManageUsers,getTenantContext } from "@/lib/auth/tenant";

export const dynamic="force-dynamic";

async function listMembershipRows(admin:any,tenantId:string){
  const {data,error}=await admin
    .from("tenant_memberships")
    .select("user_id,role,active,created_at")
    .eq("tenant_id",tenantId)
    .order("created_at",{ascending:true});
  if(!error)return {mode:"memberships" as const,rows:data??[]};

  const legacy=await admin
    .from("profiles")
    .select("id,role,display_name,created_at")
    .eq("tenant_id",tenantId)
    .order("created_at",{ascending:true});
  if(legacy.error)throw new Error(error.message||legacy.error.message);
  return {
    mode:"legacy" as const,
    rows:(legacy.data??[]).map((x:any)=>({
      user_id:x.id,
      role:x.role==="super_admin"?"owner":x.role,
      active:true,
      created_at:x.created_at,
      display_name:x.display_name
    }))
  };
}

export async function GET(){
  const ctx=await getTenantContext();
  if(!ctx)return NextResponse.json({error:"Não autenticado"},{status:401});

  try{
    const admin=createSupabaseAdminClient();
    const membership=await listMembershipRows(admin,ctx.tenantId);
    const members=membership.rows;
    const ids=members.map((x:any)=>x.user_id);

    const {data:profiles}=ids.length
      ?await admin.from("profiles").select("id,display_name").in("id",ids)
      :{data:[] as any[]};

    const {data:usersPage}=await admin.auth.admin.listUsers({page:1,perPage:1000});
    const authMap=new Map((usersPage?.users??[]).map((u:any)=>[u.id,u]));

    const rows=members.map((m:any)=>{
      const p=(profiles??[]).find((x:any)=>x.id===m.user_id);
      const u:any=authMap.get(m.user_id);
      return {
        id:m.user_id,
        name:p?.display_name??m.display_name??u?.user_metadata?.display_name??"Usuário",
        email:u?.email??null,
        role:m.role==="super_admin"?"owner":m.role,
        active:m.active!==false,
        createdAt:m.created_at
      };
    });

    return NextResponse.json({
      tenant:{id:ctx.tenantId,name:ctx.tenantName},
      currentRole:ctx.role,
      users:rows,
      storageMode:membership.mode
    });
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Falha ao carregar usuários"},{status:500});
  }
}

export async function POST(req:NextRequest){
  const ctx=await getTenantContext();
  if(!ctx)return NextResponse.json({error:"Não autenticado"},{status:401});
  if(!canManageUsers(ctx.role))return NextResponse.json({error:"Sem permissão para criar usuários"},{status:403});

  try{
    const body=await req.json();
    const name=String(body.name??"").trim();
    const email=String(body.email??"").trim().toLowerCase();
    const password=String(body.password??"");
    const role=String(body.role??"viewer");
    if(name.length<2)throw new Error("Informe o nome.");
    if(!email.includes("@"))throw new Error("E-mail inválido.");
    if(password.length<8)throw new Error("Senha deve ter pelo menos 8 caracteres.");
    if(!["admin","trader","viewer"].includes(role))throw new Error("Perfil inválido.");

    const admin=createSupabaseAdminClient();
    const {data:userData,error:userError}=await admin.auth.admin.createUser({
      email,password,email_confirm:true,user_metadata:{display_name:name}
    });
    if(userError||!userData.user)throw new Error(userError?.message??"Falha ao criar usuário.");

    const user=userData.user;
    let linked=false;

    const {error:membershipError}=await admin
      .from("tenant_memberships")
      .insert({tenant_id:ctx.tenantId,user_id:user.id,role,active:true});
    if(!membershipError)linked=true;

    if(!linked){
      const legacyRole=role==="admin"?"admin":role;
      const {error:legacyError}=await admin.from("profiles").upsert({
        id:user.id,
        tenant_id:ctx.tenantId,
        role:legacyRole,
        display_name:name
      });
      if(legacyError){
        await admin.auth.admin.deleteUser(user.id);
        throw new Error(membershipError?.message??legacyError.message);
      }
      linked=true;
    }else{
      // Profile pode ter schema antigo ou novo; falha aqui não invalida o vínculo já criado.
      try{
        await admin.from("profiles").upsert({
          id:user.id,
          tenant_id:ctx.tenantId,
          role:role==="admin"?"admin":role,
          display_name:name
        });
      }catch{}
    }

    try{
      await admin.from("tenant_audit_log").insert({
        tenant_id:ctx.tenantId,user_id:ctx.userId,event:"USER_CREATED",
        metadata:{created_user_id:user.id,email,role}
      });
    }catch{}

    return NextResponse.json({ok:true,user:{id:user.id,name,email,role}});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Falha ao criar usuário"},{status:400});
  }
}

export async function PATCH(req:NextRequest){
  const ctx=await getTenantContext();
  if(!ctx)return NextResponse.json({error:"Não autenticado"},{status:401});
  if(!canManageUsers(ctx.role))return NextResponse.json({error:"Sem permissão"},{status:403});

  try{
    const body=await req.json();
    const userId=String(body.userId??"");
    if(!userId)throw new Error("Usuário obrigatório.");
    if(userId===ctx.userId&&body.active===false)throw new Error("Você não pode desativar seu próprio acesso.");

    const patch:any={};
    if(typeof body.active==="boolean")patch.active=body.active;
    if(body.role&&["admin","trader","viewer"].includes(body.role))patch.role=body.role;

    const admin=createSupabaseAdminClient();

    let updated=false;
    const {error}=await admin.from("tenant_memberships")
      .update(patch)
      .eq("tenant_id",ctx.tenantId)
      .eq("user_id",userId);
    if(!error)updated=true;

    if(!updated){
      const legacyPatch:any={};
      if(body.role&&["admin","trader","viewer"].includes(body.role))legacyPatch.role=body.role;
      // Schema legado não possui flag active. Desativação fica indisponível nesse modo.
      if(Object.keys(legacyPatch).length){
        const {error:legacyError}=await admin.from("profiles")
          .update(legacyPatch)
          .eq("tenant_id",ctx.tenantId)
          .eq("id",userId);
        if(legacyError)throw new Error(legacyError.message);
        updated=true;
      }else if(typeof body.active==="boolean"){
        throw new Error("Ativação/desativação exige a migração multiempresa.");
      }
    }

    return NextResponse.json({ok:true});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Falha ao atualizar usuário"},{status:400});
  }
}
