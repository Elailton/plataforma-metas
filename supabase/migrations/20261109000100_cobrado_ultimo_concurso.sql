-- "Cobrado no último concurso" (pedido do usuário em 09/11/2026).
-- Aditiva: marca nos assuntos do edital (tópicos e subtópicos) que caíram na última prova do curso
-- e cria a função de grupo "ultimo_concurso" para lançar o selo primeiro no Grupo 3.
--
-- Reversão:
--   update public.course_group_settings set disabled_features = array_remove(disabled_features, 'ultimo_concurso');
--   alter table public.course_group_settings drop constraint course_group_settings_disabled_features_check;
--   alter table public.course_group_settings add constraint course_group_settings_disabled_features_check
--     check (disabled_features <@ array['metas', 'edital', 'diagnostico_semanal', 'simulado_mensal', 'relatorio', 'ranking', 'progresso']::text[]);
--   alter table public.syllabus_topics drop column if exists last_exam;

alter table public.syllabus_topics
  add column if not exists last_exam boolean not null default false;

comment on column public.syllabus_topics.last_exam is
  'Assunto cobrado na última prova do concurso (questões anuladas não contam). Exibido ao aluno como "Cobrado no último concurso".';

alter table public.course_group_settings drop constraint if exists course_group_settings_disabled_features_check;
alter table public.course_group_settings add constraint course_group_settings_disabled_features_check
  check (disabled_features <@ array['metas', 'edital', 'diagnostico_semanal', 'simulado_mensal', 'relatorio', 'ranking', 'progresso', 'ultimo_concurso']::text[]);

-- Lançamento: começa desligado nos Grupos 1 e 2 de todos os cursos (o Grupo 3 confere primeiro).
-- O administrador liga depois na aba "Grupos" do curso.
insert into public.course_group_settings (course_id, study_group, disabled_features)
select c.id, g.study_group, array['ultimo_concurso']::text[]
from public.courses c
cross join (values (1::smallint), (2::smallint)) g(study_group)
on conflict (course_id, study_group) do update
  set disabled_features = case
        when 'ultimo_concurso' = any(public.course_group_settings.disabled_features) then public.course_group_settings.disabled_features
        else array_append(public.course_group_settings.disabled_features, 'ultimo_concurso')
      end,
      updated_at = timezone('utc', now());
