-- Keep the transaction watermark even if a refund precedes account creation.
-- A pending right has no email/name/payload and can never be active.
begin;
alter table public.hotmart_entitlements alter column user_id drop not null;
alter table public.hotmart_entitlements add constraint hotmart_pending_not_active
  check (user_id is not null or status <> 'active');

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
returns table (event_applied boolean, entitlement_status text, enrollment_status text)
language plpgsql security definer set search_path = ''
as $$
declare
  existing_entitlement public.hotmart_entitlements%rowtype;
  effective_user_id uuid;
  effective_status text;
begin
  if nullif(trim(requested_transaction), '') is null
    or nullif(trim(requested_product_ucode), '') is null
    or nullif(trim(requested_event_id), '') is null
    or requested_course_id is null or requested_event_creation_date is null
    or requested_status is null or requested_status not in ('active', 'suspended', 'revoked') then
    raise exception 'Invalid Hotmart entitlement event';
  end if;
  if requested_user_id is null and requested_status = 'active' then
    raise exception 'Active Hotmart entitlements require a student profile';
  end if;

  -- Lock order: transaction, then the effective user/course pair, then writes.
  -- A null-user refund racing with an approval must reconcile the account that
  -- appeared in this transaction, never replace its user_id with null.
  perform pg_advisory_xact_lock(hashtextextended(trim(requested_transaction), 1));
  select * into existing_entitlement from public.hotmart_entitlements
    where transaction = trim(requested_transaction) for update;

  if found and (
    (existing_entitlement.user_id is not null and requested_user_id is not null
      and existing_entitlement.user_id <> requested_user_id)
    or existing_entitlement.course_id is distinct from requested_course_id
    or existing_entitlement.product_ucode is distinct from trim(requested_product_ucode)
  ) then raise exception 'Hotmart transaction identity conflict'; end if;

  effective_user_id := coalesce(existing_entitlement.user_id, requested_user_id);
  if effective_user_id is not null then
    if not exists (select 1 from public.profiles where id = effective_user_id and role = 'student') then
      raise exception 'Hotmart entitlements require a student profile';
    end if;
    perform pg_advisory_xact_lock(
      hashtextextended(effective_user_id::text || ':' || requested_course_id::text, 0)
    );
  end if;

  if existing_entitlement.id is not null
    and requested_event_creation_date <= existing_entitlement.last_event_creation_date then
    select e.status into effective_status from public.enrollments e
      where e.user_id = effective_user_id and e.course_id = requested_course_id;
    return query select false, existing_entitlement.status, effective_status;
    return;
  end if;

  insert into public.hotmart_entitlements (
    transaction, user_id, course_id, product_ucode, product_id, buyer_ucode,
    status, last_event_id, last_event_creation_date
  ) values (
    trim(requested_transaction), effective_user_id, requested_course_id,
    trim(requested_product_ucode), nullif(trim(requested_product_id), ''),
    nullif(trim(requested_buyer_ucode), ''), requested_status, trim(requested_event_id), requested_event_creation_date
  ) on conflict (transaction) do update set
    user_id = excluded.user_id,
    product_id = coalesce(excluded.product_id, hotmart_entitlements.product_id),
    buyer_ucode = coalesce(excluded.buyer_ucode, hotmart_entitlements.buyer_ucode),
    status = excluded.status, last_event_id = excluded.last_event_id,
    last_event_creation_date = excluded.last_event_creation_date, updated_at = now();

  if effective_user_id is not null then
    effective_status := public.reconcile_course_enrollment(effective_user_id, requested_course_id);
  end if;
  return query select true, requested_status, effective_status;
end;
$$;

-- CREATE OR REPLACE retains the existing service-only RPC ACL. Reassert it.
revoke all on function public.apply_hotmart_entitlement_event(text,uuid,uuid,text,text,text,text,text,timestamptz)
  from public, anon, authenticated;
grant execute on function public.apply_hotmart_entitlement_event(text,uuid,uuid,text,text,text,text,text,timestamptz)
  to service_role;
commit;
