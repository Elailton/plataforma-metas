begin;
alter table public.access_resend_requests add column request_key uuid unique;

create or replace function public.reserve_access_resend(
  requested_key uuid, requested_email_hash text, requested_ip_hash text
) returns jsonb
language plpgsql security invoker set search_path = public
as $$
declare
  email_count bigint; ip_count bigint; total_count bigint; new_id bigint;
begin
  if requested_key is null or requested_email_hash !~ '^[a-f0-9]{64}$' or requested_ip_hash !~ '^[a-f0-9]{64}$'
     or requested_email_hash is null or requested_ip_hash is null then
    raise exception 'invalid reservation';
  end if;
  -- One transaction reserves all three budgets; concurrent requests cannot oversend.
  perform pg_advisory_xact_lock(hashtextextended('sga-access-resend', 0));
  if exists(select 1 from public.access_resend_requests where request_key = requested_key) then
    return jsonb_build_object('accepted', false);
  end if;
  select count(*) filter(where email_hash = requested_email_hash),
         count(*) filter(where ip_hash = requested_ip_hash), count(*)
  into email_count, ip_count, total_count
  from public.access_resend_requests where created_at >= now() - interval '1 hour';
  if email_count >= 3 or ip_count >= 10 or total_count >= 120 then
    return jsonb_build_object('accepted', false);
  end if;
  insert into public.access_resend_requests(email_hash,ip_hash,outcome,request_key)
  values(requested_email_hash,requested_ip_hash,'accepted',requested_key) returning id into new_id;
  return jsonb_build_object('accepted',true,'request_id',new_id);
end;
$$;
revoke all on function public.reserve_access_resend(uuid,text,text) from public,anon,authenticated;
grant execute on function public.reserve_access_resend(uuid,text,text) to service_role;
commit;
