import { NextResponse } from "next/server";
import { FOREX_PAIRS,MAJORS,MINORS,EXOTICS } from "@/lib/forex/catalog";
import { forexProviderStatus } from "@/lib/forex/providers";

export async function GET(){
  return NextResponse.json({
    generatedAt:new Date().toISOString(),
    counts:{total:FOREX_PAIRS.length,majors:MAJORS.length,minors:MINORS.length,exotics:EXOTICS.length},
    pairs:FOREX_PAIRS,
    providers:forexProviderStatus(),
    note:"O catálogo cobre os principais pares negociados. A lista exata de instrumentos deve ser sincronizada com o provedor 24h escolhido, pois varia por corretora/feed."
  });
}
