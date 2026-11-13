import json,re,sys,collections
from pathlib import Path
from planejar import Plan,number,protected,estimate

def prepare(snapshot,planfile):
 p=Plan(snapshot,json.loads(Path(planfile).read_text())['today']);data=json.loads(Path(planfile).read_text());new=data['new_items']
 assert not data['extra_items'] and not data['log']
 assert all(protected(p.goals[i['goal_id']],p.today)==False for i in new)
 # Mantenha o tutorial também no último item de cada meta ajustada, sem deslocar identidades existentes.
 for gid in {i['goal_id'] for i in new}:
  rows=[i for i in new if i['goal_id']==gid];last=max(rows,key=lambda i:i['position']);cid=p.goals[gid]['course_id']
  tutorials=[m['id'] for m in p.materials.values() if m['course_id']==cid and 'tutorial' in m['title'].lower() and 'caderno' in m['title'].lower()]
  if tutorials and tutorials[0] not in last['materials']:last['materials'].append(tutorials[0])
 labels={'Língua Portuguesa':'Português','Raciocínio Lógico':'Rac. Lógico','Raciocínio Lógico-Matemático':'RLM','Legislação de Trânsito':'Trânsito','Direito Constitucional':'Dir. Constitucional','Direito Administrativo':'Dir. Administrativo','Direito Penal':'Dir. Penal','Direito Processual Penal':'Proc. Penal','Língua Estrangeira (Inglês ou Espanhol)':'Idiomas'}
 sn={t['subject_id']:t['subject_name'] for t in p.topics.values()}
 operations=[]
 for g in data['original_goals']:
  gid=g['id'];ns=sorted([i for i in new if i['goal_id']==gid],key=lambda i:i['position']);archives=[i for i in data['archive_ids'] if p.original_items[i]['goal_id']==gid]
  old=[i for i in p.original_items.values() if i['goal_id']==gid and not i['archived_at']]
  expected=[{**{k:i[k] for k in ['id','subject_id','topic_id','subtopic_id','instructions','suggested_questions','position']},'material_ids':p.links[i['id']]} for i in sorted(old,key=lambda i:i['id'])]
  active=[i for i in old if i['id'] not in archives]+ns;minutes=sum(estimate(i) for i in active)
  names=[]
  for i in sorted(active,key=lambda i:i['position']):
   name=sn.get(i['subject_id']);label=labels.get(name,name)
   if label and 'orienta' not in label.lower() and label not in names:names.append(label)
  title=f'Meta {number(g):02d} – '+ ' · '.join(names) if names else g['title']
  h,m=divmod(minutes,60);time=f'{h}h {m:02d}min' if h else f'{m}min'
  desc=g['description'] or ''
  desc=re.sub(r'^Meta de [^.]+\.',f'Meta de ~{time}.',desc,count=1) if desc.startswith('Meta de ') else f'Tempo previsto: ~{time}.\n\n'+desc
  operations.append(dict(before=g,expected_items=expected,archive_ids=archives,new_items=ns,title=title,description=desc,minutes=minutes))
 # Cobertura projetada: folha sem filhos exige item próprio ou ancestral efetivamente programado.
 allitems=[i for i in p.original_items.values() if not i['archived_at'] and i['id'] not in data['archive_ids']]+new
 reports=[];audit=[]
 for cid,c in p.courses.items():
  goals=[g for g in p.goals.values() if g['course_id']==cid and g['status']!='archived' and g['kind']=='regular' and 1 in (g['target_groups'] or []) and 1<=number(g)<=90]
  assert sorted(number(g) for g in goals)==list(range(1,91))
  gids={g['id'] for g in goals};cov={i.get('subtopic_id') or i['topic_id'] for i in allitems if i['goal_id'] in gids}
  def covered(t):return t['id'] in cov or bool(t['parent_topic_id'] and covered(p.topics[t['parent_topic_id']]))
  leaves=[t for t in p.topics.values() if t['course_id']==cid and 'orienta' not in t['subject_name'].lower() and not any(x['parent_topic_id']==t['id'] for x in p.topics.values())]
  missing=[t for t in leaves if not covered(t)];assert not missing,(c['name'],[t['title'] for t in missing])
  paths=[]
  for t in leaves:
   path=[t['id']];a=t
   while a['parent_topic_id']:a=p.topics[a['parent_topic_id']];path.append(a['id'])
   paths.append(dict(id=t['id'],path=path))
  oldbindings=sorted({i.get('subtopic_id') or i['topic_id'] for i in p.original_items.values() if i['goal_id'] in gids and not i['archived_at'] and i['id'] not in data['archive_ids'] and (i.get('subtopic_id') or i['topic_id'])})
  audit.append(dict(course_id=cid,leaves=paths,retained_bindings=oldbindings))
  reports.append(dict(course_id=cid,name=c['name'],goals=90,units=len(leaves),missing=0,adjusted_goals=len([op for op in operations if op['before']['course_id']==cid])))
 assert set(data['archive_ids'])=={'b0507825-ecf2-4fb9-82f6-f180840ffe91'} | {i['id'] for i in p.original_items.values() if i['id'] in data['archive_ids'] and p.goals[i['goal_id']]['course_id']==p.cid('PRF')}
 # Nenhuma questão anterior é removida/reduzida: os itens substituídos mantêm sua quantidade.
 for oldid in data['archive_ids']:
  old=p.original_items[oldid];replacements=[i for i in new if i['goal_id']==old['goal_id'] and i['instructions'].startswith('Atualização legislativa:')]
  if old.get('suggested_questions'):assert any(i['suggested_questions']==old['suggested_questions'] for i in replacements)
 used={mid for i in new for mid in i['materials']}
 allm={**p.materials,**{m['id']:m for m in data['new_materials']}}
 topic_ids={v for i in new for v in [i['topic_id'],i['subtopic_id']] if v}
 return dict(coverage_audit=audit,material_catalog=[{k:allm[mid].get(k) for k in ['id','course_id','title','type','url']} for mid in sorted(used)],topic_catalog=[p.topics[t] for t in sorted(topic_ids)],today=data['today'],sources=data['new_materials'],operations=operations,coverage=reports,packets=data['packets'],frozen_goals=[g['id'] for g in p.goals.values() if g['id'] not in {op['before']['id'] for op in operations}])

if __name__=='__main__':
 result=prepare(*sys.argv[1:3]);Path(sys.argv[3]).write_text(json.dumps(result,ensure_ascii=False,indent=2))
 print(json.dumps({'coverage':result['coverage'],'operations':len(result['operations']),'new_items':sum(len(o['new_items']) for o in result['operations']),'max_minutes':max(o['minutes'] for o in result['operations'])},ensure_ascii=False))
