"use client";

import { FormEvent,useState } from "react";
import { Building2,CandlestickChart,LockKeyhole,Mail,User } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function CadastroPage(){
  const [companyName,setCompanyName]=useState("");
  const [displayName,setDisplayName]=useState("");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);

  async function submit(e:FormEvent){
    e.preventDefault();setBusy(true);setError("");
    try{
      const r=await fetch("/api/auth/register",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({companyName,displayName,email,password})});
      const j=await r.json();
      if(!r.ok)throw new Error(j.error||"Falha no cadastro");
      const supabase=createSupabaseBrowserClient();
      const {error}=await supabase.auth.signInWithPassword({email,password});
      if(error)throw error;
      window.location.href="/";
    }catch(e){setError(e instanceof Error?e.message:"Falha no cadastro");}
    finally{setBusy(false);}
  }

  return <main className="authPage">
    <section className="authCard authCardWide">
      <div className="authBrand"><div className="novaLogo"><CandlestickChart size={19}/></div><div><b>Mercado<span>AI</span></b><small>SaaS Multiempresa</small></div></div>
      <div className="authIntro"><h1>Criar empresa</h1><p>O primeiro usuário será o proprietário e administrador do ambiente.</p></div>
      <form onSubmit={submit} className="authForm">
        <label>Empresa<div className="authInput"><Building2/><input required value={companyName} onChange={e=>setCompanyName(e.target.value)} placeholder="Nome da empresa"/></div></label>
        <label>Responsável<div className="authInput"><User/><input required value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="Nome completo"/></div></label>
        <label>E-mail<div className="authInput"><Mail/><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="email@empresa.com"/></div></label>
        <label>Senha<div className="authInput"><LockKeyhole/><input type="password" minLength={8} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mínimo 8 caracteres"/></div></label>
        {error&&<div className="authError">{error}</div>}
        <button className="authSubmit" disabled={busy}>{busy?"Criando...":"Criar empresa e acessar"}</button>
      </form>
      <p className="authFooter">Já possui acesso? <a href="/login">Entrar</a></p>
    </section>
  </main>;
}
