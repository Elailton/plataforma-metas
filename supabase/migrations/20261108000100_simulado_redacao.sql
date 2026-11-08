-- Redação opcional do Simulado Geral (pedido em 08/11/2026).
-- Aditiva. O aluno, depois de enviar as questões, pode anexar fotos da folha e/ou colar o texto.
-- A correção é feita fora da plataforma (prazo informado ao aluno: 7 dias) e o administrador
-- registra o resultado (4 critérios de até 10 pontos, ou anulação) para aparecer no Relatório.
--
-- Dados: só o texto e as fotos da redação, ligados à tentativa; nada de nome na folha (o aviso
-- pede para não se identificar). Fotos em bucket privado, pasta = id do aluno.
--
-- Reversão:
--   drop function if exists public.admin_grade_mini_quiz_essay(uuid, text, integer[], text);
--   drop function if exists public.submit_mini_quiz_essay(uuid, text, text[]);
--   drop policy if exists "mini_quiz_essays_insert_own" on storage.objects;
--   drop policy if exists "mini_quiz_essays_read_own_or_admin" on storage.objects;
--   drop table if exists public.mini_quiz_essays;   -- só se nenhuma redação tiver sido enviada
--   alter table public.mini_quizzes drop column if exists essay_prompt;
--   (o bucket 'mini-quiz-essays' só pode ser removido vazio, pelo painel do Supabase)

alter table public.mini_quizzes add column if not exists essay_prompt text;

create table if not exists public.mini_quiz_essays (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null unique references public.mini_quiz_attempts (id),
  quiz_id uuid not null references public.mini_quizzes (id),
  course_id uuid not null references public.courses (id),
  user_id uuid not null references public.profiles (id),
  body text,
  image_paths text[] not null default '{}',
  submitted_at timestamptz not null default now(),
  status text not null default 'pending',
  scores integer[],
  score_total integer,
  feedback text,
  graded_at timestamptz,
  graded_by uuid references public.profiles (id),
  constraint mini_quiz_essays_status_check check (status in ('pending', 'graded', 'annulled')),
  constraint mini_quiz_essays_content_check check (coalesce(length(btrim(body)), 0) > 0 or cardinality(image_paths) > 0),
  constraint mini_quiz_essays_body_check check (body is null or length(body) <= 6000),
  constraint mini_quiz_essays_images_check check (cardinality(image_paths) <= 3),
  constraint mini_quiz_essays_scores_check check (
    scores is null or (cardinality(scores) = 4 and 0 <= all (scores) and 10 >= all (scores))
  ),
  constraint mini_quiz_essays_feedback_check check (feedback is null or length(feedback) <= 4000)
);

create index if not exists mini_quiz_essays_user_idx on public.mini_quiz_essays (user_id, submitted_at desc);
create index if not exists mini_quiz_essays_quiz_idx on public.mini_quiz_essays (quiz_id, status);

alter table public.mini_quiz_essays enable row level security;

drop policy if exists "mini_quiz_essays_select_own_or_admin" on public.mini_quiz_essays;
create policy "mini_quiz_essays_select_own_or_admin" on public.mini_quiz_essays
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
-- Sem insert/update/delete diretos: só pelas RPCs abaixo.

revoke all on public.mini_quiz_essays from anon;
grant select on public.mini_quiz_essays to authenticated;

-- Bucket privado das fotos (até 10 MB, só imagens).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('mini-quiz-essays', 'mini-quiz-essays', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "mini_quiz_essays_insert_own" on storage.objects;
create policy "mini_quiz_essays_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'mini-quiz-essays' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "mini_quiz_essays_read_own_or_admin" on storage.objects;
create policy "mini_quiz_essays_read_own_or_admin" on storage.objects
  for select to authenticated
  using (bucket_id = 'mini-quiz-essays'
         and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin())));

-- Envio (uma vez por tentativa). Fotos já enviadas ao bucket, na pasta <aluno>/<tentativa>/.
create or replace function public.submit_mini_quiz_essay(p_attempt_id uuid, p_body text, p_image_paths text[])
returns public.mini_quiz_essays
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_attempt public.mini_quiz_attempts;
  v_prompt text;
  v_body text := nullif(btrim(coalesce(p_body, '')), '');
  v_paths text[] := coalesce(p_image_paths, '{}');
  v_prefix text;
  v_path text;
  v_row public.mini_quiz_essays;
begin
  if v_uid is null then raise exception 'ESSAY_NOT_ALLOWED'; end if;
  select * into v_attempt from public.mini_quiz_attempts where id = p_attempt_id;
  if not found or v_attempt.user_id <> v_uid or v_attempt.submitted_at is null then
    raise exception 'ESSAY_NOT_ALLOWED';
  end if;
  if not (v_attempt.course_id = any (public.active_course_ids())) then raise exception 'ESSAY_NOT_ALLOWED'; end if;
  select essay_prompt into v_prompt from public.mini_quizzes where id = v_attempt.quiz_id;
  if v_prompt is null then raise exception 'ESSAY_NOT_ALLOWED'; end if;
  if exists (select 1 from public.mini_quiz_essays where attempt_id = p_attempt_id) then
    raise exception 'ESSAY_ALREADY_SENT';
  end if;
  if v_body is null and cardinality(v_paths) = 0 then raise exception 'ESSAY_EMPTY'; end if;
  if v_body is not null and length(v_body) > 6000 then raise exception 'ESSAY_TOO_LONG'; end if;
  if cardinality(v_paths) > 3 then raise exception 'ESSAY_TOO_MANY_IMAGES'; end if;

  v_prefix := v_uid::text || '/' || p_attempt_id::text || '/';
  foreach v_path in array v_paths loop
    if left(v_path, length(v_prefix)) <> v_prefix
       or not exists (select 1 from storage.objects where bucket_id = 'mini-quiz-essays' and name = v_path) then
      raise exception 'ESSAY_IMAGE_INVALID';
    end if;
  end loop;

  insert into public.mini_quiz_essays (attempt_id, quiz_id, course_id, user_id, body, image_paths)
  values (p_attempt_id, v_attempt.quiz_id, v_attempt.course_id, v_uid, v_body, v_paths)
  returning * into v_row;
  return v_row;
end;
$$;

-- Resultado informado pelo administrador: 'graded' com as 4 notas (0 a 10) ou 'annulled'.
create or replace function public.admin_grade_mini_quiz_essay(p_essay_id uuid, p_status text, p_scores integer[], p_feedback text)
returns public.mini_quiz_essays
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.mini_quiz_essays;
begin
  if not public.is_admin() then raise exception 'ESSAY_NOT_ALLOWED'; end if;
  if p_status not in ('pending', 'graded', 'annulled') then raise exception 'ESSAY_STATUS_INVALID'; end if;
  if p_status = 'graded' and (p_scores is null or cardinality(p_scores) <> 4) then raise exception 'ESSAY_SCORES_INVALID'; end if;

  update public.mini_quiz_essays set
    status = p_status,
    scores = case when p_status = 'graded' then p_scores else null end,
    score_total = case when p_status = 'graded' then (select sum(s) from unnest(p_scores) s)::integer
                       when p_status = 'annulled' then 0 else null end,
    feedback = nullif(btrim(coalesce(p_feedback, '')), ''),
    graded_at = case when p_status = 'pending' then null else now() end,
    graded_by = case when p_status = 'pending' then null else auth.uid() end
  where id = p_essay_id
  returning * into v_row;
  if not found then raise exception 'ESSAY_NOT_FOUND'; end if;
  return v_row;
end;
$$;

revoke all on function public.submit_mini_quiz_essay(uuid, text, text[]) from public, anon;
revoke all on function public.admin_grade_mini_quiz_essay(uuid, text, integer[], text) from public, anon;
grant execute on function public.submit_mini_quiz_essay(uuid, text, text[]) to authenticated;
grant execute on function public.admin_grade_mini_quiz_essay(uuid, text, integer[], text) to authenticated;
