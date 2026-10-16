import test from "node:test"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { PGlite } from "@electric-sql/pglite"
import { fixture, migrations, applyMigration } from "./helpers/database.mjs"
import { recoverHotmartPurchases } from "../lib/hotmart/recover-purchase.mjs"
import { deliverResend } from "../lib/auth/resend-access.mjs"

const EMAIL = "buyer@test.invalid"
const ADMIN = "00000000-0000-4000-8000-000000000001"
const C1 = "00000000-0000-4000-8000-000000000010"
const C2 = "00000000-0000-4000-8000-000000000020"
const APPROVED = Date.UTC(2026, 8, 1)
const purchase = (changes = {}) => ({
  email: EMAIL, fullName: "Aluno", productId: "123", productUcode: "product-one",
  buyerUcode: null, transaction: "HP123", approvedDate: APPROVED, offerCode: "yes", ...changes,
})

test("recuperação com SQL real: conta ausente, vários cursos, oferta, bloqueio, idempotência e reembolso concorrente", async t => {
  const db = new PGlite()
  try {
    await db.exec(fixture)
    for (const name of migrations) await applyMigration(db, name)
    await applyMigration(db, "20261009000200_hotmart_offer_authorization.sql")
    await db.query("insert into auth.users(id,email) values($1,'admin@test.invalid')", [ADMIN])
    await db.query("update profiles set role='admin' where id=$1", [ADMIN])
    await db.query("insert into courses(id,name,status) values($1,'Curso 1','published'),($2,'Curso 2','published')", [C1, C2])
    await db.query(`insert into hotmart_product_mappings(course_id,hotmart_product_ucode,offer_policy)
      values($1,'product-one','authorized_offers'),($2,'product-two','any')`, [C1, C2])
    await db.exec(`insert into hotmart_offer_rules(mapping_id,offer_code,grants_access)
      select id,'yes',true from hotmart_product_mappings where hotmart_product_ucode='product-one'`)

    const one = async (sql, values) => (await db.query(sql, values)).rows[0]
    let accountsCreated = 0
    let beforeApply = null
    const repo = {
      async findUserByEmail(email) { return (await one("select id from auth.users where lower(email)=$1", [email]))?.id ?? null },
      async getProfileRole(id) { return (await one("select role from profiles where id=$1", [id]))?.role ?? null },
      async findProductMapping(ucode) {
        const row = await one(`select m.*,c.status course_status from hotmart_product_mappings m
          join courses c on c.id=m.course_id where hotmart_product_ucode=$1`, [ucode])
        if (!row || row.course_status !== "published") return null
        const { rows } = await db.query("select offer_code,grants_access from hotmart_offer_rules where mapping_id=$1", [row.id])
        return { courseId: row.course_id, active: row.active, offerPolicy: row.offer_policy,
          offers: rows.map(r => ({ code: r.offer_code, grantsAccess: r.grants_access })) }
      },
      async claimEvent(event) {
        const row = await one("select * from claim_hotmart_webhook_event($1,$2,$3,$4)", [event.eventId,event.eventType,event.transaction,event.productUcode])
        return { claimed: row.was_claimed, status: row.current_status }
      },
      async finishEvent(id, status, message) { await db.query("update hotmart_webhook_events set processing_status=$2,error_message=$3 where hotmart_event_id=$1", [id,status,message]) },
      async failEvent(id) { await db.query("update hotmart_webhook_events set processing_status='failed' where hotmart_event_id=$1", [id]) },
      async findEntitlement(transaction) {
        const r = await one("select * from hotmart_entitlements where transaction=$1", [transaction])
        return r ? { userId:r.user_id,courseId:r.course_id,productUcode:r.product_ucode,status:r.status,eventCreationDate:r.last_event_creation_date,offerCode:r.offer_code } : null
      },
      async inviteStudent({ email }) {
        const existing = await repo.findUserByEmail(email)
        if (existing) return existing
        const id = randomUUID()
        await db.query("insert into auth.users(id,email) values($1,$2)", [id,email])
        accountsCreated++
        return id
      },
      async ensureStudentProfile(id) { return repo.getProfileRole(id) },
      async applyEntitlementEvent(p) {
        if (beforeApply) { const hook = beforeApply; beforeApply = null; await hook(p) }
        const row = await one("select * from apply_hotmart_entitlement_event($1,$2,$3,$4,$5,$6,$7,$8,$9)",
          [p.transaction,p.userId,p.courseId,p.productUcode,p.productId,p.buyerUcode,p.status,p.eventId,p.eventCreationDate])
        return { applied:row.event_applied,entitlementStatus:row.entitlement_status,enrollmentStatus:row.enrollment_status }
      },
    }
    let rows = []
    let confirmed = true
    const sales = { findPaidPurchases: async () => rows, confirmPurchase: async () => confirmed }
    const sent = []
    let outcome
    const deps = {
      async hasActiveStudentAccess(email) {
        const row = await one(`select exists(select 1 from auth.users u join profiles p on p.id=u.id
          join enrollments e on e.user_id=p.id join courses c on c.id=e.course_id
          where u.email=$1 and p.role='student' and e.status='active' and c.status='published'
          and not exists(select 1 from course_access_blocks b where b.user_id=u.id and b.course_id=c.id and released_at is null)) eligible`, [email])
        return row.eligible
      },
      recoverStudentAccess: email => recoverHotmartPurchases(email, { sales, repository:repo }),
      sendAccessEmail: async email => { sent.push(email) },
      updateOutcome: async (_,value) => { outcome = value },
    }
    await t.test("sem compra, oferta desconhecida ou reconfirmação recusada não cria conta", async () => {
      for (const list of [[],[purchase({offerCode:"no"})],[purchase({productUcode:"unmapped"})]]) {
        rows = list
        assert.equal(await deliverResend({email:EMAIL,requestId:1},deps), "skipped")
      }
      rows = [purchase()]; confirmed = false
      assert.equal(await deliverResend({email:EMAIL,requestId:1},deps), "skipped")
      confirmed = true
      assert.equal(accountsCreated,0)
    })
    await t.test("compra em dois cursos restaura uma conta e duas matrículas antes de um e-mail", async () => {
      rows = [purchase(),purchase({transaction:"HP456",productUcode:"product-two",productId:"456"})]
      assert.equal(await deliverResend({email:EMAIL,requestId:1},deps),"sent")
      assert.equal(accountsCreated,1)
      assert.equal((await one("select count(*)::int n from enrollments")).n,2)
      assert.deepEqual(sent,[EMAIL]); assert.equal(outcome,"sent")
      await recoverHotmartPurchases(EMAIL,{sales,repository:repo})
      assert.equal(accountsCreated,1)
      assert.equal((await one("select count(*)::int n from hotmart_entitlements")).n,2)
    })
    await t.test("bloqueios continuam suspensos mesmo com compra aprovada", async () => {
      const uid = await repo.findUserByEmail(EMAIL)
      for (const course of [C1,C2]) {
        await db.query("insert into course_access_blocks(user_id,course_id,reason,blocked_by) values($1,$2,'Teste de bloqueio',$3)",[uid,course,ADMIN])
        await db.query("select reconcile_course_enrollment($1,$2)",[uid,course])
      }
      assert.equal(await deliverResend({email:EMAIL,requestId:1},deps),"skipped")
      assert.equal(sent.length,1)
      assert.equal((await one("select count(*)::int n from enrollments where status='suspended'")).n,2)
    })
    await t.test("reembolso recebido entre consulta e gravação vence a aprovação antiga", async () => {
      rows = [purchase({transaction:"HP789"})]
      beforeApply = async p => {
        await one("select * from apply_hotmart_entitlement_event($1,$2,$3,$4,$5,$6,'revoked','refund',$7)",
          [p.transaction,p.userId,p.courseId,p.productUcode,p.productId,p.buyerUcode,new Date(APPROVED+1000).toISOString()])
      }
      assert.equal(await deliverResend({email:EMAIL,requestId:1},deps),"skipped")
      assert.equal((await one("select status from hotmart_entitlements where transaction='HP789'")).status,"revoked")
      assert.equal(sent.length,1)
    })
    await t.test("administrador não consulta nem recebe matrícula", async () => {
      const shouldNotCall = {findPaidPurchases: async () => assert.fail("admin must not query purchases")}
      await recoverHotmartPurchases("admin@test.invalid",{sales:shouldNotCall,repository:repo})
      assert.equal((await one("select count(*)::int n from enrollments where user_id=$1",[ADMIN])).n,0)
    })
  } finally { await db.close() }
})
