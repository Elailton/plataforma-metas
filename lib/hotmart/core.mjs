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
  let milliseconds = null

  if (typeof value === "number" && Number.isFinite(value)) {
    milliseconds = value < 100_000_000_000 ? value * 1000 : value
  } else if (typeof value === "string" && value.trim()) {
    const raw = value.trim()
    if (/^\d+(?:\.\d+)?$/.test(raw)) {
      const numeric = Number(raw)
      if (Number.isFinite(numeric)) {
        milliseconds = numeric < 100_000_000_000 ? numeric * 1000 : numeric
      }
    } else {
      const parsed = Date.parse(raw)
      if (Number.isFinite(parsed)) milliseconds = parsed
    }
  }

  if (milliseconds === null) return null
  const date = new Date(milliseconds)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export function normalizeEmail(value) {
  const email = textOrNull(value)?.toLowerCase() ?? ""
  if (!email || !email.includes("@")) {
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

function errorMessage(error) {
  return error instanceof Error ? error.message : "Falha desconhecida ao processar o webhook."
}

export async function processHotmartEvent(payload, repository) {
  const event = parseHotmartEvent(payload)
  const claim = await repository.claimEvent(event)

  if (!claim.claimed) {
    return {
      outcome: "duplicate",
      eventId: event.eventId,
      previousStatus: claim.status,
    }
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

    if (event.status === "active") {
      if (!userId) {
        userId = await repository.inviteStudent({
          email: event.buyerEmail,
          fullName: event.buyerName,
          avatarInitials: event.avatarInitials,
        })
      }

      const role = await repository.ensureStudentProfile(userId, {
        fullName: event.buyerName,
        avatarInitials: event.avatarInitials,
      })

      if (role === "admin") {
        throw new HotmartConflictError(
          "Uma conta administrativa não pode ser matriculada pelo webhook.",
        )
      }

      const applied = await repository.applyEntitlementEvent({
        transaction: event.transaction,
        userId,
        courseId: mapping.courseId,
        productUcode: event.productUcode,
        productId: event.productId,
        buyerUcode: event.buyerUcode,
        status: event.status,
        eventId: event.eventId,
        eventCreationDate: event.eventCreationDate,
      })

      if (!applied.applied) {
        await repository.finishEvent(event.eventId, "ignored", "Evento comercial obsoleto para a transação.")
        return {
          outcome: "ignored",
          eventId: event.eventId,
          userId,
          courseId: mapping.courseId,
          entitlementStatus: applied.entitlementStatus,
          enrollmentStatus: applied.enrollmentStatus,
        }
      }

      await repository.finishEvent(event.eventId, "processed", null)

      return {
        outcome: "processed",
        eventId: event.eventId,
        userId,
        courseId: mapping.courseId,
        entitlementStatus: applied.entitlementStatus,
        enrollmentStatus: applied.enrollmentStatus,
      }
    } else if (userId) {
      const role = await repository.getProfileRole(userId)

      if (role === "admin") {
        throw new HotmartConflictError(
          "O webhook não pode alterar matrículas de uma conta administrativa.",
        )
      }

      if (role !== "student") {
        await repository.finishEvent(event.eventId, "processed", "Conta sem perfil de aluno; nenhum acesso alterado.")
        return {
          outcome: "processed",
          eventId: event.eventId,
          userId,
          courseId: mapping.courseId,
        }
      }

      const applied = await repository.applyEntitlementEvent({
        transaction: event.transaction,
        userId,
        courseId: mapping.courseId,
        productUcode: event.productUcode,
        productId: event.productId,
        buyerUcode: event.buyerUcode,
        status: event.status,
        eventId: event.eventId,
        eventCreationDate: event.eventCreationDate,
      })

      if (!applied.applied) {
        await repository.finishEvent(event.eventId, "ignored", "Evento comercial obsoleto para a transação.")
        return {
          outcome: "ignored",
          eventId: event.eventId,
          userId,
          courseId: mapping.courseId,
          entitlementStatus: applied.entitlementStatus,
          enrollmentStatus: applied.enrollmentStatus,
        }
      }

      await repository.finishEvent(event.eventId, "processed", null)

      return {
        outcome: "processed",
        eventId: event.eventId,
        userId,
        courseId: mapping.courseId,
        entitlementStatus: applied.entitlementStatus,
        enrollmentStatus: applied.enrollmentStatus,
      }
    }

    await repository.finishEvent(event.eventId, "processed", "Conta ainda não existe; nenhum acesso alterado.")

    return {
      outcome: "processed",
      eventId: event.eventId,
      userId,
      courseId: mapping.courseId,
    }
  } catch (error) {
    await repository.failEvent(event.eventId, errorMessage(error))
    throw error
  }
}

