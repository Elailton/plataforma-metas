import assert from "node:assert/strict"
import test from "node:test"
import { processHotmartEvent } from "../lib/hotmart/core.mjs"
import {
  buildReprocessPreview,
  findSimilarAccountEmail,
  maskEmail,
  REPROCESS_DAILY_LIMIT,
  reprocessEventId,
  reprocessPayload,
  runReprocessBatch,
} from "../lib/hotmart/reprocess.mjs"

const UCODE = "product-sga"
const MAPPINGS = new Map([[UCODE, {
  courseId: "course-sga", active: true, offerPolicy: "authorized_offers",
  offers: [{ code: "libera", grantsAccess: true }, { code: "apenas", grantsAccess: false }],
}]])
let clock = Date.parse("2026-10-29T12:00:00Z")
function ev(transaction, eventType, changes = {}) {
  clock += 60_000
  return {
    eventId: `${transaction}-${eventType}-${clock}`, transaction, eventType, offerCode: "libera",
    buyerEmail: `${transaction.toLowerCase()}@email.com`, productUcode: UCODE,
    createdAt: new Date(clock).toISOString(), ...changes,
  }
}
function preview(events, changes = {}) {
  return buildReprocessPreview({
    events, mappings: MAPPINGS, entitledTransactions: new Set(), accounts: new Map(),
    courseStatus: "published", usedToday: 0, ...changes,
  })
}

test("C1. prévia: só libera aprovadas cujo último estado é válido, sem direito e com oferta que libera", () => {
  const result = preview([
    ev("HP1", "PURCHASE_APPROVED"),
    ev("HP2", "PURCHASE_APPROVED"), ev("HP2", "PURCHASE_REFUNDED"),
    ev("HP3", "PURCHASE_APPROVED"), ev("HP3", "PURCHASE_CANCELED"),
    ev("HP4", "PURCHASE_APPROVED"), ev("HP4", "PURCHASE_DELAYED"),
    ev("HP5", "PURCHASE_DELAYED"), ev("HP5", "PURCHASE_APPROVED"),
    ev("HP6", "PURCHASE_APPROVED", { offerCode: "apenas" }),
    ev("HP7", "PURCHASE_APPROVED", { buyerEmail: null }),
    ev("HP8", "PURCHASE_APPROVED"),
    ev("HP9", "PURCHASE_COMPLETE"),
    ev("HP10", "PURCHASE_CHARGEBACK"),
    ev("HPT", "PURCHASE_APPROVED", { offerCode: "test" }),
  ], { entitledTransactions: new Set(["HP8"]) })
  assert.deepEqual(result.eligible.map((item) => item.transaction), ["HP1", "HP5", "HP9"])
  assert.deepEqual(result.counts, {
    alreadyRegistered: 1, refundedOrCanceled: 3, delayed: 1, notApproved: 0, notGranting: 1, withoutEmail: 1, admin: 0,
  })
  assert.equal(result.courseDraft, false)
  assert.equal(result.batch.length, 3)
  assert.equal(result.invitesInBatch, 3)
  assert.equal(result.eligible[0].maskedEmail, "hp*@email.com")
})

test("C2. reembolsada nunca libera, mesmo com aprovação posterior", () => {
  const result = preview([ev("HPR", "PURCHASE_REFUNDED"), ev("HPR", "PURCHASE_APPROVED")])
  assert.equal(result.eligible.length, 0)
  assert.equal(result.counts.refundedOrCanceled, 1)
})

test("C3. lote respeita o limite diário e mostra quantas ficam", () => {
  const events = Array.from({ length: 30 }, (_, index) => ev(`HPL${index}`, "PURCHASE_APPROVED"))
  const fresh = preview(events)
  assert.equal(REPROCESS_DAILY_LIMIT, 20)
  assert.equal(fresh.batch.length, 20)
  assert.equal(fresh.leftAfterBatch, 10)
  const later = preview(events, { usedToday: 15 })
  assert.equal(later.batch.length, 5)
  assert.equal(later.remainingToday, 5)
  assert.equal(preview(events, { usedToday: 25 }).batch.length, 0)
})

test("C4. curso em rascunho bloqueia o envio", async () => {
  const result = preview([ev("HPD", "PURCHASE_APPROVED")], { courseStatus: "draft" })
  assert.equal(result.courseDraft, true)
  assert.equal(result.batch.length, 0)
  let calls = 0
  const run = await runReprocessBatch({ preview: result, confirmedTransactions: ["HPD"], process: async () => { calls += 1 } })
  assert.equal(run.status, "draft")
  assert.equal(calls, 0)
})

test("C5. conta existente não recebe convite; admin e e-mail parecido ficam fora do lote", () => {
  const result = preview([
    ev("HPA", "PURCHASE_APPROVED", { buyerEmail: "aluno@email.com" }),
    ev("HPB", "PURCHASE_APPROVED", { buyerEmail: "chefe@email.com" }),
    ev("HPC", "PURCHASE_APPROVED", { buyerEmail: "mariasilva@gmail.con" }),
  ], { accounts: new Map([["aluno@email.com", "student"], ["chefe@email.com", "admin"], ["mariasilva@gmail.com", "student"]]) })
  assert.deepEqual(result.batch.map((item) => [item.transaction, item.hasAccount]), [["HPA", true]])
  assert.equal(result.invitesInBatch, 0)
  assert.equal(result.counts.admin, 1)
  assert.equal(result.similar.length, 1)
  assert.equal(result.similar[0].similarTo, "ma******@gmail.com")
})

test("C6. e-mail parecido: mesmo nome em outro domínio ou erro de digitação", () => {
  assert.equal(findSimilarAccountEmail("joao.p@hotmail.com", ["joao.p@gmail.com"]), "joao.p@gmail.com")
  assert.equal(findSimilarAccountEmail("joao@gmial.com", ["joao@gmail.com"]), "joao@gmail.com")
  assert.equal(findSimilarAccountEmail("mariana.s@gmail.com", ["mariana.x@gmail.com"]), "mariana.x@gmail.com")
  assert.equal(findSimilarAccountEmail("ana@gmail.com", ["bia@gmail.com", "carlos@gmail.com"]), null)
  assert.equal(findSimilarAccountEmail("ana@gmail.com", ["ana@hotmail.com"]), null)
  assert.equal(maskEmail("ab@x.com"), "ab*@x.com")
})

test("C7. só processa o que o admin confirmou e continua elegível; idempotente pelo id fixo", async () => {
  const result = preview([ev("HPX", "PURCHASE_APPROVED"), ev("HPY", "PURCHASE_APPROVED")])
  const ids = []
  const run = await runReprocessBatch({
    preview: result, confirmedTransactions: ["HPX", "HP-forjada"],
    process: async (payload) => { ids.push(payload.id); return { outcome: "processed" } },
  })
  assert.deepEqual(ids, [reprocessEventId("HPX")])
  assert.equal(run.processed, 1)
  assert.equal(run.leftPending, 1)
  const payload = reprocessPayload(result.eligible[0])
  assert.equal(payload.event, "PURCHASE_COMPLETE")
  assert.equal(payload.data.buyer.name, undefined)
  assert.equal(String(payload.creation_date).length, 13)
})

test("C8. de ponta a ponta com o webhook: reprocessar duas vezes não duplica conta nem convite", async () => {
  const users = new Map()
  const entitlements = new Map()
  const events = new Map()
  let invitations = 0
  const repository = {
    async claimEvent(event) {
      const current = events.get(event.eventId)
      if (current && current !== "failed") return { claimed: false, status: current }
      events.set(event.eventId, "processing"); return { claimed: true, status: "processing" }
    },
    async finishEvent(id, status) { events.set(id, status) },
    async failEvent(id) { events.set(id, "failed") },
    async findProductMapping(ucode) { return MAPPINGS.get(ucode) ?? null },
    async findUserByEmail(email) { return users.get(email) ?? null },
    async getProfileRole() { return "student" },
    async inviteStudent({ email }) { invitations += 1; users.set(email, `u${users.size}`); return users.get(email) },
    async ensureStudentProfile() { return "student" },
    async findEntitlement(transaction) { return entitlements.get(transaction) ?? null },
    async createEntitlementIfAbsent(input) {
      if (entitlements.has(input.transaction)) return { applied: false, entitlementStatus: "active", enrollmentStatus: "active" }
      entitlements.set(input.transaction, input); return { applied: true, entitlementStatus: "active", enrollmentStatus: "active" }
    },
    async applyEntitlementEvent() { throw new Error("não deve ser usado") },
  }
  const source = [ev("HPZ", "PURCHASE_APPROVED")]
  const process = (payload) => processHotmartEvent(payload, repository)
  const first = await runReprocessBatch({ preview: preview(source), confirmedTransactions: ["HPZ"], process })
  assert.equal(first.processed, 1)
  // Segunda execução com a prévia antiga (sem recalcular): evento duplicado, nada novo.
  const second = await runReprocessBatch({ preview: preview(source), confirmedTransactions: ["HPZ"], process })
  assert.equal(second.processed, 0)
  assert.equal(second.skipped, 1)
  assert.equal(invitations, 1)
  assert.equal(entitlements.size, 1)
  // Com a prévia recalculada, a transação já aparece como registrada.
  assert.equal(preview(source, { entitledTransactions: new Set(entitlements.keys()) }).eligible.length, 0)
})
