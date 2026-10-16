// Reenvio do primeiro acesso: regra pura, testável sem Next.js ou Supabase.
// O reenvio usa somente matrículas existentes; não consulta vendas nem cria contas.
import { normalizeEmail } from "../hotmart/core.mjs"

export const RESEND_GENERIC_MESSAGE =
  "Se este e-mail tiver uma matrícula ativa, enviaremos as instruções de acesso. Confira a caixa de entrada, o spam e a aba Promoções. Se você ainda não tem matrícula ou não receber a mensagem, fale com o suporte pelo WhatsApp (85) 99688-5832."

export const RESEND_LIMITS = Object.freeze({
  windowMinutes: 60,
  perEmail: 3,
  perIp: 10,
  global: 120,
})

export function normalizeResendEmail(value) {
  if (typeof value !== "string" || value.length > 320) return null
  try {
    return normalizeEmail(value)
  } catch {
    return null
  }
}

export function clientIpFrom(headers) {
  const get = (name) => (typeof headers?.get === "function" ? headers.get(name) : null)
  const candidate = get("x-real-ip") ?? get("x-forwarded-for")?.split(",")[0] ?? ""
  const ip = candidate.trim()
  return ip && ip.length <= 64 ? ip : "unknown"
}

export function isRateLimited(counts, limits = RESEND_LIMITS) {
  return counts.email >= limits.perEmail || counts.ip >= limits.perIp || counts.total >= limits.global
}

/**
 * Etapa síncrona: valida o formato, aplica o limite e registra a tentativa.
 * A resposta é sempre a mesma mensagem genérica, exista ou não o e-mail.
 * Retorna `deliver` quando a verificação de direito e o envio devem continuar
 * (de preferência após a resposta, para não revelar diferença de tempo).
 */
export async function acceptResendRequest({ email, ip, requestKey, now = new Date() }, deps) {
  const normalized = normalizeResendEmail(email)
  if (!normalized) return { message: RESEND_GENERIC_MESSAGE, outcome: "invalid", deliver: null }

  const emailHash = deps.hash(`email:${normalized}`)
  const ipHash = deps.hash(`ip:${ip || "unknown"}`)
  if (deps.reserve) {
    const reservation = await deps.reserve({ emailHash, ipHash, requestKey })
    return {
      message: RESEND_GENERIC_MESSAGE,
      outcome: reservation.accepted ? "accepted" : "limited",
      deliver: reservation.accepted ? () => deliverResend({ email: normalized, requestId: reservation.requestId }, deps) : null,
    }
  }
  const since = new Date(now.getTime() - RESEND_LIMITS.windowMinutes * 60_000)
  const counts = await deps.countRecent({ emailHash, ipHash, since })

  if (isRateLimited(counts)) {
    await deps.record({ emailHash, ipHash, outcome: "limited" })
    return { message: RESEND_GENERIC_MESSAGE, outcome: "limited", deliver: null }
  }

  const requestId = await deps.record({ emailHash, ipHash, outcome: "accepted" })
  return {
    message: RESEND_GENERIC_MESSAGE,
    outcome: "accepted",
    deliver: () => deliverResend({ email: normalized, requestId }, deps),
  }
}

/** Grupo não é requisito: só matrícula ativa em curso publicado e sem bloqueio. */
export async function deliverResend({ email, requestId }, deps) {
  let outcome = "skipped"
  try {
    const eligible = await deps.hasActiveStudentAccess(email)
    if (eligible) {
      // "cooldown": o Auth recusou porque o mesmo e-mail acabou de receber um link
      // (cliques repetidos). O link anterior continua válido; não é falha.
      const sent = await deps.sendAccessEmail(email)
      outcome = sent === "cooldown" ? "limited" : "sent"
    }
  } catch {
    outcome = "failed"
  }
  await deps.updateOutcome(requestId, outcome)
  return outcome
}
