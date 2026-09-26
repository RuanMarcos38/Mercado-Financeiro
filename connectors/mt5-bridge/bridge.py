import os
import time
import json
import math
import requests
import MetaTrader5 as mt5
from dotenv import load_dotenv
from datetime import datetime, timezone

load_dotenv()

SAAS_URL=os.getenv("SAAS_URL","http://localhost:3000").rstrip("/")
INGEST_KEY=os.getenv("CONNECTOR_INGEST_KEY","")
SYMBOLS=[s.strip() for s in os.getenv("MT5_SYMBOLS","EURUSD,GBPUSD,USDJPY,USDCHF,AUDUSD,USDCAD,NZDUSD").split(",") if s.strip()]
INTERVAL_SECONDS=max(1,int(os.getenv("MT5_PUSH_SECONDS","2")))
BARS=max(100,min(2000,int(os.getenv("MT5_BARS","400"))))
TIMEFRAME_NAME=os.getenv("MT5_TIMEFRAME","M5").upper()
TIMEFRAME_NAMES=[x.strip().upper() for x in os.getenv("MT5_TIMEFRAMES",TIMEFRAME_NAME).split(",") if x.strip()]
AUTOTRADE_LIVE=os.getenv("MT5_AUTOTRADE_LIVE","0")=="1"
MAX_LOT=float(os.getenv("MT5_MAX_LOT","0.10"))
RISK_PCT=float(os.getenv("MT5_RISK_PER_TRADE_PCT","0.5"))
MAX_POSITIONS=max(1,int(os.getenv("MT5_MAX_OPEN_POSITIONS","2")))
DEVIATION=max(1,int(os.getenv("MT5_DEVIATION_POINTS","20")))
MAGIC=int(os.getenv("MT5_MAGIC","560056"))
MT5_LOGIN=os.getenv("MT5_LOGIN","").strip()
MT5_PASSWORD=os.getenv("MT5_PASSWORD","")
MT5_SERVER=os.getenv("MT5_SERVER","").strip()
MT5_TIMEOUT=max(10000,int(os.getenv("MT5_TIMEOUT_MS","60000")))
RECONNECT_SECONDS=max(2,int(os.getenv("MT5_RECONNECT_SECONDS","5")))
STREAM_ALL_FOREX=os.getenv("MT5_STREAM_ALL_FOREX","1")=="1"
FULL_SCAN_MAX_AGE=max(10,int(os.getenv("MT5_FULL_SCAN_MAX_AGE_SECONDS","20")))
BATCH_MAX=max(10,min(80,int(os.getenv("MT5_BATCH_MAX","60"))))

WARMED_STREAMS=set()
FOREX_CATALOG_CACHE=[]
FOREX_CATALOG_AT=0
WATCHLIST_CACHE=[]
WATCHLIST_AT=0
FULL_SCAN_CURSOR=0
FULL_SCAN_QUEUE=[]
FULL_SCAN_QUEUE_AT=0
CATALOG_SENT_AT=0

TF={
    "M1":(mt5.TIMEFRAME_M1,"1m"),
    "M5":(mt5.TIMEFRAME_M5,"5m"),
    "M10":(mt5.TIMEFRAME_M10,"10m"),
    "M15":(mt5.TIMEFRAME_M15,"15m"),
    "H1":(mt5.TIMEFRAME_H1,"1h"),
    "D1":(mt5.TIMEFRAME_D1,"1d"),
}

def headers():
    h={"content-type":"application/json"}
    if INGEST_KEY:h["x-connector-key"]=INGEST_KEY
    return h

def init():
    path=os.getenv("MT5_TERMINAL_PATH","").strip()
    kwargs={"timeout":MT5_TIMEOUT}
    if path: kwargs["path"]=path
    if MT5_LOGIN:
        try: kwargs["login"]=int(MT5_LOGIN)
        except ValueError: raise RuntimeError("MT5_LOGIN deve conter apenas números.")
    if MT5_PASSWORD: kwargs["password"]=MT5_PASSWORD
    if MT5_SERVER: kwargs["server"]=MT5_SERVER

    ok=mt5.initialize(**kwargs)
    if not ok:
        raise RuntimeError(f"mt5.initialize/autologin falhou: {mt5.last_error()}")

    acct=mt5.account_info()
    if MT5_LOGIN and (not acct or str(acct.login)!=str(MT5_LOGIN)):
        login_kwargs={"timeout":MT5_TIMEOUT}
        if MT5_PASSWORD: login_kwargs["password"]=MT5_PASSWORD
        if MT5_SERVER: login_kwargs["server"]=MT5_SERVER
        if not mt5.login(int(MT5_LOGIN),**login_kwargs):
            raise RuntimeError(f"mt5.login falhou: {mt5.last_error()}")
        acct=mt5.account_info()

    info=mt5.terminal_info()
    print("MT5 conectado:",bool(info))
    print("Conta:",acct.login if acct else None,"Servidor:",acct.server if acct else None,"AutoTrade local:",AUTOTRADE_LIVE)
    discover_forex_catalog(force=True)
    build_full_scan_queue(force=True)

def ensure_connection():
    info=mt5.terminal_info()
    acct=mt5.account_info()
    expected_ok=(not MT5_LOGIN) or (acct is not None and str(acct.login)==str(MT5_LOGIN))
    if info is not None and acct is not None and expected_ok:
        return True

    print("WATCHDOG: conexão MT5 perdida. Tentando reabrir/reconectar...")
    try: mt5.shutdown()
    except Exception: pass

    while True:
        try:
            init()
            print("WATCHDOG: MT5 reconectado.")
            return True
        except Exception as e:
            print("WATCHDOG: falha ao reconectar:",e)
            time.sleep(RECONNECT_SECONDS)

def normalize_symbol(s):
    if "/" in s:return s
    info=mt5.symbol_info(s)
    if info:
        base=str(getattr(info,"currency_base","") or "").upper()
        quote=str(getattr(info,"currency_profit","") or "").upper()
        if len(base)==3 and len(quote)==3 and base!=quote:
            return base+"/"+quote
    if len(s)>=6:return s[:3]+"/"+s[3:6]
    return s

def discover_forex_catalog(force=False):
    global FOREX_CATALOG_CACHE,FOREX_CATALOG_AT
    now=time.time()
    if FOREX_CATALOG_CACHE and not force and now-FOREX_CATALOG_AT<300:
        return FOREX_CATALOG_CACHE
    rows=[]
    seen=set()
    for info in (mt5.symbols_get() or []):
        base=str(getattr(info,"currency_base","") or "").upper()
        quote=str(getattr(info,"currency_profit","") or "").upper()
        if len(base)!=3 or len(quote)!=3 or base==quote:
            continue
        # Currency pairs only. Metals/CFDs normally use non-currency base codes.
        if not base.isalpha() or not quote.isalpha():
            continue
        pair=base+"/"+quote
        key=(pair,info.name)
        if key in seen:continue
        seen.add(key)
        rows.append({
            "symbol":pair,
            "brokerSymbol":info.name,
            "base":base,
            "quote":quote,
            "visible":bool(getattr(info,"visible",False)),
            "selectable":bool(getattr(info,"select",False) or getattr(info,"visible",False))
        })
    rows.sort(key=lambda x:(x["symbol"],x["brokerSymbol"]))
    FOREX_CATALOG_CACHE=rows
    FOREX_CATALOG_AT=now
    print("FOREX CATALOGO MT5",len(rows),"instrumentos")
    return rows

def original_symbol(normalized):
    return normalized.replace("/","")

def broker_symbol_for_pair(pair):
    target=pair.upper()
    for item in discover_forex_catalog():
        if item.get("symbol")==target:
            return item.get("brokerSymbol")
    compact=target.replace("/","")
    if mt5.symbol_info(compact):
        return compact
    return None

def fetch_dynamic_watchlist(force=False):
    global WATCHLIST_CACHE,WATCHLIST_AT
    now=time.time()
    if WATCHLIST_CACHE and not force and now-WATCHLIST_AT<10:
        return WATCHLIST_CACHE
    try:
        r=requests.get(SAAS_URL+"/api/connectors/watchlist",headers=headers(),timeout=10)
        if r.ok:
            items=(r.json() or {}).get("items") or []
            WATCHLIST_CACHE=items
            WATCHLIST_AT=now
    except Exception as e:
        print("WATCHLIST erro",e)
    return WATCHLIST_CACHE

def tf_name_from_output(tf_out):
    reverse={"1m":"M1","5m":"M5","10m":"M10","15m":"M15","1h":"H1","1d":"D1"}
    return reverse.get(tf_out,"M5")

def build_full_scan_queue(force=False):
    global FULL_SCAN_QUEUE,FULL_SCAN_QUEUE_AT
    if not STREAM_ALL_FOREX:
        return []
    now=time.time()
    if FULL_SCAN_QUEUE and not force and now-FULL_SCAN_QUEUE_AT<300:
        return FULL_SCAN_QUEUE
    queue=[]
    selected=0
    for item in discover_forex_catalog(force=force):
        broker_symbol=item.get("brokerSymbol")
        pair=item.get("symbol")
        if not broker_symbol or not pair:
            continue
        if not mt5.symbol_select(broker_symbol,True):
            continue
        selected+=1
        for tf_name in ["M1","M5","M10","H1"]:
            queue.append((pair,broker_symbol,tf_name))
    FULL_SCAN_QUEUE=queue
    FULL_SCAN_QUEUE_AT=now
    print("FOREX FILA TOTAL",selected,"pares",len(queue),"streams")
    return queue

def background_cycle_budget(total):
    if total<=0:return 0
    cycles=max(1,int(FULL_SCAN_MAX_AGE/max(1,INTERVAL_SECONDS)))
    return max(1,min(BATCH_MAX,math.ceil(total/cycles)))

def make_payload(symbol,tf_name,background=False):
    global CATALOG_SENT_AT
    tick=mt5.symbol_info_tick(symbol)
    if tick is None:
        raise RuntimeError(f"{symbol}: sem tick")
    tf,tf_out=TF.get(tf_name,TF["M5"])
    normalized=normalize_symbol(symbol)
    candles_out=candles(symbol,tf,tf_out,BARS if (symbol,tf_out) not in WARMED_STREAMS else 3)
    meta={
        "terminal":"MetaTrader5","originalSymbol":symbol,"assetClass":"forex",
        "autoTradeLocal":AUTOTRADE_LIVE,"sourceTimeframe":tf_name,
        "backgroundScan":bool(background)
    }
    now=time.time()
    if now-CATALOG_SENT_AT>=300:
        meta["availableForexPairs"]=discover_forex_catalog()
        CATALOG_SENT_AT=now
    payload={
        "source":"mt5","symbol":normalized,"assetClass":"forex","timeframe":tf_out,
        "timestamp":datetime.now(timezone.utc).isoformat(),
        "bid":float(tick.bid),"ask":float(tick.ask),"spread":float(tick.ask-tick.bid),
        "candles":candles_out,
        "meta":meta
    }
    WARMED_STREAMS.add((symbol,tf_out))
    return payload

def send_batch(items):
    if not items:return
    r=requests.post(
        SAAS_URL+"/api/connectors/market-batch",
        headers=headers(),
        data=json.dumps({"items":items}),
        timeout=max(20,5+len(items))
    )
    r.raise_for_status()
    j=r.json()
    print("BATCH",j.get("success",0),"/",j.get("processed",0),"streams",
          "falhas",j.get("failed",0))

def candles(symbol,tf,tf_out,limit=None):
    count=limit if limit is not None else BARS
    rates=mt5.copy_rates_from_pos(symbol,tf,0,count)
    if rates is None: raise RuntimeError(f"{symbol}: copy_rates falhou: {mt5.last_error()}")
    return [{
        "symbol":normalize_symbol(symbol),"timeframe":tf_out,
        "time":datetime.fromtimestamp(int(r["time"]),tz=timezone.utc).isoformat(),
        "open":float(r["open"]),"high":float(r["high"]),"low":float(r["low"]),"close":float(r["close"]),
        "volume":float(r["tick_volume"]),"source":"mt5"
    } for r in rates]

def fetch_signal(symbol,tf_out):
    normalized=normalize_symbol(symbol)
    try:
        r=requests.get(SAAS_URL+"/api/connectors/analyze",params={"source":"mt5","symbol":normalized,"timeframe":tf_out},timeout=20)
        if r.ok:
            j=r.json();s=(j.get("analysis") or {}).get("signal") or {}
            print("SINAL",normalized,s.get("side"),"confiança",s.get("confidence"),"score",s.get("score"))
    except Exception as e: print("erro ao consultar sinal",normalized,e)

def volume_step(value,step):
    if step<=0:return value
    return math.floor(value/step)*step

def risk_volume(symbol,entry,stop):
    info=mt5.symbol_info(symbol)
    acct=mt5.account_info()
    if not info or not acct or not stop:return min(MAX_LOT,info.volume_min if info else MAX_LOT)
    distance=abs(entry-stop)
    if distance<=0:return info.volume_min
    risk_money=float(acct.balance)*(RISK_PCT/100.0)
    tick_size=float(info.trade_tick_size or info.point or 0)
    tick_value=float(info.trade_tick_value or 0)
    if tick_size<=0 or tick_value<=0:return min(MAX_LOT,max(info.volume_min,info.volume_min))
    loss_per_lot=(distance/tick_size)*tick_value
    raw=risk_money/loss_per_lot if loss_per_lot>0 else info.volume_min
    raw=min(raw,MAX_LOT,float(info.volume_max))
    raw=max(raw,float(info.volume_min))
    return round(volume_step(raw,float(info.volume_step or info.volume_min)),8)

def execute_intent(intent):
    symbol=original_symbol(intent["symbol"])
    mode=intent.get("mode","paper")
    if mode=="live" and not AUTOTRADE_LIVE:
        return False,"Live recusado pelo bridge local: MT5_AUTOTRADE_LIVE=1 não configurado."
    if len(mt5.positions_get() or [])>=MAX_POSITIONS:
        return False,"Limite local de posições abertas atingido."
    if not mt5.symbol_select(symbol,True):
        return False,f"Símbolo {symbol} indisponível."
    tick=mt5.symbol_info_tick(symbol)
    info=mt5.symbol_info(symbol)
    if not tick or not info:return False,"Sem tick/symbol_info."
    side=intent["side"]
    price=float(tick.ask if side=="BUY" else tick.bid)
    stop=float(intent.get("stopLoss") or 0)
    target=float(intent.get("takeProfit") or 0)
    volume=risk_volume(symbol,price,stop) if mode=="live" else min(MAX_LOT,max(float(info.volume_min),0.01))
    if mode=="paper":
        print("PAPER",side,symbol,volume,price,"SL",stop,"TP",target)
        return True,f"Paper executado {side} {symbol} {volume} @ {price}"
    request={
        "action":mt5.TRADE_ACTION_DEAL,
        "symbol":symbol,
        "volume":volume,
        "type":mt5.ORDER_TYPE_BUY if side=="BUY" else mt5.ORDER_TYPE_SELL,
        "price":price,
        "sl":stop,
        "tp":target,
        "deviation":DEVIATION,
        "magic":MAGIC,
        "comment":"MercadoAI AutoTrade",
        "type_time":mt5.ORDER_TIME_GTC,
        "type_filling":mt5.ORDER_FILLING_RETURN,
    }
    check=mt5.order_check(request)
    if check is None:return False,f"order_check falhou: {mt5.last_error()}"
    result=mt5.order_send(request)
    if result is None:return False,f"order_send falhou: {mt5.last_error()}"
    ok=result.retcode==mt5.TRADE_RETCODE_DONE
    return ok,f"retcode={result.retcode} order={getattr(result,'order',None)} deal={getattr(result,'deal',None)} volume={volume}"

def poll_intent(symbol):
    normalized=normalize_symbol(symbol)
    try:
        r=requests.get(SAAS_URL+"/api/autotrade/intents",headers=headers(),params={"source":"mt5","symbol":normalized,"claim":"1"},timeout=20)
        if not r.ok:return
        intent=r.json().get("intent")
        if not intent:return
        ok,note=execute_intent(intent)
        status="EXECUTED" if ok else "REJECTED"
        requests.post(SAAS_URL+"/api/autotrade/intents",headers=headers(),data=json.dumps({"id":intent["id"],"status":status,"note":note}),timeout=20)
        print("AUTOTRADE",normalized,status,note)
    except Exception as e: print("erro AutoTrade",normalized,e)

def push(symbol,only_timeframes=None):
    selected_timeframes=only_timeframes or TIMEFRAME_NAMES
    for tf_name in selected_timeframes:
        payload=make_payload(symbol,tf_name,background=False)
        r=requests.post(SAAS_URL+"/api/connectors/market-push",headers=headers(),data=json.dumps(payload),timeout=20)
        r.raise_for_status()
        j=r.json()
        decision=j.get("decision") or {}
        candidate=decision.get("candidate") or {}
        print(symbol,tf_name,"push",j.get("candles"),"decisão",candidate.get("status"),candidate.get("side"),candidate.get("confidence"))
        if os.getenv("MT5_FETCH_SIGNAL","1")=="1":fetch_signal(symbol,payload["timeframe"])
    if os.getenv("MT5_FETCH_AUTOTRADE","1")=="1":poll_intent(symbol)

def main():
    init()
    try:
        global FULL_SCAN_CURSOR
        while True:
            ensure_connection()
            processed=set()

            # Prioridade 1: ativos/timeframes abertos pelos usuários.
            for item in fetch_dynamic_watchlist():
                try:
                    pair=str(item.get("symbol") or "").upper()
                    tf_out=str(item.get("timeframe") or "5m")
                    tf_name=tf_name_from_output(tf_out)
                    broker_symbol=broker_symbol_for_pair(pair)
                    if not broker_symbol:
                        print("WATCHLIST",pair,"não disponível na corretora")
                        continue
                    if not mt5.symbol_select(broker_symbol,True):
                        print("WATCHLIST",pair,"não selecionável no terminal")
                        continue
                    push(broker_symbol,[tf_name])
                    processed.add((pair,tf_name))
                except Exception as e:
                    print("WATCHLIST erro item",item,e)

            # Prioridade 2: símbolos fixos adicionais do .env.
            for symbol in SYMBOLS:
                try:
                    if not mt5.symbol_select(symbol,True):
                        continue
                    pair=normalize_symbol(symbol)
                    tfs=[tf for tf in TIMEFRAME_NAMES if (pair,tf) not in processed]
                    if tfs:push(symbol,tfs)
                    for tf_name in tfs:processed.add((pair,tf_name))
                except Exception as e:
                    print(symbol,"erro:",e)

            # Cobertura total: todos os pares reais da corretora em 1m/5m/10m/1h.
            if STREAM_ALL_FOREX:
                queue=build_full_scan_queue()
                total=len(queue)
                budget=background_cycle_budget(total)
                batch=[]
                scanned=0
                while total and scanned<budget:
                    pair,broker_symbol,tf_name=queue[FULL_SCAN_CURSOR%total]
                    FULL_SCAN_CURSOR=(FULL_SCAN_CURSOR+1)%total
                    scanned+=1
                    if (pair,tf_name) in processed:
                        continue
                    try:
                        batch.append(make_payload(broker_symbol,tf_name,background=True))
                        processed.add((pair,tf_name))
                    except Exception as e:
                        print("SCAN",pair,tf_name,"erro:",e)
                for i in range(0,len(batch),BATCH_MAX):
                    send_batch(batch[i:i+BATCH_MAX])

            time.sleep(INTERVAL_SECONDS)
    finally:mt5.shutdown()

if __name__=="__main__":main()
