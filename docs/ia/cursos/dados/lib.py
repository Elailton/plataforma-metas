import re,json
def load(path):
    L=[l.strip() for l in open(path,encoding='utf-8',errors='ignore') if l.strip()]
    out=[];i=0
    while i<len(L)-1:
        m=re.match(r'^(\d+) \(([\d.]+)%\)$',L[i+1])
        if m and not re.match(r'^(\d+) \(',L[i]): out.append((L[i],int(m.group(1))));i+=2
        else:i+=1
    return out
class Course:
    def __init__(s,bank,exam=None):
        s.bank=load(bank); s.exam=load(exam) if exam else []
    def cnt(s,data,pat):
        if not pat: return 0
        r=re.compile(pat,re.I); return max([c for n,c in data if r.search(n)]+[0])
LV=['low','medium','high']
def T(title,pat=None,*subs,imp=None,hdr=None): return dict(title=title,pat=pat,subs=list(subs),imp=imp,hdr=hdr)
def S(title,pat=None,imp=None,hdr=None): return dict(title=title,pat=pat,imp=imp,hdr=hdr,subs=[])
def grade(c,subjects):
    out=[];report=[]
    for name,hdr,topics in subjects:
        H=c.cnt(c.bank,hdr) or 1
        st=[]
        for t in topics:
            def imp_of(x,top,parent_hdr):
                h=c.cnt(c.bank,x['hdr']) if x['hdr'] else parent_hdr
                share=100*c.cnt(c.bank,x['pat'])/max(h,1)
                hi,me=(8,3) if top else (4,1.5)
                lv=2 if share>=hi else 1 if share>=me else 0
                inexam=x['pat'] and c.cnt(c.exam,x['pat'])>0
                if inexam and lv==0: lv=1
                if x['imp']: lv=LV.index(x['imp'])
                return LV[lv],share,inexam
            hh=c.cnt(c.bank,t['hdr']) if t['hdr'] else H
            lv,sh,ex=imp_of(t,True,H)
            subs=[]
            for u in t['subs']:
                l2,s2,e2=imp_of(u,False,hh); subs.append(dict(title=u['title'],importance=l2))
                report.append(f"      {l2:6} {s2:5.1f}{'*' if e2 else ' '} {u['title'][:70]}")
            report.insert(len(report)-len(subs),f"   {lv:6} {sh:5.1f}{'*' if ex else ' '} {t['title'][:75]}")
            st.append(dict(title=t['title'],importance=lv,subs=subs))
        report.insert(len(report)-sum(1+len(x['subs']) for x in st),f"## {name} (hdr={H})")
        out.append(dict(name=name,topics=st))
    return out,report
