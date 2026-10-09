const ACCESS_EVENT_STATUS = Object.freeze({
  PURCHASE_APPROVED: "active",
  PURCHASE_DELAYED: "suspended",
  PURCHASE_REFUNDED: "revoked",
  PURCHASE_CHARGEBACK: "revoked",
  PURCHASE_CANCELED: "revoked",
  PURCHASE_EXPIRED: "revoked",
})

export class HotmartPayloadError extends Error {
  constructor(message) {
    super(message)
    this.name = "HotmartPayloadError"
  }
}

export class HotmartConflictError extends Error {
  constructor(message) {
    super(message)
    this.name = "HotmartConflictError"
  }
}

function textOrNull(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function identifierOrNull(value) {
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  return textOrNull(value)
}

function creationDateOrNull(value) {
  // O Webhook 2.0.0 da Hotmart documenta creation_date como Unix epoch em
  // milissegundos. Aceitar formatos livres via Date.parse tornaria a ordem dos
  // eventos dependente do parser/timezone do runtime.
  const raw = typeof value === "string" ? value.trim() : value
  if (typeof raw === "string" && !/^\d{13}$/.test(raw)) return null

  const milliseconds = typeof raw === "string" ? Number(raw) : raw
  if (!Number.isSafeInteger(milliseconds)) return null

  const earliestAccepted = Date.UTC(2020, 0, 1)
  const maximumClockSkew = Date.now() + 24 * 60 * 60 * 1000
  if (milliseconds < earliestAccepted || milliseconds > maximumClockSkew) return null

  const date = new Date(milliseconds)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export function normalizeEmail(value) {
  const email = textOrNull(value)?.toLowerCase() ?? ""
  const atIndex = email.indexOf("@")
  const localPart = atIndex > 0 ? email.slice(0, atIndex) : ""
  const domain = atIndex > 0 ? email.slice(atIndex + 1) : ""
  const domainLabels = domain.split(".")
  const validLocalPart =
    localPart.length <= 64 &&
    !localPart.startsWith(".") &&
    !localPart.endsWith(".") &&
    !localPart.includes("..") &&
    /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(localPart)
  const validDomain =
    domain.length <= 253 &&
    domainLabels.length >= 2 &&
    domainLabels.every((label) =>
      /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label),
    )

  if (
    !email ||
    email.length > 254 ||
    atIndex !== email.lastIndexOf("@") ||
    !validLocalPart ||
    !validDomain
  ) {
    throw new HotmartPayloadError("O e-mail do comprador é inválido.")
  }
  return email
}

export function initialsFromName(value) {
  const name = textOrNull(value)
  if (!name) return "AL"

  return (
    name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "AL"
  )
}

export function parseHotmartEvent(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new HotmartPayloadError("O corpo do webhook deve ser um objeto JSON.")
  }

  const eventId = textOrNull(payload.id)
  const eventType = textOrNull(payload.event)
  const version = textOrNull(payload.version)

  if (!eventId || !eventType) {
    throw new HotmartPayloadError("O webhook não contém id e event válidos.")
  }
  if (version !== "2.0.0") {
    throw new HotmartPayloadError("Apenas o Webhook Hotmart 2.0.0 é aceito.")
  }

  const status = ACCESS_EVENT_STATUS[eventType] ?? null
  const productUcode = textOrNull(payload.data?.product?.ucode)
  const productId = identifierOrNull(payload.data?.product?.id)
  const transaction = textOrNull(payload.data?.purchase?.transaction)
  const eventCreationDate = creationDateOrNull(payload.creation_date)
  const buyerUcode = textOrNull(payload.data?.buyer?.ucode)
  const buyerName = textOrNull(payload.data?.buyer?.name)
  const buyerEmailRaw = textOrNull(payload.data?.buyer?.email)
  // Webhook 2.0.0: o código da oferta vem em data.purchase.offer.code
  // (o mesmo valor do parâmetro `off` do checkout). Nunca usar src/sck/bid.
  const offerCode = normalizeOfferCode(payload.data?.purchase?.offer?.code)

  if (status && (!productUcode || !transaction || !buyerEmailRaw || !eventCreationDate)) {
    throw new HotmartPayloadError(
      "O evento de compra não contém comprador, produto, transação ou creation_date válidos.",
    )
  }

  return {
    eventId,
    eventType,
    version,
    status,
    transaction,
    productUcode,
    productId,
    buyerUcode,
    buyerEmail: buyerEmailRaw ? normalizeEmail(buyerEmailRaw) : null,
    buyerName,
    avatarInitials: initialsFromName(buyerName),
    eventCreationDate,
    offerCode,
  }
}

export function normalizeOfferCode(value) {
  const code = identifierOrNull(value)
  if (!code) return null
  const normalized = code.toLowerCase()
  // Códigos de oferta Hotmart são curtos e alfanuméricos; qualquer outra coisa é tratada como ausente.
  return /^[a-z0-9_-]{1,64}$/.test(normalized) ? normalized : null
}

export const OFFER_IGNORED_MESSAGES = Object.freeze({
  non_granting: "Oferta sem direito ao acesso (curso apenas).",
  unknown: "Oferta não cadastrada para este produto; conferir manualmente.",
  missing: "Evento sem código de oferta; conferir manualmente.",
})

/**
 * Decide se a oferta do evento autoriza acesso ao curso do mapeamento.
 * - policy "any" (padrão, comportamento anterior): qualquer oferta do produto autoriza.
 * - policy "authorized_offers": somente ofertas cadastradas com grantsAccess = true.
 *   Uma lista vazia NUNCA significa "qualquer oferta".
 */
export function evaluateOffer(mapping, offerCode) {
  if (!mapping || mapping.offerPolicy !== "authorized_offers") return { restricted: false, verdict: "granting" }
  if (!offerCode) return { restricted: true, verdict: "missing" }
  const rule = (mapping.offers ?? []).find((offer) => normalizeOfferCode(offer.code) === offerCode)
  if (!rule) return { restricted: true, verdict: "unknown" }
  return { restricted: true, verdict: rule.grantsAccess ? "granting" : "non_granting" }
}

function persistedFailureMessage(error) {
  if (error instanceof HotmartConflictError) return "Conflito de identidade ou permissão."
  if (error instanceof HotmartPayloadError) return "Payload inválido."
  return "Falha interna ao processar o evento."
}

export async function processHotmartEvent(payload, repository) {
  const event = parseHotmartEvent(payload)
  const claim = await repository.claimEvent(event)

  if (!claim.claimed) {
    return { outcome: "duplicate", eventId: event.eventId, previousStatus: claim.status }
  }

  const details = { offerCode: event.offerCode }
  try {
    if (!event.status) {
      await repository.finishEvent(event.eventId, "ignored", "Evento sem efeito sobre matrícula.", details)
      return { outcome: "ignored", eventId: event.eventId, offerCode: event.offerCode }
    }
    const mapping = await repository.findProductMapping(event.productUcode)
    if (!mapping || (!mapping.active && event.status === "active")) {
      await repository.finishEvent(event.eventId, "ignored", "Produto sem mapeamento ativo.", details)
      return { outcome: "ignored", eventId: event.eventId, offerCode: event.offerCode }
    }

    // Produtos com ofertas restritas: só uma oferta autorizada cria direito novo.
    const offer = evaluateOffer(mapping, event.offerCode)
    if (offer.restricted && offer.verdict !== "granting") {
      const previous = await repository.findEntitlement(event.transaction)
      const knownTransaction = Boolean(previous && previous.courseId === mapping.courseId)
      // Eventos posteriores podem vir sem a oferta: a transação só herda o vínculo
      // existente se ela foi registrada com uma oferta que libera acesso.
      const previousOfferGrants = knownTransaction &&
        evaluateOffer(mapping, normalizeOfferCode(previous.offerCode)).verdict === "granting"
      const usePreviousLink = previousOfferGrants && offer.verdict === "missing"
      // Revogações sempre atingem o direito da própria transação, se ele existir.
      const negativeOnKnownTransaction = event.status !== "active" && knownTransaction
      // Sem direito anterior, um evento negativo de oferta não elegível não tem o que revogar.
      // Ofertas desconhecidas/ausentes guardam o watermark sem conceder acesso.
      const negativeWatermark = event.status !== "active" && !previous && offer.verdict !== "non_granting"
      if (!usePreviousLink && !negativeOnKnownTransaction && !negativeWatermark) {
        const message = OFFER_IGNORED_MESSAGES[offer.verdict]
        await repository.finishEvent(event.eventId, "ignored", message, details)
        return {
          outcome: "ignored", eventId: event.eventId, courseId: mapping.courseId,
          offerCode: event.offerCode, offerVerdict: offer.verdict,
        }
      }
    }

    let userId = await repository.findUserByEmail(event.buyerEmail)
    const role = userId ? await repository.getProfileRole(userId) : null
    if (role === "admin") {
      throw new HotmartConflictError("O webhook não pode alterar matrículas de uma conta administrativa.")
    }

    if (event.status === "active") {
      // Avoid inviting for an already-obsolete purchase. This read is only an
      // optimization: the atomic RPC checks the watermark again after invite,
      // including a refund arriving between this read and account creation.
      const previous = await repository.findEntitlement(event.transaction)
      if (previous) {
        if (previous.courseId !== mapping.courseId || previous.productUcode !== event.productUcode ||
          (previous.userId && previous.userId !== userId)) {
          throw new HotmartConflictError("Hotmart transaction identity conflict")
        }
        if (Date.parse(event.eventCreationDate) <= Date.parse(previous.eventCreationDate)) {
          await repository.finishEvent(event.eventId, "ignored", "Evento comercial obsoleto para a transação.", details)
          return { outcome: "ignored", eventId: event.eventId, userId,
            courseId: mapping.courseId, entitlementStatus: previous.status }
        }
      }
      if (!userId) {
        userId = await repository.inviteStudent({
          email: event.buyerEmail, fullName: event.buyerName, avatarInitials: event.avatarInitials,
        })
      }
      const ensuredRole = await repository.ensureStudentProfile(userId, {
        fullName: event.buyerName, avatarInitials: event.avatarInitials,
      })
      if (ensuredRole === "admin") {
        throw new HotmartConflictError("Uma conta administrativa não pode ser matriculada pelo webhook.")
      }
    }

    // Non-active events never create accounts. Their transaction state must
    // still survive, even when no matching student/profile exists yet.
    const applied = await repository.applyEntitlementEvent({
      transaction: event.transaction,
      userId: event.status === "active" || role === "student" ? userId : null,
      courseId: mapping.courseId, productUcode: event.productUcode,
      productId: event.productId, buyerUcode: event.buyerUcode,
      status: event.status, eventId: event.eventId, eventCreationDate: event.eventCreationDate,
      offerCode: event.offerCode,
    })
    const outcome = applied.applied ? "processed" : "ignored"
    await repository.finishEvent(event.eventId, outcome,
      applied.applied ? null : "Evento comercial obsoleto para a transação.", details)
    return {
      outcome, eventId: event.eventId, userId, courseId: mapping.courseId,
      entitlementStatus: applied.entitlementStatus, enrollmentStatus: applied.enrollmentStatus,
      offerCode: event.offerCode,
    }
  } catch (error) {
    await repository.failEvent(event.eventId, persistedFailureMessage(error), details)
    throw error
  }
}
