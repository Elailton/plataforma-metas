"""Itens Cebraspe (PRF): item = número na margem; continuação recuada; resto é contexto.
Uso: python3 parse_prf.py pdf saida.json primeiro_item"""
import sys, re, json, pdfplumber
sys.path.insert(0, '.')
from cols import group_rows, render

pdf, outp, first = sys.argv[1], sys.argv[2], int(sys.argv[3])
items, expect = [], first
ctx_lines, cur = [], None
blocks = []  # sequência de ('ctx', texto) e ('item', n, texto)
with pdfplumber.open(pdf) as doc:
    for pi, page in enumerate(doc.pages, 1):
        w = page.width; mid = w / 2
        underl = [(r["x0"], r["x1"], r["top"]) for r in page.rects + page.lines
                  if abs(r["bottom"] - r["top"]) < 2 and 3 < (r["x1"] - r["x0"]) < 200]
        chars = [c for c in page.chars if c["text"].strip() or c["text"] == " "]
        rows = group_rows(chars)
        # PRF: duas colunas sem trechos de largura total
        for side in (0, 1):
            part = [c for _, cs in rows for c in cs if (c["x0"] < mid) == (side == 0)]
            prows = group_rows(part)
            if not prows: continue
            from collections import Counter
            starts = [min(c["x0"] for c in cs) for _, cs in prows]
            left = min(starts)
            numx = [min(c["x0"] for c in cs) for _, cs in prows if re.match(r'^\d{1,3}[^\d\s]', ''.join(c['text'] for c in sorted(cs, key=lambda c: c['x0']) if c['text'].strip()))]
            if numx: left = min(numx)
            for top, cs in prows:
                cs = sorted(cs, key=lambda c: c["x0"])
                text = render(cs, underl).strip()
                x = cs[0]["x0"]
                if re.match(r'^CEBRASPE – PRF', text) or re.match(r'^\d+$', text) and top > page.height - 60:
                    continue
                m = re.match(r'^(\d{1,3}) (.*)$', text)
                if m and int(m.group(1)) == expect:
                    if cur: blocks.append(cur)
                    cur = ['item', expect, m.group(2), pi, x]
                    expect += 1
                    continue
                if cur and x - left >= 4:  # continuação recuada
                    cur[2] += '\n' + text
                    continue
                if cur:
                    blocks.append(cur); cur = None
                blocks.append(['ctx', text, pi])
    if cur: blocks.append(cur)

# monta contexto: parágrafos de contexto acumulados desde o último item
out, ctx = [], []
prev_item = False
for b in blocks:
    if b[0] == 'ctx':
        if prev_item:
            ctx = []
        ctx.append(b[1]); prev_item = False
    else:
        out.append(dict(n=b[1], page=b[3], context='\n'.join(ctx), stem=b[2]))
        prev_item = True
json.dump(out, open(outp, 'w'), ensure_ascii=False, indent=1)
print(outp, len(out), out[0]['n'], out[-1]['n'])
