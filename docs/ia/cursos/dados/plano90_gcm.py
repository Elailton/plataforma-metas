import json,re,plan as P
C='4b7c'
PS={'LP':'Língua Portuguesa','MAT':'Matemática','ET':'Atualidades e Convivência Societária','CTB':'Específicos: Trânsito (CTB)','LEX':'Específicos: ECA e Pessoa Idosa','PS':'Específicos: Primeiros Socorros','SEG':'Específicos: Segurança Pública e Município'}
TR={'LP':'Língua Portuguesa - Prof. Volney Ribeiro','MAT':'Raciocínio Lógico e Matemática Básica - Prof. Paulo Felipe','ET':'Ética - Prof. Rodrigo Lopes','CTB':'Legislação de Trânsito - Prof. Erick Lima','LEX':'Legislação Extravagante','PS':'Primeiros Socorros - Prof. Rodrigo Lopes','SEG':'Segurança Pública - Profª. Dayana Sales'}
DEM='Específicos: demais assuntos'
for l in open('gmi.txt',encoding='utf8'):
    a,i,c,d,t=l.rstrip('\n').split('|')
    if a in PS: P.mats.append(dict(c=C,id=c,s=PS[a],t=t,ty='videoaula',d=f'Trilha: {TR[a]} | Ordem: {int(i):03d} | Duração: {d}'))
for sn in list(PS.values())+[DEM]: P.tops.append(dict(c=C,s=sn,sn=sn,id='x'+sn,pos=0,t=sn))
quota={'Língua Portuguesa':41,'Matemática':31,'Específicos: Trânsito (CTB)':30,'Atualidades e Convivência Societária':16,'Específicos: ECA e Pessoa Idosa':16,'Específicos: Segurança Pública e Município':12,DEM:11,'Específicos: Primeiros Socorros':10}
P.COURSES[C]=dict(name='SGA - GCM Itaitinga',slug='sga-gcm-itaitinga',quota=quota,first=('Língua Portuguesa','Matemática'))
out,metas,left=P.plan(C)
print('sobrou',{k:v for k,v in left.items() if v})
cfg=P.COURSES[C]
L=[f"# {cfg['name']} — plano das 90 metas (grupo único, ~2h30/dia)\n",
"Gerado em 2026-11-10 por `docs/ia/cursos/dados/plano90.py` (variante do GCM) a partir das aulas da Hotmart (produto 8876393, vídeo em 1,5x) e das vagas da ficha do curso (`sga-gcm-itaitinga.md`, coluna G1). "
"Conhecimentos Específicos (peso 3, 79 vagas) foi dividido por bloco de conteúdo. Metas 01–03 já criadas e publicadas (16, 17 e 18/11/2026) e diferem um pouco do plano automático: "
"Meta 01 Português (interpretação e semântica) + Matemática (operações); Meta 02 Segurança Pública + CTB (disposições gerais e preliminares); Meta 03 Português (fonologia e sílaba) + Ética + CTB.\n",
"## Trilhas\n","| Bloco | Vagas | Trilha (professor) | Aulas | Min (1,5x) |","|---|---|---|---|---|"]
for sn,o in out.items():
    n=sum(len(s) for s in o['slots'])
    L.append(f"| {sn} | {quota[sn]} | {o['trilha'] or 'sem aula (só questões; começa na Meta 15)'} | {n} | {o['total']} |")
L+=["","- Estatuto Geral das Guardas (Lei 13.022/2014) tem aula na Hotmart, mas não está no edital de 2015: fica fora até sair edital novo.",
"- \"Demais assuntos\": direção defensiva, mecânica básica, assalto, segurança do trabalho, higiene, Lei Orgânica de Itaitinga e administração pública — sem aula gravada; entram com questões.",
"- Atualidades e história de Itaitinga: só as aulas de Ética têm vídeo; o restante segue o calendário próprio de Atualidades (questões e resumos).",
"- Vade Mecum e Simulados do GMI estão \"em período de produção\" na Hotmart.","",
"## Metas 01–84 (conteúdo novo)\n","| Meta | Bloco 1 | Bloco 2 |","|---|---|---|"]
for n in range(1,85):
    cells=[]
    for sn,k in metas[n]:
        ls=out[sn]['slots'][k]
        if ls:
            mins=round(sum(P.dur(m['d']) for m in ls)/P.SPEED)
            cells.append(f"**{sn}**: {ls[0]['t']}{' → '+ls[-1]['t'] if len(ls)>1 else ''} ({len(ls)} aulas, ~{mins} min)")
        else: cells.append(f"**{sn}**: questões por assunto")
    L.append(f"| {n:02d} | {cells[0]} | {cells[1] if len(cells)>1 else ''} |")
L+=["","## Metas 85–90 (fechamento)\n","- Revisão geral dos assuntos de alta incidência (CTB, ECA, segurança pública, interpretação, porcentagem/regra de três) na proporção das vagas.",
"- A partir da Meta 08: lei seca (Vade Mecum, quando liberado) e revisões espaçadas como em `10-prompt-mestre-cursos.md`.",""]
open('sga-gcm-itaitinga-plano-90.md','w').write('\n'.join(L))
