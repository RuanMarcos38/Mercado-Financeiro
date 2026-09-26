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
    .select("tenant_id,role,tenants(name),profiles!tenant_memberships_user_id_fkey(display_name)")
    .eq("user_id",user.id)
    .eq("active",true)
    .limit(1)
    .maybeSingle();

  if(error||!membership)return null;
  const tenant=Array.isArray((membership as any).tenants)?(membership as any).tenants[0]:(membership as any).tenants;
  const profile=Array.isArray((membership as any).profiles)?(membership as any).profiles[0]:(membership as any).profiles;

  return {
    userId:user.id,
    email:user.email??null,
    tenantId:(membership as any).tenant_id,
    tenantName:tenant?.name??"Empresa",
    role:(membership as any).role,
    displayName:profile?.display_name??user.user_metadata?.display_name??null
  };
}

export function canManageUsers(role:string){
  return role==="owner"||role==="admin";
}
