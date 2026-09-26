"use client";

import { FormEvent,useEffect,useState } from "react";
import { ChevronLeft,Plus,RefreshCw,ShieldCheck,UserCheck,UserX,Users } from "lucide-react";

type Row={id:string;name:string;email:string|null;role:string;active:boolean;createdAt:string};
type Payload={tenant:{id:string;name:string};currentRole:string;users:Row[]};

export default function UsuariosPage(){
  const [data,setData]=useState<Payload|null>(null);
  const [name,setName]=useState("");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [role,setRole]=useState("trader");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);

  const canManage=data?.currentRole==="owner"||data?.currentRole==="admin";

  async function load(){
    const r=await fetch("/api/users",{cache:"no-store"});const j=await r.json();
    if(r.ok){setData(j);setError("");}else setError(j.error||"Falha ao carregar usuários");
  }
  useEffect(()=>{load();},[]);

  async function create(e:FormEvent){
    e.preventDefault();setBusy(true);setError("");
    try{
      const r=await fetch("/api/users",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name,email,password,role})});
      const j=await r.json();if(!r.ok)throw new Error(j.error||"Falha ao criar");
      setName("");setEmail("");setPassword("");setRole("trader");await load();
    }catch(e){setError(e instanceof Error?e.message:"Falha");}
    finally{setBusy(false);}
  }

  async function update(userId:string,patch:Record<string,unknown>){
    const r=await fetch("/api/users",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({userId,...patch})});
    const j=await r.json();if(!r.ok){setError(j.error||"Falha ao atualizar");return;}await load();
  }

  return <main className="usersPage">
    <header className="usersHeader">
      <div><a href="/" className="fxBack"><ChevronLeft size={14}/> Dashboard</a><h1>Usuários & Empresas</h1><p>Ambiente isolado de <b>{data?.tenant.name??"sua empresa"}</b>. Usuários de outras empresas não aparecem aqui.</p></div>
      <button className="refreshIntegration" onClick={load}><RefreshCw size={15}/> Atualizar</button>
    </header>

    {error&&<div className="realDataError">{error}</div>}

    <section className="usersGrid">
      <article className="usersPanel">
        <div className="fxPanelHead"><div><h2>Usuários da empresa</h2><p>{data?.users.length??0} acesso(s) vinculado(s).</p></div><Users size={18}/></div>
        <div className="usersTable">
          <div className="usersTr usersTh"><span>Usuário</span><span>E-mail</span><span>Perfil</span><span>Status</span><span>Ação</span></div>
          {(data?.users??[]).map(u=><div className="usersTr" key={u.id}>
            <span><b>{u.name}</b></span><span>{u.email??"—"}</span>
            <span>{canManage&&u.role!=="owner"?<select value={u.role} onChange={e=>update(u.id,{role:e.target.value})}><option value="admin">Admin</option><option value="trader">Trader</option><option value="viewer">Viewer</option></select>:<em className="rolePill">{u.role}</em>}</span>
            <span className={u.active?"upText":"downText"}>{u.active?"ATIVO":"INATIVO"}</span>
            <span>{canManage&&u.role!=="owner"?<button className="userAction" onClick={()=>update(u.id,{active:!u.active})}>{u.active?<><UserX/> Desativar</>:<><UserCheck/> Ativar</>}</button>:"—"}</span>
          </div>)}
        </div>
      </article>

      <aside className="usersPanel">
        <div className="fxPanelHead"><div><h2>Novo usuário</h2><p>Crie login e senha somente para esta empresa.</p></div><Plus size={18}/></div>
        {canManage?<form className="newUserForm" onSubmit={create}>
          <label>Nome<input required value={name} onChange={e=>setName(e.target.value)}/></label>
          <label>E-mail<input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
          <label>Senha temporária<input type="password" minLength={8} required value={password} onChange={e=>setPassword(e.target.value)}/></label>
          <label>Perfil<select value={role} onChange={e=>setRole(e.target.value)}><option value="admin">Administrador</option><option value="trader">Trader</option><option value="viewer">Visualização</option></select></label>
          <button disabled={busy}>{busy?"Criando...":"Criar usuário"}</button>
        </form>:<div className="permissionBox"><ShieldCheck/><b>Acesso somente leitura</b><p>Seu perfil não possui permissão para criar usuários.</p></div>}
      </aside>
    </section>
  </main>;
}
