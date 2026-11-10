import json,re,collections,difflib,unicodedata,sys
mats=json.load(open('mats.json')); tops=json.load(open('tops.json'))
def norm(s):
    s=unicodedata.normalize('NFKD',s.lower()); s=''.join(c for c in s if not unicodedata.combining(c))
    return re.sub(r'[^a-z0-9 ]',' ',s)
STOP=set('de da do das dos e a o as os em no na nos nas para por com parte 01 02 03 04 05 06 07 08 09 10 prof profa lei n nº decreto'.split())
def toks(s): return {w for w in norm(s).split() if w not in STOP and len(w)>2}
def dur(d):
    m=re.search(r'Duração: (\d+):(\d+)',d or ''); return int(m.group(1))+int(m.group(2))/60 if m else 0
def trilha(d): return (re.search(r'Trilha: ([^|]+)',d or '') or [None,''])[1].strip()
def ordem(d): m=re.search(r'Ordem: (\d+)',d or ''); return int(m.group(1)) if m else 0
COURSES={
 '0203':dict(name='SGA - PCCE',slug='sga-pcce',quota={'Noções de Direito Administrativo':19,'Legislação Especial Penal e Processual Penal':19,'Noções de Direito Constitucional':17,'Noções de Direito Penal':15,'Língua Portuguesa':14,'Noções de Processo Penal':13,'Raciocínio Lógico':12,'Informática':12,'Estatística':11,'Legislação Estadual':10,'Contabilidade':9,'Medicina Legal':9,'Criminologia':7},first=('Língua Portuguesa','Raciocínio Lógico')),
 '4c3c':dict(name='SGA - PRF ADM',slug='sga-prf-adm',quota={'Língua Portuguesa':29,'Noções de Direito Constitucional':22,'Noções de Direito Administrativo':22,'Noções de Administração':19,'Raciocínio Lógico':18,'Ética e Conduta Pública':15,'Noções de Arquivologia':15,'Noções de Informática':14,'Legislação Relativa à PRF':13},first=('Língua Portuguesa','Raciocínio Lógico')),
}
SPEED=1.5  # G1: vídeo em 1,5x
SLOT=60    # minutos de aula (já em 1,5x) por vaga; o resto da vaga é questões
def plan(c):
    cfg=COURSES[c]; subj={t['sn']:t['s'] for t in tops if t['c']==c}
    T=collections.defaultdict(list)
    for t in tops:
        if t['c']==c: T[t['sn']].append(t)
    out={}
    for sn,q in cfg['quota'].items():
        allv=[m for m in mats if m['c']==c and m['s']==subj[sn] and m['ty']=='videoaula' and not m['t'].startswith('Bloco de Questões')]
        ms=[m for m in allv if not re.search(r'B[oô]nus',trilha(m['d']))] or allv
        by=collections.defaultdict(list)
        for m in ms: by[trilha(m['d'])].append(m)
        best=None
        for tr,l in by.items():
            tot=sum(dur(m['d']) for m in l)/SPEED
            score=abs(tot-q*SLOT)
            if best is None or score<best[0]: best=(score,tr,sorted(l,key=lambda m:ordem(m['d'])))
        lessons=best[2] if best else []
        # topic mapping
        tlist=T[sn]
        for m in lessons:
            lt=toks(re.sub(r' - Prof.*$','',m['t']))
            sc=max(tlist,key=lambda t:(len(lt&toks(t['t']))/(1+len(toks(t['t']))**.5), -t['pos'])) if tlist else None
            m['topic']=sc['id'] if sc and lt&toks(sc['t']) else None
            m['topic_t']=sc['t'] if m['topic'] else None
        # split lessons into q slots by cumulative duration
        tot=sum(dur(m['d']) for m in lessons)/SPEED
        slots=[[] for _ in range(q)]
        if lessons:
            acc=0
            for m in lessons:
                i=min(q-1,int(acc/(tot/q))) if tot else 0
                slots[i].append(m); acc+=dur(m['d'])/SPEED
        out[sn]=dict(trilha=best[1] if best else None,total=round(tot),slots=slots,topics=tlist)
    # schedule: slot k of subject at ideal position
    ev=[]
    nolesson={sn for sn,o in out.items() if not any(o['slots'])}
    START=15  # disciplinas sem aulas gravadas começam depois (aguardando gravação)
    ev.sort()
    metas=[[] for _ in range(85)]  # 1..84
    a,b=cfg['first']; metas[1]=[(a,0),(b,0)]
    used={(a,0),(b,0)}
    nxt={sn:0 for sn in cfg['quota']}; nxt[a]=1; nxt[b]=1
    for n in range(2,85):
        # pick 2 subjects with smallest ideal position of their next slot
        def ideal(sn,q):
            if sn in nolesson: return START+(nxt[sn]+0.5)*(84-START)/q
            return (nxt[sn]+0.5)*84/q
        cand=sorted([(ideal(sn,q),sn) for sn,q in cfg['quota'].items() if nxt[sn]<q and not (sn in nolesson and n<START)])
        pick=[]
        for _,sn in cand:
            if sn not in [p[0] for p in pick]: pick.append((sn,nxt[sn]))
            if len(pick)==2: break
        for sn,k in pick: nxt[sn]+=1
        metas[n]=pick
    left={sn:cfg['quota'][sn]-nxt[sn] for sn in cfg['quota']}
    return out,metas,left
if __name__=='__main__':
    for c in COURSES:
        out,metas,left=plan(c)
        print(COURSES[c]['name'],'sobrou',{k:v for k,v in left.items() if v})
        for sn,o in out.items(): print('  ',sn,'|',o['trilha'],'|',o['total'],'min |',sum(1 for s in o['slots'] for m in s),'aulas | sem tópico',sum(1 for s in o['slots'] for m in s if not m['topic']))
        for n in (1,2,3): print('  Meta',n,[(sn,[ (m['t'][:40],round(dur(m['d'])/SPEED)) for m in out[sn]['slots'][k]]) for sn,k in metas[n]])
