"use client";

import { useState } from "react";

type Result = Record<string, any>;

export default function LabPage(){
  const [symbol,setSymbol]=useState("WIN");
  const [timeframe,setTimeframe]=useState("5m");
  const [csv,setCsv]=useState("time,open,high,low,close,volume\n");
  const [analysis,setAnalysis]=useState<Result|null>(null);
  const [backtest,setBacktest]=useState<Result|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");

  async function run(path:string,setter:(v:Result)=>void){
    setBusy(true); setError("");
    try{
      const res=await fetch(path,{
        method:"POST",
        headers:{"content-type":"application/json"},
        body:JSON.stringify({symbol,timeframe,csv,sourceQuality:"imported"})
      });
      const data=await res.json();
      if(!res.ok) throw new Error(data.error||"Falha na análise");
      setter(data);
    }catch(e){setError(e instanceof Error?e.message:"Erro inesperado");}
    finally{setBusy(false);}
  }

  return <main className="lab">
    <div className="labHead">
      <div>
        <a href="/" className="back">← Central de Mercado</a>
        <h1>Laboratório Quantitativo</h1>
        <p>Analise OHLCV sem credenciais comerciais. Exporte candles da sua plataforma e cole o CSV abaixo.</p>
      </div>
      <span className="sourceBadge">MODO PÚBLICO</span>
    </div>

    <section className="card labCard">
      <div className="labFormRow">
        <label>Ativo<input value={symbol} onChange={e=>setSymbol(e.target.value.toUpperCase())}/></label>
        <label>Timeframe<select value={timeframe} onChange={e=>setTimeframe(e.target.value)}>
          <option>1m</option><option>5m</option><option>15m</option><option>1h</option><option>1d</option>
        </select></label>
      </div>
      <label>CSV OHLCV<textarea value={csv} onChange={e=>setCsv(e.target.value)} rows={14}/></label>
      <small className="hint">Colunas mínimas: time, open, high, low, close. Volume é recomendado para VWAP/volume relativo.</small>
      <div className="labActions">
        <button disabled={busy} onClick={()=>run("/api/analyze",setAnalysis)}>Gerar análise</button>
        <button disabled={busy} className="secondary" onClick={()=>run("/api/backtest",setBacktest)}>Executar backtest</button>
      </div>
      {error && <div className="errorBox">{error}</div>}
    </section>

    {analysis && <section className="card labCard">
      <h2>Resultado do motor</h2>
      <div className="resultGrid">
        <div><span>Sinal</span><strong>{analysis.signal?.side}</strong></div>
        <div><span>Confiança</span><strong>{analysis.signal?.confidence}%</strong></div>
        <div><span>Regime</span><strong>{analysis.regime}</strong></div>
        <div><span>Risco</span><strong>{analysis.signal?.risk}</strong></div>
        <div><span>RSI 14</span><strong>{Number(analysis.indicators?.rsi14).toFixed(1)}</strong></div>
        <div><span>ADX</span><strong>{Number(analysis.indicators?.adx14).toFixed(1)}</strong></div>
      </div>
      <h3>Confluências</h3>
      <ul>{analysis.signal?.reasons?.map((r:string)=><li key={r}>{r}</li>)}</ul>
      <p className="disclaimer">{analysis.disclaimer}</p>
    </section>}

    {backtest && <section className="card labCard">
      <h2>Backtest</h2>
      <div className="resultGrid">
        <div><span>Sinais</span><strong>{backtest.signals}</strong></div>
        <div><span>Acerto observado</span><strong>{backtest.winRate}%</strong></div>
        <div><span>Profit factor</span><strong>{backtest.profitFactor ?? "—"}</strong></div>
        <div><span>Retorno médio</span><strong>{backtest.averageReturnPct}%</strong></div>
      </div>
      <p className="disclaimer">{backtest.methodology}</p>
    </section>}
  </main>;
}
