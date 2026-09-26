import { getForexNews,estimateNewsRisk } from "@/lib/forex/news";

type ExternalContext={
  symbol:string;
  newsRisk:number;
  headlines:number;
  updatedAt:string;
  source:string;
};

const g=globalThis as typeof globalThis & {
  __marketExternalContext?:Map<string,{expires:number,value:ExternalContext}>;
};
if(!g.__marketExternalContext)g.__marketExternalContext=new Map();

async function genericNews(symbol:string){
  const q=encodeURIComponent('"' + symbol.replace("/"," ") + '" (market OR finance OR economy OR company OR futures)');
  const url="https://api.gdeltproject.org/api/v2/doc/doc?query="+q+"&mode=ArtList&maxrecords=30&format=json&timespan=24h";
  const res=await fetch(url,{next:{revalidate:300}});
  if(!res.ok)throw new Error("GDELT HTTP "+res.status);
  const j=await res.json() as any;
  const items=(j.articles??[]).map((a:any)=>String(a.title??"")).filter(Boolean);
  const high=/rate decision|interest rate|inflation|cpi|payroll|employment|gdp|intervention|emergency|war|sanction|earnings|guidance|downgrade|upgrade/i;
  const medium=/speech|minutes|survey|retail|manufacturing|services|trade balance|oil|commodity|merger|acquisition/i;
  let score=0;
  for(const title of items){
    if(high.test(title))score+=.12;
    else if(medium.test(title))score+=.05;
  }
  return {risk:Math.min(1,score),headlines:items.length};
}

export async function getExternalMarketContext(symbol:string,assetClass?:string):Promise<ExternalContext>{
  const key=(assetClass??"other")+":"+symbol.toUpperCase();
  const now=Date.now();
  const cached=g.__marketExternalContext!.get(key);
  if(cached&&cached.expires>now)return cached.value;

  let newsRisk=.15,headlines=0,source="fallback";
  try{
    if(assetClass==="forex"||symbol.includes("/")){
      const items=await getForexNews(symbol,24);
      newsRisk=estimateNewsRisk(items);
      headlines=items.length;
      source="gdelt-forex";
    }else{
      const r=await genericNews(symbol);
      newsRisk=r.risk;
      headlines=r.headlines;
      source="gdelt-market";
    }
  }catch{
    // O feed técnico continua funcionando mesmo se a fonte externa falhar.
  }

  const value={symbol,newsRisk,headlines,updatedAt:new Date().toISOString(),source};
  g.__marketExternalContext!.set(key,{expires:now+5*60*1000,value});
  return value;
}
