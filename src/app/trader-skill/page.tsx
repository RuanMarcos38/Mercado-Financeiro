"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, AlertTriangle, ArrowLeft, BrainCircuit, RefreshCw, ShieldCheck } from "lucide-react";

type Asset={
  symbol:string;price:number|null;currency:string;marketTime:string|null;
  ageMinutes:number|null;delayed:boolean;regime:string|null;rawSignal:string;
  decision:string;confidenceScore:number|null;reasons:string[];warning:string|null;
};
type Payload={skill:string;mode:string;generatedAt:string;assets:Asset[];error?:string};

export default function TraderSkillPage(){
  const [data,setData]=useState<Payload|null>(null);
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);
  const [capital,setCapital]=useState("10000");
  const [risk,setRisk]=useState("1");
  const [entry,setEntry]=useState("");
  const [stop,setStop]=useState("");
  async function refresh(){
    setLoading(true);
    try{
      const response=await fetch("/api/trader-skill",{cache:"no-store"});
      const result=await response.json();
      if(!response.ok) throw new Error(result.error||"Falha ao consultar");
      setData(result);setError("");
    }catch(e){setError(e instanceof Error?e.message:"Falha inesperada");}
    finally{setLoading(false);}
  }
  useEffect(()=>{
    void refresh();
    const id=setInterval(()=>{void refresh();},60000);
    return ()=>clearInterval(id);
  },[]);
  const number=(s:string)=>Number(s.replace(",","."));
  const money=number(capital)*number(risk)/100;
  const distance=Math.abs(number(entry)-number(stop));
  const valid=number(capital)>0&&number(risk)>0&&number(risk)<=100&&number(entry)>0&&number(stop)>0&&distance>0;
  const quantity=valid?Math.floor(money/distance):null;
  const fmt=(v:number)=>new Intl.NumberFormat("pt-BR",{maximumFractionDigits:2}).format(v);
  return <main className="lab">
    <div className="labHead">
      <div>
        <Link href="/" className="back"><ArrowLeft size={14} style={{display:"inline",verticalAlign:"middle"}}/> Voltar ao MercadoAI</Link>
        <h1 style={{display:"flex",gap:10,alignItems:"center"}}><BrainCircuit/> Trader Skill Pro</h1>
        <p>Camada de inteligência e gestão de risco integrada ao motor de sinais do MercadoAI.</p>
      </div>
      <span className="sourceBadge"><ShieldCheck size={13} style={{display:"inline",verticalAlign:"middle"}}/> Somente análise · sem ordens reais</span>
    </div>
    <section className="labCard">
      <div className="panelHeading">
        <div><h2><Activity size={15} style={{display:"inline",verticalAlign:"middle"}}/> Radar analítico</h2><p>Fonte brapi; horário do preço diferente do horário da consulta.</p></div>
        <button className="softAction" onClick={()=>void refresh()} disabled={loading}><RefreshCw size={14}/>{loading?"Consultando":"Atualizar"}</button>
      </div>
      {error&&<p className="errorBox">{error}</p>}
      {!data&&!error&&<p className="hint">Buscando dados oficiais disponibilizados pelo backend...</p>}
      {data&&<p className="hint">Consulta: {new Date(data.generatedAt).toLocaleString("pt-BR")} · Pontuação de confiança não é probabilidade de acerto.</p>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:12,marginTop:15}}>
        {data?.assets.map(a=><article key={a.symbol} className="panel" style={{padding:16}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center"}}><strong>{a.symbol}</strong><span className="signalBadge aguardar">{a.decision}</span></div>
          <p style={{fontSize:21,fontWeight:800,margin:"12px 0 6px"}}>{a.price==null?"Indisponível":new Intl.NumberFormat("pt-BR",{style:"currency",currency:a.currency==="BRL"?"BRL":"USD"}).format(a.price)}</p>
          <p className="hint" style={{fontSize:11}}>Regime: {a.regime?.replaceAll("_"," ")??"Indefinido"} · Score: {a.confidenceScore??"—"}</p>
          <p className="hint" style={{fontSize:11}}>Último preço: {a.marketTime?new Date(a.marketTime).toLocaleString("pt-BR"):"Horário não verificado"}</p>
          {a.warning&&<p style={{color:"#9b6513",fontSize:11,display:"flex",gap:5}}><AlertTriangle size={15}/>{a.warning}</p>}
          <details><summary style={{fontSize:12,cursor:"pointer",color:"#2563eb"}}>Justificativas do motor</summary><ul>{a.reasons.map((x,i)=><li key={i}>{x}</li>)}</ul></details>
        </article>)}
      </div>
      {data&&data.assets.length===0&&<p className="hint">Nenhum ativo disponível. Nenhum preço ou sinal será simulado.</p>}
    </section>
    <section className="labCard">
      <h2 style={{fontSize:17}}>Calculadora de risco por operação</h2>
      <p className="hint">Dimensionamento teórico para ativos cotados por unidade. Verifique lote mínimo, multiplicador do contrato, spread, custos e slippage antes de operar.</p>
      <div className="labFormRow" style={{gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))"}}>
        <label>Capital (R$)<input inputMode="decimal" value={capital} onChange={e=>setCapital(e.target.value)}/></label>
        <label>Risco por operação (%)<input inputMode="decimal" value={risk} onChange={e=>setRisk(e.target.value)}/></label>
        <label>Preço de entrada<input inputMode="decimal" value={entry} onChange={e=>setEntry(e.target.value)} placeholder="Ex.: 50,00"/></label>
        <label>Preço de stop<input inputMode="decimal" value={stop} onChange={e=>setStop(e.target.value)} placeholder="Ex.: 49,00"/></label>
      </div>
      {valid&&Number.isFinite(money)&&quantity!==null?<p><b>Risco máximo teórico: R$ {fmt(money)}</b> · Distância até stop: {fmt(distance)} · Quantidade máxima teórica: {fmt(quantity)} unidades.</p>:<p className="hint">Preencha valores positivos, com entrada diferente do stop, para calcular.</p>}
    </section>
    <p className="disclaimer">A Trader Skill usa os indicadores existentes. Dados atrasados são sempre classificados como AGUARDAR para fins operacionais. Não há execução automática ou garantia de resultados.</p>
  </main>;
}
