-- Preparação para a Black Friday (27/10/2026). Não altera nem apaga dados.
--
-- 1) Índices nas duas chaves estrangeiras sem índice apontadas pelo advisor do
--    Supabase (mini_quiz_starts). Aceleram exclusões/junções por tentativa e quiz.
-- 2) Remove de anon/authenticated privilégios que a API (PostgREST) nunca usa:
--    TRUNCATE (não passa pelo RLS), TRIGGER e REFERENCES. SELECT/INSERT/UPDATE/
--    DELETE continuam como estão, sempre filtrados pelo RLS.
--
-- Reversão (se necessário):
--   drop index if exists public.mini_quiz_starts_attempt_id_idx;
--   drop index if exists public.mini_quiz_starts_quiz_id_idx;
--   grant truncate, trigger, references on all tables in schema public to anon, authenticated;
--   alter default privileges for role postgres in schema public
--     grant truncate, trigger, references on tables to anon, authenticated;

create index if not exists mini_quiz_starts_attempt_id_idx on public.mini_quiz_starts (attempt_id);
create index if not exists mini_quiz_starts_quiz_id_idx on public.mini_quiz_starts (quiz_id);

revoke truncate, trigger, references on all tables in schema public from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke truncate, trigger, references on tables from anon, authenticated;
