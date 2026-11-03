"""Monta enunciado final (formato da plataforma) e junta o gabarito. Saída: final_<exame>.json"""
import re, json, sys

KEYS = json.load(open('keys.json'))
REF = re.compile(r'\btexto\b|\(linhas?\b|\blinhas? \d|parágrafo|\btrecho|título|\bautor[a]?\b|tirinha|charge|quadrinho|'
                 r'excerto|fragmento|\btext\b|paragraph|\btexto\b|\bpassage', re.I)

def fix_marks(s):
    s = s.replace('§', '')
    s = re.sub(r'\*\*\*\*', '', s)                 # negrito colado
    s = re.sub(r'__([ \t]+)__', r'\1', s)
    s = re.sub(r'__([^_\n]*?)([ \t]+)__', r'__\1__\2', s)   # espaço antes de fechar sublinhado
    s = re.sub(r'\*\*([^*\n]*?)([ \t]+)\*\*', r'**\1**\2', s)
    s = re.sub(r'\*\*[ \t]*\*\*', '', s)
    s = re.sub(r'____', '', s)
    return s

def unbold_full_lines(lines):
    out = []
    for l in lines:
        t = l.strip()
        if t.startswith('**') and t.endswith('**') and len(t) > 4:
            t = t.replace('**', '')
        out.append(t)
    return out

def reflow(text):
    """Junta linhas quebradas em parágrafos; mantém itens I., II., a), •, e linhas de imagem."""
    lines = [l for l in text.split('\n')]
    paras, cur = [], ''
    for l in lines:
        t = l.strip()
        if not t:
            if cur: paras.append(cur); cur = ''
            continue
        if re.match(r'^(\(?[IVX]{1,4}[.)–-]|[a-e]\)|•|–|\d+[.)] |\[\[imagem|\(\s*\))', t) and cur:
            paras.append(cur); cur = t; continue
        if cur and re.match(r'^(\(?[IVX]{1,4}[.)–-]|[a-e]\)|•|\(\s*\))', cur) and re.match(
                r'^(Assinale|Está|Estão|É correto|É CORRETO|Marque|Sendo assim|Nessas condições|A sequência|A ferramenta|Os componentes|Diante|Com base|Indique|Quais|Qual |Pode-se|Conclui-se|Dessa forma|Assim,|Em relação|Sobre|De acordo|Considerando|Após|Agora|Logo|Nesse|Neste|Com relação|A partir|Portanto|Acerca|Quanto|Lido|Desse modo|Analisando|Os itens|As afirmativas|As assertivas|A alternativa|O item|A opção|Aponte|Identifique|Julgue|Verifica-se|Infere-se|Pode|Podemos|Apresenta|Estaria|Seria|São |É |A tecla)', t):
            paras.append(cur); cur = t; continue
        if not cur:
            cur = t
        elif cur.endswith('-') and not cur.endswith(' -') and re.match(r'^[a-záéíóúâêôãõç]', t):
            cur = cur + t
        else:
            cur = cur + ' ' + t
    if cur: paras.append(cur)
    return '\n'.join(paras)

SECTION_NAMES = re.compile(r'^(Língua Portuguesa|Raciocínio Lógico|Legislação \w+|Noções de .*|Informática|História.*|Conhecimentos .*)$', re.I)

def balance(text):
    out = []
    for line in text.split('\n'):
        for m in ('**', '__'):
            if line.count(m) % 2:
                line = line + m if not line.endswith(m) else m + line
        out.append(line)
    return '\n'.join(out)

def passage(ctx, numbered):
    raw = ctx.split('\n')
    if 'BLOCO I' in raw:
        raw = raw[raw.index('BLOCO I') + 1:]
    ctx = '\n'.join(raw)
    lines = [l for l in unbold_full_lines(ctx.split('\n')) if l and not re.match(r'^(Espaço livre|BLOCO I+|-- PROVA OBJETIVA --)$', l)]
    lines = [l for l in lines if not l.startswith('•') and 'Folha de Respostas' not in l and not SECTION_NAMES.match(l)]
    if numbered:
        return '\n'.join(lines)
    return reflow('\n'.join(lines))

def build(name, numbered_passages):
    qs = json.load(open(f'q_{name}.json'))
    key = {int(k): v for k, v in KEYS[name].items()}
    out = []
    labeled = {}
    heading = ''
    first_of = {}
    for q in qs:
        first_of.setdefault(fix_marks(q.get('context', '')), q['n'])
    for q in qs:
        n = q['n']; k = key[n]
        stem = reflow('\n'.join(unbold_full_lines(fix_marks(q['stem']).split('\n'))))
        ctx = fix_marks(q.get('context', ''))
        cebraspe = name.startswith('prf')
        if cebraspe:
            alts = [{'key': 'A', 'text': 'Certo'}, {'key': 'B', 'text': 'Errado'}]
            k = {'C': 'A', 'E': 'B'}.get(k, k)
        else:
            alts = [{'key': a, 'text': reflow(' '.join(unbold_full_lines(fix_marks(t).split('\n')))).replace('**', '')}
                    for a, t in sorted(q['alts'].items())]
        pieces = []
        whole = stem + ' ' + ' '.join(a['text'] for a in alts) + ' ' + ctx[-400:]
        if ctx.strip():
            # comando do bloco (Cebraspe) ou texto-base
            lines = ctx.strip().split('\n')
            if cebraspe:
                # separa o comando ("julgue os itens") do texto-base
                cmd_start = max((i for i, l in enumerate(lines) if re.match(r'^(Com |Considerando|No que|A respeito|Acerca|Ainda|Tendo|À luz|About|Acerca|Con |Sobre |En |De acuerdo)', l)), default=len(lines))
                base, cmd = '\n'.join(lines[:cmd_start]), reflow('\n'.join(lines[cmd_start:]))
                base = passage(base, False)
                lm = re.match(r'^Texto (\S+)', base)
                if lm: labeled[lm.group(1)] = base
                if not base.strip():
                    for lab, b in labeled.items():
                        if lab in cmd: base = b
                if base.strip():
                    pieces.append('**Texto associado**\n\n' + base)
                if cmd.strip():
                    pieces.append(cmd)
            else:
                clines = [l.strip() for l in ctx.strip().split('\n') if l.strip()]
                heading_only = all(re.fullmatch(r'\*\*[^*]{2,80}\*\*', l) for l in clines) and len(ctx) < 120
                if heading_only:
                    heading = ' '.join(l.strip('*') for l in clines).replace('Texto para as questões 11 e 12', '').strip()
                elif REF.search(whole) or q['n'] == first_of.get(ctx):
                    body = passage(ctx, numbered_passages)
                    body = re.sub(r'^Texto Auxiliar:\s*', '', body)
                    pieces.append('**Texto associado**\n\n' + body)
        pieces.append(stem)
        statement = balance('\n\n'.join(p for p in pieces if p.strip()))
        for a in alts: a['text'] = balance(a['text']).replace('\n', ' ')
        out.append(dict(n=n, page=q['page'], section=heading or q.get('section', ''), statement=statement, alternatives=alts,
                        key=k, annulled=k in ('X', '*')))
    json.dump(out, open(f'final_{name}.json', 'w'), ensure_ascii=False, indent=1)
    return out

if __name__ == '__main__':
    for name in sys.argv[1:]:
        o = build(name, numbered_passages=not name.startswith('prf'))
        print(name, len(o), 'anuladas', [x['n'] for x in o if x['annulled']],
              'sem gabarito válido', [x['n'] for x in o if not x['annulled'] and x['key'] not in [a['key'] for a in x['alternatives']]])
