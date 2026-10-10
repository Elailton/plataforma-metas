-- Desempenho das políticas RLS, sem alterar quem pode ver ou escrever o quê.
--
-- 1. auth.uid() e is_admin() passam a ser avaliados uma vez por consulta
--    ((select ...) vira InitPlan), em vez de uma vez por linha.
-- 2. has_active_enrollment(coluna), chamado linha a linha, é trocado por
--    coluna in (select public.active_course_ids()), que calcula uma única vez
--    os cursos acessíveis ao usuário. A regra é idêntica à de has_active_enrollment:
--    matrícula active, curso published e nenhum bloqueio administrativo aberto.
-- 3. Índices para chaves estrangeiras usadas em junções do edital e do painel.
begin;

create or replace function public.active_course_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select e.course_id
  from public.enrollments e
  join public.courses c on c.id = e.course_id
  where e.user_id = auth.uid()
    and e.status = 'active'
    and c.status = 'published'
    and not exists (
      select 1 from public.course_access_blocks b
      where b.user_id = e.user_id
        and b.course_id = e.course_id
        and b.released_at is null
    );
$$;
revoke all on function public.active_course_ids() from public, anon;
grant execute on function public.active_course_ids() to authenticated, service_role;

-- Políticas administrativas: mesma regra, avaliada uma vez por consulta.
alter policy courses_admin_all on public.courses
  using ((select public.is_admin())) with check ((select public.is_admin()));
alter policy enrollments_admin_all on public.enrollments
  using ((select public.is_admin())) with check ((select public.is_admin()));
alter policy goal_item_materials_admin_all on public.goal_item_materials
  using ((select public.is_admin())) with check ((select public.is_admin()));
alter policy goal_items_admin_all on public.goal_items
  using ((select public.is_admin())) with check ((select public.is_admin()));
alter policy goals_admin_all on public.goals
  using ((select public.is_admin())) with check ((select public.is_admin()));
alter policy materials_admin_all on public.materials
  using ((select public.is_admin())) with check ((select public.is_admin()));
alter policy subjects_admin_all on public.subjects
  using ((select public.is_admin())) with check ((select public.is_admin()));
alter policy syllabus_topics_admin_all on public.syllabus_topics
  using ((select public.is_admin())) with check ((select public.is_admin()));
alter policy student_goal_item_completions_admin_all on public.student_goal_item_completions
  using ((select public.is_admin())) with check ((select public.is_admin()));
alter policy hotmart_product_mappings_admin_all on public.hotmart_product_mappings
  using ((select public.is_admin())) with check ((select public.is_admin()));
alter policy hotmart_offer_rules_admin_all on public.hotmart_offer_rules
  using ((select public.is_admin())) with check ((select public.is_admin()));
alter policy hotmart_entitlements_admin_select on public.hotmart_entitlements
  using ((select public.is_admin()));
alter policy hotmart_webhook_events_admin_select on public.hotmart_webhook_events
  using ((select public.is_admin()));
alter policy manual_course_grants_admin_select on public.manual_course_grants
  using ((select public.is_admin()));
alter policy course_access_blocks_admin_select on public.course_access_blocks
  using ((select public.is_admin()));
alter policy questionnaire_history_admin on public.course_questionnaire_submissions
  using ((select public.is_admin()));

-- Pessoa e matrículas: o próprio usuário ou administrador.
alter policy profiles_select_self_or_admin on public.profiles
  using (id = (select auth.uid()) or (select public.is_admin()));
alter policy profiles_update_self_or_admin on public.profiles
  using (id = (select auth.uid()) or (select public.is_admin()))
  with check (id = (select auth.uid()) or (select public.is_admin()));
alter policy enrollments_select_own_or_admin on public.enrollments
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- Conteúdo do curso: somente cursos com acesso efetivo.
alter policy courses_select_enrolled_or_admin on public.courses
  using ((select public.is_admin()) or id in (select public.active_course_ids()));
alter policy subjects_select_enrolled_or_admin on public.subjects
  using ((select public.is_admin()) or course_id in (select public.active_course_ids()));
alter policy materials_select_enrolled_or_admin on public.materials
  using ((select public.is_admin()) or (course_id is not null and course_id in (select public.active_course_ids())));
alter policy syllabus_topics_select_enrolled_or_admin on public.syllabus_topics
  using (
    (select public.is_admin())
    or exists (
      select 1 from public.subjects s
      where s.id = syllabus_topics.subject_id
        and s.course_id in (select public.active_course_ids())
    )
  );

-- Metas por grupo continuam usando can_access_group_goal (poucas linhas por curso).
alter policy goals_select_enrolled_or_admin on public.goals
  using ((select public.is_admin()) or (status = 'published' and public.can_access_group_goal(course_id, target_groups)));
alter policy goal_items_select_enrolled_or_admin on public.goal_items
  using (
    (select public.is_admin())
    or (
      archived_at is null
      and exists (
        select 1 from public.goals g
        where g.id = goal_items.goal_id
          and g.status = 'published'
          and g.course_id in (select public.active_course_ids())
      )
    )
  );
alter policy goal_item_materials_select_enrolled_or_admin on public.goal_item_materials
  using (
    (select public.is_admin())
    or exists (
      select 1
      from public.goal_items i
      join public.goals g on g.id = i.goal_id
      where i.id = goal_item_materials.goal_item_id
        and i.archived_at is null
        and g.status = 'published'
        and g.course_id in (select public.active_course_ids())
    )
  );

-- Progresso do aluno: somente itens próprios, publicados e já liberados.
alter policy student_goal_item_completions_select_own_or_admin on public.student_goal_item_completions
  using (user_id = (select auth.uid()) or (select public.is_admin()));
alter policy student_goal_item_completions_insert_own_active_course on public.student_goal_item_completions
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.goal_items i
      join public.goals g on g.id = i.goal_id
      where i.id = student_goal_item_completions.goal_item_id
        and i.archived_at is null
        and g.status = 'published'
        and (g.due_date is null or g.due_date <= (now() at time zone 'America/Fortaleza')::date)
        and g.course_id in (select public.active_course_ids())
    )
  );
alter policy student_goal_item_completions_delete_own_active_course on public.student_goal_item_completions
  using (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.goal_items i
      join public.goals g on g.id = i.goal_id
      where i.id = student_goal_item_completions.goal_item_id
        and i.archived_at is null
        and g.status = 'published'
        and (g.due_date is null or g.due_date <= (now() at time zone 'America/Fortaleza')::date)
        and g.course_id in (select public.active_course_ids())
    )
  );

-- Índices de chaves estrangeiras usadas em junções (criados só se a coluna existir).
do $$
declare
  target record;
begin
  for target in
    select * from (values
      ('goal_items', 'topic_id', 'goal_items_topic_idx'),
      ('materials', 'subject_id', 'materials_subject_idx'),
      ('syllabus_topics', 'parent_topic_id', 'syllabus_topics_parent_idx'),
      ('course_questionnaire_submissions', 'enrollment_id', 'course_questionnaire_submissions_enrollment_idx'),
      ('hotmart_entitlements', 'course_id', 'hotmart_entitlements_course_idx'),
      ('manual_course_grants', 'course_id', 'manual_course_grants_course_idx')
    ) as t(table_name, column_name, index_name)
  loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = target.table_name and column_name = target.column_name
    ) then
      execute format('create index if not exists %I on public.%I (%I)', target.index_name, target.table_name, target.column_name);
    end if;
  end loop;
end
$$;

commit;
