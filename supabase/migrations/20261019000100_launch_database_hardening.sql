-- Preparação de lançamento: índices de FKs e menor superfície RPC.
-- Não altera dados, políticas RLS, regras de matrícula ou funções de negócio.
begin;
set local lock_timeout = '2s';
set local statement_timeout = '30s';

create index if not exists goal_item_materials_material_idx on public.goal_item_materials(material_id);
create index if not exists course_access_blocks_blocked_by_idx on public.course_access_blocks(blocked_by);
create index if not exists course_access_blocks_released_by_idx on public.course_access_blocks(released_by);
create index if not exists manual_course_grants_granted_by_idx on public.manual_course_grants(granted_by);
create index if not exists mini_quiz_attempt_answers_subject_idx on public.mini_quiz_attempt_answers(subject_id);
create index if not exists mini_quiz_attempt_answers_topic_idx on public.mini_quiz_attempt_answers(topic_id);
create index if not exists mini_quiz_attempts_course_idx on public.mini_quiz_attempts(course_id);
create index if not exists mini_quiz_questions_topic_idx on public.mini_quiz_questions(topic_id);
create index if not exists mini_quizzes_subject_idx on public.mini_quizzes(subject_id);
create index if not exists mini_quizzes_topic_idx on public.mini_quizzes(topic_id);

-- Funções de trigger são invocadas pelo PostgreSQL, nunca como RPC do cliente.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.check_goal_item_consistency() from public, anon, authenticated;

-- Auxiliares dependem da identidade autenticada. Mantém o acesso das políticas RLS.
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.has_active_enrollment(uuid) from public, anon;
grant execute on function public.is_admin(), public.has_active_enrollment(uuid) to authenticated, service_role;

commit;
