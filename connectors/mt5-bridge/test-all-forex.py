import os
import sys
import MetaTrader5 as mt5
from dotenv import load_dotenv

load_dotenv()

PATH=os.getenv("MT5_TERMINAL_PATH","").strip()
LOGIN=os.getenv("MT5_LOGIN","").strip()
PASSWORD=os.getenv("MT5_PASSWORD","")
SERVER=os.getenv("MT5_SERVER","").strip()

FIAT_CODES={
    "USD","EUR","GBP","JPY","CHF","AUD","CAD","NZD","BRL","MXN","ZAR","TRY","PLN","CZK","HUF",
    "SEK","NOK","DKK","SGD","HKD","CNH","CNY","INR","KRW","THB","IDR","ILS","SAR","AED","CLP",
    "COP","PEN","TWD","PHP","MYR","RON","BGN","RUB","UAH","KZT","QAR","KWD","BHD","OMR","JOD",
    "EGP","MAD","TND","PKR","BDT","LKR","VND","NGN","KES","GHS","UGX","TZS","ZMW","BWP","MUR",
    "ISK","RSD","GEL","AMD","AZN","UZS","MNT"
}

TF={
    "1m":mt5.TIMEFRAME_M1,
    "5m":mt5.TIMEFRAME_M5,
    "10m":mt5.TIMEFRAME_M10,
    "1h":mt5.TIMEFRAME_H1,
}

def init():
    kwargs={}
    if PATH:kwargs["path"]=PATH
    if LOGIN:
        kwargs["login"]=int(LOGIN)
        if PASSWORD:kwargs["password"]=PASSWORD
        if SERVER:kwargs["server"]=SERVER
    if not mt5.initialize(**kwargs):
        print("[ERRO] initialize:",mt5.last_error())
        sys.exit(1)

def forex_symbols():
    rows=[]
    for info in (mt5.symbols_get() or []):
        base=str(getattr(info,"currency_base","") or "").upper()
        quote=str(getattr(info,"currency_profit","") or "").upper()
        if base in FIAT_CODES and quote in FIAT_CODES and base!=quote:
            rows.append((base+"/"+quote,info.name))
    seen=set();out=[]
    for pair,name in sorted(rows):
        if (pair,name) not in seen:
            seen.add((pair,name));out.append((pair,name))
    return out

init()
try:
    pairs=forex_symbols()
    total=0;ok=0;failed=[]
    print("=== MercadoAI / Teste completo Forex MT5 ===")
    print("Pares descobertos:",len(pairs))
    for pair,symbol in pairs:
        if not mt5.symbol_select(symbol,True):
            failed.append((pair,"select","indisponível"))
            continue
        tick=mt5.symbol_info_tick(symbol)
        if tick is None:
            failed.append((pair,"tick","sem tick"))
            continue
        for tf_name,tf in TF.items():
            total+=1
            rates=mt5.copy_rates_from_pos(symbol,tf,0,80)
            if rates is None or len(rates)<60:
                failed.append((pair,tf_name,"histórico insuficiente"))
                print("[FALHA]",pair,tf_name,"histórico insuficiente")
            else:
                ok+=1
                print("[OK]",pair,tf_name,len(rates))
    print("")
    print("Streams testados:",total)
    print("OK:",ok)
    print("Falhas:",len(failed))
    if failed:
        print("Detalhes:")
        for x in failed:print(" -",*x)
        sys.exit(2)
    print("[OK] TODOS OS PARES/TIMEFRAMES DISPONÍVEIS NO MT5 FORAM TESTADOS.")
finally:
    mt5.shutdown()
