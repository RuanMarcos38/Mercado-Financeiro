export type ForexPair={symbol:string;base:string;quote:string;group:"major"|"minor"|"exotic";label:string};
const mk=(base:string,quote:string,group:ForexPair["group"]):ForexPair=>({symbol:base+"/"+quote,base,quote,group,label:base+" / "+quote});
export const MAJORS=["EUR/USD","GBP/USD","USD/JPY","USD/CHF","AUD/USD","USD/CAD","NZD/USD"].map(s=>{const [b,q]=s.split("/");return mk(b,q,"major")});
export const MINORS=["EUR/GBP","EUR/JPY","EUR/CHF","EUR/AUD","EUR/CAD","EUR/NZD","GBP/JPY","GBP/CHF","GBP/AUD","GBP/CAD","GBP/NZD","AUD/JPY","AUD/CHF","AUD/CAD","AUD/NZD","CAD/JPY","CAD/CHF","NZD/JPY","NZD/CHF","NZD/CAD","CHF/JPY"].map(s=>{const [b,q]=s.split("/");return mk(b,q,"minor")});
export const EXOTICS=["USD/BRL","USD/MXN","USD/ZAR","USD/TRY","USD/PLN","USD/CZK","USD/HUF","USD/SGD","USD/HKD","USD/CNH","USD/INR","USD/KRW","USD/THB","USD/IDR","USD/ILS","USD/SAR","USD/AED","USD/CLP","USD/COP","USD/PEN","EUR/TRY","EUR/PLN","EUR/CZK","EUR/HUF","EUR/ZAR","EUR/SEK","EUR/NOK","EUR/DKK","EUR/RON","EUR/SGD","EUR/MXN","GBP/ZAR","GBP/TRY","GBP/SGD","AUD/SGD","AUD/CNH","NZD/SGD","CAD/MXN","CHF/SGD","JPY/SGD"].map(s=>{const [b,q]=s.split("/");return mk(b,q,"exotic")});
export const FOREX_PAIRS=[...MAJORS,...MINORS,...EXOTICS];
export function findForexPair(symbol:string){const s=symbol.replace("_","/").toUpperCase();return FOREX_PAIRS.find(p=>p.symbol===s)}
