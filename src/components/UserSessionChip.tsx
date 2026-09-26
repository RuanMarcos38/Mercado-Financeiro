"use client";

import { useEffect,useState } from "react";
import { ChevronDown,LogOut } from "lucide-react";

type Me={displayName:string|null;email:string|null;tenantName:string;role:string};

export default function UserSessionChip(){
  const [me,setMe]=useState<Me|null>(null);
  const [open,setOpen]=useState(false);

  useEffect(()=>{fetch("/api/auth/me",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(setMe).catch(()=>{});},[]);

  async function logout(){
    await fetch("/api/auth/logout",{method:"POST"});
    window.location.href="/login";
  }

  const initials=(me?.displayName||me?.email||"US").split(/s+/).map(x=>x[0]).join("").slice(0,2).toUpperCase();

  return <div className="sessionWrap">
    <button className="userChip userChipButton" onClick={()=>setOpen(v=>!v)}>
      <span>{initials}</span>
      <div><b>{me?.displayName||"Usuário"}</b><small>{me?.tenantName||"Empresa"} · {me?.role||"..."}</small></div>
      <ChevronDown size={14}/>
    </button>
    {open&&<div className="sessionMenu">
      <a href="/usuarios">Usuários</a>
      <a href="/configuracoes">Configurações</a>
      <button onClick={logout}><LogOut size={13}/> Sair</button>
    </div>}
  </div>;
}
