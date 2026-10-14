-- Importância de cada tópico do edital (selo exibido nos itens de meta do aluno).
-- Opcional: sem valor, o item não mostra selo. Orientado ao curso pelo próprio tópico.
alter table public.syllabus_topics
  add column if not exists importance text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'syllabus_topics_importance_check'
      and conrelid = 'public.syllabus_topics'::regclass
  ) then
    alter table public.syllabus_topics
      add constraint syllabus_topics_importance_check
      check (importance is null or importance in ('high', 'medium', 'low'));
  end if;
end $$;
