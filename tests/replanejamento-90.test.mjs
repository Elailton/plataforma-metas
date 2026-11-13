import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { PGlite } from '@electric-sql/pglite'

const id = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`
const course=id(1), other=id(2), subject=id(3), topic=id(4), material=id(5), goal=id(6), old=id(7), fresh=id(8)
function operation(){
 const before={id:goal,course_id:course,status:'published',kind:'regular',target_groups:[1],due_date:'2099-01-02',updated_at:'2026-01-01T00:00:00+00:00',title:'Meta 20',description:'Original'}
 const expected={id:old,subject_id:subject,topic_id:topic,subtopic_id:null,instructions:'Atividade original',suggested_questions:12,position:0,material_ids:[material]}
 return {before,expected_items:[expected],archive_ids:[],new_items:[{id:fresh,goal_id:goal,subject_id:subject,topic_id:topic,subtopic_id:null,instructions:"Texto com aspas: '); select 99; --",suggested_questions:8,position:1,archived_at:null,materials:[material]}],title:'Meta 20 – Plano completo',description:'Nova descrição'}
}
function compile(op){
 const r=spawnSync('python3',['ops/replanejamento-90/aplicar.py','--compile-stdin'],{input:JSON.stringify(op),encoding:'utf8'})
 assert.equal(r.status,0,r.stderr);return r.stdout
}
async function db(){
 const d=new PGlite();await d.exec(`
 create table courses(id uuid primary key,status text);insert into courses values('${course}','published'),('${other}','published');
 create table subjects(id uuid primary key,course_id uuid);insert into subjects values('${subject}','${course}');
 create table syllabus_topics(id uuid primary key,subject_id uuid,parent_topic_id uuid);insert into syllabus_topics values('${topic}','${subject}',null);
 create table materials(id uuid primary key,course_id uuid);insert into materials values('${material}','${course}');
 create table goals(id uuid primary key,course_id uuid,status text,kind text,target_groups smallint[],due_date date,updated_at timestamptz,title text,description text);
 insert into goals values('${goal}','${course}','published','regular','{1}','2099-01-02','2026-01-01','Meta 20','Original');
 create table goal_items(id uuid primary key,goal_id uuid references goals(id),subject_id uuid,topic_id uuid,subtopic_id uuid,instructions text,suggested_questions integer,position integer,archived_at timestamptz,created_at timestamptz default now());
 insert into goal_items(id,goal_id,subject_id,topic_id,instructions,suggested_questions,position) values('${old}','${goal}','${subject}','${topic}','Atividade original',12,0);
 create table goal_item_materials(goal_item_id uuid references goal_items(id),material_id uuid,position integer,primary key(goal_item_id,material_id));insert into goal_item_materials values('${old}','${material}',0);
 create table student_goal_item_completions(id uuid primary key,goal_item_id uuid references goal_items(id));
 `);return d
}

test('replanejamento: SQL real mantém a atividade e questões anteriores, acrescenta conteúdo e trata texto como dado',async()=>{
 const d=await db();try{await d.exec(compile(operation()));const rows=await d.query('select id,instructions,suggested_questions,archived_at from goal_items order by id');assert.equal(rows.rows.length,2);assert.equal(rows.rows[0].suggested_questions,12);assert.equal(rows.rows[0].archived_at,null);assert.equal(rows.rows[1].instructions,operation().new_items[0].instructions);assert.equal((await d.query('select title,due_date::text,target_groups from goals')).rows[0].due_date,'2099-01-02')}finally{await d.close()}
})

test('replanejamento: alteração de assunto arquiva identidade anterior sem apagar linha ou vínculo',async()=>{
 const d=await db();try{const op=operation();op.archive_ids=[old];await d.exec(compile(op));assert.equal((await d.query(`select count(*)::int n from goal_items where id='${old}' and archived_at is not null`)).rows[0].n,1);assert.equal((await d.query('select count(*)::int n from goal_item_materials')).rows[0].n,2)}finally{await d.close()}
})

for(const [label,mutate,expected] of [
 ['meta já liberada',async(d,op)=>{op.before.due_date='2000-01-01';await d.exec("update goals set due_date='2000-01-01'")},'PLAN_GOAL_GUARD'],
 ['progresso mesmo em meta futura',async d=>{await d.exec(`insert into student_goal_item_completions values('${id(9)}','${old}')`)},'PLAN_HAS_PROGRESS'],
 ['versão concorrente',async d=>{await d.exec("update goals set updated_at='2026-01-02'")},'PLAN_GOAL_GUARD'],
 ['edição de item fora do formulário',async d=>{await d.exec("update goal_items set instructions='Mudança concorrente'")},'PLAN_CONTENT_CHANGED'],
 ['material de outro curso',async d=>{await d.exec(`update materials set course_id='${other}'`)},'PLAN_MATERIAL_COURSE_GUARD'],
 ['disciplina de outro curso',async d=>{await d.exec(`update subjects set course_id='${other}'`)},'PLAN_TOPIC_COURSE_GUARD'],
 ['público diferente',async d=>{await d.exec("update goals set target_groups='{2}'")},'PLAN_GOAL_GUARD'],
]) test(`replanejamento recusa ${label} e desfaz a transação`,async()=>{
 const d=await db();try{const op=operation();await mutate(d,op);await assert.rejects(d.exec(compile(op)),new RegExp(expected));await d.exec('rollback');assert.equal((await d.query('select count(*)::int n from goal_items')).rows[0].n,1);assert.equal((await d.query('select description from goals')).rows[0].description,'Original')}finally{await d.close()}
})
