// Reenvio do primeiro acesso: regra pura, testável sem Next.js ou Supabase.
// Nunca cria conta, matrícula ou papel; só reenvia o link para quem já tem direito ativo.
import { normalizeEmail } from "../hotmart/core.mjs"

export const RESEND_GENERIC_MESSAGE =
  "Se este e-mail tiver uma matrícula ativa, enviaremos em instantes um e-mail com um link e um código para definir sua senha e acessar o Sistema Guiado de Aprovação. Confira também a caixa de spam."

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
export async function acceptResendRequest({ email, ip, now = new Date() }, deps) {
  const normalized = normalizeResendEmail(email)
  if (!normalized) return { message: RESEND_GENERIC_MESSAGE, outcome: "invalid", deliver: null }

  const emailHash = deps.hash(`email:${normalized}`)
  const ipHash = deps.hash(`ip:${ip || "unknown"}`)
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

/** Etapa posterior: só envia se a conta já existe como aluno com matrícula ativa. */
export async function deliverResend({ email, requestId }, deps) {
  let outcome = "skipped"
  try {
    const eligible = await deps.hasActiveStudentAccess(email)
    if (eligible) {
      await deps.sendAccessEmail(email)
      outcome = "sent"
    }
  } catch {
    outcome = "failed"
  }
  await deps.updateOutcome(requestId, outcome)
  return outcome
}
