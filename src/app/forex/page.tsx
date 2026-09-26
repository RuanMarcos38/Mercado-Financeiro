"use client";

import { useEffect,useRef,useState } from "react";
import { Activity,Bell,BookOpen,ChevronLeft,Search,ShieldCheck,TrendingUp,Zap } from "lucide-react";
import LiveCandleChart from "@/components/LiveCandleChart";
import type { Candle } from "@/lib/market/types";
import { MARKET_UI_REFRESH_MS,MARKET_ANALYSIS_MAX_AGE_SECONDS } from "@/lib/market-intelligence/cadence";

type Pair={symbol:string;base:string;quote:string;group:string;label:string};
type PairResponse={counts:{total:number;majors:number;minors:number;exotics:number};pairs:Pair[];providers:Array<{id:string;configured:boolean;realtime:boolean;note:string}>};
type News={risk:number;items:Array<{title:string;url:string;domain?:string;seenDate?:string}>};
type LivePayload={ready:boolean;source:string;symbol:string;timeframe:string;lastSeen:string;bid?:number;ask?:number;spread?:number;candleCount:number;series:Candle[];candidate?:any;decision?:any;analysis?:any;externalContext?:any;verifiedPerformance?:any;analysisFresh?:boolean;analysisAgeSeconds?:number;analysisMaxAgeSeconds?:number;error?:string};

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
  const [soundEnabled,setSoundEnabled]=useState(false);
  const [nextRefresh,setNextRefresh]=useState(Math.round(MARKET_UI_REFRESH_MS/1000));
  const lastAlert=useRef("");
  const audioRef=useRef<AudioContext|null>(null);

  useEffect(()=>{
    fetch("/api/forex/pairs").then(r=>r.json()).then(setPairs).catch(()=>{});
    setSoundEnabled(localStorage.getItem("mercadoai-sound")==="1");
  },[]);
  useEffect(()=>{
    fetch("/api/forex/news?pair="+encodeURIComponent(selected)+"&hours=24").then(r=>r.json()).then(setNews).catch(()=>{});
  },[selected]);

  useEffect(()=>{
    fetch("/api/connectors/watchlist",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({symbol:selected,timeframe})
    }).catch(()=>{});
  },[selected,timeframe]);

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
          if((c?.status==="APTO"||c?.preAlert||c?.watch)&&(c.side==="BUY"||c.side==="SELL")){
            const stage=c.status==="APTO"?"APTO":c.preAlert?"PRÉ-ALERTA":"MONITORAR";
            const key=[j.symbol,j.timeframe,c.side,stage,c.firstSignalAt??""].join(":");
            if(lastAlert.current!==key){
              lastAlert.current=key;
              if(typeof Notification!=="undefined"&&Notification.permission==="granted"){
                new Notification(
                  "MercadoAI — "+stage+" "+(c.side==="BUY"?"COMPRA ":"VENDA ")+j.symbol,
                  {body:j.timeframe+" · prontidão "+(c.readinessPct??0)+"% · confiança "+c.confidence+"% · referência "+c.entry}
                );
              }
              if(soundEnabled){
                try{
                  const ctx=audioRef.current??new AudioContext();
                  audioRef.current=ctx;
                  const osc=ctx.createOscillator();
                  const gain=ctx.createGain();
                  osc.type="sine";
                  osc.frequency.value=c.status==="APTO"?(c.side==="BUY"?880:520):c.preAlert?650:430;
                  gain.gain.setValueAtTime(.0001,ctx.currentTime);
                  gain.gain.exponentialRampToValueAtTime(.16,ctx.currentTime+.02);
                  gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+.28);
                  osc.connect(gain);gain.connect(ctx.destination);
                  osc.start();osc.stop(ctx.currentTime+.3);
                }catch{}
              }
            }
          }
        }else{
          setLive(null);
          setError(j.error||"Aguardando dados reais deste ativo/período.");
        }
      }catch{
        if(!stop)setError("Reconectando aos dados...");
      }
    }
    refresh();
    setNextRefresh(Math.round(MARKET_UI_REFRESH_MS/1000));
    const id=setInterval(()=>{
      refresh();
      setNextRefresh(Math.round(MARKET_UI_REFRESH_MS/1000));
    },MARKET_UI_REFRESH_MS);
    return()=>{stop=true;clearInterval(id);};
  },[selected,timeframe,soundEnabled]);

  useEffect(()=>{
    const id=setInterval(()=>setNextRefresh(v=>v<=1?Math.round(MARKET_UI_REFRESH_MS/1000):v-1),1000);
    return()=>clearInterval(id);
  },[]);

  const filtered=(pairs?.pairs??[]).filter(p=>p.symbol.includes(query.toUpperCase())||p.group.includes(query.toLowerCase()));

  async function enableAlerts(){
    if(typeof Notification!=="undefined")await Notification.requestPermission();
    try{
      const ctx=audioRef.current??new AudioContext();
      audioRef.current=ctx;
      await ctx.resume();
      const osc=ctx.createOscillator();
      const gain=ctx.createGain();
      osc.frequency.value=740;
      gain.gain.setValueAtTime(.0001,ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(.12,ctx.currentTime+.02);
      gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+.18);
      osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+.2);
      setSoundEnabled(true);
      localStorage.setItem("mercadoai-sound","1");
    }catch{}
  }

  async function runBacktest(){
    setBusy(true);
    try{
      const r=await fetch("/api/forex/backtest",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({pair:selected,timeframe,provider:"auto"})});
      const j=await r.json();
      if(r.ok&&j.ready!==false)setBacktest(j);
      else setError(j.message||j.error||"Teste histórico aguardando dados.");
    }finally{setBusy(false);}
  }

  const signal=live?.candidate?.side==="BUY"?"COMPRA":live?.candidate?.side==="SELL"?"VENDA":"AGUARDAR";
  const stage=live?.candidate?.status==="APTO"?"APTO":live?.candidate?.preAlert?"PRÉ-ALERTA":live?.candidate?.watch?"MONITORAR":"AGUARDAR";
  const simpleInstruction=
    stage==="APTO"
      ?(signal==="COMPRA"?"COMPRA LIBERADA PELO MODELO":"VENDA LIBERADA PELO MODELO")
      :stage==="PRÉ-ALERTA"?"PREPARE-SE, MAS AINDA NÃO ENTRE"
      :stage==="MONITORAR"?"MOVIMENTO EM FORMAÇÃO"
      :"AGUARDE UMA OPORTUNIDADE";
  const confidence=live?.candidate?.confidence??live?.analysis?.signal?.confidence??0;
  const age=live?.lastSeen?Math.max(0,Math.round((Date.now()-new Date(live.lastSeen).getTime())/1000)):null;

  return <main className="fxPage">
    <header className="fxTop">
      <div><a href="/" className="fxBack"><ChevronLeft size={14}/> Painel</a><h1>Inteligência Forex</h1></div>
      <div className="welcomeActions">
        <button className="softAction" onClick={enableAlerts}><Bell size={14}/> {soundEnabled?"Alertas sonoros ativos":"Ativar alertas"}</button>
        <span className={"liveFeedBadge "+(live?.analysisFresh===false?"offline":live?"online":"offline")}><i/>{
  live?.analysisFresh===false
    ?"DADOS VENCIDOS"
    :live?("CONECTADO · "+live.source.toUpperCase()):"AGUARDANDO DADOS"
}</span>
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
          <div><span className="chartSymbol">{selected}</span><span className="chartPrice">{live?.bid?live.bid.toFixed(5):"—"}</span><small>{live?(live.source.toUpperCase()+" · "+age+"s atrás"):"sem dados"}</small></div>
          <div className="tfSwitch">{TFS.map(tf=><button key={tf} className={timeframe===tf?"active":""} onClick={()=>setTimeframe(tf)}>{tf}</button>)}</div>
        </div>
        {live?.series?.length?<LiveCandleChart candles={live.series} signal={live?.candidate??null}/>:<div className="chartEmpty"><Activity/><b>Aguardando candles reais</b><span>MT5/Profit ainda não enviou {selected} em {timeframe}.</span></div>}
      </article>

      <aside className="fxPanel signalConsole">
        <div className="beginnerDecision">
          <span className="beginnerDecisionLabel">O QUE FAZER AGORA</span>
          <strong>{simpleInstruction}</strong>
          <small>Nova conferência em {nextRefresh}s · decisão válida por até {MARKET_ANALYSIS_MAX_AGE_SECONDS}s com dados ativos</small>
        </div>
        <div className="signalHeadline">
          {(live?.candidate?.watch||live?.candidate?.preAlert)&&live?.candidate?.status!=="APTO"&&
            <span className="preAlertBadge">
              {live?.candidate?.preAlert?"PRÉ-ALERTA":"MONITORAR"} · {live?.candidate?.readinessPct??0}%
            </span>}
          <div className={"bigSignal "+signal.toLowerCase()}>{signal}</div>
        </div>
        <div className="signalConfidence"><span>Confiança</span><strong>{confidence}%</strong></div>
        <div className="signalLevels beginnerLevels">
          <div><span>1. PREÇO PARA ENTRAR</span><b>{live?.candidate?.entry??"—"}</b><small>{stage==="APTO"?"Use somente enquanto o sinal estiver APTO.":"Ainda não entre; aguarde confirmação."}</small></div>
          <div><span>2. SE DER ERRADO, SAIA EM</span><b>{live?.candidate?.stopLoss??"—"}</b><small>Proteção calculada pelo modelo.</small></div>
          <div><span>3. OBJETIVO DA OPERAÇÃO</span><b>{live?.candidate?.takeProfit??"—"}</b><small>Alvo estimado para o cenário atual.</small></div>
          <div><span>RISCO ESTIMADO</span><b>{live?.analysis?.signal?.risk??"—"}</b><small>Reavaliado com os novos dados.</small></div>
        </div>
        <div className="signalStatus"><ShieldCheck size={15}/><div><b>{
  live?.candidate?.status==="APTO"?"APTO":
  live?.candidate?.preAlert?"PRÉ-ALERTA":
  live?.candidate?.watch?"MONITORAR":
  (live?.candidate?.status??"AGUARDAR")
}</b><span>{(live?.candidate?.preAlert||live?.candidate?.watch)?(live?.candidate?.preAlertReason??"Movimento em formação."):

  live?.candidate?.status==="APTO"
    ?"Confluência aprovada pelo motor."
    :live?.candidate?.status==="BLOQUEADO"
      ?(live?.candidate?.blocks?.[0]??"Direção detectada, mas bloqueada por regra de segurança.")
       :"Sem direção confirmada neste momento."
}</span></div></div>
        {live?.verifiedPerformance?.accuracyClaimAllowed&&<div className="verifiedAccuracy">Precisão verificada: <b>{live.verifiedPerformance.accuracyLabel}</b> · {live.verifiedPerformance.signals} sinais</div>}
        <button className="backtestCompact" disabled={busy} onClick={runBacktest}><Zap size={14}/> Testar este cenário</button>
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
          <div><span>Pontuação</span><b>{live?.candidate?.score??live?.analysis?.signal?.score??"—"}</b></div>
          <div><span>Notícias</span><b>{live?.externalContext?Math.round((live.externalContext.newsRisk??0)*100)+"% risco":"—"}</b></div>
          <div><span>Notícias</span><b>{live?.externalContext?.headlines??"—"}</b></div>
        </div>
        <div className="reasonCompact">{(live?.candidate?.reasons??live?.analysis?.signal?.reasons??[]).slice(0,5).map((x:string)=><p key={x}>• {x}</p>)}</div>
      </details>
    </section>

    {backtest&&<section className="fxPanel fxResult compactBacktest">
      <div className="fxPanelHead"><div><h2>Validação histórica</h2></div><ShieldCheck size={16}/></div>
      <div className="fxMetrics">
        <div><span>Sinais</span><strong>{backtest.signals}</strong></div>
        <div><span>Taxa de acerto</span><strong>{backtest.winRate}%</strong></div>
        <div><span>Fator de lucro</span><strong>{backtest.profitFactor??"—"}</strong></div>
        <div><span>Perda máxima</span><strong>{backtest.maxDrawdownPct}%</strong></div>
      </div>
    </section>}
  </main>;
}
