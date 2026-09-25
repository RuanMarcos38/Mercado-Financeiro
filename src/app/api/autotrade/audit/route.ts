import { NextResponse } from "next/server";
import { getAudit,listIntents } from "@/lib/autotrade/store";
export const dynamic="force-dynamic";
export async function GET(){return NextResponse.json({generatedAt:new Date().toISOString(),intents:listIntents().slice(0,100),audit:getAudit().slice(0,200)});}
