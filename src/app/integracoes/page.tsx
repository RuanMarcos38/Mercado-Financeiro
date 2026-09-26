"use client";

import { useEffect,useState } from "react";
import { Activity,CheckCircle2,ChevronLeft,Clock3,Database,MonitorSmartphone,RefreshCw,Server,ShieldCheck,Wifi,WifiOff } from "lucide-react";

type Stream={
  source:string;
  symbol:string;
  timeframe:string;
  lastSeen:string;
  candleCount:number;
  bid?:number;
  ask?:number;
  spread?:number;
  ageSeconds:number;
  online:boolean;
  meta?:Record<string,unknown>;
};

type Status={
  generatedAt:string;
  configured:{ingestKey:boolean;redis:boolean;database:boolean};
  streams:Stream[];
  warning:string;
};

function age(sec:number){
  if(sec<60)return sec+"s";
  if(sec<3600)return Math.floor(sec/60)+" min";
  return Math.floor(sec/3600)+" h";
}

export default function IntegracoesPage(){
  const [status,setStatus]=useState<Status|null>(null);
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(true);

  async function load(){
    try{
      const r=await fetch("/api/connectors/status",{cache:"no-store"});
      const j=await r.json();
      if(!r.ok)throw new Error(j.error||"Falha ao carregar");
      setStatus(j);setError("");
    }catch(e){setError(e instanceof Error?e.message:"Falha ao carregar");}
    finally{setLoading(false);}
  }

  useEffect(()=>{
    load();
    const id=setInterval(load,10000);
    return()=>clearInterval(id);
  },[]);

  const mt5=(status?.streams??[]).filter(s=>s.source==="mt5");
  const profit=(status?.streams??[]).filter(s=>s.source==="profit");
  const mt5Online=mt5.some(s=>s.online);
  const profitOnline=profit.some(s=>s.online);

  return <main className="integrationPage">
    <header className="integrationHeader">
      <div>
        <a className="fxBack" href="/"><ChevronLeft size={14}/> Painel</a>
        <h1>Integrações de Mercado</h1>
      </div>
      <div className="welcomeActions">
        <a className="softAction" href="/integracoes/chaves"><ShieldCheck size={15}/> Chaves</a>
        <button className="refreshIntegration" onClick={load}><RefreshCw size={15}/> Atualizar</button>
      </div>
    </header>

    {error&&<div className="realDataError">{error}</div>}

    <section className="integrationCards">
      <article className={"integrationCard "+(mt5Online?"online":"offline")}>
        <div className="integrationCardTop">
          <div className="integrationIcon"><MonitorSmartphone/></div>
          <span className="integrationState">{mt5Online?<><Wifi/> CONECTADO</>:<><WifiOff/> AGUARDANDO</>}</span>
        </div>
        <h2>MetaTrader 5</h2>
        <div className="integrationStats">
          <div><span>Fluxos</span><b>{mt5.length}</b></div>
          <div><span>Conectados</span><b>{mt5.filter(s=>s.online).length}</b></div>
          <div><span>Último envio</span><b>{mt5[0]?age(mt5[0].ageSeconds):"—"}</b></div>
        </div>
      </article>

      <article className={"integrationCard "+(profitOnline?"online":"offline")}>
        <div className="integrationCardTop">
          <div className="integrationIcon"><Activity/></div>
          <span className="integrationState">{profitOnline?<><Wifi/> CONECTADO</>:<><WifiOff/> AGUARDANDO</>}</span>
        </div>
        <h2>Profit</h2>
        <div className="integrationStats">
          <div><span>Fluxos</span><b>{profit.length}</b></div>
          <div><span>Conectados</span><b>{profit.filter(s=>s.online).length}</b></div>
          <div><span>Último envio</span><b>{profit[0]?age(profit[0].ageSeconds):"—"}</b></div>
        </div>
      </article>

      <article className="integrationCard">
        <div className="integrationCardTop">
          <div className="integrationIcon"><ShieldCheck/></div>
          <span className="integrationState neutral">SERVIDOR</span>
        </div>
        <h2>Conexão Segura</h2>
        <div className="integrationChecklist">
          <span>{status?.configured.ingestKey?<CheckCircle2/>:<Clock3/>} Autenticação {status?.configured.ingestKey?"ativa":"pendente"}</span>
          <span>{status?.configured.database?<CheckCircle2/>:<Clock3/>} Banco de dados {status?.configured.database?"ativo":"opcional"}</span>
          <span>{status?.configured.redis?<CheckCircle2/>:<Clock3/>} Cache distribuído {status?.configured.redis?"ativo":"opcional"}</span>
        </div>
      </article>
    </section>

    <section className="integrationPanel">
      <div className="fxPanelHead">
        <div><h2>Dados recebidos</h2></div>
        <Server size={18}/>
      </div>
      <div className="integrationTable">
        <div className="integrationTr integrationTh"><span>Fonte</span><span>Ativo</span><span>Período</span><span>Velas</span><span>Compra</span><span>Venda</span><span>Último envio</span><span>Situação</span></div>
        {(status?.streams??[]).map(s=><div className="integrationTr" key={s.source+s.symbol+s.timeframe}>
          <span><b>{s.source==="mt5"?"MT5":s.source==="profit"?"PROFIT":s.source.toUpperCase()}</b></span>
          <span>{s.symbol}</span>
          <span>{s.timeframe}</span>
          <span>{s.candleCount}</span>
          <span>{s.bid??"—"}</span>
          <span>{s.ask??"—"}</span>
          <span>{age(s.ageSeconds)}</span>
          <span className={s.online?"upText":"downText"}>{s.online?"CONECTADO":"SEM ATUALIZAÇÃO"}</span>
        </div>)}
        {!loading&&!status?.streams?.length&&<div className="integrationEmpty"><Database/><b>Nenhum dado recebido ainda.</b></div>}
      </div>
    </section>
  </main>;
}
