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
  const transaction = textOrNull(payload.data?.purchase?.transaction)
  const buyerName = textOrNull(payload.data?.buyer?.name)
  const buyerEmailRaw = textOrNull(payload.data?.buyer?.email)

  if (status && (!productUcode || !transaction || !buyerEmailRaw)) {
    throw new HotmartPayloadError(
      "O evento de compra não contém comprador, produto ou transação válidos.",
    )
  }

  return {
    eventId,
    eventType,
    version,
    status,
    transaction,
    productUcode,
    buyerEmail: buyerEmailRaw ? normalizeEmail(buyerEmailRaw) : null,
    buyerName,
    avatarInitials: initialsFromName(buyerName),
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

    const mapping = await repository.findActiveMapping(event.productUcode)
    if (!mapping) {
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

      await repository.upsertEnrollment({
        userId,
        courseId: mapping.courseId,
        status: "active",
      })
    } else if (userId) {
      const role = await repository.getProfileRole(userId)

      if (role === "admin") {
        throw new HotmartConflictError(
          "O webhook não pode alterar matrículas de uma conta administrativa.",
        )
      }

      await repository.updateEnrollmentStatus({
        userId,
        courseId: mapping.courseId,
        status: event.status,
      })
    }

    await repository.finishEvent(event.eventId, "processed", null)

    return {
      outcome: "processed",
      eventId: event.eventId,
      userId,
      courseId: mapping.courseId,
      enrollmentStatus: event.status,
    }
  } catch (error) {
    await repository.failEvent(event.eventId, errorMessage(error))
    throw error
  }
}



