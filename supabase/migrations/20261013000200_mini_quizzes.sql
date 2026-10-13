-- Mini Simulados: o aluno resolve na plataforma e a pontuação fica guardada para
-- diagnóstico. Regras:
--   * correção sempre no banco (RPC); o gabarito e os comentários ficam em tabela
--     própria, legível só por administradores, e só são devolvidos ao aluno pela
--     revisão de uma tentativa dele já enviada;
--   * uma nova tentativa do mesmo mini simulado só após 7 dias da anterior;
--   * o diagnóstico mensal usa a primeira tentativa de cada mini simulado no mês
--     (fuso de Brasília), marcada em is_first_of_month;
--   * tentativas e respostas nunca são apagadas: questões removidas são arquivadas
--     e um mini simulado com tentativas não pode ser excluído, apenas arquivado.
-- Acesso do aluno segue active_course_ids(): matrícula ativa, curso publicado, sem bloqueio.
begin;

create table if not exists public.mini_quizzes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete restrict,
  topic_id uuid references public.syllabus_topics(id) on delete set null,
  title text not null check (char_length(btrim(title)) between 1 and 300),
  description text check (description is null or char_length(description) <= 2000),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  position integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create index if not exists mini_quizzes_course_subject_idx on public.mini_quizzes (course_id, subject_id, position);

create table if not exists public.mini_quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.mini_quizzes(id) on delete cascade,
  position integer not null default 0,
  statement text not null check (char_length(btrim(statement)) between 1 and 20000),
  -- [{ "key": "A", "text": "..." }, ...] com 2 a 5 alternativas, chaves A–E únicas.
  alternatives jsonb not null check (
    jsonb_typeof(alternatives) = 'array' and jsonb_array_length(alternatives) between 2 and 5
  ),
  topic_id uuid references public.syllabus_topics(id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create index if not exists mini_quiz_questions_quiz_idx on public.mini_quiz_questions (quiz_id, position) where archived_at is null;

create table if not exists public.mini_quiz_answer_keys (
  question_id uuid primary key references public.mini_quiz_questions(id) on delete cascade,
  correct_key text not null check (correct_key in ('A', 'B', 'C', 'D', 'E')),
  explanation text check (explanation is null or char_length(explanation) <= 20000)
);

create table if not exists public.mini_quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  quiz_id uuid not null references public.mini_quizzes(id) on delete restrict,
  course_id uuid not null references public.courses(id) on delete cascade,
  attempt_number integer not null check (attempt_number >= 1),
  is_first_of_month boolean not null,
  month_start date not null,
  correct_count integer not null check (correct_count >= 0),
  answered_count integer not null check (answered_count >= 0),
  total_count integer not null check (total_count >= 1),
  submitted_at timestamptz not null default timezone('utc', now()),
  unique (user_id, quiz_id, attempt_number)
);
create index if not exists mini_quiz_attempts_user_idx on public.mini_quiz_attempts (user_id, course_id, submitted_at desc);
create index if not exists mini_quiz_attempts_quiz_idx on public.mini_quiz_attempts (quiz_id);

create table if not exists public.mini_quiz_attempt_answers (
  attempt_id uuid not null references public.mini_quiz_attempts(id) on delete cascade,
  question_id uuid not null references public.mini_quiz_questions(id) on delete restrict,
  position integer not null,
  chosen_key text check (chosen_key is null or chosen_key in ('A', 'B', 'C', 'D', 'E')),
  is_correct boolean not null,
  -- Cópia do enquadramento no momento da resposta: o diagnóstico não muda se a questão for reclassificada.
  subject_id uuid references public.subjects(id) on delete set null,
  topic_id uuid references public.syllabus_topics(id) on delete set null,
  primary key (attempt_id, question_id)
);
create index if not exists mini_quiz_attempt_answers_question_idx on public.mini_quiz_attempt_answers (question_id);

drop trigger if exists mini_quizzes_touch_updated_at on public.mini_quizzes;
create trigger mini_quizzes_touch_updated_at before update on public.mini_quizzes
for each row execute function public.touch_updated_at();
drop trigger if exists mini_quiz_questions_touch_updated_at on public.mini_quiz_questions;
create trigger mini_quiz_questions_touch_updated_at before update on public.mini_quiz_questions
for each row execute function public.touch_updated_at();

-- Coerência curso/disciplina/assunto validada no banco, não só na interface.
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
    if not exists (select 1 from public.subjects s where s.id = new.subject_id and s.course_id = new.course_id) then
      raise exception 'MINI_QUIZ_INVALID_SUBJECT' using errcode = '22023';
    end if;
    if new.topic_id is not null and not exists (
      select 1 from public.syllabus_topics t where t.id = new.topic_id and t.subject_id = new.subject_id
    ) then
      raise exception 'MINI_QUIZ_INVALID_TOPIC' using errcode = '22023';
    end if;
  else
    if new.topic_id is not null then
      select q.subject_id into v_subject from public.mini_quizzes q where q.id = new.quiz_id;
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

drop trigger if exists mini_quizzes_validate_scope on public.mini_quizzes;
create trigger mini_quizzes_validate_scope before insert or update on public.mini_quizzes
for each row execute function public.mini_quiz_validate_scope();
drop trigger if exists mini_quiz_questions_validate_scope on public.mini_quiz_questions;
create trigger mini_quiz_questions_validate_scope before insert or update on public.mini_quiz_questions
for each row execute function public.mini_quiz_validate_scope();

alter table public.mini_quizzes enable row level security;
alter table public.mini_quiz_questions enable row level security;
alter table public.mini_quiz_answer_keys enable row level security;
alter table public.mini_quiz_attempts enable row level security;
alter table public.mini_quiz_attempt_answers enable row level security;

drop policy if exists mini_quizzes_admin_all on public.mini_quizzes;
create policy mini_quizzes_admin_all on public.mini_quizzes for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists mini_quizzes_select_student on public.mini_quizzes;
create policy mini_quizzes_select_student on public.mini_quizzes for select to authenticated
  using (status = 'published' and course_id in (select public.active_course_ids()));

drop policy if exists mini_quiz_questions_admin_all on public.mini_quiz_questions;
create policy mini_quiz_questions_admin_all on public.mini_quiz_questions for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists mini_quiz_questions_select_student on public.mini_quiz_questions;
create policy mini_quiz_questions_select_student on public.mini_quiz_questions for select to authenticated
  using (
    archived_at is null
    and exists (
      select 1 from public.mini_quizzes q
      where q.id = quiz_id and q.status = 'published' and q.course_id in (select public.active_course_ids())
    )
  );

-- Gabarito: somente administradores. O aluno recebe pela revisão da própria tentativa.
drop policy if exists mini_quiz_answer_keys_admin_all on public.mini_quiz_answer_keys;
create policy mini_quiz_answer_keys_admin_all on public.mini_quiz_answer_keys for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Tentativas: leitura própria ou do administrador; escrita somente pela RPC.
drop policy if exists mini_quiz_attempts_select on public.mini_quiz_attempts;
create policy mini_quiz_attempts_select on public.mini_quiz_attempts for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists mini_quiz_attempt_answers_select on public.mini_quiz_attempt_answers;
create policy mini_quiz_attempt_answers_select on public.mini_quiz_attempt_answers for select to authenticated
  using (
    (select public.is_admin())
    or exists (select 1 from public.mini_quiz_attempts a where a.id = attempt_id and a.user_id = (select auth.uid()))
  );

revoke all on public.mini_quizzes, public.mini_quiz_questions, public.mini_quiz_answer_keys,
  public.mini_quiz_attempts, public.mini_quiz_attempt_answers from anon;
grant select, insert, update, delete on public.mini_quizzes, public.mini_quiz_questions, public.mini_quiz_answer_keys to authenticated;
grant select on public.mini_quiz_attempts, public.mini_quiz_attempt_answers to authenticated;

-- Envio de uma tentativa: corrige no banco e devolve o resultado.
-- p_answers: { "<question_id>": "A" | null, ... }
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
     or v_quiz.course_id not in (select public.active_course_ids()) then
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
         v_quiz.subject_id, coalesce(q.topic_id, v_quiz.topic_id)
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

-- Revisão de uma tentativa já enviada: gabarito e comentários só aqui.
create or replace function public.mini_quiz_attempt_review(p_attempt_id uuid)
returns table (
  question_id uuid,
  question_position integer,
  chosen_key text,
  correct_key text,
  is_correct boolean,
  explanation text
)
language sql
stable
security definer
set search_path = ''
as $$
  select a.question_id, a.position, a.chosen_key, k.correct_key, a.is_correct, k.explanation
  from public.mini_quiz_attempt_answers a
  join public.mini_quiz_attempts t on t.id = a.attempt_id
  left join public.mini_quiz_answer_keys k on k.question_id = a.question_id
  where a.attempt_id = p_attempt_id
    and (t.user_id = auth.uid() or public.is_admin())
  order by a.position;
$$;

-- Questões de uma tentativa (inclusive arquivadas depois) para exibir a revisão.
create or replace function public.mini_quiz_attempt_questions(p_attempt_id uuid)
returns table (question_id uuid, question_position integer, statement text, alternatives jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select q.id, a.position, q.statement, q.alternatives
  from public.mini_quiz_attempt_answers a
  join public.mini_quiz_attempts t on t.id = a.attempt_id
  join public.mini_quiz_questions q on q.id = a.question_id
  where a.attempt_id = p_attempt_id
    and (t.user_id = auth.uid() or public.is_admin())
  order by a.position;
$$;

-- Salvamento administrativo atômico, com IDs estáveis das questões.
-- Questões removidas são arquivadas (preserva tentativas). Controle de versão por updated_at.
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
      subject_id = (p_quiz->>'subject_id')::uuid,
      topic_id = nullif(p_quiz->>'topic_id', '')::uuid,
      title = btrim(p_quiz->>'title'),
      description = nullif(btrim(coalesce(p_quiz->>'description', '')), ''),
      status = coalesce(p_quiz->>'status', 'draft'),
      position = coalesce((p_quiz->>'position')::integer, position)
    where id = p_quiz_id;
  else
    insert into public.mini_quizzes (id, course_id, subject_id, topic_id, title, description, status, position)
    values (
      v_quiz_id, p_course_id, (p_quiz->>'subject_id')::uuid, nullif(p_quiz->>'topic_id', '')::uuid,
      btrim(p_quiz->>'title'), nullif(btrim(coalesce(p_quiz->>'description', '')), ''),
      coalesce(p_quiz->>'status', 'draft'), coalesce((p_quiz->>'position')::integer, 0)
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
      insert into public.mini_quiz_questions (id, quiz_id, position, statement, alternatives, topic_id)
      values (v_question_id, v_quiz_id, v_index, v_question->>'statement', v_question->'alternatives',
              nullif(v_question->>'topic_id', '')::uuid);
    else
      update public.mini_quiz_questions set
        position = v_index,
        statement = v_question->>'statement',
        alternatives = v_question->'alternatives',
        topic_id = nullif(v_question->>'topic_id', '')::uuid,
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

revoke all on function public.submit_mini_quiz(uuid, jsonb) from public, anon;
revoke all on function public.mini_quiz_attempt_review(uuid) from public, anon;
revoke all on function public.mini_quiz_attempt_questions(uuid) from public, anon;
revoke all on function public.admin_save_mini_quiz(uuid, uuid, jsonb, jsonb, timestamptz) from public, anon;
revoke all on function public.mini_quiz_validate_scope() from public, anon, authenticated;
grant execute on function public.submit_mini_quiz(uuid, jsonb) to authenticated;
grant execute on function public.mini_quiz_attempt_review(uuid) to authenticated;
grant execute on function public.mini_quiz_attempt_questions(uuid) to authenticated;
grant execute on function public.admin_save_mini_quiz(uuid, uuid, jsonb, jsonb, timestamptz) to authenticated;

commit;
