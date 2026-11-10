import assert from "node:assert/strict"
import { test } from "node:test"
import { PGlite } from "@electric-sql/pglite"
import { applyMigration, asRole, fixture, migrations } from "./helpers/database.mjs"
import { seedSql, USERS } from "./helpers/rls-scenario.mjs"

// Fase 3: bloco "Se sobrar tempo". Itens extras ficam fora de goal_items (fora do progresso),
// e cada aluno só lê os do seu nível nas metas que já pode ver.
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`
const COURSE_A = id(100)
const SUBJECT_A = id(110)
const GOAL_G1 = id(140)
const GOAL_G2 = id(141)
const MAT_A = id(130)
const X = { g1t1: id(700), g1t3: id(701), g2t1: id(702) }

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
  await applyMigration(db, "20261021000100_mini_quiz_weekly_groups.sql")
  await applyMigration(db, "20261021000200_mini_quiz_timer_ranking.sql")
  await applyMigration(db, "20261022000100_test_group_and_group_settings.sql")
  await applyMigration(db, "20261110000200_se_sobrar_tempo.sql")
  await db.exec(`
    insert into public.goal_extra_items (id, goal_id, tier, subject_id, instructions, suggested_questions) values
      ('${X.g1t1}', '${GOAL_G1}', 1, '${SUBJECT_A}', 'Mais 10 questões', 10),
      ('${X.g1t3}', '${GOAL_G1}', 3, '${SUBJECT_A}', 'Revisão extra', 10),
      ('${X.g2t1}', '${GOAL_G2}', 1, '${SUBJECT_A}', 'Mais 10 questões', 10);
    insert into public.goal_extra_item_materials (extra_item_id, material_id) values ('${X.g1t1}', '${MAT_A}');
  `)
  return db
}

const asStudent = (db, user, sql, params = []) => asRole(db, user, "authenticated", () => db.query(sql, params))
const extras = async (db, user) =>
  (await asStudent(db, user, "select id from public.goal_extra_items order by id")).rows.map((row) => row.id)
const setAnswer = (db, user, code) =>
  db.query(
    "update public.enrollments set questionnaire = jsonb_build_object('answers', jsonb_build_object('q01', $1::text)) where user_id = $2 and course_id = $3",
    [code, user, COURSE_A],
  )

test("nível vem da resposta de horas: 2h só a base; 4h vê até o nível 2; ajuste do admin prevalece", async () => {
  const db = await setup()
  try {
    assert.deepEqual(await extras(db, USERS.groupOne), [])
    await setAnswer(db, USERS.groupOne, "de_1_a_2h")
    assert.deepEqual(await extras(db, USERS.groupOne), [])
    await setAnswer(db, USERS.groupOne, "de_3_a_4h")
    assert.deepEqual(await extras(db, USERS.groupOne), [X.g1t1])
    const enrollment = (await db.query("select id from public.enrollments where user_id = $1 and course_id = $2", [USERS.groupOne, COURSE_A])).rows[0].id
    await asStudent(db, USERS.admin, "select public.admin_set_extra_tier($1, $2, 3::smallint)", [enrollment, COURSE_A])
    assert.deepEqual(await extras(db, USERS.groupOne), [X.g1t1, X.g1t3])
    assert.equal(
      (await asStudent(db, USERS.groupOne, "select count(*)::int n from public.goal_extra_item_materials")).rows[0].n,
      1,
    )
  } finally {
    await db.close()
  }
})

test("extras seguem a visibilidade da meta (grupo, curso, bloqueio) e não são graváveis por aluno", async () => {
  const db = await setup()
  try {
    await setAnswer(db, USERS.groupTwo, "mais_6h")
    assert.deepEqual(await extras(db, USERS.groupTwo), [X.g2t1])
    await setAnswer(db, USERS.blocked, "mais_6h")
    assert.deepEqual(await extras(db, USERS.blocked), [])
    assert.deepEqual(await extras(db, USERS.otherCourse), [])
    await assert.rejects(
      asStudent(db, USERS.groupTwo, "insert into public.goal_extra_items (goal_id, tier, instructions) values ($1, 1, 'x')", [GOAL_G2]),
    )
    const enrollment = (await db.query("select id from public.enrollments where user_id = $1 and course_id = $2", [USERS.groupTwo, COURSE_A])).rows[0].id
    await assert.rejects(asStudent(db, USERS.groupTwo, "select public.admin_set_extra_tier($1, $2, 3::smallint)", [enrollment, COURSE_A]))
    await asStudent(db, USERS.groupTwo, "update public.enrollments set extra_tier_override = 3 where user_id = $1", [USERS.groupTwo])
    assert.equal(
      (await db.query("select extra_tier_override from public.enrollments where id = $1", [enrollment])).rows[0].extra_tier_override,
      null,
    )
    await assert.rejects(asRole(db, null, "anon", () => db.query("select id from public.goal_extra_items")))
  } finally {
    await db.close()
  }
})

test("função 'se_sobrar_tempo' começa desligada nos Grupos 1 e 2", async () => {
  const db = await setup()
  try {
    const rows = (await db.query("select study_group, disabled_features from public.course_group_settings where course_id = $1 order by study_group", [COURSE_A])).rows
    assert.deepEqual(rows.map((row) => [row.study_group, row.disabled_features.includes("se_sobrar_tempo")]), [[1, true], [2, true]])
  } finally {
    await db.close()
  }
})
