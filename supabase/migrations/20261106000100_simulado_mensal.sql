-- Simulado Mensal (simulado geral, pedido em 06/11/2026).
-- Aditiva: um tipo para os simulados sem disciplina própria e a nova função liga/desliga por grupo.
-- O simulado mensal usa as mesmas regras do diagnóstico semanal no banco (tentativa única,
-- cronômetro obrigatório, ranking, grupos e data de liberação), porque também tem subject_id nulo.
--
-- Reversão:
--   alter table public.mini_quizzes drop constraint if exists mini_quizzes_kind_check;
--   alter table public.mini_quizzes drop constraint if exists mini_quizzes_time_limit_check;
--   alter table public.mini_quizzes drop column if exists time_limit_minutes;
--   alter table public.mini_quizzes drop column if exists kind;
--   update public.course_group_settings set disabled_features = array_remove(disabled_features, 'simulado_mensal');
--   alter table public.course_group_settings drop constraint course_group_settings_disabled_features_check;
--   alter table public.course_group_settings add constraint course_group_settings_disabled_features_check
--     check (disabled_features <@ array['metas','edital','diagnostico_semanal','relatorio','ranking','progresso']::text[]);

alter table public.mini_quizzes
  add column if not exists kind text not null default 'semanal',
  add column if not exists time_limit_minutes integer;

alter table public.mini_quizzes drop constraint if exists mini_quizzes_kind_check;
alter table public.mini_quizzes add constraint mini_quizzes_kind_check
  check (kind in ('semanal', 'mensal') and (kind = 'semanal' or subject_id is null));

-- Duração da prova real, só informativa para o aluno (o cronômetro continua contando o tempo usado).
alter table public.mini_quizzes drop constraint if exists mini_quizzes_time_limit_check;
alter table public.mini_quizzes add constraint mini_quizzes_time_limit_check
  check (time_limit_minutes is null or time_limit_minutes between 1 and 600);

create index if not exists mini_quizzes_course_kind_idx on public.mini_quizzes (course_id, kind, release_date);

alter table public.course_group_settings drop constraint if exists course_group_settings_disabled_features_check;
alter table public.course_group_settings add constraint course_group_settings_disabled_features_check
  check (disabled_features <@ array['metas', 'edital', 'diagnostico_semanal', 'simulado_mensal', 'relatorio', 'ranking', 'progresso']::text[]);
