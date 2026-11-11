-- PDF individual de devolutiva, privado; aviso nasce somente ao publicar o arquivo.
-- Não altera notas, tentativas ou funções de nota geral.
-- Reversão sem apagar histórico: reverter o PR e revogar EXECUTE das duas RPCs
-- abaixo de authenticated; revogar SELECT na tabela e remover as duas políticas
-- essay_feedback_* de storage.objects. Manter tabela/bucket/arquivos para auditoria.
begin;
create table public.mini_quiz_essay_reports (
  essay_id uuid primary key references public.mini_quiz_essays(id),
  storage_path text not null unique,
  target_groups smallint[] not null,
  published_at timestamptz not null default now(),
  published_by uuid not null references public.profiles(id),
  viewed_at timestamptz,
  constraint essay_report_groups check (cardinality(target_groups) between 1 and 3
    and array_position(target_groups, null) is null and target_groups <@ array[1,2,3]::smallint[]),
  constraint essay_report_path check (storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.pdf$')
);
alter table public.mini_quiz_essay_reports enable row level security;
revoke all on public.mini_quiz_essay_reports from public, anon, authenticated;
grant select on public.mini_quiz_essay_reports to authenticated;
create policy essay_report_read on public.mini_quiz_essay_reports for select to authenticated
using ((select public.is_admin()) or exists (
  select 1 from public.mini_quiz_essays e where e.id = essay_id
    and e.user_id = (select auth.uid()) and e.status = 'graded'
    and e.course_id in (select public.active_course_ids())
    and public.student_group_allowed(e.course_id, target_groups)
));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('essay-feedback-reports','essay-feedback-reports',false,3145728,array['application/pdf'])
on conflict(id) do update set public=false, file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;
create policy essay_feedback_insert_admin on storage.objects for insert to authenticated
with check(bucket_id='essay-feedback-reports' and (select public.is_admin()));
-- Sem UPDATE/DELETE: cada publicação usa um caminho novo, preservando arquivos antigos.
create policy essay_feedback_read on storage.objects for select to authenticated
using(bucket_id='essay-feedback-reports' and ((select public.is_admin()) or exists (
  select 1 from public.mini_quiz_essay_reports r where r.storage_path = name
)));

create function public.admin_publish_essay_report(p_essay_id uuid, p_storage_path text,
  p_target_groups smallint[], p_expected_path text default null)
returns void language plpgsql security definer set search_path='' as $$
declare e public.mini_quiz_essays; previous_path text; object_metadata jsonb;
begin
  if not public.is_admin() then raise exception 'REPORT_NOT_ALLOWED'; end if;
  -- Serializa publicação e mudança da nota para a mesma redação.
  select * into e from public.mini_quiz_essays where id=p_essay_id for update;
  if not found or e.status <> 'graded' then raise exception 'REPORT_NOT_ALLOWED'; end if;
  if p_target_groups is null or cardinality(p_target_groups) not between 1 and 3
    or array_position(p_target_groups,null) is not null
    or not (p_target_groups <@ array[1,2,3]::smallint[]) then raise exception 'REPORT_GROUPS_INVALID'; end if;
  select storage_path into previous_path from public.mini_quiz_essay_reports where essay_id=e.id;
  if previous_path is distinct from p_expected_path then raise exception 'REPORT_CONFLICT'; end if;
  if p_storage_path is null or p_storage_path !~
    ('^' || e.course_id::text || '/' || e.id::text || '/[0-9a-f-]{36}\.pdf$') then
    raise exception 'REPORT_FILE_INVALID';
  end if;
  select metadata into object_metadata from storage.objects
    where bucket_id='essay-feedback-reports' and name=p_storage_path;
  if not found or object_metadata->>'mimetype' is distinct from 'application/pdf'
    or coalesce((object_metadata->>'size')::bigint,0) not between 5 and 3145728 then
    raise exception 'REPORT_FILE_INVALID';
  end if;
  -- Repetir uma requisição não pode recriar o aviso para o mesmo arquivo.
  if previous_path = p_storage_path then return; end if;
  insert into public.mini_quiz_essay_reports(essay_id,storage_path,target_groups,published_by)
    values(e.id,p_storage_path,p_target_groups,auth.uid())
  on conflict(essay_id) do update set storage_path=excluded.storage_path,
    target_groups=excluded.target_groups, published_at=clock_timestamp(),
    published_by=excluded.published_by, viewed_at=null;
end;
$$;
create function public.student_view_essay_report(p_essay_id uuid,p_storage_path text)
returns void language plpgsql security definer set search_path='' as $$
begin
  update public.mini_quiz_essay_reports r set viewed_at=coalesce(r.viewed_at,clock_timestamp())
  from public.mini_quiz_essays e where e.id=r.essay_id and r.essay_id=p_essay_id
    and r.storage_path=p_storage_path and e.user_id=auth.uid() and e.status='graded'
    and e.course_id in (select public.active_course_ids())
    and public.student_group_allowed(e.course_id,r.target_groups);
end;
$$;
revoke all on function public.admin_publish_essay_report(uuid,text,smallint[],text) from public,anon;
revoke all on function public.student_view_essay_report(uuid,text) from public,anon;
grant execute on function public.admin_publish_essay_report(uuid,text,smallint[],text) to authenticated;
grant execute on function public.student_view_essay_report(uuid,text) to authenticated;
commit;
