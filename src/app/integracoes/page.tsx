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
  if(sec<3600)return Math.floor(sec/60)+"m";
  return Math.floor(sec/3600)+"h";
}

export default function IntegracoesPage(){
  const [status,setStatus]=useState<Status|null>(null);
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(true);

  async function load(){
    try{
      const r=await fetch("/api/connectors/status",{cache:"no-store"});
      const j=await r.json();
      if(!r.ok)throw new Error(j.error||"Falha");
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
        <a className="fxBack" href="/"><ChevronLeft size={14}/> Dashboard</a>
        <h1>Integrações de Mercado</h1>
        <p>MetaTrader 5 e Profit alimentando o mesmo motor de análise do SaaS.</p>
      </div>
      <button className="refreshIntegration" onClick={load}><RefreshCw size={15}/> Atualizar</button>
    </header>

    {error&&<div className="realDataError">{error}</div>}

    <section className="integrationCards">
      <article className={"integrationCard "+(mt5Online?"online":"offline")}>
        <div className="integrationCardTop">
          <div className="integrationIcon"><MonitorSmartphone/></div>
          <span className="integrationState">{mt5Online?<><Wifi/> ONLINE</>:<><WifiOff/> AGUARDANDO</>}</span>
        </div>
        <h2>MetaTrader 5</h2>
        <p>Forex/CFD via terminal local e biblioteca oficial MetaTrader5 para Python.</p>
        <div className="integrationStats">
          <div><span>Streams</span><b>{mt5.length}</b></div>
          <div><span>Online</span><b>{mt5.filter(s=>s.online).length}</b></div>
          <div><span>Último push</span><b>{mt5[0]?age(mt5[0].ageSeconds):"—"}</b></div>
        </div>
      </article>

      <article className={"integrationCard "+(profitOnline?"online":"offline")}>
        <div className="integrationCardTop">
          <div className="integrationIcon"><Activity/></div>
          <span className="integrationState">{profitOnline?<><Wifi/> ONLINE</>:<><WifiOff/> AGUARDANDO</>}</span>
        </div>
        <h2>Profit / ProfitDLL</h2>
        <p>B3 via ProfitDLL oficial, trades tick a tick consolidados em candles para análise.</p>
        <div className="integrationStats">
          <div><span>Streams</span><b>{profit.length}</b></div>
          <div><span>Online</span><b>{profit.filter(s=>s.online).length}</b></div>
          <div><span>Último push</span><b>{profit[0]?age(profit[0].ageSeconds):"—"}</b></div>
        </div>
      </article>

      <article className="integrationCard">
        <div className="integrationCardTop">
          <div className="integrationIcon"><ShieldCheck/></div>
          <span className="integrationState neutral">BACKEND</span>
        </div>
        <h2>Segurança do ingest</h2>
        <p>O bridge usa uma chave privada no cabeçalho para impedir envio não autorizado.</p>
        <div className="integrationChecklist">
          <span>{status?.configured.ingestKey?<CheckCircle2/>:<Clock3/>} Chave de ingestão {status?.configured.ingestKey?"configurada":"pendente"}</span>
          <span>{status?.configured.database?<CheckCircle2/>:<Clock3/>} Banco persistente {status?.configured.database?"configurado":"opcional"}</span>
          <span>{status?.configured.redis?<CheckCircle2/>:<Clock3/>} Redis {status?.configured.redis?"configurado":"opcional"}</span>
        </div>
      </article>
    </section>

    <section className="integrationPanel">
      <div className="fxPanelHead">
        <div><h2>Streams recebidos</h2><p>Atualização automática desta tela a cada 10 segundos.</p></div>
        <Server size={18}/>
      </div>
      <div className="integrationTable">
        <div className="integrationTr integrationTh"><span>Fonte</span><span>Ativo</span><span>Timeframe</span><span>Candles</span><span>Bid</span><span>Ask</span><span>Último push</span><span>Status</span></div>
        {(status?.streams??[]).map(s=><div className="integrationTr" key={s.source+s.symbol+s.timeframe}>
          <span><b>{s.source.toUpperCase()}</b></span>
          <span>{s.symbol}</span>
          <span>{s.timeframe}</span>
          <span>{s.candleCount}</span>
          <span>{s.bid??"—"}</span>
          <span>{s.ask??"—"}</span>
          <span>{age(s.ageSeconds)}</span>
          <span className={s.online?"upText":"downText"}>{s.online?"ONLINE":"SEM PUSH"}</span>
        </div>)}
        {!loading&&!status?.streams?.length&&<div className="integrationEmpty"><Database/><b>Nenhum bridge enviou dados ainda.</b><span>Execute o bridge local do MT5 ou Profit para a conexão aparecer aqui.</span></div>}
      </div>
    </section>

    <section className="integrationHow">
      <article className="integrationPanel">
        <h2>MetaTrader 5</h2>
        <ol>
          <li>Instale Python no mesmo computador do MT5.</li>
          <li>Entre em <code>connectors/mt5-bridge</code>.</li>
          <li>Instale <code>pip install -r requirements.txt</code>.</li>
          <li>Configure <code>SAAS_URL</code> e <code>CONNECTOR_INGEST_KEY</code>.</li>
          <li>Deixe o terminal MT5 aberto e execute <code>python bridge.py</code>.</li>
        </ol>
      </article>
      <article className="integrationPanel">
        <h2>ProfitDLL</h2>
        <ol>
          <li>Instale/contrate a ProfitDLL oficial da Nelogica.</li>
          <li>Configure DLL, chave de ativação e login no arquivo de ambiente local.</li>
          <li>Informe tickers vigentes, por exemplo <code>WINZ26:F</code>.</li>
          <li>Execute <code>python bridge.py</code>.</li>
          <li>Quando Market Data ficar conectado, os ticks passam a alimentar o SaaS.</li>
        </ol>
      </article>
    </section>

    <p className="integrationWarning">{status?.warning??"O armazenamento persistente compartilhado deve ser configurado para produção escalável."}</p>
  </main>;
}
