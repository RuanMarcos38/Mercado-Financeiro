import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { GlobalOpportunity } from "@/lib/market-mirror/opportunities";

const g=globalThis as typeof globalThis & { __waSignalDedup?:Map<string,number> };
if(!g.__waSignalDedup)g.__waSignalDedup=new Map();

function dedupKey(tenantId:string,o:GlobalOpportunity){
  return [tenantId,o.source,o.symbol,o.timeframe,o.side,o.score].join(":");
}

async function sendTemplate(to:string,o:GlobalOpportunity){
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

  const res=await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`,{
    method:"POST",
    headers:{Authorization:`Bearer ${token}`,"content-type":"application/json"},
    body:JSON.stringify(body)
  });
  return res.ok;
}

export async function notifyTenantsForOpportunity(o:GlobalOpportunity){
  if(o.status!=="APTO"||!o.side)return;
  try{
    const admin=createSupabaseAdminClient();
    const {data}=await admin.from("notification_preferences")
      .select("tenant_id,whatsapp_e164,whatsapp_enabled,min_confidence")
      .eq("whatsapp_enabled",true);
    for(const p of data??[]){
      if(!p.whatsapp_e164||o.confidence<Number(p.min_confidence??75))continue;
      const key=dedupKey(p.tenant_id,o);
      const last=g.__waSignalDedup!.get(key)??0;
      if(Date.now()-last<30*60*1000)continue;
      if(await sendTemplate(p.whatsapp_e164,o))g.__waSignalDedup!.set(key,Date.now());
    }
  }catch{
    // Sem Supabase/Meta configurado: análise continua normalmente.
  }
}
