"""Ajustes manuais (figuras, tabelas e símbolos) sobre final_<exame>.json."""
import json, re
C = json.load(open('crops.json'))
img = lambda k: f"[[imagem:{C[k]['hash']}]]"

def load(ex): return {x['n']: x for x in json.load(open(f'final_{ex}.json'))}, ex
def save(d, ex): json.dump(list(d.values()), open(f'final_{ex}.json', 'w'), ensure_ascii=False, indent=1)
def sub(q, pat, rep, flags=re.S):
    new, n = re.subn(pat, lambda m: rep, q['statement'], count=1, flags=flags)
    assert n == 1, (q['n'], pat)
    q['statement'] = new

d, ex = load('gmf')
sub(d[12], r'saíram borradas\. .*? Sobre os dias', 'saíram borradas.\n' + img('gmf12') + '\nSobre os dias')
sub(d[18], r'conforme mostrado na imagem a seguir\. ', 'conforme mostrado na imagem a seguir.\n' + img('gmf18') + '\n')
sub(d[21], r'I\. O título foi criado', 'I. O título (reproduzido abaixo)\n' + img('gmf21a') + '\nfoi criado')
sub(d[21], r'conforme indicado na figura\.', 'conforme indicado na figura.\n' + img('gmf21b'))
sub(d[23], r'descritos a seguir\.', 'descritos a seguir.\n' + img('gmf23'))
sub(d[25], r'exemplificado na figura ,', 'exemplificado na figura\n' + img('gmf25f') + '\n,')
sub(d[25], r'\s+\S?\s*J\s+\S?\s*P\s*$', '')
for a, t in zip('ABCD', ['F10, Ctrl + J e Ctrl + P', 'F11, Ctrl + J e Ctrl + F', 'F10, Ctrl + D e Ctrl + F', 'F11, Ctrl + D e Ctrl + P']):
    d[25]['alternatives']['ABCD'.index(a)]['text'] = t
save(d, ex)

d, ex = load('cfo')
sub(d[13], r'__16 18__', img('cfo13'))
sub(d[18], r'figura geométrica abaixo\..*$', 'figura geométrica abaixo.\n' + img('cfo18') + '\nConforme as características da figura, qual o valor de (Â + Ĉ)/2?')
for i, t in enumerate(['B̂', 'Ê', 'D̂', '2B̂', '2Ê']):
    d[18]['alternatives'][i]['text'] = t
sub(d[19], r'ao expediente \(E\)\..*?Os turnos', 'ao expediente (E).\n' + img('cfo19') + '\nOs turnos')
sub(d[20], r'(Como descrito a seguir:).*?E isso se sucedeu', r'Como descrito a seguir:' + '\n' + img('cfo20') + '\nE isso se sucedeu')
d[20]['statement'] = d[20]['statement'].replace(r'Como descrito a seguir:', 'Como descrito a seguir:', 1)
save(d, ex)

d, ex = load('ppce')
q = d[10]
q['statement'] = ('Thomas Hartung é professor de Toxicologia na Universidade Johns Hopkins, nos EUA, e também diretor do '
                  'Centro de Alternativas aos Testes em Animais.\n\nAssinale a alternativa em que esteja corretamente '
                  'indicado como o período acima deve ser representado graficamente.')
q['alternatives'] = [{'key': k, 'text': img('ppce10' + k)} for k in 'ABCDE']
for n in (11, 12):
    d[n]['statement'] = ('**Texto associado**\n\n' + img('ppce11') +
        '\n(Ziraldo. https://www.espacoeducar.net/2010/08/45-tirinhas-do-menino-maluquinho.html)\n\n' +
        re.sub(r'^\*\*Texto associado\*\*\n\n.*?\n\n', '', d[n]['statement'], flags=re.S).replace('Texto para as questões 11 e 12', '').strip())
d[60]['statement'] = img('ppce60') + '\n\n' + re.sub(r'^\*\*Texto associado\*\*\n\nImagem:\n\n', '', d[60]['statement'])
save(d, ex)

d, ex = load('prf')
for n in (43, 44):
    sub(d[n], r'conforme mostra a figura a seguir\.', 'conforme mostra a figura a seguir.\n' + img('prf43'))
save(d, ex)
print('ok')

d, ex = load('prf')
d[32]['statement'] = d[32]['statement'].split('\n\n')
d[32]['statement'][-1] = ('Considere que {qₙ}, para n variando de 1 a 10, seja a sequência numérica formada pelas quantidades de veículos '
    'fiscalizados apenas no decorrer da n-ésima hora de realização da operação, ou seja, q₁ é a quantidade de veículos fiscalizados '
    'apenas no decorrer da primeira hora de realização da operação; q₂ é a quantidade de veículos fiscalizados apenas no decorrer da '
    'segunda hora de realização da operação; e assim por diante. Nessa situação, a sequência {qₙ}, para n variando de 1 a 10, é uma '
    'progressão aritmética.')
d[32]['statement'] = '\n\n'.join(d[32]['statement'])
save(d, ex)

d, ex = load('gmf')
for n in range(1, 11):
    s = d[n]['statement']
    s = re.sub(r'\n2\n', '\n', s)
    s = s.replace('do CO atmosférico', 'do CO₂ atmosférico').replace('o CO capturado', 'o CO₂ capturado')
    s = s.replace('excesso de O na atmosfera. 2 (linhas', 'excesso de O₂ na atmosfera. (linhas').replace('excesso de O na', 'excesso de O₂ na')
    s = s.replace('redução de CO no ambiente. 2', 'redução de CO₂ no ambiente.').replace('redução de CO no', 'redução de CO₂ no')
    d[n]['statement'] = s
save(d, ex)

# negrito no meio de palavra (artefato de fonte), ex.: "P**ú**blica"
for ex0 in ['pmpe', 'gmf', 'pmce', 'cfo', 'ppce', 'prf', 'prfi', 'prfe']:
    d, ex = load(ex0)
    for q in d.values():
        q['statement'] = re.sub(r'(?<=[A-Za-zÀ-ú])\*\*([A-Za-zÀ-ú]{1,2})\*\*(?=[A-Za-zÀ-ú])', r'\1', q['statement'])
    save(d, ex)
print('ok2')
