-- PDFs guardados na própria plataforma (ex.: mini-simulados), sem link público.
--
-- O arquivo fica no bucket privado "materiais", no caminho <course_id>/<material_id>.pdf.
-- O aluno nunca recebe o caminho: abre /api/materiais/<id>, que confere a sessão e
-- gera uma URL assinada de curta duração com o próprio token do aluno.
--
-- Quem pode ler o objeto é decidido pela RLS de public.materials (curso com acesso
-- efetivo: matrícula ativa, curso publicado e sem bloqueio). Somente administradores
-- enviam, substituem ou removem arquivos. service_role continua com bypass.
begin;

alter table public.materials add column if not exists storage_path text;

alter table public.materials drop constraint if exists materials_storage_path_check;
alter table public.materials add constraint materials_storage_path_check check (
  storage_path is null
  or (
    storage_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$'
    and course_id is not null
    and split_part(storage_path, '/', 1) = course_id::text
  )
);

create unique index if not exists materials_storage_path_key on public.materials (storage_path) where storage_path is not null;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('materiais', 'materiais', false, 26214400, array['application/pdf'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists materiais_objects_select on storage.objects;
create policy materiais_objects_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'materiais'
    and (
      (select public.is_admin())
      -- A subconsulta respeita a RLS de materials: só enxerga materiais de cursos com acesso efetivo.
      or exists (select 1 from public.materials m where m.storage_path = storage.objects.name)
    )
  );

drop policy if exists materiais_objects_admin_insert on storage.objects;
create policy materiais_objects_admin_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'materiais' and (select public.is_admin()));

drop policy if exists materiais_objects_admin_update on storage.objects;
create policy materiais_objects_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'materiais' and (select public.is_admin()))
  with check (bucket_id = 'materiais' and (select public.is_admin()));

drop policy if exists materiais_objects_admin_delete on storage.objects;
create policy materiais_objects_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'materiais' and (select public.is_admin()));

commit;
