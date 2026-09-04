import { readFile } from "node:fs/promises"

// Minimal pre-migration application/Auth schema, not a mock of Supabase SMTP.
export const fixture = `
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
  create table public.goals (id uuid primary key default gen_random_uuid(), course_id uuid references courses(id), status text,
    title text, description text, due_date date, created_at timestamptz default now(), updated_at timestamptz default now());
  create table public.goal_items (id uuid primary key default gen_random_uuid(), goal_id uuid references goals(id) on delete cascade,
    subject_id uuid references subjects(id), topic_id uuid references syllabus_topics(id), instructions text, suggested_questions integer, position integer default 0);
  create table public.goal_item_materials (goal_item_id uuid references goal_items(id) on delete cascade,
    material_id uuid references materials(id), position integer default 0, unique(goal_item_id, material_id));
`

export const migrations = [
  "20260901000100_enrollments_hotmart.sql",
  "20260901000200_beta_student_experience.sql",
  "20260901000300_hotmart_entitlements.sql",
  "20260904000100_admin_course_access_blocks.sql",
  "20260904000200_goal_progress_and_published_rls.sql",
  "20260904000300_hotmart_events_before_account.sql",
]

export async function applyMigration(db, name) {
  const sql = await readFile(new URL("../../supabase/migrations/" + name, import.meta.url), "utf8")
  // PGlite has core gen_random_uuid but no pgcrypto; execute everything else.
  await db.exec(sql.replace("create extension if not exists pgcrypto;", ""))
}

export async function asRole(db, user, role, operation) {
  if (!["anon", "authenticated", "service_role"].includes(role)) throw new Error("Invalid test role")
  await db.exec(`set role ${role}`)
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user ?? ""])
  try { return await operation() } finally {
    await db.exec("reset role")
    await db.query("select set_config('request.jwt.claim.sub', '', false)")
  }
}
