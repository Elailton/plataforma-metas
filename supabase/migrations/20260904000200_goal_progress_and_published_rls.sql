-- Additive: preserve item identities and completions, enforce publication in RLS.
begin;

alter table public.goal_items add column archived_at timestamptz;
create index goal_items_current_goal_idx on public.goal_items(goal_id, position)
  where archived_at is null;

-- Fail closed if an older deployment still attempts delete/recreate on save.
-- Explicit deletion of a goal with student history must not cascade away history.
alter table public.student_goal_item_completions
  drop constraint student_goal_item_completions_goal_item_id_fkey;
alter table public.student_goal_item_completions
  add constraint student_goal_item_completions_goal_item_id_fkey
  foreign key (goal_item_id) references public.goal_items(id) on delete restrict;

create or replace function public.has_active_enrollment(requested_course_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.enrollments e
    join public.courses c on c.id = e.course_id
    where e.user_id = auth.uid() and e.course_id = requested_course_id
      and e.status = 'active' and c.status = 'published'
  ) and not exists (
    select 1 from public.course_access_blocks
    where user_id = auth.uid() and course_id = requested_course_id
      and released_at is null
  );
$$;

alter policy goals_select_enrolled_or_admin on public.goals
using (public.is_admin() or (status = 'published' and public.has_active_enrollment(course_id)));

alter policy goal_items_select_enrolled_or_admin on public.goal_items
using (public.is_admin() or (
  archived_at is null and exists (
    select 1 from public.goals g where g.id = goal_items.goal_id
      and g.status = 'published' and public.has_active_enrollment(g.course_id)
  )
));

alter policy goal_item_materials_select_enrolled_or_admin on public.goal_item_materials
using (public.is_admin() or exists (
  select 1 from public.goal_items i join public.goals g on g.id = i.goal_id
  where i.id = goal_item_materials.goal_item_id and i.archived_at is null
    and g.status = 'published' and public.has_active_enrollment(g.course_id)
));

-- One transaction for title, items and links. Existing item IDs are retained.
-- Removing an item or changing its subject/topic archives its original identity;
-- completions are never transferred to a different topic or deleted.
create function public.admin_save_goal(
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
      select 1 from public.syllabus_topics where id = item_input.topic_id and subject_id = item_input.subject_id
    ) then raise exception 'O tópico não pertence à disciplina.'; end if;
    if item_input.suggested_questions < 0 then raise exception 'Quantidade de questões inválida.'; end if;

    saved_item_id := null;
    if item_input.id is not null then
      if item_input.id = any(submitted_ids) then raise exception 'Item repetido na meta.'; end if;
      submitted_ids := array_append(submitted_ids, item_input.id);
      select * into previous_item from public.goal_items
        where id = item_input.id and goal_id = saved_goal_id and archived_at is null for update;
      if not found then raise exception 'Item não pertence à versão atual desta meta.'; end if;
      if previous_item.subject_id = item_input.subject_id
        and previous_item.topic_id is not distinct from item_input.topic_id then
        saved_item_id := previous_item.id;
      end if;
    end if;

    if saved_item_id is null then
      insert into public.goal_items(goal_id, subject_id, topic_id, instructions, suggested_questions, position)
      values (saved_goal_id, item_input.subject_id, item_input.topic_id, nullif(trim(item_input.instructions), ''),
        item_input.suggested_questions, item_position) returning id into saved_item_id;
    else
      update public.goal_items set instructions = nullif(trim(item_input.instructions), ''),
        suggested_questions = item_input.suggested_questions, position = item_position
        where id = saved_item_id;
    end if;
    retained_ids := array_append(retained_ids, saved_item_id);
    item_position := item_position + 1;

    -- Links contain no progress and are replaced only within this transaction.
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
  return saved_goal_id;
end;
$$;

revoke all on function public.admin_save_goal(uuid, uuid, jsonb, jsonb, timestamptz)
  from public, anon, authenticated;
grant execute on function public.admin_save_goal(uuid, uuid, jsonb, jsonb, timestamptz) to authenticated;
commit;
