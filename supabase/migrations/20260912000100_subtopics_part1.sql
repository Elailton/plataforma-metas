-- Part 1: Add columns, constraints and indexes for subtopics support
begin;

alter table public.syllabus_topics
  add column if not exists parent_topic_id uuid;

alter table public.syllabus_topics
  add column if not exists position integer not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'syllabus_topics_parent_topic_id_fkey'
      and conrelid = 'public.syllabus_topics'::regclass
  ) then
    alter table public.syllabus_topics
      add constraint syllabus_topics_parent_topic_id_fkey
      foreign key (parent_topic_id) references public.syllabus_topics(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'syllabus_topics_no_self_parent'
      and conrelid = 'public.syllabus_topics'::regclass
  ) then
    alter table public.syllabus_topics
      add constraint syllabus_topics_no_self_parent
      check (parent_topic_id is null or parent_topic_id <> id);
  end if;
end
$$;

create index if not exists syllabus_topics_parent_position_idx
  on public.syllabus_topics(subject_id, parent_topic_id, position);

alter table public.goal_items
  add column if not exists subtopic_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'goal_items_subtopic_id_fkey'
      and conrelid = 'public.goal_items'::regclass
  ) then
    alter table public.goal_items
      add constraint goal_items_subtopic_id_fkey
      foreign key (subtopic_id) references public.syllabus_topics(id) on delete set null;
  end if;
end
$$;

create index if not exists goal_items_subtopic_idx
  on public.goal_items(subtopic_id)
  where subtopic_id is not null;

commit;
