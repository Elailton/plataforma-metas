-- Reta final (R3 de "executar provas anteriores", 09/11/2026). Aditiva.
--   * goals.kind: 'regular' ou 'reta_final'. Metas da reta final são criadas à mão, ficam fora de
--     "Minhas Metas" e aparecem na aba "Reta final", liberada 30 dias antes de courses.exam_date
--     (regra por data: quem compra depois já encontra liberada).
--   * Função de grupo 'reta_final', começa desligada nos Grupos 1 e 2 (Grupo 3 confere primeiro).
-- O banco de questões (R2) já existe: question_bank_sources / _items / _answer_keys.
--
-- Reversão:
--   update public.course_group_settings set disabled_features = array_remove(disabled_features, 'reta_final');
--   alter table public.course_group_settings drop constraint course_group_settings_disabled_features_check;
--   alter table public.course_group_settings add constraint course_group_settings_disabled_features_check
--     check (disabled_features <@ array['metas','edital','diagnostico_semanal','simulado_mensal','relatorio','ranking','progresso','ultimo_concurso','contador_prova']::text[]);
--   alter table public.goals drop constraint if exists goals_kind_check; alter table public.goals drop column if exists kind;

alter table public.goals add column if not exists kind text not null default 'regular';
alter table public.goals drop constraint if exists goals_kind_check;
alter table public.goals add constraint goals_kind_check check (kind in ('regular', 'reta_final'));

alter table public.course_group_settings drop constraint if exists course_group_settings_disabled_features_check;
alter table public.course_group_settings add constraint course_group_settings_disabled_features_check
  check (disabled_features <@ array['metas', 'edital', 'diagnostico_semanal', 'simulado_mensal', 'relatorio', 'ranking', 'progresso', 'ultimo_concurso', 'contador_prova', 'reta_final']::text[]);

insert into public.course_group_settings (course_id, study_group, disabled_features)
select c.id, g.study_group, array['reta_final']::text[]
from public.courses c
cross join (values (1::smallint), (2::smallint)) g(study_group)
on conflict (course_id, study_group) do update
  set disabled_features = case
        when 'reta_final' = any(public.course_group_settings.disabled_features) then public.course_group_settings.disabled_features
        else array_append(public.course_group_settings.disabled_features, 'reta_final')
      end,
      updated_at = timezone('utc', now());
