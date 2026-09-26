import { NextRequest,NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_PATHS=[
  "/login",
  "/cadastro",
  "/api/auth/register",
  "/api/health",
  "/api/connectors/market-push",
  "/api/connectors/analyze",
  "/api/market-mirror/push",
  "/api/autotrade/intents"
];

function isPublic(pathname:string){
  return PUBLIC_PATHS.some(p=>pathname===p||pathname.startsWith(p+"/"))||
    pathname.startsWith("/_next/")||
    pathname==="/favicon.ico";
}

export async function middleware(request:NextRequest){
  let response=NextResponse.next({request});
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if(!url||!key){
    return response;
  }

  const supabase=createServerClient(url,key,{
    cookies:{
      getAll(){return request.cookies.getAll();},
      setAll(cookiesToSet){
        cookiesToSet.forEach(({name,value})=>request.cookies.set(name,value));
        response=NextResponse.next({request});
        cookiesToSet.forEach(({name,value,options})=>response.cookies.set(name,value,options));
      }
    }
  });

  const {data:{user}}=await supabase.auth.getUser();
  const path=request.nextUrl.pathname;

  if(!user&&!isPublic(path)){
    const login=request.nextUrl.clone();
    login.pathname="/login";
    login.searchParams.set("next",path);
    return NextResponse.redirect(login);
  }

  if(user&&(path==="/login"||path==="/cadastro")){
    const home=request.nextUrl.clone();
    home.pathname="/";
    home.search="";
    return NextResponse.redirect(home);
  }

  return response;
}

export const config={
  matcher:["/((?!_next/static|_next/image|favicon.ico).*)"]
};
