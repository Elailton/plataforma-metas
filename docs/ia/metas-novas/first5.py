"""Primeiras 5 metas (02/11 a 06/11) dos SGA novos, montadas à mão com as regras de 09-regras-metas."""
import json, datetime as dt
D = '/tmp/claude-0/-home-claude/8d713a03-ff74-5cd2-ac85-66de37e61b39/scratchpad/novas/'
START = dt.date(2026, 11, 2)
G = {1: dict(div=81.8, sp=' em 1,5x'), 2: dict(div=52.2, sp='')}

SECS = {  # (curso, trilha) -> {ordem: segundos}
 ('prf', 'PT'): {2: 1803, 3: 1536, 4: 1589, 5: 1800, 6: 1524, 7: 1740},
 ('prf', 'RL'): {1: 2091, 2: 2205, 3: 1573, 4: 1677, 5: 1886, 6: 2020},
 ('prf', 'DC'): {2: 1160, 3: 831, 4: 1048, 5: 670, 6: 1899, 7: 1803, 8: 1822, 9: 1021, 10: 1488, 11: 1319, 12: 1114, 13: 1371},
 ('prf', 'LT'): {2: 2152, 3: 1267, 4: 2140, 5: 1375, 6: 2993, 7: 2292, 8: 2358},
 ('prf', 'DA'): {2: 189, 3: 1869, 4: 1864, 5: 1048},
 ('ce', 'PT'): {2: 1803, 3: 2610, 4: 1800, 5: 2333, 6: 2072, 7: 1980, 8: 1355, 9: 1688},
 ('ce', 'RL'): {2: 1581, 3: 2524, 4: 2151, 5: 2011, 6: 1617, 7: 1671, 8: 1716},
 ('ce', 'DC'): {2: 1967, 3: 1963, 4: 1314, 5: 1939, 6: 1812, 7: 1421, 8: 980},
 ('pmce', 'DPM'): {4: 1942, 5: 2621, 6: 2065, 7: 2137},
 ('cfo', 'DPM'): {2: 1942, 3: 2621, 4: 2065, 5: 2137},
 ('pmce', 'HCE'): {3: 508, 4: 1786, 5: 1772, 6: 1622},
 ('cfo', 'HCE'): {2: 1786, 3: 1772, 4: 1622},
 ('pmce', 'AP'): {2: 1919, 3: 2140},
 ('cfo', 'DP'): {2: 2454, 3: 646, 4: 3282, 5: 1591},
 ('ppce', 'PT'): {2: 1803, 3: 2610, 4: 1800, 5: 2333, 6: 2181, 7: 2097},
 ('ppce', 'RL'): {1: 1581, 2: 2524, 3: 2151, 4: 2011},
 ('ppce', 'DC'): {2: 1217, 3: 1395, 4: 1627, 5: 1598, 6: 1967, 7: 1963, 8: 1314, 9: 1939, 10: 1812, 11: 1421, 12: 980},
 ('ppce', 'DA'): {4: 1858, 5: 1399, 6: 2172, 7: 1496, 8: 1058, 9: 1661, 10: 1773, 11: 1394, 12: 1675},
 ('ppce', 'PEN'): {2: 2454, 3: 646, 4: 3282, 5: 1591},
}

COURSES = {
 'prf': dict(cid='a845c350-baad-4711-a1e4-1ef1fc6f832c', sec='prf',
   TR={'PT': 'Língua Portuguesa - Prof. Volney Ribeiro', 'RL': 'Raciocínio Lógico Matemático - Prof. Paulo Felipe',
       'DC': 'Direito Constitucional - Profª. Dayana Sales', 'LT': 'Legislação de Trânsito - Prof. Erick Lima',
       'DA': 'Direito Administrativo - Prof. Suianny Lima'},
   SH={'PT': 'Português', 'RL': 'RLM', 'DC': 'Dir. Constitucional', 'LT': 'Trânsito', 'DA': 'Dir. Administrativo'}),
 'pmce': dict(cid='6305aafa-3263-46c9-b1b7-1001c01b5994', sec='ce',
   TR={'PT': 'Língua Portuguesa - Prof. Volney Ribeiro', 'RL': 'Raciocínio Lógico Matemático - Prof. Paulo Felipe',
       'DC': 'Direito Constitucional - Profª. Dayana Sales', 'DPM': 'Direito Penal Militar - Prof. Erick Lima',
       'HCE': 'História do Ceará - Prof. Caio Victor', 'AP': 'Administração Pública - Prof. Herick Paiva'},
   SH={'PT': 'Português', 'RL': 'RLM', 'DC': 'Dir. Constitucional', 'DPM': 'Dir. Penal Militar', 'HCE': 'Hist. do Ceará', 'AP': 'Adm. Pública'}),
 'cfo': dict(cid='c09903b0-651f-43a8-9c43-5f8fe7f6cb17', sec='ce',
   TR={'PT': 'Língua Portuguesa - Prof. Volney Ribeiro', 'RL': 'Raciocínio Lógico Matemático - Prof. Paulo Felipe',
       'DC': 'Direito Constitucional - Profª. Dayana Sales', 'DPM': 'Direito Penal Militar - Prof. Erick Lima',
       'HCE': 'História do Ceará - Prof. Caio Victor', 'DP': 'Direito Penal - Prof. Erick Lima'},
   SH={'PT': 'Português', 'RL': 'RLM', 'DC': 'Dir. Constitucional', 'DPM': 'Dir. Penal Militar', 'HCE': 'Hist. do Ceará', 'DP': 'Dir. Penal'}),
 'ppce': dict(cid='4b4f4900-a0a3-4ebd-8507-511c16eb9029', sec='ppce',
   TR={'PT': 'Língua Portuguesa - Prof. Volney Ribeiro', 'RL': 'Raciocínio Lógico - Prof. Paulo Felipe',
       'DC': 'Direito Constitucional - Profª. Dayana Sales', 'DA': 'Direito Administrativo - Prof. Suianny Lima',
       'PEN': 'Direito Penal - Prof. Erick Lima'},
   SH={'PT': 'Português', 'RL': 'RLM', 'DC': 'Dir. Constitucional', 'DA': 'Dir. Administrativo', 'PEN': 'Dir. Penal'}),
}

# dia -> lista de (trilha, [ordens], tópico8, caderno, tipo de questões, nº de questões)
#   tipo: Q1 = assunto concluído; QC = assunto continua; RF = reforço (sem aula)
PLAN = {
 ('prf', 1): [
  [('PT', [2, 3, 4], '147090be', '147090be', 'Q1', 10), ('RL', [1, 2], '75f6d49d', '75f6d49d', 'QC', 6)],
  [('DC', [2, 3, 4, 5, 6], 'c9475b37', 'c9475b37', 'Q1', 10), ('LT', [2, 3], 'fe4c5178', 'ctb1', 'QC', 6)],
  [('PT', [5, 6, 7], '5c40fdbe', '5c40fdbe', 'Q1', 10), ('RL', [3], '75f6d49d', '75f6d49d', 'Q1', 10)],
  [('DC', [7, 8, 9, 10], 'be88e109', 'be88e109', 'QC', 6), ('LT', [4, 5], 'fe4c5178', 'ctb1', 'QC', 6)],
  [('DC', [11, 12, 13], 'be88e109', 'be88e109', 'Q1', 10), ('RL', [4, 5, 6], 'ca3f02f5', '0b198f56', 'Q1', 10)]],
 ('prf', 2): [
  [('PT', [2, 3, 4], '147090be', '147090be', 'Q1', 20), ('RL', [1, 2, 3], '75f6d49d', '75f6d49d', 'Q1', 20)],
  [('DC', [2, 3, 4, 5, 6], 'c9475b37', 'c9475b37', 'Q1', 20), ('LT', [2, 3, 4, 5], 'fe4c5178', 'ctb1', 'QC', 10)],
  [('PT', [5, 6, 7], '5c40fdbe', '5c40fdbe', 'Q1', 20), ('DA', [2, 3, 4, 5], 'f35189f5', '0e1fbdd8', 'QC', 10), ('RL', [], '75f6d49d', '75f6d49d', 'RF', 10)],
  [('DC', [7, 8, 9, 10], 'be88e109', 'be88e109', 'QC', 10), ('LT', [6, 7, 8], 'fe4c5178', 'ctb1', 'QC', 10)],
  [('DC', [11, 12, 13], 'be88e109', 'be88e109', 'Q1', 20), ('RL', [4, 5, 6], 'ca3f02f5', '0b198f56', 'Q1', 20)]],
 ('pmce', 1): [
  [('PT', [2, 3], '014a1e3c', 'compr', 'Q1', 10), ('RL', [2, 3], '765d7f63', 'logprop', 'QC', 6)],
  [('DC', [2, 3, 4, 5], 'b93cf47a', 'dirind', 'QC', 6), ('DPM', [4], '7c493d3d', 'dpmapl', 'QC', 6)],
  [('PT', [4, 5], 'f6caff14', 'signif', 'Q1', 10), ('RL', [4, 5], '765d7f63', 'logprop', 'Q1', 10)],
  [('DC', [6, 7, 8], 'b93cf47a', 'dirind', 'QC', 6), ('DPM', [5, 6, 7], '7c493d3d', 'dpmapl', 'Q1', 10)],
  [('PT', [6, 7], '7c106169', 'ortog', 'QC', 6), ('RL', [6, 7, 8], 'e2d0fe0b', 'relarb', 'Q1', 10)]],
 ('pmce', 2): [
  [('PT', [2, 3], '014a1e3c', 'compr', 'Q1', 20), ('RL', [2, 3], '765d7f63', 'logprop', 'QC', 10), ('DPM', [4], '7c493d3d', 'dpmapl', 'QC', 10)],
  [('DC', [2, 3, 4, 5], 'b93cf47a', 'dirind', 'QC', 10), ('HCE', [3, 4, 5, 6], '6709d7f6', 'hcecol', 'Q1', 20)],
  [('PT', [4, 5], 'f6caff14', 'signif', 'Q1', 20), ('DPM', [5, 6, 7], '7c493d3d', 'dpmapl', 'Q1', 20)],
  [('DC', [6, 7, 8], 'b93cf47a', 'dirind', 'QC', 10), ('RL', [4, 5], '765d7f63', 'logprop', 'Q1', 15), ('AP', [2, 3], 'cd11236b', 'procorg', 'Q1', 15)],
  [('PT', [6, 7, 8, 9], '7c106169', 'ortog', 'QC', 10), ('RL', [6, 7, 8], 'e2d0fe0b', 'relarb', 'Q1', 20)]],
 ('cfo', 1): [
  [('PT', [2, 3], 'd628809b', 'compr', 'Q1', 10), ('RL', [2, 3], '21aaa1c7', 'logprop', 'QC', 6)],
  [('DC', [2, 3, 4, 5], '6530b3d1', 'dirind', 'QC', 6), ('DPM', [2], 'f10217e9', 'dpmapl', 'QC', 6)],
  [('PT', [4, 5], '9dd779d6', 'signif', 'Q1', 10), ('RL', [4, 5], '21aaa1c7', 'logprop', 'Q1', 10)],
  [('DC', [6, 7, 8], '6530b3d1', 'dirind', 'QC', 6), ('DPM', [3, 4, 5], 'f10217e9', 'dpmapl', 'Q1', 10)],
  [('PT', [6, 7], 'e3dc3644', 'ortog', 'QC', 6), ('RL', [6, 7, 8], 'ce039d43', 'relarb', 'Q1', 10)]],
 ('cfo', 2): [
  [('PT', [2, 3], 'd628809b', 'compr', 'Q1', 20), ('RL', [2, 3], '21aaa1c7', 'logprop', 'QC', 10), ('DPM', [2], 'f10217e9', 'dpmapl', 'QC', 10)],
  [('DC', [2, 3, 4, 5], '6530b3d1', 'dirind', 'QC', 10), ('HCE', [2, 3, 4], 'b3e519c3', 'hcecol', 'Q1', 20)],
  [('PT', [4, 5], '9dd779d6', 'signif', 'Q1', 20), ('DPM', [3, 4, 5], 'f10217e9', 'dpmapl', 'Q1', 20)],
  [('DC', [6, 7, 8], '6530b3d1', 'dirind', 'QC', 10), ('DP', [2, 3, 4, 5], 'e56acebb', 'penapl', 'QC', 10), ('RL', [], '21aaa1c7', 'logprop', 'RF', 10)],
  [('PT', [6, 7, 8, 9], 'e3dc3644', 'ortog', 'QC', 10), ('RL', [4, 5], '21aaa1c7', 'logprop', 'Q1', 20)]],
 ('ppce', 1): [
  [('PT', [2, 3], '33d63d79', 'compr', 'Q1', 10), ('RL', [1, 2], '540ce92e', 'logprop', 'QC', 6)],
  [('DC', [2, 3], '26c3cdcb', 'teocon', 'Q1', 10), ('DC', [4], 'd6aa1b5a', 'princfund', 'Q1', 8), ('DA', [4, 5], '6a67071f', 'estgov', 'QC', 6)],
  [('PT', [4, 5], '83f4b096', 'signif', 'Q1', 10), ('RL', [3, 4], '540ce92e', 'logprop', 'Q1', 10)],
  [('DA', [6, 7, 8], '6a67071f', 'estgov', 'Q1', 10), ('DC', [5], '549c6a1a', 'dirfund', 'QC', 6)],
  [('DC', [6, 7, 8, 9], '549c6a1a', 'dirfund', 'QC', 6), ('RL', [], '540ce92e', 'logprop', 'RF', 10)]],
 ('ppce', 2): [
  [('PT', [2, 3], '33d63d79', 'compr', 'Q1', 20), ('RL', [1, 2], '540ce92e', 'logprop', 'QC', 10), ('DC', [2, 3], '26c3cdcb', 'teocon', 'Q1', 20)],
  [('DC', [4], 'd6aa1b5a', 'princfund', 'Q1', 15), ('DA', [4, 5, 6, 7, 8], '6a67071f', 'estgov', 'Q1', 20)],
  [('PT', [4, 5], '83f4b096', 'signif', 'Q1', 20), ('RL', [3, 4], '540ce92e', 'logprop', 'Q1', 20), ('DC', [5], '549c6a1a', 'dirfund', 'QC', 10)],
  [('DC', [6, 7, 8, 9], '549c6a1a', 'dirfund', 'QC', 10), ('PEN', [2, 3, 4, 5], 'be05dcf9', 'penapl', 'QC', 10)],
  [('DC', [10, 11, 12], '549c6a1a', 'dirfund', 'Q1', 20), ('DA', [9, 10, 11, 12], '25496b83', 'princadm', 'Q1', 20)]],
}
SECS[('ppce', 'DA')]  # noqa
SECS[('ppce', 'PT')]


def secs(course, tr, o):
    C = COURSES[course]
    for key in ((course, tr), (C['sec'], tr)):
        if key in SECS and o in SECS[key]:
            return SECS[key][o]
    raise KeyError((course, tr, o))


def esc(s): return s.replace("'", "''")


def build(course):
    C = COURSES[course]
    goals, items = [], []
    for g in (1, 2):
        for di, day in enumerate(PLAN[(course, g)]):
            num = di + 1
            due = START + dt.timedelta(days=di)
            gk = f'{g}-{num}'
            subjs = []; pos = 0; tot = 0; its = []
            for tr, ords, t8, cad, qk, n in day:
                if C['SH'][tr] not in subjs: subjs.append(C['SH'][tr])
                if ords:
                    s = sum(secs(course, tr, o) for o in ords)
                    mins = round(s / G[g]['div'])
                    tot += mins
                    its.append((gk, pos, 'A', t8, None, mins, '', ';'.join(f'v:{tr}:{o}' for o in ords))); pos += 1
                its.append((gk, pos, qk, t8, n, n * 3, '', f'q:{cad}')); pos += 1; tot += n * 3
            # tutorial do caderno de erros no último item
            last = its[-1]; its[-1] = last[:7] + (last[7] + ';tu',)
            items += its
            goals.append((gk, g, f'Meta {num:02d} – ' + ' · '.join(subjs), due.isoformat(), tot))
    return goals, items


TPL = open(D + 'first5.tpl').read()


def sql(course):
    C = COURSES[course]
    goals, items = build(course)
    gv = ',\n'.join(f"('{k}',{g},'{esc(t)}','{d}')" for k, g, t, d, _ in goals)
    iv = ',\n'.join(f"('{gk}',{p},'{c}','{t8}',{n if n is not None else 'null'}::int,{m}::int,'{x}','{mats}')" for gk, p, c, t8, n, m, x, mats in items)
    tv = ',\n'.join(f"('{k}','{esc(v)}')" for k, v in C['TR'].items())
    return TPL.replace('<CID>', C['cid']).replace('<GV>', gv).replace('<IV>', iv).replace('<TV>', tv), goals


if __name__ == '__main__':
    for c in COURSES:
        s, goals = sql(c)
        open(D + f'first5_{c}.sql', 'w').write(s)
        print(c, len(s), [(k, m) for k, _, _, _, m in goals])
