"use client";

import { FormEvent,useEffect,useState } from "react";
import { Bell,ChevronLeft,MessageCircle,Save,ShieldCheck } from "lucide-react";

type Pref={
  whatsapp_enabled:boolean;
  whatsapp_e164:string;
  min_confidence:number;
  browser_enabled:boolean;
  warning?:string;
};

export default function AlertasPage(){
  const [p,setP]=useState<Pref>({whatsapp_enabled:false,whatsapp_e164:"",min_confidence:75,browser_enabled:true});
  const [msg,setMsg]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);

  async function load(){
    const r=await fetch("/api/notifications/preferences",{cache:"no-store"});
    const j=await r.json();
    if(r.ok){setP({...p,...j});setMsg(j.warning??"");}else setError(j.error||"Falha");
  }
  useEffect(()=>{load();},[]);

  async function save(e:FormEvent){
    e.preventDefault();setBusy(true);setError("");setMsg("");
    try{
      const r=await fetch("/api/notifications/preferences",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(p)});
      const j=await r.json();
      if(!r.ok)throw new Error(j.error||"Falha ao salvar");
      setMsg("Preferências de alerta salvas.");
    }catch(e){setError(e instanceof Error?e.message:"Falha ao salvar");}
    finally{setBusy(false);}
  }

  return <main className="usersPage">
    <header className="usersHeader">
      <div><a href="/configuracoes" className="fxBack"><ChevronLeft size={14}/> Configurações</a><h1>Alertas de Mercado</h1><p>Configure como sua empresa recebe oportunidades do Mercado Espelho 24h.</p></div>
    </header>
    {error&&<div className="realDataError">{error}</div>}
    {msg&&<div className="fxInfoBox">{msg}</div>}
    <section className="usersGrid">
      <article className="usersPanel">
        <div className="fxPanelHead"><div><h2>WhatsApp</h2><p>Alertas proativos usam template oficial aprovado na Meta.</p></div><MessageCircle size={18}/></div>
        <form className="newUserForm" onSubmit={save}>
          <label>Número com DDI/DDD<input value={p.whatsapp_e164} onChange={e=>setP(v=>({...v,whatsapp_e164:e.target.value}))} placeholder="5547999999999"/></label>
          <label>Confiança mínima<input type="number" min="0" max="100" value={p.min_confidence} onChange={e=>setP(v=>({...v,min_confidence:Number(e.target.value)}))}/></label>
          <label className="toggleLine"><input type="checkbox" checked={p.whatsapp_enabled} onChange={e=>setP(v=>({...v,whatsapp_enabled:e.target.checked}))}/> Receber oportunidades no WhatsApp</label>
          <label className="toggleLine"><input type="checkbox" checked={p.browser_enabled} onChange={e=>setP(v=>({...v,browser_enabled:e.target.checked}))}/> Alertas no navegador</label>
          <button disabled={busy}><Save size={13}/> {busy?"Salvando...":"Salvar alertas"}</button>
        </form>
      </article>
      <aside className="usersPanel">
        <div className="fxPanelHead"><div><h2>Critério</h2><p>Somente sinais classificados como APTOS são enviados.</p></div><ShieldCheck size={18}/></div>
        <div className="edgeList">
          <p><b>Compra/Venda/Aguardar</b><span>Decisão probabilística baseada em confluência técnica e contexto.</span></p>
          <p><b>Anti-repetição</b><span>O mesmo sinal não é disparado repetidamente em sequência.</span></p>
          <p><b>Multi-timeframe</b><span>O Radar usa confirmação entre tempos quando disponíveis.</span></p>
          <p><b>Sem promessa de acerto</b><span>A plataforma mede desempenho real e não fixa uma taxa artificial.</span></p>
        </div>
      </aside>
    </section>
  </main>;
}
