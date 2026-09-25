import os
import time
import json
import queue
import ctypes as C
import threading
import requests
from datetime import datetime, timezone
from collections import defaultdict, deque

SAAS_URL=os.getenv("SAAS_URL","http://localhost:3000").rstrip("/")
INGEST_KEY=os.getenv("CONNECTOR_INGEST_KEY","")
DLL_PATH=os.getenv("PROFIT_DLL_PATH",r"ProfitDLL.dll")
ACTIVATION_KEY=os.getenv("PROFIT_ACTIVATION_KEY","")
NELOGICA_USER=os.getenv("PROFIT_USER","")
NELOGICA_PASSWORD=os.getenv("PROFIT_PASSWORD","")
PUSH_SECONDS=max(5,int(os.getenv("PROFIT_PUSH_SECONDS","15")))
TICKERS_RAW=[x.strip() for x in os.getenv("PROFIT_TICKERS","PETR4:B,VALE3:B").split(",") if x.strip()]

NL_OK=0
LOGIN=0
MARKET=2
ACTIVATION=3
LOGIN_CONNECTED=0
MARKET_CONNECTED=4
ACTIVATION_VALID=0

CALLBACK=getattr(C,"WINFUNCTYPE",C.CFUNCTYPE)

class SystemTime(C.Structure):
    _fields_=[
        ("wYear",C.c_ushort),("wMonth",C.c_ushort),("wDayOfWeek",C.c_ushort),("wDay",C.c_ushort),
        ("wHour",C.c_ushort),("wMinute",C.c_ushort),("wSecond",C.c_ushort),("wMilliseconds",C.c_ushort),
    ]

class AssetIdentifier(C.Structure):
    _fields_=[
        ("Version",C.c_ubyte),
        ("Ticker",C.c_void_p),
        ("Exchange",C.c_void_p),
        ("FeedType",C.c_ubyte),
    ]

class ConnectorTrade(C.Structure):
    _fields_=[
        ("Version",C.c_ubyte),
        ("TradeDate",SystemTime),
        ("TradeNumber",C.c_uint),
        ("Price",C.c_double),
        ("Quantity",C.c_longlong),
        ("Volume",C.c_double),
        ("BuyAgent",C.c_int),
        ("SellAgent",C.c_int),
        ("TradeType",C.c_ubyte),
    ]

StateCallback=CALLBACK(None,C.c_int,C.c_int)
TradeCallback=CALLBACK(None,AssetIdentifier,C.c_size_t,C.c_uint)

dll=C.WinDLL(DLL_PATH) if os.name=="nt" else C.CDLL(DLL_PATH)
events=queue.Queue(maxsize=500000)
ticks=defaultdict(lambda:deque(maxlen=50000))
states={LOGIN:None,MARKET:None,ACTIVATION:None}
ready_event=threading.Event()

def ptr_to_wstr(ptr):
    if not ptr:return ""
    return C.wstring_at(ptr)

def configure_signatures():
    opt=C.c_void_p
    dll.DLLInitializeMarketLogin.argtypes=[
        C.c_wchar_p,C.c_wchar_p,C.c_wchar_p,
        StateCallback,opt,opt,opt,opt,opt,opt,opt
    ]
    dll.DLLInitializeMarketLogin.restype=C.c_int
    dll.SetTradeCallbackV2.argtypes=[TradeCallback]
    dll.SetTradeCallbackV2.restype=C.c_int
    dll.TranslateTrade.argtypes=[C.c_size_t,C.POINTER(ConnectorTrade)]
    dll.TranslateTrade.restype=C.c_int
    dll.SubscribeTicker.argtypes=[C.c_wchar_p,C.c_wchar_p]
    dll.SubscribeTicker.restype=C.c_int
    dll.UnsubscribeTicker.argtypes=[C.c_wchar_p,C.c_wchar_p]
    dll.UnsubscribeTicker.restype=C.c_int
    dll.DLLFinalize.argtypes=[]
    dll.DLLFinalize.restype=C.c_int

def check_ready():
    if states.get(LOGIN)==LOGIN_CONNECTED and states.get(MARKET)==MARKET_CONNECTED and states.get(ACTIVATION)==ACTIVATION_VALID:
        ready_event.set()
    else:
        ready_event.clear()

@StateCallback
def state_callback(state_type,result):
    states[state_type]=result
    print("ProfitDLL state",state_type,result)
    check_ready()

@TradeCallback
def trade_callback(asset,p_trade,flags):
    try:
        trade=ConnectorTrade()
        trade.Version=0
        if dll.TranslateTrade(p_trade,C.byref(trade))!=NL_OK:
            return
        ticker=ptr_to_wstr(asset.Ticker)
        exchange=ptr_to_wstr(asset.Exchange)
        st=trade.TradeDate
        try:
            dt=datetime(st.wYear,st.wMonth,st.wDay,st.wHour,st.wMinute,st.wSecond,st.wMilliseconds*1000,tzinfo=timezone.utc)
        except Exception:
            dt=datetime.now(timezone.utc)
        item={
            "ticker":ticker,
            "exchange":exchange,
            "time":dt.isoformat(),
            "price":float(trade.Price),
            "qty":float(trade.Quantity),
            "volume":float(trade.Volume),
            "buyAgent":int(trade.BuyAgent),
            "sellAgent":int(trade.SellAgent),
            "tradeType":int(trade.TradeType),
            "flags":int(flags),
        }
        try: events.put_nowait(item)
        except queue.Full: pass
    except BaseException:
        pass

_callbacks=[state_callback,trade_callback]

def parse_tickers():
    out=[]
    for raw in TICKERS_RAW:
        if ":" in raw:
            ticker,exchange=raw.split(":",1)
        else:
            ticker,exchange=raw,"B"
        out.append((ticker.strip(),exchange.strip()))
    return out

def consumer():
    while True:
        item=events.get()
        ticks[item["ticker"]].append(item)

def aggregate_1m(symbol):
    rows=list(ticks[symbol])
    buckets={}
    for t in rows:
        dt=datetime.fromisoformat(t["time"])
        dt=dt.replace(second=0,microsecond=0)
        key=dt.isoformat()
        b=buckets.setdefault(key,{
            "symbol":symbol,"timeframe":"1m","time":key,
            "open":t["price"],"high":t["price"],"low":t["price"],"close":t["price"],
            "volume":0.0,"source":"profit"
        })
        b["high"]=max(b["high"],t["price"])
        b["low"]=min(b["low"],t["price"])
        b["close"]=t["price"]
        b["volume"]+=t["qty"]
    return list(sorted(buckets.values(),key=lambda x:x["time"]))[-1000:]

def headers():
    h={"content-type":"application/json"}
    if INGEST_KEY:h["x-connector-key"]=INGEST_KEY
    return h

def fetch_signal(ticker):
    try:
        r=requests.get(SAAS_URL+"/api/connectors/analyze",params={"source":"profit","symbol":ticker,"timeframe":"1m"},timeout=20)
        if r.ok:
            j=r.json()
            a=j.get("analysis") or {}
            s=a.get("signal") or {}
            print("SINAL",ticker,s.get("side"),"confiança",s.get("confidence"),"score",s.get("score"))
        else:
            print("sinal indisponível",ticker,r.status_code,r.text[:200])
    except Exception as e:
        print("erro ao consultar sinal",ticker,e)

def push_all():
    while True:
        if ready_event.is_set():
            for ticker,exchange in parse_tickers():
                candles=aggregate_1m(ticker)
                if len(candles)<2: continue
                payload={
                    "source":"profit",
                    "symbol":ticker,
                    "assetClass":"b3",
                    "timeframe":"1m",
                    "timestamp":datetime.now(timezone.utc).isoformat(),
                    "candles":candles,
                    "meta":{
                        "terminal":"ProfitDLL",
                        "exchange":exchange,
                        "marketDataReady":True,
                        "tradeCountBuffered":len(ticks[ticker])
                    }
                }
                try:
                    r=requests.post(SAAS_URL+"/api/connectors/market-push",headers=headers(),data=json.dumps(payload),timeout=20)
                    r.raise_for_status()
                    print("push",ticker,r.json())
                    if os.getenv("PROFIT_FETCH_SIGNAL","1")=="1":
                        fetch_signal(ticker)
                except Exception as e:
                    print("push erro",ticker,e)
        time.sleep(PUSH_SECONDS)

def initialize():
    if not ACTIVATION_KEY or not NELOGICA_USER or not NELOGICA_PASSWORD:
        raise RuntimeError("Configure PROFIT_ACTIVATION_KEY, PROFIT_USER e PROFIT_PASSWORD.")
    configure_signatures()
    ret=dll.DLLInitializeMarketLogin(
        ACTIVATION_KEY,NELOGICA_USER,NELOGICA_PASSWORD,
        state_callback,None,None,None,None,None,None,None
    )
    if ret!=NL_OK:
        raise RuntimeError(f"DLLInitializeMarketLogin falhou: {ret}")
    ret=dll.SetTradeCallbackV2(trade_callback)
    if ret!=NL_OK:
        raise RuntimeError(f"SetTradeCallbackV2 falhou: {ret}")
    if not ready_event.wait(30):
        raise TimeoutError(f"ProfitDLL não ficou pronta em 30s. Estados: {states}")
    for ticker,exchange in parse_tickers():
        ret=dll.SubscribeTicker(ticker,exchange)
        if ret!=NL_OK:
            raise RuntimeError(f"SubscribeTicker {ticker}:{exchange} falhou: {ret}")
        print("assinado",ticker,exchange)

def main():
    initialize()
    threading.Thread(target=consumer,daemon=True).start()
    threading.Thread(target=push_all,daemon=True).start()
    print("Profit bridge ativo. Ctrl+C para encerrar.")
    try:
        while True: time.sleep(1)
    except KeyboardInterrupt:
        pass
    finally:
        for ticker,exchange in parse_tickers():
            try:dll.UnsubscribeTicker(ticker,exchange)
            except Exception:pass
        try:dll.DLLFinalize()
        except Exception:pass

if __name__=="__main__":
    main()
