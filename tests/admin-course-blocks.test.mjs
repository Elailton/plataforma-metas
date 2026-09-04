import assert from "node:assert/strict"
import { afterEach, beforeEach, test } from "node:test"
import { readFile } from "node:fs/promises"
import { PGlite } from "@electric-sql/pglite"

// Real PostgreSQL functions/RLS in a disposable in-memory database.
// Auth's minimal schema is a fixture, not Supabase Auth/SMTP.
const ADMIN = "00000000-0000-4000-8000-000000000001"
const STUDENT = "00000000-0000-4000-8000-000000000002"
const OTHER = "00000000-0000-4000-8000-000000000003"
const COURSE = "00000000-0000-4000-8000-000000000010"
const COURSE2 = "00000000-0000-4000-8000-000000000011"
const ITEM = "00000000-0000-4000-8000-000000000020"
let db

const fixture = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}', created_at timestamptz default now());
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
  $$;
  grant usage on schema auth, public to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
  create table public.profiles (id uuid primary key references auth.users(id), full_name text, avatar_initials text, role text, course_id uuid);
  create table public.courses (id uuid primary key, name text, status text);
  create table public.subjects (id uuid primary key, course_id uuid references courses(id));
  create table public.syllabus_topics (id uuid primary key, subject_id uuid references subjects(id));
  create table public.materials (id uuid primary key, course_id uuid references courses(id));
  create table public.goals (id uuid primary key, course_id uuid references courses(id), status text);
  create table public.goal_items (id uuid primary key, goal_id uuid references goals(id));
  create table public.goal_item_materials (goal_item_id uuid references goal_items(id), material_id uuid references materials(id));
`

async function asRole(user, role, operation) {
  await db.exec(`set role ${role}`)
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user ?? ""])
  try { return await operation() } finally {
    await db.exec("reset role")
    await db.query("select set_config('request.jwt.claim.sub', '', false)")
  }
}
const asAdmin = (operation) => asRole(ADMIN, "authenticated", operation)
const asStudent = (operation, user = STUDENT) => asRole(user, "authenticated", operation)

async function migration(name) {
  let sql = await readFile(new URL("../supabase/migrations/" + name, import.meta.url), "utf8")
  // PGlite has core gen_random_uuid, but doesn't ship pgcrypto. Nothing else
  // in these migrations uses that extension; all other SQL runs unchanged.
  sql = sql.replace("create extension if not exists pgcrypto;", "")
  await db.exec(sql)
}

async function setup(applyBlocks = true) {
  db = new PGlite()
  await db.exec(fixture)
  for (const name of [
    "20260901000100_enrollments_hotmart.sql",
    "20260901000200_beta_student_experience.sql",
    "20260901000300_hotmart_entitlements.sql",
  ]) await migration(name)
  await db.exec(`
    insert into auth.users (id,email) values
      ('${ADMIN}','admin@test.invalid'), ('${STUDENT}','student@test.invalid'), ('${OTHER}','other@test.invalid');
    update profiles set role = 'admin' where id = '${ADMIN}';
    insert into courses values ('${COURSE}','Course A','published'), ('${COURSE2}','Course B','published');
    insert into goals values ('${COURSE}','${COURSE}','published'), ('${COURSE2}','${COURSE2}','published');
    insert into goal_items values ('${ITEM}','${COURSE}');
    insert into student_goal_item_completions (user_id,goal_item_id) values ('${STUDENT}','${ITEM}');
  `)
  if (applyBlocks) await migration("20260904000100_admin_course_access_blocks.sql")
}
beforeEach(async () => { await setup() })
afterEach(async () => { await db?.close() })

async function purchase(status = "active", transaction = "HP-A", course = COURSE, time = 1) {
  const { rows } = await asRole(null, "service_role", () => db.query(
    "select * from public.apply_hotmart_entitlement_event($1,$2,$3,$4,null,null,$5,$6,$7)",
    [transaction, STUDENT, course, "product-" + course, status, transaction + "-" + time, new Date(1700000000000 + time * 1000).toISOString()],
  ))
  return rows[0]
}
async function enrollment(course = COURSE) {
  return (await db.query("select * from enrollments where user_id = $1 and course_id = $2", [STUDENT, course])).rows[0]
}
async function block(blocked = true, reason = "Análise administrativa", course = COURSE, id) {
  const enrollmentId = id ?? (await enrollment(course)).id
  return (await asAdmin(() => db.query(
    "select public.admin_set_course_access_block($1,$2,$3,$4) as status",
    [enrollmentId, course, blocked, reason],
  ))).rows[0].status
}
async function manual(status = "active", course = COURSE) {
  if (!(await enrollment(course))) {
    await asAdmin(() => db.query("select public.admin_enroll_existing_student($1,$2)", ["student@test.invalid", course]))
  }
  const id = (await enrollment(course)).id
  return (await asAdmin(() => db.query("select public.admin_set_manual_course_grant($1,$2,$3) as status", [id, course, status]))).rows[0].status
}

test("compra ativa + bloqueio: suspende apenas esse curso e preserva direitos/progresso", async () => {
  await purchase()
  await purchase("active", "HP-B", COURSE2)
  const rights = (await db.query("select * from hotmart_entitlements order by transaction")).rows
  assert.equal(await block(), "suspended")
  assert.equal((await enrollment(COURSE2)).status, "active")
  assert.deepEqual((await db.query("select * from hotmart_entitlements order by transaction")).rows, rights)
  const visible = await asStudent(() => db.query("select id from goals order by id"))
  assert.deepEqual(visible.rows, [{ id: COURSE2 }])
  assert.equal((await db.query("select * from student_goal_item_completions")).rows.length, 1)
})

test("nova aprovação, segunda compra e concessão manual não vencem bloqueio", async () => {
  await purchase()
  await block()
  assert.equal((await purchase("active", "HP-A", COURSE, 2)).enrollment_status, "suspended")
  assert.equal((await purchase("active", "HP-A2", COURSE, 3)).enrollment_status, "suspended")
  assert.equal(await manual(), "suspended")
  assert.equal(await block(false, "Problema resolvido"), "active")
  assert.equal((await db.query("select * from student_goal_item_completions")).rows.length, 1)
})

test("bloqueio de um aluno não afeta outro aluno matriculado no mesmo curso", async () => {
  await purchase()
  await asAdmin(() => db.query("select public.admin_enroll_existing_student($1,$2)", ["other@test.invalid", COURSE]))
  await block()
  const other = await asStudent(() => db.query("select id from goals where id=$1", [COURSE]), OTHER)
  assert.equal(other.rows.length, 1)
  assert.equal((await db.query("select status from enrollments where user_id=$1 and course_id=$2", [OTHER, COURSE])).rows[0].status, "active")
})

test("refund durante bloqueio é registrado; desbloquear não concede acesso sem direito", async () => {
  await purchase()
  await block()
  assert.equal((await purchase("revoked", "HP-A", COURSE, 2)).enrollment_status, "suspended")
  assert.equal(await block(false, "Revisão concluída"), "revoked")
  assert.equal((await enrollment()).status, "revoked")
})

test("direito manual sobrevive ao refund; remover manual não revoga compra ativa", async () => {
  await purchase()
  assert.equal(await manual("revoked"), "active")
  await manual("active")
  await block()
  await purchase("revoked", "HP-A", COURSE, 2)
  assert.equal(await block(false, "Revisão concluída"), "active")
})

test("somente concessão manual: bloqueio, liberação e progresso preservado", async () => {
  await manual()
  await block()
  await assert.rejects(asStudent(() => db.query("insert into student_goal_item_completions(user_id,goal_item_id) values ($1,$2)", [OTHER, ITEM])), /row-level security/)
  const deletion = await asStudent(() => db.query("delete from student_goal_item_completions where goal_item_id=$1 returning id", [ITEM]))
  assert.equal(deletion.rows.length, 0)
  assert.equal(await block(false, "Problema resolvido"), "active")
  assert.equal((await asStudent(() => db.query("select id from goal_items where id=$1", [ITEM]))).rows.length, 1)
})

test("desbloqueio com direito atrasado continua suspenso", async () => {
  await purchase("suspended")
  await block()
  assert.equal(await block(false, "Análise encerrada"), "suspended")
})

test("histórico registra responsável/motivo/datas e operações repetidas são idempotentes", async () => {
  await purchase()
  await block(true, "  Análise do suporte  ")
  await block(true, "Repetição não sobrescreve o motivo")
  let rows = (await db.query("select * from course_access_blocks")).rows
  assert.equal(rows.length, 1)
  assert.equal(rows[0].reason, "Análise do suporte")
  assert.equal(rows[0].blocked_by, ADMIN)
  assert.ok(rows[0].blocked_at)
  await block(false, "Resolvido")
  await block(false, "Repetição")
  rows = (await db.query("select * from course_access_blocks")).rows
  assert.equal(rows[0].release_reason, "Resolvido")
  assert.equal(rows[0].released_by, ADMIN)
  assert.ok(rows[0].released_at)
  await block(true, "Novo problema")
  assert.equal((await db.query("select * from course_access_blocks")).rows.length, 2)
})

test("aluno/anon não bloqueiam, desbloqueiam, escrevem nem leem motivos privados", async () => {
  await purchase()
  await block()
  const id = (await enrollment()).id
  await assert.rejects(asStudent(() => db.query("select admin_set_course_access_block($1,$2,false,'Tentativa')", [id, COURSE])), /Only administrators/)
  await assert.rejects(asRole(null, "anon", () => db.query("select admin_set_course_access_block($1,$2,true,'Tentativa')", [id, COURSE])), /permission denied/)
  await assert.rejects(asStudent(() => db.exec("delete from course_access_blocks")), /permission denied/)
  await assert.rejects(asStudent(() => db.exec("update course_access_blocks set released_at=now()")), /permission denied/)
  assert.equal((await asStudent(() => db.query("select * from course_access_blocks"))).rows.length, 0)
  assert.equal((await asStudent(() => db.query("select * from course_access_blocks"), OTHER)).rows.length, 0)
  const mutation = await asStudent(() => db.query("update enrollments set status='active' where id=$1 returning id", [id]))
  assert.equal(mutation.rows.length, 0)
})

test("IDs de curso/matrícula incompatíveis, admin e motivos inválidos são rejeitados", async () => {
  await purchase()
  const id = (await enrollment()).id
  await assert.rejects(block(true, "Teste válido", COURSE2, id), /Enrollment not found/)
  for (const reason of [null, "", "ab", "a".repeat(501)]) {
    await assert.rejects(block(true, reason), /reason between/)
  }
  const { rows } = await db.query("insert into enrollments(user_id,course_id,status,source) values($1,$2,'active','manual') returning id", [ADMIN, COURSE])
  await assert.rejects(block(true, "Teste válido", COURSE, rows[0].id), /Only student accounts/)
  assert.equal((await db.query("select * from course_access_blocks")).rows.length, 0)
})

test("RLS bloqueia acesso direto mesmo se a projeção for alterada indevidamente", async () => {
  await purchase()
  await block()
  await db.query("update enrollments set status='active' where user_id=$1 and course_id=$2", [STUDENT, COURSE])
  const result = await asStudent(() => db.query("select has_active_enrollment($1) as allowed", [COURSE]))
  assert.equal(result.rows[0].allowed, false)
  assert.equal((await asStudent(() => db.query("select * from goal_items"))).rows.length, 0)
})

test("evento comercial antigo/duplicado não altera bloqueio nem estado mais novo", async () => {
  await purchase()
  await block()
  await purchase("revoked", "HP-A", COURSE, 3)
  const stale = await purchase("active", "HP-A", COURSE, 2)
  assert.equal(stale.event_applied, false)
  assert.equal(stale.entitlement_status, "revoked")
  assert.equal(stale.enrollment_status, "suspended")
  assert.equal(await block(false, "Concluído"), "revoked")
})

test("migration aditiva preserva todas as contas, matrículas, direitos e progresso existentes", async () => {
  await db.close()
  await setup(false)
  await purchase()
  await manual("active", COURSE2)
  const tables = ["auth.users", "profiles", "courses", "enrollments", "manual_course_grants", "hotmart_entitlements", "goals", "goal_items", "student_goal_item_completions"]
  const snapshot = async () => {
    const data = {}
    for (const table of tables) data[table] = (await db.query(`select * from ${table} order by id`)).rows
    return data
  }
  const before = await snapshot()
  await migration("20260904000100_admin_course_access_blocks.sql")
  assert.deepEqual(await snapshot(), before)
  assert.equal((await db.query("select * from course_access_blocks")).rows.length, 0)
})
