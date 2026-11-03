"""Extrai texto de PDF de prova (1 ou 2 colunas, com trechos de largura total), marcando
negrito (**) e sublinhado (__). Uso: python3 cols.py arquivo.pdf saida.txt"""
import sys, pdfplumber

def is_bold(c):
    f = c.get("fontname", "").lower()
    return "bold" in f or "black" in f or ",b" in f or "-bd" in f or "heavy" in f

def group_rows(chars):
    chars = sorted(chars, key=lambda c: (c["top"], c["x0"]))
    rows = []
    for c in chars:
        if rows and abs(rows[-1][0] - c["top"]) < 2.5:
            rows[-1][1].append(c)
        else:
            rows.append([c["top"], [c]])
    return rows

def render(cs, underl):
    cs = sorted(cs, key=lambda c: c["x0"])
    s, prev, cur = "", None, None
    space = False
    for c in cs:
        if c["text"] == " ":
            space = True
            continue
        if prev is not None and (space or c["x0"] - prev["x1"] > max(1.0, c["size"] * 0.12)):
            s += " "
        ul = any(u[0] - 1 <= c["x0"] and c["x1"] <= u[1] + 1 and -3 <= u[2] - c["bottom"] < 3.5 for u in underl)
        st = ("b" if is_bold(c) else "") + ("u" if ul else "")
        if st != cur:
            if cur:
                s += ("__" if "u" in cur else "") + ("**" if "b" in cur else "")
            if st:
                s += ("**" if "b" in st else "") + ("__" if "u" in st else "")
            cur = st
        s += "\\_" if c["text"] == "_" else c["text"]
        prev = c
        space = False
    if cur:
        s += ("__" if "u" in cur else "") + ("**" if "b" in cur else "")
    return s

def main(pdf, outp):
    res = []
    with pdfplumber.open(pdf) as doc:
        for pi, page in enumerate(doc.pages, 1):
            w = page.width
            mid = w / 2
            underl = [(r["x0"], r["x1"], r["top"]) for r in page.rects + page.lines
                      if abs(r["bottom"] - r["top"]) < 2 and 3 < (r["x1"] - r["x0"]) < 200]
            chars = [c for c in page.chars if c["text"].strip() or c["text"] == " "]
            rows = group_rows(chars)
            res.append(f"\n=====PAGE {pi}=====")
            block = []  # linhas de 2 colunas pendentes

            def flush():
                if not block:
                    return
                left = [c for _, cs in block for c in cs if c["x0"] < mid]
                right = [c for _, cs in block for c in cs if c["x0"] >= mid]
                for part in (left, right):
                    for _, cs in group_rows(part):
                        res.append(render(cs, underl))
                block.clear()

            for top, cs_all in rows:
                cs = [c for c in cs_all if c["text"] != " "] or cs_all
                # linha de largura total: algum caractere atravessa o meio, ou não há vão no meio
                crosses = any(c["x0"] < mid - 2 and c["x1"] > mid + 2 for c in cs)
                xs = sorted(cs, key=lambda c: c["x0"])
                gap_ok = any(a["x1"] <= mid + 8 and b["x0"] >= mid - 8 and b["x0"] - a["x1"] > 6
                             for a, b in zip(xs, xs[1:]))
                only_one_side = all(c["x0"] < mid for c in cs) or all(c["x0"] >= mid for c in cs)
                full = crosses or (not gap_ok and not only_one_side)
                if full:
                    flush()
                    res.append("§" + render(cs_all, underl))
                else:
                    block.append((top, cs_all))
            flush()
    open(outp, "w").write("\n".join(res))

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
