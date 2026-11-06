-- Próximos simulados bloqueados (pedido em 06/11/2026): o aluno vê, sem o conteúdo, os próximos
-- Diagnósticos Semanais (liberados ao concluir a Meta 07, 14, 21...) e Simulados Gerais (liberados
-- numa data), para saber o que vem. A interface mostra no máximo 2 pendentes de cada tipo.
-- Retorna só título, data e condição; questões e gabarito continuam protegidos pela RLS.
--
-- Reversão: drop function if exists public.student_upcoming_quizzes(uuid);

create or replace function public.student_upcoming_quizzes(p_course_id uuid)
returns table (
  quiz_id uuid,
  kind text,
  title text,
  release_date date,
  block_end integer,
  unlock_goal_id uuid,
  unlock_goal_title text,
  unlock_done boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with goal_numbers as (
    select g.id, g.title, g.target_groups, substring(g.title from '^Meta\s+(\d+)')::integer as n
      from public.goals g
     where g.course_id = p_course_id
       and g.status = 'published'
       and public.can_access_group_goal(p_course_id, g.target_groups)
  ),
  done as (
    select gn.id,
           exists (select 1 from public.goal_items gi where gi.goal_id = gn.id and gi.archived_at is null)
           and not exists (
             select 1 from public.goal_items gi
              where gi.goal_id = gn.id and gi.archived_at is null
                and not exists (
                  select 1 from public.student_goal_item_completions c
                   where c.goal_item_id = gi.id and c.user_id = (select auth.uid())
                )
           ) as is_done
      from goal_numbers gn
  )
  -- Simulados já cadastrados e publicados para o grupo, mas ainda fechados (data ou meta).
  select q.id, q.kind, q.title, q.release_date, gn.n, q.unlock_goal_id, gn.title, coalesce(d.is_done, true)
    from public.mini_quizzes q
    left join goal_numbers gn on gn.id = q.unlock_goal_id
    left join done d on d.id = q.unlock_goal_id
   where q.course_id = p_course_id
     and q.course_id in (select public.active_course_ids())
     and q.status = 'published'
     and q.subject_id is null
     and public.mini_quiz_group_allowed(q.course_id, q.target_groups)
     and not public.mini_quiz_available(q)
  union all
  -- Blocos do Diagnóstico Semanal ainda sem simulado cadastrado: só o aviso da condição.
  select null::uuid, 'semanal', 'Diagnóstico Semanal – Metas ' || lpad((gn.n - 6)::text, 2, '0') || ' a ' || lpad(gn.n::text, 2, '0'),
         null::date, gn.n, gn.id, gn.title, d.is_done
    from goal_numbers gn
    join done d on d.id = gn.id
   where p_course_id in (select public.active_course_ids())
     and gn.n is not null and gn.n > 0 and gn.n % 7 = 0
     and not exists (
       select 1 from public.mini_quizzes q
        where q.course_id = p_course_id
          and q.status = 'published'
          and q.subject_id is null
          and q.kind = 'semanal'
          and q.unlock_goal_id = gn.id
          and public.mini_quiz_group_allowed(q.course_id, q.target_groups)
     )
$$;

revoke all on function public.student_upcoming_quizzes(uuid) from public, anon;
grant execute on function public.student_upcoming_quizzes(uuid) to authenticated, service_role;
