-- Contador da prova na tela inicial (pedido do usuário em 30/10/2026, executado em 09/11/2026).
-- Aditiva: data da prova por curso (orientado por courseId) e a função de grupo "contador_prova",
-- que começa ligada só no Grupo 3 (G1/G2 desligados até o administrador liberar).
-- A mesma data é o parâmetro da reta final (30 dias antes).
--
-- Reversão:
--   update public.course_group_settings set disabled_features = array_remove(disabled_features, 'contador_prova');
--   alter table public.course_group_settings drop constraint course_group_settings_disabled_features_check;
--   alter table public.course_group_settings add constraint course_group_settings_disabled_features_check
--     check (disabled_features <@ array['metas', 'edital', 'diagnostico_semanal', 'simulado_mensal', 'relatorio', 'ranking', 'progresso', 'ultimo_concurso']::text[]);
--   alter table public.courses drop column if exists exam_date_confirmed, drop column if exists exam_date;

alter table public.courses
  add column if not exists exam_date date,
  add column if not exists exam_date_confirmed boolean not null default false;

comment on column public.courses.exam_date is 'Data da prova objetiva do concurso (prevista ou confirmada). Contador na tela inicial e liberação da reta final.';

alter table public.course_group_settings drop constraint if exists course_group_settings_disabled_features_check;
alter table public.course_group_settings add constraint course_group_settings_disabled_features_check
  check (disabled_features <@ array['metas', 'edital', 'diagnostico_semanal', 'simulado_mensal', 'relatorio', 'ranking', 'progresso', 'ultimo_concurso', 'contador_prova']::text[]);

insert into public.course_group_settings (course_id, study_group, disabled_features)
select c.id, g.study_group, array['contador_prova']::text[]
from public.courses c
cross join (values (1::smallint), (2::smallint)) g(study_group)
on conflict (course_id, study_group) do update
  set disabled_features = case
        when 'contador_prova' = any(public.course_group_settings.disabled_features) then public.course_group_settings.disabled_features
        else array_append(public.course_group_settings.disabled_features, 'contador_prova')
      end,
      updated_at = timezone('utc', now());

-- PMPE: prova objetiva prevista para 21/02/2027 (AOCP; data provável, conferida em 30/10/2026).
update public.courses set exam_date = date '2027-02-21', exam_date_confirmed = false
where id = 'fec9bb24-aaab-41ce-a98b-a039c3905ee2' and exam_date is null;
