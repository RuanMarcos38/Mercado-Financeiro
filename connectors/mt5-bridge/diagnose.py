import os
import sys
import json
import requests
import MetaTrader5 as mt5
from dotenv import load_dotenv
from datetime import datetime, timezone

load_dotenv()

SAAS_URL=os.getenv("SAAS_URL","").rstrip("/")
KEY=os.getenv("CONNECTOR_INGEST_KEY","")
SYMBOLS=[s.strip() for s in os.getenv("MT5_SYMBOLS","EURUSD").split(",") if s.strip()]
PATH=os.getenv("MT5_TERMINAL_PATH","")

def fail(msg):
    print("[ERRO]",msg)
    sys.exit(1)

print("=== MercadoAI / Diagnostico MT5 ===")
print("SaaS:",SAAS_URL or "NAO CONFIGURADO")
print("Chave:",("configurada (..."+KEY[-4:]+")") if KEY else "NAO CONFIGURADA")

if not SAAS_URL: fail("SAAS_URL ausente no .env")
if not KEY: fail("CONNECTOR_INGEST_KEY ausente no .env")

try:
    r=requests.get(SAAS_URL+"/api/version",timeout=15)
    print("MercadoAI /api/version:",r.status_code,r.text[:200])
except Exception as e:
    fail("Nao foi possivel acessar o MercadoAI: "+str(e))

ok=mt5.initialize(path=PATH) if PATH else mt5.initialize()
if not ok: fail("mt5.initialize falhou: "+str(mt5.last_error()))

try:
    terminal=mt5.terminal_info()
    account=mt5.account_info()
    print("Terminal MT5:",bool(terminal))
    print("Conta:",getattr(account,"login",None))
    print("Servidor:",getattr(account,"server",None))

    symbol=SYMBOLS[0]
    if not mt5.symbol_select(symbol,True): fail("Simbolo indisponivel: "+symbol)
    tick=mt5.symbol_info_tick(symbol)
    rates=mt5.copy_rates_from_pos(symbol,mt5.TIMEFRAME_M5,0,80)
    if tick is None: fail("Sem tick para "+symbol)
    if rates is None or len(rates)<60: fail("Historico insuficiente para "+symbol)

    candles=[{
      "symbol":symbol[:3]+"/"+symbol[3:6] if len(symbol)>=6 else symbol,
      "timeframe":"5m",
      "time":datetime.fromtimestamp(int(x["time"]),tz=timezone.utc).isoformat(),
      "open":float(x["open"]),"high":float(x["high"]),"low":float(x["low"]),"close":float(x["close"]),
      "volume":float(x["tick_volume"]),"source":"mt5"
    } for x in rates]

    payload={
      "source":"mt5",
      "symbol":symbol[:3]+"/"+symbol[3:6] if len(symbol)>=6 else symbol,
      "assetClass":"forex",
      "timeframe":"5m",
      "timestamp":datetime.now(timezone.utc).isoformat(),
      "bid":float(tick.bid),"ask":float(tick.ask),"spread":float(tick.ask-tick.bid),
      "candles":candles,
      "meta":{"terminal":"MetaTrader5","diagnostic":True,"assetClass":"forex"}
    }
    r=requests.post(
      SAAS_URL+"/api/connectors/market-push",
      headers={"content-type":"application/json","x-connector-key":KEY},
      data=json.dumps(payload),
      timeout=20
    )
    print("Envio teste:",r.status_code,r.text[:1000])
    if not r.ok: fail("MercadoAI recusou o push de teste.")

    print("")
    print("[OK] MT5 conectado e MercadoAI recebeu dados reais.")
finally:
    mt5.shutdown()
