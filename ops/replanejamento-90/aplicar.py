"""Compila uma operação restrita a uma meta futura. Sem conexão por padrão.
A execução administrativa usa exclusivamente a API de Management do Supabase.
"""
import json,sys,os,urllib.request,urllib.error,time,email.utils,datetime

def lit(v):
 if v is None:return 'null'
 return "'"+str(v).replace("'","''")+"'"
def js(v):return lit(json.dumps(v,ensure_ascii=False,separators=(',',':')))+'::jsonb'
def current_items(gid):
 return f"""(select coalesce(jsonb_agg(jsonb_build_object('id',i.id,'subject_id',i.subject_id,'topic_id',i.topic_id,'subtopic_id',i.subtopic_id,'instructions',i.instructions,'suggested_questions',i.suggested_questions,'position',i.position,'material_ids',(select coalesce(jsonb_agg(l.material_id order by l.position,l.material_id),'[]'::jsonb) from public.goal_item_materials l where l.goal_item_id=i.id)) order by i.id),'[]'::jsonb) from public.goal_items i where i.goal_id={lit(gid)}::uuid and i.archived_at is null)"""

def goal_sql(op):
 g=op['before'];gid=g['id'];cid=g['course_id'];new=op['new_items'];archives=op['archive_ids']
 assert new and len({i['id'] for i in new})==len(new)
 assert all(i['goal_id']==gid for i in new)
 sql=f"""begin;
set local lock_timeout='5s';set local statement_timeout='25s';
select id from public.goals where id={lit(gid)}::uuid for update;
select id from public.goal_items where goal_id={lit(gid)}::uuid for update;
create temporary table _new on commit drop as select * from jsonb_populate_recordset(null::public.goal_items,{js(new)});
create temporary table _links on commit drop as select (x->>'id')::uuid as item_id,(m.value #>> '{{}}')::uuid as material_id,(m.ordinality-1)::integer as position from jsonb_array_elements({js(new)}) x cross join lateral jsonb_array_elements(x->'materials') with ordinality m;
do $guard$ begin
 if not exists(select 1 from public.courses where id={lit(cid)}::uuid and status='published') then raise exception 'PLAN_GOAL_GUARD'; end if;
 if not exists(select 1 from public.goals where id={lit(gid)}::uuid and course_id={lit(cid)}::uuid and kind='regular' and status={lit(g['status'])} and status<>'archived' and 1=any(target_groups) and to_jsonb(target_groups)={js(g['target_groups'])} and due_date={lit(g['due_date'])}::date and due_date>(now() at time zone 'America/Sao_Paulo')::date and updated_at={lit(g['updated_at'])}::timestamptz and title={lit(g['title'])} and description is not distinct from {lit(g['description'])}) then raise exception 'PLAN_GOAL_GUARD'; end if;
 if exists(select 1 from public.student_goal_item_completions c join public.goal_items i on i.id=c.goal_item_id where i.goal_id={lit(gid)}::uuid) then raise exception 'PLAN_HAS_PROGRESS'; end if;
 if {current_items(gid)} is distinct from {js(op['expected_items'])} then raise exception 'PLAN_CONTENT_CHANGED'; end if;
 if exists(select 1 from _new n where n.goal_id<>{lit(gid)}::uuid or n.archived_at is not null or n.instructions is null or length(n.instructions) not between 1 and 4000 or n.suggested_questions<0 or exists(select 1 from public.goal_items i where i.id=n.id)) then raise exception 'PLAN_NEW_ITEM_GUARD'; end if;
 if exists(select 1 from _new n left join public.subjects s on s.id=n.subject_id left join public.syllabus_topics t on t.id=n.topic_id left join public.syllabus_topics st on st.id=n.subtopic_id where s.id is null or s.course_id<>{lit(cid)}::uuid or t.id is null or t.subject_id<>n.subject_id or t.parent_topic_id is not null or (n.subtopic_id is not null and (st.id is null or st.subject_id<>n.subject_id or st.parent_topic_id<>n.topic_id))) then raise exception 'PLAN_TOPIC_COURSE_GUARD'; end if;
 if exists(select 1 from _links l left join public.materials m on m.id=l.material_id where m.id is null or m.course_id is distinct from {lit(cid)}::uuid) then raise exception 'PLAN_MATERIAL_COURSE_GUARD'; end if;
 if exists(select 1 from _new n where not exists(select 1 from _links l where l.item_id=n.id)) then raise exception 'PLAN_MISSING_MATERIAL'; end if;
 if (select count(*) from public.goal_items i where i.id in (select value::uuid from jsonb_array_elements_text({js(archives)})) and i.goal_id={lit(gid)}::uuid and i.archived_at is null)<>{len(archives)} then raise exception 'PLAN_ARCHIVE_GUARD'; end if;
end $guard$;
update public.goal_items set archived_at=clock_timestamp() where goal_id={lit(gid)}::uuid and id in (select value::uuid from jsonb_array_elements_text({js(archives)}));
insert into public.goal_items(id,goal_id,subject_id,topic_id,subtopic_id,instructions,suggested_questions,position) select id,goal_id,subject_id,topic_id,subtopic_id,instructions,suggested_questions,position from _new;
insert into public.goal_item_materials(goal_item_id,material_id,position) select item_id,material_id,position from _links;
update public.goals set title={lit(op['title'])},description={lit(op['description'])},updated_at=clock_timestamp() where id={lit(gid)}::uuid and course_id={lit(cid)}::uuid;
do $after$ begin
 if (select count(*) from public.goal_items i join _new n on n.id=i.id where i.archived_at is null and i.goal_id={lit(gid)}::uuid)<>{len(new)} then raise exception 'PLAN_POST_COUNT'; end if;
 if exists(select 1 from public.student_goal_item_completions c join public.goal_items i on i.id=c.goal_item_id where i.goal_id={lit(gid)}::uuid) then raise exception 'PLAN_POST_PROGRESS'; end if;
end $after$;
commit;"""
 return sql

def sources_sql(materials):
 return f"""begin;set local lock_timeout='5s';
create temporary table _sources on commit drop as select * from jsonb_populate_recordset(null::public.materials,{js(materials)});
do $guard$ begin
 if exists(select 1 from _sources s left join public.courses c on c.id=s.course_id where c.id is null or c.status<>'published' or s.url not like 'https://www.gov.br/transportes/%' or s.type<>'link') then raise exception 'PLAN_SOURCE_GUARD'; end if;
 if exists(select 1 from _sources s join public.materials m on m.id=s.id where m.course_id<>s.course_id or m.url<>s.url) then raise exception 'PLAN_SOURCE_CONFLICT'; end if;
 if exists(select 1 from _sources s join public.materials m on m.course_id=s.course_id and m.url=s.url where m.id<>s.id) then raise exception 'PLAN_SOURCE_DUPLICATE'; end if;
end $guard$;
insert into public.materials(id,course_id,subject_id,title,type,url,description) select id,course_id,subject_id,title,type,url,description from _sources on conflict(id) do nothing;commit;"""

_last_request=0.0

def query(sql):
 global _last_request
 token=os.environ['SUPABASE_ACCESS_TOKEN']
 for attempt in range(7):
  delay=1.05-(time.monotonic()-_last_request)
  if delay>0:time.sleep(delay)
  req=urllib.request.Request('https://api.supabase.com/v1/projects/cbryvevesiaoqmwwlnet/database/query',data=json.dumps({'query':sql}).encode(),headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'},method='POST')
  _last_request=time.monotonic()
  try:
   with urllib.request.urlopen(req,timeout=55) as r:return json.load(r)
  except urllib.error.HTTPError as e:
   body=e.read().decode(errors='replace')
   if e.code==429 and attempt<6:
    header=e.headers.get('Retry-After') if e.headers else None
    try:wait=max(0,float(header))
    except (TypeError,ValueError):
     try:wait=max(0,(email.utils.parsedate_to_datetime(header)-datetime.datetime.now(datetime.timezone.utc)).total_seconds())
     except (TypeError,ValueError):wait=min(55,15*(attempt+1))
    print('Limite temporário da API; pausa antes de retomar a mesma operação.',flush=True)
    while wait>0:
     chunk=min(wait,45);time.sleep(chunk);wait-=chunk
    continue
   import re
   code=re.search(r'PLAN_[A-Z_]+',body)
   raise RuntimeError(f'Supabase HTTP {e.code}: '+(code[0] if code else 'operação recusada; nenhuma informação de conta foi registrada')) from None
 raise RuntimeError('Limite da API persistente; reexecutar o controlador para conferir o estado antes de continuar.')

if __name__=='__main__':
 if sys.argv[1:] == ['--compile-stdin']:
  print(goal_sql(json.load(sys.stdin)))
 else:raise SystemExit('Use o controlador revisado para executar; este módulo só compila SQL com --compile-stdin.')
