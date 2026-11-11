import test from "node:test"
import assert from "node:assert/strict"
import {PGlite} from "@electric-sql/pglite"
import {fixture,migrations,applyMigration,asRole} from "./helpers/database.mjs"
import {seedSql,USERS} from "./helpers/rls-scenario.mjs"
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,"0")}`
const C=id(100),Q=id(900),A=USERS.groupOne,B=id(30),D=id(31),OPT=id(32),T=id(33)

test("ranking final: soma, desempate, consentimento, grupos, escopo e privacidade",async()=>{
 const db=new PGlite()
 try{
  await db.exec(fixture)
  for(const f of migrations) await applyMigration(db,f)
  await db.exec("alter table courses add column updated_at timestamptz default now()")
  for(const f of ["20260912000100_goal_release_guard.sql","20261009000100_course_groups.sql","20261009000200_hotmart_offer_authorization.sql","20261010000100_rls_performance.sql","20261010000200_goal_group_rls_performance.sql"])await applyMigration(db,f)
  await db.exec(seedSql)
  for(const f of ["20261013000200_mini_quizzes.sql","20261021000100_mini_quiz_weekly_groups.sql","20261021000200_mini_quiz_timer_ranking.sql","20261022000100_test_group_and_group_settings.sql","20261106000100_simulado_mensal.sql"])await applyMigration(db,f)
  await db.exec(`create schema storage;
   create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
   create table storage.objects(bucket_id text,name text);
   create function storage.foldername(text) returns text[] language sql as $$select string_to_array($1,'/')$$;`)
  await applyMigration(db,"20261108000100_simulado_redacao.sql")
  await applyMigration(db,"20261111000100_nota_geral.sql")
  await applyMigration(db,"20261111000400_ranking_combined_essay.sql")
  await db.exec(`insert into auth.users(id,email) values('${B}','bruno@example.com'),('${D}','dora@example.com'),('${OPT}','opt@example.com'),('${T}','test@example.com');
   update profiles set full_name='Ana Exemplo' where id='${A}';
   insert into enrollments(user_id,course_id,status,study_group) values('${B}','${C}','active',1),('${D}','${C}','active',1),('${OPT}','${C}','active',1),('${T}','${C}','active',3);
   insert into mini_quizzes(id,course_id,subject_id,title,status,target_groups,kind,essay_prompt)
   values('${Q}','${C}',null,'Simulado Geral','published',array[1,2]::smallint[],'mensal','Proposta');`)
  const attempt=async(user,n,score,show,time)=>{
   const a=id(1000+n)
   await db.query(`insert into mini_quiz_attempts(id,user_id,quiz_id,course_id,attempt_number,is_first_of_month,month_start,correct_count,answered_count,total_count,duration_seconds,show_in_ranking)
     values($1,$2,$3,$4,1,true,current_date,$5,60,60,$6,$7)`,[a,user,Q,C,score,time,show])
   return a
  }
  const aa=await attempt(A,1,52,true,600),ab=await attempt(B,2,49,true,800),ad=await attempt(D,3,48,true,900),ao=await attempt(OPT,4,60,false,100),at=await attempt(T,5,60,true,100)
  for(const [a,u,total,status] of [[aa,A,27,'graded'],[ab,B,35,'graded'],[ad,D,null,'pending'],[ao,OPT,40,'graded'],[at,T,40,'graded']]){
   await db.query("insert into mini_quiz_essays(attempt_id,quiz_id,course_id,user_id,body,status,score_total,feedback) values($1,$2,$3,$4,'Texto privado',$5,$6,'Comentário privado')",[a,Q,C,u,status,total])
  }
  const rank=(user,limit=10)=>asRole(db,user,"authenticated",()=>db.query("select * from mini_quiz_ranking_final($1,$2)",[Q,limit])).then(r=>r.rows)
  // G1 começa sem a função, sem revelar redação por um parâmetro do navegador.
  let rows=await rank(A)
  assert.deepEqual(rows.map(r=>r.correct_count),[52,49,48])
  assert.ok(rows.every(r=>!r.combined_enabled && r.essay_score===null && r.final_score===null && r.essay_status===null))
  await db.query("update course_group_settings set disabled_features=array_remove(disabled_features,'ranking_nota_final') where course_id=$1 and study_group=1",[C])
  rows=await rank(A)
  assert.deepEqual(rows.map(r=>r.final_score),[84,79,48])
  assert.deepEqual(rows.map(r=>r.correct_count),[49,52,48])
  assert.equal(rows[1].essay_score,27);assert.equal(rows[1].final_max,100)
  assert.equal(rows[2].essay_status,'pending');assert.equal(rows[0].pending_count,1)
  assert.equal(rows[0].participants,3) // opt-out e teste não entram.
  assert.ok(rows.every(r=>!('feedback' in r) && !('user_id' in r) && !('body' in r)))
  const top=await rank(A,1)
  assert.deepEqual(top.map(r=>[r.rank,r.is_me]),[[1,false],[2,true]])
  assert.equal((await rank(T))[0].final_score,100) // conta de teste só aparece para si.
  assert.ok((await rank(USERS.groupTwo)).every(r=>!r.combined_enabled))
  // Correção posterior reorganiza a classificação na consulta seguinte, sem gravar ranking.
  await db.query("update mini_quiz_essays set status='graded',score_total=36 where attempt_id=$1",[ad])
  rows=await rank(A)
  assert.deepEqual(rows.map(r=>r.final_score),[84,84,79])
  assert.equal(rows[0].duration_seconds,800) // empate: menor tempo.
  assert.equal(rows[0].pending_count,0)
  await db.query("update mini_quizzes set kind='semanal' where id=$1",[Q])
  rows=await rank(A);assert.deepEqual(rows.map(r=>r.correct_count),[52,49,48]);assert.ok(rows.every(r=>!r.combined_enabled))
  await db.query("update mini_quizzes set kind='mensal',essay_prompt=null where id=$1",[Q])
  assert.ok((await rank(A)).every(r=>!r.combined_enabled))
  await assert.rejects(rank(USERS.blocked),/MINI_QUIZ_NOT_AVAILABLE/)
  await assert.rejects(rank(USERS.otherCourse),/MINI_QUIZ_NOT_AVAILABLE/)
  await assert.rejects(asRole(db,null,"anon",()=>db.query("select * from mini_quiz_ranking_final($1)",[Q])),/permission denied/)
 }finally{await db.close()}
})
