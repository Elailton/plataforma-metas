// Reprocessar compras pendentes (Fase C): lógica pura, sem Next.js nem Supabase.
//
// Uma transação é "pendente" quando a Hotmart avisou a compra, mas ela não gerou
// direito (produto/oferta ainda sem cadastro, aviso perdido etc.). O reprocessamento
// usa o mesmo caminho idempotente do webhook ("Compra concluída"): só cria direito
// novo, nunca altera um existente, e cada transação tem um id de evento fixo.

import { evaluateOffer, HOTMART_TEST_PRODUCT_UCODE, normalizeOfferCode } from "./core.mjs"

/** Orçamento do Resend gratuito (100/dia) com folga para os convites normais. */
export const REPROCESS_DAILY_LIMIT = 20
export const REPROCESS_EVENT_PREFIX = "reprocess:"

const POSITIVE = new Set(["PURCHASE_APPROVED", "PURCHASE_COMPLETE"])
const FINAL_NEGATIVE = new Set(["PURCHASE_REFUNDED", "PURCHASE_CHARGEBACK", "PURCHASE_CANCELED", "PURCHASE_EXPIRED"])
const ORDERED = new Set([...POSITIVE, ...FINAL_NEGATIVE, "PURCHASE_DELAYED"])

export function reprocessEventId(transaction) {
  return `${REPROCESS_EVENT_PREFIX}${transaction}`
}

export function maskEmail(email) {
  if (typeof email !== "string" || !email.includes("@")) return "—"
  const [local, domain] = email.split("@")
  return `${local.slice(0, 2)}${"*".repeat(Math.max(1, Math.min(local.length - 2, 6)))}@${domain}`
}

function levenshtein(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 3
  const row = Array.from({ length: b.length + 1 }, (_, index) => index)
  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0]
    row[0] = i
    for (let j = 1; j <= b.length; j += 1) {
      const current = row[j]
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1))
      previous = current
    }
  }
  return row[b.length]
}

/**
 * Conta existente com e-mail parecido: mesmo nome antes do @ em outro domínio (inclui
 * domínio digitado errado) ou, no mesmo domínio, 1 letra de diferença num nome longo.
 * Pode ser a mesma pessoa com e-mail digitado errado na compra. Não guardamos o nome
 * do comprador, então a comparação é só pelo e-mail.
 */
export function findSimilarAccountEmail(email, accountEmails) {
  const [local, domain] = email.split("@")
  for (const candidate of accountEmails) {
    if (candidate === email) continue
    const [candidateLocal, candidateDomain] = candidate.split("@")
    if (local.length >= 4 && candidateLocal === local) return candidate
    if (domain === candidateDomain && local.length >= 6 && levenshtein(local, candidateLocal) <= 1) return candidate
  }
  return null
}

/** Resume os eventos de cada transação na ordem em que chegaram. */
export function summarizeTransactions(events) {
  const byTransaction = new Map()
  const sorted = [...events]
    .filter((event) => event.transaction && !String(event.eventId ?? "").startsWith(REPROCESS_EVENT_PREFIX))
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
  for (const event of sorted) {
    const current = byTransaction.get(event.transaction) ?? {
      transaction: event.transaction, productUcode: event.productUcode, offerCode: null, buyerEmail: null,
      lastType: null, hasPositive: false, hasFinalNegative: false, lastCreatedAt: event.createdAt,
    }
    if (event.offerCode) current.offerCode = normalizeOfferCode(event.offerCode)
    if (event.buyerEmail) current.buyerEmail = event.buyerEmail
    if (ORDERED.has(event.eventType)) current.lastType = event.eventType
    if (POSITIVE.has(event.eventType)) current.hasPositive = true
    if (FINAL_NEGATIVE.has(event.eventType)) current.hasFinalNegative = true
    current.lastCreatedAt = event.createdAt
    current.productUcode = event.productUcode ?? current.productUcode
    byTransaction.set(event.transaction, current)
  }
  return [...byTransaction.values()]
}

/**
 * Prévia sem efeitos. Nada aqui envia e-mail ou grava.
 * @param {object} input
 * @param {Array} input.events eventos do curso: { eventId, transaction, eventType, offerCode, buyerEmail, productUcode, createdAt }
 * @param {Map<string, object>} input.mappings ucode -> mapeamento (como em evaluateOffer)
 * @param {Set<string>} input.entitledTransactions transações que já têm direito
 * @param {Map<string, "student"|"admin"|null>} input.accounts e-mail -> papel da conta existente
 * @param {string} input.courseStatus
 * @param {number} input.usedToday transações reprocessadas hoje (todos os cursos)
 */
export function buildReprocessPreview({
  events, mappings, entitledTransactions, accounts, courseStatus, usedToday = 0, limit = REPROCESS_DAILY_LIMIT,
}) {
  const counts = { alreadyRegistered: 0, refundedOrCanceled: 0, delayed: 0, notApproved: 0, notGranting: 0, withoutEmail: 0, admin: 0 }
  const eligible = []
  const similar = []
  const accountEmails = [...accounts.keys()]

  for (const summary of summarizeTransactions(events)) {
    if (summary.productUcode === HOTMART_TEST_PRODUCT_UCODE || summary.offerCode === "test") continue
    if (entitledTransactions.has(summary.transaction)) { counts.alreadyRegistered += 1; continue }
    if (summary.hasFinalNegative) { counts.refundedOrCanceled += 1; continue }
    if (summary.lastType === "PURCHASE_DELAYED") { counts.delayed += 1; continue }
    if (!summary.hasPositive) { counts.notApproved += 1; continue }
    const mapping = mappings.get(summary.productUcode)
    if (!mapping?.active || evaluateOffer(mapping, summary.offerCode).verdict !== "granting") {
      counts.notGranting += 1; continue
    }
    if (!summary.buyerEmail) { counts.withoutEmail += 1; continue }
    const role = accounts.get(summary.buyerEmail)
    if (role === "admin") { counts.admin += 1; continue }
    const item = {
      transaction: summary.transaction, productUcode: summary.productUcode, offerCode: summary.offerCode,
      email: summary.buyerEmail, maskedEmail: maskEmail(summary.buyerEmail),
      hasAccount: accounts.has(summary.buyerEmail), lastCreatedAt: summary.lastCreatedAt,
    }
    const match = item.hasAccount ? null : findSimilarAccountEmail(summary.buyerEmail, accountEmails)
    if (match) { similar.push({ ...item, similarTo: maskEmail(match) }); continue }
    eligible.push(item)
  }

  eligible.sort((a, b) => Date.parse(a.lastCreatedAt) - Date.parse(b.lastCreatedAt))
  const courseDraft = courseStatus !== "published"
  const remainingToday = Math.max(0, limit - usedToday)
  const batch = courseDraft ? [] : eligible.slice(0, remainingToday)
  return {
    courseDraft, counts, eligible, similar, batch,
    invitesInBatch: batch.filter((item) => !item.hasAccount).length,
    usedToday, limit, remainingToday,
    leftAfterBatch: eligible.length - batch.length,
  }
}

/** Evento sintético do reprocessamento: mesmo caminho do webhook, id fixo por transação. */
export function reprocessPayload(item) {
  return {
    id: reprocessEventId(item.transaction),
    event: "PURCHASE_COMPLETE",
    version: "2.0.0",
    // Data do último aviso recebido: um reembolso posterior continua mais novo.
    creation_date: Date.parse(item.lastCreatedAt),
    data: {
      product: { ucode: item.productUcode },
      buyer: { email: item.email },
      purchase: { transaction: item.transaction, offer: item.offerCode ? { code: item.offerCode } : undefined },
    },
  }
}

/**
 * Executa o lote confirmado: só transações que o admin confirmou E que continuam
 * elegíveis na prévia recalculada agora. Para no limite do dia.
 */
export async function runReprocessBatch({ preview, confirmedTransactions, process }) {
  if (preview.courseDraft) return { status: "draft", processed: 0, skipped: 0, failed: 0, remainingToday: preview.remainingToday }
  const confirmed = new Set(confirmedTransactions)
  const batch = preview.batch.filter((item) => confirmed.has(item.transaction))
  let processed = 0
  let skipped = 0
  let failed = 0
  for (const item of batch) {
    try {
      const result = await process(reprocessPayload(item))
      if (result.outcome === "processed") processed += 1
      else skipped += 1
    } catch {
      failed += 1
    }
  }
  return {
    status: "done", processed, skipped, failed,
    remainingToday: Math.max(0, preview.remainingToday - batch.length),
    leftPending: preview.eligible.length - processed,
  }
}
