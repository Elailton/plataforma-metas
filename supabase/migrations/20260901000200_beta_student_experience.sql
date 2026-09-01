-- Real student experience for the beta.
-- This migration is additive: it preserves Auth users, profiles, enrollments
-- and all existing mentoring data.

alter table public.enrollments
  drop constraint if exists enrollments_source_check;

alter table public.enrollments
  add constraint enrollments_source_check
  check (source in ('hotmart', 'manual'));

create table if not exists public.student_goal_item_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  goal_item_id uuid not null references public.goal_items(id) on delete cascade,
  completed_at timestamptz not null default timezone('utc', now()),
  constraint student_goal_item_completions_user_item_key unique (user_id, goal_item_id)
);

create index if not exists student_goal_item_completions_user_idx
  on public.student_goal_item_completions (user_id, completed_at desc);
create index if not exists student_goal_item_completions_item_idx
  on public.student_goal_item_completions (goal_item_id);

alter table public.student_goal_item_completions enable row level security;

drop policy if exists student_goal_item_completions_select_own_or_admin
  on public.student_goal_item_completions;
create policy student_goal_item_completions_select_own_or_admin
on public.student_goal_item_completions for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists student_goal_item_completions_insert_own_active_course
  on public.student_goal_item_completions;
create policy student_goal_item_completions_insert_own_active_course
on public.student_goal_item_completions for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.goal_items
    join public.goals on goals.id = goal_items.goal_id
    join public.enrollments
      on enrollments.course_id = goals.course_id
      and enrollments.user_id = auth.uid()
      and enrollments.status = 'active'
    where goal_items.id = student_goal_item_completions.goal_item_id
      and goals.status = 'published'
  )
);

drop policy if exists student_goal_item_completions_delete_own_active_course
  on public.student_goal_item_completions;
create policy student_goal_item_completions_delete_own_active_course
on public.student_goal_item_completions for delete
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.goal_items
    join public.goals on goals.id = goal_items.goal_id
    join public.enrollments
      on enrollments.course_id = goals.course_id
      and enrollments.user_id = auth.uid()
      and enrollments.status = 'active'
    where goal_items.id = student_goal_item_completions.goal_item_id
      and goals.status = 'published'
  )
);

drop policy if exists student_goal_item_completions_admin_all
  on public.student_goal_item_completions;
create policy student_goal_item_completions_admin_all
on public.student_goal_item_completions for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select, insert, delete on public.student_goal_item_completions to authenticated;
grant all on public.student_goal_item_completions to service_role;

-- Temporary/manual enrollment is needed while the beta is not connected to
-- the merchant account. It can only attach an existing student account to an
-- existing course and can never promote or enroll an administrator.
create or replace function public.admin_enroll_existing_student(
  requested_email text,
  requested_course_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_user_id uuid;
  enrollment_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Only administrators can manage enrollments';
  end if;

  select users.id
  into requested_user_id
  from auth.users as users
  where lower(users.email) = lower(trim(requested_email))
  order by users.created_at
  limit 1;

  if requested_user_id is null then
    raise exception 'Student account not found';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = requested_user_id
      and role = 'student'
  ) then
    raise exception 'Only student accounts can be enrolled';
  end if;

  if not exists (select 1 from public.courses where id = requested_course_id) then
    raise exception 'Course not found';
  end if;

  insert into public.enrollments (user_id, course_id, status, source)
  values (requested_user_id, requested_course_id, 'active', 'manual')
  on conflict (user_id, course_id) do update
  set
    status = 'active',
    updated_at = timezone('utc', now())
  returning id into enrollment_id;

  return enrollment_id;
end;
$$;

revoke all on function public.admin_enroll_existing_student(text, uuid)
  from public, anon;
grant execute on function public.admin_enroll_existing_student(text, uuid)
  to authenticated;
