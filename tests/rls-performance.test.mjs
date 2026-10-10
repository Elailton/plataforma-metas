import assert from "node:assert/strict"
import { test } from "node:test"
import { PGlite } from "@electric-sql/pglite"
import { applyMigration, asRole, fixture, migrations } from "./helpers/database.mjs"
import { seedSql, takeSnapshot } from "./helpers/rls-scenario.mjs"

// A otimização das políticas não pode mudar quem vê ou escreve o quê:
// a mesma matriz de leituras e tentativas de escrita deve ser idêntica antes e depois.
test("migração de desempenho RLS preserva exatamente a visibilidade e as escritas", async () => {
  const db = new PGlite()
  try {
    await db.exec(fixture)
    for (const name of migrations) await applyMigration(db, name)
    await applyMigration(db, "20260912000100_goal_release_guard.sql")
    await db.exec("alter table courses add column updated_at timestamptz default now()")
    await applyMigration(db, "20261009000100_course_groups.sql")
    await applyMigration(db, "20261009000200_hotmart_offer_authorization.sql")
    await db.exec("alter table goals add constraint goals_status_check check (status in ('draft','published'))")
    await applyMigration(db, "20261009000300_goal_archive_status.sql")
    await applyMigration(db, "20261009000400_orientation_goal_save.sql")
    await db.exec(seedSql)

    const before = await takeSnapshot(db, asRole)
    await applyMigration(db, "20261010000100_rls_performance.sql")
    const after = await takeSnapshot(db, asRole)

    assert.deepEqual(after, before)
    // O cenário precisa ser significativo: cada perfil enxerga coisas diferentes.
    assert.equal(before.groupOne[3].split(",").length, 1)
    assert.equal(before.groupTwo[2].split(",").length, 2)
    assert.equal(before.blocked[2], "")
    assert.equal(before.suspended[2], "")
    assert.equal(before.draftCourse[2], "")
    assert.equal(before.admin[2].split(",").length, 3)

    const { rows } = await db.query(
      "select count(*)::int as n from pg_policies where schemaname = 'public' and (qual ~ 'has_active_enrollment' or with_check ~ 'has_active_enrollment')",
    )
    assert.equal(rows[0].n, 0)
  } finally {
    await db.close()
  }
})
