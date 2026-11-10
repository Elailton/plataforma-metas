"""Gera o SQL (CTEs compartilhadas) das Metas 51-90 dos cursos novos.
Uso: python3 gen.py <curso> export|apply [asg.txt]
"""
import sys, importlib, json

def q(s):
    return "'" + str(s).replace("'", "''") + "'"

def vals(rows):
    return ','.join('(' + ','.join('null' if x is None else (str(x) if isinstance(x, (int, float)) else q(x)) for x in r) + ')' for r in rows)

def ctes(C):
    lm = []
    for line in C.LM.strip().split('\n'):
        f = line.split('|')
        tc, rng, tk = f[0].split()
        a, b = (rng.split('-') + [rng])[:2]
        nbk = f[1].strip() if len(f) > 1 and f[1].strip() else None
        law = f[2].strip() if len(f) > 2 and f[2].strip() else None
        lm.append((tc, int(a), int(b), tk, nbk, law))
    tcm = [(k, v) for k, v in C.TR.items()]
    cad = list(C.CAD.items()) or [('x', 'x')]
    law = list(C.LAW.items()) or [('x', 'x')]
    nosso = list(C.NOSSO.items()) or [('x', 0)]
    short = list(C.SHORT.items())
    qosub = [(k,) for k in C.QOSUB] or [('x',)]
    skip = [(k,) for k in C.SKIP] or [('x',)]
    qolaw = [(k, a, b) for k, (a, b) in getattr(C, 'QOLAW', {}).items()] or [('x', 'x', 'x')]
    CID = q(C.CID)
    LEAN = 'true' if getattr(C, 'G1LEAN', True) else 'false'
    return f"""with
cfg(grp, spd, nts, lim, q1, qa, qb, qc, lei, rev, rd, errw, disc, fin) as (values (1,1.5,1.10,90,6,4,5,6,20,8,20,15,60,10),(2,1.0,1.15,150,15,6,10,12,30,15,30,20,90,15)),
tcm(tc, trilha) as (values {vals(tcm)}),
lm(tc, a, b, tk, nbk, law) as (values {vals(lm)}),
cadm(k, nk) as (values {vals(cad)}),
lawm(k, txt) as (values {vals(law)}),
nosm(k, ord) as (values {vals(nosso)}),
shortm(sp, nm) as (values {vals(short)}),
qosub(k) as (values {vals(qosub)}),
skipm(k) as (values {vals(skip)}),
qolaw(k, a, b) as (values {vals(qolaw)}),
tp as (select t.id, left(t.id::text,8) k, t.parent_topic_id pid, left(coalesce(t.parent_topic_id,t.id)::text,8) pk, coalesce(t.parent_topic_id,t.id) top, t.title, left(t.importance,1) imp, s.id sid, s.position sp, t.position tpos
  from syllabus_topics t join subjects s on s.id=t.subject_id where s.course_id={CID}),
nb as (select m.id mid, substring(m.description from 'Chave: (\\S+)\\s*$') key from materials m where m.course_id={CID} and m.type='link' and m.url like '%notebook%'),
mat as (select id, left(id::text,8) k8, title, type, description from materials where course_id={CID}),
vade as (select id from mat where type='link' and title={q(getattr(C, 'VADE_MAT', C.VADE))} limit 1),
tut as (select id from mat where type='apostila' and title like 'Tutorial: Caderno de Erros%' limit 1),
gg as (select g.id, g.target_groups[1] grp, (substring(g.title from 'Meta (\\d+)'))::int n, g.due_date, g.description from goals g where g.course_id={CID} and g.status<>'archived' and g.kind='regular' and cardinality(g.target_groups)=1 and g.target_groups[1] in (1,2)),
gi as (select gi.*, gg.grp, gg.n from goal_items gi join gg on gg.id=gi.goal_id where gi.archived_at is null),
gm as (select gi.grp, gi.n, gi.topic_id, gi.subtopic_id, gm.material_id from gi join goal_item_materials gm on gm.goal_item_id=gi.id),
cov as (select distinct grp, left(coalesce(subtopic_id,topic_id)::text,8) k from gi where n<=50 and coalesce(subtopic_id,topic_id) is not null
  union select distinct grp, left(topic_id::text,8) from gi where n<=50 and topic_id is not null),
v as (select m.id, m.title, tcm.tc, (substring(m.description from 'Ordem: (\\d+)'))::int ord,
  regexp_replace(m.title, '\\s*[\\(\\-–]*\\s*Parte \\d+\\)?.*$','') base, m.title ~* '(^bloco|bloco de quest)' bl,
  (split_part(substring(m.description from 'Duração: ([0-9:]+)'),':',1))::int*60 + coalesce(nullif(split_part(substring(m.description from 'Duração: ([0-9:]+)'),':',2),'')::int,0) secs
  from mat m join tcm on m.description like 'Trilha: '||tcm.trilha||' |%' where m.type='videoaula'),
v2 as (select v.*, coalesce(lm.tk, (select left(coalesce(gm.subtopic_id,gm.topic_id)::text,8) from gm join v vv on vv.id=gm.material_id where vv.tc=v.tc and vv.base=v.base and gm.topic_id is not null limit 1)) tk, lm.nbk, lm.law lmlaw
  from v left join lm on lm.tc=v.tc and v.ord between lm.a and lm.b),
rem as (select x.grp, v2.*, round(v2.secs/60.0/cfg.spd*cfg.nts, 2) eff, cfg.lim from (values (1),(2)) x(grp) join cfg on cfg.grp=x.grp join v2 on true
  where v2.tc<>{q(C.DISC or 'xx')} and not exists (select 1 from gm where gm.material_id=v2.id and gm.grp=x.grp and gm.n<=50)
  and not (x.grp=1 and {LEAN} and (v2.bl or exists (select 1 from tp where tp.k=v2.tk and tp.imp='l')))),
lowx as (select distinct 1 grp, v2.tk k from v2 join tp on tp.k=v2.tk and tp.imp='l' where {LEAN} and v2.tc<>{q(C.DISC or 'xx')} and not exists (select 1 from gm where gm.material_id=v2.id and gm.grp=1 and gm.n<=50)),
r1 as (select rem.*, case when lag(tc) over w is distinct from tc or lag(tk) over w is distinct from tk or lag(nbk) over w is distinct from nbk or (lag(base) over w is distinct from base and not bl) then 1 else 0 end st
  from rem window w as (partition by grp order by tc, ord)),
r2 as (select *, sum(st) over (partition by grp order by tc, ord) u0 from r1),
r3 as (select *, floor(coalesce(sum(eff) over (partition by grp, u0 order by ord rows between unbounded preceding and 1 preceding),0)/lim) ch from r2),
lu as (select grp, u0, ch, 'M'||(array_agg(left(id::text,8) order by ord))[1] uk, min(tc) tc, min(tk) tk, min(nbk) nbk, min(lmlaw) lmlaw, round(sum(eff))::int amin, bool_and(bl) allbl, bool_or(bl) anybl,
  string_agg(title, '; ' order by ord) titles, count(*) cnt, array_agg(id order by ord) mids, min(ord) o from r3 group by grp, u0, ch),
lu2 as (select lu.*, tp.id tid, tp.top, tp.pid, tp.pk, tp.title ttl, tp.imp, tp.sid, tp.sp, cfg.q1, cfg.qa, cfg.qb, cfg.qc, cfg.lei, cfg.rev,
  row_number() over (partition by lu.grp, lu.tk order by lu.tc, lu.o) rk,
  coalesce((select mid from nb where key=coalesce(lu.nbk,(select nk from cadm where k=lu.tk),lu.tk) limit 1), (select mid from nb where key=coalesce((select nk from cadm where k=tp.pk),tp.pk) limit 1)) nbm,
  coalesce(lu.lmlaw, (select txt from lawm where k=lu.tk), (select txt from lawm where k=tp.pk)) lawt
  from lu join tp on tp.k=lu.tk join cfg on cfg.grp=lu.grp),
lu3 as (select lu2.*, (rk=1 and not exists (select 1 from cov where cov.grp=lu2.grp and cov.k=lu2.tk)) first,
  case when amin<30 then qa when amin<60 then qb else qc end qn,
  lawt is not null and (grp=2 or imp='h') and row_number() over (partition by grp, lawt order by tc, o)=1 and not exists (select 1 from gi where gi.grp=lu2.grp and gi.n<=50 and gi.instructions like 'Lei seca%'||lawt||'%') dolaw
  from lu2),
qo as (select x.grp, 'Q'||tp.k uk, tp.*, cfg.q1, cfg.rd, coalesce((select mid from nb where key=coalesce((select nk from cadm where k=tp.k),tp.k) limit 1), (select mid from nb where key=coalesce((select nk from cadm where k=tp.pk),tp.pk) limit 1)) nbm,
  coalesce((select txt from lawm where k=tp.k), (select replace(tp.title, qolaw.a, qolaw.b) from qolaw where qolaw.k=tp.pk and tp.pid is not null)) lawt, (select m.id from mat m join nosm on nosm.k=tp.k where m.type='apostila' and m.title like 'Nosso PDF%' and (substring(m.description from 'Ordem: (\\d+)'))::int=nosm.ord limit 1) nos
  from (values (1),(2)) x(grp) join cfg on cfg.grp=x.grp join tp on (tp.pid is null or (tp.pk in (select k from qosub) and (tp.imp='h' or (tp.imp='m' and (x.grp=2 or tp.pk not in (select k from qolaw))))) or (x.grp, tp.k) in (select grp, k from lowx))
  where tp.k not in (select k from skipm) and tp.pk not in (select k from skipm)
  and not exists (select 1 from cov where cov.grp=x.grp and (cov.k=tp.k or (tp.pid is null and cov.k in (select k from tp t2 where t2.pk=tp.k))))
  and not exists (select 1 from lu where lu.grp=x.grp and (lu.tk=tp.k or (tp.pid is null and lu.tk in (select k from tp t2 where t2.pk=tp.k))))
  and not (tp.pid is null and tp.k in (select k from qosub))),
qo2 as (select * from qo where nbm is not null),
disc as (select grp, 'D'||left(id::text,8) uk, id mid, title, round(secs/60.0/(select spd from cfg c where c.grp=x.grp)*(select nts from cfg c where c.grp=x.grp))::int amin, row_number() over (partition by grp order by ord) dn
  from (values (1),(2)) x(grp) join v2 on v2.tc={q(C.DISC or 'xx')} where not exists (select 1 from gm where gm.material_id=v2.id and gm.grp=x.grp and gm.n<=50)),
txt as (select 'Anotação dirigida: anote os conceitos, as regras e as exceções destacados pelo professor e os pontos em que teve dúvida.' an,
  ' Estudo reverso: confira o gabarito, leia os comentários das que errou e das que acertou com dúvida e identifique o motivo de cada erro (desatenção, leitura do comando ou conteúdo). Registre no caderno de erros o que faltou.' er),
items as (
  select grp, uk, 0 sub, 'A' kind, sid, top, pid, tid, null::int sq, amin mins,
    case when cnt=1 then 'Assista à aula: '||titles else 'Assista, nesta ordem, às aulas: '||titles end || ' (~'||amin||' min'||case when grp=1 then ' em 1,5x' else '' end||'). '||(select an from txt)
    ||case when anybl then ' No bloco de questões, pause e resolva cada questão antes de ver a correção.' else '' end instr, mids mats
  from lu3
  union all
  select grp, uk, 1, 'Q', sid, top, pid, tid, case when first then q1 else qn end, 3*case when first then q1 else qn end,
    case when first then 'Questões — 1ª resolução de «'||ttl||'»: resolva '||q1||' questões no caderno do Qconcursos deste assunto (link nos materiais deste item), sem consultar o material (~'||(3*q1)||' min).'||(select er from txt)
    else 'Questões — «'||ttl||'» (parte vista hoje): resolva '||qn||' questões do caderno do Qconcursos deste assunto (link nos materiais deste item) sobre o que você acabou de estudar, sem consultar o material (~'||(3*qn)||' min). Faça o estudo reverso das que errar e registre no caderno de erros.' end,
    array[nbm] || case when first then array[(select id from tut)] else '{{}}'::uuid[] end
  from lu3 where nbm is not null and not (allbl and grp=1 and not first)
  union all
  select grp, 'L'||substr(uk,2), 0, 'L', sid, top, pid, tid, null, lei,
    'Lei seca (~'||lei||' min): leia no '||{q(C.VADE)}||' (link nos materiais deste item) — '||lawt||' —, com atenção aos dispositivos tratados nas aulas. Grife prazos, exceções e palavras como "vedado", "salvo" e "somente".',
    array[(select id from vade)] from lu3 where dolaw
  union all
  select grp, 'V'||substr(uk,2), 0, 'V', sid, top, pid, tid, rev, 3*rev,
    'Revisão espaçada 1 — «'||ttl||'»: antes, releia no caderno de erros os registros deste assunto; depois resolva mais '||rev||' questões ainda não resolvidas do caderno do Qconcursos (link nos materiais deste item) (~'||(3*rev)||' min) e faça o estudo reverso das que errar.',
    array[nbm] from lu3 where first and imp='h' and nbm is not null and grp=2
  union all
  select grp, uk, 0, 'R', sid, top, pid, id, null, rd, 'Leia o PDF de «'||title||'» (link nos materiais deste item) (~'||rd||' min), grifando o que costuma cair em prova.', array[nos]
  from qo2 where nos is not null
  union all
  select grp, uk, 1, 'Q', sid, top, pid, id, q1, 3*q1 + case when nos is null and lawt is not null then 10 else 0 end,
    case when nos is null and lawt is not null then 'Estudo por questões — «'||title||'» (assunto sem aula na trilha): leia no '||{q(C.VADE)}||' — '||lawt||' — (~10 min), com atenção aos dispositivos mais cobrados; depois resolva '||q1||' questões no caderno do Qconcursos deste assunto (link nos materiais deste item), sem consultar o material. Estudo reverso: confira o gabarito e registre no caderno de erros o que faltou.'
    else 'Questões — 1ª resolução de «'||title||'» (assunto sem aula na trilha): resolva '||q1||' questões no caderno do Qconcursos deste assunto (link nos materiais deste item), sem consultar o material (~'||(3*q1)||' min).'||(select er from txt) end,
    array[nbm] || case when nos is null and lawt is not null then array[(select id from vade)] else '{{}}'::uuid[] end
  from qo2
  union all
  select d.grp, d.uk, 0, 'O', (select subject_id from gi where gi.grp=d.grp and gi.instructions like 'Discursiva%' limit 1), null, null, null, null, c.disc,
    'Discursiva (~'||c.disc||' min): Assista à aula: '||d.title||' (~'||d.amin||' min'||case when d.grp=1 then ' em 1,5x' else '' end||'). Em seguida, escreva 1 redação dissertativa de 25 a 30 linhas, em até 50 min cronometrados, sobre um tema de segurança pública, trânsito ou atualidades, aplicando a estrutura ensinada pelo professor. Depois, confira introdução, argumentos e conclusão.',
    array[d.mid, (select id from tut)] from disc d join cfg c on c.grp=d.grp
  union all
  select x.grp, 'W'||w.n, 0, 'O', (select sid from tp order by sp limit 1), null, null, null, null, c.errw,
    'Revisão semanal do caderno de erros (~'||c.errw||' min): releia os registros da semana, refaça as questões que errou e marque o que já domina. Se tiver dúvida sobre como usar o caderno, veja o tutorial (link nos materiais deste item).',
    array[(select id from tut)] from (values (1),(2)) x(grp) join cfg c on c.grp=x.grp cross join (values (56),(63),(70),(77),(84)) w(n)
),
units as (select grp, uk, min(kind) filter (where sub=0) k0, sum(mins) mins, min(sid::text) sid from items group by grp, uk),
uord as (select u.*, s.position sp, coalesce(lu.tc, '~') tc, coalesce(lu.o, 999) o, case when left(u.uk,1) in ('L','V') then 'M'||substr(u.uk,2) end parent from units u left join subjects s on s.id::text=u.sid left join lu on lu.grp=u.grp and lu.uk=u.uk)
"""

def export(C):
    return ctes(C) + """select grp, string_agg(concat_ws(',', uk, coalesce(sp,0), mins, coalesce(parent,'')), ';' order by coalesce(sp,0), tc, o, uk) u,
 (select string_agg(dn||'='||uk||'='||amin, ';') from disc where disc.grp=uord.grp) d,
 (select string_agg(tp.sp||':'||tp.k, ';' order by tp.sp, tp.tpos) from tp where tp.pid is null and tp.imp='h' and tp.k not in (select k from skipm) and exists (select 1 from nb where key=coalesce((select nk from cadm where k=tp.k),tp.k))) hi,
 (select max(n) from gg where gg.grp=uord.grp) lastn
from uord where left(uk,1) not in ('D','W') group by grp"""

def apply2(C, R):
    # R: {grp: {'rows': [...], 'fin': [...]}}
    rows = [(g, k, n, p) for g in R for (k, n, p) in R[g]['rows']]
    fin = [(g, k, n, p) for g in R for (k, n, p) in R[g]['fin']] or [(0, 'x', 0, 0)]
    gs = ','.join(str(g) for g in R)
    return ctes(C) + f""",
asg(grp, uk, n, upos) as (values {vals(rows)}),
fasg(grp, k, n, upos) as (values {vals(fin)}),
chk as (select 1/(case when exists (select 1 from asg where left(uk,1) in ('M','Q','W','D') and (grp, uk) not in (select grp, uk from items)) or exists (select 1 from gi where gi.grp in ({gs}) and gi.n>50) then 0 else 1 end) ok),
allg as (select id, grp, n from gg where grp in ({gs}) and n>50),
fit as (select fasg.grp, tp.*, c.fin, (select mid from nb where key=coalesce((select nk from cadm where k=tp.k),tp.k) limit 1) nbm, fasg.n, fasg.upos
  from fasg join tp on tp.k=fasg.k join cfg c on c.grp=fasg.grp),
all_items as (
  select i.*, a.n, a.upos from items i join asg a on a.uk=i.uk and a.grp=i.grp
  union all
  select grp, 'F'||k, 0, 'F', sid, top, pid, id, fin, 3*fin,
    'Revisão final — «'||title||'»: antes, releia no caderno de erros os registros deste assunto; depois resolva '||fin||' questões ainda não resolvidas do caderno do Qconcursos deste assunto (link nos materiais deste item), sem consultar o material. Estudo reverso: confira o gabarito, leia os comentários das que errou e das que acertou com dúvida e registre no caderno de erros o que faltou.',
    array[nbm], n, upos from fit where nbm is not null),
pos as materialized (select ai.*, allg.id gid, gen_random_uuid() nid,
   row_number() over (partition by ai.grp, ai.n order by ai.upos, ai.sub) - 1 p
  from all_items ai join allg on allg.n=ai.n and allg.grp=ai.grp, chk where chk.ok=1),
ins as (insert into goal_items (id, goal_id, subject_id, topic_id, subtopic_id, instructions, suggested_questions, position)
  select nid, gid, sid, top, case when pid is not null then tid end, instr, sq, p from pos returning id),
mats as (insert into goal_item_materials (goal_item_id, material_id, position)
  select pos.nid, m.mid, m.o - 1 from pos cross join lateral unnest(pos.mats) with ordinality m(mid, o)
  where m.mid is not null and exists (select 1 from ins where ins.id=pos.nid) returning 1)
select (select count(*) from ins) items, (select count(*) from mats) mats, (select count(*) from asg) planned, (select count(*) from fit) fin"""

if __name__ == '__main__':
    C = importlib.import_module(sys.argv[1])
    if sys.argv[2] == 'export':
        print(export(C))
    elif sys.argv[2] == 'apply':
        R = {int(g): json.load(open(f'{sys.argv[3]}/asg{g}.json')) for g in sys.argv[4:]}
        print(apply2(C, R))
