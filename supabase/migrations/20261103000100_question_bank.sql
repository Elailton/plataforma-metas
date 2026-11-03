-- Banco de questões por curso (R2 do planejamento de provas anteriores).
--
-- Pedido do usuário em 03/11/2026: guardar primeiro as questões das provas anteriores
-- (e as dos diagnósticos já publicados) para usá-las depois em novos Diagnósticos
-- Semanais e no simulado geral. Reta final e trilha prioritária ficam fora.
--
-- Regras:
--   * tudo por course_id; nada específico de um concurso;
--   * só questões reais; questão anulada pela banca NÃO entra (o número fica só na lista
--     de auditoria `question_bank_sources.annulled_numbers`);
--   * nada é apagado: questão retirada é arquivada (archived_at);
--   * leitura e escrita somente do administrador (o aluno nunca lê o banco nem o gabarito;
--     a questão chega a ele copiada para mini_quiz_questions, que já tem as regras próprias);
--   * mini_quiz_questions.bank_item_id registra de qual questão do banco veio a cópia,
--     para não repetir questão entre diagnósticos.
--
-- Aditiva. Reversão:
--   alter table public.mini_quiz_questions drop column if exists bank_item_id;
--   drop table if exists public.question_bank_answer_keys, public.question_bank_items,
--     public.question_bank_sources;
--   drop function if exists public.question_bank_validate();

create table if not exists public.question_bank_sources (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete restrict,
  board text not null check (char_length(btrim(board)) between 1 and 120),
  exam_year integer not null check (exam_year between 1990 and 2100),
  applied_on date,
  organization text not null check (char_length(btrim(organization)) between 1 and 200),
  role_name text not null check (char_length(btrim(role_name)) between 1 and 200),
  booklet text check (booklet is null or char_length(booklet) <= 120),
  total_questions integer not null check (total_questions between 1 and 500),
  annulled_numbers integer[] not null default '{}',
  notes text check (notes is null or char_length(notes) <= 2000),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create unique index if not exists question_bank_sources_unique_idx
  on public.question_bank_sources (course_id, board, exam_year, role_name, coalesce(booklet, ''));

create table if not exists public.question_bank_items (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete restrict,
  origin text not null check (origin in ('prova_anterior', 'diagnostico')),
  source_id uuid references public.question_bank_sources(id) on delete restrict,
  source_number integer check (source_number is null or source_number >= 1),
  mini_quiz_question_id uuid references public.mini_quiz_questions(id) on delete restrict,
  subject_id uuid references public.subjects(id) on delete set null,
  topic_id uuid references public.syllabus_topics(id) on delete set null,
  statement text not null check (char_length(btrim(statement)) between 1 and 20000),
  alternatives jsonb not null check (
    jsonb_typeof(alternatives) = 'array' and jsonb_array_length(alternatives) between 2 and 5
  ),
  archived_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint question_bank_items_origin_ref_check check (
    (origin = 'prova_anterior' and source_id is not null and source_number is not null and mini_quiz_question_id is null)
    or (origin = 'diagnostico' and mini_quiz_question_id is not null and source_id is null)
  )
);
create unique index if not exists question_bank_items_source_number_idx
  on public.question_bank_items (source_id, source_number) where source_id is not null;
create unique index if not exists question_bank_items_mini_quiz_question_idx
  on public.question_bank_items (mini_quiz_question_id) where mini_quiz_question_id is not null;
create index if not exists question_bank_items_course_topic_idx
  on public.question_bank_items (course_id, subject_id, topic_id) where archived_at is null;

create table if not exists public.question_bank_answer_keys (
  item_id uuid primary key references public.question_bank_items(id) on delete restrict,
  correct_key text not null check (correct_key in ('A', 'B', 'C', 'D', 'E')),
  explanation text check (explanation is null or char_length(explanation) <= 20000)
);

alter table public.mini_quiz_questions
  add column if not exists bank_item_id uuid references public.question_bank_items(id) on delete set null;
create index if not exists mini_quiz_questions_bank_item_idx
  on public.mini_quiz_questions (bank_item_id) where bank_item_id is not null;

-- Coerência: disciplina/tópico do mesmo curso, prova do mesmo curso, número não anulado,
-- alternativas válidas e gabarito entre as alternativas.
create or replace function public.question_bank_validate()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_annulled integer[];
  v_course uuid;
begin
  if tg_table_name = 'question_bank_items' then
    if new.subject_id is not null and not exists (
      select 1 from public.subjects s where s.id = new.subject_id and s.course_id = new.course_id
    ) then
      raise exception 'QUESTION_BANK_INVALID_SUBJECT' using errcode = '22023';
    end if;
    if new.topic_id is not null and not exists (
      select 1 from public.syllabus_topics t
      where t.id = new.topic_id and new.subject_id is not null and t.subject_id = new.subject_id
    ) then
      raise exception 'QUESTION_BANK_INVALID_TOPIC' using errcode = '22023';
    end if;
    if new.source_id is not null then
      select s.annulled_numbers, s.course_id into v_annulled, v_course
      from public.question_bank_sources s where s.id = new.source_id;
      if v_course is distinct from new.course_id then
        raise exception 'QUESTION_BANK_INVALID_SOURCE' using errcode = '22023';
      end if;
      if new.source_number = any(v_annulled) then
        raise exception 'QUESTION_BANK_ANNULLED' using errcode = '22023';
      end if;
    end if;
    if new.mini_quiz_question_id is not null and not exists (
      select 1 from public.mini_quiz_questions q join public.mini_quizzes z on z.id = q.quiz_id
      where q.id = new.mini_quiz_question_id and z.course_id = new.course_id
    ) then
      raise exception 'QUESTION_BANK_INVALID_SOURCE' using errcode = '22023';
    end if;
    if exists (
      select 1 from jsonb_array_elements(new.alternatives) a
      where jsonb_typeof(a) <> 'object'
         or coalesce(a->>'key', '') not in ('A', 'B', 'C', 'D', 'E')
         or char_length(btrim(coalesce(a->>'text', ''))) = 0
    ) or (
      select count(distinct a->>'key') from jsonb_array_elements(new.alternatives) a
    ) <> jsonb_array_length(new.alternatives) then
      raise exception 'QUESTION_BANK_INVALID_ALTERNATIVES' using errcode = '22023';
    end if;
    new.updated_at := timezone('utc', now());
  elsif tg_table_name = 'question_bank_answer_keys' then
    if not exists (
      select 1 from public.question_bank_items i, jsonb_array_elements(i.alternatives) a
      where i.id = new.item_id and a->>'key' = new.correct_key
    ) then
      raise exception 'QUESTION_BANK_INVALID_KEY' using errcode = '22023';
    end if;
  elsif tg_table_name = 'question_bank_sources' then
    if tg_op = 'UPDATE' and exists (
      select 1 from public.question_bank_items i
      where i.source_id = new.id and i.source_number = any(new.annulled_numbers)
    ) then
      raise exception 'QUESTION_BANK_ANNULLED' using errcode = '22023';
    end if;
    new.updated_at := timezone('utc', now());
  end if;
  return new;
end;
$$;

drop trigger if exists question_bank_items_validate on public.question_bank_items;
create trigger question_bank_items_validate before insert or update on public.question_bank_items
  for each row execute function public.question_bank_validate();
drop trigger if exists question_bank_answer_keys_validate on public.question_bank_answer_keys;
create trigger question_bank_answer_keys_validate before insert or update on public.question_bank_answer_keys
  for each row execute function public.question_bank_validate();
drop trigger if exists question_bank_sources_validate on public.question_bank_sources;
create trigger question_bank_sources_validate before insert or update on public.question_bank_sources
  for each row execute function public.question_bank_validate();

alter table public.question_bank_sources enable row level security;
alter table public.question_bank_items enable row level security;
alter table public.question_bank_answer_keys enable row level security;

drop policy if exists question_bank_sources_admin on public.question_bank_sources;
create policy question_bank_sources_admin on public.question_bank_sources for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists question_bank_items_admin on public.question_bank_items;
create policy question_bank_items_admin on public.question_bank_items for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists question_bank_answer_keys_admin on public.question_bank_answer_keys;
create policy question_bank_answer_keys_admin on public.question_bank_answer_keys for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Nada é apagado: sem DELETE nem para o administrador (arquivar com archived_at).
revoke all on public.question_bank_sources, public.question_bank_items, public.question_bank_answer_keys from anon, authenticated;
grant select, insert, update on public.question_bank_sources, public.question_bank_items, public.question_bank_answer_keys to authenticated;
revoke execute on function public.question_bank_validate() from public, anon, authenticated;
