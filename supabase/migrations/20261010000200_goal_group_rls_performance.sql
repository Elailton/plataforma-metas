-- Desempenho da política de metas por grupo, sem alterar quem vê o quê.
--
-- can_access_group_goal(course_id, target_groups) era chamada linha a linha
-- (~0,5 ms cada). Como goal_items, goal_item_materials e as escritas de progresso
-- consultam goals sob RLS, a tela do aluno chegava a ~1 s só nessas chamadas.
--
-- student_goal_scopes() calcula uma única vez por consulta ((select ...) vira
-- InitPlan) um objeto { course_id: grupo } com os cursos de acesso efetivo
-- (mesma regra de active_course_ids: matrícula active, curso published e sem
-- bloqueio aberto). O valor é null quando o curso não usa grupos (vê todas as
-- metas publicadas). Cursos com grupos e aluno sem grupo ficam fora do objeto,
-- portanto não veem metas, exatamente como antes.
begin;

create or replace function public.student_goal_scopes()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    jsonb_object_agg(
      e.course_id::text,
      case when c.groups_enabled then to_jsonb(e.study_group) else 'null'::jsonb end
    ),
    '{}'::jsonb
  )
  from public.enrollments e
  join public.courses c on c.id = e.course_id
  where e.user_id = auth.uid()
    and e.course_id in (select public.active_course_ids())
    and (not c.groups_enabled or e.study_group is not null);
$$;
revoke all on function public.student_goal_scopes() from public, anon;
grant execute on function public.student_goal_scopes() to authenticated, service_role;

alter policy goals_select_enrolled_or_admin on public.goals
  using (
    (select public.is_admin())
    or (
      status = 'published'
      and case
        when not ((select public.student_goal_scopes()) ? course_id::text) then false
        when jsonb_typeof((select public.student_goal_scopes()) -> course_id::text) = 'null' then true
        else coalesce(
          ((select public.student_goal_scopes()) ->> course_id::text)::smallint = any(target_groups),
          false
        )
      end
    )
  );

commit;
