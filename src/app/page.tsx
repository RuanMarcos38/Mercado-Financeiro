"use client";

import {
  Activity, BarChart3, Bell, BookOpen, BrainCircuit, CandlestickChart, ChevronDown,
  CircleDollarSign, Clock3, FileBarChart, FlaskConical, Gauge, LayoutDashboard,
  LineChart, Search, Settings, ShieldCheck, Sparkles, TrendingDown, TrendingUp,
  Users, WalletCards, Zap
} from "lucide-react";
import { calculateSignal } from "@/lib/signals";

const assets = [
  { ticker:"WIN", name:"Mini Índice", price:"142.385", change:"+0,62%", bias:"Alta", rsi:61, macd:.8, ef:142300, es:141950, vwap:142120, adx:31, vr:1.42, macro:.35, news:.15 },
  { ticker:"WDO", name:"Mini Dólar", price:"5.486,5", change:"-0,31%", bias:"Baixa", rsi:42, macd:-.7, ef:5481, es:5494, vwap:5491, adx:28, vr:1.38, macro:-.22, news:.20 },
  { ticker:"XAU", name:"Ouro", price:"4.267,10", change:"+0,44%", bias:"Alta", rsi:58, macd:.55, ef:4262, es:4248, vwap:4254, adx:26, vr:1.22, macro:.28, news:.25 },
  { ticker:"PETR4", name:"Petrobras", price:"36,84", change:"+0,19%", bias:"Lateral", rsi:51, macd:.05, ef:36.80, es:36.76, vwap:36.83, adx:18, vr:.92, macro:.05, news:.10 },
  { ticker:"VALE3", name:"Vale", price:"62,14", change:"-0,12%", bias:"Lateral", rsi:48, macd:-.04, ef:62.06, es:62.10, vwap:62.18, adx:17, vr:.88, macro:-.03, news:.15 },
  { ticker:"BOVA11", name:"Ibovespa ETF", price:"139,72", change:"+0,37%", bias:"Alta", rsi:57, macd:.31, ef:139.6, es:139.1, vwap:139.4, adx:24, vr:1.16, macro:.18, news:.12 },
  { ticker:"ITUB4", name:"Itaú Unibanco", price:"41,09", change:"+0,28%", bias:"Alta", rsi:55, macd:.22, ef:41.02, es:40.82, vwap:40.95, adx:23, vr:1.08, macro:.14, news:.10 },
  { ticker:"DI1", name:"Juros Futuros", price:"13,955", change:"-0,05%", bias:"Lateral", rsi:49, macd:-.02, ef:13.95, es:13.97, vwap:13.96, adx:16, vr:.91, macro:-.02, news:.18 }
];

const signalFor=(a:typeof assets[number])=>calculateSignal({
  rsi:a.rsi,
  macdHistogram:a.macd,
  emaFast:a.ef,
  emaSlow:a.es,
  price:Number(String(a.price).replace(/\./g,"").replace(",",".")),
  vwap:a.vwap,
  adx:a.adx,
  volumeRatio:a.vr,
  macroBias:a.macro,
  newsRisk:a.news
});

const candles = Array.from({length:64},(_,i)=>{
  const base=48+i*.47+Math.sin(i*.55)*2.2+Math.sin(i*.17)*1.6;
  const open=base+Math.sin(i*1.3)*.85;
  const close=base+Math.cos(i*.91)*.9;
  const high=Math.max(open,close)+.8+(i%3)*.18;
  const low=Math.min(open,close)-.7-(i%4)*.12;
  return {open,close,high,low,volume:8+(i*7)%24};
});

function CandleChart(){
  const w=760,h=300,pad=18;
  const min=Math.min(...candles.map(c=>c.low));
  const max=Math.max(...candles.map(c=>c.high));
  const y=(v:number)=>pad+(max-v)/(max-min)*(h-pad*2-34);
  const step=(w-pad*2)/candles.length;
  return <svg className="heroChart" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Gráfico demonstrativo de candles do WIN">
    {[0,1,2,3,4].map(n=><line key={n} x1={pad} y1={30+n*48} x2={w-pad} y2={30+n*48} className="gridLine"/>)}
    {candles.map((c,i)=>{
      const x=pad+i*step+step/2;
      const up=c.close>=c.open;
      const bodyY=Math.min(y(c.open),y(c.close));
      const bodyH=Math.max(2,Math.abs(y(c.open)-y(c.close)));
      return <g key={i}>
        <line x1={x} y1={y(c.high)} x2={x} y2={y(c.low)} className={up?"candleUp":"candleDown"}/>
        <rect x={x-step*.28} y={bodyY} width={step*.56} height={bodyH} rx="1" className={up?"candleFillUp":"candleFillDown"}/>
        <rect x={x-step*.28} y={h-4-c.volume} width={step*.56} height={c.volume} className={up?"volumeUp":"volumeDown"}/>
      </g>
    })}
    <text x={pad} y={h-10} className="axisText">09:00</text>
    <text x={w*.33} y={h-10} className="axisText">11:00</text>
    <text x={w*.63} y={h-10} className="axisText">14:00</text>
    <text x={w-pad-38} y={h-10} className="axisText">17:00</text>
  </svg>
}

function Donut(){
  return <div className="donutWrap">
    <div className="donut"><div><strong>8</strong><span>classes</span></div></div>
    <div className="legend">
      <span><i className="l1"/>Índice <b>32%</b></span>
      <span><i className="l2"/>Câmbio <b>22%</b></span>
      <span><i className="l3"/>Ações <b>20%</b></span>
      <span><i className="l4"/>Ouro <b>14%</b></span>
      <span><i className="l5"/>Juros <b>12%</b></span>
    </div>
  </div>
}

export default function Home(){
  const focus=signalFor(assets[0]);
  return <main className="novaShell">
    <aside className="novaSidebar">
      <a className="novaBrand" href="/">
        <div className="novaLogo"><CandlestickChart size={18}/></div>
        <div><b>Mercado<span>AI</span></b><small>Inteligência Financeira</small></div>
      </a>

      <nav className="novaNav">
        <a className="active" href="/"><LayoutDashboard/> Visão Geral</a>
        <a href="#mercados"><BarChart3/> Mercados</a>
        <a href="#grafico"><CandlestickChart/> Gráficos</a>
        <a href="#sinais"><Zap/> Sinais</a>
        <a href="#alertas"><Bell/> Alertas</a>
        <a href="#macro"><GlobeIcon/> Macro & Notícias</a>
        <a href="/lab"><FlaskConical/> Backtests</a>
        <a href="#relatorios"><FileBarChart/> Relatórios</a>
        <a href="#usuarios"><Users/> Usuários</a>
        <a href="#configuracoes"><Settings/> Configurações</a>
      </nav>

      <div className="sidebarTrust">
        <ShieldCheck size={20}/>
        <div><b>Fontes auditáveis</b><p>BCB e CVM públicos. B3/CME opcionais quando licenciados.</p></div>
      </div>
    </aside>

    <section className="novaMain">
      <header className="novaTopbar">
        <div className="globalSearch"><Search size={16}/><input placeholder="Buscar ativo, mercado ou indicador..."/></div>
        <div className="topRight">
          <span className="syncBadge"><i/> Atualização 1 min</span>
          <button className="roundButton"><Bell size={17}/><em/></button>
          <div className="userChip"><span>RM</span><div><b>Trader</b><small>Conta principal</small></div><ChevronDown size={14}/></div>
        </div>
      </header>

      <div className="dashboardContent">
        <section className="welcomeRow">
          <div><h1>Central de Inteligência de Mercado</h1><p>Análise técnica, macro, histórico, sinais probabilísticos e alertas em uma única visão.</p></div>
          <div className="welcomeActions">
            <a className="primaryAction" href="/lab"><FlaskConical size={16}/> Laboratório</a>
            <button className="softAction"><Bell size={16}/> Configurar alertas</button>
          </div>
        </section>

        <section className="summaryGrid">
          <article className="summaryCard">
            <div className="summaryHead"><span>Ativos monitorados</span><Activity size={16}/></div>
            <strong>126</strong><small className="upText">+ 8 classes de ativos</small>
            <div className="miniSpark"><i/><i/><i/><i/><i/><i/><i/></div>
          </article>
          <article className="summaryCard">
            <div className="summaryHead"><span>Sinais últimos 10 min</span><Zap size={16}/></div>
            <strong>29</strong><small><b className="upText">18 compra</b> · <b className="downText">11 venda</b></small>
          </article>
          <article className="summaryCard">
            <div className="summaryHead"><span>Confiança média</span><BrainCircuit size={16}/></div>
            <strong>74,8%</strong><small>motor de confluência</small>
          </article>
          <article className="summaryCard">
            <div className="summaryHead"><span>Regime predominante</span><Gauge size={16}/></div>
            <strong className="regime">Tendência</strong><small className="upText">volatilidade moderada</small>
          </article>
        </section>

        <div className="dashboardGrid">
          <div className="centerColumn">
            <section className="panel mainChartPanel" id="grafico">
              <div className="chartToolbar">
                <div>
                  <div className="assetTitle"><span className="assetIcon winIcon">W</span><div><b>WIN — Mini Índice</b><small>Contrato futuro • B3</small></div></div>
                  <div className="quoteLine"><strong>142.385</strong><span className="upText">+0,62% (+876 pts)</span></div>
                </div>
                <div className="timeframes"><button>1m</button><button className="active">5m</button><button>15m</button><button>1h</button><button>1D</button></div>
              </div>
              <CandleChart/>
              <div className="chartFooter">
                <span>EMA 9 <b>142.300</b></span><span>EMA 21 <b>141.950</b></span><span>VWAP <b>142.120</b></span><span>RSI <b>61</b></span><span>ADX <b>31</b></span>
              </div>
            </section>

            <section className="panel marketTablePanel" id="mercados">
              <div className="panelHeading">
                <div><h2>Mercados monitorados</h2><p>Dados demonstrativos até a conexão de um feed intradiário autorizado.</p></div>
                <div className="tableSearch"><Search size={14}/><span>Buscar ativo</span></div>
              </div>
              <div className="marketFilters"><button className="active">Todos</button><button>Índice</button><button>Câmbio</button><button>Ações</button><button>Metais</button><button>Juros</button></div>
              <div className="novaTable">
                <div className="novaTr novaTh"><span>Ativo</span><span>Preço</span><span>24h</span><span>Regime</span><span>Sinal IA</span><span>Confiança</span><span></span></div>
                {assets.map((a,i)=>{
                  const s=signalFor(a);
                  return <div className="novaTr" key={a.ticker}>
                    <span className="assetCell"><i className={`assetDot d${i%5+1}`}/><b>{a.ticker}</b><small>{a.name}</small></span>
                    <span><b>{a.price}</b></span>
                    <span className={a.change.startsWith("+")?"upText":"downText"}>{a.change}</span>
                    <span>{a.bias}</span>
                    <span><em className={`signalBadge ${s.side.toLowerCase()}`}>{s.side}</em></span>
                    <span><b>{s.confidence}%</b></span>
                    <span><button className="detailBtn">Analisar</button></span>
                  </div>
                })}
              </div>
            </section>
          </div>

          <aside className="rightColumn">
            <section className="panel signalCard" id="sinais">
              <div className="panelHeading compact"><div><h2>Sinal em destaque</h2><p>WIN • 5 minutos</p></div><Sparkles size={17}/></div>
              <div className="signalFocus">
                <em className={`focusBadge ${focus.side.toLowerCase()}`}>{focus.side}</em>
                <strong>{focus.confidence}%</strong><small>confiança calculada</small>
              </div>
              <div className="signalMetrics">
                <div><span>Score</span><b>{focus.score}</b></div>
                <div><span>Risco</span><b>{focus.risk}</b></div>
                <div><span>Regime</span><b>Alta</b></div>
              </div>
              <div className="reasonList">{focus.reasons.slice(0,4).map(x=><p key={x}>✓ {x}</p>)}</div>
            </section>

            <section className="panel allocationCard">
              <div className="panelHeading compact"><div><h2>Mapa do mercado</h2><p>Distribuição monitorada</p></div><CircleDollarSign size={17}/></div>
              <Donut/>
            </section>

            <section className="panel watchCard">
              <div className="panelHeading compact"><h2>Watchlist</h2><a href="#mercados">Ver todos</a></div>
              {assets.slice(0,5).map((a,i)=><div className="watchRow" key={a.ticker}>
                <span className={`assetDot d${i%5+1}`}/><div><b>{a.ticker}</b><small>{a.name}</small></div><strong>{a.price}</strong><em className={a.change.startsWith("+")?"upText":"downText"}>{a.change}</em>
              </div>)}
            </section>

            <section className="panel alertsCard" id="alertas">
              <div className="panelHeading compact"><h2>Alertas recentes</h2><a href="#">Ver todos</a></div>
              <div className="alertRow"><TrendingUp size={15}/><div><b>WIN ganhou confluência</b><small>Confiança acima de 75%</small></div><time>agora</time></div>
              <div className="alertRow"><TrendingDown size={15}/><div><b>WDO perdeu VWAP</b><small>Pressão vendedora detectada</small></div><time>4 min</time></div>
              <div className="alertRow"><Clock3 size={15}/><div><b>Relatório inteligente</b><small>Próximo resumo automático</small></div><time>6 min</time></div>
            </section>
          </aside>
        </div>

        <section className="lowerGrid">
          <article className="panel infoPanel" id="macro">
            <div className="panelHeading compact"><div><h2>Contexto macroeconômico</h2><p>BCB, CVM e eventos que alteram risco e probabilidade.</p></div><BookOpen size={17}/></div>
            <div className="macroRows">
              <div><span className="impactDot high"/> <b>Alto impacto</b><p>Decisões de juros, inflação e emprego reduzem automaticamente a confiança no entorno do evento.</p></div>
              <div><span className="impactDot medium"/> <b>Médio impacto</b><p>Dólar, petróleo e atividade entram no score macro dos ativos relacionados.</p></div>
            </div>
          </article>
          <article className="panel infoPanel" id="relatorios">
            <div className="panelHeading compact"><div><h2>Relatório a cada 10 minutos</h2><p>Resumo pronto para Push/WhatsApp quando o canal estiver conectado.</p></div><FileBarChart size={17}/></div>
            <div className="reportPreview"><b>Resumo 15:40</b><p>WIN com viés comprador e força acima da VWAP. WDO sob pressão vendedora. Ouro mantém tendência moderada. Atenção a eventos macro de alto impacto.</p><button>Configurar entrega</button></div>
          </article>
        </section>

        <footer className="novaFooter">O sistema apresenta probabilidades e contexto analítico, não garantia de resultado. Fontes públicas e importadas são identificadas pelo nível de qualidade; B3/CME permanecem conectores opcionais.</footer>
      </div>
    </section>
  </main>
}

function GlobeIcon(){ return <LineChart/>; }
