export type ForexPair={symbol:string;base:string;quote:string;group:"major"|"minor"|"exotic";label:string;source?:"catalog"|"mt5";brokerSymbol?:string};

const mk=(base:string,quote:string,group:ForexPair["group"],source:ForexPair["source"]="catalog"):ForexPair=>({
  symbol:base+"/"+quote,base,quote,group,label:base+" / "+quote,source
});

const MAJOR_SYMBOLS=[
  "EUR/USD","GBP/USD","USD/JPY","USD/CHF","AUD/USD","USD/CAD","NZD/USD"
];

const MINOR_SYMBOLS=[
  "EUR/GBP","EUR/JPY","EUR/CHF","EUR/AUD","EUR/CAD","EUR/NZD",
  "GBP/JPY","GBP/CHF","GBP/AUD","GBP/CAD","GBP/NZD",
  "AUD/JPY","AUD/CHF","AUD/CAD","AUD/NZD",
  "CAD/JPY","CAD/CHF",
  "NZD/JPY","NZD/CHF","NZD/CAD",
  "CHF/JPY"
];

const EXOTIC_SYMBOLS=[
  "USD/BRL","USD/MXN","USD/ZAR","USD/TRY","USD/PLN","USD/CZK","USD/HUF",
  "USD/SEK","USD/NOK","USD/DKK","USD/SGD","USD/HKD","USD/CNH","USD/INR",
  "USD/KRW","USD/THB","USD/IDR","USD/ILS","USD/SAR","USD/AED","USD/CLP",
  "USD/COP","USD/PEN","USD/TWD","USD/PHP","USD/MYR","USD/RON",
  "EUR/TRY","EUR/PLN","EUR/CZK","EUR/HUF","EUR/ZAR","EUR/SEK","EUR/NOK",
  "EUR/DKK","EUR/RON","EUR/SGD","EUR/HKD","EUR/CNH","EUR/MXN","EUR/ILS",
  "GBP/ZAR","GBP/TRY","GBP/SGD","GBP/HKD","GBP/CNH","GBP/PLN","GBP/MXN",
  "AUD/SGD","AUD/CNH","AUD/HKD","AUD/MXN","AUD/ZAR",
  "NZD/SGD","NZD/CNH","NZD/HKD",
  "CAD/MXN","CAD/SGD","CAD/CNH","CAD/HKD",
  "CHF/SGD","CHF/CNH","CHF/HKD","CHF/ZAR",
  "JPY/SGD","JPY/CNH","JPY/HKD","JPY/ZAR",
  "SGD/JPY","SGD/HKD","SGD/CNH","HKD/JPY","CNH/JPY",
  "NOK/SEK","SEK/NOK","EUR/BRL","GBP/BRL","AUD/BRL","CAD/BRL"
];

function build(symbols:string[],group:ForexPair["group"]){
  return [...new Set(symbols)].map(s=>{
    const [b,q]=s.split("/");
    return mk(b,q,group);
  });
}

export const MAJORS=build(MAJOR_SYMBOLS,"major");
export const MINORS=build(MINOR_SYMBOLS,"minor");
export const EXOTICS=build(EXOTIC_SYMBOLS,"exotic");
export const FOREX_PAIRS=[...MAJORS,...MINORS,...EXOTICS];

export function classifyForexPair(base:string,quote:string):ForexPair["group"]{
  const symbol=base+"/"+quote;
  if(MAJOR_SYMBOLS.includes(symbol))return "major";
  if(MINOR_SYMBOLS.includes(symbol))return "minor";
  return "exotic";
}

export function normalizeForexPair(base:string,quote:string,source:ForexPair["source"]="mt5"):ForexPair{
  return mk(base.toUpperCase(),quote.toUpperCase(),classifyForexPair(base.toUpperCase(),quote.toUpperCase()),source);
}

export function findForexPair(symbol:string){
  const s=symbol.replace("_","/").toUpperCase();
  return FOREX_PAIRS.find(p=>p.symbol===s);
}
