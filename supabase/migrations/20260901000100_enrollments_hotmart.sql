-- Multi-course enrollments and Hotmart Webhook 2.0.0 integration.
-- This migration intentionally replaces the previous RLS policies on the
-- application tables so no legacy policy can keep granting access through
-- profiles.course_id.

create extension if not exists pgcrypto;

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  status text not null default 'active'
    check (status in ('active', 'suspended', 'revoked')),
  source text not null default 'hotmart'
    check (source in ('hotmart')),
  enrolled_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint enrollments_user_course_key unique (user_id, course_id)
);

create table if not exists public.hotmart_product_mappings (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  hotmart_product_id text,
  hotmart_product_ucode text not null,
  hotmart_product_name text,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint hotmart_product_mappings_ucode_key unique (hotmart_product_ucode)
);

create table if not exists public.hotmart_webhook_events (
  id uuid primary key default gen_random_uuid(),
  hotmart_event_id text not null unique,
  event_type text not null,
  transaction text,
  product_ucode text,
  processed_at timestamptz,
  processing_status text not null default 'processing'
    check (processing_status in ('processing', 'processed', 'failed', 'ignored')),
  error_message text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists enrollments_user_status_idx
  on public.enrollments (user_id, status);
create index if not exists enrollments_course_status_idx
  on public.enrollments (course_id, status);
create index if not exists hotmart_product_mappings_course_idx
  on public.hotmart_product_mappings (course_id, active);
create index if not exists hotmart_webhook_events_transaction_idx
  on public.hotmart_webhook_events (transaction);
create index if not exists hotmart_webhook_events_status_idx
  on public.hotmart_webhook_events (processing_status, created_at);

-- Preserve legacy memberships before removing the person-to-course coupling.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'course_id'
  ) then
    insert into public.enrollments (user_id, course_id, status, source)
    select id, course_id, 'active', 'hotmart'
    from public.profiles
    where course_id is not null
    on conflict (user_id, course_id) do nothing;
  end if;
end
$$;

-- Remove every policy on the affected tables before dropping the legacy
-- column. This also prevents permissive legacy policies from being combined
-- with the stricter policies below.
do $$
declare
  policy_row record;
begin
  for policy_row in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = any (array[
        'profiles',
        'courses',
        'subjects',
        'syllabus_topics',
        'materials',
        'goals',
        'goal_items',
        'goal_item_materials',
        'enrollments',
        'hotmart_product_mappings',
        'hotmart_webhook_events'
      ])
  loop
    execute format(
      'drop policy %I on %I.%I',
      policy_row.policyname,
      policy_row.schemaname,
      policy_row.tablename
    );
  end loop;
end
$$;

alter table public.profiles drop column if exists course_id;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists enrollments_touch_updated_at on public.enrollments;
create trigger enrollments_touch_updated_at
before update on public.enrollments
for each row execute function public.touch_updated_at();

drop trigger if exists hotmart_product_mappings_touch_updated_at on public.hotmart_product_mappings;
create trigger hotmart_product_mappings_touch_updated_at
before update on public.hotmart_product_mappings
for each row execute function public.touch_updated_at();

drop trigger if exists hotmart_webhook_events_touch_updated_at on public.hotmart_webhook_events;
create trigger hotmart_webhook_events_touch_updated_at
before update on public.hotmart_webhook_events
for each row execute function public.touch_updated_at();

-- Authentication metadata must never be able to promote a user to admin.
-- Administrative promotion remains an explicit database operation.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role, avatar_initials)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(split_part(new.email, '@', 1), ''),
      'Aluno'
    ),
    'student',
    nullif(trim(new.raw_user_meta_data ->> 'avatar_initials'), '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.has_active_enrollment(requested_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.enrollments
    where user_id = auth.uid()
      and course_id = requested_course_id
      and status = 'active'
  );
$$;

create or replace function public.protect_profile_identity_and_role()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id then
    raise exception 'Profile identity cannot be changed';
  end if;

  if new.role is distinct from old.role
    and current_user not in ('postgres', 'service_role', 'supabase_admin')
    and not public.is_admin()
  then
    raise exception 'Only an administrator can change profile roles';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_protect_identity_and_role on public.profiles;
create trigger profiles_protect_identity_and_role
before update on public.profiles
for each row execute function public.protect_profile_identity_and_role();

-- Server-only lookup used by the webhook. It avoids listing every Auth user
-- and is deliberately unavailable to browser roles.
create or replace function public.find_auth_user_id_by_email(requested_email text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id
  from auth.users
  where lower(email) = lower(trim(requested_email))
  order by created_at
  limit 1;
$$;

-- Atomically claims an event. Successfully processed/ignored events and events
-- already in flight are not claimed again; failed events may be retried.
create or replace function public.claim_hotmart_webhook_event(
  requested_event_id text,
  requested_event_type text,
  requested_transaction text,
  requested_product_ucode text
)
returns table (was_claimed boolean, current_status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_status text;
begin
  insert into public.hotmart_webhook_events (
    hotmart_event_id,
    event_type,
    transaction,
    product_ucode,
    processing_status
  )
  values (
    requested_event_id,
    requested_event_type,
    requested_transaction,
    requested_product_ucode,
    'processing'
  )
  on conflict (hotmart_event_id) do nothing;

  if found then
    return query select true, 'processing'::text;
    return;
  end if;

  update public.hotmart_webhook_events
  set
    event_type = requested_event_type,
    transaction = requested_transaction,
    product_ucode = requested_product_ucode,
    processing_status = 'processing',
    processed_at = null,
    error_message = null
  where hotmart_event_id = requested_event_id
    and (
      processing_status = 'failed'
      or (
        processing_status = 'processing'
        and updated_at < timezone('utc', now()) - interval '10 minutes'
      )
    );

  if found then
    return query select true, 'processing'::text;
    return;
  end if;

  select processing_status
  into existing_status
  from public.hotmart_webhook_events
  where hotmart_event_id = requested_event_id;

  return query select false, coalesce(existing_status, 'processing');
end;
$$;

revoke all on function public.find_auth_user_id_by_email(text) from public, anon, authenticated;
revoke all on function public.claim_hotmart_webhook_event(text, text, text, text) from public, anon, authenticated;
grant execute on function public.find_auth_user_id_by_email(text) to service_role;
grant execute on function public.claim_hotmart_webhook_event(text, text, text, text) to service_role;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.has_active_enrollment(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.subjects enable row level security;
alter table public.syllabus_topics enable row level security;
alter table public.materials enable row level security;
alter table public.goals enable row level security;
alter table public.goal_items enable row level security;
alter table public.goal_item_materials enable row level security;
alter table public.enrollments enable row level security;
alter table public.hotmart_product_mappings enable row level security;
alter table public.hotmart_webhook_events enable row level security;

create policy profiles_select_self_or_admin
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_admin());

create policy profiles_update_self_or_admin
on public.profiles for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

create policy enrollments_select_own_or_admin
on public.enrollments for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

create policy enrollments_admin_all
on public.enrollments for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy courses_select_enrolled_or_admin
on public.courses for select
to authenticated
using (public.is_admin() or public.has_active_enrollment(id));

create policy courses_admin_all
on public.courses for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy subjects_select_enrolled_or_admin
on public.subjects for select
to authenticated
using (public.is_admin() or public.has_active_enrollment(course_id));

create policy subjects_admin_all
on public.subjects for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy syllabus_topics_select_enrolled_or_admin
on public.syllabus_topics for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.subjects
    where subjects.id = syllabus_topics.subject_id
      and public.has_active_enrollment(subjects.course_id)
  )
);

create policy syllabus_topics_admin_all
on public.syllabus_topics for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy materials_select_enrolled_or_admin
on public.materials for select
to authenticated
using (
  public.is_admin()
  or (course_id is not null and public.has_active_enrollment(course_id))
);

create policy materials_admin_all
on public.materials for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy goals_select_enrolled_or_admin
on public.goals for select
to authenticated
using (public.is_admin() or public.has_active_enrollment(course_id));

create policy goals_admin_all
on public.goals for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy goal_items_select_enrolled_or_admin
on public.goal_items for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.goals
    where goals.id = goal_items.goal_id
      and public.has_active_enrollment(goals.course_id)
  )
);

create policy goal_items_admin_all
on public.goal_items for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy goal_item_materials_select_enrolled_or_admin
on public.goal_item_materials for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.goal_items
    join public.goals on goals.id = goal_items.goal_id
    where goal_items.id = goal_item_materials.goal_item_id
      and public.has_active_enrollment(goals.course_id)
  )
);

create policy goal_item_materials_admin_all
on public.goal_item_materials for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy hotmart_product_mappings_admin_all
on public.hotmart_product_mappings for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy hotmart_webhook_events_admin_select
on public.hotmart_webhook_events for select
to authenticated
using (public.is_admin());

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.courses to authenticated;
grant select, insert, update, delete on public.subjects to authenticated;
grant select, insert, update, delete on public.syllabus_topics to authenticated;
grant select, insert, update, delete on public.materials to authenticated;
grant select, insert, update, delete on public.goals to authenticated;
grant select, insert, update, delete on public.goal_items to authenticated;
grant select, insert, update, delete on public.goal_item_materials to authenticated;
grant select, insert, update, delete on public.enrollments to authenticated;
grant select, insert, update, delete on public.hotmart_product_mappings to authenticated;
grant select on public.hotmart_webhook_events to authenticated;

grant all on public.enrollments to service_role;
grant all on public.hotmart_product_mappings to service_role;
grant all on public.hotmart_webhook_events to service_role;
