"use client";

import { FormEvent,useState } from "react";
import { CandlestickChart,Eye,EyeOff,LockKeyhole,Mail } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage(){
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [show,setShow]=useState(false);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);

  async function submit(e:FormEvent){
    e.preventDefault();setBusy(true);setError("");
    try{
      const supabase=createSupabaseBrowserClient();
      const {error}=await supabase.auth.signInWithPassword({email,password});
      if(error)throw error;
      const next=new URLSearchParams(window.location.search).get("next")||"/";
      window.location.href=next;
    }catch(e){setError(e instanceof Error?e.message:"Falha ao entrar");}
    finally{setBusy(false);}
  }

  return <main className="authPage">
    <section className="authCard">
      <div className="authBrand"><div className="novaLogo"><CandlestickChart size={19}/></div><div><b>Mercado<span>AI</span></b><small>Inteligência Financeira</small></div></div>
      <div className="authIntro"><h1>Entrar na plataforma</h1><p>Acesse o ambiente exclusivo da sua empresa.</p></div>
      <form onSubmit={submit} className="authForm">
        <label>E-mail<div className="authInput"><Mail/><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="seuemail@empresa.com"/></div></label>
        <label>Senha<div className="authInput"><LockKeyhole/><input type={show?"text":"password"} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Sua senha"/><button type="button" onClick={()=>setShow(v=>!v)}>{show?<EyeOff/>:<Eye/>}</button></div></label>
        {error&&<div className="authError">{error}</div>}
        <button className="authSubmit" disabled={busy}>{busy?"Entrando...":"Entrar"}</button>
      </form>
      <p className="authFooter">Primeiro acesso da empresa? <a href="/cadastro">Criar conta empresarial</a></p>
    </section>
  </main>;
}
