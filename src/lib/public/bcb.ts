export type BcbPoint={date:string;value:number};

const BASE="https://api.bcb.gov.br/dados/serie/bcdata.sgs";

function fmt(d:Date){
  return new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric",timeZone:"America/Sao_Paulo"}).format(d);
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
