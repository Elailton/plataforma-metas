"""Recorta figuras das provas (PNG) e grava images/<hash>.png + crops.json {id: hash}."""
import pdfplumber, hashlib, json, os, io
U = '/mnt/user-data/uploads/'
F = {'gmf': 'GMF/Guarda Municipal - Tipo A.pdf', 'cfo': 'CFO - PMCE/2º TENENTE QOPM DA POLÍCIA MILITAR - TIPO B.pdf',
     'ppce': 'PPCE/PROVA - POLICIAL PENAL - TIPO B.pdf', 'prf': 'PRF/578_PRF_001_01.PDF'}
C = {
    'gmf12': ('gmf', 4, (306, 386, 550, 496)),
    'gmf18': ('gmf', 6, (78, 350, 244, 487)),
    'gmf21a': ('gmf', 7, (103, 343, 175, 369)),
    'gmf21b': ('gmf', 7, (95, 472, 227, 657)),
    'gmf23': ('gmf', 7, (312, 490, 530, 628)),
    'gmf25f': ('gmf', 8, (74, 396, 221, 411)),
    'cfo13': ('cfo', 5, (108, 619, 204, 671)),
    'cfo18': ('cfo', 7, (57, 531, 255, 688)),
    'cfo19': ('cfo', 8, (30, 110, 580, 320)),
    'cfo20': ('cfo', 8, (78, 532, 532, 680)),
    'ppce10A': ('ppce', 5, (313, 167, 476, 213)), 'ppce10B': ('ppce', 5, (313, 212, 476, 259)),
    'ppce10C': ('ppce', 5, (313, 258, 476, 305)), 'ppce10D': ('ppce', 5, (313, 304, 476, 351)),
    'ppce10E': ('ppce', 5, (313, 350, 476, 396)),
    'ppce11': ('ppce', 5, (80, 428, 504, 566)),
    'ppce60': ('ppce', 20, (76, 92, 506, 291)),
    'prf43': ('prf', 3, (36, 158, 285, 222)),
}
os.makedirs('images', exist_ok=True)
docs = {k: pdfplumber.open(U + f) for k, f in F.items()}
out = {}
for cid, (ex, pg, box) in C.items():
    page = docs[ex].pages[pg - 1]
    im = page.crop(box).to_image(resolution=170).original.convert('RGB')
    buf = io.BytesIO(); im.save(buf, 'PNG', optimize=True)
    data, mime, ext = buf.getvalue(), 'image/png', 'png'
    if len(data) > 60000:
        im = page.crop(box).to_image(resolution=140).original.convert('RGB')
        buf = io.BytesIO(); im.save(buf, 'JPEG', quality=80, optimize=True)
        data, mime, ext = buf.getvalue(), 'image/jpeg', 'jpg'
    h = hashlib.sha256(data).hexdigest()[:16]
    open(f'images/{cid}.{ext}', 'wb').write(data)
    out[cid] = dict(hash=h, file=f'images/{cid}.{ext}', bytes=len(data), mime=mime)
json.dump(out, open('crops.json', 'w'), indent=1)
print({k: v['bytes'] for k, v in out.items()})
