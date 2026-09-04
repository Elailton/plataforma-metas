import { createClient } from "@/lib/supabase/server"
import { resolveConfirmRequest } from "@/lib/auth/confirm.mjs"
import { NextRequest, NextResponse } from "next/server"

// Endpoint SSR de confirmação de e-mail (convite de primeiro acesso).
// Segue o fluxo recomendado pelo Supabase para SSR: token_hash + verifyOtp,
// em vez de depender do fragmento (#access_token=...) da confirmação padrão,
// que nunca chega a um Route Handler.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl

  const resolved = resolveConfirmRequest({
    tokenHash: searchParams.get("token_hash"),
    type: searchParams.get("type"),
    next: searchParams.get("next"),
  })

  if (!resolved.valid) {
    return NextResponse.redirect(`${origin}/auth/error?error=${resolved.errorCode}`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({
    token_hash: resolved.tokenHash,
    type: resolved.type,
  })

  if (error) {
    return NextResponse.redirect(`${origin}/auth/error?error=invalid_token`)
  }

  return NextResponse.redirect(`${origin}${resolved.next}`)
}
