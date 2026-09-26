import fs from "node:fs";

const read=p=>fs.readFileSync(p,"utf8");
const exists=p=>fs.existsSync(p);
const checks=[];
const check=(name,ok,detail="")=>checks.push({name,ok:Boolean(ok),detail});

const forex=read("src/app/forex/page.tsx");
const chart=read("src/components/LiveCandleChart.tsx");
const auto=read("src/app/autotrade/page.tsx");
const integrations=read("src/app/integracoes/page.tsx");
const settings=read("src/app/configuracoes/page.tsx");
const users=read("src/app/usuarios/page.tsx");
const alerts=read("src/app/alertas/page.tsx");
const catalog=read("src/lib/forex/catalog.ts");

// Forex catalog contract
const symbols=[...catalog.matchAll(/"([A-Z]{3}\/[A-Z]{3})"/g)].map(m=>m[1]);
const unique=[...new Set(symbols)];
check("Forex: catálogo fallback >= 80 pares",unique.length>=80,String(unique.length));
check("Forex: símbolos sem duplicação relevante",symbols.length===unique.length,String(symbols.length-unique.length)+" duplicados");
const mt5Bridge=read("connectors/mt5-bridge/bridge.py");
check("Forex: sincronização MT5 disponível",mt5Bridge.includes("discover_forex_catalog"));
check("Forex: varredura total automática",mt5Bridge.includes("MT5_STREAM_ALL_FOREX")&&mt5Bridge.includes("build_full_scan_queue"));
check("Forex: ingestão em lote",mt5Bridge.includes("/api/connectors/market-batch"));
check("Forex: teste exaustivo local",exists("connectors/mt5-bridge/test-all-forex.py"));
check("Forex: watchlist dinâmica disponível",exists("src/app/api/connectors/watchlist/route.ts"));
check("Forex: frontend sem corte artificial de 120 pares",!forex.includes(".slice(0,120)"));

// Forex controls
for(const tf of ["1m","5m","10m","1h"])check("Forex timeframe "+tf,forex.includes('"'+tf+'"'));
check("Forex seleção de ativo",forex.includes("setSelected(p.symbol)"));
check("Forex busca de par",forex.includes("setQuery"));
check("Forex alertas",forex.includes("enableAlerts"));
check("Forex backtest",forex.includes("runBacktest"));
check("Forex watchlist POST",forex.includes("/api/connectors/watchlist"));
check("Forex atualização 15s",forex.includes("MARKET_UI_REFRESH_MS"));
check("Forex validade 20s",forex.includes("MARKET_ANALYSIS_MAX_AGE_SECONDS"));

// Chart controls
const chartControls=[
 ["Zoom +","zoom(.72)"],
 ["Zoom -","zoom(1.38)"],
 ["Ajustar","onClick={fit}"],
 ["Agora","onClick={goRealtime}"],
 ["Autoescala","toggleAutoScale"],
 ["Níveis","setLevelsVisible"],
 ["Grade","toggleGrid"]
];
for(const [name,needle] of chartControls)check("Gráfico: "+name,chart.includes(needle));

// Radar
check("Radar: atualizar",auto.includes("load"));
check("Radar: modo desligado",auto.includes('save({mode:"off"})'));
check("Radar: simulação",auto.includes('save({mode:"paper"})'));
check("Radar: operação real",auto.includes('save({mode:"live"})'));
check("Radar: tabela de oportunidades",auto.includes("Radar de oportunidades"));
for(const card of ["Oportunidades aptas","Modo atual","Confiança mínima","Alertas"]){
  check("Radar card: "+card,auto.includes(card));
}

// Integrations
check("Integrações: atualizar",integrations.includes("onClick={load}"));
check("Integrações: chaves",integrations.includes('href="/integracoes/chaves"'));
check("Integrações: MT5",integrations.includes("MetaTrader 5"));
check("Integrações: Profit",integrations.includes("Profit"));
for(const card of ["MetaTrader 5","Profit","Conexão Segura"]){
  check("Integrações card: "+card,integrations.includes(card));
}

// Settings navigation
for(const [name,path] of [
 ["Usuários","/usuarios"],
 ["Integrações","/integracoes"],
 ["Radar","/autotrade"],
 ["Alertas","/alertas"]
])check("Configurações: "+name,settings.includes('href="'+path+'"'));

// Users
check("Usuários: atualizar",users.includes("onClick={load}"));
check("Usuários: criar",users.includes("onSubmit={create}"));
check("Usuários: ativar/desativar",users.includes("active:!u.active"));
check("Usuários: alterar perfil",users.includes("role:e.target.value"));

// Alerts
check("Alertas: salvar",alerts.includes("onSubmit={save}"));
check("Alertas: WhatsApp",alerts.includes("whatsapp_enabled"));
check("Alertas: navegador",alerts.includes("browser_enabled"));
check("Alertas card: WhatsApp",alerts.includes("<h2>WhatsApp</h2>"));
check("Alertas card: Critério",alerts.includes("<h2>Critério</h2>"));

// API/route existence used by UI
for(const p of [
 "src/app/api/forex/pairs/route.ts",
 "src/app/api/forex/news/route.ts",
 "src/app/api/forex/backtest/route.ts",
 "src/app/api/connectors/analyze/route.ts",
 "src/app/api/connectors/status/route.ts",
 "src/app/api/connectors/watchlist/route.ts",
 "src/app/api/connectors/market-batch/route.ts",
 "src/app/api/system/forex-coverage/route.ts",
 "src/app/api/notifications/preferences/route.ts",
 "src/app/api/autotrade/radar/route.ts",
 "src/app/api/autotrade/config/route.ts",
 "src/app/api/users/route.ts"
])check("Rota: "+p,exists(p));

const failed=checks.filter(x=>!x.ok);
for(const c of checks)console.log((c.ok?"✓":"✗"),c.name,c.detail||"");
if(failed.length){
  console.error("\nFalhas:",failed.length);
  process.exit(1);
}
console.log("\nSmoke UI/backend aprovado:",checks.length,"verificações.");
