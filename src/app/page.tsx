"use client";

import { Activity, BellRing, CandlestickChart, Clock3, Globe2, ShieldAlert, TrendingDown, TrendingUp } from "lucide-react";
import { calculateSignal } from "@/lib/signals";

const assets = [
  { ticker:"WIN", name:"Mini Índice", price:"142.385", change:"+0,62%", bias:"Alta", rsi:61, macd:.8, ef:142300, es:141950, vwap:142120, adx:31, vr:1.42, macro:.35, news:.15 },
  { ticker:"WDO", name:"Mini Dólar", price:"5.486,5", change:"-0,31%", bias:"Baixa", rsi:42, macd:-.7, ef:5481, es:5494, vwap:5491, adx:28, vr:1.38, macro:-.22, news:.20 },
  { ticker:"XAU", name:"Ouro", price:"4.267,10", change:"+0,44%", bias:"Alta", rsi:58, macd:.55, ef:4262, es:4248, vwap:4254, adx:26, vr:1.22, macro:.28, news:.25 },
  { ticker:"PETR4", name:"Petrobras", price:"36,84", change:"+0,19%", bias:"Lateral", rsi:51, macd:.05, ef:36.80, es:36.76, vwap:36.83, adx:18, vr:.92, macro:.05, news:.10 },
  { ticker:"VALE3", name:"Vale", price:"62,14", change:"-0,12%", bias:"Lateral", rsi:48, macd:-.04, ef:62.06, es:62.10, vwap:62.18, adx:17, vr:.88, macro:-.03, news:.15 }
];

const signalFor=(a:typeof assets[number])=>calculateSignal({
  rsi:a.rsi, macdHistogram:a.macd, emaFast:a.ef, emaSlow:a.es, price:Number(String(a.price).replace(".","").replace(",",".")),
  vwap:a.vwap, adx:a.adx, volumeRatio:a.vr, macroBias:a.macro, newsRisk:a.news
});

export default function Home(){
  return <main className="shell">
    <aside className="sidebar">
      <div className="brand"><div className="brandmark">MF</div><div><b>Mercado Financeiro</b><span>Inteligência de Mercado</span></div></div>
      <nav>
        <button className="active">Visão Geral</button>
        <button>Mercados</button>
        <button>Gráficos</button>
        <button>Sinais</button>
        <button>Alertas</button>
        <button>Macro & Notícias</button>
        <button>Backtests</button>
        <button>Relatórios</button>
        <button>Usuários</button>
        <button>Configurações</button>
      </nav>
      <div className="sourceBox">
        <ShieldAlert size={18}/>
        <div><b>Dados auditáveis</b><small>Feeds oficiais/licenciados com status por fonte.</small></div>
      </div>
    </aside>

    <section className="content">
      <header className="topbar">
        <div><h1>Central de Mercado</h1><p>Atualização configurada para 1 minuto • relatório a cada 10 minutos</p></div>
        <div className="topActions"><a href="/lab" className="labShortcut">Laboratório</a><span className="live"><i/> Mercado ativo</span><button className="iconBtn"><BellRing size={19}/></button><div className="avatar">RM</div></div>
      </header>

      <div className="kpis">
        <div className="card kpi"><Globe2/><div><span>Ativos monitorados</span><strong>126</strong><small>B3 + globais</small></div></div>
        <div className="card kpi"><TrendingUp/><div><span>Sinais de compra</span><strong>18</strong><small>últimos 10 min</small></div></div>
        <div className="card kpi"><TrendingDown/><div><span>Sinais de venda</span><strong>11</strong><small>últimos 10 min</small></div></div>
        <div className="card kpi"><Activity/><div><span>Volatilidade</span><strong>Média</strong><small>regime atual</small></div></div>
      </div>

      <div className="grid2">
        <section className="card marketPanel">
          <div className="sectionHead"><div><h2>Radar Multiativo</h2><p>Score de confluência técnica + macro</p></div><span className="pill">1 MIN</span></div>
          <div className="assetTable">
            <div className="tr th"><span>Ativo</span><span>Preço</span><span>Variação</span><span>Tendência</span><span>Sinal</span><span>Conf.</span></div>
            {assets.map(a=>{
              const s=signalFor(a);
              return <div className="tr" key={a.ticker}>
                <span><b>{a.ticker}</b><small>{a.name}</small></span>
                <span>{a.price}</span>
                <span className={a.change.startsWith("+")?"positive":"negative"}>{a.change}</span>
                <span>{a.bias}</span>
                <span><em className={"signal "+s.side.toLowerCase()}>{s.side}</em></span>
                <span>{s.confidence}%</span>
              </div>
            })}
          </div>
        </section>

        <section className="card signalPanel">
          <div className="sectionHead"><div><h2>Oportunidade em Destaque</h2><p>WIN • 5 minutos</p></div><CandlestickChart/></div>
          {(()=>{const s=signalFor(assets[0]); return <>
            <div className="signalHero"><span className={"bigSignal "+s.side.toLowerCase()}>{s.side}</span><strong>{s.confidence}%</strong><small>confiança do modelo</small></div>
            <div className="levels"><div><span>Risco</span><b>{s.risk}</b></div><div><span>Score</span><b>{s.score}</b></div><div><span>Atualizado</span><b>agora</b></div></div>
            <div className="reasons"><h3>Por que o sinal existe</h3>{s.reasons.slice(0,5).map(r=><p key={r}>✓ {r}</p>)}</div>
          </>})()}
        </section>
      </div>

      <div className="grid2 bottom">
        <section className="card">
          <div className="sectionHead"><div><h2>Contexto de Mercado</h2><p>Eventos que podem alterar probabilidade e risco</p></div><Clock3/></div>
          <div className="event"><span className="impact high">ALTO</span><div><b>Decisões de juros / bancos centrais</b><small>Reduzir confiança de sinais no entorno do evento.</small></div></div>
          <div className="event"><span className="impact med">MÉDIO</span><div><b>Inflação, emprego, atividade e petróleo</b><small>Recalibrar dólar, índice, ações e metais.</small></div></div>
          <div className="event"><span className="impact low">BAIXO</span><div><b>Fluxo técnico intradiário</b><small>Confirmar com volume, VWAP e volatilidade.</small></div></div>
        </section>
        <section className="card">
          <div className="sectionHead"><div><h2>Relatório Inteligente</h2><p>Resumo para celular a cada 10 minutos</p></div><BellRing/></div>
          <div className="report"><b>15:30 — Resumo automático</b><p>Índice com viés comprador e volume acima da média. Dólar com pressão vendedora, porém próximo de zona de suporte. Ouro mantém força moderada. Evitar entradas durante eventos macro de alto impacto.</p><button>Configurar notificações</button></div>
        </section>
      </div>

      <footer>Dados exibidos nesta tela são demonstrativos até as credenciais de feeds licenciados serem configuradas. Sinais são apoio analítico, não garantia de resultado.</footer>
    </section>
  </main>
}
