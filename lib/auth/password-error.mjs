// Traduz a recusa do Supabase Auth ao definir senha em uma orientação clara.
// A proteção contra senhas vazadas devolve "weak_password"; sem esta mensagem,
// o aluno achava que o link tinha falhado e pedia novos convites.

export const WEAK_PASSWORD_MESSAGE =
  "Essa senha foi recusada por ser muito comum. Escolha outra, de preferência misturando letras, números e símbolos. Seu link continua valendo."

export const SAME_PASSWORD_MESSAGE = "A nova senha precisa ser diferente da atual."

export const SESSION_EXPIRED_MESSAGE =
  "Seu link de acesso expirou. Peça um novo em \"Reenviar acesso\" e use o link mais recente do e-mail."

export const GENERIC_PASSWORD_MESSAGE =
  "Não foi possível definir sua senha. Tente novamente; se continuar, peça um novo link em \"Reenviar acesso\"."

/** @param {{ code?: string, message?: string, status?: number } | null | undefined} error */
export function passwordErrorMessage(error) {
  const code = String(error?.code ?? "")
  const message = String(error?.message ?? "").toLowerCase()
  if (code === "weak_password" || message.includes("weak") || message.includes("pwned")) return WEAK_PASSWORD_MESSAGE
  if (code === "same_password" || message.includes("different from the old")) return SAME_PASSWORD_MESSAGE
  if (code === "session_not_found" || code === "session_expired" || error?.status === 401 || message.includes("session")) {
    return SESSION_EXPIRED_MESSAGE
  }
  return GENERIC_PASSWORD_MESSAGE
}
