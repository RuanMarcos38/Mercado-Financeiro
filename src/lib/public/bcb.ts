export type BcbPoint={date:string;value:number};

const BASE="https://api.bcb.gov.br/dados/serie/bcdata.sgs";

function fmt(d:Date){
  return new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric",timeZone:"America/Sao_Paulo"}).format(d);
}
function fmtUs(d:Date){
  const parts=new Intl.DateTimeFormat("en-US",{month:"2-digit",day:"2-digit",year:"numeric",timeZone:"America/Sao_Paulo"}).formatToParts(d);
  const get=(t:string)=>parts.find(p=>p.type===t)?.value??"";
  return `${get("month")}-${get("day")}-${get("year")}`;
}

export async function getSgsSeries(code:number, days=365):Promise<BcbPoint[]>{
  const end=new Date();
  const start=new Date(end.getTime()-days*86400000);
  const url=`${BASE}.${code}/dados?formato=json&dataInicial=${encodeURIComponent(fmt(start))}&dataFinal=${encodeURIComponent(fmt(end))}`;
  const res=await fetch(url,{next:{revalidate:3600}});
  if(!res.ok) throw new Error(`BCB SGS ${code}: HTTP ${res.status}`);
  const rows=await res.json() as Array<{data:string;valor:string}>;
  return rows.map(r=>({date:r.data,value:Number(r.valor.replace(",","."))})).filter(x=>Number.isFinite(x.value));
}

export const BCB_SERIES={
  SELIC_TARGET:432,
  IPCA:433
} as const;

export async function getBrazilMacro(){
  const [selic,ipca]=await Promise.all([
    getSgsSeries(BCB_SERIES.SELIC_TARGET,45),
    getSgsSeries(BCB_SERIES.IPCA,450)
  ]);
  return {
    source:"Banco Central do Brasil / SGS",
    fetchedAt:new Date().toISOString(),
    selicTarget:selic.at(-1)??null,
    ipcaLatest:ipca.at(-1)??null
  };
}

export async function getLatestPtax(){
  const end=new Date();
  const start=new Date(end.getTime()-10*86400000);
  const base="https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)";
  const params=`?@dataInicial='%27${fmtUs(start)}%27'&@dataFinalCotacao='%27${fmtUs(end)}%27'&$top=100&$format=json&$select=cotacaoCompra,cotacaoVenda,dataHoraCotacao`;
  const fixed=params.replace(/'%27/g,"%27").replace(/%27'/g,"%27");
  const res=await fetch(base+fixed,{next:{revalidate:900}});
  if(!res.ok) throw new Error(`BCB PTAX: HTTP ${res.status}`);
  const json=await res.json() as {value?:Array<{cotacaoCompra:number;cotacaoVenda:number;dataHoraCotacao:string}>};
  const rows=(json.value??[]).filter(x=>Number.isFinite(Number(x.cotacaoVenda)));
  const last=rows.at(-1);
  const prev=rows.length>1?rows.at(-2):undefined;
  if(!last) throw new Error("BCB PTAX: sem cotação disponível no período");
  const changePercent=prev?((last.cotacaoVenda-prev.cotacaoVenda)/prev.cotacaoVenda)*100:null;
  return {
    source:"Banco Central do Brasil / PTAX",
    official:true,
    price:last.cotacaoVenda,
    buy:last.cotacaoCompra,
    sell:last.cotacaoVenda,
    changePercent,
    marketTime:last.dataHoraCotacao,
    cadence:"boletins oficiais do BCB"
  };
}
