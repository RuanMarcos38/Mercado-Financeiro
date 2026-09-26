import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type TenantContext={
  userId:string;
  email:string|null;
  tenantId:string;
  tenantName:string;
  role:"owner"|"admin"|"trader"|"viewer";
  displayName:string|null;
  fallback?:boolean;
  storageMode?:"memberships"|"legacy-profile"|"legacy";
};

function legacyContext():TenantContext{
  return {
    userId:"legacy-user",
    email:null,
    tenantId:process.env.DEFAULT_TENANT_ID||"legacy-default",
    tenantName:"MercadoAI",
    role:"owner",
    displayName:"Administrador",
    fallback:true,
    storageMode:"legacy"
  };
}

function mapLegacyRole(role?:string|null):TenantContext["role"]{
  if(role==="super_admin")return "owner";
  if(role==="admin")return "admin";
  if(role==="trader")return "trader";
  return "viewer";
}

async function bootstrapMembership(user:{id:string;email?:string|null;user_metadata?:Record<string,any>}){
  try{
    const admin=createSupabaseAdminClient();

    // Compatibilidade com o schema antigo: reaproveita tenant/role do profile.
    const {data:legacyProfile}=await admin
      .from("profiles")
      .select("tenant_id,role,display_name")
      .eq("id",user.id)
      .maybeSingle();

    if(legacyProfile?.tenant_id){
      const mapped=mapLegacyRole(legacyProfile.role);
      const membershipRole=mapped==="owner"?"owner":mapped;
      const {error}=await admin.from("tenant_memberships").upsert({
        tenant_id:legacyProfile.tenant_id,
        user_id:user.id,
        role:membershipRole,
        active:true
      },{onConflict:"tenant_id,user_id"});
      if(!error){
        return {
          tenantId:String(legacyProfile.tenant_id),
          role:membershipRole as TenantContext["role"],
          displayName:legacyProfile.display_name??user.user_metadata?.display_name??null,
          storageMode:"memberships" as const
        };
      }
      return {
        tenantId:String(legacyProfile.tenant_id),
        role:mapped,
        displayName:legacyProfile.display_name??user.user_metadata?.display_name??null,
        storageMode:"legacy-profile" as const
      };
    }

    // Primeiro acesso sem empresa: cria uma empresa isolada e torna o usuário owner.
    const tenantName=String(
      user.user_metadata?.company_name||
      user.user_metadata?.tenant_name||
      user.user_metadata?.display_name||
      user.email?.split("@")[0]||
      "Minha Empresa"
    ).trim();

    const {data:tenant,error:tenantError}=await admin
      .from("tenants")
      .insert({name:tenantName})
      .select("id,name")
      .single();
    if(tenantError||!tenant)return null;

    const {error:membershipError}=await admin.from("tenant_memberships").insert({
      tenant_id:tenant.id,user_id:user.id,role:"owner",active:true
    });
    if(membershipError){
      await admin.from("tenants").delete().eq("id",tenant.id);
      return null;
    }

    // Upsert compatível quando profiles ainda possui tenant_id/role.
    await admin.from("profiles").upsert({
      id:user.id,
      tenant_id:tenant.id,
      role:"admin",
      display_name:user.user_metadata?.display_name??user.email?.split("@")[0]??"Administrador"
    }).then(()=>{}).catch(()=>{});

    return {
      tenantId:String(tenant.id),
      role:"owner" as const,
      displayName:user.user_metadata?.display_name??user.email?.split("@")[0]??null,
      storageMode:"memberships" as const
    };
  }catch{
    return null;
  }
}

export async function getTenantContext():Promise<TenantContext|null>{
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if(!url||!key)return legacyContext();

  try{
    const supabase=await createSupabaseServerClient();
    const {data:{user},error:userError}=await supabase.auth.getUser();
    if(userError||!user)return null;

    const {data:membership}=await supabase
      .from("tenant_memberships")
      .select("tenant_id,role")
      .eq("user_id",user.id)
      .eq("active",true)
      .limit(1)
      .maybeSingle();

    if(membership?.tenant_id){
      const [{data:tenant},{data:profile}]=await Promise.all([
        supabase.from("tenants").select("name").eq("id",membership.tenant_id).maybeSingle(),
        supabase.from("profiles").select("display_name").eq("id",user.id).maybeSingle()
      ]);
      return {
        userId:user.id,
        email:user.email??null,
        tenantId:membership.tenant_id,
        tenantName:tenant?.name??"Empresa",
        role:membership.role as TenantContext["role"],
        displayName:profile?.display_name??user.user_metadata?.display_name??null,
        storageMode:"memberships"
      };
    }

    // Fallback para schema legado caso tenant_memberships ainda não exista/esteja vazio.
    const {data:legacyProfile}=await supabase
      .from("profiles")
      .select("tenant_id,role,display_name")
      .eq("id",user.id)
      .maybeSingle();

    if(legacyProfile?.tenant_id){
      const {data:tenant}=await supabase.from("tenants").select("name").eq("id",legacyProfile.tenant_id).maybeSingle();
      return {
        userId:user.id,
        email:user.email??null,
        tenantId:legacyProfile.tenant_id,
        tenantName:tenant?.name??"Empresa",
        role:mapLegacyRole(legacyProfile.role),
        displayName:legacyProfile.display_name??user.user_metadata?.display_name??null,
        storageMode:"legacy-profile"
      };
    }

    const boot=await bootstrapMembership(user);
    if(!boot)return null;
    let tenantName="Empresa";
    try{
      const admin=createSupabaseAdminClient();
      const {data}=await admin.from("tenants").select("name").eq("id",boot.tenantId).maybeSingle();
      tenantName=data?.name??tenantName;
    }catch{}
    return {
      userId:user.id,
      email:user.email??null,
      tenantId:boot.tenantId,
      tenantName,
      role:boot.role,
      displayName:boot.displayName,
      storageMode:boot.storageMode
    };
  }catch{
    return null;
  }
}

export function canManageUsers(role:string){
  return role==="owner"||role==="admin"||role==="super_admin";
}
