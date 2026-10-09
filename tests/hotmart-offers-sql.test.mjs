import assert from "node:assert/strict"
import { afterEach, beforeEach, test } from "node:test"
import { PGlite } from "@electric-sql/pglite"
import { applyMigration, asRole, fixture, migrations } from "./helpers/database.mjs"

// SQL real (PGlite) para a migração de ofertas e do reenvio de acesso.
const ADMIN = "00000000-0000-4000-8000-000000000001"
const STUDENT = "00000000-0000-4000-8000-000000000002"
const COURSE = "00000000-0000-4000-8000-000000000010"
const MAPPING = "00000000-0000-4000-8000-000000000030"
let db

beforeEach(async () => {
  db = new PGlite()
  await db.exec(fixture)
  for (const name of migrations) await applyMigration(db, name)
  await db.exec(`
    insert into auth.users (id,email) values ('${ADMIN}','admin@test.invalid'), ('${STUDENT}','student@test.invalid');
    update profiles set role = 'admin' where id = '${ADMIN}';
    insert into courses (id,name,status) values ('${COURSE}','Curso','published');
    insert into hotmart_product_mappings (id, course_id, hotmart_product_ucode) values ('${MAPPING}','${COURSE}','ucode-1');
  `)
  await applyMigration(db, "20261009000200_hotmart_offer_authorization.sql")
})

afterEach(async () => { await db.close() })

const asAdmin = (operation) => asRole(db, ADMIN, "authenticated", operation)
const asStudent = (operation) => asRole(db, STUDENT, "authenticated", operation)

test("migração é aditiva: produtos existentes continuam aceitando qualquer oferta", async () => {
  const { rows } = await db.query("select offer_policy from hotmart_product_mappings where id = $1", [MAPPING])
  assert.equal(rows[0].offer_policy, "any")
  await assert.rejects(db.query("update hotmart_product_mappings set offer_policy = 'qualquer'"))
})

test("somente administradores gerenciam regras de oferta; código inválido ou duplicado é rejeitado", async () => {
  await asAdmin(() => db.query(
    "insert into hotmart_offer_rules (mapping_id, offer_code, grants_access, created_by) values ($1,'4e4p713s',true,$2), ($1,'qkpqg5ea',false,$2)",
    [MAPPING, ADMIN],
  ))
  await assert.rejects(asAdmin(() => db.query(
    "insert into hotmart_offer_rules (mapping_id, offer_code, grants_access) values ($1,'4e4p713s',false)", [MAPPING])))
  await assert.rejects(asAdmin(() => db.query(
    "insert into hotmart_offer_rules (mapping_id, offer_code, grants_access) values ($1,'4E4P713S ',true)", [MAPPING])))

  const visible = await asStudent(() => db.query("select * from hotmart_offer_rules"))
  assert.equal(visible.rows.length, 0)
  await assert.rejects(asStudent(() => db.query(
    "insert into hotmart_offer_rules (mapping_id, offer_code, grants_access) values ($1,'abc',true)", [MAPPING])))
  await assert.rejects(asRole(db, null, "anon", () => db.query("select * from hotmart_offer_rules")))

  const rules = await asAdmin(() => db.query("select offer_code, grants_access from hotmart_offer_rules order by offer_code"))
  assert.deepEqual(rules.rows.map((row) => [row.offer_code, row.grants_access]), [["4e4p713s", true], ["qkpqg5ea", false]])
})

test("pedidos de reenvio só são acessíveis pelo servidor", async () => {
  await asRole(db, null, "service_role", () => db.query(
    "insert into access_resend_requests (email_hash, ip_hash, outcome) values ('e','i','accepted')"))
  await assert.rejects(asRole(db, null, "anon", () => db.query("select * from access_resend_requests")))
  await assert.rejects(asStudent(() => db.query("select * from access_resend_requests")))
  await assert.rejects(asAdmin(() => db.query("insert into access_resend_requests (email_hash, ip_hash, outcome) values ('e','i','sent')")))
  await assert.rejects(asRole(db, null, "service_role", () => db.query(
    "insert into access_resend_requests (email_hash, ip_hash, outcome) values ('e','i','qualquer')")))
})

test("oferta da transação e do evento ficam registradas sem dados pessoais", async () => {
  const columns = await db.query(
    "select table_name, column_name from information_schema.columns where column_name = 'offer_code' order by table_name")
  assert.deepEqual(columns.rows.map((row) => row.table_name), ["hotmart_entitlements", "hotmart_offer_rules", "hotmart_webhook_events"])
})
