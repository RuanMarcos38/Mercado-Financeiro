"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity, BarChart3, Bell, BookOpen, BrainCircuit, CandlestickChart, ChevronDown, Globe2,
  CircleDollarSign, Clock3, FileBarChart, FlaskConical, Gauge, LayoutDashboard,
  LineChart, Search, Settings, ShieldCheck, Sparkles, TrendingDown, TrendingUp,
  Users, Zap
} from "lucide-react";
import type { Candle } from "@/lib/market/types";

type Analysis={
  regime?:string;
  signal?:{side:string;confidence:number;score:number;risk:string;reasons:string[]};
  indicators?:Record<string,number>;
};

type RealAsset={
  ok:boolean;
  symbol:string;
  name?:string;
  currency?:string;
  price?:number|null;
  changePercent?:number|null;
  volume?:number|null;
  marketTime?:string|null;
  delayed?:boolean;
  delayLabel?:string;
  candles?:Candle[];
  analysis?:Analysis|null;
  error?:string;
};

type Overview={
  generatedAt:string;
  refreshSeconds:number;
  assets:RealAsset[];
  ibov?:RealAsset|null;
  ptax?:{price:number;buy:number;sell:number;changePercent:number|null;marketTime:string;source:string;official:boolean}|null;
  macro?:{selicTarget?:{date:string;value:number}|null;ipcaLatest?:{date:string;value:number}|null;source:string}|null;
  unavailable?:Array<{symbol:string;name:string;reason:string}>;
  upstream?:Record<string,{type:string;cadence:string;note:string}>;
};

function fmtPrice(v:number|null|undefined,currency="BRL"){
  if(v==null || !Number.isFinite(v)) return "—";
  return new Intl.NumberFormat("pt-BR",{
    style:currency==="BRL"?"currency":"decimal",
    currency:currency==="BRL"?"BRL":undefined,
    minimumFractionDigits:currency==="BRL"?2:2,
    maximumFractionDigits:currency==="BRL"?2:4
  }).format(v);
}

function fmtPct(v:number|null|undefined){
  if(v==null || !Number.isFinite(v)) return "—";
  return `${v>=0?"+":""}${v.toFixed(2).replace(".",",")}%`;
}

function fmtTime(v:string|null|undefined){
  if(!v) return "—";
  const d=new Date(v);
  if(Number.isNaN(d.getTime())) return v;
  return new Intl.DateTimeFormat("pt-BR",{hour:"2-digit",minute:"2-digit",day:"2-digit",month:"2-digit",timeZone:"America/Sao_Paulo"}).format(d);
}

function CandleChart({candles}:{candles:Candle[]}){
  const data=candles.slice(-72);
  if(data.length<2) return <div className="chartEmpty"><CandlestickChart size={32}/><b>Aguardando candles reais</b><span>O gráfico aparecerá quando a fonte retornar histórico OHLCV.</span></div>;
  const w=760,h=300,pad=18;
  const min=Math.min(...data.map(c=>c.low));
  const max=Math.max(...data.map(c=>c.high));
  const range=Math.max(.0001,max-min);
  const y=(v:number)=>pad+(max-v)/range*(h-pad*2-34);
  const step=(w-pad*2)/data.length;
  const labels=[0,Math.floor(data.length*.33),Math.floor(data.length*.66),data.length-1];
  return <svg className="heroChart" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Gráfico de candles reais">
    {[0,1,2,3,4].map(n=><line key={n} x1={pad} y1={30+n*48} x2={w-pad} y2={30+n*48} className="gridLine"/>)}
    {data.map((c,i)=>{
      const x=pad+i*step+step/2;
      const up=c.close>=c.open;
      const bodyY=Math.min(y(c.open),y(c.close));
      const bodyH=Math.max(2,Math.abs(y(c.open)-y(c.close)));
      const volume=Math.min(28,Math.max(2,(c.volume||0)>0?Math.log10(c.volume+1)*3:2));
      return <g key={c.time+i}>
        <line x1={x} y1={y(c.high)} x2={x} y2={y(c.low)} className={up?"candleUp":"candleDown"}/>
        <rect x={x-step*.28} y={bodyY} width={step*.56} height={bodyH} rx="1" className={up?"candleFillUp":"candleFillDown"}/>
        <rect x={x-step*.28} y={h-4-volume} width={step*.56} height={volume} className={up?"volumeUp":"volumeDown"}/>
      </g>
    })}
    {labels.map((idx,n)=>{
      const d=new Date(data[idx]?.time);
      const label=Number.isNaN(d.getTime())?"":new Intl.DateTimeFormat("pt-BR",{hour:"2-digit",minute:"2-digit",timeZone:"America/Sao_Paulo"}).format(d);
      const x=n===0?pad:n===labels.length-1?w-pad-28:pad+idx*step;
      return <text key={idx} x={x} y={h-10} className="axisText">{label}</text>
    })}
  </svg>
}

function Donut(){
  return <div className="donutWrap">
    <div className="donut"><div><strong>7</strong><span>classes</span></div></div>
    <div className="legend">
      <span><i className="l1"/>Ações <b>real</b></span>
      <span><i className="l2"/>Câmbio <b>BCB</b></span>
      <span><i className="l3"/>Índice <b>parcial</b></span>
      <span><i className="l4"/>Ouro <b>opcional</b></span>
      <span><i className="l5"/>Futuros <b>opcional</b></span>
    </div>
  </div>
}

export default function Home(){
  const [data,setData]=useState<Overview|null>(null);
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(true);

  async function load(){
    try{
      const res=await fetch("/api/market/overview",{cache:"no-store"});
      const json=await res.json();
      if(!res.ok) throw new Error(json?.error||"Falha ao carregar mercado");
      setData(json); setError("");
    }catch(e){
      setError(e instanceof Error?e.message:"Falha ao carregar dados reais");
    }finally{setLoading(false);}
  }

  useEffect(()=>{
    load();
    const id=setInterval(load,60000);
    return ()=>clearInterval(id);
  },[]);

  const realAssets=(data?.assets??[]).filter(a=>a.ok);
  const featured=realAssets.find(a=>a.symbol==="PETR4")??realAssets[0];
  const signals=realAssets.map(a=>a.analysis?.signal).filter(Boolean) as NonNullable<Analysis["signal"]>[];
  const buys=signals.filter(s=>s.side==="COMPRA").length;
  const sells=signals.filter(s=>s.side==="VENDA").length;
  const avgConf=signals.length?signals.reduce((sum,s)=>sum+s.confidence,0)/signals.length:0;
  const featuredSignal=featured?.analysis?.signal;
  const featuredIndicators=featured?.analysis?.indicators??{};
  const candles=featured?.candles??[];

  const dominant=useMemo(()=>{
    const regimes=realAssets.map(a=>a.analysis?.regime).filter(Boolean) as string[];
    if(!regimes.length) return "Calculando";
    const counts=new Map<string,number>();
    regimes.forEach(r=>counts.set(r,(counts.get(r)??0)+1));
    return [...counts.entries()].sort((a,b)=>b[1]-a[1])[0][0].replaceAll("_"," ");
  },[realAssets]);

  return <main className="novaShell">
    <aside className="novaSidebar">
      <a className="novaBrand" href="/">
        <div className="novaLogo"><CandlestickChart size={18}/></div>
        <div><b>Mercado<span>AI</span></b><small>Inteligência Financeira</small></div>
      </a>
      <nav className="novaNav">
        <a className="active" href="/"><LayoutDashboard/> Visão Geral</a>
        <a href="#mercados"><BarChart3/> Mercados</a>
        <a href="/forex"><Globe2/> Forex 24h</a>
        <a href="#grafico"><CandlestickChart/> Gráficos</a>
        <a href="#sinais"><Zap/> Sinais</a>\n        <a href="/autotrade"><Sparkles/> AI Trade Radar</a>
        <a href="#alertas"><Bell/> Alertas</a>
        <a href="#macro"><LineChart/> Macro & Notícias</a>
        <a href="/lab"><FlaskConical/> Backtests</a>
        <a href="#relatorios"><FileBarChart/> Relatórios</a>
        <a href="#usuarios"><Users/> Usuários</a>
        <a href="/integracoes"><Activity/> Integrações</a>
        <a href="#configuracoes"><Settings/> Configurações</a>
      </nav>
      <div className="sidebarTrust">
        <ShieldCheck size={20}/>
        <div><b>Dados reais identificados</b><p>brapi para ações com delay do plano gratuito; BCB oficial para PTAX e macro.</p></div>
      </div>
    </aside>

    <section className="novaMain">
      <header className="novaTopbar">
        <div className="globalSearch"><Search size={16}/><input placeholder="Buscar ativo, mercado ou indicador..."/></div>
        <div className="topRight">
          <span className="syncBadge"><i/> Consulta a cada 1 min</span>
          <button className="roundButton" onClick={load} title="Atualizar agora"><Bell size={17}/><em/></button>
          <div className="userChip"><span>RM</span><div><b>Trader</b><small>Conta principal</small></div><ChevronDown size={14}/></div>
        </div>
      </header>

      <div className="dashboardContent">
        <section className="welcomeRow">
          <div><h1>Central de Inteligência de Mercado</h1><p>Dados reais no backend, qualidade da fonte identificada e sinais calculados sobre candles recebidos.</p></div>
          <div className="welcomeActions">
            <a className="primaryAction" href="/lab"><FlaskConical size={16}/> Laboratório</a>
            <button className="softAction" onClick={load}><Activity size={16}/> Atualizar agora</button>
          </div>
        </section>

        {error && <div className="realDataError"><b>Falha temporária em uma fonte:</b> {error}</div>}
        {loading && <div className="realDataLoading">Consultando fontes reais...</div>}

        <section className="dataSourceStrip">
          <span><i className="sourceGreen"/> BCB: oficial</span>
          <span><i className="sourceBlue"/> brapi: dados reais com delay aproximado de 30 min no acesso gratuito</span>
          <span>Última consulta do backend: <b>{fmtTime(data?.generatedAt)}</b></span>
        </section>

        <section className="summaryGrid">
          <article className="summaryCard">
            <div className="summaryHead"><span>Ativos reais carregados</span><Activity size={16}/></div>
            <strong>{realAssets.length}</strong><small className="upText">ações B3 disponíveis sem token</small>
          </article>
          <article className="summaryCard">
            <div className="summaryHead"><span>Sinais calculados</span><Zap size={16}/></div>
            <strong>{signals.length}</strong><small><b className="upText">{buys} compra</b> · <b className="downText">{sells} venda</b></small>
          </article>
          <article className="summaryCard">
            <div className="summaryHead"><span>Confiança média</span><BrainCircuit size={16}/></div>
            <strong>{signals.length?`${avgConf.toFixed(1).replace(".",",")}%`:"—"}</strong><small>já penalizada pelo delay da fonte</small>
          </article>
          <article className="summaryCard">
            <div className="summaryHead"><span>Regime predominante</span><Gauge size={16}/></div>
            <strong className="regime">{dominant}</strong><small>calculado sobre OHLCV real</small>
          </article>
        </section>

        <div className="dashboardGrid">
          <div className="centerColumn">
            <section className="panel mainChartPanel" id="grafico">
              <div className="chartToolbar">
                <div>
                  <div className="assetTitle"><span className="assetIcon winIcon">{featured?.symbol?.[0]??"?"}</span><div><b>{featured?.symbol??"Mercado"} — {featured?.name??"aguardando fonte"}</b><small>{featured?.delayed?"DADO REAL · DELAY DO PLANO GRATUITO":"Fonte pública"}</small></div></div>
                  <div className="quoteLine"><strong>{fmtPrice(featured?.price,featured?.currency)}</strong><span className={(featured?.changePercent??0)>=0?"upText":"downText"}>{fmtPct(featured?.changePercent)}</span></div>
                </div>
                <div className="timeframes"><button>1m</button><button className="active">5m</button><button>15m</button><button>1h</button><button>1D</button></div>
              </div>
              <CandleChart candles={candles}/>
              <div className="chartFooter">
                <span>Fonte <b>brapi</b></span>
                <span>Preço <b>{fmtPrice(featured?.price,featured?.currency)}</b></span>
                <span>RSI <b>{featuredIndicators.rsi14!=null?Number(featuredIndicators.rsi14).toFixed(1):"—"}</b></span>
                <span>ADX <b>{featuredIndicators.adx14!=null?Number(featuredIndicators.adx14).toFixed(1):"—"}</b></span>
                <span>Último dado <b>{fmtTime(featured?.marketTime)}</b></span>
              </div>
            </section>

            <section className="panel marketTablePanel" id="mercados">
              <div className="panelHeading">
                <div><h2>Mercados com dados reais conectados</h2><p>Não há preços fictícios nesta tabela.</p></div>
                <div className="tableSearch"><Search size={14}/><span>Fonte / ativo</span></div>
              </div>
              <div className="marketFilters"><button className="active">Reais</button><button>Ações</button><button>BCB</button><button>Opcionais</button></div>
              <div className="novaTable">
                <div className="novaTr novaTh"><span>Ativo</span><span>Preço</span><span>Variação</span><span>Fonte</span><span>Sinal IA</span><span>Conf.</span><span>Atualizado</span></div>
                {realAssets.map((a,i)=>{
                  const s=a.analysis?.signal;
                  return <div className="novaTr" key={a.symbol}>
                    <span className="assetCell"><i className={`assetDot d${i%5+1}`}/><b>{a.symbol}</b><small>{a.name}</small></span>
                    <span><b>{fmtPrice(a.price,a.currency)}</b></span>
                    <span className={(a.changePercent??0)>=0?"upText":"downText"}>{fmtPct(a.changePercent)}</span>
                    <span><span className="sourcePill delayed">REAL · DELAY</span></span>
                    <span>{s?<em className={`signalBadge ${s.side.toLowerCase()}`}>{s.side}</em>:<em className="signalBadge aguardar">CALCULANDO</em>}</span>
                    <span><b>{s?`${s.confidence}%`:"—"}</b></span>
                    <span>{fmtTime(a.marketTime)}</span>
                  </div>
                })}
                {data?.ptax && <div className="novaTr">
                  <span className="assetCell"><i className="assetDot d2"/><b>USD/BRL</b><small>PTAX oficial</small></span>
                  <span><b>{fmtPrice(data.ptax.price)}</b></span>
                  <span className={(data.ptax.changePercent??0)>=0?"upText":"downText"}>{fmtPct(data.ptax.changePercent)}</span>
                  <span><span className="sourcePill official">BCB OFICIAL</span></span>
                  <span><em className="signalBadge aguardar">MACRO</em></span>
                  <span>—</span>
                  <span>{fmtTime(data.ptax.marketTime)}</span>
                </div>}
              </div>

              <div className="unavailableBox">
                <b>Classes preservadas no projeto sem preço inventado</b>
                {(data?.unavailable??[]).map(x=><p key={x.symbol}><strong>{x.symbol}</strong> — {x.reason}</p>)}
              </div>
            </section>
          </div>

          <aside className="rightColumn">
            <section className="panel signalCard" id="sinais">
              <div className="panelHeading compact"><div><h2>Sinal em destaque</h2><p>{featured?.symbol??"—"} • candles reais</p></div><Sparkles size={17}/></div>
              <div className="signalFocus">
                <em className={`focusBadge ${(featuredSignal?.side??"AGUARDAR").toLowerCase()}`}>{featuredSignal?.side??"AGUARDAR"}</em>
                <strong>{featuredSignal?`${featuredSignal.confidence}%`:"—"}</strong><small>confiança ajustada pela qualidade da fonte</small>
              </div>
              <div className="signalMetrics">
                <div><span>Score</span><b>{featuredSignal?.score??"—"}</b></div>
                <div><span>Risco</span><b>{featuredSignal?.risk??"—"}</b></div>
                <div><span>Regime</span><b>{featured?.analysis?.regime?.replaceAll("_"," ")??"—"}</b></div>
              </div>
              <div className="reasonList">{featuredSignal?.reasons?.slice(0,4).map(x=><p key={x}>✓ {x}</p>)??<p>Aguardando histórico suficiente.</p>}</div>
            </section>

            <section className="panel allocationCard">
              <div className="panelHeading compact"><div><h2>Fontes e classes</h2><p>Cobertura atual do modo público</p></div><CircleDollarSign size={17}/></div>
              <Donut/>
            </section>

            <section className="panel watchCard">
              <div className="panelHeading compact"><h2>Watchlist real</h2><a href="#mercados">Ver tabela</a></div>
              {realAssets.map((a,i)=><div className="watchRow" key={a.symbol}>
                <span className={`assetDot d${i%5+1}`}/><div><b>{a.symbol}</b><small>{a.name}</small></div><strong>{fmtPrice(a.price,a.currency)}</strong><em className={(a.changePercent??0)>=0?"upText":"downText"}>{fmtPct(a.changePercent)}</em>
              </div>)}
              {data?.ptax && <div className="watchRow"><span className="assetDot d2"/><div><b>USD/BRL</b><small>PTAX BCB</small></div><strong>{fmtPrice(data.ptax.price)}</strong><em className={(data.ptax.changePercent??0)>=0?"upText":"downText"}>{fmtPct(data.ptax.changePercent)}</em></div>}
            </section>

            <section className="panel alertsCard" id="alertas">
              <div className="panelHeading compact"><h2>Status das fontes</h2><a href="/api/market/overview">JSON</a></div>
              <div className="alertRow"><ShieldCheck size={15}/><div><b>BCB conectado</b><small>PTAX, Selic e IPCA oficiais</small></div><time>oficial</time></div>
              <div className="alertRow"><Clock3 size={15}/><div><b>brapi pública</b><small>Ações reais; acesso gratuito tem delay</small></div><time>~30m</time></div>
              <div className="alertRow"><Activity size={15}/><div><b>Frontend atualiza</b><small>Nova consulta ao backend automaticamente</small></div><time>60s</time></div>
            </section>
          </aside>
        </div>

        <section className="lowerGrid">
          <article className="panel infoPanel" id="macro">
            <div className="panelHeading compact"><div><h2>Contexto macroeconômico real</h2><p>Banco Central do Brasil / SGS.</p></div><BookOpen size={17}/></div>
            <div className="macroRealGrid">
              <div><span>Meta Selic</span><strong>{data?.macro?.selicTarget?`${data.macro.selicTarget.value.toFixed(2).replace(".",",")}%`:"—"}</strong><small>{data?.macro?.selicTarget?.date??"aguardando BCB"}</small></div>
              <div><span>IPCA mais recente</span><strong>{data?.macro?.ipcaLatest?`${data.macro.ipcaLatest.value.toFixed(2).replace(".",",")}%`:"—"}</strong><small>{data?.macro?.ipcaLatest?.date??"aguardando BCB"}</small></div>
              <div><span>PTAX venda</span><strong>{data?.ptax?fmtPrice(data.ptax.sell):"—"}</strong><small>{data?.ptax?.marketTime??"aguardando BCB"}</small></div>
            </div>
          </article>

          <article className="panel infoPanel" id="relatorios">
            <div className="panelHeading compact"><div><h2>Relatório inteligente</h2><p>Resumo baseado no último snapshot real recebido.</p></div><FileBarChart size={17}/></div>
            <div className="reportPreview">
              <b>Snapshot {fmtTime(data?.generatedAt)}</b>
              <p>{realAssets.length} ações reais carregadas. {signals.length} sinais calculados sobre OHLCV. Confiança média {signals.length?avgConf.toFixed(1):"—"}%. PTAX {data?.ptax?fmtPrice(data.ptax.price):"indisponível"}. WIN/WDO/XAU não recebem preço fictício enquanto seus feeds específicos não estiverem conectados.</p>
              <button>Configurar entrega no celular</button>
            </div>
          </article>
        </section>

        <footer className="novaFooter">Dados de ações: brapi, com atraso aproximado de 30 minutos no acesso gratuito. PTAX/Selic/IPCA: Banco Central do Brasil. Consulta do SaaS a cada 60 segundos não transforma uma fonte atrasada em tempo real.</footer>
      </div>
    </section>
  </main>
}
