import { createSupabaseServerClient } from "@/lib/supabase/server";

export type TenantContext={
  userId:string;
  email:string|null;
  tenantId:string;
  tenantName:string;
  role:"owner"|"admin"|"trader"|"viewer";
  displayName:string|null;
};

export async function getTenantContext():Promise<TenantContext|null>{
  const supabase=await createSupabaseServerClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return null;

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
}

export function canManageUsers(role:string){
  return role==="owner"||role==="admin";
}
