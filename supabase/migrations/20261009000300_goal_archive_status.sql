begin;
alter table public.goals drop constraint goals_status_check;
alter table public.goals add constraint goals_status_check
  check (status in ('draft', 'published', 'archived'));
commit;
