-- Entrega de conferência para a conta de teste explicitamente configurada pelo admin.
-- Sem tentativas/respostas/notas sintéticas; sem ampliar SELECT das redações originais.
-- Reversão: reverter o PR; primeiro remover a política essay_feedback_test_read,
-- depois revogar EXECUTE das RPCs novas de authenticated e remover os triggers novos.
-- Preservar tabelas e entregas para auditoria.
begin;
create table public.essay_report_test_recipient (
  singleton boolean primary key default true check(singleton),
  user_id uuid not null unique references public.profiles(id)
);
alter table public.essay_report_test_recipient enable row level security;
revoke all on public.essay_report_test_recipient from public,anon,authenticated;
grant select on public.essay_report_test_recipient to authenticated;
create policy essay_report_recipient_admin on public.essay_report_test_recipient
for select to authenticated using((select public.is_admin()));

create table public.mini_quiz_essay_report_test_copies (
  id uuid primary key default gen_random_uuid(),
  source_essay_id uuid not null unique references public.mini_quiz_essay_reports(essay_id),
  viewer_id uuid not null references public.profiles(id),
  course_id uuid not null references public.courses(id),
  storage_path text not null,
  published_at timestamptz not null,
  viewed_at timestamptz
);
create index essay_report_test_viewer_idx on public.mini_quiz_essay_report_test_copies(viewer_id,course_id);
alter table public.mini_quiz_essay_report_test_copies enable row level security;
revoke all on public.mini_quiz_essay_report_test_copies from public,anon,authenticated;
grant select on public.mini_quiz_essay_report_test_copies to authenticated;

create function public.is_essay_report_test_viewer(p_course_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists (
   select 1 from public.essay_report_test_recipient r
   join public.profiles p on p.id=r.user_id and p.role='student'
   join public.enrollments en on en.user_id=r.user_id and en.course_id=p_course_id
   where r.user_id=auth.uid() and en.study_group=3 and en.status='active'
     and en.course_id in (select public.active_course_ids())
 );
$$;
create policy essay_report_test_copy_read on public.mini_quiz_essay_report_test_copies
for select to authenticated using((select public.is_admin()) or
 (viewer_id=(select auth.uid()) and public.is_essay_report_test_viewer(course_id)));

-- Uma cópia só autoriza o arquivo atual da redação corrigida no mesmo curso.
create function public.can_read_essay_report_test_file(p_path text)
returns boolean language sql stable security definer set search_path='' as $$
 select exists (
   select 1 from public.mini_quiz_essay_report_test_copies c
   join public.mini_quiz_essay_reports r on r.essay_id=c.source_essay_id and r.storage_path=c.storage_path
   join public.mini_quiz_essays e on e.id=r.essay_id and e.course_id=c.course_id
   where c.viewer_id=auth.uid() and c.storage_path=p_path and e.status='graded'
     and e.user_id<>auth.uid() and public.is_essay_report_test_viewer(c.course_id)
 );
$$;
create policy essay_feedback_test_read on storage.objects for select to authenticated
using(bucket_id='essay-feedback-reports' and public.can_read_essay_report_test_file(name));

-- Executada somente por triggers. Não disponível como RPC para alunos.
create function public.sync_essay_report_test_copy(p_essay_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare recipient uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended('essay_report_test_recipient',0));
 select user_id into recipient from public.essay_report_test_recipient where singleton;
 if recipient is null then return; end if;
 insert into public.mini_quiz_essay_report_test_copies(source_essay_id,viewer_id,course_id,storage_path,published_at)
 select e.id,recipient,e.course_id,r.storage_path,r.published_at
 from public.mini_quiz_essays e join public.mini_quiz_essay_reports r on r.essay_id=e.id
 where e.id=p_essay_id and e.user_id<>recipient
 on conflict(source_essay_id) do update set
   viewer_id=excluded.viewer_id,course_id=excluded.course_id,
   storage_path=excluded.storage_path,published_at=excluded.published_at,
   viewed_at=case when mini_quiz_essay_report_test_copies.viewer_id=excluded.viewer_id
     and mini_quiz_essay_report_test_copies.storage_path=excluded.storage_path
     then mini_quiz_essay_report_test_copies.viewed_at else null end;
end;
$$;
create function public.trigger_sync_essay_report_test_copy()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform public.sync_essay_report_test_copy(new.essay_id);
 return new;
end;
$$;
create trigger essay_report_copy_after_publish
 after insert or update of storage_path,target_groups on public.mini_quiz_essay_reports
 for each row execute function public.trigger_sync_essay_report_test_copy();

create function public.admin_set_essay_report_test_recipient(p_user_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare report_id uuid;
begin
 if not public.is_admin() then raise exception 'REPORT_NOT_ALLOWED'; end if;
 if not exists (select 1 from public.profiles p join public.enrollments en on en.user_id=p.id
   where p.id=p_user_id and p.role='student' and en.study_group=3 and en.status='active') then
   raise exception 'REPORT_TEST_RECIPIENT_INVALID';
 end if;
 perform pg_advisory_xact_lock(hashtextextended('essay_report_test_recipient',0));
 insert into public.essay_report_test_recipient(singleton,user_id) values(true,p_user_id)
 on conflict(singleton) do update set user_id=excluded.user_id;
 for report_id in select essay_id from public.mini_quiz_essay_reports loop
   perform public.sync_essay_report_test_copy(report_id);
 end loop;
end;
$$;

-- Expõe somente a devolutiva, sem fotos, texto original, nome ou identificação do autor.
create function public.student_essay_report_test_copies(p_course_id uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object(
   'essay',jsonb_build_object('id',c.id,'attempt_id',c.id,'quiz_id',e.quiz_id,
     'status',e.status,'submitted_at',e.submitted_at,'body',null,'image_paths','[]'::jsonb,
     'scores',e.scores,'score_total',e.score_total,'feedback',e.feedback,'graded_at',e.graded_at,
     'quizTitle',q.title,'isTestCopy',true,
     'attempt',jsonb_build_object('correct_count',a.correct_count,'total_count',a.total_count)),
   'report',jsonb_build_object('essay_id',c.id,'storage_path',c.storage_path,
     'published_at',c.published_at,'viewed_at',c.viewed_at)
 ) order by c.published_at desc),'[]'::jsonb)
 from public.mini_quiz_essay_report_test_copies c
 join public.mini_quiz_essay_reports r on r.essay_id=c.source_essay_id and r.storage_path=c.storage_path
 join public.mini_quiz_essays e on e.id=r.essay_id and e.course_id=c.course_id
 join public.mini_quizzes q on q.id=e.quiz_id
 join public.mini_quiz_attempts a on a.id=e.attempt_id
 where c.viewer_id=auth.uid() and c.course_id=p_course_id and e.user_id<>auth.uid()
   and e.status='graded' and public.is_essay_report_test_viewer(p_course_id);
$$;
create function public.student_view_essay_report_test_copy(p_copy_id uuid,p_storage_path text)
returns void language plpgsql security definer set search_path='' as $$
begin
 update public.mini_quiz_essay_report_test_copies c set viewed_at=coalesce(c.viewed_at,clock_timestamp())
 from public.mini_quiz_essay_reports r,public.mini_quiz_essays e
 where c.id=p_copy_id and c.viewer_id=auth.uid() and c.storage_path=p_storage_path
   and r.essay_id=c.source_essay_id and r.storage_path=c.storage_path
   and e.id=r.essay_id and e.course_id=c.course_id and e.status='graded'
   and e.user_id<>auth.uid() and public.is_essay_report_test_viewer(c.course_id);
end;
$$;
revoke all on function public.sync_essay_report_test_copy(uuid) from public,anon,authenticated;
revoke all on function public.trigger_sync_essay_report_test_copy() from public,anon,authenticated;
revoke all on function public.is_essay_report_test_viewer(uuid) from public,anon;
revoke all on function public.can_read_essay_report_test_file(text) from public,anon;
revoke all on function public.admin_set_essay_report_test_recipient(uuid) from public,anon;
revoke all on function public.student_essay_report_test_copies(uuid) from public,anon;
revoke all on function public.student_view_essay_report_test_copy(uuid,text) from public,anon;
grant execute on function public.is_essay_report_test_viewer(uuid) to authenticated;
grant execute on function public.can_read_essay_report_test_file(text) to authenticated;
grant execute on function public.admin_set_essay_report_test_recipient(uuid) to authenticated;
grant execute on function public.student_essay_report_test_copies(uuid) to authenticated;
grant execute on function public.student_view_essay_report_test_copy(uuid,text) to authenticated;
commit;
