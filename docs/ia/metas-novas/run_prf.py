import sys, json
from pack2 import pack
g = int(sys.argv[1]); cap = int(sys.argv[2]); maxs = int(sys.argv[3]); end = int(sys.argv[4])
U = open(f'prf/u{g}.txt').read().replace('\n', ';').strip(';').split(';')
contran = '007f844a e1ed7ed3 6a1fa1af bc9bbb35 86016993 000d00d0 9537b39c ac15252b 027e8b0b 22237cf9'.split()
cm = 34 if g == 1 else 55
U += [] if g == 1 else [f'Q{k},8,{cm},' for k in contran]
drop = sys.argv[5] if len(sys.argv) > 5 else ''
U = [u for u in U if u and u[0] not in drop]
D = {1: 'cc4d483c 412010f4 d0137ef8 6d176e0d 47afd80c', 2: 'cc4d483c 412010f4 d0137ef8 6d176e0d 47afd80c'}[g].split()
errw = 15 if g == 1 else 20; disc = 60 if g == 1 else 90
anchors = {}; anc_rows = []
for i, n in enumerate([55, 62, 69, 76, 83]):
    anchors[n] = anchors.get(n, 0) + disc; anc_rows.append(('D' + D[i], n, 99))
for n in [56, 63, 70, 77, 84]:
    anchors[n] = anchors.get(n, 0) + errw; anc_rows.append(('W' + str(n), n, 98))
hi = "147090be a41f9a2e 26c1e4bb ffb00b5c 87350e23 75f6d49d c8e823d5 ad3b241f ebcf1ab0 ddb5414b cde9e89b 3b150077 46ef0e5a 21b3e388 dcfec3ea 29a08948 31ed9724 c53aa800 0c3b90d3 96c988e9 889cfa4b 222ae27a eb9c57ce 4a90d6f4 aa00d61f c4e5a307 2a843ca0 ffd5f005 1a91021d b9c564a2 2ea304fd 94d7c13c de3698ad aedf7694 e5b27c1b 1ac8f883 7ff0a370 4eff6081 e6ce7011 fe529c3e f846156b b79ac797 c6861b5a 6fc15241".split()
# intercalar disciplinas na revisão final
res = int(sys.argv[6]) if len(sys.argv) > 6 else 0
r = pack(U, anchors, cap, maxs, end=end, hi=hi, fin=10 if g == 1 else 15, reserve=res)
for n in range(51,91): print(n, [k for k,m,i in sorted([x for x in r['rows'] if x[1]==n], key=lambda x:x[2])]) if '-v' in sys.argv else None
print('lastmain', r['lastmain'], 'rest', len(r['rest']), sum(1 for _ in r['rest']), 'lostf', len(r['lostf']), r['lostf'][:40])
print('loads', [r['load'][n] for n in range(51, 91)])
print('nsubj', [r['nsubj'][n] for n in range(51, 91)])
print('fin', len(r['fin']))
json.dump(dict(rows=r['rows'] + anc_rows, fin=r['fin']), open(f'prf/asg{g}.json', 'w'))
