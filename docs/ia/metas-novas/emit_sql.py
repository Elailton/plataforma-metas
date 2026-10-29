"""Gera o SQL de gravação do replanejamento (lotes de ~14 KB)."""
import json, sys
sys.path.insert(0, '/tmp/claude-0/-home-claude/8d713a03-ff74-5cd2-ac85-66de37e61b39/scratchpad/replan')
import replan
D = replan.D

def rows_for(course, g):
    C, T, goals, past, vids = replan.load(course)
    out = json.load(open(D + f'plan_{course}_{g}.json'))
    res = []   # (gid8, title, [items])
    for m in out:
        its = []; subjs = []
        for it in m['items']:
            if it['kind'] == 'Fixed':
                its.append(dict(code='FX', iid=it['iid']))
                if it['fk'] == 'U' and 'Atualidades' not in subjs: subjs.append('Atualidades')
                if it['fk'] == 'D' and 'Discursiva' not in subjs: subjs.append('Discursiva')
                continue
            name = C['short'][it['subj']]
            if name not in subjs: subjs.append(name)
            mins = int(round(it['mins']))
            k = it['k']
            if it['kind'] == 'Aula':
                extra = 'P' if it['part'] and it['part'][0] < it['part'][1] else ''
                its.append(dict(code='A', k=k, n=None, mins=mins, extra=extra, mats=it['mats']))
            elif it['kind'] in ('Q1', 'QC'):
                its.append(dict(code=it['kind'], k=k, n=it['q'], mins=mins, extra='', mats=it['mats']))
            elif it['kind'] == 'Rev':
                its.append(dict(code='RV', k=k, n=it['q'], mins=mins, extra=str(it['r']), mats=it['mats']))
            elif it['kind'] == 'Ref':
                its.append(dict(code='RF', k=k, n=it['q'], mins=mins, extra='', mats=it['mats']))
            elif it['kind'] == 'Lei':
                its.append(dict(code='L', k=k, n=None, mins=mins, extra=it['law'], mats=it['mats']))
            elif it['kind'] == 'Leitura':
                its.append(dict(code='R', k=k, n=None, mins=mins, extra='', mats=it['mats']))
        # aulas seguidas do mesmo assunto (séries inteiras) viram um item só
        merged = []
        for it in its:
            p = merged[-1] if merged else None
            if p and it['code'] == 'A' and p['code'] == 'A' and p['k'] == it['k'] and not p['extra'] and not it['extra']:
                p['mats'] = p['mats'] + it['mats']; p['mins'] += it['mins']
            else:
                merged.append(dict(it))
        its = merged
        # tutorial do caderno de erros no último item novo
        for it in reversed(its):
            if it['code'] != 'FX':
                it['mats'] = it['mats'] + [C['tutorial']]; break
        title = f"Meta {m['num']} – " + ' · '.join(subjs)
        res.append((m['gid'], title, its))
    return C, T, res

def esc(s): return s.replace("'", "''")

def batches(course, g, maxlen=14000):
    C, T, res = rows_for(course, g)
    sp = ' em 1,5x' if g == 1 else ''
    vals_goals = []; vals_items = []; out = []
    def flush():
        if not vals_items and not vals_goals: return
        sql = TEMPLATE.format(cid=C['cid'], sp=sp, vade=esc(C['vade_name']),
                              goals=',\n'.join(vals_goals), items=',\n'.join(vals_items))
        out.append(sql); vals_goals.clear(); vals_items.clear()
    size = 0
    for gid, title, its in res:
        gv = f"('{gid}','{esc(title)}')"
        iv = []
        for pos, it in enumerate(its):
            if it['code'] == 'FX':
                iv.append(f"('{gid}',{pos},'FX','{it['iid']}','',null::int,null::int,'','')")
            else:
                parent = T[it['k']]['parent']
                topic = parent or it['k']; sub = it['k'] if parent else ''
                iv.append(f"('{gid}',{pos},'{it['code']}','{topic}','{sub}',{str(it['n']) + '::int' if it['n'] else 'null::int'},{it['mins']}::int,'{esc(it['extra'])}','{','.join(it['mats'])}')")
        add = len(gv) + sum(len(x) for x in iv)
        if size + add > maxlen: flush(); size = 0
        vals_goals.append(gv); vals_items.extend(iv); size += add
    flush()
    return out

TEMPLATE = """with gv(g8, title) as (values
{goals}),
iv(g8, pos, code, t8, s8, n, mins, extra, mats) as (values
{items}),
gl as (select g.id, gv.title from public.goals g join gv on left(g.id::text,8)=gv.g8 where g.course_id='{cid}' and g.status='published' and g.due_date > (now() at time zone 'America/Fortaleza')::date),
fx as (select i.id, i.goal_id from public.goal_items i join gl on gl.id=i.goal_id join iv on iv.code='FX' and left(i.id::text,8)=iv.t8 where i.archived_at is null),
arch as (update public.goal_items i set archived_at=clock_timestamp() from gl where i.goal_id=gl.id and i.archived_at is null and i.id not in (select id from fx) returning i.id),
fxpos as (update public.goal_items i set position=iv.pos from fx, iv, gl where i.id=fx.id and iv.code='FX' and left(i.id::text,8)=iv.t8 and gl.id=fx.goal_id and left(gl.id::text,8)=iv.g8 returning i.id),
nr as (
  select gl.id goal_id, iv.pos, iv.code, iv.n, iv.mins, iv.extra, iv.mats,
    t.id topic_id, st.id subtopic_id, t.subject_id
  from iv join gl on left(gl.id::text,8)=iv.g8
  join public.syllabus_topics t on left(t.id::text,8)=iv.t8 and t.subject_id in (select id from public.subjects where course_id='{cid}')
  left join public.syllabus_topics st on iv.s8<>'' and left(st.id::text,8)=iv.s8 and st.subject_id=t.subject_id
  where iv.code<>'FX'),
ins as (
  insert into public.goal_items (goal_id, subject_id, topic_id, subtopic_id, instructions, suggested_questions, position)
  select goal_id, subject_id, topic_id, subtopic_id,
    case code
     when 'A' then '{{AULAS}} (~'||mins||' min{sp}). Anotação dirigida: {{NOTA}}{{BLOCO}}'||case when extra='P' then ' Esta série de aulas continua na próxima meta desta disciplina; as questões de hoje são da parte que você acabou de ver.' else '' end
     when 'Q1' then 'Questões — 1ª resolução de «{{TT}}»: resolva '||n||' questões no caderno do Qconcursos deste assunto (link nos materiais deste item), sem consultar o material (~'||mins||' min). Estudo reverso: confira o gabarito, leia os comentários das que errou e das que acertou com dúvida e identifique o motivo de cada erro (desatenção, leitura do comando ou conteúdo). Registre no caderno de erros o que faltou.'
     when 'QC' then 'Questões — «{{TT}}» (parte vista hoje): resolva '||n||' questões do caderno do Qconcursos deste assunto (link nos materiais deste item) sobre o que você acabou de estudar, sem consultar o material (~'||mins||' min). Faça o estudo reverso das que errar e registre no caderno de erros.'
     when 'RV' then 'Revisão espaçada '||extra||' — «{{TT}}»: antes, releia no caderno de erros os registros deste assunto; depois resolva mais '||n||' questões ainda não resolvidas do caderno do Qconcursos (link nos materiais deste item) (~'||mins||' min) e faça o estudo reverso das que errar.'
     when 'RF' then 'Reforço — «{{TT}}»: resolva mais '||n||' questões ainda não resolvidas do caderno do Qconcursos deste assunto (link nos materiais deste item) (~'||mins||' min), com estudo reverso das que errar.'
     when 'L' then 'Lei seca (~'||mins||' min): leia no {vade} — '||extra||' —, com atenção aos dispositivos tratados nas aulas. Grife prazos, exceções e palavras como "vedado", "salvo" e "somente".'
     when 'R' then 'Leia na apostila em PDF (link nos materiais deste item) o trecho de «{{TT}}» (~'||mins||' min), reforçando o que viu na aula.'
    end,
    n, pos
  from nr
  returning id, goal_id, position),
gim as (
  insert into public.goal_item_materials (goal_item_id, material_id, position)
  select ins.id, m.id, x.ord - 1
  from ins join nr on nr.goal_id=ins.goal_id and nr.pos=ins.position
  cross join lateral unnest(string_to_array(nr.mats, ',')) with ordinality x(m8, ord)
  join public.materials m on m.course_id='{cid}' and left(m.id::text,8)=x.m8
  returning 1),
gup as (update public.goals g set title=gl.title, updated_at=clock_timestamp() from gl where g.id=gl.id returning g.id)
select (select count(*) from gl) metas, (select count(*) from arch) arquivados, (select count(*) from fx) fixos, (select count(*) from ins) itens, (select count(*) from gim) materiais,
 (select count(*) from iv where code<>'FX') esperados, (select count(*) from nr) resolvidos, (select count(*) from gup) titulos"""

if __name__ == '__main__':
    for course in ('gmf', 'pmpe'):
        for g in (1, 2):
            bs = batches(course, g)
            for i, b in enumerate(bs):
                open(D + f'sql_{course}_{g}_{i:02d}.sql', 'w').write(b)
            print(course, g, len(bs), 'lotes', [len(b) for b in bs])
