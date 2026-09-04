// Lógica pura do fluxo de confirmação por e-mail (convite de primeiro acesso).
// Mantida sem dependências do Next.js para poder ser testada com node:test,
// no mesmo padrão usado em lib/hotmart/core.mjs.

// Único tipo de OTP aceito por este endpoint. Mantemos a lista fechada de
// propósito: este fluxo existe apenas para o convite de primeiro acesso, não
// para reabrir um endpoint genérico de verificação do Supabase Auth.
export const ALLOWED_OTP_TYPES = Object.freeze(["invite"])

// Lista fechada de destinos internos permitidos após a confirmação. Qualquer
// valor de "next" que não esteja exatamente nesta lista é ignorado e
// substituído pelo destino padrão, para que a URL nunca vire um open redirect.
export const ALLOWED_NEXT_PATHS = Object.freeze(["/auth/primeiro-acesso"])

export const DEFAULT_NEXT_PATH = "/auth/primeiro-acesso"

function textOrNull(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function resolveNextPath(next) {
  const requested = textOrNull(next)
  if (requested && ALLOWED_NEXT_PATHS.includes(requested)) {
    return requested
  }
  return DEFAULT_NEXT_PATH
}

/**
 * Valida os parâmetros recebidos em `/auth/confirm` antes de chamar
 * `supabase.auth.verifyOtp`. Não faz nenhuma chamada de rede: apenas decide
 * se a requisição pode seguir e qual destino interno usar.
 */
export function resolveConfirmRequest({ tokenHash, type, next } = {}) {
  const normalizedTokenHash = textOrNull(tokenHash)
  const normalizedType = textOrNull(type)

  if (!normalizedTokenHash) {
    return { valid: false, errorCode: "missing_token" }
  }

  if (!normalizedType || !ALLOWED_OTP_TYPES.includes(normalizedType)) {
    return { valid: false, errorCode: "invalid_type" }
  }

  return {
    valid: true,
    tokenHash: normalizedTokenHash,
    type: normalizedType,
    next: resolveNextPath(next),
  }
}
