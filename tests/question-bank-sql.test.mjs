import assert from "node:assert/strict"
import { test } from "node:test"
import { PGlite } from "@electric-sql/pglite"
import { applyMigration, asRole, fixture, migrations } from "./helpers/database.mjs"
import { seedSql, USERS } from "./helpers/rls-scenario.mjs"

// SQL real (PGlite) do banco de questões: só o administrador lê e grava, anuladas
// são recusadas, nada é apagado e curso/disciplina/tópico não se misturam.
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`
const COURSE_A = id(100)
const COURSE_B = id(101)
const SUBJECT_A = id(110)
const SUBJECT_B = id(111)
const TOPIC_A = id(120)
const SOURCE = id(950)
const ITEM = id(960)
const alts = JSON.stringify(["A", "B", "C", "D"].map((key) => ({ key, text: `Alternativa ${key}` })))

async function setup() {
  const db = new PGlite()
  await db.exec(fixture)
  for (const name of migrations) await applyMigration(db, name)
  await applyMigration(db, "20260912000100_goal_release_guard.sql")
  await db.exec("alter table courses add column updated_at timestamptz default now()")
  await applyMigration(db, "20261009000100_course_groups.sql")
  await applyMigration(db, "20261009000200_hotmart_offer_authorization.sql")
  await db.exec("alter table goals add constraint goals_status_check check (status in ('draft','published'))")
  await applyMigration(db, "20261009000300_goal_archive_status.sql")
  await applyMigration(db, "20261009000400_orientation_goal_save.sql")
  await applyMigration(db, "20261010000100_rls_performance.sql")
  await applyMigration(db, "20261010000200_goal_group_rls_performance.sql")
  await db.exec(seedSql)
  await applyMigration(db, "20261013000200_mini_quizzes.sql")
  await applyMigration(db, "20261103000100_question_bank.sql")
  await db.exec(`
    insert into question_bank_sources (id, course_id, board, exam_year, organization, role_name, booklet, total_questions, annulled_numbers)
      values ('${SOURCE}', '${COURSE_A}', 'Banca X', 2024, 'Órgão', 'Cargo', 'Tipo 1', 60, '{7,9}');
    insert into question_bank_items (id, course_id, origin, source_id, source_number, subject_id, topic_id, statement, alternatives)
      values ('${ITEM}', '${COURSE_A}', 'prova_anterior', '${SOURCE}', 1, '${SUBJECT_A}', '${TOPIC_A}', 'Questão 1', '${alts}');
    insert into question_bank_answer_keys (item_id, correct_key) values ('${ITEM}', 'C');
  `)
  return db
}

const insertItem = (db, values) => db.query(
  `insert into question_bank_items (course_id, origin, source_id, source_number, subject_id, topic_id, statement, alternatives)
   values ($1, 'prova_anterior', $2, $3, $4, $5, 'Q', $6)`,
  [values.course ?? COURSE_A, SOURCE, values.number, values.subject ?? null, values.topic ?? null, values.alts ?? alts])

test("questão anulada, curso misturado, tópico de outra disciplina e gabarito inválido são recusados", async () => {
  const db = await setup()
  await assert.rejects(insertItem(db, { number: 7 }), /QUESTION_BANK_ANNULLED/)
  await assert.rejects(insertItem(db, { number: 2, course: COURSE_B }), /QUESTION_BANK_INVALID_SOURCE/)
  await assert.rejects(insertItem(db, { number: 2, subject: SUBJECT_B }), /QUESTION_BANK_INVALID_SUBJECT/)
  await assert.rejects(insertItem(db, { number: 2, subject: null, topic: TOPIC_A }), /QUESTION_BANK_INVALID_TOPIC/)
  await assert.rejects(insertItem(db, { number: 2, alts: JSON.stringify([{ key: "A", text: "x" }, { key: "A", text: "y" }]) }), /INVALID_ALTERNATIVES/)
  await assert.rejects(insertItem(db, { number: 1 }), /duplicate|unique/i)
  await assert.rejects(db.query(`update question_bank_answer_keys set correct_key='E' where item_id='${ITEM}'`), /QUESTION_BANK_INVALID_KEY/)
  // Marcar depois como anulada uma questão já guardada também é recusado.
  await assert.rejects(db.query(`update question_bank_sources set annulled_numbers='{1}' where id='${SOURCE}'`), /QUESTION_BANK_ANNULLED/)
  await db.close()
})

test("só o administrador lê e grava; aluno e anon não veem banco nem gabarito; ninguém apaga", async () => {
  const db = await setup()
  const asAdmin = await asRole(db, USERS.admin, "authenticated", () => db.query("select correct_key from question_bank_answer_keys"))
  assert.deepEqual(asAdmin.rows, [{ correct_key: "C" }])
  const student = await asRole(db, USERS.groupOne, "authenticated", () => db.query(
    "select (select count(*) from question_bank_items) i, (select count(*) from question_bank_answer_keys) k, (select count(*) from question_bank_sources) s"))
  assert.deepEqual(student.rows, [{ i: 0, k: 0, s: 0 }])
  await assert.rejects(asRole(db, USERS.groupOne, "authenticated", () => insertItem(db, { number: 3 })))
  await assert.rejects(asRole(db, null, "anon", () => db.query("select * from question_bank_items")))
  await assert.rejects(asRole(db, USERS.admin, "authenticated", () => db.query(`delete from question_bank_items where id='${ITEM}'`)))
  // O administrador arquiva em vez de apagar.
  await asRole(db, USERS.admin, "authenticated", () => db.query(`update question_bank_items set archived_at=now() where id='${ITEM}'`))
  assert.equal((await db.query(`select archived_at is not null a from question_bank_items where id='${ITEM}'`)).rows[0].a, true)
  await db.close()
})

test("questão de diagnóstico entra no banco com vínculo e a cópia aponta a origem", async () => {
  const db = await setup()
  const quiz = id(970), question = id(971)
  await db.exec(`
    insert into mini_quizzes (id, course_id, subject_id, title, status) values ('${quiz}', '${COURSE_A}', '${SUBJECT_A}', 'Q', 'published');
    insert into mini_quiz_questions (id, quiz_id, position, statement, alternatives) values ('${question}', '${quiz}', 0, 'Diag', '${alts}');
  `)
  await db.query(`insert into question_bank_items (course_id, origin, mini_quiz_question_id, statement, alternatives)
    values ('${COURSE_A}', 'diagnostico', '${question}', 'Diag', '${alts}')`)
  await assert.rejects(db.query(`insert into question_bank_items (course_id, origin, mini_quiz_question_id, statement, alternatives)
    values ('${COURSE_B}', 'diagnostico', '${question}', 'Diag', '${alts}')`), /QUESTION_BANK_INVALID_SOURCE/)
  await db.query(`update mini_quiz_questions set bank_item_id='${ITEM}' where id='${question}'`)
  assert.equal((await db.query(`select bank_item_id from mini_quiz_questions where id='${question}'`)).rows[0].bank_item_id, ITEM)
  await db.close()
})
