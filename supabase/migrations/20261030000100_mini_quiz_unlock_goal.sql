-- Diagnóstico Semanal liberado pela CONCLUSÃO da meta que fecha o bloco.
--
-- Regra (pedido do usuário em 30/10/2026): o diagnóstico das Metas 01 a 07 só
-- aparece para o aluno depois que ele conclui a Meta 07; o das Metas 08 a 14,
-- depois da Meta 14; e assim por diante. A data de liberação (release_date)
-- continua valendo como piso: as duas condições precisam ser atendidas.
--
-- `mini_quizzes.unlock_goal_id` aponta a meta que fecha o bloco (uma por versão
-- de grupo). Meta concluída = todos os itens não arquivados marcados pelo aluno.
-- Quem já iniciou ou enviou o diagnóstico continua com acesso (desmarcar um item
-- depois não esconde a revisão nem impede o envio em andamento).
--
-- Aditiva. Reversão:
--   alter policy mini_quizzes_select_student on public.mini_quizzes using (<versão de 20261022000100>);
--   create or replace function public.mini_quiz_available(...) <versão de 20261021000200>;
--   drop function if exists public.mini_quiz_unlocked(uuid, uuid);
--   alter table public.mini_quizzes drop column if exists unlock_goal_id;

alter table public.mini_quizzes
  add column if not exists unlock_goal_id uuid references public.goals(id) on delete set null;

create index if not exists mini_quizzes_unlock_goal_id_idx on public.mini_quizzes (unlock_goal_id);

create or replace function public.mini_quiz_unlocked(p_quiz_id uuid, p_unlock_goal_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_unlock_goal_id is null
    or exists (
      select 1 from public.mini_quiz_starts s
       where s.user_id = (select auth.uid()) and s.quiz_id = p_quiz_id
    )
    or exists (
      select 1 from public.mini_quiz_attempts a
       where a.user_id = (select auth.uid()) and a.quiz_id = p_quiz_id
    )
    or (
      exists (
        select 1 from public.goal_items gi
         where gi.goal_id = p_unlock_goal_id and gi.archived_at is null
      )
      and not exists (
        select 1 from public.goal_items gi
         where gi.goal_id = p_unlock_goal_id
           and gi.archived_at is null
           and not exists (
             select 1 from public.student_goal_item_completions c
              where c.goal_item_id = gi.id and c.user_id = (select auth.uid())
           )
      )
    );
$$;
revoke all on function public.mini_quiz_unlocked(uuid, uuid) from public, anon;
grant execute on function public.mini_quiz_unlocked(uuid, uuid) to authenticated, service_role;

create or replace function public.mini_quiz_available(p_quiz public.mini_quizzes)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_quiz.status = 'published'
     and p_quiz.course_id in (select public.active_course_ids())
     and (p_quiz.release_date is null or p_quiz.release_date <= (now() at time zone 'America/Fortaleza')::date)
     and public.mini_quiz_group_allowed(p_quiz.course_id, p_quiz.target_groups)
     and public.mini_quiz_unlocked(p_quiz.id, p_quiz.unlock_goal_id)
$$;
revoke all on function public.mini_quiz_available(public.mini_quizzes) from public, anon;
grant execute on function public.mini_quiz_available(public.mini_quizzes) to authenticated, service_role;

alter policy mini_quizzes_select_student on public.mini_quizzes
  using (
    status = 'published'
    and course_id in (select public.active_course_ids())
    and (release_date is null or release_date <= (now() at time zone 'America/Fortaleza')::date)
    and case
      when not ((select public.student_goal_scopes()) ? course_id::text) then false
      when jsonb_typeof((select public.student_goal_scopes()) -> course_id::text) = 'null' then true
      else exists (
        select 1 from jsonb_array_elements_text((select public.student_goal_scopes()) -> course_id::text) g
        where g::smallint = any(target_groups)
      )
    end
    and (unlock_goal_id is null or public.mini_quiz_unlocked(id, unlock_goal_id))
  );
