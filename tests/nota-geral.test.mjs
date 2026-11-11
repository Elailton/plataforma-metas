import assert from "node:assert/strict"
import { test } from "node:test"
import { PGlite } from "@electric-sql/pglite"
import { applyMigration, fixture, migrations } from "./helpers/database.mjs"
import { seedSql } from "./helpers/rls-scenario.mjs"
import { combinedScore } from "../lib/mini-quizzes/essay.mjs"
import { isFeatureKey } from "../lib/groups/experience.mjs"

// Nota geral do Simulado Geral (edital PMPE, Tabela 10.1): objetiva 1 ponto por questão + redação até 40.
test("nota geral soma a redação corrigida à objetiva", () => {
  assert.deepEqual(combinedScore({ correct_count: 52, total_count: 60 }, { status: "graded", score_total: 27 }), {
    objective: 52, objectiveMax: 60, essayPoints: 27, essayMax: 40, status: "graded", total: 79, max: 100,
  })
})

test("redação pendente, anulada ou ausente não soma pontos", () => {
  const attempt = { correct_count: 49, total_count: 60 }
  assert.equal(combinedScore(attempt, { status: "pending", score_total: null }).total, 49)
  assert.equal(combinedScore(attempt, { status: "annulled", score_total: 0 }).total, 49)
  assert.equal(combinedScore(attempt, null).status, "none")
  assert.equal(combinedScore(attempt, null).max, 100)
})

test("nota da redação fora da faixa é limitada a 0–40", () => {
  assert.equal(combinedScore({ correct_count: 10, total_count: 60 }, { status: "graded", score_total: 99 }).essayPoints, 40)
  assert.equal(combinedScore({ correct_count: 10, total_count: 60 }, { status: "graded", score_total: -5 }).essayPoints, 0)
})

test("migração: nota_geral começa desligada nos Grupos 1 e 2 e ligada no Grupo 3", async () => {
  assert.ok(isFeatureKey("nota_geral"))
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
  await applyMigration(db, "20261111000100_nota_geral.sql")
  await applyMigration(db, "20261111000100_nota_geral.sql") // idempotente

  const { rows } = await db.query(
    "select study_group, count(*)::int as n from course_group_settings where 'nota_geral' = any(disabled_features) group by 1 order by 1",
  )
  assert.deepEqual(rows.map((row) => row.study_group), [1, 2])
  const dup = await db.query(
    "select count(*)::int as n from course_group_settings where array_length(array_positions(disabled_features, 'nota_geral'), 1) > 1",
  )
  assert.equal(dup.rows[0].n, 0)
  await assert.rejects(db.exec("update course_group_settings set disabled_features = array['inexistente']"))
})
