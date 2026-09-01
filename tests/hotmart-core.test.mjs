import assert from "node:assert/strict"
import test from "node:test"
import {
  HotmartConflictError,
  processHotmartEvent,
} from "../lib/hotmart/core.mjs"

function payload(id, event, email, productUcode, transaction = id) {
  return {
    id,
    event,
    version: "2.0.0",
    data: {
      product: { ucode: productUcode, name: "Produto" },
      buyer: { email, name: "João da Silva" },
      purchase: { transaction },
    },
  }
}

function inMemoryRepository({ adminEmails = [] } = {}) {
  const users = new Map()
  const profiles = new Map()
  const mappings = new Map([
    ["product-one", { courseId: "course-one" }],
    ["product-two", { courseId: "course-two" }],
  ])
  const events = new Map()
  const enrollments = new Map()
  let invitations = 0

  for (const email of adminEmails) {
    const normalized = email.toLowerCase()
    const userId = `user-${users.size + 1}`
    users.set(normalized, userId)
    profiles.set(userId, "admin")
  }

  return {
    state: { users, profiles, events, enrollments, get invitations() { return invitations } },

    async claimEvent(event) {
      const current = events.get(event.eventId)
      if (current && current !== "failed") return { claimed: false, status: current }
      events.set(event.eventId, "processing")
      return { claimed: true, status: "processing" }
    },
    async finishEvent(eventId, status) {
      events.set(eventId, status)
    },
    async failEvent(eventId) {
      events.set(eventId, "failed")
    },
    async findActiveMapping(productUcode) {
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
    async upsertEnrollment({ userId, courseId, status }) {
      enrollments.set(`${userId}:${courseId}`, status)
    },
    async updateEnrollmentStatus({ userId, courseId, status }) {
      const key = `${userId}:${courseId}`
      if (enrollments.has(key)) enrollments.set(key, status)
    },
  }
}

test("o mesmo e-mail recebe matrículas em vários cursos sem duplicar a conta", async () => {
  const repository = inMemoryRepository()

  await processHotmartEvent(
    payload("event-1", "PURCHASE_APPROVED", " Joao@Email.com ", "product-one"),
    repository,
  )
  await processHotmartEvent(
    payload("event-2", "PURCHASE_APPROVED", "joao@email.com", "product-two"),
    repository,
  )

  assert.equal(repository.state.users.size, 1)
  assert.equal(repository.state.invitations, 1)
  assert.deepEqual(
    [...repository.state.enrollments.values()],
    ["active", "active"],
  )
})

test("um evento concluído não é processado novamente", async () => {
  const repository = inMemoryRepository()
  const approved = payload(
    "same-event",
    "PURCHASE_APPROVED",
    "student@email.com",
    "product-one",
  )

  const first = await processHotmartEvent(approved, repository)
  const duplicate = await processHotmartEvent(approved, repository)

  assert.equal(first.outcome, "processed")
  assert.equal(duplicate.outcome, "duplicate")
  assert.equal(repository.state.invitations, 1)
  assert.equal(repository.state.enrollments.size, 1)
})

test("atraso, nova aprovação e reembolso mudam o status sem apagar histórico", async () => {
  const repository = inMemoryRepository()
  const email = "student@email.com"
  const product = "product-one"

  await processHotmartEvent(payload("approved-1", "PURCHASE_APPROVED", email, product), repository)
  await processHotmartEvent(payload("delayed-1", "PURCHASE_DELAYED", email, product), repository)
  assert.equal([...repository.state.enrollments.values()][0], "suspended")

  await processHotmartEvent(payload("approved-2", "PURCHASE_APPROVED", email, product), repository)
  assert.equal([...repository.state.enrollments.values()][0], "active")

  await processHotmartEvent(payload("refunded-1", "PURCHASE_REFUNDED", email, product), repository)
  assert.equal([...repository.state.enrollments.values()][0], "revoked")
  assert.equal(repository.state.enrollments.size, 1)
})

test("o webhook nunca transforma nem matricula uma conta administrativa", async () => {
  const repository = inMemoryRepository({ adminEmails: ["admin@email.com"] })

  await assert.rejects(
    processHotmartEvent(
      payload("admin-event", "PURCHASE_APPROVED", "admin@email.com", "product-one"),
      repository,
    ),
    HotmartConflictError,
  )

  assert.equal(repository.state.enrollments.size, 0)
  assert.equal(repository.state.events.get("admin-event"), "failed")
})



