// Lógica pura do fluxo de confirmação por e-mail (convite de primeiro acesso).
// Mantida sem dependências do Next.js para poder ser testada com node:test,
// no mesmo padrão usado em lib/hotmart/core.mjs.

// Tipos de OTP aceitos para definir uma senha. A lista continua fechada para
// não transformar esta rota em um verificador genérico do Supabase Auth.
// `recovery` é necessário quando uma conta existente precisa receber um novo
// link após o convite original expirar ou o perfil público ser reparado.
export const ALLOWED_OTP_TYPES = Object.freeze(["invite", "recovery"])

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

// Código numérico enviado no e-mail (o Supabase usa de 6 a 10 dígitos, conforme a
// configuração do projeto). Espaços e hífens colados junto são ignorados.
export function normalizeAccessCode(value) {
  if (typeof value !== "string") return null
  const digits = value.replace(/[\s-]/g, "")
  return /^\d{6,10}$/.test(digits) ? digits : null
}

// Ordem de tentativa ao validar um código: o e-mail mais comum hoje é o de
// "Reenviar acesso" (recovery); o convite original vem em seguida.
export const ACCESS_CODE_TYPES = Object.freeze(["recovery", "invite"])

/**
 * Monta o link de acesso que o administrador copia para o aluno. Aponta para a
 * página `/auth/confirm` da própria plataforma, que só consome o token quando a
 * pessoa aperta "Continuar".
 */
export function buildAccessLink(siteUrl, tokenHash, type = "recovery") {
  const normalizedTokenHash = textOrNull(tokenHash)
  if (!normalizedTokenHash) throw new Error("Token de acesso ausente.")
  if (!ALLOWED_OTP_TYPES.includes(type)) throw new Error("Tipo de acesso inválido.")
  const url = new URL("/auth/confirm", siteUrl)
  url.searchParams.set("token_hash", normalizedTokenHash)
  url.searchParams.set("type", type)
  url.searchParams.set("next", DEFAULT_NEXT_PATH)
  return url.toString()
}
