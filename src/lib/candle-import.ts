import type { Candle } from "@/lib/market/types";

function separator(line:string){
  const candidates=[",",";","\t"];
  return candidates.sort((a,b)=>line.split(b).length-line.split(a).length)[0];
}

function num(v:string){
  const s=v.trim().replace(/^"|"$/g,"");
  if(/^\d{1,3}(\.\d{3})+,\d+$/.test(s)) return Number(s.replace(/\./g,"").replace(",","."));
  if(/^\d+,\d+$/.test(s)) return Number(s.replace(",","."));
  return Number(s);
}

export function parseCandlesCsv(csv:string,symbol="IMPORT",timeframe:Candle["timeframe"]="1m"):Candle[]{
  const lines=csv.trim().split(/\r?\n/).filter(Boolean);
  if(lines.length<2) throw new Error("CSV vazio ou inválido.");
  const sep=separator(lines[0]);
  const h=lines[0].split(sep).map(x=>x.trim().toLowerCase().replace(/^"|"$/g,""));
  const find=(...names:string[])=>h.findIndex(x=>names.includes(x));
  const it=find("time","timestamp","date","datetime","data","hora");
  const io=find("open","abertura");
  const ih=find("high","max","máxima","maxima");
  const il=find("low","min","mínima","minima");
  const ic=find("close","fechamento","ultimo","último");
  const iv=find("volume","vol");
  if([it,io,ih,il,ic].some(i=>i<0)) throw new Error("CSV precisa conter data/time, open, high, low e close.");
  return lines.slice(1).map((line,i)=>{
    const r=line.split(sep);
    const timeRaw=(r[it]??"").replace(/^"|"$/g,"");
    const d=new Date(timeRaw);
    const time=Number.isNaN(d.getTime())?new Date(Date.now()-(lines.length-i)*60000).toISOString():d.toISOString();
    return {
      symbol,timeframe,time,
      open:num(r[io]),high:num(r[ih]),low:num(r[il]),close:num(r[ic]),
      volume:iv>=0?num(r[iv]):0,
      source:"imported"
    } satisfies Candle;
  }).filter(c=>[c.open,c.high,c.low,c.close].every(Number.isFinite));
}
