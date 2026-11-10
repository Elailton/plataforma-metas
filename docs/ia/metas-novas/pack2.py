"""Empacota unidades nas Metas 51-90.
units: 'key,sp,mins,parent' ; main = M*/Q*, filler = L*/V* (parent = M*).
anchors: {meta: mins}; cap; maxs = disciplinas por meta; end = última meta de conteúdo desejada.
"""
import collections, json, sys

def pack(units, anchors, cap, maxs, first=51, last=90, end=86, tol=8, vdelay=7, hi=None, fin=10, reserve=0):
    mains = collections.OrderedDict(); fill = []
    for u in units:
        k, sp, m, par = u.split(',')
        sp, m = int(sp), int(m)
        if k[0] in 'MQ': mains.setdefault(sp, []).append((k, m))
        else: fill.append((k, sp, m, par))
    # lei seca vai junto da aula (mesma meta)
    lk = {par: (k, m) for k, sp, m, par in fill if k[0] == 'L'}
    fill = [f for f in fill if f[0][0] != 'L']
    for sp in mains:
        mains[sp] = [(k, m + lk[k][1]) if k in lk else (k, m) for k, m in mains[sp]]
    load = {n: anchors.get(n, 0) for n in range(first, last + 1)}
    subj = {n: set() for n in load}
    order = {n: [] for n in load}
    where = {}
    tot = {sp: sum(m for _, m in q) for sp, q in mains.items()}
    left = dict(tot)
    q = {sp: list(v) for sp, v in mains.items()}
    for n in range(first, last + 1):
        span = max(1, end - n + 1)
        while True:
            # disciplina mais atrasada: maior carga restante por meta restante
            cands = [sp for sp in q if q[sp] and (sp in subj[n] or len(subj[n]) < maxs)]
            cands = [sp for sp in cands if load[n] + q[sp][0][1] <= cap - reserve + tol]
            if not cands:
                cands = [sp for sp in q if q[sp] and q[sp][0][1] <= 40 and load[n] + q[sp][0][1] <= cap - reserve + tol and len(subj[n]) < maxs + 1]
            if not cands: break
            # evita repetir a mesma disciplina 2x na meta se outra cabe
            sp = max(cands, key=lambda s: (left[s] / span) - (40 if s in subj[n] else 0))
            k, m = q[sp].pop(0)
            load[n] += m; subj[n].add(sp); order[n].append(k); where[k] = n; left[sp] -= m
            if k in lk: order[n].append(lk[k][0]); where[lk[k][0]] = n
    rest = [k for sp in q for k, _ in q[sp]]
    # fillers
    lostf = []
    for k, sp, m, par in fill:
        p = where.get(par)
        if p is None: lostf.append(k); continue
        start = p + (vdelay if k[0] == 'V' else 0)
        ok = False
        for n in range(start, last + 1):
            if load[n] + m <= cap + (tol if k[0] == 'L' else 0) and (sp in subj[n] or len(subj[n]) < maxs + 1):
                load[n] += m; subj[n].add(sp); order[n].append(k); where[k] = n; ok = True; break
        if not ok: lostf.append(k)
    # revisão final nas metas com folga, após a última aula
    lastmain = max([where[k] for sp in mains for k, _ in mains[sp] if k in where] or [first])
    finr = []
    if hi:
        i = 0
        for n in range(first, last + 1):
            if n <= lastmain - 6: continue
            while load[n] + 3 * fin <= cap and i < 10 * len(hi):
                t = hi[i % len(hi)]; i += 1
                finr.append((t, n, len(order[n]))); order[n].append('F' + t); load[n] += 3 * fin
    rows = [(k, n, i) for n in order for i, k in enumerate(order[n]) if k[0] != 'F']
    return dict(rows=rows, fin=finr, load=load, rest=rest, lostf=lostf, lastmain=lastmain, nsubj={n: len(subj[n]) for n in subj})

if __name__ == '__main__':
    pass
