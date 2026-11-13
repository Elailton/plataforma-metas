import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const p=JSON.parse(readFileSync(new URL('../ops/replanejamento-90/lote.json',import.meta.url)))
test('lote: seis cursos fecham as unidades do edital em metas de 1 a 90, sem simular conclusões',()=>{
 assert.equal(p.coverage.length,6)
 for(const report of p.coverage){
  assert.equal(report.goals,90)
  const a=p.coverage_audit.find(x=>x.course_id===report.course_id)
  const ids=new Set(a.retained_bindings)
  for(const op of p.operations.filter(op=>op.before.course_id===report.course_id)) for(const i of op.new_items) ids.add(i.subtopic_id??i.topic_id)
  assert.equal(a.leaves.length,report.units)
  assert.deepEqual(a.leaves.filter(t=>!t.path.some(id=>ids.has(id))),[],report.name)
 }
})
test('lote: só metas futuras e sem histórico; mantém datas, IDs e questões anteriores',()=>{
 const frozen=new Set(p.frozen_goals)
 const archived=p.operations.flatMap(o=>o.archive_ids)
 assert.equal(archived.length,5)
 for(const op of p.operations){
  assert.ok(!frozen.has(op.before.id));assert.ok(op.before.due_date>p.today);assert.equal(op.before.completion_count,0)
  assert.ok(op.before.target_groups.includes(1));assert.equal(op.before.kind,'regular')
  const n=Number(op.title.match(/^Meta (\d+)/)?.[1]);assert.ok(n>=1&&n<=90)
  for(const id of op.archive_ids){const old=op.expected_items.find(i=>i.id===id);assert.ok(old);if(old.suggested_questions)assert.ok(op.new_items.some(i=>i.suggested_questions===old.suggested_questions&&i.instructions.startsWith('Atualização legislativa:')))}
 }
})
test('lote: cada item tem assunto e materiais do próprio curso, sem novas transferências para opcionais',()=>{
 const mats=new Map(p.material_catalog.map(m=>[m.id,m]));const ts=new Map(p.topic_catalog.map(t=>[t.id,t]));const seen=new Set()
 for(const op of p.operations)for(const i of op.new_items){
  assert.ok(!seen.has(i.id));seen.add(i.id);assert.equal(i.goal_id,op.before.id)
  const root=ts.get(i.topic_id);assert.ok(root);assert.equal(root.parent_topic_id,null);assert.equal(root.subject_id,i.subject_id);assert.equal(root.course_id,op.before.course_id)
  if(i.subtopic_id){const t=ts.get(i.subtopic_id);assert.equal(t.parent_topic_id,root.id);assert.equal(t.subject_id,i.subject_id)}
  assert.ok(i.instructions.length>0&&i.instructions.length<=4000);assert.ok(i.materials.length)
  for(const mid of i.materials){assert.ok(mats.has(mid));assert.equal(mats.get(mid).course_id,op.before.course_id)}
 }
 assert.equal(seen.size,157)
 assert.ok(p.sources.every(s=>new URL(s.url).hostname==='www.gov.br'))
})
test('lote: leitura e prática do novo bloco cabem em até três metas consecutivas, até a 90',()=>{
 for(const b of p.packets){assert.ok(b.practice_goal<=90);assert.ok(b.practice_goal>=Math.max(...b.theory_goals));assert.ok(b.practice_goal-Math.min(...b.theory_goals)<=3)}
 assert.equal(p.operations.filter(o=>['3f595180-4648-4f76-94e7-eb2ef88572bd','6305aafa-3263-46c9-b1b7-1001c01b5994'].includes(o.before.course_id)).length,0)
})
