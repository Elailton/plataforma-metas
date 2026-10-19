import assert from "node:assert/strict"
import { test } from "node:test"
import { PGlite } from "@electric-sql/pglite"
import { applyMigration, asRole, fixture, migrations } from "./helpers/database.mjs"
import { seedSql, takeSnapshot } from "./helpers/rls-scenario.mjs"

test("preparação de lançamento preserva RLS e triggers, fecha RPCs e indexa FKs", async () => {
  const db = new PGlite()
  try {
    await db.exec(fixture)
    for (const name of migrations) await applyMigration(db, name)
    await applyMigration(db, "20260912000100_goal_release_guard.sql")
    await db.exec("alter table courses add column updated_at timestamptz default now()")
    await db.exec("alter table goals add constraint goals_status_check check (status in ('draft','published'))")
    for (const name of [
      "20261009000100_course_groups.sql", "20261009000200_hotmart_offer_authorization.sql",
      "20261009000300_goal_archive_status.sql", "20261009000400_orientation_goal_save.sql",
      "20261010000100_rls_performance.sql", "20261010000200_goal_group_rls_performance.sql",
      "20261013000200_mini_quizzes.sql",
    ]) await applyMigration(db, name)
    // Trigger legado do schema inicial de produção, ausente na fixture mínima.
    await db.exec(`CREATE OR REPLACE FUNCTION public.check_goal_item_consistency()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_goal_course_id uuid;
  v_subject_course_id uuid;
  v_topic_subject_id uuid;
begin
  select course_id into v_goal_course_id from public.goals where id = new.goal_id;
  select course_id into v_subject_course_id from public.subjects where id = new.subject_id;

  if v_goal_course_id is null or v_subject_course_id is null or v_goal_course_id <> v_subject_course_id then
    raise exception 'subject does not belong to the same course as the goal';
  end if;

  if new.topic_id is not null then
    select subject_id into v_topic_subject_id from public.syllabus_topics where id = new.topic_id;
    if v_topic_subject_id is null or v_topic_subject_id <> new.subject_id then
      raise exception 'topic does not belong to the selected subject';
    end if;
  end if;

  return new;
end;
$function$
;
create trigger check_consistency before insert or update on goal_items for each row execute function public.check_goal_item_consistency();`)
    await db.exec(seedSql)
    const before = await takeSnapshot(db, asRole)
    await applyMigration(db, "20261019000100_launch_database_hardening.sql")
    await applyMigration(db, "20261019000100_launch_database_hardening.sql")
    assert.deepEqual(await takeSnapshot(db, asRole), before)
    for (const fn of ["handle_new_user()", "check_goal_item_consistency()", "is_admin()", "has_active_enrollment(uuid)"]) {
      assert.equal((await db.query("select has_function_privilege('anon', $1, 'execute') as ok", [fn])).rows[0].ok, false)
    }
    for (const fn of ["handle_new_user()", "check_goal_item_consistency()"]) {
      assert.equal((await db.query("select has_function_privilege('authenticated', $1, 'execute') as ok", [fn])).rows[0].ok, false)
    }
    assert.equal((await db.query("select has_function_privilege('authenticated', 'is_admin()', 'execute') as ok")).rows[0].ok, true)
    await db.exec("grant insert on auth.users to service_role")
    await asRole(db, null, "service_role", () => db.exec("insert into auth.users(id,email) values ('00000000-0000-4000-8000-000000009999','invite@test.invalid')"))
    assert.equal((await db.query("select role from profiles where id='00000000-0000-4000-8000-000000009999'")).rows[0].role, "student")
    assert.equal((await db.query("select count(*)::int n from pg_indexes where schemaname='public' and indexname in ('goal_item_materials_material_idx','course_access_blocks_blocked_by_idx','course_access_blocks_released_by_idx','manual_course_grants_granted_by_idx','mini_quiz_attempt_answers_subject_idx','mini_quiz_attempt_answers_topic_idx','mini_quiz_attempts_course_idx','mini_quiz_questions_topic_idx','mini_quizzes_subject_idx','mini_quizzes_topic_idx')")).rows[0].n, 10)
  } finally { await db.close() }
})
