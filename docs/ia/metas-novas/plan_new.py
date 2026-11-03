"""Planejador das metas dos SGA novos (Metas 06 em diante), regras de docs/ia/09-regras-metas.md.

Uso: python3 plan_new.py <curso> <ultima_meta>
Gera plan_<curso>_<g>.json e sql_<curso>_<g>_NN.sql (lotes) no diretório deste arquivo.
"""
import collections, datetime as dt, importlib, json, math, os, sys

D = os.path.dirname(os.path.abspath(__file__)) + '/'
START = dt.date(2026, 11, 2)          # Meta 01
FIRST = 6                              # primeira meta gerada aqui
CONTENT_END = 85                       # conteúdo novo até ~Meta 85
QMIN = 3
G = {1: dict(budget=180, speed=1.5, notes=1.10, nstreams=2, limit=90, q={'h': 12, 'm': 10, 'l': 8}, cont=6,
             rev=8, lei=20, read=20, errw=15, rlmq=8, disc=60, ref=15),
     2: dict(budget=360, speed=1.0, notes=1.15, nstreams=3, limit=150, q={'h': 20, 'm': 15, 'l': 10}, cont=10,
             rev=15, lei=30, read=30, errw=20, rlmq=10, disc=90, ref=20)}
REV = {'h': [7, 21], 'm': [10, 28], 'l': [21]}


def first5_plan(course):
    src = open(D + 'first5.py').read().replace("TPL = open(D + 'first5.tpl').read()", "TPL = ''")
    ns = {'__name__': 'first5'}
    exec(src, ns)
    return ns['PLAN']


def load(course):
    M = importlib.import_module(course)
    T = {}
    for line in open(D + f'{course}_t.txt'):
        f = line.split()
        if len(f) < 4: continue
        subj, k, parent, imp = int(f[0]), f[1], f[2], f[3]
        T[k] = dict(k=k, subj=subj, parent='' if parent == '-' else parent, imp=imp)
    nbk = set(M.NBK) if isinstance(M.NBK, (list, set)) else set(M.NBK.split())

    def cad_of(k, explicit=None):
        if explicit: return explicit
        if k in M.CAD: return M.CAD[k]
        if k in nbk: return k
        p = T.get(k, {}).get('parent')
        if p: return cad_of(p)
        return None
    # unidades de vídeo
    units = collections.OrderedDict()
    mp = {}
    for line in M.MAP.strip().split('\n'):
        f = line.split()
        tr, rng, k = f[0], f[1], f[2]
        cad = f[3] if len(f) > 3 else None
        a, b = (rng.split('-') + [rng])[:2]
        if cad and k not in M.CAD: M.CAD[k] = cad
        for o in range(int(a), int(b) + 1):
            mp[(tr, o)] = (k, cad_of(k, cad))
    for tr, s in M.V.items():
        if tr == getattr(M, 'DISC', None): continue
        us = []
        for r in s.split(';'):
            o, secs, base = r.split(',')
            o = int(o)
            if (tr, o) not in mp:
                continue
            k, cad = mp[(tr, o)]
            us.append(dict(tr=tr, o=o, secs=int(secs), b=base, k=k, cad=cad, subj=T[k]['subj']))
        units[tr] = us
    disc = []
    if getattr(M, 'DISC', None):
        disc = [dict(o=int(r.split(',')[0]), secs=int(r.split(',')[1])) for r in M.V[M.DISC].split(';')]
    return M, T, units, cad_of, nbk, disc


def plan(course, g, last):
    M, T, units, cad_of, nbk, disc = load(course)
    P = G[g]
    eff = lambda u: u['secs'] / 60 / P['speed'] * P['notes']
    # o que as Metas 01-05 já usaram
    f5 = first5_plan(course)[(course, g)]
    used = set(); finished = {}; partial = set()
    rcount = collections.Counter()
    last_rlm = -99
    for di, day in enumerate(f5):
        for tr, ords, t8, cad, qk, n in day:
            for o in ords: used.add((tr, o))
            if qk == 'Q1': finished[t8] = di
            if T.get(t8, {}).get('subj') == M.RLM: last_rlm = di
    # trilhas -> blocos (séries inteiras; divide só acima do limite)
    blocks = {}
    for tr, us in units.items():
        us = [u for u in us if (tr, u['o']) not in used]
        series = []
        for u in us:
            if series and series[-1]['b'] == u['b'] and series[-1]['k'] == u['k']:
                series[-1]['us'].append(u)
            else:
                series.append(dict(b=u['b'], k=u['k'], us=[u]))
        bl = []
        for se in series:
            tot = sum(eff(u) for u in se['us'])
            if tot <= P['limit'] or len(se['us']) == 1:
                bl.append(dict(k=se['k'], us=se['us'], mins=tot, part=None)); continue
            n = min(math.ceil(tot / P['limit']), len(se['us']))
            target = tot / n; cur = []; acc = 0; parts = []
            for u in se['us']:
                if cur and acc + eff(u) > target * 1.15 and len(parts) < n - 1:
                    parts.append(cur); cur = []; acc = 0
                cur.append(u); acc += eff(u)
            parts.append(cur)
            for i, p in enumerate(parts):
                bl.append(dict(k=se['k'], us=p, mins=sum(eff(u) for u in p), part=(i + 1, len(parts))))
        if bl: blocks[tr] = bl
    total = {s: sum(b['mins'] for b in bl) for s, bl in blocks.items()}
    done = {s: 0.0 for s in blocks}; ptr = {s: 0 for s in blocks}
    remaining_k = collections.Counter(b['k'] for bl in blocks.values() for b in bl)
    video_cads = {u['cad'] for us in units.values() for u in us}
    # assuntos sem aula -> só questões (unidade = tópico com caderno)
    skip = set(getattr(M, 'SKIP', set()))
    qonly = []
    for k, t in T.items():
        c = cad_of(k)
        if not c or c in video_cads or c in skip or k in skip: continue
        if t['parent'] and cad_of(t['parent']) == c: continue   # usa o tópico-pai
        if any(q['cad'] == c for q in qonly): continue
        if k in finished: continue
        qonly.append(dict(k=k, cad=c, imp=t['imp'], subj=t['subj']))
    order = {'h': 0, 'm': 1, 'l': 2}
    qonly.sort(key=lambda q: (order[q['imp']], q['subj']))
    due = []
    for k, d in finished.items():
        for r, off in enumerate(REV[T[k]['imp']], 1):
            due.append(dict(day=d + off, prio=2, kind='rev', k=k, r=r))
    # lei seca dos assuntos das Metas 01-07 vai para as Metas 08-14
    law_backlog = [k for k in finished if law_of(M, k, cad_of)]
    out = []
    dcount = 0
    nd = last
    for di in range(FIRST - 1, last):
        num = di + 1
        date = START + dt.timedelta(days=di)
        items = []
        left = P['budget'] - 10
        sunday = date.isoweekday() == 7
        saturday = date.isoweekday() == 6
        if sunday: left -= P['errw']
        do_disc = bool(disc) and saturday and dcount < len(disc) + 20
        if do_disc: left -= P['disc']
        # ---- aulas ----
        avail = [s for s in blocks if ptr[s] < len(blocks[s])]
        frac = min(1.0, (num - FIRST + 1) / (CONTENT_END - FIRST + 1))
        lag = sorted(avail, key=lambda s: -((total[s] * frac - done[s]) / max(total[s], 1)))
        cont_first = [s for s in avail if blocks[s][ptr[s]]['part'] and blocks[s][ptr[s]]['part'][0] > 1]
        chosen = []
        for s in cont_first + lag:
            if s not in chosen: chosen.append(s)
            if len(chosen) == P['nstreams']: break
        vb = left * 0.80
        day_used = 0; day_topics = []
        for si, s in enumerate(chosen):
            per = (vb - day_used) / (len(chosen) - si)
            if si > 0 and per < 25: continue
            usedm = 0; picked = []
            while ptr[s] < len(blocks[s]):
                b = blocks[s][ptr[s]]
                if b['part'] and picked: break
                fin_after = remaining_k[b['k']] - 1 == 0
                qc = (P['q'][T[b['k']]['imp']] if fin_after else P['cont']) * QMIN
                extra = b['mins'] + (qc if (not picked or picked[-1]['k'] != b['k']) else 0)
                if picked and usedm + extra > per * 1.15: break
                ptr[s] += 1; usedm += extra; day_used += extra; done[s] += b['mins']; remaining_k[b['k']] -= 1
                picked.append(b)
                if b['part']: break
            i = 0
            while i < len(picked):
                k = picked[i]['k']; grp = []
                while i < len(picked) and picked[i]['k'] == k:
                    grp.append(picked[i]); i += 1
                cad = grp[-1]['us'][-1]['cad']
                vids = [(u['tr'], u['o']) for b in grp for u in b['us']]
                mins = sum(b['mins'] for b in grp)
                cont_next = any(b['part'] and b['part'][0] < b['part'][1] for b in grp)
                items.append(dict(kind='A', subj=T[k]['subj'], k=k, vids=vids, mins=mins, cont=cont_next))
                left -= mins
                day_topics.append(k)
                tk = T[k]
                if remaining_k[k] == 0 and k not in finished:
                    finished[k] = di
                    n = P['q'][tk['imp']]
                    items.append(dict(kind='Q1', subj=tk['subj'], k=k, q=n, mins=n * QMIN, cad=cad))
                    if num >= 8 and law_of(M, k, cad_of): due.append(dict(day=di, prio=0, kind='lei', k=k))
                    if num >= 8 and read_of(M, k, cad_of, T): due.append(dict(day=di, prio=1, kind='read', k=k))
                    for r, off in enumerate(REV[tk['imp']], 1):
                        due.append(dict(day=di + off, prio=2, kind='rev', k=k, r=r))
                else:
                    n = P['cont']
                    items.append(dict(kind='QC', subj=tk['subj'], k=k, q=n, mins=n * QMIN, cad=cad))
                left -= n * QMIN
                if tk['subj'] == M.RLM: last_rlm = di
        # ---- lei seca atrasada das Metas 01-07 (Metas 08-14) ----
        if num >= 8 and law_backlog and left >= P['lei']:
            k = law_backlog.pop(0)
            items.append(dict(kind='L', subj=T[k]['subj'], k=k, mins=P['lei'], law=law_of(M, k, cad_of)))
            left -= P['lei']
        # ---- pendências ----
        today = sorted([x for x in due if x['day'] <= di], key=lambda x: (x['prio'], x['day']))
        for x in today:
            tk = T[x['k']]
            if x['kind'] == 'lei':
                t = P['lei']
                if t > left:
                    if x['day'] < di - 3: due.remove(x)
                    continue
                items.append(dict(kind='L', subj=tk['subj'], k=x['k'], mins=t, law=law_of(M, x['k'], cad_of)))
            elif x['kind'] == 'read':
                if di - x['day'] > 3: due.remove(x); continue
                t = min(P['read'], left)
                if t < 15: continue
                items.append(dict(kind='R', subj=tk['subj'], k=x['k'], mins=t, mat=read_of(M, x['k'], cad_of, T)))
            else:
                if di - x['day'] > 7: due.remove(x); continue
                n = P['rev']; t = n * QMIN
                if t > left:
                    n = int(left // QMIN)
                    if n < 6: continue
                    t = n * QMIN
                items.append(dict(kind='RV', subj=tk['subj'], k=x['k'], q=n, r=x['r'], mins=t, cad=cad_of(x['k'])))
                if tk['subj'] == M.RLM: last_rlm = di
            left -= items[-1]['mins']; due.remove(x)
        # ---- RLM a cada no máximo 3 dias ----
        rlm_ks = [k for k in finished if T[k]['subj'] == M.RLM and cad_of(k)]
        if rlm_ks and di - last_rlm >= 3:
            k = sorted(rlm_ks, key=lambda k: (rcount[k], -finished[k]))[0]
            n = P['rlmq']
            items.append(dict(kind='RF', subj=M.RLM, k=k, q=n, mins=n * QMIN, cad=cad_of(k)))
            left -= n * QMIN; rcount[k] += 1; last_rlm = di
        # ---- assunto sem aula: só questões (um por meta) ----
        if qonly and left >= P['q']['m'] * QMIN:
            pick = None
            for q in qonly:
                nosso = getattr(M, 'NOSSO', {}).get(q['k']) or getattr(M, 'NOSSO', {}).get(q['cad'])
                if nosso and num < 8: continue      # leitura do PDF só a partir da Meta 08
                pick = q; break
            if pick:
                qonly.remove(pick)
                k = pick['k']; n = P['q'][pick['imp']]
                nosso = getattr(M, 'NOSSO', {}).get(k) or getattr(M, 'NOSSO', {}).get(pick['cad'])
                if nosso and num >= 8 and left >= n * QMIN + P['read']:
                    items.append(dict(kind='R', subj=pick['subj'], k=k, mins=P['read'], mat=f'n:{nosso}'))
                    left -= P['read']
                items.append(dict(kind='QO', subj=pick['subj'], k=k, q=n, mins=n * QMIN, cad=pick['cad']))
                left -= n * QMIN
                finished[k] = di
                if num >= 8 and law_of(M, k, cad_of): due.append(dict(day=di + 1, prio=0, kind='lei', k=k))
                for r, off in enumerate(REV[pick['imp']], 1):
                    due.append(dict(day=di + off, prio=2, kind='rev', k=k, r=r))
        # ---- sobra: reforço ----
        used_today = {it['k'] for it in items}
        for _ in range(4):
            if left < 30: break
            pool = [k for k in finished if k not in used_today and cad_of(k)]
            if not pool: break
            subj_today = {it['subj'] for it in items}
            pool.sort(key=lambda k: (rcount[k] // 2 + order[T[k]['imp']], T[k]['subj'] in subj_today, rcount[k]))
            k = pool[0]
            n = int(min(left // QMIN, P['ref']))
            if n < 8: break
            items.append(dict(kind='RF', subj=T[k]['subj'], k=k, q=n, mins=n * QMIN, cad=cad_of(k)))
            left -= n * QMIN; rcount[k] += 1; used_today.add(k)
            if T[k]['subj'] == M.RLM: last_rlm = di
        if not any(it.get('cad') for it in items):
            k = sorted([k for k in finished if cad_of(k)], key=lambda k: rcount[k])[0]
            items.append(dict(kind='RF', subj=T[k]['subj'], k=k, q=10, mins=30, cad=cad_of(k))); rcount[k] += 1
        if do_disc:
            if dcount < len(disc):
                v = disc[dcount]; vm = v['secs'] / 60 / P['speed']
                items.append(dict(kind='D', subj=1, k=None, mins=P['disc'], vid=(M.DISC, v['o']), vmins=round(vm)))
            else:
                items.append(dict(kind='D', subj=1, k=None, mins=P['disc'], vid=None, vmins=0))
            dcount += 1
        if sunday:
            items.append(dict(kind='E', subj=items[0]['subj'], k=None, mins=P['errw']))
        out.append(dict(num=num, due=date.isoformat(), items=items, minutes=P['budget'] - left))
    leftover = {s: len(blocks[s]) - ptr[s] for s in blocks if ptr[s] < len(blocks[s])}
    return out, leftover, len(qonly), M, T, cad_of


def law_of(M, k, cad_of):
    return M.LAW.get(k) or M.LAW.get(cad_of(k) or '')


def read_of(M, k, cad_of, T):
    nosso = getattr(M, 'NOSSO', {})
    if k in nosso: return f'n:{nosso[k]}'
    c = cad_of(k)
    if c in nosso: return f'n:{nosso[c]}'
    ap = getattr(M, 'APOST_T', {}).get(k) or getattr(M, 'APOST', {}).get(T[k]['subj'])
    return f'a:{ap}' if ap else None


def check(out, M):
    errs = []
    for m in out:
        its = m['items']
        if not any(it.get('cad') for it in its): errs.append((m['num'], 'sem caderno'))
        if any(it['subj'] == M.RLM and it['kind'] == 'A' for it in its) and not any(it['subj'] == M.RLM and it.get('cad') for it in its):
            errs.append((m['num'], 'RLM sem caderno'))
        if m['num'] < 8 and any(it['kind'] in ('L', 'R') for it in its): errs.append((m['num'], 'leitura antes da Meta 08'))
        for it in its:
            if it.get('q') and not it.get('cad'): errs.append((m['num'], 'questões sem caderno', it['k']))
    return errs


if __name__ == '__main__':
    course, last = sys.argv[1], int(sys.argv[2])
    sys.path.insert(0, D)
    for g in (1, 2):
        out, leftover, nq, M, T, cad_of = plan(course, g, last)
        mins = [m['minutes'] for m in out]
        print(course, f'G{g}', len(out), 'metas | min', round(min(mins)), 'máx', round(max(mins)), 'média', round(sum(mins) / len(mins)),
              '| trilhas restantes', leftover, '| só questões restantes', nq)
        print('  erros', check(out, M)[:10])
        json.dump(out, open(D + f'plan_{course}_{g}.json', 'w'), ensure_ascii=False, default=str)
