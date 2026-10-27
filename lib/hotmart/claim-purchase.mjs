// Autoatendimento "Encontrar minha compra": o aluno informa o código da
// transação (HP…) e a plataforma confere a venda na API da Hotmart.
// Regras de segurança:
// - O acesso só é criado se a venda está paga e a oferta libera o curso
//   (mesma regra do webhook: produto mapeado + oferta autorizada).
// - O link vai SEMPRE para o e-mail da própria compra, nunca para um e-mail
//   digitado; a resposta mostra esse e-mail mascarado.
// - Nunca promove administradores nem cria acesso a curso não publicado.
import { evaluateOffer, normalizeOfferCode, processHotmartEvent } from "./core.mjs"

export const CLAIM_MESSAGES = Object.freeze({
  invalid: "Digite o código da transação como aparece no e-mail da Hotmart: começa com HP, seguido de números (ex.: HP1234567890).",
  not_found: "Não encontramos uma compra aprovada com esse código. Confira o código no e-mail de confirmação da Hotmart. Compras por boleto ou Pix só aparecem depois que o pagamento é aprovado.",
  not_sga: "Encontramos essa compra, mas ela não é de um curso com o Sistema Guiado da Aprovação (SGA).",
  course_only: "Encontramos sua compra, mas a oferta adquirida é somente do curso e não inclui o Sistema Guiado da Aprovação (SGA). Se quiser incluir o SGA, fale com o suporte.",
  review: "Não conseguimos confirmar essa compra automaticamente. Fale com o suporte e informe o código da transação.",
  pending: "Encontramos sua compra, mas o pagamento está pendente ou em atraso na Hotmart. O acesso é liberado automaticamente assim que o pagamento for confirmado.",
  canceled: "Encontramos essa compra, mas ela foi cancelada, reembolsada ou expirou na Hotmart, por isso não há acesso ligado a ela. Se acha que é um engano, fale com o suporte.",
  limited: "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.",
  error: "A Hotmart não respondeu agora. Tente novamente em alguns minutos.",
})

/** Normaliza "hp 1234-5678" → "HP12345678"; null se não parecer um código Hotmart. */
export function normalizeTransactionCode(value) {
  if (typeof value !== "string") return null
  const code = value.toUpperCase().replace(/[\s.\-_/]/g, "")
  return /^HP[0-9A-Z]{6,30}$/.test(code) ? code : null
}

/** jo***@gmail.com — suficiente para a pessoa reconhecer o e-mail sem expô-lo. */
export function maskEmail(email) {
  const [user, domain] = String(email ?? "").split("@")
  if (!user || !domain) return "o e-mail da compra"
  const visible = user.length <= 2 ? user.slice(0, 1) : user.slice(0, 2)
  return `${visible}***@${domain}`
}

/**
 * @param {string} rawCode código digitado
 * @param {{
 *   sales: { findPaidSaleByTransaction(code: string): Promise<any> },
 *   repository: any,                       // repositório Hotmart (já filtrado para cursos publicados)
 *   sendAccessEmail(email: string): Promise<"sent" | "cooldown" | void>,
 * }} deps
 */
const NEGATIVE_EVENTS = new Set(["PURCHASE_REFUNDED", "PURCHASE_CHARGEBACK", "PURCHASE_CANCELED", "PURCHASE_EXPIRED"])

function grantedMessage(sent, maskedEmail) {
  return sent === "cooldown"
    ? `Sua compra está confirmada e o acesso está liberado. Um link foi enviado há pouco para ${maskedEmail} (o e-mail da compra): use o e-mail mais recente.`
    : `Compra confirmada e acesso liberado! Enviamos o link de acesso para ${maskedEmail} (o e-mail usado na compra). Abra o e-mail mais recente e toque em "Continuar" para criar sua senha.`
}

/**
 * Primeiro tenta com o que a plataforma já registrou pelo webhook (sem depender
 * da API da Hotmart): direito já ligado a uma conta, ou oferta "curso apenas".
 * Devolve null quando só a API consegue responder.
 */
async function claimFromLocalRecords(local, deps) {
  if (!local) return null
  const { entitlement, event } = local

  if (entitlement) {
    if (entitlement.status === "suspended") return { status: "pending", message: CLAIM_MESSAGES.pending }
    if (entitlement.status === "revoked") return { status: "canceled", message: CLAIM_MESSAGES.canceled }
    if (entitlement.status === "active" && entitlement.email) {
      if (entitlement.role === "admin") return { status: "review", message: CLAIM_MESSAGES.review }
      const maskedEmail = maskEmail(entitlement.email)
      if (!await deps.hasActiveStudentAccess(entitlement.email)) return { status: "review", message: CLAIM_MESSAGES.review }
      const sent = await deps.sendAccessEmail(entitlement.email)
      return { status: "granted", maskedEmail, message: grantedMessage(sent, maskedEmail) }
    }
  }

  if (event) {
    if (NEGATIVE_EVENTS.has(event.latestType)) return { status: "canceled", message: CLAIM_MESSAGES.canceled }
    if (event.latestType === "PURCHASE_DELAYED") return { status: "pending", message: CLAIM_MESSAGES.pending }
    const mapping = event.productUcode ? await deps.repository.findProductMapping(event.productUcode) : null
    if (mapping?.active && event.offerCode &&
        evaluateOffer(mapping, normalizeOfferCode(event.offerCode)).verdict === "non_granting") {
      return { status: "course_only", message: CLAIM_MESSAGES.course_only }
    }
  }
  return null
}

export async function claimPurchaseByTransaction(rawCode, deps) {
  const code = normalizeTransactionCode(rawCode)
  if (!code) return { status: "invalid", message: CLAIM_MESSAGES.invalid }

  let knownLocally = false
  if (deps.local) {
    const records = await deps.local.findByTransaction(code)
    const local = await claimFromLocalRecords(records, deps)
    if (local) return local
    knownLocally = Boolean(records)
  }

  let sale
  try {
    sale = await deps.sales.findPaidSaleByTransaction(code)
  } catch (error) {
    // A compra existe nos registros do webhook, mas falta o e-mail do comprador:
    // sem a API, quem confere é o suporte (em vez de "tente mais tarde").
    if (knownLocally) return { status: "review", message: CLAIM_MESSAGES.review }
    throw error
  }
  if (!sale) return { status: "not_found", message: CLAIM_MESSAGES.not_found }

  const maskedEmail = maskEmail(sale.email)
  const mapping = await deps.repository.findProductMapping(sale.productUcode)
  if (!mapping?.active) return { status: "not_sga", message: CLAIM_MESSAGES.not_sga }

  const verdict = evaluateOffer(mapping, normalizeOfferCode(sale.offerCode)).verdict
  if (verdict === "non_granting") return { status: "course_only", message: CLAIM_MESSAGES.course_only, maskedEmail }
  if (verdict !== "granting") return { status: "review", message: CLAIM_MESSAGES.review }

  const userId = await deps.repository.findUserByEmail(sale.email)
  if (userId && await deps.repository.getProfileRole(userId) === "admin") {
    return { status: "review", message: CLAIM_MESSAGES.review }
  }

  // Mesmo caminho idempotente do webhook: se a compra já gerou acesso, o evento
  // é ignorado como obsoleto e o acesso existente continua valendo.
  await processHotmartEvent({
    id: `claim:${sale.transaction}:${sale.approvedDate}`,
    event: "PURCHASE_APPROVED", version: "2.0.0", creation_date: sale.approvedDate,
    data: {
      product: { id: sale.productId, ucode: sale.productUcode },
      buyer: { email: sale.email, name: sale.fullName, ucode: sale.buyerUcode },
      purchase: { transaction: sale.transaction, offer: { code: sale.offerCode } },
    },
  }, deps.repository)

  const hasAccess = await deps.hasActiveStudentAccess(sale.email)
  if (!hasAccess) return { status: "review", message: CLAIM_MESSAGES.review }

  const sent = await deps.sendAccessEmail(sale.email)
  return { status: "granted", maskedEmail, message: grantedMessage(sent, maskedEmail) }
}
