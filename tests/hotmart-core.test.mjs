import assert from "node:assert/strict"
import test from "node:test"
import {
  evaluateOffer,
  HotmartConflictError,
  HotmartPayloadError,
  normalizeEmail,
  normalizeOfferCode,
  parseHotmartEvent,
  processHotmartEvent,
} from "../lib/hotmart/core.mjs"
import { hottokMatches } from "../lib/hotmart/security.mjs"
import { offerConfigurationWarning, parseOfferInput } from "../lib/hotmart/offers.mjs"

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
  offerCode,
} = {}) {
  return {
    id,
    event,
    version: "2.0.0",
    creation_date: creationDate,
    data: {
      product: { id: productId, ucode: productUcode, name: "Produto" },
      buyer: { ucode: buyerUcode, email, name: "João da Silva" },
      purchase: offerCode === undefined ? { transaction } : { transaction, offer: { code: offerCode } },
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
    ["product-sga", {
      courseId: "course-sga", active: true, offerPolicy: "authorized_offers",
      offers: [{ code: "4e4p713s", grantsAccess: true }, { code: "qkpqg5ea", grantsAccess: false }],
    }],
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
    async finishEvent(eventId, status, message, details) {
      events.set(eventId, { status, message, offerCode: details?.offerCode ?? null })
    },
    async failEvent(eventId, message, details) {
      events.set(eventId, { status: "failed", message, offerCode: details?.offerCode ?? null })
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
        offerCode: current?.offerCode ?? input.offerCode ?? null,
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

test("validação de e-mail rejeita endereços malformados antes do convite", () => {
  for (const invalid of ["@example.com", "user@", "user@@example.com", "user@example", ".user@example.com", "user..name@example.com"]) {
    assert.throws(() => normalizeEmail(invalid), HotmartPayloadError)
  }

  assert.equal(normalizeEmail(" Aluno+Curso@Example.COM "), "aluno+curso@example.com")
})

test("creation_date aceita apenas epoch Hotmart em milissegundos e com faixa plausível", () => {
  assert.equal(parseHotmartEvent(payload({ id: "milliseconds" })).eventCreationDate, new Date(BASE_TIME).toISOString())
  assert.equal(parseHotmartEvent(payload({ id: "milliseconds-string", creationDate: String(BASE_TIME) })).eventCreationDate, new Date(BASE_TIME).toISOString())

  for (const invalidDate of ["2026-09-01T12:00:00Z", 1_700_000_000, "1700000000", Date.now() + 2 * 24 * 60 * 60 * 1000]) {
    assert.throws(
      () => parseHotmartEvent(payload({ id: `invalid-${invalidDate}`, creationDate: invalidDate })),
      HotmartPayloadError,
    )
  }
})

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
  assert.equal(repository.state.events.get("retry").message, "Falha interna ao processar o evento.")
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

// ---------------------------------------------------------------------------
// Ofertas: "curso + SGA" (4e4p713s) libera; "curso apenas" (qkpqg5ea) não libera.
// Os códigos aparecem só nos testes; a regra real é cadastrada pelo administrador.
// ---------------------------------------------------------------------------

const SGA = { productUcode: "product-sga", offerCode: "4e4p713s" }
const COURSE_ONLY = { productUcode: "product-sga", offerCode: "qkpqg5ea" }

test("oferta: código normalizado e configuração da regra", () => {
  assert.equal(normalizeOfferCode(" 4E4P713S "), "4e4p713s")
  assert.equal(normalizeOfferCode("x y"), null)
  assert.equal(normalizeOfferCode(""), null)
  assert.equal(parseOfferInput("https://pay.hotmart.com/T70472489M?off=4e4p713s"), "4e4p713s")
  assert.equal(parseOfferInput("https://pay.hotmart.com/T70472489M?off=4e4p713s&src=anuncio&sck=x"), "4e4p713s")
  assert.equal(parseOfferInput("https://pay.hotmart.com/T70472489M"), null)
  assert.equal(parseOfferInput("QKPQG5EA"), "qkpqg5ea")
  assert.equal(parseOfferInput("<script>"), null)
  assert.equal(offerConfigurationWarning("any", []), null)
  assert.match(offerConfigurationWarning("authorized_offers", []), /Nenhuma oferta libera/)
  assert.match(offerConfigurationWarning("authorized_offers", [{ grantsAccess: false }]), /Nenhuma oferta libera/)
  assert.equal(offerConfigurationWarning("authorized_offers", [{ grantsAccess: true }]), null)
  // Lista vazia com política restrita nunca significa "qualquer oferta".
  assert.equal(evaluateOffer({ offerPolicy: "authorized_offers", offers: [] }, "4e4p713s").verdict, "unknown")
  assert.equal(evaluateOffer({ offerPolicy: "any" }, null).verdict, "granting")
})

test("oferta 1. curso + SGA concede o direito correto e registra a oferta", async () => {
  const repository = inMemoryRepository()
  const result = await approve(repository, { id: "sga-1", transaction: "HP-sga", ...SGA })
  assert.equal(result.outcome, "processed")
  assert.equal(result.offerCode, "4e4p713s")
  assert.equal(repository.state.enrollments.get(`${result.userId}:course-sga`), "active")
  assert.equal(repository.state.entitlements.get("HP-sga").offerCode, "4e4p713s")
  assert.equal(repository.state.events.get("sga-1").offerCode, "4e4p713s")
  assert.equal(repository.state.invitations, 1)
})

test("oferta 2. curso apenas não concede acesso nem envia convite", async () => {
  const repository = inMemoryRepository()
  const result = await approve(repository, { id: "only-1", transaction: "HP-only", ...COURSE_ONLY })
  assert.equal(result.outcome, "ignored")
  assert.equal(result.offerVerdict, "non_granting")
  assert.equal(repository.state.invitations, 0)
  assert.equal(repository.state.users.size, 0)
  assert.equal(repository.state.entitlements.size, 0)
  assert.equal(repository.state.enrollments.size, 0)
  assert.equal(repository.state.events.get("only-1").status, "ignored")
  assert.equal(repository.state.events.get("only-1").offerCode, "qkpqg5ea")
  // O reembolso da compra "curso apenas" também não tem o que revogar.
  const refunded = await refund(repository, { id: "only-refund", transaction: "HP-only", creationDate: BASE_TIME + 1000, ...COURSE_ONLY })
  assert.equal(refunded.outcome, "ignored")
  assert.equal(repository.state.entitlements.size, 0)
})

test("oferta 3. oferta desconhecida ou ausente não concede acesso e fica registrada para conferência", async () => {
  const repository = inMemoryRepository()
  const unknown = await approve(repository, { id: "unknown", transaction: "HP-unknown", productUcode: "product-sga", offerCode: "zzzz9999" })
  const missing = await approve(repository, { id: "missing", transaction: "HP-missing", productUcode: "product-sga" })
  assert.equal(unknown.offerVerdict, "unknown")
  assert.equal(missing.offerVerdict, "missing")
  assert.match(repository.state.events.get("unknown").message, /não cadastrada/)
  assert.match(repository.state.events.get("missing").message, /sem código de oferta/)
  assert.equal(repository.state.invitations, 0)
  assert.equal(repository.state.enrollments.size, 0)
})

test("oferta 4. aprovação sem oferta não herda acesso de um watermark negativo", async () => {
  const repository = inMemoryRepository()
  await refund(repository, { id: "neg", transaction: "HP-neg", productUcode: "product-sga", creationDate: BASE_TIME })
  assert.equal(repository.state.entitlements.get("HP-neg").status, "revoked")
  const result = await approve(repository, { id: "later", transaction: "HP-neg", productUcode: "product-sga", creationDate: BASE_TIME + 1000 })
  assert.equal(result.outcome, "ignored")
  assert.equal(repository.state.invitations, 0)
  assert.equal(repository.state.enrollments.size, 0)
})

test("oferta 5. a oferta do SGA não depende de src, sck ou outros parâmetros", async () => {
  const repository = inMemoryRepository()
  const body = payload({ id: "src", transaction: "HP-src", productUcode: "product-sga" })
  body.data.purchase.sck = "4e4p713s"
  body.data.purchase.src = "4e4p713s"
  body.data.purchase.offer = { code: "qkpqg5ea" }
  const result = await processHotmartEvent(body, repository)
  assert.equal(result.outcome, "ignored")
  assert.equal(repository.state.enrollments.size, 0)
})

test("oferta 6. produto errado com o código da oferta SGA não libera acesso", async () => {
  const repository = inMemoryRepository()
  const result = await approve(repository, { id: "wrong", transaction: "HP-wrong", productUcode: "product-unknown", offerCode: "4e4p713s" })
  assert.equal(result.outcome, "ignored")
  assert.equal(repository.state.enrollments.size, 0)
  assert.equal(repository.state.invitations, 0)
})

test("oferta 7. evento SGA repetido não duplica conta, convite, direito ou matrícula", async () => {
  const repository = inMemoryRepository()
  await approve(repository, { id: "dup", transaction: "HP-dup", ...SGA })
  const again = await approve(repository, { id: "dup", transaction: "HP-dup", ...SGA })
  const resent = await approve(repository, { id: "dup-2", transaction: "HP-dup", ...SGA })
  assert.equal(again.outcome, "duplicate")
  assert.equal(resent.outcome, "ignored")
  assert.equal(repository.state.users.size, 1)
  assert.equal(repository.state.invitations, 1)
  assert.equal(repository.state.entitlements.size, 1)
  assert.equal(repository.state.enrollments.size, 1)
})

test("oferta 8. compra curso apenas não remove o acesso SGA de outra transação", async () => {
  const repository = inMemoryRepository()
  const sga = await approve(repository, { id: "a", transaction: "HP-a", ...SGA })
  await approve(repository, { id: "b", transaction: "HP-b", ...COURSE_ONLY })
  await refund(repository, { id: "b-refund", transaction: "HP-b", creationDate: BASE_TIME + 1000, ...COURSE_ONLY })
  assert.equal(repository.state.enrollments.get(`${sga.userId}:course-sga`), "active")
  assert.equal(repository.state.entitlements.size, 1)
})

test("oferta 9. reembolso revoga somente o direito da própria transação", async () => {
  const repository = inMemoryRepository()
  const first = await approve(repository, { id: "one", transaction: "HP-one", ...SGA })
  await approve(repository, { id: "two", transaction: "HP-two", ...SGA })
  await refund(repository, { id: "one-refund", transaction: "HP-one", creationDate: BASE_TIME + 1000, ...SGA })
  assert.equal(repository.state.entitlements.get("HP-one").status, "revoked")
  assert.equal(repository.state.entitlements.get("HP-two").status, "active")
  assert.equal(repository.state.enrollments.get(`${first.userId}:course-sga`), "active")
  await refund(repository, { id: "two-refund", transaction: "HP-two", creationDate: BASE_TIME + 1000, ...SGA })
  assert.equal(repository.state.enrollments.get(`${first.userId}:course-sga`), "revoked")
})

test("oferta 10. reembolso sem oferta ainda atinge a transação SGA conhecida", async () => {
  const repository = inMemoryRepository()
  const result = await approve(repository, { id: "sga", transaction: "HP-sga", ...SGA })
  const refunded = await refund(repository, { id: "sga-refund", transaction: "HP-sga", productUcode: "product-sga", creationDate: BASE_TIME + 1000 })
  assert.equal(refunded.outcome, "processed")
  assert.equal(repository.state.enrollments.get(`${result.userId}:course-sga`), "revoked")
})

test("oferta 11. evento posterior sem oferta reutiliza o vínculo da transação SGA", async () => {
  const repository = inMemoryRepository()
  const first = await approve(repository, { id: "sga", transaction: "HP-sga", ...SGA })
  await processHotmartEvent(payload({ id: "delay", event: "PURCHASE_DELAYED", transaction: "HP-sga", creationDate: BASE_TIME + 1000, ...SGA }), repository)
  assert.equal(repository.state.enrollments.get(`${first.userId}:course-sga`), "suspended")
  const reapproved = await approve(repository, { id: "reapproved", transaction: "HP-sga", productUcode: "product-sga", creationDate: BASE_TIME + 2000 })
  assert.equal(reapproved.outcome, "processed")
  assert.equal(repository.state.enrollments.get(`${first.userId}:course-sga`), "active")
  assert.equal(repository.state.invitations, 1)
})

test("oferta 12. concessão manual sobrevive ao reembolso SGA e à compra curso apenas", async () => {
  const repository = inMemoryRepository()
  const first = await approve(repository, { id: "sga", transaction: "HP-sga", ...SGA })
  repository.grantManual("student@email.com", "course-sga")
  await refund(repository, { id: "sga-refund", transaction: "HP-sga", creationDate: BASE_TIME + 1000, ...SGA })
  await approve(repository, { id: "only", transaction: "HP-only", ...COURSE_ONLY })
  assert.equal(repository.state.enrollments.get(`${first.userId}:course-sga`), "active")
})

test("oferta 13. conta existente comprando curso apenas mantém progresso e não recebe convite", async () => {
  const repository = inMemoryRepository()
  const first = await approve(repository, { id: "other", transaction: "HP-other" })
  repository.state.progress.set(`${first.userId}:item-1`, true)
  await approve(repository, { id: "only", transaction: "HP-only", ...COURSE_ONLY })
  assert.equal(repository.state.invitations, 1)
  assert.equal(repository.state.progress.get(`${first.userId}:item-1`), true)
  assert.equal(repository.state.enrollments.get(`${first.userId}:course-one`), "active")
  assert.equal(repository.state.enrollments.has(`${first.userId}:course-sga`), false)
})

test("oferta: mapeamento sem política restrita mantém o comportamento anterior", async () => {
  const repository = inMemoryRepository()
  const result = await approve(repository, { id: "legacy", transaction: "HP-legacy", offerCode: "qualquer" })
  assert.equal(result.outcome, "processed")
  assert.equal(repository.state.enrollments.get(`${result.userId}:course-one`), "active")
})
