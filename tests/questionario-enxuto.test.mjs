import { test, beforeEach, afterEach } from "node:test"
import assert from "node:assert/strict"
import { PGlite } from "@electric-sql/pglite"
import { fixture, migrations, applyMigration, asRole } from "./helpers/database.mjs"
const A = "00000000-0000-4000-8000-000000000001",
  S = "00000000-0000-4000-8000-000000000002",
  C = "00000000-0000-4000-8000-000000000010"
let db, enrollment
const admin = (op) => asRole(db, A, "authenticated", op),
  student = (op) => asRole(db, S, "authenticated", op)
const ids = (n) => Array.from({ length: n }, (_, i) => `q${String(i + 1).padStart(2, "0")}`)
const schema = (n) =>
  ids(n).map((id, i) => ({ id, title: `Pergunta ${i + 1}`, type: "single", options: [{ value: "a", label: "A" }] }))
const payload = (n, code) => ({
  answers: Object.fromEntries(ids(n).map((k, i) => [k, i === 0 ? code : "a"])),
  labels: Object.fromEntries(ids(n).map((k) => [k, "Resposta"])),
})
beforeEach(async () => {
  db = new PGlite()
  await db.exec(fixture)
  for (const m of migrations) await applyMigration(db, m)
  await applyMigration(db, "20260912000100_goal_release_guard.sql")
  await db.exec("alter table courses add column updated_at timestamptz default now()")
  await applyMigration(db, "20261009000100_course_groups.sql")
  await applyMigration(db, "20261110000100_questionario_enxuto.sql")
  await db.exec(
    `insert into auth.users(id,email) values ('${A}','admin@test.invalid'),('${S}','student@test.invalid');update profiles set role='admin' where id='${A}';insert into courses(id,name,status) values ('${C}','A','published');`,
  )
  await admin(() => db.query("select admin_enroll_existing_student($1,$2)", ["student@test.invalid", C]))
  enrollment = (await db.query("select id from enrollments where user_id=$1 and course_id=$2", [S, C])).rows[0].id
})
afterEach(async () => db?.close())
const enable = (n) =>
  admin(() => db.query("select admin_set_course_groups($1,true,$2)", [C, JSON.stringify(schema(n))]))
const save = (p) =>
  student(() => db.query("select save_course_questionnaire($1,gen_random_uuid(),$2) g", [enrollment, p]))
test("formulário enxuto de 5 perguntas é aceito e 'Mais de 4 horas' vai para o Grupo 1", async () => {
  await enable(5)
  assert.equal((await save(payload(5, "de_4_a_6h"))).rows[0].g, 1)
})
test("formulário enxuto incompleto é recusado", async () => {
  await enable(5)
  const p = payload(5, "de_2_a_3h")
  delete p.answers.q05
  await assert.rejects(save(p))
})
test("questionário de 20 perguntas continua exigindo as 20", async () => {
  await enable(20)
  await assert.rejects(save(payload(5, "de_2_a_3h")))
  assert.equal((await save(payload(20, "mais_6h"))).rows[0].g, 1)
})
test("faixa inválida continua recusada", async () => {
  await enable(5)
  await assert.rejects(save(payload(5, "oito_horas")))
})
