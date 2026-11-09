import json,sys
f=sys.argv[1]; ov=json.loads(sys.argv[2]); d=json.load(open(f)); hit=set()
for s in d:
    for t in s['topics']:
        for x in [t]+t['subs']:
            k=x['title']
            for key,v in ov.items():
                if k.startswith(key): x['importance']=v; hit.add(key)
miss=set(ov)-hit
json.dump(d,open(f,'w'),ensure_ascii=False); print('missing:',miss)
