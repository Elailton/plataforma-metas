-- Simulados semanais por grupo de estudo.
--
-- Um mini simulado pode agora:
--   * valer só para alguns grupos (target_groups, mesma regra das metas);
--   * ter data de liberação (release_date) e número da semana (week_number);
--   * misturar disciplinas: subject_id do simulado passa a ser opcional e cada
--     questão pode informar a própria disciplina (mini_quiz_questions.subject_id).
-- O aluno só vê (e só envia) simulados do próprio grupo cuja data já chegou.
-- Simulados existentes continuam iguais: grupos 1 e 2, sem data, por disciplina.
begin;

alter table public.mini_quizzes
  add column if not exists target_groups smallint[] not null default array[1,2]::smallint[],
  add column if not exists release_date date,
  add column if not exists week_number integer check (week_number is null or week_number >= 1);
alter table public.mini_quizzes
  drop constraint if exists mini_quizzes_target_groups_check;
alter table public.mini_quizzes
  add constraint mini_quizzes_target_groups_check
  check (cardinality(target_groups) between 1 and 2 and target_groups <@ array[1,2]::smallint[]);
alter table public.mini_quizzes alter column subject_id drop not null;

alter table public.mini_quiz_questions
  add column if not exists subject_id uuid references public.subjects(id) on delete restrict;
create index if not exists mini_quiz_questions_subject_idx on public.mini_quiz_questions(subject_id);
create index if not exists mini_quizzes_release_idx on public.mini_quizzes(course_id, release_date);

-- Mesmo escopo de grupo das metas: curso sem grupos vê tudo; com grupos, só o do aluno.
create or replace function public.mini_quiz_group_allowed(p_course_id uuid, p_groups smallint[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when not ((select public.student_goal_scopes()) ? p_course_id::text) then false
    when jsonb_typeof((select public.student_goal_scopes()) -> p_course_id::text) = 'null' then true
    else coalesce(((select public.student_goal_scopes()) ->> p_course_id::text)::smallint = any(p_groups), false)
  end;
$$;
revoke all on function public.mini_quiz_group_allowed(uuid, smallint[]) from public, anon;
grant execute on function public.mini_quiz_group_allowed(uuid, smallint[]) to authenticated, service_role;

alter policy mini_quizzes_select_student on public.mini_quizzes
  using (
    status = 'published'
    and course_id in (select public.active_course_ids())
    and (release_date is null or release_date <= (now() at time zone 'America/Fortaleza')::date)
    and case
      when not ((select public.student_goal_scopes()) ? course_id::text) then false
      when jsonb_typeof((select public.student_goal_scopes()) -> course_id::text) = 'null' then true
      else coalesce(((select public.student_goal_scopes()) ->> course_id::text)::smallint = any(target_groups), false)
    end
  );
-- mini_quiz_questions_select_student consulta mini_quizzes sob RLS e herda o filtro acima.

create or replace function public.mini_quiz_validate_scope()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_course uuid;
  v_subject uuid;
begin
  if tg_table_name = 'mini_quizzes' then
    -- Simulado com várias disciplinas (semanal): sem disciplina nem assunto no nível do simulado.
    if new.subject_id is null then
      if new.topic_id is not null then
        raise exception 'MINI_QUIZ_INVALID_TOPIC' using errcode = '22023';
      end if;
    elsif not exists (select 1 from public.subjects s where s.id = new.subject_id and s.course_id = new.course_id) then
      raise exception 'MINI_QUIZ_INVALID_SUBJECT' using errcode = '22023';
    end if;
    if new.topic_id is not null and not exists (
      select 1 from public.syllabus_topics t where t.id = new.topic_id and t.subject_id = new.subject_id
    ) then
      raise exception 'MINI_QUIZ_INVALID_TOPIC' using errcode = '22023';
    end if;
  else
    select q.course_id, q.subject_id into v_course, v_subject from public.mini_quizzes q where q.id = new.quiz_id;
    if new.subject_id is not null then
      if not exists (select 1 from public.subjects s where s.id = new.subject_id and s.course_id = v_course) then
        raise exception 'MINI_QUIZ_INVALID_SUBJECT' using errcode = '22023';
      end if;
      v_subject := new.subject_id;
    end if;
    if new.topic_id is not null then
      if not exists (select 1 from public.syllabus_topics t where t.id = new.topic_id and t.subject_id = v_subject) then
        raise exception 'MINI_QUIZ_INVALID_TOPIC' using errcode = '22023';
      end if;
    end if;
    if exists (
      select 1 from jsonb_array_elements(new.alternatives) a
      where jsonb_typeof(a) <> 'object'
         or coalesce(a->>'key', '') not in ('A', 'B', 'C', 'D', 'E')
         or char_length(btrim(coalesce(a->>'text', ''))) = 0
    ) or (
      select count(distinct a->>'key') from jsonb_array_elements(new.alternatives) a
    ) <> jsonb_array_length(new.alternatives) then
      raise exception 'MINI_QUIZ_INVALID_ALTERNATIVES' using errcode = '22023';
    end if;
  end if;
  return new;
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
begin
  if v_uid is null then
    raise exception 'MINI_QUIZ_AUTH_REQUIRED' using errcode = '42501';
  end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    raise exception 'MINI_QUIZ_INVALID_ANSWERS' using errcode = '22023';
  end if;

  select * into v_quiz from public.mini_quizzes where id = p_quiz_id;
  if not found or v_quiz.status <> 'published'
     or v_quiz.course_id not in (select public.active_course_ids())
     or (v_quiz.release_date is not null and v_quiz.release_date > (now() at time zone 'America/Fortaleza')::date)
     or not public.mini_quiz_group_allowed(v_quiz.course_id, v_quiz.target_groups) then
    raise exception 'MINI_QUIZ_NOT_AVAILABLE' using errcode = '42501';
  end if;

  -- Serializa envios simultâneos do mesmo aluno para o mesmo mini simulado.
  perform pg_advisory_xact_lock(hashtextextended('mini_quiz:' || v_uid::text || ':' || p_quiz_id::text, 0));

  select max(submitted_at), coalesce(max(attempt_number), 0) + 1
    into v_last, v_attempt_number
  from public.mini_quiz_attempts where user_id = v_uid and quiz_id = p_quiz_id;

  if v_last is not null and v_last > v_now - interval '7 days' then
    raise exception 'MINI_QUIZ_COOLDOWN:%', to_char(v_last + interval '7 days', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      using errcode = 'P0001';
  end if;

  -- Respostas só podem citar questões ativas deste mini simulado e letras existentes.
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

  insert into public.mini_quiz_attempts (
    id, user_id, quiz_id, course_id, attempt_number, is_first_of_month, month_start,
    correct_count, answered_count, total_count, submitted_at
  ) values (
    v_attempt_id, v_uid, p_quiz_id, v_quiz.course_id, v_attempt_number, v_first, v_month, 0, 0, v_total, v_now
  );

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
    'next_available_at', v_now + interval '7 days'
  );
end;
$$;

create or replace function public.admin_save_mini_quiz(
  p_quiz_id uuid,
  p_course_id uuid,
  p_quiz jsonb,
  p_questions jsonb,
  p_expected_updated_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quiz_id uuid := coalesce(p_quiz_id, gen_random_uuid());
  v_current timestamptz;
  v_question jsonb;
  v_question_id uuid;
  v_kept uuid[] := '{}';
  v_index integer := 0;
begin
  if not public.is_admin() then
    raise exception 'MINI_QUIZ_ADMIN_REQUIRED' using errcode = '42501';
  end if;
  if p_questions is null or jsonb_typeof(p_questions) <> 'array' then
    raise exception 'MINI_QUIZ_INVALID_QUESTIONS' using errcode = '22023';
  end if;
  if coalesce(p_quiz->>'status', 'draft') not in ('draft', 'published', 'archived') then
    raise exception 'MINI_QUIZ_INVALID_STATUS' using errcode = '22023';
  end if;
  if coalesce(p_quiz->>'status', 'draft') = 'published' and jsonb_array_length(p_questions) = 0 then
    raise exception 'MINI_QUIZ_EMPTY' using errcode = '22023';
  end if;

  if p_quiz_id is not null then
    select updated_at into v_current from public.mini_quizzes where id = p_quiz_id and course_id = p_course_id for update;
    if not found then
      raise exception 'MINI_QUIZ_NOT_FOUND' using errcode = 'P0002';
    end if;
    if p_expected_updated_at is not null and v_current <> p_expected_updated_at then
      raise exception 'MINI_QUIZ_VERSION_CONFLICT' using errcode = '40001';
    end if;
    update public.mini_quizzes set
      subject_id = nullif(p_quiz->>'subject_id', '')::uuid,
      target_groups = case when p_quiz ? 'target_groups'
        then array(select jsonb_array_elements_text(p_quiz->'target_groups'))::smallint[] else target_groups end,
      release_date = case when p_quiz ? 'release_date' then nullif(p_quiz->>'release_date', '')::date else release_date end,
      week_number = case when p_quiz ? 'week_number' then nullif(p_quiz->>'week_number', '')::integer else week_number end,
      topic_id = nullif(p_quiz->>'topic_id', '')::uuid,
      title = btrim(p_quiz->>'title'),
      description = nullif(btrim(coalesce(p_quiz->>'description', '')), ''),
      status = coalesce(p_quiz->>'status', 'draft'),
      position = coalesce((p_quiz->>'position')::integer, position)
    where id = p_quiz_id;
  else
    insert into public.mini_quizzes (id, course_id, subject_id, topic_id, title, description, status, position,
                                     target_groups, release_date, week_number)
    values (
      v_quiz_id, p_course_id, nullif(p_quiz->>'subject_id', '')::uuid, nullif(p_quiz->>'topic_id', '')::uuid,
      btrim(p_quiz->>'title'), nullif(btrim(coalesce(p_quiz->>'description', '')), ''),
      coalesce(p_quiz->>'status', 'draft'), coalesce((p_quiz->>'position')::integer, 0),
      case when jsonb_typeof(p_quiz->'target_groups') = 'array' and jsonb_array_length(p_quiz->'target_groups') > 0
        then array(select jsonb_array_elements_text(p_quiz->'target_groups'))::smallint[]
        else array[1,2]::smallint[] end,
      nullif(p_quiz->>'release_date', '')::date, nullif(p_quiz->>'week_number', '')::integer
    );
  end if;

  for v_question in select value from jsonb_array_elements(p_questions) loop
    v_question_id := nullif(v_question->>'id', '')::uuid;
    if v_question_id is not null and not exists (
      select 1 from public.mini_quiz_questions where id = v_question_id and quiz_id = v_quiz_id
    ) then
      raise exception 'MINI_QUIZ_INVALID_QUESTIONS' using errcode = '22023';
    end if;
    if coalesce(v_question->>'correct_key', '') not in ('A', 'B', 'C', 'D', 'E')
       or not exists (
         select 1 from jsonb_array_elements(v_question->'alternatives') a where a->>'key' = v_question->>'correct_key'
       ) then
      raise exception 'MINI_QUIZ_INVALID_KEY' using errcode = '22023';
    end if;

    if v_question_id is null then
      v_question_id := gen_random_uuid();
      insert into public.mini_quiz_questions (id, quiz_id, position, statement, alternatives, topic_id, subject_id)
      values (v_question_id, v_quiz_id, v_index, v_question->>'statement', v_question->'alternatives',
              nullif(v_question->>'topic_id', '')::uuid, nullif(v_question->>'subject_id', '')::uuid);
    else
      update public.mini_quiz_questions set
        position = v_index,
        statement = v_question->>'statement',
        alternatives = v_question->'alternatives',
        topic_id = nullif(v_question->>'topic_id', '')::uuid,
        subject_id = nullif(v_question->>'subject_id', '')::uuid,
        archived_at = null
      where id = v_question_id;
    end if;

    insert into public.mini_quiz_answer_keys (question_id, correct_key, explanation)
    values (v_question_id, v_question->>'correct_key', nullif(btrim(coalesce(v_question->>'explanation', '')), ''))
    on conflict (question_id) do update
      set correct_key = excluded.correct_key, explanation = excluded.explanation;

    v_kept := v_kept || v_question_id;
    v_index := v_index + 1;
  end loop;

  update public.mini_quiz_questions
     set archived_at = timezone('utc', now())
   where quiz_id = v_quiz_id and archived_at is null and not (id = any(v_kept));

  return v_quiz_id;
end;
$$;

commit;
