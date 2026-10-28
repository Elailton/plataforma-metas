import assert from "node:assert/strict"
import { afterEach, beforeEach, test } from "node:test"
import { PGlite } from "@electric-sql/pglite"
import { applyMigration, asRole, fixture, migrations } from "./helpers/database.mjs"

// SQL real (PGlite) da Fase B: e-mail do comprador nos eventos, criação de direito
// só quando ausente ("Compra concluída") e limpeza de 90 dias.
const ADMIN = "00000000-0000-4000-8000-000000000001"
const STUDENT = "00000000-0000-4000-8000-000000000002"
const COURSE = "00000000-0000-4000-8000-000000000010"
let db

beforeEach(async () => {
  db = new PGlite()
  await db.exec(fixture)
  for (const name of migrations) await applyMigration(db, name)
  await applyMigration(db, "20261009000200_hotmart_offer_authorization.sql")
  await applyMigration(db, "20261028000100_hotmart_buyer_email.sql")
  await db.exec(`
    insert into auth.users (id,email) values ('${ADMIN}','admin@test.invalid'), ('${STUDENT}','student@test.invalid');
    update profiles set role = 'admin' where id = '${ADMIN}';
    insert into profiles (id, full_name, avatar_initials, role) values ('${STUDENT}','Aluno','AL','student')
      on conflict (id) do update set role = 'student';
    insert into courses (id,name,status) values ('${COURSE}','Curso','published');
  `)
})

afterEach(async () => { await db.close() })

const claim = (id, email, transaction = "HP1") => asRole(db, null, "service_role", () => db.query(
  "select * from claim_hotmart_webhook_event($1,'PURCHASE_APPROVED',$2,'ucode-1',$3)", [id, transaction, email]))
const emailOf = async (id) =>
  (await db.query("select buyer_email from hotmart_webhook_events where hotmart_event_id=$1", [id])).rows[0]?.buyer_email
const createIfAbsent = (transaction, status = "active", eventId = "ev-c", user = STUDENT) =>
  asRole(db, null, "service_role", () => db.query(
    `select * from create_hotmart_entitlement_if_absent($1,$2,$3,'ucode-1',null,null,$4,$5,$6)`,
    [transaction, user, COURSE, status, eventId, "2026-10-20T00:00:00Z"]))

test("claim guarda o e-mail normalizado; formato inválido não falha o webhook", async () => {
  const first = await claim("ev1", " Aluno@Email.COM ")
  assert.equal(first.rows[0].was_claimed, true)
  assert.equal(await emailOf("ev1"), "aluno@email.com")
  assert.equal((await claim("ev2", "sem-arroba")).rows[0].was_claimed, true)
  assert.equal(await emailOf("ev2"), null)
  // Evento concluído não é reprocessado nem tem o e-mail trocado.
  await db.query("update hotmart_webhook_events set processing_status='processed' where hotmart_event_id='ev1'")
  assert.equal((await claim("ev1", "outro@email.com")).rows[0].was_claimed, false)
  assert.equal(await emailOf("ev1"), "aluno@email.com")
  // Retentativa de evento com falha preenche o e-mail que faltava.
  await db.query("update hotmart_webhook_events set processing_status='failed' where hotmart_event_id='ev2'")
  assert.equal((await claim("ev2", "certo@email.com")).rows[0].was_claimed, true)
  assert.equal(await emailOf("ev2"), "certo@email.com")
  // A restrição recusa gravação direta fora do padrão.
  await assert.rejects(db.query("update hotmart_webhook_events set buyer_email='Maiuscula@Email.com' where hotmart_event_id='ev1'"))
})

test("e-mail só é lido por administrador e servidor; anon e aluno não leem nem escrevem", async () => {
  await claim("ev1", "aluno@email.com")
  await assert.rejects(asRole(db, null, "anon", () => db.query("select buyer_email from hotmart_webhook_events")))
  const asStudent = await asRole(db, STUDENT, "authenticated", () => db.query("select buyer_email from hotmart_webhook_events"))
  assert.equal(asStudent.rows.length, 0)
  await assert.rejects(asRole(db, STUDENT, "authenticated", () => db.query(
    "insert into hotmart_webhook_events (hotmart_event_id, event_type, processing_status) values ('x','PURCHASE_APPROVED','processing')")))
  await assert.rejects(asRole(db, ADMIN, "authenticated", () => db.query(
    "update hotmart_webhook_events set buyer_email = null")))
  const asAdmin = await asRole(db, ADMIN, "authenticated", () => db.query("select buyer_email from hotmart_webhook_events"))
  assert.deepEqual(asAdmin.rows.map((row) => row.buyer_email), ["aluno@email.com"])
  for (const fn of ["claim_hotmart_webhook_event('a','b','c','d','e')", "purge_stale_hotmart_buyer_emails()"]) {
    await assert.rejects(asRole(db, ADMIN, "authenticated", () => db.query(`select ${fn}`)))
  }
})

test("criação só quando ausente: cria direito novo e nunca altera um existente", async () => {
  const created = await createIfAbsent("HP-new")
  assert.equal(created.rows[0].event_applied, true)
  assert.equal(created.rows[0].enrollment_status, "active")

  await asRole(db, null, "service_role", () => db.query(
    `select * from apply_hotmart_entitlement_event('HP-old',null,$1,'ucode-1',null,null,'suspended','ev-d','2026-10-01T00:00:00Z')`, [COURSE]))
  const skipped = await createIfAbsent("HP-old", "active", "ev-c2")
  assert.equal(skipped.rows[0].event_applied, false)
  assert.equal(skipped.rows[0].entitlement_status, "suspended")
  const row = (await db.query("select status, user_id, last_event_id from hotmart_entitlements where transaction='HP-old'")).rows[0]
  assert.deepEqual([row.status, row.user_id, row.last_event_id], ["suspended", null, "ev-d"])

  // Administrador nunca recebe direito.
  await assert.rejects(createIfAbsent("HP-adm", "active", "ev-a", ADMIN))
  assert.equal((await db.query("select count(*)::int n from hotmart_entitlements where transaction='HP-adm'")).rows[0].n, 0)
})

test("limpeza de 90 dias anula só o e-mail de eventos sem direito e nunca apaga linhas", async () => {
  await claim("old-none", "a@email.com", "HP-none")
  await claim("old-ent", "b@email.com", "HP-ent")
  await claim("recent", "c@email.com", "HP-recent")
  await db.query("update hotmart_webhook_events set created_at = now() - interval '91 days' where hotmart_event_id in ('old-none','old-ent')")
  await createIfAbsent("HP-ent")
  const purged = await asRole(db, null, "service_role", () => db.query("select purge_stale_hotmart_buyer_emails() n"))
  assert.equal(purged.rows[0].n, 1)
  assert.equal(await emailOf("old-none"), null)
  assert.equal(await emailOf("old-ent"), "b@email.com")
  assert.equal(await emailOf("recent"), "c@email.com")
  assert.equal((await db.query("select count(*)::int n from hotmart_webhook_events")).rows[0].n, 3)
  await assert.rejects(asRole(db, null, "service_role", () => db.query("select purge_stale_hotmart_buyer_emails(interval '1 hour')")))
})

test("a versão antiga do claim (4 argumentos) continua funcionando", async () => {
  const result = await asRole(db, null, "service_role", () => db.query(
    "select * from claim_hotmart_webhook_event('ev-old','PURCHASE_APPROVED','HP9','ucode-1')"))
  assert.equal(result.rows[0].was_claimed, true)
  assert.equal(await emailOf("ev-old"), null)
})
