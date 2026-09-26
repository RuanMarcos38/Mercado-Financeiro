"use client";

import { useEffect,useState } from "react";
import { Building2,ChevronLeft,KeyRound,ShieldCheck,User,Users } from "lucide-react";

type Me={displayName:string|null;email:string|null;tenantName:string;role:string;tenantId:string};

export default function ConfiguracoesPage(){
  const [me,setMe]=useState<Me|null>(null);
  useEffect(()=>{fetch("/api/auth/me",{cache:"no-store"}).then(r=>r.json()).then(setMe).catch(()=>{});},[]);

  return <main className="settingsPage">
    <header className="usersHeader"><div><a href="/" className="fxBack"><ChevronLeft size={14}/> Dashboard</a><h1>Configurações</h1><p>Conta, empresa e segurança do ambiente.</p></div></header>
    <section className="settingsGrid">
      <article className="settingsCard"><User/><span>Usuário</span><strong>{me?.displayName||"—"}</strong><small>{me?.email||"—"}</small></article>
      <article className="settingsCard"><Building2/><span>Empresa</span><strong>{me?.tenantName||"—"}</strong><small>Ambiente isolado por tenant</small></article>
      <article className="settingsCard"><ShieldCheck/><span>Perfil</span><strong>{me?.role?.toUpperCase()||"—"}</strong><small>Permissões de acesso</small></article>
    </section>
    <section className="settingsActions">
      <a href="/usuarios"><Users/> Gerenciar usuários</a>
      <a href="/integracoes"><KeyRound/> Gerenciar integrações MT5/Profit</a>
      <a href="/autotrade"><ShieldCheck/> Configurar Radar e AutoTrade</a>
    </section>
  </main>;
}
