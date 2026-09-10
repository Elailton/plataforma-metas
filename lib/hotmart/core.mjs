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
  }
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

  try {
    if (!event.status) {
      await repository.finishEvent(event.eventId, "ignored", "Evento sem efeito sobre matrícula.")
      return { outcome: "ignored", eventId: event.eventId }
    }
    const mapping = await repository.findProductMapping(event.productUcode)
    if (!mapping || (!mapping.active && event.status === "active")) {
      await repository.finishEvent(event.eventId, "ignored", "Produto sem mapeamento ativo.")
      return { outcome: "ignored", eventId: event.eventId }
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
          await repository.finishEvent(event.eventId, "ignored", "Evento comercial obsoleto para a transação.")
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
    })
    const outcome = applied.applied ? "processed" : "ignored"
    await repository.finishEvent(event.eventId, outcome,
      applied.applied ? null : "Evento comercial obsoleto para a transação.")
    return {
      outcome, eventId: event.eventId, userId, courseId: mapping.courseId,
      entitlementStatus: applied.entitlementStatus, enrollmentStatus: applied.enrollmentStatus,
    }
  } catch (error) {
    await repository.failEvent(event.eventId, persistedFailureMessage(error))
    throw error
  }
}
