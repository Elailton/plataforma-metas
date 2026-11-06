-- Desempenho (06/11/2026): a primeira versão de student_upcoming_quizzes calculava o escopo do
-- aluno (student_goal_scopes) uma vez por meta e por simulado e verificava a conclusão de todas
-- as metas do curso: ~1,3 s por chamada. Esta versão calcula o escopo uma única vez, filtra só
-- as metas que fecham bloco (07, 14, 21...) antes de olhar conclusões e mantém o mesmo resultado.
--
-- Também cria student_has_general_quiz (consulta leve usada no menu).
--
-- Reversão completa: drop function if exists public.student_has_general_quiz(uuid); e reaplicar 20261106000200.

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
  with scope as materialized (
    select p_course_id in (select public.active_course_ids()) as active,
           s ? p_course_id::text as listed,
           s -> p_course_id::text as groups
      from (select public.student_goal_scopes() as s) x
  ),
  allowed_groups as materialized (
    -- null = todos os grupos (curso sem divisão); vazio = nenhum.
    select case
             when not sc.active or not sc.listed then array[]::smallint[]
             when jsonb_typeof(sc.groups) = 'null' then null
             else array(select g::smallint from jsonb_array_elements_text(sc.groups) g)
           end as list
      from scope sc
  ),
  blocks as materialized (
    select g.id, g.title, m.n
      from public.goals g
      cross join allowed_groups ag
      cross join lateral (select substring(g.title from '^Meta\s+(\d+)')::integer as n) m
     where g.course_id = p_course_id
       and g.status = 'published'
       and m.n > 0 and m.n % 7 = 0
       and (ag.list is null or g.target_groups && ag.list)
  ),
  quizzes as materialized (
    select q.*
      from public.mini_quizzes q
      cross join allowed_groups ag
     where q.course_id = p_course_id
       and q.status = 'published'
       and q.subject_id is null
       and (ag.list is null or q.target_groups && ag.list)
  ),
  goal_done as materialized (
    select gid.id,
           exists (select 1 from public.goal_items gi where gi.goal_id = gid.id and gi.archived_at is null)
           and not exists (
             select 1 from public.goal_items gi
              where gi.goal_id = gid.id and gi.archived_at is null
                and not exists (
                  select 1 from public.student_goal_item_completions c
                   where c.goal_item_id = gi.id and c.user_id = (select auth.uid())
                )
           ) as is_done
      from (select b.id from blocks b union select q.unlock_goal_id from quizzes q where q.unlock_goal_id is not null) gid
  )
  -- Simulados publicados para o grupo, mas ainda fechados (data futura ou meta não concluída).
  select q.id, q.kind, q.title, q.release_date,
         coalesce(b.n, substring(g.title from '^Meta\s+(\d+)')::integer), q.unlock_goal_id, g.title,
         coalesce(d.is_done, true)
    from quizzes q
    left join public.goals g on g.id = q.unlock_goal_id
    left join blocks b on b.id = q.unlock_goal_id
    left join goal_done d on d.id = q.unlock_goal_id
   where (q.release_date is not null and q.release_date > (now() at time zone 'America/Fortaleza')::date)
      or (q.unlock_goal_id is not null and not public.mini_quiz_unlocked(q.id, q.unlock_goal_id))
  union all
  -- Blocos do Diagnóstico Semanal ainda sem diagnóstico cadastrado: só o aviso da condição.
  select null::uuid, 'semanal', 'Diagnóstico Semanal – Metas ' || lpad((b.n - 6)::text, 2, '0') || ' a ' || lpad(b.n::text, 2, '0'),
         null::date, b.n, b.id, b.title, d.is_done
    from blocks b
    join goal_done d on d.id = b.id
   where not exists (select 1 from quizzes q where q.kind = 'semanal' and q.unlock_goal_id = b.id)
$$;

revoke all on function public.student_upcoming_quizzes(uuid) from public, anon;
grant execute on function public.student_upcoming_quizzes(uuid) to authenticated, service_role;

-- Leve, para o menu (roda em toda página): existe simulado geral publicado para o grupo do aluno,
-- aberto ou ainda fechado? Não revela título, data nem conteúdo.
create or replace function public.student_has_general_quiz(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_course_id in (select public.active_course_ids())
     and exists (
       select 1 from public.mini_quizzes q
        where q.course_id = p_course_id
          and q.status = 'published'
          and q.kind = 'mensal'
          and public.mini_quiz_group_allowed(q.course_id, q.target_groups)
     );
$$;
revoke all on function public.student_has_general_quiz(uuid) from public, anon;
grant execute on function public.student_has_general_quiz(uuid) to authenticated, service_role;
