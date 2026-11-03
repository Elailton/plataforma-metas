import sys, importlib, os
D=os.path.dirname(os.path.abspath(__file__))+'/'; sys.path.insert(0,D)
course, f = sys.argv[1], sys.argv[2]
M=importlib.import_module(course)
T={l.split()[1]:int(l.split()[0]) for l in open(D+f'{course}_t.txt') if l.strip()}
spos={}
for line in M.MAP.strip().split('\n'):
    p=line.split()
    if len(p)>3: spos.setdefault(p[3], T[p[2]])
for k,c in M.CAD.items(): spos.setdefault(c, T[k])
rows=[]
for l in open(D+f):
    k,label,nb,n,d=l.rstrip('\n').split('|')
    rows.append("('%s',%d,'%s',%s,%s,'%s')"%(k,spos[k],label.replace("'","''"),nb,n,d))
print("""with v(k,spos,label,nb,n,d) as (values
%s),
ins as (insert into public.materials (course_id, subject_id, type, title, url, description)
 select '%s', s.id, 'link', 'Qconcursos - '||v.label, 'https://elite.qconcursos.com/questoes-de-concursos/questoes?notebook_ids[]='||v.nb,
  'Caderno do Qconcursos com '||v.n||' questões deste assunto ('||v.d||'). Chave: '||v.k
 from v join public.subjects s on s.course_id='%s' and s.position=v.spos
 where not exists (select 1 from public.materials m where m.course_id='%s' and m.description like '%%Chave: '||v.k)
 returning 1)
select count(*) from ins""" % (',\n'.join(rows), M.CID, M.CID, M.CID))
