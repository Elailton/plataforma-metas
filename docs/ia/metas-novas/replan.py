"""Replanejamento das metas futuras (PMPE e GMF) com as regras de 29/10/2026.

Regras aplicadas:
- série de aulas (mesmo título, partes 01, 02...) inteira na mesma meta; só divide se passar do limite
  (G1 90 min efetivos, G2 150 min), em metas seguidas da disciplina, sem juntar com outra série dividida;
- toda aula é seguida, na mesma meta, de questões do assunto no caderno do Qconcursos (link no item);
- toda meta tem caderno; RLM com caderno sempre que aparece e prática a cada no máximo 3 dias;
- lei seca (Vade Mecum) e leitura de apostila a partir da Meta 08;
- importância (incidência) define questões e revisões espaçadas.
"""
import json, math, sys, collections

D = '/tmp/claude-0/-home-claude/8d713a03-ff74-5cd2-ac85-66de37e61b39/scratchpad/replan/'

GROUPS = {1: dict(budget=180, speed=1.5, notes=1.10, nstreams=2, vshare=0.86, limit=90,
                  q={'h': 12, 'm': 10, 'l': 8}, cont=6, rev=8, lei=20, read=20, errw=15, rlmq=8),
          2: dict(budget=360, speed=1.0, notes=1.15, nstreams=3, vshare=0.72, limit=150,
                  q={'h': 20, 'm': 15, 'l': 10}, cont=10, rev=15, lei=30, read=30, errw=20, rlmq=10)}
REV = {'h': [7, 21], 'm': [10, 28], 'l': [21]}
QMIN = 3

COURSES = {
 'gmf': dict(cid='3f595180-4648-4f76-94e7-eb2ef88572bd', start='2026-10-30', vade='314a5a6e', vade_name='Vade Mecum GMF',
             tutorial='3108cc0f', rlm=2,
             short={1: 'Português', 2: 'Rac. Lógico', 3: 'Informática', 4: 'Atualidades', 5: 'Fortaleza', 6: 'Dir. Administrativo',
                    7: 'Dir. Constitucional e DH', 8: 'Dir. Penal e Proc. Penal', 9: 'Legislação'},
             law={'c02dfaf3': 'Constituição Federal, arts. 5º a 11', 'de0637fd': 'Constituição Federal, arts. 14 a 16',
                  'e354dc5d': 'Constituição Federal, arts. 18 a 31 e 37 a 41', '9bba169b': 'Constituição Federal, art. 144',
                  '8437ceb8': 'Constituição Federal, arts. 182 e 183', '74f6b977': 'Constituição Federal, arts. 226 a 230',
                  '2bbc99b5': 'Constituição Federal, arts. 1º a 4º',
                  '638b5018': 'Código Penal, arts. 13 a 25', 'b4ffb7bb': 'Código Penal, arts. 121 a 183',
                  '52608bff': 'Código Penal, arts. 213 a 218-C', '2ef366a9': 'Código Penal, arts. 289 a 311',
                  'af3416a8': 'Código Penal, arts. 312 a 337-A', '2d7b3efd': 'Código de Processo Penal, arts. 4º a 23',
                  '6dd100a4': 'Código de Processo Penal, arts. 155 a 157', 'd1b959b7': 'Código de Processo Penal, arts. 158 a 184',
                  '8a63bca8': 'Código de Processo Penal, arts. 240 a 250', '4dbefeb0': 'Código de Processo Penal, arts. 282 a 310',
                  '6f61ed7e': 'Lei nº 13.022/2014 (Estatuto Geral das Guardas Municipais)', 'b1aa3f44': 'Lei nº 11.343/2006 (Lei de Drogas)',
                  '898e5b1d': 'Lei nº 7.716/1989', '183b0d78': 'Lei nº 8.069/1990 (ECA)', '926ffd43': 'Lei nº 9.605/1998',
                  '4e68b093': 'Lei nº 9.503/1997 (CTB)', '6936e79b': 'Lei nº 10.826/2003 (Estatuto do Desarmamento)',
                  'bec27896': 'Lei nº 11.340/2006 (Maria da Penha)', 'bcd8a70b': 'Lei nº 13.869/2019 (Abuso de Autoridade)',
                  'b3177378': 'Lei Orgânica do Município de Fortaleza, arts. 1º a 9º e 98 a 123',
                  'cda7d23b': 'Lei Municipal nº 6.794/1990 (Estatuto dos Servidores de Fortaleza)'}),
 'pmpe': dict(cid='fec9bb24-aaab-41ce-a98b-a039c3905ee2', start='2026-10-30', vade='2d021d59', vade_name='Vade Mecum PMPE',
              tutorial='e1203751', rlm=2,
              short={0: 'Português', 1: 'Hist. PE', 2: 'Rac. Lógico', 3: 'Informática', 4: 'Dir. Constitucional', 5: 'DH e Legislação', 6: 'Discursiva'},
              law={'3a2ce693': 'Constituição Federal, arts. 1º a 4º', 'a40fcdda': 'Constituição Federal, art. 5º',
                   '907d60cd': 'Constituição Federal, art. 5º', '50ef24ad': 'Constituição Federal, art. 5º, incisos LXVIII a LXXIII',
                   'cd7197c7': 'Constituição Federal, arts. 6º a 11', '0a1396a9': 'Constituição Federal, arts. 12 e 13',
                   'ab064c79': 'Constituição Federal, arts. 14 a 16', '9fc30c28': 'Constituição Federal, arts. 5º a 16',
                   '364fadcc': 'Constituição Federal, arts. 18 e 19', '43475a70': 'Constituição Federal, arts. 20 a 31',
                   '8d5ee278': 'Constituição Federal, arts. 21 a 24 e 30', '1556d99a': 'Constituição Federal, arts. 37 e 38',
                   '8b292f80': 'Constituição Federal, arts. 39 a 41', '302648ea': 'Constituição Federal, art. 42',
                   'ed5a5073': 'Constituição Federal, arts. 18 a 42', 'd888167e': 'Constituição Federal, arts. 44 a 75',
                   '6712c13d': 'Constituição Federal, arts. 76 a 91', '5ff3f919': 'Constituição Federal, arts. 92 a 126',
                   '4beff898': 'Constituição Federal, arts. 127 a 135', '6a3738df': 'Constituição Federal, arts. 44 a 135',
                   'a09b3732': 'Constituição Federal, arts. 136 a 141', 'b9e5cd6b': 'Constituição Federal, arts. 136 a 144',
                   '9ccee260': 'Constituição Federal, arts. 136 a 144',
                   'fbf742b9': 'Lei Estadual nº 6.783/1974 (Estatuto dos Policiais Militares de Pernambuco)',
                   '0a4b6ef4': 'Lei nº 8.069/1990 (ECA)', '1981e5a8': 'Lei nº 8.069/1990 (ECA), arts. 1º a 69',
                   'c6175f9e': 'Lei nº 8.069/1990 (ECA), arts. 103 a 128', '1871edd8': 'Lei nº 8.069/1990 (ECA), arts. 103 a 128',
                   'ce362705': 'Lei nº 8.069/1990 (ECA), arts. 131 a 140', '0a64f639': 'Lei nº 8.069/1990 (ECA), arts. 225 a 258-C',
                   'e681dda9': 'Lei nº 13.869/2019 (Abuso de Autoridade)', '2d9b1d00': 'Lei nº 9.455/1997 (Lei de Tortura)',
                   '2431e58e': 'Lei nº 11.340/2006 (Maria da Penha)', 'b5144e1f': 'Lei nº 7.716/1989',
                   '4a6341a4': 'Lei nº 9.605/1998 (Crimes Ambientais)', '699ee319': 'Lei nº 8.072/1990 (Crimes Hediondos)',
                   '10bdafd1': 'Lei nº 11.343/2006 (Lei de Drogas)', '5d047ba4': 'Lei nº 10.741/2003 (Estatuto da Pessoa Idosa)',
                   '5d985e7a': 'Lei nº 10.741/2003 (Estatuto da Pessoa Idosa)', 'fcdfea53': 'Lei nº 10.741/2003, arts. 93 a 108',
                   'd8ee5983': 'Lei nº 12.852/2013 (Estatuto da Juventude)',
                   '1674bae8': 'Convenção Americana sobre Direitos Humanos (Decreto nº 678/1992)',
                   '3f33547e': 'Declaração Universal dos Direitos Humanos', 'b2275eb3': 'Constituição Federal, art. 5º, §§ 2º a 4º'}),
}


def load(course):
    C = COURSES[course]
    meta = open(D + f'{course}_meta.txt', encoding='utf-8').read().split('\n')
    sec = None; topics = {}; goals = {1: [], 2: []}; past = {1: {}, 2: {}}
    for line in meta:
        if line.startswith('#TOPICS'): sec = 'T'; continue
        if line.startswith('#GOALS'): sec = 'G'; continue
        if line.startswith('#PAST'): sec = 'P'; continue
        if not line.strip(): continue
        if sec == 'T':
            f = line.split('|')
            if course == 'gmf':
                k, subj, imp, cad, _lei, apost, _n, title = f; parent = ''
            else:
                k, parent, subj, imp, cad, apost, title = f
            topics[k] = dict(k=k, parent=parent, subj=int(subj), imp=imp, cad=[c for c in cad.split(',') if c],
                             apost=[a for a in apost.split(',') if a], title=title)
        elif sec == 'G':
            for g in line.split(';'):
                grp, di, gid, num, fixed = g.split(',')
                fx = []
                for f in fixed.split('/'):
                    if f:
                        iid, kind, mins = f.split(':'); fx.append(dict(iid=iid, kind=kind, mins=int(mins)))
                goals[int(grp)].append(dict(di=int(di), gid=gid, num=int(num), fixed=fx))
        elif sec == 'P':
            for p in line.split(';'):
                grp, k, di = p.split(','); past[int(grp)][k] = int(di)
    # importância de subtópico 'x' -> do pai
    for t in topics.values():
        if t['imp'] == 'x':
            t['imp'] = topics.get(t['parent'], {}).get('imp', 'm')
            if t['imp'] == 'x': t['imp'] = 'm'
    # cadernos: subtópico sem caderno herda do pai; tópico sem caderno usa os dos filhos
    for t in topics.values():
        if not t['cad'] and t['parent'] and topics.get(t['parent'], {}).get('cad'):
            t['cad'] = list(topics[t['parent']]['cad'])
    for t in topics.values():
        if not t['cad']:
            ch = [c for x in topics.values() if x['parent'] == t['k'] for c in x['cad']]
            t['cad'] = sorted(set(ch))[:6]
    for t in topics.values():
        if not t['apost'] and t['parent'] and topics.get(t['parent'], {}).get('apost'):
            t['apost'] = list(topics[t['parent']]['apost'])
    vids = {}
    for g in (1, 2):
        rows = []
        for r in open(D + f'{course}_v{g}.txt').read().strip().split(';'):
            di, pos, t8, s8, v8, secs, b = r.split(',')
            rows.append(dict(di=int(di), pos=int(pos), t=t8, s=s8, k=s8 or t8, v=v8, secs=int(secs) or 1500, b=b))
        vids[g] = rows
    return C, topics, goals, past, vids


def plan(course, g):
    C, T, goals, past, vids = load(course)
    G = GROUPS[g]
    days = sorted(goals[g], key=lambda x: x['di'])
    N = len(days)
    rows = vids[g]
    last_video_day = max(r['di'] for r in rows)

    def eff(r): return r['secs'] / 60 / G['speed'] * G['notes']

    # trilhas por disciplina, na ordem atual
    streams = collections.OrderedDict()
    for r in rows:
        s = T[r['k']]['subj']
        streams.setdefault(s, []).append(r)
    # junta as partes de uma mesma série (mesmo título-base e assunto) na posição da primeira parte
    for s in list(streams):
        order = collections.OrderedDict()
        for u in streams[s]:
            order.setdefault((u['k'], u['b']), []).append(u)
        streams[s] = [u for us in order.values() for u in us]
    # séries -> blocos (divididos só se passarem do limite)
    blocks = {}
    for s, us in streams.items():
        series = []
        for u in us:
            if series and series[-1]['b'] == u['b'] and series[-1]['k'] == u['k']:
                series[-1]['us'].append(u)
            else:
                series.append(dict(b=u['b'], k=u['k'], us=[u]))
        bl = []
        for se in series:
            tot = sum(eff(u) for u in se['us'])
            if tot <= G['limit'] or len(se['us']) == 1:
                bl.append(dict(k=se['k'], us=se['us'], mins=tot, part=None))
            else:
                n = math.ceil(tot / G['limit']); n = min(n, len(se['us']))
                # divide em n partes de duração parecida, sem quebrar vídeos
                target = tot / n; cur = []; acc = 0; parts = []
                for u in se['us']:
                    if cur and acc + eff(u) > target * 1.15 and len(parts) < n - 1:
                        parts.append(cur); cur = []; acc = 0
                    cur.append(u); acc += eff(u)
                parts.append(cur)
                for i, p in enumerate(parts):
                    bl.append(dict(k=se['k'], us=p, mins=sum(eff(u) for u in p), part=(i + 1, len(parts))))
        blocks[s] = bl
    total = {s: sum(b['mins'] for b in bl) for s, bl in blocks.items()}
    done = {s: 0.0 for s in blocks}; ptr = {s: 0 for s in blocks}
    remaining_k = collections.Counter(b['k'] for bl in blocks.values() for b in bl)

    due = []   # pendências: dict(day, prio, kind, k, ...)
    finished = dict()  # k -> dia (negativo = passado)
    for k, d in past[g].items():
        if k in T and remaining_k[k] == 0:
            finished[k] = d
            for r, off in enumerate(REV[T[k]['imp']], 1):
                dd = d + off
                if 0 <= dd < N: due.append(dict(day=dd, prio=2, kind='rev', k=k, r=r))
    last_rlm = -99
    rcount = collections.Counter()
    out = []
    for di, day in enumerate(days):
        items = []
        left = G['budget'] - 10
        weekly = (di + 1) < N and ((dt_of(C['start'], di).isoweekday() == 7)) or (di == N - 1)
        if weekly: left -= G['errw']
        for f in day['fixed']:
            left -= f['mins']
        num = day['num']
        # ---- aulas ----
        avail = [s for s in blocks if ptr[s] < len(blocks[s])]
        frac = min(1.0, (di + 1) / (last_video_day + 1))
        lag = sorted(avail, key=lambda s: -((total[s] * frac - done[s]) / max(total[s], 1)))
        # disciplina com série dividida em andamento tem prioridade (continuar na meta seguinte)
        cont_first = [s for s in avail if blocks[s][ptr[s]]['part'] and blocks[s][ptr[s]]['part'][0] > 1]
        chosen = []
        for s in cont_first + lag:
            if s not in chosen: chosen.append(s)
            if len(chosen) == G['nstreams']: break
        vb = left * G['vshare']
        per = vb / max(1, len(chosen))
        day_topics = []
        def qcost(k, fin):
            return (G['q'][T[k]['imp']] if fin else G['cont']) * QMIN
        day_used = 0
        for si, s in enumerate(chosen):
            per = (vb - day_used) / (len(chosen) - si)
            if si > 0 and per < 25:
                continue
            used = 0; picked = []
            while ptr[s] < len(blocks[s]):
                b = blocks[s][ptr[s]]
                if b['part'] and picked:      # parte de série dividida fica sozinha na disciplina
                    break
                fin_after = remaining_k[b['k']] - 1 == 0
                extra = b['mins'] + (qcost(b['k'], fin_after) if (not picked or picked[-1]['k'] != b['k']) else 0)
                if picked and used + extra > per * 1.15:
                    break
                ptr[s] += 1; used += extra; day_used += extra; done[s] += b['mins']; remaining_k[b['k']] -= 1
                picked.append(b)
                if b['part']:
                    break
            # aulas agrupadas por assunto, cada assunto seguido das suas questões
            i = 0
            while i < len(picked):
                k = picked[i]['k']; grp = []
                while i < len(picked) and picked[i]['k'] == k:
                    grp.append(picked[i]); i += 1
                for b in grp:
                    items.append(dict(kind='Aula', subj=s, k=k, mats=[u['v'] for u in b['us']], mins=b['mins'], part=b['part']))
                    left -= b['mins']
                day_topics.append((s, k))
                tk = T[k]; fin = remaining_k[k] == 0 and k not in finished
                if fin:
                    finished[k] = di
                    n = G['q'][tk['imp']]
                    items.append(dict(kind='Q1', subj=s, k=k, q=n, mins=n * QMIN, mats=tk['cad']))
                    if num >= 8 and k in C['law']:
                        due.append(dict(day=di, prio=0, kind='lei', k=k))
                    if num >= 8 and tk['apost']:
                        due.append(dict(day=di, prio=1, kind='read', k=k))
                    for r, off in enumerate(REV[tk['imp']], 1):
                        if di + off < N: due.append(dict(day=di + off, prio=2, kind='rev', k=k, r=r))
                else:
                    n = G['cont']
                    items.append(dict(kind='QC', subj=s, k=k, q=n, mins=n * QMIN, mats=tk['cad']))
                left -= n * QMIN
                if s == C['rlm']: last_rlm = di
        # ---- pendências (lei seca, leitura, revisões) ----
        today = sorted([x for x in due if x['day'] <= di], key=lambda x: (x['prio'], x['day']))
        for x in today:
            tk = T[x['k']]
            if x['kind'] == 'lei':
                t = G['lei']
                if t > left and x['day'] < di - 2: due.remove(x); continue
                if t > left: continue
                items.append(dict(kind='Lei', subj=tk['subj'], k=x['k'], mins=t, mats=[C['vade']], law=C['law'][x['k']]))
            elif x['kind'] == 'read':
                if di - x['day'] > 3: due.remove(x); continue
                t = min(G['read'], left)
                if t < 15: continue
                items.append(dict(kind='Leitura', subj=tk['subj'], k=x['k'], mins=t, mats=tk['apost'][:1]))
            else:
                if di - x['day'] > 7: due.remove(x); continue
                n = G['rev']; t = n * QMIN
                if t > left:
                    n = int(left // QMIN)
                    if n < 8: continue
                    t = n * QMIN
                items.append(dict(kind='Rev', subj=tk['subj'], k=x['k'], q=n, r=x['r'], mins=t, mats=tk['cad']))
                if tk['subj'] == C['rlm']: last_rlm = di
            left -= items[-1]['mins']; due.remove(x)
        # ---- RLM: prática a cada no máximo 3 dias ----
        rlm_ks = [k for k in finished if T[k]['subj'] == C['rlm']] or \
                 [k for (s, k) in day_topics if s == C['rlm']]
        if rlm_ks and di - last_rlm >= 3 and left >= G['rlmq'] * QMIN:
            k = sorted(rlm_ks, key=lambda k: (rcount[k], -finished.get(k, -99)))[0]
            n = G['rlmq']
            items.append(dict(kind='Ref', subj=C['rlm'], k=k, q=n, mins=n * QMIN, mats=T[k]['cad']))
            left -= n * QMIN; rcount[k] += 1; last_rlm = di
        # ---- sobra: reforço (alta incidência primeiro) ----
        used_today = {it['k'] for it in items}
        for _ in range(6):
            if left < 24: break
            pool = [k for k in finished if k not in used_today and T[k]['cad']]
            if not pool: break
            subj_today = {it['subj'] for it in items}
            order = {'h': 0, 'm': 1, 'l': 2}
            pool.sort(key=lambda k: (rcount[k] // 2 + order[T[k]['imp']], T[k]['subj'] in subj_today, rcount[k]))
            k = pool[0]
            n = int(min(left // QMIN, 20 if g == 2 else 15))
            if n < 8: break
            items.append(dict(kind='Ref', subj=T[k]['subj'], k=k, q=n, mins=n * QMIN, mats=T[k]['cad']))
            left -= n * QMIN; rcount[k] += 1; used_today.add(k)
        # garante ao menos um caderno
        if not any(it.get('q') for it in items):
            pool = sorted(finished, key=lambda k: rcount[k])
            if pool:
                k = pool[0]; n = 10
                items.append(dict(kind='Ref', subj=T[k]['subj'], k=k, q=n, mins=n * QMIN, mats=T[k]['cad'])); rcount[k] += 1
        for f in day['fixed']:
            items.append(dict(kind='Fixed', iid=f['iid'], fk=f['kind'], mins=f['mins']))
        out.append(dict(di=di, gid=day['gid'], num=num, items=items, weekly=weekly,
                        minutes=G['budget'] - left))
    leftover = {s: len(blocks[s]) - ptr[s] for s in blocks if ptr[s] < len(blocks[s])}
    pend = [x for x in due]
    return out, leftover, pend, T, C


import datetime as dt
def dt_of(start, di):
    return dt.date.fromisoformat(start) + dt.timedelta(days=di)


def check(course, g, out, T, C):
    """Verifica as regras."""
    errs = []
    G = GROUPS[g]
    seen_series_day = {}
    for m in out:
        its = m['items']
        if not any(it.get('q') for it in its): errs.append((m['num'], 'sem caderno'))
        subs = {it['subj'] for it in its if it['kind'] == 'Aula'}
        if C['rlm'] in subs and not any(it.get('q') and it['subj'] == C['rlm'] for it in its):
            errs.append((m['num'], 'RLM sem caderno'))
        for it in its:
            if it.get('q') and not it['mats']: errs.append((m['num'], 'questões sem caderno', it['k']))
        parts = [it for it in its if it['kind'] == 'Aula' and it['part']]
        for p in parts:
            same = [it for it in its if it['kind'] == 'Aula' and it['subj'] == p['subj']]
            if len(same) > 1: errs.append((m['num'], 'parte dividida junto com outra aula da disciplina'))
    return errs


if __name__ == '__main__':
    for course in ('gmf', 'pmpe'):
        for g in (1, 2):
            out, leftover, pend, T, C = plan(course, g)
            mins = [m['minutes'] for m in out]
            nparts = sum(1 for m in out for it in m['items'] if it['kind'] == 'Aula' and it['part'])
            print(course, f'G{g}', len(out), 'metas', 'min/máx/média', round(min(mins)), round(max(mins)), round(sum(mins) / len(mins)),
                  '| sobras', leftover, '| pend', len(pend), '| partes divididas', nparts)
            print('   erros', check(course, g, out, T, C)[:10])
            json.dump(out, open(D + f'plan_{course}_{g}.json', 'w'), ensure_ascii=False, default=str)
