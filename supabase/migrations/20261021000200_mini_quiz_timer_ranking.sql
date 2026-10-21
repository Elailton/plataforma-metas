-- Simulados com cronômetro e ranking opcional.
--
-- O tempo é medido pelo banco: `start_mini_quiz` registra o início e o envio
-- (`submit_mini_quiz`) grava a duração. O aluno escolhe, ao iniciar, se quer
-- aparecer no ranking; só a primeira tentativa de cada simulado entra nele.
-- O ranking ordena por acertos e desempata pelo menor tempo.

alter table public.mini_quiz_attempts
  add column if not exists started_at timestamptz,
  add column if not exists duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  add column if not exists show_in_ranking boolean not null default false;

create index if not exists mini_quiz_attempts_ranking_idx
  on public.mini_quiz_attempts (quiz_id, correct_count desc, duration_seconds)
  where attempt_number = 1 and show_in_ranking;

-- Início de uma resolução. Fica em aberto até o envio (attempt_id preenchido).
create table if not exists public.mini_quiz_starts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  quiz_id uuid not null references public.mini_quizzes(id) on delete restrict,
  started_at timestamptz not null default timezone('utc', now()),
  show_in_ranking boolean not null default false,
  attempt_id uuid references public.mini_quiz_attempts(id) on delete set null,
  finished_at timestamptz
);
create unique index if not exists mini_quiz_starts_open_idx
  on public.mini_quiz_starts (user_id, quiz_id) where finished_at is null;

alter table public.mini_quiz_starts enable row level security;
drop policy if exists mini_quiz_starts_select on public.mini_quiz_starts;
create policy mini_quiz_starts_select on public.mini_quiz_starts for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
grant select on public.mini_quiz_starts to authenticated;

-- Disponibilidade do simulado para o aluno atual (mesmas regras do envio).
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
$$;
revoke all on function public.mini_quiz_available(public.mini_quizzes) from public, anon;
grant execute on function public.mini_quiz_available(public.mini_quizzes) to authenticated, service_role;

create or replace function public.start_mini_quiz(p_quiz_id uuid, p_show_in_ranking boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_quiz public.mini_quizzes%rowtype;
  v_now timestamptz := timezone('utc', now());
  v_last timestamptz;
  v_has_attempt boolean;
  v_start public.mini_quiz_starts%rowtype;
begin
  if v_uid is null then
    raise exception 'MINI_QUIZ_AUTH_REQUIRED' using errcode = '42501';
  end if;
  select * into v_quiz from public.mini_quizzes where id = p_quiz_id;
  if not found or not public.mini_quiz_available(v_quiz) then
    raise exception 'MINI_QUIZ_NOT_AVAILABLE' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('mini_quiz:' || v_uid::text || ':' || p_quiz_id::text, 0));

  -- Uma resolução já iniciada continua contando: recarregar a página não zera o tempo.
  select * into v_start from public.mini_quiz_starts
   where user_id = v_uid and quiz_id = p_quiz_id and finished_at is null;
  if found then
    return jsonb_build_object('started_at', v_start.started_at, 'show_in_ranking', v_start.show_in_ranking, 'resumed', true);
  end if;

  select max(submitted_at), count(*) > 0 into v_last, v_has_attempt
    from public.mini_quiz_attempts where user_id = v_uid and quiz_id = p_quiz_id;
  if v_last is not null and v_last > v_now - interval '7 days' then
    raise exception 'MINI_QUIZ_COOLDOWN:%', to_char(v_last + interval '7 days', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      using errcode = 'P0001';
  end if;

  insert into public.mini_quiz_starts (user_id, quiz_id, started_at, show_in_ranking)
  values (v_uid, p_quiz_id, v_now, coalesce(p_show_in_ranking, false) and not v_has_attempt)
  returning * into v_start;

  return jsonb_build_object('started_at', v_start.started_at, 'show_in_ranking', v_start.show_in_ranking, 'resumed', false);
end;
$$;

create or replace function public.submit_mini_quiz(p_quiz_id uuid, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_quiz public.mini_quizzes%rowtype;
  v_last timestamptz;
  v_now timestamptz := timezone('utc', now());
  v_month date := date_trunc('month', now() at time zone 'America/Sao_Paulo')::date;
  v_attempt_id uuid := gen_random_uuid();
  v_attempt_number integer;
  v_first boolean;
  v_total integer;
  v_correct integer;
  v_answered integer;
  v_key text;
  v_start public.mini_quiz_starts%rowtype;
  v_duration integer;
begin
  if v_uid is null then
    raise exception 'MINI_QUIZ_AUTH_REQUIRED' using errcode = '42501';
  end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    raise exception 'MINI_QUIZ_INVALID_ANSWERS' using errcode = '22023';
  end if;

  select * into v_quiz from public.mini_quizzes where id = p_quiz_id;
  if not found or not public.mini_quiz_available(v_quiz) then
    raise exception 'MINI_QUIZ_NOT_AVAILABLE' using errcode = '42501';
  end if;

  -- Serializa envios simultâneos do mesmo aluno para o mesmo simulado.
  perform pg_advisory_xact_lock(hashtextextended('mini_quiz:' || v_uid::text || ':' || p_quiz_id::text, 0));

  select max(submitted_at), coalesce(max(attempt_number), 0) + 1
    into v_last, v_attempt_number
  from public.mini_quiz_attempts where user_id = v_uid and quiz_id = p_quiz_id;

  if v_last is not null and v_last > v_now - interval '7 days' then
    raise exception 'MINI_QUIZ_COOLDOWN:%', to_char(v_last + interval '7 days', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      using errcode = 'P0001';
  end if;

  -- Respostas só podem citar questões ativas deste simulado e letras existentes.
  for v_key in select jsonb_object_keys(p_answers) loop
    if not exists (
      select 1 from public.mini_quiz_questions q
      where q.quiz_id = p_quiz_id and q.archived_at is null and q.id::text = v_key
        and (
          jsonb_typeof(p_answers -> v_key) = 'null'
          or exists (select 1 from jsonb_array_elements(q.alternatives) a where a->>'key' = p_answers ->> v_key)
        )
    ) then
      raise exception 'MINI_QUIZ_INVALID_ANSWERS' using errcode = '22023';
    end if;
  end loop;

  select count(*) into v_total from public.mini_quiz_questions where quiz_id = p_quiz_id and archived_at is null;
  if v_total = 0 then
    raise exception 'MINI_QUIZ_NOT_AVAILABLE' using errcode = '42501';
  end if;

  v_first := not exists (
    select 1 from public.mini_quiz_attempts
    where user_id = v_uid and quiz_id = p_quiz_id and month_start = v_month
  );

  -- Cronômetro: do início registrado pelo banco até este envio.
  select * into v_start from public.mini_quiz_starts
   where user_id = v_uid and quiz_id = p_quiz_id and finished_at is null
   for update;
  if found then
    v_duration := greatest(0, floor(extract(epoch from (v_now - v_start.started_at)))::integer);
  end if;

  insert into public.mini_quiz_attempts (
    id, user_id, quiz_id, course_id, attempt_number, is_first_of_month, month_start,
    correct_count, answered_count, total_count, submitted_at,
    started_at, duration_seconds, show_in_ranking
  ) values (
    v_attempt_id, v_uid, p_quiz_id, v_quiz.course_id, v_attempt_number, v_first, v_month, 0, 0, v_total, v_now,
    v_start.started_at, v_duration, coalesce(v_start.show_in_ranking, false) and v_attempt_number = 1
  );

  if v_start.id is not null then
    update public.mini_quiz_starts set attempt_id = v_attempt_id, finished_at = v_now where id = v_start.id;
  end if;

  insert into public.mini_quiz_attempt_answers (attempt_id, question_id, position, chosen_key, is_correct, subject_id, topic_id)
  select v_attempt_id, q.id, q.position, nullif(p_answers ->> q.id::text, ''),
         coalesce(k.correct_key = (p_answers ->> q.id::text), false),
         coalesce(q.subject_id, v_quiz.subject_id), coalesce(q.topic_id, v_quiz.topic_id)
  from public.mini_quiz_questions q
  left join public.mini_quiz_answer_keys k on k.question_id = q.id
  where q.quiz_id = p_quiz_id and q.archived_at is null;

  select count(*) filter (where is_correct), count(*) filter (where chosen_key is not null)
    into v_correct, v_answered
  from public.mini_quiz_attempt_answers where attempt_id = v_attempt_id;

  update public.mini_quiz_attempts
     set correct_count = v_correct, answered_count = v_answered
   where id = v_attempt_id;

  return jsonb_build_object(
    'attempt_id', v_attempt_id,
    'correct', v_correct,
    'answered', v_answered,
    'total', v_total,
    'attempt_number', v_attempt_number,
    'is_first_of_month', v_first,
    'duration_seconds', v_duration,
    'next_available_at', v_now + interval '7 days'
  );
end;
$$;

-- Ranking de um simulado: primeiras tentativas de quem escolheu aparecer.
-- Nome exibido: primeiro nome e inicial do último sobrenome. Devolve o topo
-- e, se estiver fora dele, a linha do próprio aluno.
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

revoke all on function public.start_mini_quiz(uuid, boolean) from public, anon;
revoke all on function public.mini_quiz_ranking(uuid, integer) from public, anon;
grant execute on function public.start_mini_quiz(uuid, boolean) to authenticated;
grant execute on function public.mini_quiz_ranking(uuid, integer) to authenticated;
grant execute on function public.submit_mini_quiz(uuid, jsonb) to authenticated;
