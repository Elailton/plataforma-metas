"""SQL de gravação das metas geradas por plan_new.py (lotes de ~15 KB).

Uso: python3 emit_new.py <curso>
"""
import json, os, sys
D = os.path.dirname(os.path.abspath(__file__)) + '/'
sys.path.insert(0, D)
import importlib


def esc(s): return s.replace("'", "''")


def text(it, g, M):
    sp = ' em 1,5x' if g == 1 else ''
    m = int(round(it['mins'])); n = it.get('q')
    k = it['kind']
    if k == 'A':
        t = '{AULAS} (~%d min%s). Anotação dirigida: {NOTA}{BLOCO}' % (m, sp)
        if it.get('cont'):
            t += ' Esta série de aulas continua na próxima meta desta disciplina; as questões de hoje são da parte que você acabou de ver.'
        return t
    if k == 'Q1':
        return ('Questões — 1ª resolução de «{TT}»: resolva %d questões no caderno do Qconcursos deste assunto (link nos materiais deste item), '
                'sem consultar o material (~%d min). Estudo reverso: confira o gabarito, leia os comentários das que errou e das que acertou com dúvida '
                'e identifique o motivo de cada erro (desatenção, leitura do comando ou conteúdo). Registre no caderno de erros o que faltou.') % (n, m)
    if k == 'QO':
        return ('Questões — «{TT}» (assunto estudado direto pelas questões): resolva %d questões no caderno do Qconcursos deste assunto (link nos '
                'materiais deste item) (~%d min). Leia com atenção os comentários de todas as questões, inclusive das que acertar: eles fazem o papel '
                'da aula. Registre no caderno de erros as regras e exceções que aprendeu.') % (n, m)
    if k == 'QC':
        return ('Questões — «{TT}» (parte vista hoje): resolva %d questões do caderno do Qconcursos deste assunto (link nos materiais deste item) '
                'sobre o que você acabou de estudar, sem consultar o material (~%d min). Faça o estudo reverso das que errar e registre no caderno de erros.') % (n, m)
    if k == 'RV':
        return ('Revisão espaçada %d — «{TT}»: antes, releia no caderno de erros os registros deste assunto; depois resolva mais %d questões ainda não '
                'resolvidas do caderno do Qconcursos (link nos materiais deste item) (~%d min) e faça o estudo reverso das que errar.') % (it['r'], n, m)
    if k == 'RF':
        return ('Reforço — «{TT}»: resolva mais %d questões ainda não resolvidas do caderno do Qconcursos deste assunto (link nos materiais deste item) '
                '(~%d min), com estudo reverso das que errar.') % (n, m)
    if k == 'L':
        return ('Lei seca (~%d min): leia no %s (link nos materiais deste item) — %s —, com atenção aos dispositivos tratados nas aulas. '
                'Grife prazos, exceções e palavras como "vedado", "salvo" e "somente".') % (m, M.VADE, it['law'])
    if k == 'R':
        if it['mat'].startswith('n:'):
            return 'Leia o PDF de «{TT}» (link nos materiais deste item) (~%d min), grifando o que costuma cair em prova.' % m
        return 'Leia na apostila em PDF (link nos materiais deste item) o trecho de «{TT}» (~%d min), reforçando o que viu na aula.' % m
    if k == 'D':
        red = ('escreva 1 redação dissertativa de 25 a 30 linhas, em até 50 min cronometrados, sobre um tema de segurança pública, trânsito '
               'ou atualidades, aplicando a estrutura ensinada pelo professor. Depois, confira introdução, argumentos e conclusão.')
        if it.get('vid'):
            return 'Discursiva (~%d min): {AULAS} (~%d min%s). Em seguida, %s' % (m, it['vmins'], sp, red)
        return 'Discursiva (~%d min): %s' % (m, red[0].upper() + red[1:])
    if k == 'E':
        return ('Revisão semanal do caderno de erros (~%d min): releia os registros da semana, refaça as questões que errou e marque o que já '
                'domina. Se tiver dúvida sobre como usar o caderno, veja o tutorial (link nos materiais deste item).') % m
    raise ValueError(k)


def mats(it, M):
    k = it['kind']
    if k == 'A': return [f'v:{tr}:{o}' for tr, o in it['vids']]
    if k in ('Q1', 'QC', 'QO', 'RV', 'RF'): return [f"q:{it['cad']}"]
    if k == 'L': return ['vm']
    if k == 'R': return [it['mat']]
    if k == 'D': return [f"v:{it['vid'][0]}:{it['vid'][1]}"] if it.get('vid') else []
    if k == 'E': return ['tu']


def rows(course, g):
    M = importlib.import_module(course)
    T = {}
    for line in open(D + f'{course}_t.txt'):
        f = line.split()
        if len(f) >= 4: T[f[1]] = dict(subj=int(f[0]), parent='' if f[2] == '-' else f[2])
    out = json.load(open(D + f'plan_{course}_{g}.json'))
    res = []
    for m in out:
        subjs = []; its = []
        for it in m['items']:
            name = 'Discursiva' if it['kind'] == 'D' else M.SHORT[it['subj']]
            if it['kind'] != 'E' and name not in subjs: subjs.append(name)
            k = it.get('k')
            t8, s8 = '', ''
            if k:
                p = T[k]['parent']
                t8, s8 = (p, k) if p else (k, '')
            k2 = it['kind']
            x = ''
            if k2 == 'A' and it.get('cont'): x = 'P'
            if k2 == 'RV': x = str(it['r'])
            if k2 == 'L': x = it['law']
            if k2 == 'R' and it['mat'].startswith('n:'): k2 = 'RN'
            if k2 == 'D': x = str(it['vmins']) if it.get('vid') else ''
            its.append(dict(spos=it['subj'], t8=t8, s8=s8, n=it.get('q'), code=k2, mins=int(round(it['mins'])), x=x, mats=mats(it, M)))
        if not any('tu' in i['mats'] for i in its):
            its[-1]['mats'] = its[-1]['mats'] + ['tu']
        title = f"Meta {m['num']:02d} – " + ' · '.join(subjs)
        res.append(dict(num=m['num'], title=title, due=m['due'], its=its))
    return M, res


TPL = """with gv(gk, title, due) as (values
<GV>),
iv(gk, pos, spos, t8, s8, code, n, mins, x, mats) as (values
<IV>),
tv(code, name) as (values
<TV>),
gins as (insert into public.goals (course_id, title, status, due_date, target_groups)
  select '<CID>', gv.title, 'published', gv.due::date, array[<G>]::smallint[] from gv
  where not exists (select 1 from public.goals x where x.course_id='<CID>' and x.target_groups=array[<G>]::smallint[] and x.title like split_part(gv.title,' – ',1)||' –%')
  returning id, title),
gl as (select gins.id, gv.gk from gins join gv on gv.title=gins.title),
nr as (select gl.id goal_id, iv.*, s.id subject_id, t.id topic_id, st.id subtopic_id
  from iv join gl on gl.gk=iv.gk
  join public.subjects s on s.course_id='<CID>' and s.position=iv.spos
  left join public.syllabus_topics t on iv.t8<>'' and left(t.id::text,8)=iv.t8 and t.subject_id=s.id
  left join public.syllabus_topics st on iv.s8<>'' and left(st.id::text,8)=iv.s8 and st.subject_id=s.id),
ins as (insert into public.goal_items (goal_id, subject_id, topic_id, subtopic_id, instructions, suggested_questions, position)
  select goal_id, subject_id, topic_id, subtopic_id, case code
   when 'A' then '{AULAS} (~'||mins||' min<SP>). Anotação dirigida: {NOTA}{BLOCO}'||case when x='P' then ' Esta série de aulas continua na próxima meta desta disciplina; as questões de hoje são da parte que você acabou de ver.' else '' end
   when 'Q1' then 'Questões — 1ª resolução de «{TT}»: resolva '||n||' questões no caderno do Qconcursos deste assunto (link nos materiais deste item), sem consultar o material (~'||mins||' min). Estudo reverso: confira o gabarito, leia os comentários das que errou e das que acertou com dúvida e identifique o motivo de cada erro (desatenção, leitura do comando ou conteúdo). Registre no caderno de erros o que faltou.'
   when 'QO' then 'Questões — «{TT}» (assunto estudado direto pelas questões): resolva '||n||' questões no caderno do Qconcursos deste assunto (link nos materiais deste item) (~'||mins||' min). Leia com atenção os comentários de todas as questões, inclusive das que acertar: eles fazem o papel da aula. Registre no caderno de erros as regras e exceções que aprendeu.'
   when 'QC' then 'Questões — «{TT}» (parte vista hoje): resolva '||n||' questões do caderno do Qconcursos deste assunto (link nos materiais deste item) sobre o que você acabou de estudar, sem consultar o material (~'||mins||' min). Faça o estudo reverso das que errar e registre no caderno de erros.'
   when 'RV' then 'Revisão espaçada '||x||' — «{TT}»: antes, releia no caderno de erros os registros deste assunto; depois resolva mais '||n||' questões ainda não resolvidas do caderno do Qconcursos (link nos materiais deste item) (~'||mins||' min) e faça o estudo reverso das que errar.'
   when 'RF' then 'Reforço — «{TT}»: resolva mais '||n||' questões ainda não resolvidas do caderno do Qconcursos deste assunto (link nos materiais deste item) (~'||mins||' min), com estudo reverso das que errar.'
   when 'L' then 'Lei seca (~'||mins||' min): leia no <VADE> (link nos materiais deste item) — '||x||' —, com atenção aos dispositivos tratados nas aulas. Grife prazos, exceções e palavras como "vedado", "salvo" e "somente".'
   when 'R' then 'Leia na apostila em PDF (link nos materiais deste item) o trecho de «{TT}» (~'||mins||' min), reforçando o que viu na aula.'
   when 'RN' then 'Leia o PDF de «{TT}» (link nos materiais deste item) (~'||mins||' min), grifando o que costuma cair em prova.'
   when 'D' then 'Discursiva (~'||mins||' min): '||case when x<>'' then '{AULAS} (~'||x||' min<SP>). Em seguida, escreva' else 'Escreva' end||' 1 redação dissertativa de 25 a 30 linhas, em até 50 min cronometrados, sobre um tema de segurança pública, trânsito ou atualidades, aplicando a estrutura ensinada pelo professor. Depois, confira introdução, argumentos e conclusão.'
   when 'E' then 'Revisão semanal do caderno de erros (~'||mins||' min): releia os registros da semana, refaça as questões que errou e marque o que já domina. Se tiver dúvida sobre como usar o caderno, veja o tutorial (link nos materiais deste item).'
  end, n, pos from nr returning id, goal_id, position),
mt as (select nr.goal_id, nr.pos, x.tok, x.ord from nr cross join lateral unnest(string_to_array(nr.mats, ';')) with ordinality x(tok, ord) where nr.mats<>''),
gim as (insert into public.goal_item_materials (goal_item_id, material_id, position)
  select ins.id, m.id, mt.ord - 1 from ins join mt on mt.goal_id=ins.goal_id and mt.pos=ins.position
  join lateral (select m.id from public.materials m where m.course_id='<CID>' and (
     (split_part(mt.tok,':',1)='v' and m.type='videoaula' and m.description like 'Trilha: '||(select name from tv where tv.code=split_part(mt.tok,':',2))||' | Ordem: '||lpad(split_part(mt.tok,':',3),3,'0')||'%')
  or (split_part(mt.tok,':',1)='q' and m.description like '%Chave: '||split_part(mt.tok,':',2))
  or (split_part(mt.tok,':',1)='a' and m.type='apostila' and m.title='Apostila em PDF' and m.description like 'Trilha: '||(select name from tv where tv.code=split_part(mt.tok,':',2))||'%')
  or (split_part(mt.tok,':',1)='n' and m.description like 'Trilha: NOSSO PDF | Ordem: '||lpad(split_part(mt.tok,':',2),3,'0')||'%')
  or (mt.tok='vm' and m.description ilike 'Trilha: Vade Mecum%')
  or (mt.tok='tu' and m.title='Tutorial: Caderno de Erros (PDF)')) order by m.created_at limit 1) m on true
  returning 1)
select (select count(*) from gins) metas, (select count(*) from ins) itens, (select count(*) from iv) esperados,
 (select count(*) from nr where (t8='' or topic_id is not null) and (s8='' or subtopic_id is not null)) resolvidos,
 (select count(*) from gim) materiais, (select count(*) from mt) mat_esperados"""


def batches(course, g, maxlen=14000):
    M, res = rows(course, g)
    tv = ',\n'.join(f"('{k}','{esc(v)}')" for k, v in M.TR.items())
    out = []; gvs = []; ivs = []; size = 0
    def flush():
        if not gvs: return
        out.append(TPL.replace('<GV>', ',\n'.join(gvs)).replace('<IV>', ',\n'.join(ivs)).replace('<TV>', tv)
                   .replace('<CID>', M.CID).replace('<G>', str(g)).replace('<SP>', ' em 1,5x' if g == 1 else '').replace('<VADE>', esc(M.VADE)))
        gvs.clear(); ivs.clear()
    for r in res:
        gk = str(r['num'])
        gv = f"('{gk}','{esc(r['title'])}','{r['due']}')"
        iv = [f"('{gk}',{p},{i['spos']},'{i['t8']}','{i['s8']}','{i['code']}',{i['n'] or 'null'},{i['mins']},'{esc(i['x'])}','{';'.join(i['mats'])}')"
              for p, i in enumerate(r['its'])]
        add = len(gv) + sum(len(x) + 2 for x in iv)
        if size + add > maxlen: flush(); size = 0
        gvs.append(gv); ivs.extend(iv); size += add
    flush()
    return out


if __name__ == '__main__':
    course = sys.argv[1]
    for g in (1, 2):
        bs = batches(course, g)
        for i, b in enumerate(bs):
            open(D + f'sql_{course}_{g}_{i:02d}.sql', 'w').write(b)
        print(course, g, len(bs), 'lotes', [len(b) for b in bs])
