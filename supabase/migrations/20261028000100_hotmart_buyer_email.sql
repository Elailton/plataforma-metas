-- Fase B (28/10/2026): guardar o e-mail do comprador nos eventos da Hotmart.
-- Aditiva: não apaga linhas nem altera direitos, matrículas ou progresso.
--
-- Finalidade: entregar o acesso comprado quando a compra chegou antes do cadastro do
-- produto/oferta (reprocessamento pelo administrador). Guarda SOMENTE o e-mail
-- normalizado (minúsculas); nada de nome, documento, telefone, endereço ou payload.
-- Leitura: service_role e administrador (política RLS já existente, só SELECT de admin).
-- Retenção: 90 dias para eventos cuja transação não gerou direito; a limpeza anula
-- apenas o e-mail (a linha do evento continua). Exclusão a pedido do titular:
--   update public.hotmart_webhook_events set buyer_email = null where buyer_email = '<email>';
--
-- 1) coluna buyer_email + restrição de formato + índice;
-- 2) claim_hotmart_webhook_event com 5 argumentos (a versão de 4 continua existindo);
-- 3) create_hotmart_entitlement_if_absent: "Compra concluída" só cria direito novo,
--    nunca altera um direito existente (atômico, mesmo lock da transação);
-- 4) purge_stale_hotmart_buyer_emails + agendamento diário no pg_cron;
-- 5) remove de anon/authenticated escritas que a API nunca usa nesta tabela
--    (o RLS já bloqueava; o admin continua lendo pelo SELECT).
--
-- Reversão (reverter o código ANTES, ou ele volta sozinho à versão de 4 argumentos):
--   select cron.unschedule('hotmart-buyer-email-retention');
--   drop function if exists public.purge_stale_hotmart_buyer_emails(interval);
--   drop function if exists public.create_hotmart_entitlement_if_absent(text, uuid, uuid, text, text, text, text, text, timestamptz);
--   drop function if exists public.claim_hotmart_webhook_event(text, text, text, text, text);
--   drop index if exists public.hotmart_webhook_events_buyer_email_idx;
--   alter table public.hotmart_webhook_events drop constraint if exists hotmart_webhook_events_buyer_email_format;
--   alter table public.hotmart_webhook_events drop column if exists buyer_email;  -- descarta os e-mails guardados
--   grant select, insert, update, delete on public.hotmart_webhook_events to anon;
--   grant insert, update, delete on public.hotmart_webhook_events to authenticated;

alter table public.hotmart_webhook_events add column if not exists buyer_email text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'hotmart_webhook_events_buyer_email_format'
      and conrelid = 'public.hotmart_webhook_events'::regclass
  ) then
    alter table public.hotmart_webhook_events
      add constraint hotmart_webhook_events_buyer_email_format check (
        buyer_email is null or (
          buyer_email = lower(btrim(buyer_email))
          and char_length(buyer_email) between 3 and 254
          and buyer_email like '%_@_%'
        )
      );
  end if;
end $$;

-- O e-mail é gravado já em minúsculas (restrição acima), então o índice simples
-- equivale a lower(buyer_email).
create index if not exists hotmart_webhook_events_buyer_email_idx
  on public.hotmart_webhook_events (buyer_email) where buyer_email is not null;
-- Índice por transaction já existe (hotmart_webhook_events_transaction_idx).

create or replace function public.claim_hotmart_webhook_event(
  requested_event_id text,
  requested_event_type text,
  requested_transaction text,
  requested_product_ucode text,
  requested_buyer_email text
)
returns table (was_claimed boolean, current_status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_status text;
  normalized_email text := nullif(lower(btrim(coalesce(requested_buyer_email, ''))), '');
begin
  -- Nunca falhar o webhook por um e-mail fora do formato: apenas não guardar.
  if normalized_email is not null and (
    char_length(normalized_email) not between 3 and 254 or normalized_email not like '%_@_%'
  ) then
    normalized_email := null;
  end if;

  insert into public.hotmart_webhook_events (
    hotmart_event_id, event_type, transaction, product_ucode, buyer_email, processing_status
  )
  values (
    requested_event_id, requested_event_type, requested_transaction,
    requested_product_ucode, normalized_email, 'processing'
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
    buyer_email = coalesce(normalized_email, buyer_email),
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

  select processing_status into existing_status
  from public.hotmart_webhook_events
  where hotmart_event_id = requested_event_id;

  return query select false, coalesce(existing_status, 'processing');
end;
$$;

create or replace function public.create_hotmart_entitlement_if_absent(
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
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_entitlement public.hotmart_entitlements%rowtype;
begin
  if nullif(btrim(requested_transaction), '') is null then
    raise exception 'Invalid Hotmart entitlement event';
  end if;

  -- Mesmo lock (e mesma ordem) de apply_hotmart_entitlement_event; o lock é
  -- reentrante na transação, então a chamada abaixo não se bloqueia.
  perform pg_advisory_xact_lock(hashtextextended(btrim(requested_transaction), 1));
  select * into existing_entitlement from public.hotmart_entitlements
    where transaction = btrim(requested_transaction);

  if found then
    -- Já existe direito (ativo, suspenso ou revogado): nunca alterar.
    return query select false, existing_entitlement.status,
      (select e.status from public.enrollments e
        where e.user_id = existing_entitlement.user_id
          and e.course_id = existing_entitlement.course_id);
    return;
  end if;

  return query select * from public.apply_hotmart_entitlement_event(
    requested_transaction, requested_user_id, requested_course_id,
    requested_product_ucode, requested_product_id, requested_buyer_ucode,
    requested_status, requested_event_id, requested_event_creation_date
  );
end;
$$;

create or replace function public.purge_stale_hotmart_buyer_emails(
  retention interval default interval '90 days'
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
begin
  if retention < interval '1 day' then
    raise exception 'Retention too short';
  end if;

  update public.hotmart_webhook_events e
  set buyer_email = null
  where e.buyer_email is not null
    and e.created_at < timezone('utc', now()) - retention
    and not exists (
      select 1 from public.hotmart_entitlements h where h.transaction = e.transaction
    );

  get diagnostics affected = row_count;
  return affected;
end;
$$;

revoke all on function public.claim_hotmart_webhook_event(text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.create_hotmart_entitlement_if_absent(text, uuid, uuid, text, text, text, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.purge_stale_hotmart_buyer_emails(interval) from public, anon, authenticated;
grant execute on function public.claim_hotmart_webhook_event(text, text, text, text, text) to service_role;
grant execute on function public.create_hotmart_entitlement_if_absent(text, uuid, uuid, text, text, text, text, text, timestamptz) to service_role;
grant execute on function public.purge_stale_hotmart_buyer_emails(interval) to service_role;

revoke all on public.hotmart_webhook_events from anon;
revoke insert, update, delete on public.hotmart_webhook_events from authenticated;

-- Limpeza diária (06:17 UTC). Só onde o pg_cron existe (Supabase); testes locais pulam.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule(
      'hotmart-buyer-email-retention',
      '17 6 * * *',
      'select public.purge_stale_hotmart_buyer_emails()'
    );
  end if;
end $$;
