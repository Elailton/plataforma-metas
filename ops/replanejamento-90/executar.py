"""Aplicação explícita do plano previamente testado. Não modifica dados de alunos.
Uso: python executar.py <operacoes.json> <diretorio-registro> --apply
Para desfazer uma meta ainda futura, gerar a reversão revisada com rollback_sql().
"""
from aplicar import *
from pathlib import Path
import datetime

def after_items(op):
 rows=[r for r in op['expected_items'] if r['id'] not in op['archive_ids']]
 rows+=[dict(id=i['id'],subject_id=i['subject_id'],topic_id=i['topic_id'],subtopic_id=i['subtopic_id'],instructions=i['instructions'],suggested_questions=i['suggested_questions'],position=i['position'],material_ids=i['materials']) for i in op['new_items']]
 return sorted(rows,key=lambda r:r['id'])

def freeze_hash(ids):
 result=[]
 for start in range(0,len(ids),120):
  arr=js(ids[start:start+120])
  sql=f"""begin read only;with frozen as(select value::uuid id from jsonb_array_elements_text({arr})) select (select md5(coalesce(jsonb_agg(to_jsonb(g) order by g.id)::text,'')) from public.goals g where g.id in(select id from frozen)) as goals,(select md5(coalesce(jsonb_agg(to_jsonb(i) order by i.id)::text,'')) from public.goal_items i where i.goal_id in(select id from frozen)) as items,(select md5(coalesce(jsonb_agg(to_jsonb(l) order by l.goal_item_id,l.material_id)::text,'')) from public.goal_item_materials l join public.goal_items i on i.id=l.goal_item_id where i.goal_id in(select id from frozen)) as links;rollback;"""
  result.append(query(sql)[0])
 return result

def rollback_sql(op):
 g=op['before'];gid=g['id'];ids=[i['id'] for i in op['new_items']]
 return f"""begin;set local lock_timeout='5s';
select id from public.goals where id={lit(gid)}::uuid for update;
select id from public.goal_items where goal_id={lit(gid)}::uuid for update;
do $guard$ begin
 if not exists(select 1 from public.goals where id={lit(gid)}::uuid and due_date>(now() at time zone 'America/Sao_Paulo')::date and title={lit(op['title'])} and description={lit(op['description'])}) then raise exception 'PLAN_ROLLBACK_GOAL_GUARD'; end if;
 if exists(select 1 from public.student_goal_item_completions c join public.goal_items i on i.id=c.goal_item_id where i.goal_id={lit(gid)}::uuid) then raise exception 'PLAN_ROLLBACK_PROGRESS'; end if;
 if {current_items(gid)} is distinct from {js(after_items(op))} then raise exception 'PLAN_ROLLBACK_CHANGED'; end if;
end $guard$;
update public.goal_items set archived_at=clock_timestamp() where goal_id={lit(gid)}::uuid and id in(select value::uuid from jsonb_array_elements_text({js(ids)}));
update public.goal_items set archived_at=null where goal_id={lit(gid)}::uuid and id in(select value::uuid from jsonb_array_elements_text({js(op['archive_ids'])}));
update public.goals set title={lit(g['title'])},description={lit(g['description'])},updated_at=clock_timestamp() where id={lit(gid)}::uuid;
commit;"""

if __name__=='__main__':
 if len(sys.argv)!=4 or sys.argv[3]!='--apply':raise SystemExit('Exige plano, diretório de registro e --apply.')
 plan=json.loads(Path(sys.argv[1]).read_text());out=Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
 frozen_before=freeze_hash(plan['frozen_goals']);(out/'frozen-before.json').write_text(json.dumps(frozen_before))
 query(sources_sql(plan['sources']))
 done=[]
 for n,op in enumerate(plan['operations'],1):
  gid=op['before']['id']
  current=query(f"begin read only;select title,description,{current_items(gid)} as items from public.goals where id={lit(gid)}::uuid;rollback;")
  assert len(current)==1
  if current[0]['title']==op['title'] and current[0]['description']==op['description'] and current[0]['items']==after_items(op):status='already_applied'
  else:
   query(goal_sql(op));status='applied'
   got=query(f"begin read only;select title,description,{current_items(gid)} as items from public.goals where id={lit(gid)}::uuid;rollback;")[0]
   assert got['title']==op['title'] and got['description']==op['description'] and got['items']==after_items(op),'PLAN_VERIFY_FAILED'
  done.append({'goal_id':gid,'status':status});(out/'applied.json').write_text(json.dumps(done,indent=2));(out/(gid+'-rollback.sql')).write_text(rollback_sql(op))
  if n%15==0:print(f'Metas conferidas: {n}/{len(plan["operations"])}',flush=True)
 frozen_after=freeze_hash(plan['frozen_goals']);assert frozen_after==frozen_before,'PLAN_FROZEN_CHANGED'
 result={'applied_or_verified':len(done),'frozen_unchanged':True,'new_items':sum(len(op['new_items']) for op in plan['operations']),'archived_preserved':sum(len(op['archive_ids']) for op in plan['operations']),'sources':len(plan['sources']),'no_student_writes':True}
 (out/'result.json').write_text(json.dumps(result,indent=2));print(json.dumps(result))
