-- Formulário enxuto e grupo único para novos alunos (plano aprovado em 10/11/2026). Aditiva.
--   * save_course_questionnaire passa a exigir as perguntas do questionário do curso
--     (enxuto, até 8; ou 20 no formato antigo; 20 quando o curso não tem questionário cadastrado).
--   * study_group_from_q01: toda faixa válida vai para o Grupo 1. O Grupo 2 deixa de receber
--     alunos novos; quem já está nele não muda aqui. Ajuste manual do administrador continua valendo.
-- Nada é apagado: respostas antigas, envios e grupos atuais ficam como estão.
--
-- Reversão (volta ao comportamento anterior):
--   create or replace function public.study_group_from_q01(value text) returns smallint
--   language sql immutable set search_path = '' as $$
--    select case value when 'ate_1h' then 1 when 'de_1_a_2h' then 1 when 'de_2_a_3h' then 1
--    when 'de_3_a_4h' then 1 when 'de_4_a_6h' then 2 when 'mais_6h' then 2 else null end::smallint; $$;
--   e recriar save_course_questionnaire de 20261009000100_course_groups.sql (laço fixo 1..20).

create or replace function public.study_group_from_q01(value text) returns smallint
language sql immutable set search_path = '' as $$
 select case when value in ('ate_1h','de_1_a_2h','de_2_a_3h','de_3_a_4h','de_4_a_6h','mais_6h')
 then 1 else null end::smallint;
$$;
revoke all on function public.study_group_from_q01(text) from public,anon,authenticated;

create or replace function public.save_course_questionnaire(requested_enrollment_id uuid, requested_submission_id uuid, requested_payload jsonb)
returns smallint language plpgsql security definer set search_path = '' as $$
declare e public.enrollments%rowtype; computed smallint; existing public.course_questionnaire_submissions%rowtype; k text; total int;
begin
 select * into e from public.enrollments where id=requested_enrollment_id;
 if not found or (not public.is_admin() and (e.user_id<>auth.uid() or e.status<>'active' or auth.uid() is null)) then raise exception 'Matrícula não autorizada.'; end if;
 if not exists(select 1 from public.profiles where id=e.user_id and role='student') then raise exception 'Apenas contas de aluno.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(e.user_id::text||':'||e.course_id::text,0));
 select * into e from public.enrollments where id=requested_enrollment_id for update;
 select * into existing from public.course_questionnaire_submissions where id=requested_submission_id;
 if found then
  if existing.enrollment_id<>e.id or existing.payload<>requested_payload then raise exception 'Envio reutilizado com dados diferentes.'; end if;
  return e.study_group;
 end if;
 if not public.is_admin() and (e.questionnaire is not null or not exists(select 1 from public.courses where id=e.course_id and groups_enabled)) then raise exception 'Questionário já preenchido ou indisponível.'; end if;
 computed:=public.study_group_from_q01(requested_payload->'answers'->>'q01');
 if computed is null or requested_submission_id is null or jsonb_typeof(requested_payload->'labels') is distinct from 'object'
 or octet_length(requested_payload::text)>40000 then raise exception 'Resposta de disponibilidade inválida.'; end if;
 select coalesce(nullif(case when jsonb_typeof(c.questionnaire_schema)='array' then jsonb_array_length(c.questionnaire_schema) end,0),20)
   into total from public.courses c where c.id=e.course_id;
 total:=least(coalesce(total,20),20);
 for n in 1..total loop
  k:='q'||lpad(n::text,2,'0');
  if not (requested_payload->'answers' ? k) or jsonb_typeof(requested_payload->'labels'->k) is distinct from 'string'
   or nullif(trim(requested_payload->'labels'->>k),'') is null then raise exception 'Questionário incompleto.'; end if;
 end loop;
 insert into public.course_questionnaire_submissions(id,enrollment_id,payload) values(requested_submission_id,e.id,requested_payload);
 update public.enrollments set questionnaire=requested_payload,
 study_group=case when group_manual_override then study_group else computed end where id=e.id;
 return (select study_group from public.enrollments where id=e.id);
end; $$;
