import { NextResponse } from "next/server";
import { getPublicB3Assets } from "@/lib/public/brapi";
import { analyzeCandles } from "@/lib/analysis-engine";

export const dynamic = "force-dynamic";

type MarketCandle = {time:string;open:number;high:number;low:number;close:number;volume?:number;symbol?:string};

function ageMinutes(value:unknown){
  if(typeof value!=="string" || !value.trim()) return null;
  const time=Date.parse(value);
  return Number.isFinite(time)?Math.max(0,Math.round((Date.now()-time)/60000)):null;
}

export async function GET(){
  try{
    const assets=await getPublicB3Assets();
    const items=assets.map((asset:any)=>{
      const candles=Array.isArray(asset.candles)?asset.candles as MarketCandle[]:[];
      const timestamp=asset.marketTime??candles.at(-1)?.time??null;
      const age=ageMinutes(timestamp);
      const stale=asset.delayed!==false || age===null || age>15;
      let analysis:ReturnType<typeof analyzeCandles>|null=null;
      if(asset.ok && candles.length>=30){
        try{analysis=analyzeCandles(candles as Parameters<typeof analyzeCandles>[0],{sourceQuality:stale?"delayed":"imported",newsRisk:.15});}catch{}
      }
      const rawSide=analysis?.signal.side??"AGUARDAR";
      return {
        symbol:String(asset.symbol??""),
        price:typeof asset.price==="number" && Number.isFinite(asset.price)?asset.price:null,
        currency:asset.currency??"BRL",
        marketTime:timestamp,
        ageMinutes:age,
        source:"brapi",
        delayed:stale,
        candlesCount:candles.length,
        regime:analysis?.regime??null,
        indicators:analysis?.indicators??null,
        rawSignal:rawSide,
        decision:stale||!analysis?"AGUARDAR":rawSide,
        confidenceScore:analysis?.signal.confidence??null,
        reasons:analysis?.signal.reasons??[],
        warning:stale?"Cotação atrasada ou sem horário verificável. Sinal não acionável.":!analysis?"Histórico insuficiente para análise.":null
      };
    });
    return NextResponse.json({
      skill:"trader-skill-pro",version:"1.0.0",mode:"analysis-only",ordersEnabled:false,
      generatedAt:new Date().toISOString(),source:"brapi (reutiliza adaptador MercadoAI)",
      confidenceMeaning:"pontuação heurística, não probabilidade de acerto",
      disclaimer:"Informação educacional; não é recomendação individualizada nem promessa de retorno.",
      assets:items
    },{headers:{"Cache-Control":"no-store"}});
  }catch{
    return NextResponse.json({error:"Dados de mercado indisponíveis; não serão gerados sinais alternativos."},{status:503});
  }
}
