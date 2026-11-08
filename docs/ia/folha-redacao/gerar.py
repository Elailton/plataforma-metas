#!/usr/bin/env python3
"""Gera a Folha de Redação padrão SGA (A4, 1 página) em HTML; o PDF sai pelo Playwright.

Uso:
  python3 docs/ia/folha-redacao/gerar.py --saida /tmp/folha.html \
      --curso "PMPE" --simulado "Simulado Geral 01" --linhas 20 --min 15 --max 20
  node -e 'const {chromium}=require("playwright");(async()=>{const b=await chromium.launch();
    const p=await b.newPage();await p.goto("file:///tmp/folha.html");
    await p.pdf({path:"/tmp/Folha.pdf",format:"A4",printBackground:true,
    margin:{top:0,right:0,bottom:0,left:0}});await b.close();})()'

Sem --curso/--min/--max: modelo genérico (30 linhas, campos em branco).
Regras fixas: sem nome/CPF/assinatura (identificação zera a redação); 4 quadrados pretos nos
cantos para o aluno conferir que a folha inteira saiu na foto.
"""
import argparse
import html

ap = argparse.ArgumentParser()
ap.add_argument("--saida", required=True)
ap.add_argument("--curso", default="")
ap.add_argument("--simulado", default="")
ap.add_argument("--linhas", type=int, default=30)
ap.add_argument("--min", type=int, default=0)
ap.add_argument("--max", type=int, default=0)
a = ap.parse_args()
e = html.escape


def row(i):
    tag = ""
    if a.min and i == a.min:
        tag = '<span class="tag">mínimo</span>'
    if a.max and i == a.max:
        tag = '<span class="tag max">máximo</span>'
    cls = " limit" if (a.min and i == a.min) or (a.max and i == a.max) else ""
    return f'<div class="row{cls}"><span class="n">{i}</span><span class="l">{tag}</span></div>'


rows = "\n".join(row(i) for i in range(1, a.linhas + 1))
sub = "Sistema Guiado da Aprovação · Simulado Geral" + (f" · {e(a.curso)}" if a.curso else "")
limits = f"{a.min} – {a.max}" if a.min and a.max else ""
limit_rule = (
    f"Escreva de <b>{a.min} a {a.max} linhas</b>: menos que o mínimo ou além do máximo perde pontos, e o que passar da linha {a.max} não é avaliado."
    if a.min and a.max
    else "Respeite as margens e o número de linhas exigido; o que passar do limite não é avaliado."
)

doc = f"""<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Folha de Redação SGA</title>
<style>
@page {{ size: A4; margin: 0; }}
* {{ box-sizing: border-box; margin: 0; padding: 0; }}
body {{ font-family: "DejaVu Sans", Arial, sans-serif; color: #111; width: 210mm; height: 297mm; position: relative; }}
.sheet {{ position: absolute; inset: 14mm 15mm 14mm 15mm; display: flex; flex-direction: column; }}
.mark {{ position: absolute; width: 7mm; height: 7mm; background: #111; }}
.tl {{ top: 5mm; left: 5mm; }} .tr {{ top: 5mm; right: 5mm; }} .bl {{ bottom: 5mm; left: 5mm; }} .br {{ bottom: 5mm; right: 5mm; }}
header {{ text-align: center; border-bottom: .5mm solid #111; padding-bottom: 2mm; }}
h1 {{ font-size: 17pt; font-weight: 700; letter-spacing: 1.5pt; }}
.sub {{ font-size: 7.4pt; font-weight: 400; color: #333; text-transform: uppercase; letter-spacing: .8pt; margin-top: 1mm; }}
.meta {{ display: grid; grid-template-columns: 1.6fr 1fr .9fr; gap: 3mm; margin-top: 3mm; }}
.field {{ border: .3mm solid #111; padding: 1mm 2mm; height: 10mm; }}
.field span {{ font-size: 6.6pt; font-weight: 700; text-transform: uppercase; color: #444; display: block; }}
.field em {{ font-style: normal; font-size: 9pt; font-weight: 700; }}
.info {{ display: grid; grid-template-columns: 1fr 1fr; gap: 3mm; margin-top: 3mm; }}
.box {{ border: .3mm solid #111; padding: 1.8mm 2.5mm; font-size: 6.9pt; line-height: 1.38; }}
.box h2 {{ font-size: 7.2pt; text-transform: uppercase; letter-spacing: .4pt; margin-bottom: .8mm; }}
.box ol {{ padding-left: 3.6mm; }}
.alert h2 {{ color: #111; }}
.title {{ margin-top: 3mm; display: flex; align-items: center; gap: 2mm; border: .3mm solid #111; padding: 0 2mm; height: 8mm; }}
.title span {{ font-size: 6.6pt; font-weight: 700; text-transform: uppercase; color: #444; white-space: nowrap; }}
.lines {{ margin-top: 2.5mm; border: .5mm solid #111; flex: 1; display: flex; flex-direction: column; }}
.row {{ flex: 1; display: flex; border-bottom: .2mm solid #9a9a9a; }}
.row:last-child {{ border-bottom: 0; }}
.row.limit {{ border-bottom: .5mm solid #111; }}
.n {{ width: 8mm; border-right: .5mm solid #111; font-size: 7.5pt; font-weight: 700; display: flex; align-items: center; justify-content: center; }}
.l {{ flex: 1; position: relative; }}
.tag {{ position: absolute; right: 1.5mm; bottom: .6mm; font-size: 5.8pt; font-weight: 700; text-transform: uppercase; color: #333; }}
footer {{ display: flex; justify-content: space-between; font-size: 6.6pt; color: #444; margin-top: 2mm; }}
</style></head><body>
<i class="mark tl"></i><i class="mark tr"></i><i class="mark bl"></i><i class="mark br"></i>
<div class="sheet">
<header>
  <h1>FOLHA DE REDAÇÃO</h1><div class="sub">{sub}</div>
</header>
<div class="meta">
  <div class="field"><span>Simulado</span><em>{e(a.simulado)}</em></div>
  <div class="field"><span>Data</span></div>
  <div class="field"><span>Linhas (mín. – máx.)</span><em>{limits}</em></div>
</div>
<div class="info">
  <div class="box"><h2>Instruções</h2><ol>
    <li>Escreva com <b>caneta de tinta azul ou preta</b> e letra legível. Não use lápis.</li>
    <li>{limit_rule}</li>
    <li>Em caso de erro, risque com <b>um traço simples</b> e escreva o termo correto em seguida.</li>
    <li>O rascunho não é avaliado: só esta folha.</li>
  </ol></div>
  <div class="box alert"><h2>Atenção: anulação</h2><ol>
    <li><b>Não se identifique:</b> sem nome, assinatura, números, sinais ou desenhos.</li>
    <li>Ao fotografar, mostre a <b>folha inteira</b> (os 4 quadrados pretos), com boa luz e sem tremer.</li>
    <li>Letra ilegível ou foto embaçada, escura ou cortada <b>anula a redação</b>, sem recurso.</li>
  </ol></div>
</div>
<div class="title"><span>Título (se houver)</span></div>
<div class="lines">
{rows}
</div>
<footer><span>Envie a foto pela plataforma, na página do resultado do simulado.</span><span>SGA · Prof. Erick Lima</span></footer>
</div></body></html>"""
open(a.saida, "w", encoding="utf-8").write(doc)
print(a.saida)
