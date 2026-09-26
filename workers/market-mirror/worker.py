import os
import time
import json
import requests
from datetime import datetime, timezone

SAAS_URL=os.getenv("SAAS_URL","https://mercadoia.rrestrategiaperformance.com.br").rstrip("/")
WORKER_KEY=os.getenv("MARKET_WORKER_KEY","")
PROVIDER=os.getenv("MARKET_PROVIDER","oanda").lower()
OANDA_TOKEN=os.getenv("OANDA_API_TOKEN","")
OANDA_ENV=os.getenv("OANDA_ENV","practice").lower()
TWELVE_KEY=os.getenv("TWELVE_DATA_API_KEY","")
PUSH_SECONDS=max(15,int(os.getenv("MARKET_PUSH_SECONDS","60")))
PAIRS=[x.strip().upper() for x in os.getenv(
    "MARKET_MIRROR_PAIRS",
    "EUR/USD,GBP/USD,USD/JPY,USD/CHF,AUD/USD,USD/CAD,NZD/USD,EUR/GBP,EUR/JPY,GBP/JPY,AUD/JPY,EUR/CHF,GBP/CHF,USD/BRL"
).split(",") if x.strip()]
TIMEFRAMES=[x.strip() for x in os.getenv("MARKET_MIRROR_TIMEFRAMES","1m,5m,15m,1h").split(",") if x.strip()]

OANDA_GRAN={"1m":"M1","5m":"M5","15m":"M15","1h":"H1","1d":"D"}
TWELVE_GRAN={"1m":"1min","5m":"5min","15m":"15min","1h":"1h","1d":"1day"}

def headers():
    return {"content-type":"application/json","x-market-worker-key":WORKER_KEY}

def oanda_candles(pair,tf,count=300):
    if not OANDA_TOKEN: raise RuntimeError("OANDA_API_TOKEN ausente")
    base="https://api-fxtrade.oanda.com" if OANDA_ENV=="live" else "https://api-fxpractice.oanda.com"
    instrument=pair.replace("/","_")
    url=f"{base}/v3/instruments/{instrument}/candles"
    r=requests.get(url,headers={"Authorization":f"Bearer {OANDA_TOKEN}"},params={"price":"M","granularity":OANDA_GRAN.get(tf,"M5"),"count":min(5000,max(60,count))},timeout=25)
    r.raise_for_status()
    rows=[]
    for x in r.json().get("candles",[]):
        if x.get("complete") is False or not x.get("mid"): continue
        rows.append({
          "symbol":pair,"timeframe":tf,"time":x["time"],
          "open":float(x["mid"]["o"]),"high":float(x["mid"]["h"]),"low":float(x["mid"]["l"]),"close":float(x["mid"]["c"]),
          "volume":float(x.get("volume",0)),"source":"oanda"
        })
    return rows

def twelve_candles(pair,tf,count=300):
    if not TWELVE_KEY: raise RuntimeError("TWELVE_DATA_API_KEY ausente")
    r=requests.get("https://api.twelvedata.com/time_series",params={
        "symbol":pair,"interval":TWELVE_GRAN.get(tf,tf),"outputsize":min(5000,max(60,count)),"apikey":TWELVE_KEY
    },timeout=25)
    r.raise_for_status()
    j=r.json()
    if j.get("status")=="error": raise RuntimeError(j.get("message","Twelve Data erro"))
    rows=[]
    for x in reversed(j.get("values",[])):
        dt=str(x["datetime"]).replace(" ","T")
        if not dt.endswith("Z"): dt+="Z"
        rows.append({
          "symbol":pair,"timeframe":tf,"time":dt,
          "open":float(x["open"]),"high":float(x["high"]),"low":float(x["low"]),"close":float(x["close"]),
          "volume":float(x.get("volume") or 0),"source":"twelvedata"
        })
    return rows

def fetch(pair,tf):
    return oanda_candles(pair,tf) if PROVIDER=="oanda" else twelve_candles(pair,tf)

def push(pair,tf,candles):
    if len(candles)<60:return
    payload={
      "source":"oanda" if PROVIDER=="oanda" else "twelvedata",
      "symbol":pair,"assetClass":"forex","timeframe":tf,
      "timestamp":datetime.now(timezone.utc).isoformat(),
      "candles":candles,
      "meta":{"marketMirror":True,"provider":PROVIDER}
    }
    r=requests.post(SAAS_URL+"/api/market-mirror/push",headers=headers(),data=json.dumps(payload),timeout=30)
    r.raise_for_status()
    j=r.json()
    d=j.get("decision") or {}
    c=(d.get("candidate") or {})
    print(pair,tf,"OK",j.get("candles"),c.get("status"),c.get("side"),c.get("confidence"))

def main():
    if not WORKER_KEY: raise RuntimeError("MARKET_WORKER_KEY ausente")
    print("MercadoAI Market Mirror 24h")
    print("Provider:",PROVIDER,"Pares:",len(PAIRS),"TFs:",TIMEFRAMES)
    while True:
        started=time.time()
        for pair in PAIRS:
            for tf in TIMEFRAMES:
                try:
                    push(pair,tf,fetch(pair,tf))
                except Exception as e:
                    print(pair,tf,"ERRO",e)
                time.sleep(float(os.getenv("MARKET_REQUEST_DELAY","0.25")))
        elapsed=time.time()-started
        time.sleep(max(1,PUSH_SECONDS-elapsed))

if __name__=="__main__":
    main()
