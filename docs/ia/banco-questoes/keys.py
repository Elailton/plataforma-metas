import re, json, pdfplumber
K = {}
t = open('gab_pmpe.txt').read()
K['pmpe'] = {int(n): a for n, a in re.findall(r'(\d+)\s*([A-E])', t)}
def grid(txt, pat_num, pat_ans):
    lines = [l for l in txt.splitlines() if l.strip()]
    out = {}
    for a, b in zip(lines, lines[1:]):
        nums = re.findall(pat_num, a)
        if nums and len(nums) >= 10 and not re.search(r'\d', b.replace('0','')) or (nums and re.fullmatch(r'[\sA-EX*]+', b)):
            ans = re.findall(r'[A-EX*]', b)
            if len(ans) == len(nums):
                for n, x in zip(nums, ans): out[int(n)] = x
    return out
K['gmf'] = grid(open('gab_gmf.txt').read(), r'\b(\d{1,2})\b', None)
K['cfo'] = grid(open('gab_cfo.txt').read(), r'Q(\d+)', None)
pp = open('gab_ppce.txt').read().split('PROVA TIPO B')[1]
K['ppce'] = {int(n): a for n, a in re.findall(r'(\d{2}):\s*([A-EX])', pp)}
for k, f in [('prf','gab_prf.txt'),('prfi','gab_prfi.txt'),('prfe','gab_prfe.txt')]:
    lines = open(f).read().splitlines(); out = {}
    for a, b in zip(lines, lines[1:]):
        if a.strip().startswith('Item') and b.strip().startswith('Gabarito'):
            for n, x in zip(a.split()[1:], b.split()[1:]):
                if n != '0': out[int(n)] = x
    K[k] = out
p = pdfplumber.open('/mnt/user-data/uploads/PMCE/gabarito.pdf').pages[1]
rows = p.extract_tables()[0]; out = {}
i = 1
while i < len(rows) and 'GABARITO 2' not in str(rows[i]):
    nums = [x for x in rows[i] if x]; ans = [x for x in rows[i+1] if x]
    nums = [n for n in ''.join(n if len(n)==2 else n for n in nums) and nums]
    fix = []
    for n in nums:
        if fix and fix[-1] == '10' and n == '0': fix[-1] = '100'
        else: fix.append(n)
    for n, a in zip(fix, ans): out[int(n)] = a
    i += 2
K['pmce'] = out
for k, v in K.items():
    an = sorted(n for n, a in v.items() if a in 'X*')
    print(k, len(v), min(v), max(v), 'anuladas', an)
json.dump(K, open('keys.json','w'))
