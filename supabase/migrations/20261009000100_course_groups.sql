-- Optional segmentation per course. Existing courses keep their current access until enabled.
begin;
alter table public.courses add column groups_enabled boolean not null default false;
alter table public.courses add column questionnaire_schema jsonb not null default '[]';
alter table public.enrollments add column study_group smallint check (study_group in (1,2));
alter table public.enrollments add column group_manual_override boolean not null default false;
alter table public.enrollments add column questionnaire jsonb;
alter table public.goals add column target_groups smallint[] not null default array[1,2]::smallint[]
  check (cardinality(target_groups) between 1 and 2 and target_groups <@ array[1,2]::smallint[]);
create table public.course_questionnaire_submissions (
 id uuid primary key, enrollment_id uuid not null references public.enrollments(id),
 payload jsonb not null, submitted_at timestamptz not null default now()
);
alter table public.course_questionnaire_submissions enable row level security;
create policy questionnaire_history_admin on public.course_questionnaire_submissions for select to authenticated using (public.is_admin());
grant select on public.course_questionnaire_submissions to authenticated;
grant all on public.course_questionnaire_submissions to service_role;

create function public.can_access_group_goal(requested_course_id uuid, requested_groups smallint[])
returns boolean language sql stable security definer set search_path = '' as $$
 select public.has_active_enrollment(requested_course_id) and exists (
  select 1 from public.courses c join public.enrollments e on e.course_id=c.id
  where c.id=requested_course_id and e.user_id=auth.uid()
    and (not c.groups_enabled or e.study_group=any(requested_groups))
 );
$$;
revoke all on function public.can_access_group_goal(uuid,smallint[]) from public,anon;
grant execute on function public.can_access_group_goal(uuid,smallint[]) to authenticated;
alter policy goals_select_enrolled_or_admin on public.goals
using (public.is_admin() or (status='published' and public.can_access_group_goal(course_id,target_groups)));
-- Item/material policies and completion write policies join goals under RLS,
-- therefore inherit this filter, including direct ID access. History is retained.

create function public.study_group_from_q01(value text) returns smallint
language sql immutable set search_path = '' as $$
 select case value
 when 'ate_1h' then 1 when 'de_1_a_2h' then 1 when 'de_2_a_3h' then 1 when 'de_3_a_4h' then 1
 when 'de_4_a_6h' then 2 when 'mais_6h' then 2 else null end::smallint;
$$;
revoke all on function public.study_group_from_q01(text) from public,anon,authenticated;

create function public.admin_set_course_groups(requested_course_id uuid, requested_enabled boolean, requested_schema jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if not public.is_admin() then raise exception 'Somente administradores.'; end if;
 if requested_enabled is null or jsonb_typeof(requested_schema) is distinct from 'array' then raise exception 'Configuração inválida.'; end if;
 update public.courses set groups_enabled=requested_enabled,questionnaire_schema=requested_schema,updated_at=clock_timestamp() where id=requested_course_id;
 if not found then raise exception 'Curso não encontrado.'; end if;
end; $$;

create function public.admin_set_enrollment_group(requested_enrollment_id uuid,requested_course_id uuid,requested_group smallint)
returns void language plpgsql security definer set search_path = '' as $$
declare target uuid;
begin
 if not public.is_admin() then raise exception 'Somente administradores.'; end if;
 if requested_group is not null and requested_group not in (1,2) then raise exception 'Grupo inválido.'; end if;
 select user_id into target from public.enrollments where id=requested_enrollment_id and course_id=requested_course_id;
 if not found then raise exception 'Matrícula não encontrada.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(target::text||':'||requested_course_id::text,0));
 update public.enrollments set study_group=requested_group,group_manual_override=true
 where id=requested_enrollment_id and course_id=requested_course_id;
end; $$;

-- Students may submit once. Importing another submission never undoes an admin override.
create function public.save_course_questionnaire(requested_enrollment_id uuid, requested_submission_id uuid, requested_payload jsonb)
returns smallint language plpgsql security definer set search_path = '' as $$
declare e public.enrollments%rowtype; computed smallint; existing public.course_questionnaire_submissions%rowtype; k text;
begin
 select * into e from public.enrollments where id=requested_enrollment_id;
 if not found or (not public.is_admin() and (e.user_id<>auth.uid() or e.status<>'active' or auth.uid() is null)) then raise exception 'Matrícula não autorizada.'; end if;
 if not exists(select 1 from public.profiles where id=e.user_id and role='student') then raise exception 'Apenas contas de aluno.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(e.user_id::text||':'||e.course_id::text,0));
 select * into e from public.enrollments where id=requested_enrollment_id for update;
 select * into existing from public.course_questionnaire_submissions where id=requested_submission_id;
 if found then
  if existing.enrollment_id<>e.id or existing.payload<>requested_payload then raise exception 'Envio reutilizado com dados diferentes.'; end if;
  return e.study_group;
 end if;
 if not public.is_admin() and (e.questionnaire is not null or not exists(select 1 from public.courses where id=e.course_id and groups_enabled)) then raise exception 'Questionário já preenchido ou indisponível.'; end if;
 computed:=public.study_group_from_q01(requested_payload->'answers'->>'q01');
 if computed is null or requested_submission_id is null or jsonb_typeof(requested_payload->'labels') is distinct from 'object'
 or octet_length(requested_payload::text)>40000 then raise exception 'Resposta de disponibilidade inválida.'; end if;
 for n in 1..20 loop
  k:='q'||lpad(n::text,2,'0');
  if not (requested_payload->'answers' ? k) or jsonb_typeof(requested_payload->'labels'->k) is distinct from 'string'
   or nullif(trim(requested_payload->'labels'->>k),'') is null then raise exception 'Questionário incompleto.'; end if;
 end loop;
 insert into public.course_questionnaire_submissions(id,enrollment_id,payload) values(requested_submission_id,e.id,requested_payload);
 update public.enrollments set questionnaire=requested_payload,
 study_group=case when group_manual_override then study_group else computed end where id=e.id;
 return (select study_group from public.enrollments where id=e.id);
end; $$;
revoke all on function public.admin_set_course_groups(uuid,boolean,jsonb),public.admin_set_enrollment_group(uuid,uuid,smallint),public.save_course_questionnaire(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.admin_set_course_groups(uuid,boolean,jsonb),public.admin_set_enrollment_group(uuid,uuid,smallint),public.save_course_questionnaire(uuid,uuid,jsonb) to authenticated;

create or replace function public.admin_save_goal(
  requested_goal_id uuid,
  requested_course_id uuid,
  requested_goal jsonb,
  requested_items jsonb,
  requested_updated_at timestamptz default null
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  saved_goal_id uuid;
  previous_updated_at timestamptz;
  goal_input public.goals%rowtype;
  item_input public.goal_items%rowtype;
  previous_item public.goal_items%rowtype;
  item_json jsonb;
  material_json jsonb;
  linked_material_id uuid;
  saved_item_id uuid;
  submitted_ids uuid[] := '{}';
  retained_ids uuid[] := '{}';
  item_position integer := 0;
  material_position integer;
begin
  if not public.is_admin() or auth.uid() is null then
    raise exception 'Apenas administradores podem salvar metas.';
  end if;
  if jsonb_typeof(requested_goal) is distinct from 'object'
    or jsonb_typeof(requested_items) is distinct from 'array' then
    raise exception 'Dados da meta inválidos.';
  end if;
  if jsonb_array_length(requested_items) = 0 then
    raise exception 'Adicione ao menos um item à meta.';
  end if;
  select * into goal_input from jsonb_populate_record(null::public.goals, requested_goal);
  if nullif(trim(goal_input.title), '') is null
    or goal_input.status is null or goal_input.status::text not in ('draft', 'published', 'archived') then
    raise exception 'Título ou status da meta inválido.';
  end if;
  if not exists (select 1 from public.courses where id = requested_course_id) then
    raise exception 'Curso não encontrado.';
  end if;

  if requested_goal_id is null then
    insert into public.goals(course_id, title, description, due_date, status)
    values (requested_course_id, trim(goal_input.title), nullif(trim(goal_input.description), ''),
      goal_input.due_date, goal_input.status) returning id into saved_goal_id;
  else
    select id, updated_at into saved_goal_id, previous_updated_at from public.goals
      where id = requested_goal_id and course_id = requested_course_id for update;
    if not found then raise exception 'Meta não encontrada neste curso.'; end if;
    if requested_updated_at is null or requested_updated_at is distinct from previous_updated_at then
      raise exception 'A meta foi alterada. Recarregue a página antes de salvar novamente.';
    end if;
    update public.goals set title = trim(goal_input.title),
      description = nullif(trim(goal_input.description), ''), due_date = goal_input.due_date,
      status = goal_input.status, updated_at = clock_timestamp()
      where id = saved_goal_id;
  end if;

  for item_json in select value from jsonb_array_elements(requested_items) loop
    if jsonb_typeof(item_json) is distinct from 'object'
      or jsonb_typeof(item_json->'material_ids') is distinct from 'array' then
      raise exception 'Item de meta inválido.';
    end if;
    select * into item_input from jsonb_populate_record(null::public.goal_items, item_json);
    if not exists (select 1 from public.subjects where id = item_input.subject_id and course_id = requested_course_id) then
      raise exception 'A disciplina não pertence a este curso.';
    end if;
    if item_input.topic_id is not null and not exists (
      select 1 from public.syllabus_topics
      where id = item_input.topic_id
        and subject_id = item_input.subject_id
        and parent_topic_id is null
    ) then raise exception 'O tópico não pertence à disciplina.'; end if;
    if item_input.subtopic_id is not null and (
      item_input.topic_id is null or not exists (
        select 1 from public.syllabus_topics
        where id = item_input.subtopic_id
          and subject_id = item_input.subject_id
          and parent_topic_id = item_input.topic_id
      )
    ) then raise exception 'O subtópico não pertence ao tópico selecionado.'; end if;
    if item_input.suggested_questions < 0 then raise exception 'Quantidade de questões inválida.'; end if;

    saved_item_id := null;
    if item_input.id is not null then
      if item_input.id = any(submitted_ids) then raise exception 'Item repetido na meta.'; end if;
      submitted_ids := array_append(submitted_ids, item_input.id);
      select * into previous_item from public.goal_items
        where id = item_input.id and goal_id = saved_goal_id and archived_at is null for update;
      if not found then raise exception 'Item não pertence à versão atual desta meta.'; end if;
      if previous_item.subject_id = item_input.subject_id
        and previous_item.topic_id is not distinct from item_input.topic_id
        and previous_item.subtopic_id is not distinct from item_input.subtopic_id then
        saved_item_id := previous_item.id;
      end if;
    end if;

    if saved_item_id is null then
      insert into public.goal_items(goal_id, subject_id, topic_id, subtopic_id, instructions, suggested_questions, position)
      values (saved_goal_id, item_input.subject_id, item_input.topic_id, item_input.subtopic_id,
        nullif(trim(item_input.instructions), ''), item_input.suggested_questions, item_position)
      returning id into saved_item_id;
    else
      update public.goal_items set instructions = nullif(trim(item_input.instructions), ''),
        suggested_questions = item_input.suggested_questions, position = item_position
        where id = saved_item_id;
    end if;
    retained_ids := array_append(retained_ids, saved_item_id);
    item_position := item_position + 1;

    delete from public.goal_item_materials where goal_item_id = saved_item_id;
    material_position := 0;
    for material_json in select value from jsonb_array_elements(item_json->'material_ids') loop
      linked_material_id := (material_json #>> '{}')::uuid;
      if not exists (select 1 from public.materials where id = linked_material_id
        and (course_id = requested_course_id or course_id is null)) then
        raise exception 'O material não pertence a este curso.';
      end if;
      if not exists (select 1 from public.goal_item_materials
        where goal_item_id = saved_item_id and material_id = linked_material_id) then
        insert into public.goal_item_materials(goal_item_id, material_id, position)
          values(saved_item_id, linked_material_id, material_position);
        material_position := material_position + 1;
      end if;
    end loop;
  end loop;

  update public.goal_items set archived_at = now()
    where goal_id = saved_goal_id and archived_at is null and not (id = any(retained_ids));
  if requested_goal ? 'target_groups' then
    if jsonb_typeof(requested_goal->'target_groups') is distinct from 'array' then raise exception 'Grupos inválidos.'; end if;
    update public.goals set target_groups=array(select distinct value::smallint from jsonb_array_elements_text(requested_goal->'target_groups')) where id=saved_goal_id;
  end if;
  return saved_goal_id;
end;
$$;


create function public.admin_find_student_by_email(requested_email text) returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare found_id uuid;
begin
 if not public.is_admin() then raise exception 'Somente administradores.'; end if;
 select u.id into found_id from auth.users u join public.profiles p on p.id=u.id
 where lower(trim(u.email))=lower(trim(requested_email)) and p.role='student';
 if found_id is null then raise exception 'Aluno não encontrado.'; end if;
 return found_id;
end; $$;
revoke all on function public.admin_find_student_by_email(text) from public,anon,authenticated;
grant execute on function public.admin_find_student_by_email(text) to authenticated;

commit;
