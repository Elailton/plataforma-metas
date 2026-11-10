import sys, json
from pack2 import pack
# uso: run_gen.py curso g cap maxs end reserve [-v]
C, g, cap, maxs, end, res = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5]), int(sys.argv[6])
cf = json.load(open(f'{C}/cfg.json'))
U = [u for u in open(f'{C}/u{g}.txt').read().replace('\n', ';').strip(';').split(';') if u]
errw = 15 if g == 1 else 20; disc = 60 if g == 1 else 90
anchors = {}; anc = []
for i, d in enumerate(cf.get('disc', [])[:5]):
    n = [55, 62, 69, 76, 83][i]; anchors[n] = anchors.get(n, 0) + disc; anc.append(('D' + d, n, 99))
for n in [56, 63, 70, 77, 84]:
    anchors[n] = anchors.get(n, 0) + errw; anc.append(('W' + str(n), n, 98))
r = pack(U, anchors, cap, maxs, end=end, hi=cf['hi'], fin=10 if g == 1 else 15, reserve=res)
print('lastmain', r['lastmain'], 'rest', len(r['rest']), 'lostf', r['lostf'], 'fin', len(r['fin']))
print('loads', [r['load'][n] for n in range(51, 91)])
if '-v' in sys.argv:
    for n in range(51, 91): print(n, [k for k, m, i in sorted([x for x in r['rows'] if x[1] == n], key=lambda x: x[2])])
json.dump(dict(rows=r['rows'] + anc, fin=r['fin']), open(f'{C}/asg{g}.json', 'w'))
