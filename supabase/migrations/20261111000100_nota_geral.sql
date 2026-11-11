-- Nota geral do Simulado Geral: objetiva (1 ponto por questão) + redação (até 40), como no edital PMPE
-- (Tabela 10.1: 60 + 40 = 100 pontos na 1ª etapa). Só exibição; nenhuma nota é gravada ou recalculada.
-- Aditiva: acrescenta a função de grupo 'nota_geral', que começa desligada nos Grupos 1 e 2
-- (o Grupo 3 confere primeiro). Nada é apagado.
--
-- Reversão:
--   update public.course_group_settings set disabled_features = array_remove(disabled_features, 'nota_geral');
--   alter table public.course_group_settings drop constraint course_group_settings_disabled_features_check;
--   alter table public.course_group_settings add constraint course_group_settings_disabled_features_check
--     check (disabled_features <@ array['metas','edital','diagnostico_semanal','simulado_mensal','relatorio','ranking','progresso','ultimo_concurso','contador_prova','reta_final','se_sobrar_tempo']::text[]);

alter table public.course_group_settings drop constraint if exists course_group_settings_disabled_features_check;
alter table public.course_group_settings add constraint course_group_settings_disabled_features_check
  check (disabled_features <@ array['metas', 'edital', 'diagnostico_semanal', 'simulado_mensal', 'relatorio', 'ranking', 'progresso', 'ultimo_concurso', 'contador_prova', 'reta_final', 'se_sobrar_tempo', 'nota_geral']::text[]);

insert into public.course_group_settings (course_id, study_group, disabled_features)
select c.id, g.study_group, array['nota_geral']::text[]
from public.courses c
cross join (values (1::smallint), (2::smallint)) g(study_group)
on conflict (course_id, study_group) do update
  set disabled_features = case
        when 'nota_geral' = any(public.course_group_settings.disabled_features) then public.course_group_settings.disabled_features
        else array_append(public.course_group_settings.disabled_features, 'nota_geral')
      end,
      updated_at = timezone('utc', now());
