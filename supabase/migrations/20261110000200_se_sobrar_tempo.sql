-- Fase 3 do plano de personalização (docs/ia/12-plano-personalizacao.md): bloco "Se sobrar tempo". Aditiva.
--   * goal_extra_items / goal_extra_item_materials: itens extras por meta, em 3 níveis (tier 1 ≈ +30 min,
--     2 ≈ +1h30, 3 ≈ +2h, cumulativos). Ficam FORA de goal_items: não entram no progresso da meta nem do
--     edital e não têm conclusão (são opcionais).
--   * enrollments.extra_tier_override: ajuste do administrador (null = pela resposta de horas do formulário).
--   * student_extra_tier(curso): nível do próprio aluno (só lê a própria matrícula ativa).
--   * Função de grupo 'se_sobrar_tempo': começa desligada nos Grupos 1 e 2 (Grupo 3 confere primeiro).
--   * admin_set_extra_tier: só administrador, com o lock aluno/curso.
-- Nada é apagado nem alterado nas metas existentes.
--
-- Reversão:
--   update public.course_group_settings set disabled_features = array_remove(disabled_features, 'se_sobrar_tempo');
--   alter table public.course_group_settings drop constraint course_group_settings_disabled_features_check;
--   alter table public.course_group_settings add constraint course_group_settings_disabled_features_check
--     check (disabled_features <@ array['metas','edital','diagnostico_semanal','simulado_mensal','relatorio','ranking','progresso','ultimo_concurso','contador_prova','reta_final']::text[]);
--   drop function if exists public.admin_set_extra_tier(uuid,uuid,smallint);
--   drop function if exists public.student_extra_tier(uuid); drop function if exists public.extra_tier_from_q01(text);
--   drop table if exists public.goal_extra_item_materials; drop table if exists public.goal_extra_items;
--   alter table public.enrollments drop column if exists extra_tier_override;

create table if not exists public.goal_extra_items (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  tier smallint not null check (tier between 1 and 3),
  subject_id uuid references public.subjects(id),
  topic_id uuid references public.syllabus_topics(id),
  instructions text not null check (char_length(instructions) between 1 and 4000),
  suggested_questions smallint check (suggested_questions between 0 and 200),
  position smallint not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);
create index if not exists goal_extra_items_goal_idx on public.goal_extra_items(goal_id) where archived_at is null;

create table if not exists public.goal_extra_item_materials (
  extra_item_id uuid not null references public.goal_extra_items(id) on delete cascade,
  material_id uuid not null references public.materials(id),
  position smallint not null default 0,
  primary key (extra_item_id, material_id)
);
create index if not exists goal_extra_item_materials_material_idx on public.goal_extra_item_materials(material_id);

alter table public.enrollments add column if not exists extra_tier_override smallint
  check (extra_tier_override between 0 and 3);

create or replace function public.extra_tier_from_q01(value text) returns smallint
language sql immutable set search_path = '' as $$
 select case value
  when 'de_2_a_3h' then 1 when 'de_3_a_4h' then 2 when 'de_4_a_6h' then 3 when 'mais_6h' then 3
  else 0 end::smallint;
$$;
revoke all on function public.extra_tier_from_q01(text) from public, anon, authenticated;

-- Nível do aluno logado no curso (0 = só a base). Lê apenas a própria matrícula ativa.
create or replace function public.student_extra_tier(requested_course_id uuid) returns smallint
language sql stable security definer set search_path = '' as $$
 select coalesce(
   (select coalesce(e.extra_tier_override, public.extra_tier_from_q01(e.questionnaire->'answers'->>'q01'))
      from public.enrollments e
     where e.user_id = auth.uid() and e.course_id = requested_course_id and e.status = 'active'
     limit 1),
   0)::smallint;
$$;
revoke all on function public.student_extra_tier(uuid) from public, anon;
grant execute on function public.student_extra_tier(uuid) to authenticated;

alter table public.goal_extra_items enable row level security;
alter table public.goal_extra_item_materials enable row level security;
revoke all on public.goal_extra_items, public.goal_extra_item_materials from public, anon;
grant select, insert, update, delete on public.goal_extra_items, public.goal_extra_item_materials to authenticated;

create policy goal_extra_items_admin_all on public.goal_extra_items for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
-- Aluno: meta publicada visível para ele (o RLS de goals aplica curso e grupo) e nível até o seu.
create policy goal_extra_items_select_student on public.goal_extra_items for select to authenticated
  using (
    archived_at is null
    and exists (
      select 1 from public.goals g
       where g.id = goal_extra_items.goal_id and g.status = 'published'
         and g.course_id in (select public.active_course_ids())
         and goal_extra_items.tier <= public.student_extra_tier(g.course_id)
    )
  );
create policy goal_extra_item_materials_admin_all on public.goal_extra_item_materials for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy goal_extra_item_materials_select_student on public.goal_extra_item_materials for select to authenticated
  using (exists (select 1 from public.goal_extra_items x where x.id = goal_extra_item_materials.extra_item_id));

alter table public.course_group_settings drop constraint if exists course_group_settings_disabled_features_check;
alter table public.course_group_settings add constraint course_group_settings_disabled_features_check
  check (disabled_features <@ array['metas', 'edital', 'diagnostico_semanal', 'simulado_mensal', 'relatorio', 'ranking', 'progresso', 'ultimo_concurso', 'contador_prova', 'reta_final', 'se_sobrar_tempo']::text[]);

insert into public.course_group_settings (course_id, study_group, disabled_features)
select c.id, g.study_group, array['se_sobrar_tempo']::text[]
from public.courses c
cross join (values (1::smallint), (2::smallint)) g(study_group)
on conflict (course_id, study_group) do update
  set disabled_features = case
        when 'se_sobrar_tempo' = any(public.course_group_settings.disabled_features) then public.course_group_settings.disabled_features
        else array_append(public.course_group_settings.disabled_features, 'se_sobrar_tempo')
      end,
      updated_at = timezone('utc', now());

create or replace function public.admin_set_extra_tier(requested_enrollment_id uuid, requested_course_id uuid, requested_tier smallint)
returns void language plpgsql security definer set search_path = '' as $$
declare target uuid;
begin
 if not public.is_admin() then raise exception 'Somente administradores.'; end if;
 if requested_tier is not null and requested_tier not between 0 and 3 then raise exception 'Nível inválido.'; end if;
 select user_id into target from public.enrollments where id = requested_enrollment_id and course_id = requested_course_id;
 if not found then raise exception 'Matrícula não encontrada.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(target::text || ':' || requested_course_id::text, 0));
 update public.enrollments set extra_tier_override = requested_tier
  where id = requested_enrollment_id and course_id = requested_course_id;
end; $$;
revoke all on function public.admin_set_extra_tier(uuid, uuid, smallint) from public, anon;
grant execute on function public.admin_set_extra_tier(uuid, uuid, smallint) to authenticated;
