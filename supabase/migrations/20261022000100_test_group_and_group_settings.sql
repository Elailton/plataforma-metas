-- Grupo 3 (teste) e configuração da plataforma por grupo.
--
-- O Grupo 3 é um grupo interno de teste: quem está nele vê tudo o que o grupo
-- espelhado (1 ou 2, em `mirror_group`) vê e, além disso, o que foi lançado
-- só para o Grupo 3. Assim o administrador testa uma novidade antes de liberar.
--
-- `course_group_settings` guarda, por curso e grupo, quais abas/funções ficam
-- desligadas e o aviso da tela inicial.

begin;

alter table public.enrollments drop constraint if exists enrollments_study_group_check;
alter table public.enrollments add constraint enrollments_study_group_check check (study_group in (1, 2, 3));
alter table public.enrollments add column if not exists mirror_group smallint not null default 1;
alter table public.enrollments drop constraint if exists enrollments_mirror_group_check;
alter table public.enrollments add constraint enrollments_mirror_group_check check (mirror_group in (1, 2));

alter table public.goals drop constraint if exists goals_target_groups_check;
alter table public.goals add constraint goals_target_groups_check
  check (cardinality(target_groups) between 1 and 3 and target_groups <@ array[1, 2, 3]::smallint[]);
alter table public.mini_quizzes drop constraint if exists mini_quizzes_target_groups_check;
alter table public.mini_quizzes add constraint mini_quizzes_target_groups_check
  check (cardinality(target_groups) between 1 and 3 and target_groups <@ array[1, 2, 3]::smallint[]);

-- Grupos efetivos do aluno por curso: null = curso sem divisão (vê tudo);
-- [g] para os grupos 1 e 2; [3, espelho] para o grupo de teste.
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
      case
        when not c.groups_enabled then 'null'::jsonb
        when e.study_group = 3 then to_jsonb(array[3, e.mirror_group]::smallint[])
        else to_jsonb(array[e.study_group]::smallint[])
      end
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

create or replace function public.student_group_allowed(p_course_id uuid, p_groups smallint[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when not (s ? p_course_id::text) then false
    when jsonb_typeof(s -> p_course_id::text) = 'null' then true
    else exists (
      select 1 from jsonb_array_elements_text(s -> p_course_id::text) g
      where g::smallint = any(p_groups)
    )
  end
  from (select public.student_goal_scopes() as s) scopes;
$$;
revoke all on function public.student_group_allowed(uuid, smallint[]) from public, anon;
grant execute on function public.student_group_allowed(uuid, smallint[]) to authenticated, service_role;

create or replace function public.mini_quiz_group_allowed(p_course_id uuid, p_groups smallint[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.student_group_allowed(p_course_id, p_groups);
$$;

create or replace function public.can_access_group_goal(requested_course_id uuid, requested_groups smallint[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_active_enrollment(requested_course_id)
     and public.student_group_allowed(requested_course_id, requested_groups);
$$;

alter policy goals_select_enrolled_or_admin on public.goals
  using (
    (select public.is_admin())
    or (
      status = 'published'
      and case
        when not ((select public.student_goal_scopes()) ? course_id::text) then false
        when jsonb_typeof((select public.student_goal_scopes()) -> course_id::text) = 'null' then true
        else exists (
          select 1 from jsonb_array_elements_text((select public.student_goal_scopes()) -> course_id::text) g
          where g::smallint = any(target_groups)
        )
      end
    )
  );

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
  );

-- Grupo do aluno definido pelo administrador; o grupo 3 escolhe qual grupo espelha.
drop function if exists public.admin_set_enrollment_group(uuid, uuid, smallint);
create or replace function public.admin_set_enrollment_group(
  requested_enrollment_id uuid,
  requested_course_id uuid,
  requested_group smallint,
  requested_mirror smallint default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare target uuid;
begin
  if not public.is_admin() then raise exception 'Somente administradores.'; end if;
  if requested_group is not null and requested_group not in (1, 2, 3) then raise exception 'Grupo inválido.'; end if;
  if requested_mirror is not null and requested_mirror not in (1, 2) then raise exception 'Grupo espelhado inválido.'; end if;
  select user_id into target from public.enrollments where id = requested_enrollment_id and course_id = requested_course_id;
  if not found then raise exception 'Matrícula não encontrada.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(target::text || ':' || requested_course_id::text, 0));
  update public.enrollments
     set study_group = requested_group,
         mirror_group = coalesce(requested_mirror, mirror_group),
         group_manual_override = true
   where id = requested_enrollment_id and course_id = requested_course_id;
end;
$$;
revoke all on function public.admin_set_enrollment_group(uuid, uuid, smallint, smallint) from public, anon;
grant execute on function public.admin_set_enrollment_group(uuid, uuid, smallint, smallint) to authenticated;

-- Abas/funções desligadas e aviso da tela inicial por curso e grupo.
create table if not exists public.course_group_settings (
  course_id uuid not null references public.courses(id) on delete cascade,
  study_group smallint not null check (study_group in (1, 2, 3)),
  disabled_features text[] not null default '{}'::text[]
    check (disabled_features <@ array['metas', 'edital', 'diagnostico_semanal', 'relatorio', 'ranking', 'progresso']::text[]),
  notice text check (notice is null or char_length(notice) <= 600),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (course_id, study_group)
);
alter table public.course_group_settings enable row level security;
drop policy if exists course_group_settings_admin_all on public.course_group_settings;
create policy course_group_settings_admin_all on public.course_group_settings for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists course_group_settings_select_student on public.course_group_settings;
create policy course_group_settings_select_student on public.course_group_settings for select to authenticated
  using (course_id in (select public.active_course_ids()));
grant select, insert, update, delete on public.course_group_settings to authenticated;

-- Ranking ignora o grupo de teste.
create or replace function public.mini_quiz_ranking(p_quiz_id uuid, p_limit integer default 10)
returns table (
  rank integer,
  display_name text,
  correct_count integer,
  total_count integer,
  duration_seconds integer,
  is_me boolean,
  participants integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_quiz public.mini_quizzes%rowtype;
begin
  if v_uid is null then
    raise exception 'MINI_QUIZ_AUTH_REQUIRED' using errcode = '42501';
  end if;
  select * into v_quiz from public.mini_quizzes where id = p_quiz_id;
  if not found or not (public.is_admin() or public.mini_quiz_available(v_quiz)) then
    raise exception 'MINI_QUIZ_NOT_AVAILABLE' using errcode = '42501';
  end if;

  return query
  with ranked as (
    select a.user_id, a.correct_count, a.total_count, a.duration_seconds,
           row_number() over (
             order by a.correct_count desc, a.duration_seconds asc nulls last, a.submitted_at asc
           )::integer as pos,
           count(*) over ()::integer as n
      from public.mini_quiz_attempts a
     where a.quiz_id = p_quiz_id and a.attempt_number = 1 and a.show_in_ranking
       -- Contas do grupo de teste não entram no ranking dos alunos (só se veem).
       and (
         a.user_id = v_uid
         or not exists (
           select 1 from public.enrollments e
            where e.user_id = a.user_id and e.course_id = a.course_id and e.study_group = 3
         )
       )
  )
  select r.pos,
         case
           when array_length(regexp_split_to_array(btrim(coalesce(p.full_name, '')), '\s+'), 1) > 1 then
             split_part(btrim(p.full_name), ' ', 1) || ' ' ||
             upper(left((regexp_split_to_array(btrim(p.full_name), '\s+'))[array_length(regexp_split_to_array(btrim(p.full_name), '\s+'), 1)], 1)) || '.'
           else coalesce(nullif(btrim(p.full_name), ''), 'Aluno')
         end,
         r.correct_count, r.total_count, r.duration_seconds,
         r.user_id = v_uid,
         r.n
    from ranked r
    left join public.profiles p on p.id = r.user_id
   where r.pos <= greatest(1, least(coalesce(p_limit, 10), 100)) or r.user_id = v_uid
   order by r.pos;
end;
$$;


commit;
