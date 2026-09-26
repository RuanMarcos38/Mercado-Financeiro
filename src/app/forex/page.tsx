"use client";

import { useEffect,useState } from "react";
import { Activity,Bell,BookOpen,CandlestickChart,ChevronLeft,Globe2,LineChart,Search,ShieldCheck,Sparkles,TrendingUp,Zap } from "lucide-react";

type Pair={symbol:string;base:string;quote:string;group:string;label:string};
type PairResponse={counts:{total:number;majors:number;minors:number;exotics:number};pairs:Pair[];providers:Array<{id:string;configured:boolean;realtime:boolean;note:string}>};
type News={risk:number;items:Array<{title:string;url:string;domain?:string;seenDate?:string}>};

export default function ForexPage(){
  const [pairs,setPairs]=useState<PairResponse|null>(null);
  const [news,setNews]=useState<News|null>(null);
  const [selected,setSelected]=useState("EUR/USD");
  const [query,setQuery]=useState("");
  const [csv,setCsv]=useState("time,open,high,low,close,volume\n");
  const [provider,setProvider]=useState("auto");
  const [statusMessage,setStatusMessage]=useState("");
  const [analysis,setAnalysis]=useState<any>(null);
  const [backtest,setBacktest]=useState<any>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");

  useEffect(()=>{fetch("/api/forex/pairs").then(r=>r.json()).then(setPairs).catch(()=>{});},[]);
  useEffect(()=>{fetch("/api/forex/news?pair="+encodeURIComponent(selected)+"&hours=24").then(r=>r.json()).then(setNews).catch(()=>{});},[selected]);

  const filtered=(pairs?.pairs??[]).filter(p=>p.symbol.includes(query.toUpperCase())||p.group.includes(query.toLowerCase())).slice(0,120);

  async function run(path:string,setter:(v:any)=>void){
    setBusy(true);setError("");setStatusMessage("");
    try{
      const res=await fetch(path,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({
        pair:selected,timeframe:"5m",provider,csv
      })});
      const json=await res.json();
      if(!res.ok) throw new Error(json.error||"Falha");
      if(json.ready===false){setStatusMessage(json.message||"Aguardando dados de mercado.");setter(null);return;}
      setter(json);
    }catch(e){setError(e instanceof Error?e.message:"Erro inesperado");}
    finally{setBusy(false);}
  }

  return <main className="fxPage">
    <header className="fxTop">
      <div><a href="/" className="fxBack"><ChevronLeft size={14}/> Dashboard</a><h1>Forex Intelligence 24h</h1><p>Análise multi-fator para moedas, com notícias globais e conectores 24h opcionais.</p></div>
      <div className="fxStatus"><span><i/> Módulo ativo</span><b>{pairs?.counts.total??"—"} pares catalogados</b></div>
    </header>

    <section className="fxSummary">
      <div><Globe2/><span>Pares majors</span><strong>{pairs?.counts.majors??"—"}</strong></div>
      <div><LineChart/><span>Minors</span><strong>{pairs?.counts.minors??"—"}</strong></div>
      <div><TrendingUp/><span>Exóticos</span><strong>{pairs?.counts.exotics??"—"}</strong></div>
      <div><Bell/><span>Risco notícias</span><strong>{news?Math.round(news.risk*100)+"%":"—"}</strong></div>
    </section>

    <div className="fxGrid">
      <section className="fxPanel">
        <div className="fxPanelHead"><div><h2>Mercado Forex</h2><p>Selecione qualquer par catalogado para análise.</p></div><div className="fxSearch"><Search size={14}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="EUR/USD, JPY, exotic..."/></div></div>
        <div className="fxPairTabs">
          {filtered.map(p=><button key={p.symbol} className={selected===p.symbol?"active":""} onClick={()=>setSelected(p.symbol)}><b>{p.symbol}</b><small>{p.group}</small></button>)}
        </div>
      </section>

      <aside className="fxPanel">
        <div className="fxPanelHead"><div><h2>Conectores 24h</h2><p>Sem alterar o modo público atual.</p></div><Activity size={17}/></div>
        <div className="fxProviders">
          {(pairs?.providers??[]).map(p=><div key={p.id}><span className={p.configured?"on":"off"}/><div><b>{p.id.toUpperCase()}</b><small>{p.note}</small></div><em>{p.configured?"CONECTADO":"OPCIONAL"}</em></div>)}
        </div>
      </aside>
    </div>

    <div className="fxGrid fxMainGrid">
      <section className="fxPanel">
        <div className="fxPanelHead"><div><h2>Motor técnico — {selected}</h2><p>A fonte é escolhida automaticamente. CSV fica disponível apenas como importação manual.</p></div><CandlestickChart size={18}/></div>
        <div className="fxSourceRow">
  <label>Fonte
    <select value={provider} onChange={e=>setProvider(e.target.value)}>
      <option value="auto">Automática</option>
      <option value="mt5">MetaTrader 5</option>
      <option value="oanda">OANDA</option>
      <option value="twelvedata">Twelve Data</option>
      <option value="import">Importar CSV</option>
    </select>
  </label>
  <span>{provider==="auto"?"Prioridade: MT5 → OANDA → Twelve Data → CSV":"Fonte selecionada manualmente"}</span>
</div>
{provider==="import"&&<textarea className="fxCsv" value={csv} onChange={e=>setCsv(e.target.value)} rows={13}/>}
{provider!=="import"&&<div className="fxFeedState"><Activity size={16}/><div><b>Análise por feed real</b><span>Selecione o par e clique em Analisar. Quando MT5/Profit estiver conectado, os candles entram automaticamente.</span></div></div>}
        <div className="fxActions"><button disabled={busy} onClick={()=>run("/api/forex/analyze",setAnalysis)}><Sparkles size={15}/> Analisar</button><button disabled={busy} onClick={()=>run("/api/forex/backtest",setBacktest)}><Zap size={15}/> Backtest</button></div>
        {statusMessage&&<div className="fxInfoBox">{statusMessage}</div>}{error&&<div className="errorBox">{error}</div>}
      </section>

      <aside className="fxPanel">
        <div className="fxPanelHead"><div><h2>Notícias mundiais — 24h</h2><p>GDELT + futura camada de bancos centrais oficiais.</p></div><BookOpen size={17}/></div>
        <div className="fxNews">
          {(news?.items??[]).slice(0,8).map((n,i)=><a key={i} href={n.url} target="_blank" rel="noreferrer"><b>{n.title}</b><small>{n.domain??"fonte externa"} · {n.seenDate??""}</small></a>)}
          {!news?.items?.length&&<p>Nenhuma notícia carregada no momento.</p>}
        </div>
      </aside>
    </div>

    {analysis&&<section className="fxPanel fxResult">
      <div className="fxPanelHead"><div><h2>Resultado — {analysis.pair}</h2><p>{analysis.candles} candles analisados • risco notícias {Math.round((analysis.newsRisk??0)*100)}%</p></div><span className={"fxSignal "+String(analysis.signal?.side??"AGUARDAR").toLowerCase()}>{analysis.signal?.side}</span></div>
      <div className="fxMetrics">
        <div><span>Confiança</span><strong>{analysis.signal?.confidence}%</strong></div>
        <div><span>Score</span><strong>{analysis.signal?.score}</strong></div>
        <div><span>Risco</span><strong>{analysis.signal?.risk}</strong></div>
        <div><span>Regime</span><strong>{analysis.regime}</strong></div>
        <div><span>RSI</span><strong>{Number(analysis.snapshot?.rsi14).toFixed(1)}</strong></div>
        <div><span>ADX</span><strong>{Number(analysis.snapshot?.adx14).toFixed(1)}</strong></div>
      </div>
      <div className="fxReasons"><div><h3>Confluências</h3>{analysis.signal?.reasons?.map((x:string)=><p key={x}>✓ {x}</p>)}</div><div><h3>Setup / níveis</h3>{analysis.signal?.setup?.map((x:string)=><p key={x}>• {x}</p>)}</div><div><h3>Alertas</h3>{analysis.signal?.warnings?.map((x:string)=><p key={x}>! {x}</p>)}</div></div>
    </section>}

    {backtest&&<section className="fxPanel fxResult">
      <div className="fxPanelHead"><div><h2>Efetividade observada</h2><p>Backtest rolling com custo por operação.</p></div><ShieldCheck size={18}/></div>
      <div className="fxMetrics">
        <div><span>Sinais</span><strong>{backtest.signals}</strong></div>
        <div><span>Win rate</span><strong>{backtest.winRate}%</strong></div>
        <div><span>Profit Factor</span><strong>{backtest.profitFactor??"—"}</strong></div>
        <div><span>Payoff</span><strong>{backtest.payoff??"—"}</strong></div>
        <div><span>Expectancy</span><strong>{backtest.expectancyPct}%</strong></div>
        <div><span>Max Drawdown</span><strong>{backtest.maxDrawdownPct}%</strong></div>
      </div>
      <p className="fxNote">{backtest.note}</p>
    </section>}
  </main>
}
