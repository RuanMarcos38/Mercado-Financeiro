import { NextRequest,NextResponse } from "next/server";
import { ingestMarketPush,type MarketPush } from "@/lib/connectors/market-stream";
import { processStream } from "@/lib/autotrade/engine";
import { resolveRequestTenant } from "@/lib/auth/request-tenant";
import { getExternalMarketContext } from "@/lib/market-intelligence/external-context";
import { notifyTenantOpportunity } from "@/lib/notifications/whatsapp";
import { persistSharedMarketStream } from "@/lib/connectors/shared-streams";

export const dynamic="force-dynamic";

type BatchBody={items:MarketPush[]};

const FALLBACK_EXTERNAL={
  newsRisk:.15,
  headlines:0,
  updatedAt:new Date(0).toISOString(),
  source:"technical-scan"
};

export async function POST(req:NextRequest){
  const tenant=await resolveRequestTenant(req,{allowConnector:true});
  if(!tenant)return NextResponse.json({error:"Não autorizado"},{status:401});

  try{
    const body=await req.json() as BatchBody;
    if(!Array.isArray(body.items)||!body.items.length)throw new Error("items é obrigatório");
    if(body.items.length>80)throw new Error("Máximo de 80 streams por lote");

    const results=[];
    for(const item of body.items){
      try{
        if(!["mt5","profit"].includes(item.source))throw new Error("source inválido");
        if(!item.symbol||!item.timeframe||!Array.isArray(item.candles))throw new Error("stream incompleto");

        const saved=ingestMarketPush(tenant.tenantId,item);
        await persistSharedMarketStream(saved);

        let external={...FALLBACK_EXTERNAL,symbol:saved.symbol};
        let decision=processStream(tenant.tenantId,{
          source:saved.source,symbol:saved.symbol,timeframe:saved.timeframe,lastSeen:saved.lastSeen,candles:saved.candles,
          bid:saved.bid,ask:saved.ask,spread:saved.spread,
          meta:{...(saved.meta??{}),assetClass:item.assetClass,externalContext:external},
          newsRisk:external.newsRisk
        });

        const c=decision.candidate;
        if(c&&(c.status==="APTO"||c.preAlert||c.watch)){
          external=await getExternalMarketContext(saved.symbol,item.assetClass);
          decision=processStream(tenant.tenantId,{
            source:saved.source,symbol:saved.symbol,timeframe:saved.timeframe,lastSeen:saved.lastSeen,candles:saved.candles,
            bid:saved.bid,ask:saved.ask,spread:saved.spread,
            meta:{...(saved.meta??{}),assetClass:item.assetClass,externalContext:external},
            newsRisk:external.newsRisk
          });
        }

        if(decision.ready&&decision.candidate?.status==="APTO"){
          notifyTenantOpportunity(tenant.tenantId,decision.candidate).catch(()=>{});
        }

        results.push({
          ok:true,source:saved.source,symbol:saved.symbol,timeframe:saved.timeframe,
          candles:saved.candles.length,lastSeen:saved.lastSeen,
          status:decision.candidate?.status??"AGUARDAR",
          side:decision.candidate?.side??null,
          confidence:decision.candidate?.confidence??0
        });
      }catch(error){
        results.push({ok:false,error:error instanceof Error?error.message:"Falha no stream"});
      }
    }

    return NextResponse.json({
      ok:results.every(x=>x.ok),
      processed:results.length,
      success:results.filter(x=>x.ok).length,
      failed:results.filter(x=>!x.ok).length,
      results
    });
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Lote inválido"},{status:400});
  }
}
