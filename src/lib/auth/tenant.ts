import { createSupabaseServerClient } from "@/lib/supabase/server";

export type TenantContext={
  userId:string;
  email:string|null;
  tenantId:string;
  tenantName:string;
  role:"owner"|"admin"|"trader"|"viewer";
  displayName:string|null;
  fallback?:boolean;
};

function legacyContext():TenantContext{
  return {
    userId:"legacy-user",
    email:null,
    tenantId:process.env.DEFAULT_TENANT_ID||"legacy-default",
    tenantName:"MercadoAI",
    role:"owner",
    displayName:"Administrador",
    fallback:true
  };
}

export async function getTenantContext():Promise<TenantContext|null>{
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // Mantém o SaaS atual funcionando até o Supabase multiempresa ser configurado no EasyPanel.
  if(!url||!key)return legacyContext();

  try{
    const supabase=await createSupabaseServerClient();
    const {data:{user},error:userError}=await supabase.auth.getUser();
    if(userError||!user)return null;

    const {data:membership,error}=await supabase
      .from("tenant_memberships")
      .select("tenant_id,role")
      .eq("user_id",user.id)
      .eq("active",true)
      .limit(1)
      .maybeSingle();

    if(error||!membership)return null;

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
      displayName:profile?.display_name??user.user_metadata?.display_name??null
    };
  }catch{
    return null;
  }
}

export function canManageUsers(role:string){
  return role==="owner"||role==="admin";
}
