"use client";

import { useEffect,useRef,useState } from "react";
import { Activity,Bell,BookOpen,ChevronLeft,Search,ShieldCheck,TrendingUp,Zap } from "lucide-react";
import LiveCandleChart from "@/components/LiveCandleChart";
import type { Candle } from "@/lib/market/types";

type Pair={symbol:string;base:string;quote:string;group:string;label:string};
type PairResponse={counts:{total:number;majors:number;minors:number;exotics:number};pairs:Pair[];providers:Array<{id:string;configured:boolean;realtime:boolean;note:string}>};
type News={risk:number;items:Array<{title:string;url:string;domain?:string;seenDate?:string}>};
type LivePayload={ready:boolean;source:string;symbol:string;timeframe:string;lastSeen:string;bid?:number;ask?:number;spread?:number;candleCount:number;series:Candle[];candidate?:any;decision?:any;analysis?:any;externalContext?:any;verifiedPerformance?:any;error?:string};

const TFS=["1m","5m","10m","1h"] as const;

export default function ForexPage(){
  const [pairs,setPairs]=useState<PairResponse|null>(null);
  const [news,setNews]=useState<News|null>(null);
  const [selected,setSelected]=useState("EUR/USD");
  const [query,setQuery]=useState("");
  const [timeframe,setTimeframe]=useState<(typeof TFS)[number]>("5m");
  const [live,setLive]=useState<LivePayload|null>(null);
  const [error,setError]=useState("");
  const [backtest,setBacktest]=useState<any>(null);
  const [busy,setBusy]=useState(false);
  const lastAlert=useRef("");

  useEffect(()=>{fetch("/api/forex/pairs").then(r=>r.json()).then(setPairs).catch(()=>{});},[]);
  useEffect(()=>{fetch("/api/forex/news?pair="+encodeURIComponent(selected)+"&hours=24").then(r=>r.json()).then(setNews).catch(()=>{});},[selected]);

  useEffect(()=>{
    let stop=false;
    async function refresh(){
      try{
        const r=await fetch("/api/connectors/analyze?source=auto&symbol="+encodeURIComponent(selected)+"&timeframe="+timeframe,{cache:"no-store"});
        const j=await r.json();
        if(stop)return;
        if(r.ok&&j.ready!==false){
          setLive(j);setError("");
          const c=j.candidate;
          if((c?.status==="APTO"||c?.preAlert)&&(c.side==="BUY"||c.side==="SELL")){
            const key=[j.symbol,j.timeframe,c.side,c.score,c.entry].join(":");
            if(lastAlert.current!==key){
              lastAlert.current=key;
              if(typeof Notification!=="undefined"&&Notification.permission==="granted"){
                new Notification((c.preAlert?"MercadoAI — PRÉ-ALERTA ":"MercadoAI — ")+(c.side==="BUY"?"COMPRA ":"VENDA ")+j.symbol,{
                  body:j.timeframe+" · confiança "+c.confidence+"% · entrada "+c.entry+(c.preAlert?" · aguardando confirmação final":"")
                });
              }
            }
          }
        }else{
          setLive(null);
          setError(j.error||"Aguardando stream real deste ativo/timeframe.");
        }
      }catch{
        if(!stop)setError("Reconectando ao feed...");
      }
    }
    refresh();
    const id=setInterval(refresh,2000);
    return()=>{stop=true;clearInterval(id);};
  },[selected,timeframe]);

  const filtered=(pairs?.pairs??[]).filter(p=>p.symbol.includes(query.toUpperCase())||p.group.includes(query.toLowerCase())).slice(0,120);

  async function enableAlerts(){
    if(typeof Notification==="undefined")return;
    await Notification.requestPermission();
  }

  async function runBacktest(){
    setBusy(true);
    try{
      const r=await fetch("/api/forex/backtest",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({pair:selected,timeframe,provider:"auto"})});
      const j=await r.json();
      if(r.ok&&j.ready!==false)setBacktest(j);
      else setError(j.message||j.error||"Backtest aguardando histórico.");
    }finally{setBusy(false);}
  }

  const signal=live?.candidate?.side==="BUY"?"COMPRA":live?.candidate?.side==="SELL"?"VENDA":"AGUARDAR";
  const confidence=live?.candidate?.confidence??live?.analysis?.signal?.confidence??0;
  const age=live?.lastSeen?Math.max(0,Math.round((Date.now()-new Date(live.lastSeen).getTime())/1000)):null;

  return <main className="fxPage">
    <header className="fxTop">
      <div><a href="/" className="fxBack"><ChevronLeft size={14}/> Dashboard</a><h1>Forex Intelligence</h1></div>
      <div className="welcomeActions">
        <button className="softAction" onClick={enableAlerts}><Bell size={14}/> Ativar alertas</button>
        <span className={"liveFeedBadge "+(live?"online":"offline")}><i/>{live?("ONLINE · "+live.source.toUpperCase()):"AGUARDANDO FEED"}</span>
      </div>
    </header>

    <details className="fxPanel fxMarketCompact compactMenu">
      <summary>Selecionar ativo</summary>
      <div className="fxPanelHead compactMenuHead">
        <div><h2>Mercado Forex</h2></div>
        <div className="fxSearch"><Search size={14}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar par..."/></div>
      </div>
      <div className="fxPairTabs compact">
        {filtered.map(p=><button key={p.symbol} className={selected===p.symbol?"active":""} onClick={()=>setSelected(p.symbol)}><b>{p.symbol}</b><small>{p.group}</small></button>)}
      </div>
    </details>

    <section className="tradeWorkspace">
      <article className="fxPanel chartPanel">
        <div className="chartTopbar">
          <div><span className="chartSymbol">{selected}</span><span className="chartPrice">{live?.bid?live.bid.toFixed(5):"—"}</span><small>{live?(live.source.toUpperCase()+" · "+age+"s atrás"):"sem stream"}</small></div>
          <div className="tfSwitch">{TFS.map(tf=><button key={tf} className={timeframe===tf?"active":""} onClick={()=>setTimeframe(tf)}>{tf}</button>)}</div>
        </div>
        {live?.series?.length?<LiveCandleChart candles={live.series} signal={live?.candidate??null}/>:<div className="chartEmpty"><Activity/><b>Aguardando candles reais</b><span>MT5/Profit ainda não enviou {selected} em {timeframe}.</span></div>}
      </article>

      <aside className="fxPanel signalConsole">
        <div className="signalHeadline">{live?.candidate?.preAlert&&<span className="preAlertBadge">PRÉ-ALERTA · {live.candidate.readinessPct}%</span>}<div className={"bigSignal "+signal.toLowerCase()}>{signal}</div></div>
        <div className="signalConfidence"><span>Confiança</span><strong>{confidence}%</strong></div>
        <div className="signalLevels">
          <div><span>Entrada</span><b>{live?.candidate?.entry??"—"}</b></div>
          <div><span>Stop</span><b>{live?.candidate?.stopLoss??"—"}</b></div>
          <div><span>Alvo</span><b>{live?.candidate?.takeProfit??"—"}</b></div>
          <div><span>Risco</span><b>{live?.analysis?.signal?.risk??"—"}</b></div>
        </div>
        <div className="signalStatus"><ShieldCheck size={15}/><div><b>{live?.candidate?.preAlert?"PRÉ-ALERTA":(live?.candidate?.status??"AGUARDAR")}</b><span>{live?.candidate?.preAlert?(live?.candidate?.preAlertReason??"Setup próximo da validação final."):

  live?.candidate?.status==="APTO"
    ?"Confluência aprovada pelo motor."
    :live?.candidate?.status==="BLOQUEADO"
      ?(live?.candidate?.blocks?.[0]??"Direção detectada, mas bloqueada por regra de segurança.")
       :"Sem direção confirmada neste momento."
}</span></div></div>
        {live?.verifiedPerformance?.accuracyClaimAllowed&&<div className="verifiedAccuracy">Precisão verificada: <b>{live.verifiedPerformance.accuracyLabel}</b> · {live.verifiedPerformance.signals} sinais</div>}
        <button className="backtestCompact" disabled={busy} onClick={runBacktest}><Zap size={14}/> Backtest deste setup</button>
        {error&&<div className="fxInfoBox">{error}</div>}
      </aside>
    </section>

    <section className="fxBottomCompact">
      <details className="fxPanel compactMenu">
        <summary><BookOpen size={15}/> Notícias</summary>
        <div className="fxPanelHead compactMenuHead"><div><h2>Últimas 24h</h2></div></div>
        <div className="fxNews compactNews">{(news?.items??[]).slice(0,4).map((n,i)=><a key={i} href={n.url} target="_blank" rel="noreferrer"><b>{n.title}</b><small>{n.domain??"fonte externa"}</small></a>)}{!news?.items?.length&&<p>Nenhuma notícia carregada.</p>}</div>
      </details>

      <details className="fxPanel technicalDetails">
        <summary><TrendingUp size={15}/> Indicadores</summary>
        <div className="compactTechnical">
          <div><span>Regime</span><b>{live?.analysis?.regime??"—"}</b></div>
          <div><span>RSI</span><b>{Number(live?.analysis?.snapshot?.rsi14??0).toFixed(1)}</b></div>
          <div><span>ADX</span><b>{Number(live?.analysis?.snapshot?.adx14??0).toFixed(1)}</b></div>
          <div><span>Score</span><b>{live?.candidate?.score??live?.analysis?.signal?.score??"—"}</b></div>
          <div><span>Notícias</span><b>{live?.externalContext?Math.round((live.externalContext.newsRisk??0)*100)+"% risco":"—"}</b></div>
          <div><span>Headlines</span><b>{live?.externalContext?.headlines??"—"}</b></div>
        </div>
        <div className="reasonCompact">{(live?.candidate?.reasons??live?.analysis?.signal?.reasons??[]).slice(0,5).map((x:string)=><p key={x}>• {x}</p>)}</div>
      </details>
    </section>

    {backtest&&<section className="fxPanel fxResult compactBacktest">
      <div className="fxPanelHead"><div><h2>Validação histórica</h2></div><ShieldCheck size={16}/></div>
      <div className="fxMetrics">
        <div><span>Sinais</span><strong>{backtest.signals}</strong></div>
        <div><span>Win rate</span><strong>{backtest.winRate}%</strong></div>
        <div><span>Profit Factor</span><strong>{backtest.profitFactor??"—"}</strong></div>
        <div><span>Drawdown</span><strong>{backtest.maxDrawdownPct}%</strong></div>
      </div>
    </section>}
  </main>;
}
