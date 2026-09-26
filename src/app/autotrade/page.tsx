"use client";

import { useEffect,useRef,useState } from "react";
import { Activity,AlertTriangle,Bell,ChevronLeft,Play,RefreshCw,ShieldCheck,Square,Target,TrendingDown,TrendingUp,Zap } from "lucide-react";

type Candidate={
  source:string;symbol:string;timeframe:string;status:"APTO"|"BLOQUEADO"|"AGUARDAR";side?:"BUY"|"SELL";
  confidence:number;score:number;entry:number;stopLoss?:number;takeProfit?:number;rr?:number;
  reasons:string[];blocks:string[];validForSeconds:number;
};
type Radar={generatedAt:string;mode:string;liveAllowed:boolean;total:number;aptos:number;candidates:Candidate[];intentsCreated:number};
type Config={mode:"off"|"paper"|"live";minConfidence:number;minAbsScore:number;maxNewsRisk:number;maxSpreadPct:number;maxOpenPositions:number;maxTradesPerHour:number;riskPerTradePct:number;dailyLossLimitPct:number;takeProfitR:number;stopAtrMultiple:number;cooldownSeconds:number;allowBuy:boolean;allowSell:boolean;liveAllowed?:boolean;note?:string};

export default function AutoTradePage(){
  const [radar,setRadar]=useState<Radar|null>(null);
  const [cfg,setCfg]=useState<Config|null>(null);
  const [adminKey,setAdminKey]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const seenRef=useRef<Set<string>>(new Set());
  const [notifications,setNotifications]=useState(false);

  async function load(){
    try{
      const [r,c]=await Promise.all([
        fetch("/api/autotrade/radar",{cache:"no-store"}),
        fetch("/api/autotrade/config",{cache:"no-store"})
      ]);
      const rj=await r.json();const cj=await c.json();
      if(!r.ok)throw new Error(rj.error||"Falha no radar");
      if(notifications && typeof Notification!=="undefined" && Notification.permission==="granted"){
        for(const x of (rj.candidates??[]).filter((v:Candidate)=>v.status==="APTO")){
          const k=[x.source,x.symbol,x.timeframe,x.side,x.score].join(":");
          if(!seenRef.current.has(k)){
            new Notification(`MercadoAI: ${x.side==="BUY"?"COMPRA":"VENDA"} ${x.symbol}`,{body:`Confiança ${x.confidence}% · Score ${x.score} · Stop ${x.stopLoss?.toFixed(5)??"—"} · Alvo ${x.takeProfit?.toFixed(5)??"—"}`});
            seenRef.current.add(k);
          }
        }
      }
      setRadar(rj);setCfg(cj);setError("");
    }catch(e){setError(e instanceof Error?e.message:"Falha ao carregar AutoTrade");}
  }

  useEffect(()=>{load();const id=setInterval(load,15000);return()=>clearInterval(id);},[]);

  async function enableNotifications(){
    if(typeof Notification==="undefined"){setError("Este navegador não suporta notificações.");return;}
    const p=await Notification.requestPermission();
    setNotifications(p==="granted");
    if(p!=="granted")setError("Permissão de notificações não concedida.");
  }

  async function save(patch:Partial<Config>){
    setBusy(true);setError("");
    try{
      const r=await fetch("/api/autotrade/config",{
        method:"POST",
        headers:{"content-type":"application/json",...(adminKey?{"x-autotrade-admin-key":adminKey}:{})},
        body:JSON.stringify(patch)
      });
      const j=await r.json();if(!r.ok)throw new Error(j.error||"Falha ao atualizar");
      setCfg(j);await load();
    }catch(e){setError(e instanceof Error?e.message:"Falha");}
    finally{setBusy(false);}
  }

  return <main className="autoPage">
    <header className="autoHeader">
      <div><a href="/" className="fxBack"><ChevronLeft size={14}/> Dashboard</a><h1>AI Trade Radar & AutoTrade</h1><p>Radar de oportunidades, alertas operacionais, execução em Paper e opção Live protegida por regras de risco.</p></div>
      <div className="welcomeActions"><button className="softAction" onClick={enableNotifications}><Bell size={15}/> {notifications?"Alertas ativos":"Ativar alertas"}</button><button className="refreshIntegration" onClick={load}><RefreshCw size={15}/> Atualizar radar</button></div>
    </header>

    {error&&<div className="realDataError"><b>Atenção:</b> {error}</div>}

    <section className="autoTopGrid">
      <article className="autoStatusCard">
        <div className="autoStatusHead"><Zap/><span>Oportunidades aptas</span></div>
        <strong>{radar?.aptos??0}</strong><small>de {radar?.total??0} streams analisados</small>
      </article>
      <article className="autoStatusCard">
        <div className="autoStatusHead"><Activity/><span>Modo atual</span></div>
        <strong className={"modeText "+(cfg?.mode??"off")}>{String(cfg?.mode??"off").toUpperCase()}</strong><small>{cfg?.mode==="live"?"ordens reais habilitadas no SaaS":cfg?.mode==="paper"?"simulação automática":"somente análise/alerta"}</small>
      </article>
      <article className="autoStatusCard">
        <div className="autoStatusHead"><ShieldCheck/><span>Confiança mínima</span></div>
        <strong>{cfg?.minConfidence??72}%</strong><small>abaixo disso nenhuma ordem é criada</small>
      </article>
      <article className="autoStatusCard">
        <div className="autoStatusHead"><Bell/><span>Alertas</span></div>
        <strong>15s</strong><small>radar recalculado continuamente nesta tela</small>
      </article>
    </section>

    <section className="autoGrid">
      <article className="autoPanel">
        <div className="fxPanelHead"><div><h2>Controle de execução</h2><p>Paper é recomendado para validação; Live exige liberação do servidor e do bridge local.</p></div><ShieldCheck size={18}/></div>
        <label className="adminField">Chave administrativa do AutoTrade<input type="password" value={adminKey} onChange={e=>setAdminKey(e.target.value)} placeholder="AUTOTRADE_ADMIN_KEY"/></label>
        <div className="modeButtons">
          <button disabled={busy} className={cfg?.mode==="off"?"active off":""} onClick={()=>save({mode:"off"})}><Square/> OFF</button>
          <button disabled={busy} className={cfg?.mode==="paper"?"active paper":""} onClick={()=>save({mode:"paper"})}><Play/> PAPER</button>
          <button disabled={busy||!cfg?.liveAllowed} className={cfg?.mode==="live"?"active live":""} onClick={()=>save({mode:"live"})}><Zap/> LIVE</button>
        </div>
        {!cfg?.liveAllowed&&<div className="autoWarning"><AlertTriangle/> Live está bloqueado no servidor. É necessário AUTOTRADE_LIVE_ENABLED=true.</div>}

        <div className="riskGrid">
          <label>Confiança mínima<input type="number" value={cfg?.minConfidence??72} onChange={e=>setCfg(v=>v?{...v,minConfidence:Number(e.target.value)}:v)} onBlur={()=>cfg&&save({minConfidence:cfg.minConfidence})}/><span>%</span></label>
          <label>Score mínimo<input type="number" value={cfg?.minAbsScore??48} onChange={e=>setCfg(v=>v?{...v,minAbsScore:Number(e.target.value)}:v)} onBlur={()=>cfg&&save({minAbsScore:cfg.minAbsScore})}/></label>
          <label>Risco por trade<input type="number" step=".1" value={cfg?.riskPerTradePct??.5} onChange={e=>setCfg(v=>v?{...v,riskPerTradePct:Number(e.target.value)}:v)} onBlur={()=>cfg&&save({riskPerTradePct:cfg.riskPerTradePct})}/><span>%</span></label>
          <label>Perda diária máx.<input type="number" step=".1" value={cfg?.dailyLossLimitPct??2} onChange={e=>setCfg(v=>v?{...v,dailyLossLimitPct:Number(e.target.value)}:v)} onBlur={()=>cfg&&save({dailyLossLimitPct:cfg.dailyLossLimitPct})}/><span>%</span></label>
          <label>Máx. posições<input type="number" value={cfg?.maxOpenPositions??2} onChange={e=>setCfg(v=>v?{...v,maxOpenPositions:Number(e.target.value)}:v)} onBlur={()=>cfg&&save({maxOpenPositions:cfg.maxOpenPositions})}/></label>
          <label>Máx. trades/hora<input type="number" value={cfg?.maxTradesPerHour??6} onChange={e=>setCfg(v=>v?{...v,maxTradesPerHour:Number(e.target.value)}:v)} onBlur={()=>cfg&&save({maxTradesPerHour:cfg.maxTradesPerHour})}/></label>
          <label>Stop ATR<input type="number" step=".05" value={cfg?.stopAtrMultiple??1.25} onChange={e=>setCfg(v=>v?{...v,stopAtrMultiple:Number(e.target.value)}:v)} onBlur={()=>cfg&&save({stopAtrMultiple:cfg.stopAtrMultiple})}/></label>
          <label>Alvo R:R<input type="number" step=".1" value={cfg?.takeProfitR??1.8} onChange={e=>setCfg(v=>v?{...v,takeProfitR:Number(e.target.value)}:v)} onBlur={()=>cfg&&save({takeProfitR:cfg.takeProfitR})}/></label>
        </div>
      </article>

      <aside className="autoPanel">
        <div className="fxPanelHead"><div><h2>Camada diferencial</h2><p>Uma entrada só fica APTA quando múltiplas famílias concordam.</p></div><Target size={18}/></div>
        <div className="edgeList">
          <p><b>1. Estrutura</b><span>Tendência, swings, suporte/resistência e pullback.</span></p>
          <p><b>2. Momentum</b><span>RSI, MACD, ROC, Estocástico e CCI.</span></p>
          <p><b>3. Força</b><span>ADX, volume/tick volume e expansão de volatilidade.</span></p>
          <p><b>4. Localização</b><span>Fibonacci, médias, VWAP, Donchian, pivôs e Ichimoku.</span></p>
          <p><b>5. Contexto</b><span>Notícias, macro, spread, atualidade do feed e regime.</span></p>
          <p><b>6. Validação</b><span>Backtest + forward test + auditoria de cada sinal executado.</span></p>
        </div>
      </aside>
    </section>

    <section className="autoPanel">
      <div className="fxPanelHead"><div><h2>Radar de oportunidades</h2><p>Somente APTOS podem gerar intenção automática de ordem.</p></div><Bell size={18}/></div>
      <div className="autoTable">
        <div className="autoTr autoTh"><span>Status</span><span>Fonte</span><span>Ativo</span><span>TF</span><span>Direção</span><span>Conf.</span><span>Score</span><span>Entrada</span><span>Stop</span><span>Alvo</span></div>
        {(radar?.candidates??[]).map(c=><div className="autoTr" key={c.source+c.symbol+c.timeframe}>
          <span><em className={"aptBadge "+c.status.toLowerCase()}>{c.status}</em></span>
          <span>{c.source.toUpperCase()}</span>
          <span><b>{c.symbol}</b></span>
          <span>{c.timeframe}</span>
          <span className={c.side==="BUY"?"upText":c.side==="SELL"?"downText":""}>{c.side==="BUY"?<><TrendingUp size={12}/> COMPRA</>:c.side==="SELL"?<><TrendingDown size={12}/> VENDA</>:"—"}</span>
          <span><b>{c.confidence}%</b></span>
          <span>{c.score}</span>
          <span>{c.entry?.toFixed(5)}</span>
          <span>{c.stopLoss?.toFixed(5)??"—"}</span>
          <span>{c.takeProfit?.toFixed(5)??"—"}</span>
        </div>)}
        {!radar?.candidates?.length&&<div className="integrationEmpty"><Activity/><b>Nenhum stream elegível ainda.</b><span>Conecte MT5/Profit para o radar analisar dados em tempo real.</span></div>}
      </div>
    </section>

    <p className="integrationWarning">AutoTrade usa regras probabilísticas e controles de risco; nenhuma taxa de acerto é garantida. Efetividade deve ser validada por ativo, timeframe e regime antes de habilitar Live.</p>
  </main>;
}
