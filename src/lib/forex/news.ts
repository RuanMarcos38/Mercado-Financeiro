const GDELT="https://api.gdeltproject.org/api/v2/doc/doc";

export type ForexNewsItem={
  title:string;
  url:string;
  domain?:string;
  language?:string;
  seenDate?:string;
  source:"gdelt";
};

export async function getForexNews(pair?:string,hours=24):Promise<ForexNewsItem[]>{
  const currencies=(pair??"USD EUR GBP JPY CHF AUD CAD NZD").replace("/"," ").split(/\s+/).filter(Boolean);
  const q=currencies.length>=2
    ?`("${currencies[0]}" OR "${currencies[1]}") (forex OR currency OR interest rate OR inflation OR central bank)`
    :"(forex OR currency) (central bank OR interest rate OR inflation)";
  const params=new URLSearchParams({
    query:q,
    mode:"ArtList",
    maxrecords:"50",
    format:"json",
    timespan:`${Math.max(1,Math.min(72,hours))}h`
  });
  const res=await fetch(`${GDELT}?${params.toString()}`,{next:{revalidate:300}});
  if(!res.ok) throw new Error(`GDELT: HTTP ${res.status}`);
  const json=await res.json() as any;
  return (json.articles??[]).slice(0,50).map((a:any)=>({
    title:String(a.title??""),
    url:String(a.url??""),
    domain:a.domain?String(a.domain):undefined,
    language:a.language?String(a.language):undefined,
    seenDate:a.seendate?String(a.seendate):undefined,
    source:"gdelt" as const
  })).filter((x:ForexNewsItem)=>x.title&&x.url);
}

export function estimateNewsRisk(items:ForexNewsItem[]){
  const high=/rate decision|interest rate|central bank|inflation|cpi|payroll|employment|gdp|intervention|emergency|war|sanction/i;
  const medium=/speech|minutes|survey|retail|manufacturing|services|trade balance|oil/i;
  let score=0;
  for(const x of items){
    if(high.test(x.title)) score+=.12;
    else if(medium.test(x.title)) score+=.05;
  }
  return Math.min(1,score);
}
