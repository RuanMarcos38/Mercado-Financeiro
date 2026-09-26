import { NextRequest,NextResponse } from "next/server";
import { FOREX_PAIRS,MAJORS,MINORS,EXOTICS,normalizeForexPair } from "@/lib/forex/catalog";
import { forexProviderStatus } from "@/lib/forex/providers";
import { resolveRequestTenant } from "@/lib/auth/request-tenant";
import { hydrateSharedMarketStreams } from "@/lib/connectors/shared-streams";
import { listMarketStreams } from "@/lib/connectors/market-stream";

export const dynamic="force-dynamic";

export async function GET(req:NextRequest){
  const merged=new Map(FOREX_PAIRS.map(p=>[p.symbol,p]));
  let brokerPairs=0;

  const tenant=await resolveRequestTenant(req);
  if(tenant){
    await hydrateSharedMarketStreams(tenant.tenantId);
    const streams=listMarketStreams(tenant.tenantId).filter(s=>s.source==="mt5");
    for(const s of streams){
      const available=(s.meta as any)?.availableForexPairs;
      if(!Array.isArray(available))continue;
      for(const item of available){
        const base=String(item?.base??"").toUpperCase();
        const quote=String(item?.quote??"").toUpperCase();
        if(!/^[A-Z]{3}$/.test(base)||!/^[A-Z]{3}$/.test(quote)||base===quote)continue;
        const pair=normalizeForexPair(base,quote,"mt5");
        merged.set(pair.symbol,{...pair,brokerSymbol:String(item?.brokerSymbol??"")});
        brokerPairs++;
      }
    }
  }

  const pairs=[...merged.values()].sort((a,b)=>{
    const order={major:0,minor:1,exotic:2};
    return order[a.group]-order[b.group]||a.symbol.localeCompare(b.symbol);
  });

  const majors=pairs.filter(x=>x.group==="major");
  const minors=pairs.filter(x=>x.group==="minor");
  const exotics=pairs.filter(x=>x.group==="exotic");

  return NextResponse.json({
    generatedAt:new Date().toISOString(),
    counts:{total:pairs.length,majors:majors.length,minors:minors.length,exotics:exotics.length,broker:brokerPairs},
    pairs,
    providers:forexProviderStatus(),
    catalogMode:brokerPairs>0?"mt5+catalog":"catalog",
    note:brokerPairs>0
      ?"Catálogo sincronizado com os instrumentos Forex disponíveis no MT5 conectado."
      :"Catálogo interno carregado; ao conectar o MT5, os instrumentos reais da corretora são mesclados automaticamente."
  });
}
