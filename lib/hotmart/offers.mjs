// Lógica pura das ofertas Hotmart, testável sem Next.js ou Supabase.

const OFFER_CODE_PATTERN = /^[a-z0-9_-]{1,64}$/

/**
 * Aceita o código puro da oferta (ex.: 4e4p713s) ou o link do checkout com ?off=...
 * Retorna o código normalizado ou null quando inválido.
 */
export function parseOfferInput(value) {
  const raw = typeof value === "string" ? value.trim() : ""
  if (!raw) return null
  let code = raw
  if (/^https?:\/\//i.test(raw)) {
    try {
      code = new URL(raw).searchParams.get("off") ?? ""
    } catch {
      return null
    }
  }
  code = code.trim().toLowerCase()
  return OFFER_CODE_PATTERN.test(code) ? code : null
}

/** Resumo de configuração para o painel: uma regra restrita sem oferta liberadora não libera ninguém. */
export function offerConfigurationWarning(policy, rules) {
  if (policy !== "authorized_offers") return null
  if (!rules.some((rule) => rule.grantsAccess)) {
    return "Nenhuma oferta libera acesso: compras deste produto não criarão matrículas até que uma oferta autorizada seja cadastrada."
  }
  return null
}
