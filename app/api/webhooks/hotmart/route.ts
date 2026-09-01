import { NextRequest, NextResponse } from "next/server"
import {
  HotmartConflictError,
  HotmartPayloadError,
  processHotmartEvent,
} from "@/lib/hotmart/core.mjs"
import { createHotmartRepository } from "@/lib/hotmart/supabase-repository"
import { hottokMatches } from "@/lib/hotmart/security.mjs"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  const hottok = process.env.HOTMART_HOTTOK
  if (!hottok) {
    return NextResponse.json({ error: "Webhook não configurado." }, { status: 503 })
  }

  if (!hottokMatches(request.headers.get("x-hotmart-hottok"), hottok)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 })
  }

  try {
    const result = await processHotmartEvent(payload, createHotmartRepository())
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    if (error instanceof HotmartPayloadError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (error instanceof HotmartConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }

    const eventId =
      payload && typeof payload === "object" && "id" in payload
        ? String((payload as { id?: unknown }).id ?? "")
        : ""
    console.error("[hotmart-webhook] Falha no processamento", { eventId })
    return NextResponse.json({ error: "Falha temporária no processamento." }, { status: 500 })
  }
}


