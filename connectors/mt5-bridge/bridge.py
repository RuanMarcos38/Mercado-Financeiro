import os
import time
import json
import requests
import MetaTrader5 as mt5
from datetime import datetime, timezone

SAAS_URL=os.getenv("SAAS_URL","http://localhost:3000").rstrip("/")
INGEST_KEY=os.getenv("CONNECTOR_INGEST_KEY","")
SYMBOLS=[s.strip() for s in os.getenv("MT5_SYMBOLS","EURUSD,GBPUSD,USDJPY,USDCHF,AUDUSD,USDCAD,NZDUSD").split(",") if s.strip()]
INTERVAL_SECONDS=max(5,int(os.getenv("MT5_PUSH_SECONDS","30")))
BARS=max(100,min(2000,int(os.getenv("MT5_BARS","400"))))
TIMEFRAME_NAME=os.getenv("MT5_TIMEFRAME","M5").upper()

TF={
    "M1":(mt5.TIMEFRAME_M1,"1m"),
    "M5":(mt5.TIMEFRAME_M5,"5m"),
    "M15":(mt5.TIMEFRAME_M15,"15m"),
    "H1":(mt5.TIMEFRAME_H1,"1h"),
    "D1":(mt5.TIMEFRAME_D1,"1d"),
}

def init():
    path=os.getenv("MT5_TERMINAL_PATH")
    kwargs={}
    if path: kwargs["path"]=path
    ok=mt5.initialize(**kwargs) if kwargs else mt5.initialize()
    if not ok:
        raise RuntimeError(f"mt5.initialize falhou: {mt5.last_error()}")
    info=mt5.terminal_info()
    print("MT5 conectado:",info)

def normalize_symbol(s):
    if "/" in s: return s
    if len(s)>=6:
        return s[:3]+"/"+s[3:6]
    return s

def candles(symbol,tf,tf_out):
    rates=mt5.copy_rates_from_pos(symbol,tf,0,BARS)
    if rates is None:
        raise RuntimeError(f"{symbol}: copy_rates falhou: {mt5.last_error()}")
    out=[]
    for r in rates:
        out.append({
            "symbol":normalize_symbol(symbol),
            "timeframe":tf_out,
            "time":datetime.fromtimestamp(int(r["time"]),tz=timezone.utc).isoformat(),
            "open":float(r["open"]),
            "high":float(r["high"]),
            "low":float(r["low"]),
            "close":float(r["close"]),
            "volume":float(r["tick_volume"]),
            "source":"mt5"
        })
    return out

def fetch_signal(symbol,tf_out):
    normalized=normalize_symbol(symbol)
    try:
        r=requests.get(SAAS_URL+"/api/connectors/analyze",params={"source":"mt5","symbol":normalized,"timeframe":tf_out},timeout=20)
        if r.ok:
            j=r.json()
            s=(j.get("analysis") or {}).get("signal") or {}
            print("SINAL",normalized,s.get("side"),"confiança",s.get("confidence"),"score",s.get("score"))
        else:
            print("sinal indisponível",normalized,r.status_code,r.text[:200])
    except Exception as e:
        print("erro ao consultar sinal",normalized,e)

def push(symbol):
    tf,tf_out=TF.get(TIMEFRAME_NAME,TF["M5"])
    tick=mt5.symbol_info_tick(symbol)
    if tick is None:
        raise RuntimeError(f"{symbol}: sem tick")
    payload={
        "source":"mt5",
        "symbol":normalize_symbol(symbol),
        "assetClass":"forex",
        "timeframe":tf_out,
        "timestamp":datetime.now(timezone.utc).isoformat(),
        "bid":float(tick.bid),
        "ask":float(tick.ask),
        "spread":float(tick.ask-tick.bid),
        "candles":candles(symbol,tf,tf_out),
        "meta":{"terminal":"MetaTrader5","originalSymbol":symbol}
    }
    headers={"content-type":"application/json"}
    if INGEST_KEY: headers["x-connector-key"]=INGEST_KEY
    r=requests.post(SAAS_URL+"/api/connectors/market-push",headers=headers,data=json.dumps(payload),timeout=20)
    r.raise_for_status()
    print(symbol,r.json())
    if os.getenv("MT5_FETCH_SIGNAL","1")=="1":
        fetch_signal(symbol,tf_out)

def main():
    init()
    try:
        while True:
            for symbol in SYMBOLS:
                try:
                    if not mt5.symbol_select(symbol,True):
                        print(symbol,"indisponível no terminal")
                        continue
                    push(symbol)
                except Exception as e:
                    print(symbol,"erro:",e)
            time.sleep(INTERVAL_SECONDS)
    finally:
        mt5.shutdown()

if __name__=="__main__":
    main()
