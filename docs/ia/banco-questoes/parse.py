"""Separa as questões das provas extraídas por cols.py. Saída: q_<exame>.json
Cada questão: n, page, section, context (texto/comando anterior), stem, alts {A..E}."""
import re, json, sys

CFG = {
    'pmpe': dict(qre=r'^\*\*(\d{1,2})\*\*$', alt=r'^\((?P<k>[A-E])\)\s*', start=r'\*\*BLOCO I\*\*',
                 noise=[r'^§?(__)?(PMPE|INSTITUTO AOCP)(__)?$', r'^§?SOLDADO DA POLÍCIA MILITAR$', r'^§?Tipo 01 – Página \d+$',
                        r'^§?\*\*BLOCO I+\*\*$']),
    'gmf': dict(qre=r'^§?\*\*(\d{1,2})\.\s?(\*\*)?', alt=r'^\*\*(__)?\((?P<k>[A-E])\) (__)?\*\*(__)?', start=r'CONHECIMENTOS COMUNS',
                noise=[r'^§?\*\*GUARDA MUNICIPAL – TIPO A\*\*$', r'^§?\*\*CONHECIMENTOS (COMUNS|ESPECÍFICOS)\*\*$', r'^§?\*\*RASCUNHO\*\*$']),
    'ppce': dict(qre=r'^§?\*\*(\d{1,2})\.\s?(\*\*)?', alt=r'^§?\*\*(__)?\((?P<k>[A-E])\) (__)?\*\*(__)?', start=r'CONHECIMENTOS COMUNS', stop=r'PROVA DISCURSIVA',
                 noise=[r'^§?\*\*POLICIAL PENAL – TIPO B\*\*$', r'^§?\*\*CONHECIMENTOS (COMUNS|ESPECÍFICOS)\*\*$', r'^§?\*\*RASCUNHO\*\*$']),
    'cfo': dict(qre=r'^§?\*\*(\d{1,3})\.\s?(\*\*)?', alt=r'^§?\*\*(__)?(?P<k>[A-E])\) (__)?\*\*(__)?', start=r'LÍNGUA PORTUGUESA / INTERPRETAÇÃO',
                noise=[r'^§?~ \d+ ~$', r'^§?\*\*CARGO: 2º TENENTE QOPM DA POLÍCIA MILITAR – TIPO B\*\*$', r'^§?\*\*__RASCUNHO__\*\*$']),
    'pmce': dict(qre=r'^§?\*\*(\d{2,3})\.\s?(\*\*)?', alt=r'^§?(?P<k>[A-E])\) ', start=r'^§?\*\*(__)?LÍNGUA PORTUGUESA(__)?\*\*$',
                 noise=[r'^§?GOVERNO DO ESTADO DO CEARÁ – FUNDAÇÃO', r'^§?CONCURSO PÚBLICO PARA O CARGO DE SOLDADO', r'^§?PROVA OBJETIVA REALIZADA EM',
                        r'^§?O número do gabarito deste caderno de prova é 1\.$', r'^§?\*\*R A S C U N H O\*\*$', r'^§?\(SE NECESSÁRIO, UTILIZE TAMBÉM', r'^§?CADERNO DE PROVA PARA RASCUNHO', r'^§?Página (\*\*)?\d+']),
}
SECTION = r'^§?\*\*(__)?[A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇ ,/–-]{5,}(__)?\*\*$'

def parse(name):
    cfg = CFG[name]
    lines = open(f'c_{name}.txt').read().splitlines()
    page, started, out, cur, ctx, section = 0, False, [], None, [], ''
    expect = 1
    pend_section = ''
    split_re = {'gmf': r'(?=\*\*(?:__)?\([B-E]\) )', 'ppce': r'(?=\*\*(?:__)?\([B-E]\) )',
                'cfo': r'(?=\*\*(?:__)?[B-E]\) )', 'pmpe': r'(?=\([B-E]\) )', 'pmce': r'(?<=\S )(?=[B-E]\) )'}[name]
    expanded = []
    for raw in lines:
        parts = re.split(split_re, raw)
        if len(parts) > 1 and parts[0].strip() and re.match(r'^§?(\*\*)?(__)?\(?A\)|^§?(\*\*)?(__)?\(?[A-E]\)', parts[0].lstrip('§*_')+'' ) is None and not re.search(r'\(?A\) ', parts[0]):
            expanded.append(raw)
        else:
            expanded.extend(p for p in parts if p.strip())
    lines = expanded
    for raw in lines:
        m = re.match(r'^=====PAGE (\d+)=====', raw)
        if m:
            page = int(m.group(1)); continue
        if raw.startswith('-----') or not raw.strip():
            continue
        if not started:
            if re.search(cfg['start'], raw):
                started = True
                section = re.sub(r'[*_§]', '', raw).strip()
            continue
        if cfg.get('stop') and re.search(cfg['stop'], raw):
            break
        if name != 'pmpe' and re.match(r'^§?\*\*\d{1,2}\*\*$', raw):
            continue
        hm = re.match(r'^§?\*\*(Língua Portuguesa|Raciocínio Lógico|Legislação Específica|Conhecimentos [A-Za-zçá ]+|[A-Z][a-zçãéíóúâêô]+( [a-zA-Zçãéíóúâêô]+){0,5})\*\*$', raw)
        if hm and name in ('ppce', 'gmf') and (cur is None or cur['alts']):
            if cur: out.append(cur); cur = None
            section = hm.group(1); ctx = []
            continue
        if any(re.search(p, raw) for p in cfg['noise']):
            continue
        line = raw
        full = line.startswith('§')
        body = line.lstrip('§')
        if re.match(SECTION, line):
            sec = re.sub(r'[*_§]', '', body).strip()
            # títulos de duas linhas ("NOÇÕES DE ADMINISTRAÇÃO PÚBLICA /" + "ÉTICA...")
            if pend_section.endswith('/') or section.endswith('/'):
                section = (section if section.endswith('/') else pend_section) + ' ' + sec
            else:
                section = sec
            pend_section = section
            if cur: out.append(cur); cur = None
            ctx = []
            continue
        qm = re.match(cfg['qre'], line)
        if qm and int(qm.group(1)) == expect:
            if cur: out.append(cur)
            cur = dict(n=expect, page=page, section=section, context='\n'.join(ctx).strip(), stem=[], alts={}, last=None, full=full)
            expect += 1
            rest = re.sub(cfg['qre'], '', line).strip()
            if rest: cur['stem'].append(rest)
            continue
        am = re.match(cfg['alt'], body)
        if cur and am:
            k = am.group('k')
            if (not cur['alts'] and k == 'A') or (cur['alts'] and ord(k) == ord(max(cur['alts'])) + 1):
                cur['alts'][k] = [body[am.end():].strip()]
                cur['last'] = k
                continue
        if cur and cur['last']:
            # a última alternativa termina em linha de largura total, linha toda em negrito ou início de texto
            ends = (full and not cur['full']) or (body.startswith('**') and body.endswith('**') and not re.match(r'^\*\*\(?[A-E]\)', body)) \
                or re.match(r'^(Texto|TEXTO)\b', body) or (name == 'pmce' and re.match(r'^\d{2} \S', body))
            nxt_is_last = cur['last'] == max('ABCDE'[:5])
            if ends:
                out.append(cur); cur = None; ctx = [body]
                continue
            cur['alts'][cur['last']].append(body)
            continue
        if cur and not cur['alts']:
            cur['stem'].append(body)
            continue
        ctx.append(body)
    if cur: out.append(cur)
    for q in out:
        q['stem'] = '\n'.join(q['stem']).strip()
        q['alts'] = {k: ' '.join(v).strip() for k, v in q['alts'].items()}
        q.pop('last', None); q.pop('full', None)
    return out

if __name__ == '__main__':
    for name in sys.argv[1:]:
        qs = parse(name)
        json.dump(qs, open(f'q_{name}.json', 'w'), ensure_ascii=False, indent=1)
        nums = [q['n'] for q in qs]
        bad = [q['n'] for q in qs if len(q['alts']) not in (4, 5)]
        longalt = [(q['n'], k, len(v)) for q in qs for k, v in q['alts'].items() if len(v) > 450]
        print(name, len(qs), 'última', nums[-1] if nums else None, 'alts ruins', bad, 'alts longas', longalt[:10])
        print('  seções:', sorted({q['section'] for q in qs}))
