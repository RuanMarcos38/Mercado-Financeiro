import os
import time
import json
import ctypes
import requests
from datetime import datetime, timezone
from collections import defaultdict, deque

SAAS_URL=os.getenv("SAAS_URL","http://localhost:3000").rstrip("/")
INGEST_KEY=os.getenv("CONNECTOR_INGEST_KEY","")
DLL_PATH=os.getenv("PROFIT_DLL_PATH","ProfitDLL.dll")
ACTIVATION_KEY=os.getenv("PROFIT_ACTIVATION_KEY","")
TICKERS=[x.strip() for x in os.getenv("PROFIT_TICKERS","WINFUT,WDOFUT,PETR4,VALE3").split(",") if x.strip()]
EXCHANGE=os.getenv("PROFIT_EXCHANGE","B")
PUSH_SECONDS=max(5,int(os.getenv("PROFIT_PUSH_SECONDS","15")))

# A ProfitDLL é uma API nativa baseada em callbacks. Os nomes/assinaturas exatos
# devem ser confirmados no manual fornecido com a sua versão da DLL licenciada.
dll=ctypes.WinDLL(DLL_PATH) if os.name=="nt" else ctypes.CDLL(DLL_PATH)
ticks=defaultdict(lambda: deque(maxlen=20000))

def headers():
    h={"content-type":"application/json"}
    if INGEST_KEY:h["x-connector-key"]=INGEST_KEY
    return h

def aggregate_1m(symbol):
    rows=list(ticks[symbol])
    buckets={}
    for t in rows:
        minute=t["time"][:16]+":00+00:00"
        b=buckets.setdefault(minute,{"symbol":symbol,"timeframe":"1m","time":minute,"open":t["price"],"high":t["price"],"low":t["price"],"close":t["price"],"volume":0.0,"source":"profit"})
        b["high"]=max(b["high"],t["price"])
        b["low"]=min(b["low"],t["price"])
        b["close"]=t["price"]
        b["volume"]+=t["qty"]
    return list(sorted(buckets.values(),key=lambda x:x["time"]))[-500:]

def push(symbol,bid=None,ask=None):
    candles=aggregate_1m(symbol)
    if len(candles)<2:return
    payload={
      "source":"profit","symbol":symbol,"assetClass":"b3","timeframe":"1m",
      "timestamp":datetime.now(timezone.utc).isoformat(),
      "bid":bid,"ask":ask,
      "spread":(ask-bid) if bid is not None and ask is not None else None,
      "candles":candles,
      "meta":{"terminal":"ProfitDLL","exchange":EXCHANGE}
    }
    r=requests.post(SAAS_URL+"/api/connectors/market-push",headers=headers(),data=json.dumps(payload),timeout=20)
    r.raise_for_status()
    print(symbol,r.json())

def install_callbacks_and_subscribe():
    """
    Conecte aqui as funções da ProfitDLL entregues na sua licença:
    1. Inicializar em Market Data com a função oficial da sua versão.
    2. Registrar TStateCallback e aguardar LOGIN_CONNECTED, MARKET_CONNECTED e CONNECTION_ACTIVATE_VALID.
    3. Registrar SetTradeCallbackV2 / callback de trades.
    4. SubscribeTicker para cada ticker/bolsa.
    No callback de trade, adicione:
      ticks[ticker].append({
        "time": datetime.now(timezone.utc).isoformat(),
        "price": float(preco),
        "qty": float(quantidade)
      })
    A Nelogica altera/expande assinaturas entre versões; por isso este bridge não inventa
    prototypes ctypes sem o manual da DLL instalada.
    """
    raise RuntimeError(
      "ProfitDLL encontrada, mas é obrigatório mapear as assinaturas da sua versão licenciada. "
      "Use o manual fornecido com ProfitDLL.zip e configure os callbacks oficiais."
    )

def main():
    if not ACTIVATION_KEY:
        print("PROFIT_ACTIVATION_KEY não configurada.")
    install_callbacks_and_subscribe()

if __name__=="__main__":
    main()
