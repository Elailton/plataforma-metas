import json,sys
f,cid,start,end=sys.argv[1],sys.argv[2],int(sys.argv[3]),int(sys.argv[4])
d=json.load(open(f)); n=len(d); part=d[start:end]
for i,s in enumerate(part): s['pos']=start+i+1
j=json.dumps(part,ensure_ascii=False,separators=(',',':'))
assert '$j$' not in j
upd=f"upd as (update subjects set position={n+1} where course_id='{cid}' and name='Orientações iniciais' returning id)," if start==0 else ""
sql=f"""with d as (select $j${j}$j$::jsonb j),
{upd}
subj as materialized (insert into subjects(course_id,name,position) select '{cid}', s->>'name', (s->>'pos')::int from d, jsonb_array_elements(j) e(s) returning id,name),
top as materialized (insert into syllabus_topics(subject_id,title,position,importance) select sb.id, t->>'title', o2, t->>'importance' from d cross join jsonb_array_elements(j) e(s) cross join jsonb_array_elements(s->'topics') with ordinality e2(t,o2) join subj sb on sb.name=s->>'name' returning id,subject_id,position)
insert into syllabus_topics(subject_id,title,position,parent_topic_id,importance) select tp.subject_id, u->>'title', o3, tp.id, u->>'importance' from d cross join jsonb_array_elements(j) e(s) cross join jsonb_array_elements(s->'topics') with ordinality e2(t,o2) cross join jsonb_array_elements(t->'subs') with ordinality e3(u,o3) join subj sb on sb.name=s->>'name' join top tp on tp.subject_id=sb.id and tp.position=o2"""
out=f"{f[:-5]}_{start}.sql"; open(out,'w').write(sql); print(out,len(sql.encode()))
