-- A due_date is the release date. Goals remain readable, but students cannot
-- change progress before midnight in the application timezone.
begin;

alter policy student_goal_item_completions_insert_own_active_course
on public.student_goal_item_completions
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.goal_items i
    join public.goals g on g.id = i.goal_id
    where i.id = student_goal_item_completions.goal_item_id
      and i.archived_at is null
      and g.status = 'published'
      and (g.due_date is null or g.due_date <= (now() at time zone 'America/Fortaleza')::date)
      and public.has_active_enrollment(g.course_id)
  )
);

alter policy student_goal_item_completions_delete_own_active_course
on public.student_goal_item_completions
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.goal_items i
    join public.goals g on g.id = i.goal_id
    where i.id = student_goal_item_completions.goal_item_id
      and i.archived_at is null
      and g.status = 'published'
      and (g.due_date is null or g.due_date <= (now() at time zone 'America/Fortaleza')::date)
      and public.has_active_enrollment(g.course_id)
  )
);

commit;
