import test from "node:test"
import assert from "node:assert/strict"
import { claimPurchaseByTransaction, maskEmail, normalizeTransactionCode } from "../lib/hotmart/claim-purchase.mjs"

const UCODE = "00000000-0000-4000-8000-000000000010"
const sale = (changes = {}) => ({
  transaction: "HP0907585127", productId: "123", productUcode: UCODE, email: "comprador@gmail.com",
  fullName: "Comprador", buyerUcode: null, approvedDate: Date.UTC(2026, 9, 20), offerCode: "comsga", ...changes,
})
const mapping = { id: "m", courseId: "course", active: true, offerPolicy: "authorized_offers",
  offers: [{ code: "comsga", grantsAccess: true }, { code: "semsga", grantsAccess: false }] }

function deps({ found = sale(), map = mapping, role = null, access = true } = {}) {
  const calls = { processed: [], sent: [] }
  const repository = {
    async findProductMapping() { return map },
    async findUserByEmail() { return role ? "user-id" : null },
    async getProfileRole() { return role },
    async claimEvent(event) { calls.processed.push(event); return { claimed: true } },
    async finishEvent() {}, async failEvent() {},
    async findEntitlement() { return null },
    async inviteStudent() { return "new-user" },
    async ensureStudentProfile() { return "student" },
    async applyEntitlementEvent(input) { calls.applied = input; return { applied: true, entitlementStatus: "active", enrollmentStatus: "active" } },
  }
  return {
    calls,
    deps: {
      sales: { async findPaidSaleByTransaction(code) { calls.code = code; return found } },
      repository,
      async hasActiveStudentAccess() { return access },
      async sendAccessEmail(email) { calls.sent.push(email); return "sent" },
    },
  }
}

test("código: normaliza espaços/traços e recusa formatos estranhos", () => {
  assert.equal(normalizeTransactionCode(" hp 0907-585127 "), "HP0907585127")
  assert.equal(normalizeTransactionCode("123"), null)
  assert.equal(normalizeTransactionCode("HP12"), null)
  assert.equal(maskEmail("comprador@gmail.com"), "co***@gmail.com")
})

test("compra com SGA: libera e envia o link SOMENTE ao e-mail da compra, mascarado na resposta", async () => {
  const { deps: d, calls } = deps()
  const result = await claimPurchaseByTransaction("hp0907585127", d)
  assert.equal(result.status, "granted")
  assert.equal(calls.code, "HP0907585127")
  assert.deepEqual(calls.sent, ["comprador@gmail.com"])
  assert.match(result.message, /co\*\*\*@gmail\.com/)
  assert.doesNotMatch(result.message, /comprador@/)
  assert.equal(calls.applied.transaction, "HP0907585127")
  assert.equal(calls.applied.courseId, "course")
})

test("oferta só do curso: explica e não cria acesso nem envia e-mail", async () => {
  const { deps: d, calls } = deps({ found: sale({ offerCode: "semsga" }) })
  const result = await claimPurchaseByTransaction("HP0907585127", d)
  assert.equal(result.status, "course_only")
  assert.equal(calls.processed.length, 0)
  assert.equal(calls.sent.length, 0)
})

test("não encontrada, produto sem SGA, oferta desconhecida e conta admin não liberam", async () => {
  assert.equal((await claimPurchaseByTransaction("HP0907585127", deps({ found: null }).deps)).status, "not_found")
  assert.equal((await claimPurchaseByTransaction("HP0907585127", deps({ map: null }).deps)).status, "not_sga")
  assert.equal((await claimPurchaseByTransaction("HP0907585127", deps({ found: sale({ offerCode: "outra" }) }).deps)).status, "review")
  const admin = deps({ role: "admin" })
  assert.equal((await claimPurchaseByTransaction("HP0907585127", admin.deps)).status, "review")
  assert.equal(admin.calls.sent.length, 0)
  const blocked = deps({ access: false })
  assert.equal((await claimPurchaseByTransaction("HP0907585127", blocked.deps)).status, "review")
  assert.equal(blocked.calls.sent.length, 0)
})

function localDeps(records, { access = true, apiFails = false } = {}) {
  const base = deps({ access })
  base.deps.local = { async findByTransaction() { return records } }
  if (apiFails) base.deps.sales = { async findPaidSaleByTransaction() { base.calls.api = true; throw new Error("hotmart 400") } }
  else {
    const original = base.deps.sales.findPaidSaleByTransaction
    base.deps.sales = { async findPaidSaleByTransaction(code) { base.calls.api = true; return original(code) } }
  }
  return base
}

test("registro local: compra já ligada a uma conta envia o link para o e-mail dessa conta, sem API", async () => {
  const { deps: d, calls } = localDeps({ entitlement: { status: "active", email: "outro.email@hotmail.com", role: "student" }, event: null })
  const result = await claimPurchaseByTransaction("HP0907585127", d)
  assert.equal(result.status, "granted")
  assert.deepEqual(calls.sent, ["outro.email@hotmail.com"])
  assert.match(result.message, /ou\*\*\*@hotmail\.com/)
  assert.equal(calls.api, undefined)
})

test("registro local: pagamento pendente, cancelado e conta admin não enviam link", async () => {
  for (const [status, expected] of [["suspended", "pending"], ["revoked", "canceled"]]) {
    const { deps: d, calls } = localDeps({ entitlement: { status, email: "a@b.com", role: "student" }, event: null })
    assert.equal((await claimPurchaseByTransaction("HP0907585127", d)).status, expected)
    assert.equal(calls.sent.length, 0)
  }
  const admin = localDeps({ entitlement: { status: "active", email: "a@b.com", role: "admin" }, event: null })
  assert.equal((await claimPurchaseByTransaction("HP0907585127", admin.deps)).status, "review")
  assert.equal(admin.calls.sent.length, 0)
  const blocked = localDeps({ entitlement: { status: "active", email: "a@b.com", role: "student" }, event: null }, { access: false })
  assert.equal((await claimPurchaseByTransaction("HP0907585127", blocked.deps)).status, "review")
})

test("registro local: oferta só do curso explica sem API; evento de reembolso vira cancelada", async () => {
  const courseOnly = localDeps({ entitlement: null, event: { productUcode: UCODE, offerCode: "semsga", latestType: "PURCHASE_COMPLETE" } })
  assert.equal((await claimPurchaseByTransaction("HP0907585127", courseOnly.deps)).status, "course_only")
  assert.equal(courseOnly.calls.api, undefined)
  const refunded = localDeps({ entitlement: null, event: { productUcode: UCODE, offerCode: "comsga", latestType: "PURCHASE_REFUNDED" } })
  assert.equal((await claimPurchaseByTransaction("HP0907585127", refunded.deps)).status, "canceled")
})

test("compra conhecida localmente sem e-mail: usa a API; se a API falhar, manda ao suporte em vez de erro", async () => {
  const known = { entitlement: null, event: { productUcode: UCODE, offerCode: "comsga", latestType: "PURCHASE_APPROVED" } }
  const ok = localDeps(known)
  assert.equal((await claimPurchaseByTransaction("HP0907585127", ok.deps)).status, "granted")
  assert.equal(ok.calls.api, true)
  const failing = localDeps(known, { apiFails: true })
  assert.equal((await claimPurchaseByTransaction("HP0907585127", failing.deps)).status, "review")
  const unknown = localDeps(null, { apiFails: true })
  await assert.rejects(claimPurchaseByTransaction("HP0907585127", unknown.deps))
})

test("curso não publicado: oferta 'curso apenas' ainda é explicada (cadastro bruto), sem API", async () => {
  const records = { entitlement: null, event: { productUcode: UCODE, offerCode: "semsga", latestType: "PURCHASE_APPROVED" } }
  const t = localDeps(records)
  t.deps.repository.findProductMapping = async () => null // filtro de curso publicado
  t.deps.local.findProductMapping = async () => mapping
  assert.equal((await claimPurchaseByTransaction("HP0907585127", t.deps)).status, "course_only")
  assert.equal(t.calls.api, undefined)
})

test("compra com SGA conhecida, API indisponível: mensagem específica e erro registrado", async () => {
  const known = { entitlement: null, event: { productUcode: UCODE, offerCode: "comsga", latestType: "PURCHASE_COMPLETE" } }
  const t = localDeps(known, { apiFails: true })
  let logged = false
  t.deps.onApiError = () => { logged = true }
  const result = await claimPurchaseByTransaction("HP0907585127", t.deps)
  assert.equal(result.status, "review")
  assert.match(result.message, /com o SGA/)
  assert.equal(logged, true)
})
