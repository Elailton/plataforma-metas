-- Autorização de acesso por oferta Hotmart (migração aditiva).
-- Produtos existentes mantêm offer_policy = 'any' e continuam funcionando como antes.
-- Com offer_policy = 'authorized_offers', somente ofertas cadastradas com
-- grants_access = true criam direito novo. Lista vazia nunca significa "qualquer oferta".
begin;

alter table public.hotmart_product_mappings
  add column offer_policy text not null default 'any'
  constraint hotmart_product_mappings_offer_policy_check check (offer_policy in ('any', 'authorized_offers'));

create table public.hotmart_offer_rules (
  id uuid primary key default gen_random_uuid(),
  mapping_id uuid not null references public.hotmart_product_mappings(id) on delete cascade,
  offer_code text not null constraint hotmart_offer_rules_code_check check (offer_code ~ '^[a-z0-9_-]{1,64}$'),
  grants_access boolean not null,
  label text constraint hotmart_offer_rules_label_check check (label is null or char_length(label) <= 120),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint hotmart_offer_rules_mapping_code_key unique (mapping_id, offer_code)
);
create index hotmart_offer_rules_created_by_idx on public.hotmart_offer_rules(created_by);

create trigger hotmart_offer_rules_touch_updated_at
before update on public.hotmart_offer_rules
for each row execute function public.touch_updated_at();

alter table public.hotmart_offer_rules enable row level security;
create policy hotmart_offer_rules_admin_all on public.hotmart_offer_rules
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
revoke all on public.hotmart_offer_rules from anon;
grant select, insert, update, delete on public.hotmart_offer_rules to authenticated;
grant all on public.hotmart_offer_rules to service_role;

-- Rastreabilidade: oferta de cada transação e de cada evento recebido (sem dados pessoais).
alter table public.hotmart_entitlements add column offer_code text;
alter table public.hotmart_webhook_events add column offer_code text;
create index hotmart_webhook_events_created_idx on public.hotmart_webhook_events(created_at desc);

-- Reenvio do primeiro acesso: somente o servidor (service_role) lê e grava.
-- Guarda apenas hashes para aplicar limite de frequência, nunca o e-mail ou o IP em claro.
create table public.access_resend_requests (
  id bigint generated always as identity primary key,
  email_hash text not null,
  ip_hash text not null,
  outcome text not null constraint access_resend_requests_outcome_check
    check (outcome in ('accepted', 'limited', 'sent', 'skipped', 'failed')),
  created_at timestamptz not null default timezone('utc', now())
);
create index access_resend_requests_email_idx on public.access_resend_requests(email_hash, created_at desc);
create index access_resend_requests_ip_idx on public.access_resend_requests(ip_hash, created_at desc);
create index access_resend_requests_created_idx on public.access_resend_requests(created_at desc);
alter table public.access_resend_requests enable row level security;
revoke all on public.access_resend_requests from anon, authenticated;
grant all on public.access_resend_requests to service_role;

commit;
