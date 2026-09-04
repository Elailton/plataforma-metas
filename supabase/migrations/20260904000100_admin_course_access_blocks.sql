-- Administrative override per student/course; additive, no data reset.
-- Each row is one blocking episode. Release closes it, never deletes history.
begin;

create table public.course_access_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  course_id uuid not null references public.courses(id) on delete restrict,
  reason text not null check (char_length(trim(reason)) between 3 and 500),
  blocked_by uuid not null references public.profiles(id) on delete restrict,
  blocked_at timestamptz not null default now(),
  released_by uuid references public.profiles(id) on delete restrict,
  released_at timestamptz,
  release_reason text,
  constraint course_access_blocks_release_check check (
    (released_at is null and released_by is null and release_reason is null)
    or (released_at is not null and released_by is not null
      and release_reason is not null
      and char_length(trim(release_reason)) between 3 and 500)
  )
);

create unique index course_access_blocks_one_active
  on public.course_access_blocks (user_id, course_id)
  where released_at is null;
create index course_access_blocks_course_history
  on public.course_access_blocks (course_id, blocked_at desc);

alter table public.course_access_blocks enable row level security;
create policy course_access_blocks_admin_select
  on public.course_access_blocks for select to authenticated
  using (public.is_admin());
revoke all on public.course_access_blocks from public, anon, authenticated;
grant select on public.course_access_blocks to authenticated;
grant all on public.course_access_blocks to service_role;

-- Independent defense at the RLS boundary, even against a stale projection.
create or replace function public.has_active_enrollment(requested_course_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.enrollments
    where user_id = auth.uid() and course_id = requested_course_id
      and status = 'active'
  ) and not exists (
    select 1 from public.course_access_blocks
    where user_id = auth.uid() and course_id = requested_course_id
      and released_at is null
  );
$$;

-- Blocking projects to suspended without editing any commercial/manual right.
create or replace function public.reconcile_course_enrollment(
  requested_user_id uuid,
  requested_course_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  manual_status text;
  has_hotmart_active boolean := false;
  has_hotmart_suspended boolean := false;
  has_hotmart_right boolean := false;
  effective_status text;
  effective_source text;
begin
  perform pg_advisory_xact_lock(
    hashtextextended(requested_user_id::text || ':' || requested_course_id::text, 0)
  );

  select grants.status
  into manual_status
  from public.manual_course_grants as grants
  where grants.user_id = requested_user_id
    and grants.course_id = requested_course_id;

  select
    coalesce(bool_or(entitlements.status = 'active'), false),
    coalesce(bool_or(entitlements.status = 'suspended'), false),
    count(*) > 0
  into has_hotmart_active, has_hotmart_suspended, has_hotmart_right
  from public.hotmart_entitlements as entitlements
  where entitlements.user_id = requested_user_id
    and entitlements.course_id = requested_course_id;

  if exists (
    select 1 from public.course_access_blocks
    where user_id = requested_user_id
      and course_id = requested_course_id
      and released_at is null
  ) then
    effective_status := 'suspended';
  elsif manual_status = 'active' or has_hotmart_active then
    effective_status := 'active';
  elsif manual_status = 'suspended' or has_hotmart_suspended then
    effective_status := 'suspended';
  else
    effective_status := 'revoked';
  end if;

  if manual_status = 'active' then
    effective_source := 'manual';
  elsif has_hotmart_right then
    effective_source := 'hotmart';
  elsif manual_status is not null then
    effective_source := 'manual';
  else
    effective_source := 'hotmart';
  end if;

  insert into public.enrollments (user_id, course_id, status, source)
  values (requested_user_id, requested_course_id, effective_status, effective_source)
  on conflict (user_id, course_id) do update
  set
    status = excluded.status,
    source = excluded.source,
    updated_at = timezone('utc', now());

  return effective_status;
end;
$$;

create or replace function public.admin_enroll_existing_student(
  requested_email text,
  requested_course_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_user_id uuid;
  enrollment_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Only administrators can manage enrollments';
  end if;

  select users.id
  into requested_user_id
  from auth.users as users
  where lower(users.email) = lower(trim(requested_email))
  order by users.created_at
  limit 1;

  if requested_user_id is null then
    raise exception 'Student account not found';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = requested_user_id
      and role = 'student'
  ) then
    raise exception 'Only student accounts can be enrolled';
  end if;

  if not exists (select 1 from public.courses where id = requested_course_id) then
    raise exception 'Course not found';
  end if;

  -- Same lock order as Hotmart/block operations: pair before any row write.
  perform pg_advisory_xact_lock(
    hashtextextended(requested_user_id::text || ':' || requested_course_id::text, 0)
  );

  insert into public.manual_course_grants (
    user_id,
    course_id,
    status,
    granted_by
  )
  values (requested_user_id, requested_course_id, 'active', auth.uid())
  on conflict (user_id, course_id) do update
  set
    status = 'active',
    granted_by = auth.uid(),
    updated_at = timezone('utc', now());

  perform public.reconcile_course_enrollment(requested_user_id, requested_course_id);

  select enrollments.id
  into enrollment_id
  from public.enrollments as enrollments
  where enrollments.user_id = requested_user_id
    and enrollments.course_id = requested_course_id;

  return enrollment_id;
end;
$$;

create or replace function public.admin_set_manual_course_grant(
  requested_enrollment_id uuid,
  requested_course_id uuid,
  requested_status text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_user_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Only administrators can manage enrollments';
  end if;

  if requested_status not in ('active', 'suspended', 'revoked') then
    raise exception 'Invalid manual grant status';
  end if;

  select enrollments.user_id
  into requested_user_id
  from public.enrollments as enrollments
  where enrollments.id = requested_enrollment_id
    and enrollments.course_id = requested_course_id;

  if requested_user_id is null then
    raise exception 'Enrollment not found';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = requested_user_id
      and role = 'student'
  ) then
    raise exception 'Only student accounts can be enrolled';
  end if;

  -- Same lock order as Hotmart/block operations: pair before any row write.
  perform pg_advisory_xact_lock(
    hashtextextended(requested_user_id::text || ':' || requested_course_id::text, 0)
  );

  insert into public.manual_course_grants (
    user_id,
    course_id,
    status,
    granted_by
  )
  values (requested_user_id, requested_course_id, requested_status, auth.uid())
  on conflict (user_id, course_id) do update
  set
    status = excluded.status,
    granted_by = auth.uid(),
    updated_at = timezone('utc', now());

  return public.reconcile_course_enrollment(requested_user_id, requested_course_id);
end;
$$;

create or replace function public.admin_set_course_access_block(
  requested_enrollment_id uuid,
  requested_course_id uuid,
  requested_blocked boolean,
  requested_reason text
)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  requested_user_id uuid;
begin
  if not public.is_admin() or auth.uid() is null then
    raise exception 'Only administrators can manage course blocks';
  end if;
  if requested_blocked is null
    or requested_reason is null
    or char_length(trim(requested_reason)) not between 3 and 500
  then
    raise exception 'Provide a reason between 3 and 500 characters';
  end if;

  select enrollments.user_id into requested_user_id
  from public.enrollments
  where id = requested_enrollment_id and course_id = requested_course_id;

  if requested_user_id is null then
    raise exception 'Enrollment not found in this course';
  end if;
  if not exists (
    select 1 from public.profiles
    where id = requested_user_id and role = 'student'
  ) then
    raise exception 'Only student accounts can be blocked';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(requested_user_id::text || ':' || requested_course_id::text, 0)
  );

  if requested_blocked then
    insert into public.course_access_blocks (user_id, course_id, reason, blocked_by)
    values (requested_user_id, requested_course_id, trim(requested_reason), auth.uid())
    on conflict (user_id, course_id) where released_at is null do nothing;
  else
    update public.course_access_blocks
    set released_at = now(), released_by = auth.uid(), release_reason = trim(requested_reason)
    where user_id = requested_user_id and course_id = requested_course_id
      and released_at is null;
  end if;

  return public.reconcile_course_enrollment(requested_user_id, requested_course_id);
end;
$$;

revoke all on function public.admin_set_course_access_block(uuid, uuid, boolean, text)
  from public, anon, authenticated;
grant execute on function public.admin_set_course_access_block(uuid, uuid, boolean, text)
  to authenticated;
-- Existing function ACLs are preserved by CREATE OR REPLACE.

commit;
