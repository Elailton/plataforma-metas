// Aviso de senha fraca no primeiro acesso. Só orienta: o aluno pode continuar
// com qualquer senha de 8+ caracteres (regra mínima do Supabase Auth).

const COMMON = new Set([
  "12345678", "123456789", "1234567890", "87654321", "11111111", "00000000",
  "password", "password1", "senha123", "senha1234", "senhasenha", "qwertyui",
  "qwerty123", "abcd1234", "abc12345", "iloveyou", "brasil123", "mudar123",
  "admin123", "12341234", "12121212", "a1b2c3d4", "aaaaaaaa", "asdfghjk",
])

const SEQUENCES = ["0123456789", "9876543210", "abcdefghijklmnopqrstuvwxyz", "qwertyuiop", "asdfghjkl"]

/**
 * Retorna o motivo do aviso, ou null quando a senha não parece fraca.
 * @param {string} password
 * @returns {"common" | "repeated" | "sequence" | "simple" | null}
 */
export function weakPasswordReason(password) {
  const value = String(password ?? "")
  if (value.length < 8) return null // tamanho mínimo é tratado à parte
  const lower = value.toLowerCase()
  if (COMMON.has(lower)) return "common"
  if (/^(.)\1+$/.test(value) || /^(.{1,4})\1+$/.test(lower)) return "repeated"
  if (SEQUENCES.some((sequence) => sequence.includes(lower))) return "sequence"
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((pattern) => pattern.test(value)).length
  if (kinds <= 1 || (kinds === 2 && value.length < 10)) return "simple"
  return null
}

export const WEAK_PASSWORD_HINT =
  "Senha fraca: é fácil de adivinhar. Você pode continuar com ela, mas recomendamos misturar letras maiúsculas, minúsculas, números e símbolos."
