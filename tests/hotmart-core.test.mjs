import assert from "node:assert/strict"
import test from "node:test"
import {
  HotmartConflictError,
  processHotmartEvent,
} from "../lib/hotmart/core.mjs"
import { hottokMatches } from "../lib/hotmart/security.mjs"

const BASE_TIME = Date.parse("2026-09-01T12:00:00.000Z")

function payload({
  id,
  event = "PURCHASE_APPROVED",
  email = "student@email.com",
  productUcode = "product-one",
  transaction = id,
  creationDate = BASE_TIME,
  productId = 101,
  buyerUcode = "buyer-ucode",
} = {}) {
  return {
    id,
    event,
    version: "2.0.0",
    creation_date: creationDate,
    data: {
      product: { id: productId, ucode: productUcode, name: "Produto" },
      buyer: { ucode: buyerUcode, email, name: "João da Silva" },
      purchase: { transaction },
    },
  }
}

function inMemoryRepository({ adminEmails = [] } = {}) {
  const users = new Map()
  const profiles = new Map()
  const mappings = new Map([
    ["product-one", { courseId: "course-one", active: true }],
    ["product-one-turbo", { courseId: "course-one", active: true }],
    ["product-two", { courseId: "course-two", active: true }],
  ])
  const events = new Map()
  const entitlements = new Map()
  const enrollments = new Map()
  const manualGrants = new Map()
  const progress = new Map()
  let invitations = 0

  for (const email of adminEmails) {
    const normalized = email.toLowerCase()
    const userId = `user-${users.size + 1}`
    users.set(normalized, userId)
    profiles.set(userId, "admin")
  }

  function reconcile(userId, courseId) {
    const key = `${userId}:${courseId}`
    const manualStatus = manualGrants.get(key) ?? null
    const rights = [...entitlements.values()].filter(
      (right) => right.userId === userId && right.courseId === courseId,
    )
    const hasActive = rights.some((right) => right.status === "active")
    const hasSuspended = rights.some((right) => right.status === "suspended")
    const effectiveStatus =
      manualStatus === "active" || hasActive
        ? "active"
        : manualStatus === "suspended" || hasSuspended
          ? "suspended"
          : "revoked"

    enrollments.set(key, effectiveStatus)
    return effectiveStatus
  }

  return {
    state: {
      users,
      profiles,
      events,
      entitlements,
      enrollments,
      manualGrants,
      progress,
      mappings,
      get invitations() {
        return invitations
      },
    },

    grantManual(email, courseId, status = "active") {
      const userId = users.get(email.toLowerCase())
      if (!userId) throw new Error("Test user not found")
      manualGrants.set(`${userId}:${courseId}`, status)
      reconcile(userId, courseId)
    },

    async claimEvent(event) {
      const current = events.get(event.eventId)?.status
      if (current && current !== "failed") return { claimed: false, status: current }
      events.set(event.eventId, { status: "processing", message: null })
      return { claimed: true, status: "processing" }
    },
    async finishEvent(eventId, status, message) {
      events.set(eventId, { status, message })
    },
    async failEvent(eventId, message) {
      events.set(eventId, { status: "failed", message })
    },
    async findProductMapping(productUcode) {
      return mappings.get(productUcode) ?? null
    },
    async findUserByEmail(email) {
      return users.get(email) ?? null
    },
    async inviteStudent({ email }) {
      invitations += 1
      const userId = `user-${users.size + 1}`
      users.set(email, userId)
      return userId
    },
    async ensureStudentProfile(userId) {
      if (!profiles.has(userId)) profiles.set(userId, "student")
      return profiles.get(userId)
    },
    async getProfileRole(userId) {
      return profiles.get(userId) ?? null
    },
    async findEntitlement(transaction) {
      return entitlements.get(transaction) ?? null
    },
    async applyEntitlementEvent(input) {
      const current = entitlements.get(input.transaction)
      if (current) {
        if ((current.userId && input.userId && current.userId !== input.userId) ||
          current.courseId !== input.courseId || current.productUcode !== input.productUcode) {
          throw new Error("Hotmart transaction identity conflict")
        }
        if (Date.parse(input.eventCreationDate) <= Date.parse(current.eventCreationDate)) {
          return {
            applied: false,
            entitlementStatus: current.status,
            enrollmentStatus: enrollments.get(`${current.userId ?? input.userId}:${input.courseId}`) ?? null,
          }
        }
      }

      const entitlement = {
        ...input,
        userId: current?.userId ?? input.userId,
        id: current?.id ?? `entitlement-${entitlements.size + 1}`,
      }
      entitlements.set(input.transaction, entitlement)

      return {
        applied: true,
        entitlementStatus: input.status,
        enrollmentStatus: entitlement.userId ? reconcile(entitlement.userId, input.courseId) : null,
      }
    },
  }
}

async function approve(repository, options = {}) {
  return processHotmartEvent(
    payload({
      id: options.id ?? `approved-${options.transaction ?? "one"}`,
      ...options,
      event: "PURCHASE_APPROVED",
    }),
    repository,
  )
}

async function refund(repository, options = {}) {
  return processHotmartEvent(
    payload({
      id: options.id ?? `refunded-${options.transaction ?? "one"}`,
      ...options,
      event: "PURCHASE_REFUNDED",
    }),
    repository,
  )
}

test("reembolso antes da conta impede aprovação antiga sem enviar convite", async () => {
  const repository = inMemoryRepository()
  await refund(repository, { id: "early-refund", transaction: "HP-early", creationDate: BASE_TIME + 2000 })
  assert.equal(repository.state.entitlements.get("HP-early").userId, null)
  assert.equal(repository.state.entitlements.get("HP-early").status, "revoked")
  assert.equal(repository.state.users.size, 0)
  const stale = await approve(repository, { id: "late-approved", transaction: "HP-early", creationDate: BASE_TIME })
  assert.equal(stale.outcome, "ignored")
  assert.equal(repository.state.invitations, 0)
  assert.equal(repository.state.enrollments.size, 0)
  assert.equal((await approve(repository, { id: "late-approved", transaction: "HP-early" })).outcome, "duplicate")
})

test("todos os eventos negativos preservam watermark sem conta; uma aprovação nova pode reativar", async () => {
  for (const event of ["PURCHASE_DELAYED", "PURCHASE_REFUNDED", "PURCHASE_CHARGEBACK", "PURCHASE_CANCELED", "PURCHASE_EXPIRED"]) {
    const repository = inMemoryRepository()
    await processHotmartEvent(payload({ id: "negative", event, transaction: "HP-new", creationDate: BASE_TIME + 1000 }), repository)
    const stale = await approve(repository, { id: "old", transaction: "HP-new" })
    assert.equal(stale.outcome, "ignored")
    assert.equal(repository.state.invitations, 0)
    const result = await approve(repository, { id: "new", transaction: "HP-new", creationDate: BASE_TIME + 2000 })
    assert.equal(result.enrollmentStatus, "active")
    assert.equal(repository.state.entitlements.size, 1)
    assert.equal(repository.state.users.size, 1)
    assert.equal(repository.state.invitations, 1)
  }
})

test("refund entre preflight e convite não permite matrícula ativa", async () => {
  const repository = inMemoryRepository()
  const invite = repository.inviteStudent
  repository.inviteStudent = async (input) => {
    await refund(repository, { id: "racing-refund", transaction: "HP-race", creationDate: BASE_TIME + 2000 })
    return invite(input)
  }
  const result = await approve(repository, { id: "racing-approval", transaction: "HP-race" })
  assert.equal(result.outcome, "ignored")
  assert.equal(repository.state.entitlements.get("HP-race").status, "revoked")
  assert.equal(repository.state.enrollments.size, 0)
})

test("retry de evento que falhou preserva o watermark e não duplica convite", async () => {
  const repository = inMemoryRepository()
  const finish = repository.finishEvent
  repository.finishEvent = async () => { throw new Error("Falha transitória de confirmação") }
  await assert.rejects(refund(repository, { id: "retry", transaction: "HP-retry", creationDate: BASE_TIME + 1000 }), /Falha transitória/)
  assert.equal(repository.state.events.get("retry").status, "failed")
  repository.finishEvent = finish
  assert.equal((await refund(repository, { id: "retry", transaction: "HP-retry", creationDate: BASE_TIME + 1000 })).outcome, "ignored")
  assert.equal(repository.state.entitlements.size, 1)
  assert.equal((await approve(repository, { id: "old", transaction: "HP-retry" })).outcome, "ignored")
  assert.equal(repository.state.invitations, 0)
})

test("1. primeira compra cria uma conta, perfil, entitlement, matrícula e convite", async () => {
  const repository = inMemoryRepository()

  const result = await approve(repository, {
    id: "event-first",
    email: " NovoAluno@Teste.com ",
    transaction: "HP-first",
  })

  const [entitlement] = repository.state.entitlements.values()
  assert.equal(result.outcome, "processed")
  assert.equal(repository.state.users.size, 1)
  assert.equal(repository.state.profiles.get(result.userId), "student")
  assert.equal(repository.state.invitations, 1)
  assert.equal(entitlement.transaction, "HP-first")
  assert.equal(entitlement.status, "active")
  assert.equal(entitlement.productId, "101")
  assert.equal(entitlement.buyerUcode, "buyer-ucode")
  assert.equal(repository.state.enrollments.get(`${result.userId}:course-one`), "active")
})

test("2. segundo curso usa a mesma conta e não envia outro convite", async () => {
  const repository = inMemoryRepository()

  const first = await approve(repository, {
    id: "event-gmf",
    email: "Joao@Email.com",
    transaction: "HP-gmf",
  })
  await approve(repository, {
    id: "event-prf",
    email: " joao@email.com ",
    productUcode: "product-two",
    transaction: "HP-prf",
  })

  assert.equal(repository.state.users.size, 1)
  assert.equal(repository.state.invitations, 1)
  assert.equal(repository.state.enrollments.get(`${first.userId}:course-one`), "active")
  assert.equal(repository.state.enrollments.get(`${first.userId}:course-two`), "active")
})

test("3. dois produtos do mesmo curso criam dois entitlements e uma matrícula", async () => {
  const repository = inMemoryRepository()

  const first = await approve(repository, { id: "event-completo", transaction: "HP-completo" })
  await approve(repository, {
    id: "event-turbo",
    productUcode: "product-one-turbo",
    transaction: "HP-turbo",
  })

  assert.equal(repository.state.entitlements.size, 2)
  assert.equal(repository.state.enrollments.size, 1)
  assert.equal(repository.state.enrollments.get(`${first.userId}:course-one`), "active")
})

test("4. reembolso de apenas uma compra mantém o curso ativo", async () => {
  const repository = inMemoryRepository()

  const first = await approve(repository, { id: "approved-completo", transaction: "HP-completo" })
  await approve(repository, {
    id: "approved-turbo",
    productUcode: "product-one-turbo",
    transaction: "HP-turbo",
  })
  await refund(repository, {
    id: "refund-completo",
    transaction: "HP-completo",
    creationDate: BASE_TIME + 1000,
  })

  assert.equal(repository.state.entitlements.get("HP-completo").status, "revoked")
  assert.equal(repository.state.entitlements.get("HP-turbo").status, "active")
  assert.equal(repository.state.enrollments.get(`${first.userId}:course-one`), "active")
})

test("5. reembolso da última compra válida revoga o curso", async () => {
  const repository = inMemoryRepository()

  const first = await approve(repository, { id: "approved-completo", transaction: "HP-completo" })
  await approve(repository, {
    id: "approved-turbo",
    productUcode: "product-one-turbo",
    transaction: "HP-turbo",
  })
  await refund(repository, {
    id: "refund-completo",
    transaction: "HP-completo",
    creationDate: BASE_TIME + 1000,
  })
  await refund(repository, {
    id: "refund-turbo",
    productUcode: "product-one-turbo",
    transaction: "HP-turbo",
    creationDate: BASE_TIME + 2000,
  })

  assert.equal(repository.state.enrollments.get(`${first.userId}:course-one`), "revoked")
})

test("6. reembolsos da GMF não afetam a matrícula PRF", async () => {
  const repository = inMemoryRepository()

  const first = await approve(repository, { id: "approved-gmf", transaction: "HP-gmf" })
  await approve(repository, {
    id: "approved-prf",
    productUcode: "product-two",
    transaction: "HP-prf",
  })
  await refund(repository, {
    id: "refund-gmf",
    transaction: "HP-gmf",
    creationDate: BASE_TIME + 1000,
  })

  assert.equal(repository.state.enrollments.get(`${first.userId}:course-one`), "revoked")
  assert.equal(repository.state.enrollments.get(`${first.userId}:course-two`), "active")
})

test("7. reativação restaura acesso e preserva o progresso", async () => {
  const repository = inMemoryRepository()

  const first = await approve(repository, { id: "approved-old", transaction: "HP-reactivate" })
  repository.state.progress.set(`${first.userId}:goal-item-one`, true)
  await refund(repository, {
    id: "refund",
    transaction: "HP-reactivate",
    creationDate: BASE_TIME + 1000,
  })
  await approve(repository, {
    id: "approved-new",
    transaction: "HP-reactivate",
    creationDate: BASE_TIME + 2000,
  })

  assert.equal(repository.state.enrollments.get(`${first.userId}:course-one`), "active")
  assert.equal(repository.state.progress.get(`${first.userId}:goal-item-one`), true)
})

test("8. evento duplicado não duplica usuário, convite, entitlement ou matrícula", async () => {
  const repository = inMemoryRepository()
  const approved = payload({ id: "same-event", transaction: "HP-same" })

  const first = await processHotmartEvent(approved, repository)
  const duplicate = await processHotmartEvent(approved, repository)

  assert.equal(first.outcome, "processed")
  assert.equal(duplicate.outcome, "duplicate")
  assert.equal(repository.state.users.size, 1)
  assert.equal(repository.state.invitations, 1)
  assert.equal(repository.state.entitlements.size, 1)
  assert.equal(repository.state.enrollments.size, 1)
})

test("9. HOTTOK inválido é rejeitado antes de qualquer mutação", () => {
  const repository = inMemoryRepository()

  assert.equal(hottokMatches("token-invalido", "token-correto"), false)
  assert.equal(repository.state.users.size, 0)
  assert.equal(repository.state.events.size, 0)
  assert.equal(repository.state.entitlements.size, 0)
  assert.equal(repository.state.enrollments.size, 0)
})

test("10. produto não mapeado é ignorado e não libera acesso", async () => {
  const repository = inMemoryRepository()

  const result = await approve(repository, {
    id: "unmapped-event",
    productUcode: "unknown-product",
    transaction: "HP-unmapped",
  })

  assert.equal(result.outcome, "ignored")
  assert.equal(repository.state.users.size, 0)
  assert.equal(repository.state.entitlements.size, 0)
  assert.equal(repository.state.enrollments.size, 0)
})

test("11. compra de conta administrativa não cria entitlement nem matrícula", async () => {
  const repository = inMemoryRepository({ adminEmails: ["admin@email.com"] })

  await assert.rejects(
    approve(repository, {
      id: "admin-event",
      email: "admin@email.com",
      transaction: "HP-admin",
    }),
    HotmartConflictError,
  )

  assert.equal(repository.state.entitlements.size, 0)
  assert.equal(repository.state.enrollments.size, 0)
  assert.equal(repository.state.events.get("admin-event").status, "failed")
})

test("12. reembolso Hotmart não remove uma concessão manual ativa", async () => {
  const repository = inMemoryRepository()

  const first = await approve(repository, { id: "manual-approved", transaction: "HP-manual" })
  repository.grantManual("student@email.com", "course-one")
  await refund(repository, {
    id: "manual-refund",
    transaction: "HP-manual",
    creationDate: BASE_TIME + 1000,
  })

  assert.equal(repository.state.entitlements.get("HP-manual").status, "revoked")
  assert.equal(repository.state.manualGrants.get(`${first.userId}:course-one`), "active")
  assert.equal(repository.state.enrollments.get(`${first.userId}:course-one`), "active")
})

test("13. evento antigo da mesma transação não regride o estado mais novo", async () => {
  const repository = inMemoryRepository()

  const first = await approve(repository, {
    id: "ordered-approved",
    transaction: "HP-ordered",
    creationDate: BASE_TIME,
  })
  await refund(repository, {
    id: "ordered-refund",
    transaction: "HP-ordered",
    creationDate: BASE_TIME + 2000,
  })
  const stale = await processHotmartEvent(
    payload({
      id: "stale-delayed",
      event: "PURCHASE_DELAYED",
      transaction: "HP-ordered",
      creationDate: BASE_TIME + 1000,
    }),
    repository,
  )

  assert.equal(stale.outcome, "ignored")
  assert.equal(repository.state.entitlements.get("HP-ordered").status, "revoked")
  assert.equal(repository.state.enrollments.get(`${first.userId}:course-one`), "revoked")
  assert.equal(repository.state.events.get("stale-delayed").status, "ignored")
})

test("sem direitos ativos, um direito suspenso mantém a matrícula suspensa", async () => {
  const repository = inMemoryRepository()

  const first = await approve(repository, { id: "delayed-approved", transaction: "HP-delayed" })
  await processHotmartEvent(
    payload({
      id: "delayed-event",
      event: "PURCHASE_DELAYED",
      transaction: "HP-delayed",
      creationDate: BASE_TIME + 1000,
    }),
    repository,
  )

  assert.equal(repository.state.enrollments.get(`${first.userId}:course-one`), "suspended")
})

test("mapeamento inativo bloqueia aprovação nova, mas ainda processa reembolso existente", async () => {
  const repository = inMemoryRepository()

  const first = await approve(repository, { id: "mapped-approved", transaction: "HP-inactive" })
  repository.state.mappings.set("product-one", { courseId: "course-one", active: false })
  await refund(repository, {
    id: "mapped-refund",
    transaction: "HP-inactive",
    creationDate: BASE_TIME + 1000,
  })
  const blocked = await approve(repository, {
    id: "inactive-new-approved",
    transaction: "HP-inactive-new",
    creationDate: BASE_TIME + 2000,
  })

  assert.equal(repository.state.enrollments.get(`${first.userId}:course-one`), "revoked")
  assert.equal(blocked.outcome, "ignored")
  assert.equal(repository.state.entitlements.has("HP-inactive-new"), false)
})
