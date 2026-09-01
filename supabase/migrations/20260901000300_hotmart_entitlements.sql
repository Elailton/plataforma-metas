-- Independent commercial rights per Hotmart transaction.
-- Additive only: existing users, profiles, enrollments, content and progress
-- remain untouched. The enrollment row continues to be the effective access
-- projection; entitlements and manual grants explain why it is effective.

create table if not exists public.hotmart_entitlements (
  id uuid primary key default gen_random_uuid(),
  transaction text not null,
  user_id uuid not null references public.profiles(id) on delete restrict,
  course_id uuid not null references public.courses(id) on delete restrict,
  product_ucode text not null,
  product_id text,
  buyer_ucode text,
  status text not null
    check (status in ('active', 'suspended', 'revoked')),
  last_event_id text not null,
  last_event_creation_date timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint hotmart_entitlements_transaction_key unique (transaction)
);

create table if not exists public.manual_course_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  course_id uuid not null references public.courses(id) on delete restrict,
  status text not null default 'active'
    check (status in ('active', 'suspended', 'revoked')),
  granted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint manual_course_grants_user_course_key unique (user_id, course_id)
);

create index if not exists hotmart_entitlements_user_course_status_idx
  on public.hotmart_entitlements (user_id, course_id, status);
create index if not exists hotmart_entitlements_product_idx
  on public.hotmart_entitlements (product_ucode, status);
create index if not exists hotmart_entitlements_last_event_idx
  on public.hotmart_entitlements (last_event_creation_date desc);
create index if not exists manual_course_grants_user_course_status_idx
  on public.manual_course_grants (user_id, course_id, status);

drop trigger if exists hotmart_entitlements_touch_updated_at
  on public.hotmart_entitlements;
create trigger hotmart_entitlements_touch_updated_at
before update on public.hotmart_entitlements
for each row execute function public.touch_updated_at();

drop trigger if exists manual_course_grants_touch_updated_at
  on public.manual_course_grants;
create trigger manual_course_grants_touch_updated_at
before update on public.manual_course_grants
for each row execute function public.touch_updated_at();

-- Preserve explicit manual access. If this installation has never processed
-- an approved Hotmart purchase, all existing rows predate the commercial
-- integration and are preserved as beta/manual grants (including the test
-- student even when a legacy migration labelled the row as "hotmart").
insert into public.manual_course_grants (user_id, course_id, status)
select user_id, course_id, status
from public.enrollments
where source = 'manual'
  or not exists (
    select 1
    from public.hotmart_webhook_events
    where event_type = 'PURCHASE_APPROVED'
      and processing_status = 'processed'
  )
on conflict (user_id, course_id) do nothing;

-- Serializes and recalculates the effective enrollment for one person/course.
-- Priority: any active manual/Hotmart right; otherwise any suspended right;
-- otherwise revoked. No enrollment or progress row is ever deleted.
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

  if manual_status = 'active' or has_hotmart_active then
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

-- Applies one commercial event atomically. Locks both the transaction and the
-- affected enrollment so concurrent events cannot leave a stale projection.
-- Events older than or equal to the transaction's last creation_date are
-- recorded as ignored by the application and do not regress commercial state.
create or replace function public.apply_hotmart_entitlement_event(
  requested_transaction text,
  requested_user_id uuid,
  requested_course_id uuid,
  requested_product_ucode text,
  requested_product_id text,
  requested_buyer_ucode text,
  requested_status text,
  requested_event_id text,
  requested_event_creation_date timestamptz
)
returns table (
  event_applied boolean,
  entitlement_status text,
  enrollment_status text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_entitlement public.hotmart_entitlements%rowtype;
  effective_status text;
begin
  if nullif(trim(requested_transaction), '') is null
    or nullif(trim(requested_product_ucode), '') is null
    or nullif(trim(requested_event_id), '') is null
    or requested_event_creation_date is null
    or requested_status not in ('active', 'suspended', 'revoked')
  then
    raise exception 'Invalid Hotmart entitlement event';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = requested_user_id
      and role = 'student'
  ) then
    raise exception 'Hotmart entitlements require a student profile';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(requested_user_id::text || ':' || requested_course_id::text, 0)
  );
  perform pg_advisory_xact_lock(hashtextextended(trim(requested_transaction), 1));

  select entitlements.*
  into existing_entitlement
  from public.hotmart_entitlements as entitlements
  where entitlements.transaction = trim(requested_transaction)
  for update;

  if found then
    if existing_entitlement.user_id is distinct from requested_user_id
      or existing_entitlement.course_id is distinct from requested_course_id
      or existing_entitlement.product_ucode is distinct from trim(requested_product_ucode)
    then
      raise exception 'Hotmart transaction identity conflict';
    end if;

    if requested_event_creation_date <= existing_entitlement.last_event_creation_date then
      select enrollments.status
      into effective_status
      from public.enrollments as enrollments
      where enrollments.user_id = requested_user_id
        and enrollments.course_id = requested_course_id;

      return query
      select false, existing_entitlement.status, effective_status;
      return;
    end if;

    update public.hotmart_entitlements
    set
      product_ucode = trim(requested_product_ucode),
      product_id = coalesce(nullif(trim(requested_product_id), ''), product_id),
      buyer_ucode = coalesce(nullif(trim(requested_buyer_ucode), ''), buyer_ucode),
      status = requested_status,
      last_event_id = trim(requested_event_id),
      last_event_creation_date = requested_event_creation_date,
      updated_at = timezone('utc', now())
    where transaction = trim(requested_transaction);
  else
    insert into public.hotmart_entitlements (
      transaction,
      user_id,
      course_id,
      product_ucode,
      product_id,
      buyer_ucode,
      status,
      last_event_id,
      last_event_creation_date
    )
    values (
      trim(requested_transaction),
      requested_user_id,
      requested_course_id,
      trim(requested_product_ucode),
      nullif(trim(requested_product_id), ''),
      nullif(trim(requested_buyer_ucode), ''),
      requested_status,
      trim(requested_event_id),
      requested_event_creation_date
    );
  end if;

  effective_status := public.reconcile_course_enrollment(
    requested_user_id,
    requested_course_id
  );

  return query select true, requested_status, effective_status;
end;
$$;

-- Manual beta access is stored independently from Hotmart rights. Granting,
-- suspending or revoking it never edits an entitlement.
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
    and enrollments.course_id = requested_course_id
  for update;

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

alter table public.hotmart_entitlements enable row level security;
alter table public.manual_course_grants enable row level security;

drop policy if exists hotmart_entitlements_admin_select
  on public.hotmart_entitlements;
create policy hotmart_entitlements_admin_select
on public.hotmart_entitlements for select
to authenticated
using (public.is_admin());

drop policy if exists manual_course_grants_admin_select
  on public.manual_course_grants;
create policy manual_course_grants_admin_select
on public.manual_course_grants for select
to authenticated
using (public.is_admin());

revoke all on public.hotmart_entitlements from anon, authenticated;
revoke all on public.manual_course_grants from anon, authenticated;
grant select on public.hotmart_entitlements to authenticated;
grant select on public.manual_course_grants to authenticated;
grant all on public.hotmart_entitlements to service_role;
grant all on public.manual_course_grants to service_role;

revoke all on function public.reconcile_course_enrollment(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.apply_hotmart_entitlement_event(
  text, uuid, uuid, text, text, text, text, text, timestamptz
) from public, anon, authenticated;
revoke all on function public.admin_enroll_existing_student(text, uuid)
  from public, anon, authenticated;
revoke all on function public.admin_set_manual_course_grant(uuid, uuid, text)
  from public, anon, authenticated;

grant execute on function public.reconcile_course_enrollment(uuid, uuid)
  to service_role;
grant execute on function public.apply_hotmart_entitlement_event(
  text, uuid, uuid, text, text, text, text, text, timestamptz
) to service_role;
grant execute on function public.admin_enroll_existing_student(text, uuid)
  to authenticated;
grant execute on function public.admin_set_manual_course_grant(uuid, uuid, text)
  to authenticated;
