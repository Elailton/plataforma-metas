"use client"

import { Analytics } from "@vercel/analytics/next"

// Remove parâmetros e fragmento antes de enviar à Vercel: links de acesso
// (ex.: /auth/confirm?token_hash=...) nunca podem sair da plataforma.
function stripQueryAndHash(url: string) {
  const cut = url.search(/[?#]/)
  return cut === -1 ? url : url.slice(0, cut)
}

export function SafeAnalytics() {
  return <Analytics beforeSend={(event) => ({ ...event, url: stripQueryAndHash(event.url) })} />
}
