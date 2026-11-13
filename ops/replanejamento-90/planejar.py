"""Plano offline de correção de cobertura. Não conecta ao banco nem publica conteúdo.
Entrada: snapshot administrativo sem pessoas; saída: plano com IDs e pré-condições.
"""
import json,re,math,uuid,copy,collections,datetime,sys
from pathlib import Path
NAMESPACE=uuid.UUID('7e849254-f9b0-4dce-86fb-53b0869051be')
def uid(s):return str(uuid.uuid5(NAMESPACE,s))
def norm(s):
 import unicodedata
 return ''.join(c for c in unicodedata.normalize('NFKD',s.lower()) if not unicodedata.combining(c))
def number(g):
 m=re.match(r'^Meta\s+(\d+)\b',g['title'],re.I);return int(m[1]) if m else -1

def estimate(i):
 s=i['instructions'];q=i.get('suggested_questions') or 0
 m=re.search(r'~\s*(\d+)\s*min',s)
 if m:return max(int(m[1]),q*3)
 m=re.search(r'(\d+)\s*min',s)
 if m:return max(int(m[1]),q*3)
 return q*3

def protected(g,today):
 return g['status']=='archived' or g['kind']!='regular' or 1 not in (g.get('target_groups') or []) or not g.get('due_date') or g['due_date']<=today or bool(g.get('completion_count')) or not (1<=number(g)<=90)

class Plan:
 def __init__(self,path,today):
  self.path=Path(path);self.today=today
  self.load=lambda n:json.loads((self.path/(n+'.json')).read_text())
  self.courses={c['id']:c for c in self.load('courses')}
  self.goals={g['id']:g for g in self.load('goals')}
  self.topics={t['id']:t for t in self.load('topics')}
  self.materials={m['id']:m for m in self.load('materials')}
  self.original_items={i['id']:i for i in self.load('items')}
  self.links=collections.defaultdict(list)
  for l in sorted(self.load('links'),key=lambda l:l['position']):self.links[l['goal_item_id']].append(l['material_id'])
  self.active=collections.defaultdict(list)
  for i in self.original_items.values():
   if not i['archived_at']:self.active[i['goal_id']].append(copy.deepcopy(i))
  for a in self.active.values():a.sort(key=lambda i:i['position'])
  self.new_materials=[];self.archives=set();self.new_items=[];self.extra_items=[];self.changed=set();self.packets=[];self.log=[]
 def cid(self,name):return next(c['id'] for c in self.courses.values() if c['name']=='SGA - '+name)
 def mat(self,cid,title):
  if title in self.materials:
   assert self.materials[title]['course_id']==cid
   return title
  ms=[m for m in self.materials.values() if m['course_id']==cid and norm(m['title'])==norm(title)]
  if len(ms)!=1:raise ValueError(('MATERIAL_AMBIGUOUS_OR_MISSING',title,len(ms)))
  return ms[0]['id']
 def topic(self,cid,title):
  ts=[t for t in self.topics.values() if t['course_id']==cid and norm(t['title'])==norm(title)]
  if len(ts)>1:
   file=self.path/(self.courses[cid]['name'].replace(' ','_')+'-missing.json')
   missing={t['id'] for t in json.loads(file.read_text())};ts=[t for t in ts if t['id'] in missing]
  if len(ts)!=1:raise ValueError(('TOPIC_AMBIGUOUS_OR_MISSING',title,len(ts)))
  return ts[0]
 def add_source(self,cid,title,url,description='Fonte oficial conferida em 13/11/2026.'):
  old=next((m for m in self.materials.values() if m['course_id']==cid and m['url']==url),None)
  if old:return old['id']
  mid=uid('source:'+cid+':'+url);m=dict(id=mid,course_id=cid,subject_id=None,title=title,type='link',url=url,description=description)
  self.materials[mid]=m;self.new_materials.append(m);return mid
 def budget(self,gid):return sum(estimate(i) for i in self.active[gid])
 def replace(self,old,new):
  gid=old['goal_id'];assert not protected(self.goals[gid],self.today)
  self.archives.add(old['id']);self.active[gid]=[i for i in self.active[gid] if i['id']!=old['id']]
  new['id']=uid('item:'+old['id']+':'+json.dumps(new,sort_keys=True,ensure_ascii=False));new['archived_at']=None
  self.active[gid].append(new);self.new_items.append(new);self.changed.add(gid)
  return new
 def capacity(self,gid):
  return 300-self.budget(gid)
 def make_room(self,gid,minutes):
  return self.budget(gid)+minutes<=300
 def new(self,gid,t,instructions,questions,mids,tag):
  root=t
  while root['parent_topic_id']:root=self.topics[root['parent_topic_id']]
  i=dict(id=uid('new:'+gid+':'+tag),goal_id=gid,subject_id=t['subject_id'],topic_id=root['id'],subtopic_id=t['id'] if root['id']!=t['id'] else None,instructions=instructions,suggested_questions=questions,position=100,archived_at=None,materials=mids)
  self.new_items.append(i);self.links[i['id']]=mids;self.active[gid].append(i);self.changed.add(gid);return i
 def packet(self,cid,label,topics,sources,books,excerpt,reading=20,questions=12,earliest=13,latest=84,preferred=None):
  ts=[self.topic(cid,title) for title in topics];assert sources and books
  # Teoria segmentada por unidade, prática conjunta sobre o mesmo bloco de conteúdo.
  costs=[reading//len(ts)+(j<reading%len(ts)) for j in range(len(ts))]
  all_names='; '.join(t['title'] for t in ts)
  gs=[g for g in self.goals.values() if g['course_id']==cid and not protected(g,self.today) and earliest<=number(g)<=min(90,latest+3)]
  choice=None;best=None
  qoptions=[[questions]]
  if questions>=8:qoptions.append([questions//2,questions-questions//2])
  if questions==12:qoptions.append([4,4,4])
  for readmax in [20,10]:
   rtasks=[]
   for j,(t,cost) in enumerate(zip(ts,costs)):
    count=max(1,math.ceil(cost/readmax))
    for k in range(count):rtasks.append(('read',j,cost//count+(k<cost%count),k+1,count))
   for qs in qoptions:
    tasks=rtasks+[('q',j,n*3,j+1,len(qs)) for j,n in enumerate(qs)]
    for n in range(earliest,latest+1):
     window=sorted([g for g in gs if n<=number(g)<=min(90,n+3)],key=number)
     if not window:continue
     loads={g['id']:self.budget(g['id']) for g in window};alloc=[];last=n
     for task in tasks:
      fits=[g for g in window if number(g)>=last and loads[g['id']]+task[2]<=300]
      if not fits:break
      g=min(fits,key=lambda g:(loads[g['id']]+task[2],number(g)));loads[g['id']]+=task[2];last=number(g);alloc.append((task,g))
     if len(alloc)==len(tasks):
      peak=max(loads.values());score=(peak,len(tasks),abs(n-(preferred or earliest)),n)
      if best is None or score<best:choice=(alloc,qs);best=score
  if choice is None:raise ValueError(('NO_PACKET_WINDOW',self.courses[cid]['name'],label,reading,questions,earliest,latest))
  alloc,qs=choice;goalnums=[];practice_nums=[]
  for task,g in alloc:
   kind,j,cost,part,parts=task
   assert self.make_room(g['id'],cost)
   if kind=='read':
    t=ts[j];suffix=f' Etapa {part}/{parts}: continue a leitura do bloco a partir do ponto em que parou.' if parts>1 else ''
    text=f'Leitura dirigida — «{t["title"]}» (~{cost} min): {excerpt} Foque o trecho correspondente a este assunto.{suffix} Ao terminar, registre no caderno de erros as regras, exceções e dúvidas. A prática deste bloco está indicada nos itens de questões.'
    self.new(g['id'],t,text,None,sources,f'theory:{label}:{t["id"]}:{part}');goalnums.append(number(g))
   else:
    t=ts[0];q=qs[j];suffix=f' Etapa {part}/{parts} da prática: são {questions} questões no bloco completo; continue com questões ainda não resolvidas.' if parts>1 else ''
    text=f'Questões — prática dirigida de «{label}»: resolva {q} questões do(s) caderno(s) do Qconcursos indicado(s), distribuindo a prática entre: {all_names}. Se houver mais de um caderno, a quantidade é total, não por caderno.{suffix} Selecione questões compatíveis com os trechos estudados e com a legislação atual. Confira o gabarito, faça o estudo reverso dos erros e registre as dúvidas (~{cost} min, incluindo correção e caderno de erros).'
    self.new(g['id'],t,text,q,books,f'practice:{label}:{part}');practice_nums.append(number(g))
  qg=next(g for g in gs if number(g)==max(practice_nums))
  assert max(practice_nums)-min(goalnums)<=3
  self.packets.append(dict(course_id=cid,label=label,topics=[t['id'] for t in ts],theory_goals=goalnums,practice_goal=number(qg),minutes=reading+questions*3,sources=sources,books=books))
 def output(self):
  # Assign new positions only to changed/new items. Existing fixed identities remain untouched.
  for gid in self.changed:
   original=[i for i in self.active[gid] if i['id'] in self.original_items and i['id'] not in self.archives]
   pos=max([i['position'] for i in original],default=0)
   for i in self.active[gid]:
    if i['id'] not in self.original_items:pos+=1;i['position']=pos
  return dict(today=self.today,original_goals=[self.goals[g] for g in sorted(self.changed)],archive_ids=sorted(self.archives),new_items=self.new_items,new_materials=self.new_materials,extra_items=self.extra_items,packets=self.packets,log=self.log,projected=[dict(id=g,course_id=self.goals[g]['course_id'],number=number(self.goals[g]),minutes=self.budget(g)) for g in sorted(self.changed)])
