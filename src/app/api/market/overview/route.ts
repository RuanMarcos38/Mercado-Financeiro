import { NextResponse } from "next/server";
import { getPublicB3Assets, getPublicIbov } from "@/lib/public/brapi";
import { getBrazilMacro, getLatestPtax } from "@/lib/public/bcb";
import { analyzeCandles } from "@/lib/analysis-engine";

export const dynamic="force-dynamic";

export async function GET(){
  const [assetsResult,ibovResult,macroResult,ptaxResult]=await Promise.allSettled([
    getPublicB3Assets(),
    getPublicIbov(),
    getBrazilMacro(),
    getLatestPtax()
  ]);

  const rawAssets=assetsResult.status==="fulfilled"?assetsResult.value:[];
  const assets=rawAssets.map((a:any)=>{
    if(!a.ok) return a;
    let analysis=null;
    try{
      if(Array.isArray(a.candles) && a.candles.length>=30){
        analysis=analyzeCandles(a.candles,{sourceQuality:"delayed",newsRisk:.15,macroBias:0});
      }
    }catch{}
    return {...a,analysis};
  });

  const ibov=ibovResult.status==="fulfilled"?ibovResult.value:null;
  let ibovWithAnalysis:any=ibov;
  if(ibov && (ibov as any).ok && Array.isArray((ibov as any).candles)){
    try{
      ibovWithAnalysis={...ibov,analysis:analyzeCandles((ibov as any).candles,{sourceQuality:"delayed",newsRisk:.18})};
    }catch{}
  }

  return NextResponse.json({
    generatedAt:new Date().toISOString(),
    refreshSeconds:60,
    upstream:{
      brapi:{
        type:"public-delayed",
        cadence:"aprox. 30 min no acesso gratuito",
        note:"O backend consulta a cada 60s, mas a fonte gratuita pode manter o mesmo preço entre atualizações."
      },
      bcb:{
        type:"official",
        cadence:"conforme série/boletim",
        note:"PTAX, Selic e IPCA são dados oficiais do Banco Central."
      }
    },
    assets,
    ibov:ibovWithAnalysis,
    ptax:ptaxResult.status==="fulfilled"?ptaxResult.value:null,
    macro:macroResult.status==="fulfilled"?macroResult.value:null,
    unavailable:[
      {symbol:"WIN",name:"Mini Índice",reason:"Exige feed intradiário autorizado/licenciado para não exibir preço fictício."},
      {symbol:"WDO",name:"Mini Dólar",reason:"PTAX é exibida como referência oficial; WDO intradiário exige feed autorizado."},
      {symbol:"XAU",name:"Ouro",reason:"Conector de preço profissional permanece opcional; sem valor inventado."}
    ]
  });
}
