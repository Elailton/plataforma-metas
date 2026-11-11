-- Ranking opcional pela soma objetiva + redação, apenas para Simulado Geral com proposta.
-- Não escreve notas/tentativas, não inclui cópias de conferência e preserva consentimento.
-- Reversão: reverter o PR e revogar EXECUTE de mini_quiz_ranking_final de authenticated.
-- Manter a chave de configuração no CHECK para preservar histórico; a RPC antiga permanece.
begin;
alter table public.course_group_settings drop constraint if exists course_group_settings_disabled_features_check;
alter table public.course_group_settings add constraint course_group_settings_disabled_features_check
check(disabled_features <@ array['metas','edital','diagnostico_semanal','simulado_mensal','relatorio','ranking','progresso','ultimo_concurso','contador_prova','reta_final','se_sobrar_tempo','nota_geral','ranking_nota_final']::text[]);
-- Sem exposição nova aos alunos até a liberação por curso. Conta de teste confere primeiro.
insert into public.course_group_settings(course_id,study_group,disabled_features)
select c.id,g.n,array['ranking_nota_final']::text[] from public.courses c
cross join(values(1::smallint),(2::smallint)) g(n)
on conflict(course_id,study_group) do update set
 disabled_features=case when 'ranking_nota_final'=any(public.course_group_settings.disabled_features)
 then public.course_group_settings.disabled_features else array_append(public.course_group_settings.disabled_features,'ranking_nota_final') end;

create function public.mini_quiz_ranking_final(p_quiz_id uuid,p_limit integer default 10)
returns table(rank integer,display_name text,correct_count integer,total_count integer,
 duration_seconds integer,is_me boolean,participants integer,combined_enabled boolean,
 essay_status text,essay_score integer,final_score integer,final_max integer,pending_count integer)
language plpgsql stable security definer set search_path='' as $$
declare
 v_uid uuid:=auth.uid();v_quiz public.mini_quizzes;v_combined boolean:=false;v_group smallint;
begin
 if v_uid is null then raise exception 'MINI_QUIZ_AUTH_REQUIRED' using errcode='42501'; end if;
 select * into v_quiz from public.mini_quizzes where id=p_quiz_id;
 if not found or not (public.is_admin() or public.mini_quiz_available(v_quiz)) then
   raise exception 'MINI_QUIZ_NOT_AVAILABLE' using errcode='42501';
 end if;
 select case when c.groups_enabled then en.study_group else 1::smallint end into v_group
 from public.enrollments en join public.courses c on c.id=en.course_id
 where en.user_id=v_uid and en.course_id=v_quiz.course_id;
 if v_quiz.kind='mensal' and nullif(btrim(v_quiz.essay_prompt),'') is not null and v_group is not null then
   select not ('ranking_nota_final'=any(coalesce(s.disabled_features,'{}'::text[]))) into v_combined
   from (select 1) dummy left join public.course_group_settings s
     on s.course_id=v_quiz.course_id and s.study_group=v_group;
 end if;
 return query
 with eligible as (
   select a.user_id,a.correct_count,a.total_count,a.duration_seconds,a.submitted_at,
     case when e.status='graded' then 'graded' when e.status='pending' then 'pending' else 'none' end as state,
     case when e.status='graded' then coalesce(e.score_total,0) else 0 end as points
   from public.mini_quiz_attempts a
   left join public.mini_quiz_essays e on e.attempt_id=a.id and e.user_id=a.user_id
     and e.course_id=a.course_id and e.quiz_id=a.quiz_id
   where a.quiz_id=p_quiz_id and a.attempt_number=1 and a.show_in_ranking
     and (a.user_id=v_uid or not exists(select 1 from public.enrollments en
       where en.user_id=a.user_id and en.course_id=a.course_id and en.study_group=3))
 ), ranked as (
   select x.*,row_number() over(order by
      (x.correct_count+case when v_combined then x.points else 0 end) desc,
      x.duration_seconds asc nulls last,x.submitted_at asc,x.user_id)::integer as pos,
      count(*) over()::integer as n,
      count(*) filter(where x.state='pending') over()::integer as pending
   from eligible x
 )
 select r.pos,
   case when array_length(regexp_split_to_array(btrim(coalesce(p.full_name,'')),'\s+'),1)>1 then
     split_part(btrim(p.full_name),' ',1)||' '||upper(left((regexp_split_to_array(btrim(p.full_name),'\s+'))[array_length(regexp_split_to_array(btrim(p.full_name),'\s+'),1)],1))||'.'
     else coalesce(nullif(btrim(p.full_name),''),'Aluno') end,
   r.correct_count,r.total_count,r.duration_seconds,r.user_id=v_uid,r.n,v_combined,
   case when v_combined then r.state else null end,
   case when v_combined and r.state='graded' then r.points else null end,
   case when v_combined then r.correct_count+r.points else null end,
   case when v_combined then r.total_count+40 else null end,
   case when v_combined then r.pending else 0 end
 from ranked r left join public.profiles p on p.id=r.user_id
 where r.pos<=greatest(1,least(coalesce(p_limit,10),100)) or r.user_id=v_uid
 order by r.pos;
end;
$$;
revoke all on function public.mini_quiz_ranking_final(uuid,integer) from public,anon;
grant execute on function public.mini_quiz_ranking_final(uuid,integer) to authenticated;
commit;
