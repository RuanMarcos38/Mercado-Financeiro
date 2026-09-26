import { createClient } from "@supabase/supabase-js";

export function createSupabaseAdminClient(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!secret) throw new Error("Supabase admin não configurado. Defina SUPABASE_SECRET_KEY ou SUPABASE_SERVICE_ROLE_KEY.");
  return createClient(url,secret,{
    auth:{autoRefreshToken:false,persistSession:false}
  });
}
