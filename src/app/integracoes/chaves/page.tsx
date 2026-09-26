"use client";

import { FormEvent,useEffect,useState } from "react";
import { ChevronLeft,Copy,KeyRound,Plus,RefreshCw,ShieldCheck,Trash2 } from "lucide-react";

type KeyRow={id:string;label:string;source:string;last4:string;active:boolean;created_at:string;last_seen_at?:string|null};

export default function ConnectorKeysPage(){
  const [rows,setRows]=useState<KeyRow[]>([]);
  const [label,setLabel]=useState("Bridge principal");
  const [source,setSource]=useState("mt5");
  const [newKey,setNewKey]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const [storage,setStorage]=useState<"supabase"|"temporary"|null>(null);
  const [warning,setWarning]=useState("");

  async function load(){
    const r=await fetch("/api/connectors/key",{cache:"no-store"});const j=await r.json();
    if(r.ok){setRows(j.keys??[]);setStorage(j.storage??null);setWarning(j.warning??"");setError("");}else setError(j.error||"Sem permissão");
  }
  useEffect(()=>{load();},[]);

  async function create(e:FormEvent){
    e.preventDefault();setBusy(true);setError("");
    try{
      const r=await fetch("/api/connectors/key",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({label,source})});
      const j=await r.json();if(!r.ok)throw new Error(j.error||"Falha");
      setNewKey(j.key);setStorage(j.storage??null);setWarning(j.note??"");await load();
    }catch(e){setError(e instanceof Error?e.message:"Falha");}
    finally{setBusy(false);}
  }

  async function revoke(id:string){
    const r=await fetch("/api/connectors/key?id="+encodeURIComponent(id),{method:"DELETE"});const j=await r.json();
    if(!r.ok){setError(j.error||"Falha");return;}await load();
  }

  return <main className="usersPage">
    <header className="usersHeader"><div><a href="/integracoes" className="fxBack"><ChevronLeft size={14}/> Integrações</a><h1>Chaves MT5 / Profit</h1><p>Cada chave pertence exclusivamente à empresa autenticada.</p></div><button className="refreshIntegration" onClick={load}><RefreshCw size={15}/> Atualizar</button></header>
    {error&&<div className="realDataError">{error}</div>}{warning&&<div className="fxInfoBox">{warning}</div>}
    {newKey&&<div className="secretReveal"><ShieldCheck/><div><b>Copie esta chave agora</b><code>{newKey}</code><small>Ela não será exibida novamente por segurança.</small></div><button onClick={()=>navigator.clipboard.writeText(newKey)}><Copy/> Copiar</button></div>}
    <section className="usersGrid">
      <article className="usersPanel">
        <div className="fxPanelHead"><div><h2>Chaves ativas</h2><p>Use uma chave diferente por integração quando possível. {storage==="temporary"?"Modo temporário ativo.":"Armazenamento persistente ativo."}</p></div><KeyRound size={18}/></div>
        <div className="keyList">{rows.map(k=><div className="keyRow" key={k.id}><div><b>{k.label}</b><small>{k.source.toUpperCase()} · final {k.last4} · último uso {k.last_seen_at?new Date(k.last_seen_at).toLocaleString("pt-BR"):"nunca"}</small></div><span className={k.active?"upText":"downText"}>{k.active?"ATIVA":"REVOGADA"}</span>{k.active&&<button onClick={()=>revoke(k.id)}><Trash2/> Revogar</button>}</div>)}</div>
      </article>
      <aside className="usersPanel">
        <div className="fxPanelHead"><div><h2>Nova chave</h2><p>Será usada em CONNECTOR_INGEST_KEY no computador do bridge.</p></div><Plus size={18}/></div>
        <form className="newUserForm" onSubmit={create}><label>Nome<input value={label} onChange={e=>setLabel(e.target.value)} required/></label><label>Fonte<select value={source} onChange={e=>setSource(e.target.value)}><option value="mt5">MetaTrader 5</option><option value="profit">ProfitDLL</option><option value="generic">Genérica</option></select></label><button disabled={busy}>{busy?"Gerando...":"Gerar chave"}</button></form>
      </aside>
    </section>
  </main>;
}
