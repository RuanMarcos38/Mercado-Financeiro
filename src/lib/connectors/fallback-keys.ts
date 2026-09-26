import crypto from "node:crypto";

export type FallbackConnectorKey={
  id:string;
  tenantId:string;
  label:string;
  source:"mt5"|"profit"|"generic";
  keyHash:string;
  last4:string;
  active:boolean;
  createdAt:string;
  lastSeenAt:string|null;
};

const g=globalThis as typeof globalThis & {
  __fallbackConnectorKeys?:FallbackConnectorKey[];
};
if(!g.__fallbackConnectorKeys)g.__fallbackConnectorKeys=[];

function hash(v:string){
  return crypto.createHash("sha256").update(v).digest("hex");
}

export function createFallbackConnectorKey(tenantId:string,label:string,source:FallbackConnectorKey["source"]){
  const plain="mai_"+crypto.randomBytes(32).toString("base64url");
  const row:FallbackConnectorKey={
    id:crypto.randomUUID(),
    tenantId,label,source,
    keyHash:hash(plain),
    last4:plain.slice(-4),
    active:true,
    createdAt:new Date().toISOString(),
    lastSeenAt:null
  };
  g.__fallbackConnectorKeys!.unshift(row);
  return {plain,row};
}

export function listFallbackConnectorKeys(tenantId:string){
  return g.__fallbackConnectorKeys!.filter(x=>x.tenantId===tenantId);
}

export function revokeFallbackConnectorKey(tenantId:string,id:string){
  const row=g.__fallbackConnectorKeys!.find(x=>x.tenantId===tenantId&&x.id===id);
  if(!row)return false;
  row.active=false;
  return true;
}

export function resolveFallbackConnectorKey(value:string){
  const h=hash(value);
  const row=g.__fallbackConnectorKeys!.find(x=>x.keyHash===h&&x.active);
  if(!row)return null;
  row.lastSeenAt=new Date().toISOString();
  return row;
}
