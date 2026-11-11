import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { PGlite } from "@electric-sql/pglite"
import { fixture, migrations, applyMigration, asRole } from "./helpers/database.mjs"
import { REPORT_MAX_BYTES, validReportPdf, reportPath } from "../lib/mini-quizzes/essay-report.mjs"

const id = n => `00000000-0000-4000-8000-${String(n).padStart(12,"0")}`
const A=id(1), S=id(2), O=id(3), C=id(10), E=id(20), Q=id(30), T=id(40)
const path=reportPath(C,E,id(50)), nextPath=reportPath(C,E,id(51))
const sqlFile=async name => readFile(new URL(`../supabase/migrations/${name}`,import.meta.url),"utf8")

test("PDF: limite, MIME, assinatura e caminho sem nome pessoal",()=>{
 assert.ok(validReportPdf("application/pdf",100,"%PDF-"))
 assert.equal(validReportPdf("text/html",100,"%PDF-"),false)
 assert.equal(validReportPdf("application/pdf",100,"<html"),false)
 assert.equal(validReportPdf("application/pdf",REPORT_MAX_BYTES+1,"%PDF-"),false)
 assert.equal(reportPath(C,E,"../private"),null)
})

test("SQL real: publicação, isolamento, acesso revogado, aviso e concorrência",async()=>{
 const db=new PGlite()
 try {
  await db.exec(fixture)
  for(const migration of migrations) await applyMigration(db,migration)
  await applyMigration(db,"20261009000100_course_groups.sql")
  await db.exec(`alter table enrollments drop constraint enrollments_study_group_check;
   alter table enrollments add column mirror_group smallint not null default 1;
   create schema storage;
   create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
   create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,metadata jsonb,unique(bucket_id,name));
   alter table storage.objects enable row level security;
   grant usage on schema storage to anon,authenticated;
   grant select,insert on storage.objects to authenticated;
   create function storage.foldername(text) returns text[] language sql as $$ select string_to_array($1,'/') $$;
   create table mini_quizzes(id uuid primary key,essay_prompt text,title text default 'Simulado Geral 01');
   create table mini_quiz_attempts(id uuid primary key,quiz_id uuid references mini_quizzes(id),course_id uuid references courses(id),user_id uuid references profiles(id),submitted_at timestamptz,correct_count integer default 52,total_count integer default 60);
  `)
  // Funções de acesso reais: sem substituir por permissões simuladas.
  for(const [file,names] of [
   ["20261010000100_rls_performance.sql",["active_course_ids"]],
   ["20261022000100_test_group_and_group_settings.sql",["student_goal_scopes","student_group_allowed"]],
  ]){
   const sql=await sqlFile(file)
   for(const name of names){
    const start=sql.indexOf(`create or replace function public.${name}(`)
    const end=sql.indexOf("$$;",start)+3
    assert.ok(start>=0 && end>start)
    await db.exec(sql.slice(start,end))
   }
  }
  await applyMigration(db,"20261108000100_simulado_redacao.sql")
  await applyMigration(db,"20261111000200_essay_feedback_reports.sql")
  await applyMigration(db,"20261111000300_essay_report_test_copies.sql")
  await db.exec(`insert into auth.users(id,email) values('${A}','admin@example.com'),('${S}','student@example.com'),('${O}','other@example.com');
   update profiles set role='admin' where id='${A}';
   insert into courses(id,name,status,groups_enabled) values('${C}','Curso','published',true);
   insert into enrollments(user_id,course_id,status,study_group) values('${S}','${C}','active',1),('${O}','${C}','active',1);
   insert into mini_quizzes(id,essay_prompt) values('${Q}','Tema');
   insert into mini_quiz_attempts(id,quiz_id,course_id,user_id,submitted_at) values('${T}','${Q}','${C}','${S}',now());
   insert into mini_quiz_essays(id,attempt_id,quiz_id,course_id,user_id,body,status) values('${E}','${T}','${Q}','${C}','${S}','Texto','graded');`)
  const admin=op=>asRole(db,A,"authenticated",op)
  const student=op=>asRole(db,S,"authenticated",op)
  const other=op=>asRole(db,O,"authenticated",op)
  const publish=(p,expected=null,groups=[1])=>db.query("select admin_publish_essay_report($1,$2,$3::smallint[],$4)",[E,p,groups,expected])
  const upload=p=>db.query("insert into storage.objects(bucket_id,name,metadata) values('essay-feedback-reports',$1,$2)",[p,{mimetype:"application/pdf",size:100}])
  const list=()=>db.query("select * from mini_quiz_essay_reports")
  const files=()=>db.query("select name from storage.objects where bucket_id='essay-feedback-reports'")
  await assert.rejects(student(()=>upload(path)),/row-level security/)
  await admin(()=>upload(path))
  await assert.rejects(student(()=>publish(path)),/REPORT_NOT_ALLOWED/)
  await assert.rejects(admin(()=>publish(nextPath)),/REPORT_FILE_INVALID/)
  await assert.rejects(admin(()=>publish(path,null,[null])),/REPORT_GROUPS_INVALID/)
  await admin(()=>publish(path))
  assert.equal((await student(list)).rows.length,1)
  assert.equal((await student(files)).rows.length,1)
  assert.equal((await other(list)).rows.length,0)
  assert.equal((await other(files)).rows.length,0)
  await assert.rejects(asRole(db,null,"anon",list),/permission denied/)
  await assert.rejects(student(()=>db.query("update mini_quiz_essay_reports set viewed_at=now()")),/permission denied/)
  await other(()=>db.query("select student_view_essay_report($1,$2)",[E,path]))
  assert.equal((await student(list)).rows[0].viewed_at,null)
  await student(()=>db.query("select student_view_essay_report($1,$2)",[E,path]))
  assert.ok((await student(list)).rows[0].viewed_at)
  await admin(()=>publish(path,path)) // idempotência não renova aviso
  assert.ok((await student(list)).rows[0].viewed_at)
  for(const [change,restore] of [
   [`update enrollments set status='suspended' where user_id='${S}'`,`update enrollments set status='active' where user_id='${S}'`],
   [`update courses set status='draft' where id='${C}'`,`update courses set status='published' where id='${C}'`],
   [`update enrollments set study_group=2 where user_id='${S}'`,`update enrollments set study_group=1 where user_id='${S}'`],
   [`insert into course_access_blocks(user_id,course_id,reason,blocked_by) values('${S}','${C}','Teste','${A}')`,`update course_access_blocks set released_at=now(),released_by='${A}',release_reason='Teste concluído'`],
   [`update mini_quiz_essays set status='pending' where id='${E}'`,`update mini_quiz_essays set status='graded' where id='${E}'`],
  ]){
   await db.exec(change)
   assert.equal((await student(list)).rows.length,0,change)
   assert.equal((await student(files)).rows.length,0,change)
   await db.exec(restore)
  }
  await admin(()=>upload(nextPath))
  await assert.rejects(admin(()=>publish(nextPath)),/REPORT_CONFLICT/)
  await admin(()=>publish(nextPath,path))
  assert.equal((await student(list)).rows[0].viewed_at,null)
  // Uma aba antiga não marca como lida a devolutiva recém-publicada.
  await student(()=>db.query("select student_view_essay_report($1,$2)",[E,path]))
  assert.equal((await student(list)).rows[0].viewed_at,null)
  assert.deepEqual((await student(files)).rows.map(r=>r.name),[nextPath])
  assert.equal((await admin(files)).rows.length,2) // histórico preservado

  // Cópias são uma entrega separada, sem tentativas ou notas artificiais.
  const P=id(4),P2=id(5)
  await db.exec(`insert into auth.users(id,email) values('${P}','preview@example.com'),('${P2}','preview2@example.com');
    insert into enrollments(user_id,course_id,status,study_group) values('${P}','${C}','active',3),('${P2}','${C}','active',3);`)
  const preview=op=>asRole(db,P,"authenticated",op)
  const preview2=op=>asRole(db,P2,"authenticated",op)
  const copies=async()=> (await db.query("select student_essay_report_test_copies($1) as items",[C])).rows[0].items
  assert.equal((await preview(copies)).length,0)
  await assert.rejects(student(()=>db.query("select admin_set_essay_report_test_recipient($1)",[P])),/REPORT_NOT_ALLOWED/)
  await assert.rejects(admin(()=>db.query("select admin_set_essay_report_test_recipient($1)",[O])),/REPORT_TEST_RECIPIENT_INVALID/)
  await admin(()=>db.query("select admin_set_essay_report_test_recipient($1)",[P]))
  await admin(()=>db.query("select admin_grade_mini_quiz_essay($1,'graded',array[6,8,7,6],'Comentário pedagógico')",[E]))
  let delivered=await preview(copies)
  assert.equal(delivered.length,1)
  const copyId=delivered[0].essay.id
  assert.notEqual(copyId,E)
  assert.equal(delivered[0].essay.isTestCopy,true)
  assert.equal(delivered[0].essay.score_total,27)
  assert.equal(delivered[0].essay.feedback,"Comentário pedagógico")
  assert.equal(delivered[0].essay.body,null)
  assert.deepEqual(delivered[0].essay.image_paths,[])
  assert.equal(delivered[0].essay.attempt.correct_count,52)
  assert.equal(delivered[0].report.viewed_at,null)
  assert.equal((await preview(()=>db.query("select * from mini_quiz_essays"))).rows.length,0)
  assert.equal((await preview(copies)).length,1)
  assert.equal((await preview2(copies)).length,0) // Grupo 3 por si só não basta.
  assert.equal((await preview2(files)).rows.length,0)
  assert.equal((await other(copies)).length,0)
  await student(()=>db.query("select student_view_essay_report_test_copy($1,$2)",[copyId,nextPath]))
  assert.equal((await preview(copies))[0].report.viewed_at,null)
  await preview(()=>db.query("select student_view_essay_report_test_copy($1,$2)",[copyId,nextPath]))
  assert.ok((await preview(copies))[0].report.viewed_at)
  assert.equal((await student(list)).rows[0].viewed_at,null) // Não consome aviso da aluna.
  for(const [change,restore] of [
    [`update enrollments set study_group=1 where user_id='${P}'`,`update enrollments set study_group=3 where user_id='${P}'`],
    [`update enrollments set status='suspended' where user_id='${P}'`,`update enrollments set status='active' where user_id='${P}'`],
    [`update mini_quiz_essays set status='pending' where id='${E}'`,`update mini_quiz_essays set status='graded' where id='${E}'`],
    [`update courses set status='draft' where id='${C}'`,`update courses set status='published' where id='${C}'`],
    [`insert into course_access_blocks(user_id,course_id,reason,blocked_by) values('${P}','${C}','Teste','${A}')`,
     `update course_access_blocks set released_at=now(),released_by='${A}',release_reason='Teste concluído' where user_id='${P}'`],
  ]){
    await db.exec(change)
    assert.equal((await preview(copies)).length,0,change)
    assert.equal((await preview(files)).rows.length,0,change)
    await db.exec(restore)
  }
  const newPath=reportPath(C,E,id(52))
  await admin(()=>upload(newPath))
  await admin(()=>publish(newPath,nextPath))
  delivered=await preview(copies)
  assert.equal(delivered[0].essay.id,copyId) // Identidade estável.
  assert.equal(delivered[0].report.viewed_at,null)
  await preview(()=>db.query("select student_view_essay_report_test_copy($1,$2)",[copyId,nextPath]))
  assert.equal((await preview(copies))[0].report.viewed_at,null) // Aba antiga não consome nova versão.
  await assert.rejects(preview(()=>db.query("select sync_essay_report_test_copy($1)",[E])),/permission denied/)
  await admin(()=>db.query("select admin_set_essay_report_test_recipient($1)",[P2]))
  assert.equal((await preview(copies)).length,0)
  assert.equal((await preview(files)).rows.length,0)
  assert.equal((await preview2(copies)).length,1)
  // Outra publicação é entregue automaticamente, sem chamar configuração de novo.
  const E2=id(21),T2=id(41),path2=reportPath(C,E2,id(53))
  await db.exec(`insert into mini_quiz_attempts(id,quiz_id,course_id,user_id,submitted_at) values('${T2}','${Q}','${C}','${O}',now());
    insert into mini_quiz_essays(id,attempt_id,quiz_id,course_id,user_id,body,status) values('${E2}','${T2}','${Q}','${C}','${O}','Outro texto','graded');`)
  await admin(()=>upload(path2))
  await admin(()=>db.query("select admin_publish_essay_report($1,$2,array[1]::smallint[],null)",[E2,path2]))
  assert.equal((await preview2(copies)).length,2)
  assert.equal((await db.query("select count(*)::integer as n from mini_quiz_attempts")).rows[0].n,2)
  assert.equal((await db.query("select count(*)::integer as n from mini_quiz_essays")).rows[0].n,2)
 } finally {await db.close()}
})
