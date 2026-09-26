import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { TradeCandidate } from "@/lib/autotrade/policy";

const g=globalThis as typeof globalThis & { __waSignalDedup?:Map<string,number> };
if(!g.__waSignalDedup)g.__waSignalDedup=new Map();

type AlertOpportunity=Pick<TradeCandidate,
  "source"|"symbol"|"timeframe"|"status"|"side"|"confidence"|"score"|"entry"|"stopLoss"|"takeProfit"
>;

function dedupKey(tenantId:string,o:AlertOpportunity){
  return [tenantId,o.source,o.symbol,o.timeframe,o.side,o.score].join(":");
}

async function sendTemplate(to:string,o:AlertOpportunity){
  const token=process.env.META_WHATSAPP_TOKEN;
  const phoneId=process.env.META_WHATSAPP_PHONE_NUMBER_ID;
  const template=process.env.META_WHATSAPP_SIGNAL_TEMPLATE;
  const version=process.env.META_GRAPH_VERSION||"v23.0";
  if(!token||!phoneId||!template)return false;

  const body={
    messaging_product:"whatsapp",
    to,
    type:"template",
    template:{
      name:template,
      language:{code:process.env.META_WHATSAPP_TEMPLATE_LANG||"pt_BR"},
      components:[{
        type:"body",
        parameters:[
          {type:"text",text:o.symbol},
          {type:"text",text:o.side==="BUY"?"COMPRA":o.side==="SELL"?"VENDA":"AGUARDAR"},
          {type:"text",text:String(o.confidence)},
          {type:"text",text:String(o.entry)},
          {type:"text",text:String(o.stopLoss??"-")},
          {type:"text",text:String(o.takeProfit??"-")}
        ]
      }]
    }
  };

  const res=await fetch("https://graph.facebook.com/"+version+"/"+phoneId+"/messages",{
    method:"POST",
    headers:{Authorization:"Bearer "+token,"content-type":"application/json"},
    body:JSON.stringify(body)
  });
  return res.ok;
}

export async function notifyTenantOpportunity(tenantId:string,o:AlertOpportunity){
  if(o.status!=="APTO"||!o.side)return false;

  const key=dedupKey(tenantId,o);
  const last=g.__waSignalDedup!.get(key)??0;
  if(Date.now()-last<30*60*1000)return false;

  let to=process.env.MARKET_ALERT_WHATSAPP_E164?.replace(/\D/g,"")||"";
  let minConfidence=Number(process.env.MARKET_ALERT_MIN_CONFIDENCE||75);

  try{
    const admin=createSupabaseAdminClient();
    const {data}=await admin.from("notification_preferences")
      .select("whatsapp_e164,whatsapp_enabled,min_confidence")
      .eq("tenant_id",tenantId)
      .maybeSingle();
    if(data?.whatsapp_enabled&&data.whatsapp_e164){
      to=String(data.whatsapp_e164).replace(/\D/g,"");
      minConfidence=Number(data.min_confidence??minConfidence);
    }
  }catch{
    // fallback para variável de ambiente da implantação
  }

  if(!to||o.confidence<minConfidence)return false;
  const ok=await sendTemplate(to,o);
  if(ok)g.__waSignalDedup!.set(key,Date.now());
  return ok;
}


// Compatibilidade com o Mercado Espelho global: distribui apenas oportunidades APTAS
// para empresas que habilitaram WhatsApp e atingem a confiança mínima.
export async function notifyTenantsForOpportunity(o:AlertOpportunity){
  if(o.status!=="APTO"||!o.side)return;
  try{
    const admin=createSupabaseAdminClient();
    const {data}=await admin.from("notification_preferences")
      .select("tenant_id,whatsapp_e164,whatsapp_enabled,min_confidence")
      .eq("whatsapp_enabled",true);
    for(const p of data??[]){
      if(!p.tenant_id)continue;
      const key=dedupKey(String(p.tenant_id),o);
      const last=g.__waSignalDedup!.get(key)??0;
      if(Date.now()-last<30*60*1000)continue;
      if(!p.whatsapp_e164||o.confidence<Number(p.min_confidence??75))continue;
      const ok=await sendTemplate(String(p.whatsapp_e164).replace(/\D/g,""),o);
      if(ok)g.__waSignalDedup!.set(key,Date.now());
    }
  }catch{
    // Sem Supabase configurado, o fluxo tenant-specific usa fallback de ambiente.
  }
}
