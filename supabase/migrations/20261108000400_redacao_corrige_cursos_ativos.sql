-- Correção (08/11/2026): submit_mini_quiz_essay usava "= any (public.active_course_ids())", mas em
-- produção active_course_ids() devolve setof uuid (linhas), não array -> erro 42809 em todo envio de
-- redação. Troca por "in (select public.active_course_ids())". Só o corpo da função muda.
--
-- Reversão: recriar a função como na migração 20261108000300 (não recomendado: volta o erro).

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
  v_quiz_prefix text;
  v_path text;
  v_row public.mini_quiz_essays;
begin
  if v_uid is null then raise exception 'ESSAY_NOT_ALLOWED'; end if;
  select * into v_attempt from public.mini_quiz_attempts where id = p_attempt_id;
  if not found or v_attempt.user_id <> v_uid or v_attempt.submitted_at is null then
    raise exception 'ESSAY_NOT_ALLOWED';
  end if;
  -- active_course_ids() devolve linhas (setof uuid), não um array.
  if v_attempt.course_id not in (select public.active_course_ids()) then raise exception 'ESSAY_NOT_ALLOWED'; end if;
  select essay_prompt into v_prompt from public.mini_quizzes where id = v_attempt.quiz_id;
  if v_prompt is null then raise exception 'ESSAY_NOT_ALLOWED'; end if;
  -- A redação é enviada junto com as respostas: só logo depois do envio (folga para a conexão).
  if now() > v_attempt.submitted_at + interval '15 minutes' then raise exception 'ESSAY_TOO_LATE'; end if;
  if exists (select 1 from public.mini_quiz_essays where attempt_id = p_attempt_id) then
    raise exception 'ESSAY_ALREADY_SENT';
  end if;
  if v_body is null and cardinality(v_paths) = 0 then raise exception 'ESSAY_EMPTY'; end if;
  if v_body is not null and length(v_body) > 12000 then raise exception 'ESSAY_TOO_LONG'; end if;
  if cardinality(v_paths) > 3 then raise exception 'ESSAY_TOO_MANY_IMAGES'; end if;

  -- Fotos sobem antes das respostas (pasta do simulado) ou, no formato antigo, na pasta da tentativa.
  v_prefix := v_uid::text || '/' || p_attempt_id::text || '/';
  v_quiz_prefix := v_uid::text || '/' || v_attempt.quiz_id::text || '/';
  foreach v_path in array v_paths loop
    if (left(v_path, length(v_prefix)) <> v_prefix and left(v_path, length(v_quiz_prefix)) <> v_quiz_prefix)
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

revoke all on function public.submit_mini_quiz_essay(uuid, text, text[]) from public, anon;
grant execute on function public.submit_mini_quiz_essay(uuid, text, text[]) to authenticated;
