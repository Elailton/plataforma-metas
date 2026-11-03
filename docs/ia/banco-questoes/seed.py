"""Gera os arquivos SQL de carga do banco de questões (provas anteriores) para o SQL Editor."""
import json, re
from classify import C

SRC = {
 'pmpe': dict(board='Instituto AOCP', year=2024, applied='2024-01-28', org='Polícia Militar de Pernambuco (PMPE)', role='Soldado', booklet='Prova Tipo 1', total=60),
 'gmf': dict(board='IDECAN', year=2023, applied='2023-06-18', org='Prefeitura de Fortaleza (SESEC)', role='Guarda Municipal', booklet='Tipo A', total=80),
 'pmce': dict(board='CEV/UECE', year=2025, applied='2025-07-13', org='Polícia Militar do Ceará (PMCE)', role='Soldado QPPM', booklet='Gabarito 1', total=100),
 'cfo': dict(board='IDECAN', year=2023, applied=None, org='Polícia Militar do Ceará (PMCE)', role='2º Tenente QOPM (CFO)', booklet='Tipo B', total=100),
 'ppce': dict(board='IDECAN', year=2024, applied='2024-07-14', org='Polícia Penal do Ceará (SAP/CE)', role='Policial Penal', booklet='Tipo B', total=90),
 'prf': dict(board='Cebraspe', year=2021, applied=None, org='Polícia Rodoviária Federal (PRF)', role='Policial Rodoviário Federal', booklet='578_PRF_001_01 (itens 9 a 120)', total=112),
 'prfi': dict(board='Cebraspe', year=2021, applied=None, org='Polícia Rodoviária Federal (PRF)', role='Policial Rodoviário Federal', booklet='578_PRF_ING_01 (Inglês)', total=8),
 'prfe': dict(board='Cebraspe', year=2021, applied=None, org='Polícia Rodoviária Federal (PRF)', role='Policial Rodoviário Federal', booklet='578_PRF_ESP_02 (Espanhol)', total=8),
}

def lit(s):
    assert '$q$' not in s
    return '$q$' + s + '$q$'

def sql_for(ex):
    c, s = C[ex], SRC[ex]
    qs = json.load(open(f'final_{ex}.json'))
    annulled = sorted(q['n'] for q in qs if q['annulled'])
    good = [q for q in qs if not q['annulled']]
    note = 'Gabarito oficial definitivo. Questões anuladas não foram importadas.'
    out = [f"-- {s['org']} — {s['role']} — {s['board']} {s['year']} ({s['booklet']}): {len(good)} questões\n"]
    out.append(f"""insert into public.question_bank_sources (course_id, board, exam_year, applied_on, organization, role_name, booklet, total_questions, annulled_numbers, notes)
select c.id, {lit(s['board'])}, {s['year']}, {("'" + s['applied'] + "'::date") if s['applied'] else 'null'}, {lit(s['org'])}, {lit(s['role'])}, {lit(s['booklet'])}, {s['total']}, '{{{','.join(map(str, annulled))}}}'::int[], {lit(note)}
from public.courses c where c.slug = '{c['slug']}'
  and not exists (select 1 from public.question_bank_sources x where x.course_id = c.id and x.board = {lit(s['board'])} and x.exam_year = {s['year']} and x.role_name = {lit(s['role'])} and coalesce(x.booklet, '') = {lit(s['booklet'])});
""")
    rows = []
    for q in good:
        alts = json.dumps(q['alternatives'], ensure_ascii=False)
        t8 = c['top'][q['n']] or ''
        rows.append(f"({q['n']}, {c['subj'][q['n']]}, '{t8}', {lit(q['statement'])}, {lit(alts)}::jsonb, '{q['key']}')")
    out.append(f"""with src as (
  select s.id, s.course_id from public.question_bank_sources s join public.courses c on c.id = s.course_id
  where c.slug = '{c['slug']}' and s.board = {lit(s['board'])} and s.exam_year = {s['year']} and s.role_name = {lit(s['role'])} and coalesce(s.booklet, '') = {lit(s['booklet'])}
), v(n, spos, t8, statement, alternatives, correct_key) as (values
""" + ',\n'.join(rows) + f"""
), ins as (
  insert into public.question_bank_items (course_id, origin, source_id, source_number, subject_id, topic_id, statement, alternatives)
  select src.course_id, 'prova_anterior', src.id, v.n, sb.id, t.id, v.statement, v.alternatives
  from v cross join src
  join public.subjects sb on sb.course_id = src.course_id and sb.position = v.spos
  left join public.syllabus_topics t on v.t8 <> '' and t.subject_id = sb.id and left(t.id::text, 8) = v.t8
  on conflict (source_id, source_number) where source_id is not null do nothing
  returning id, source_number
)
insert into public.question_bank_answer_keys (item_id, correct_key)
select ins.id, v.correct_key from ins join v on v.n = ins.source_number
on conflict (item_id) do nothing;
""")
    return ''.join(out), len(good)

def images_sql():
    crops = json.load(open('crops.json'))
    rows = []
    for k, v in crops.items():
        data = open(v['file'], 'rb').read().hex()
        rows.append(f"('{v['hash']}', '{v['mime']}', decode('{data}', 'hex'))")
    return ("-- Figuras das questões (tabela já existente dos mini simulados, referenciadas por [[imagem:hash]])\n"
            "insert into public.mini_quiz_images (hash, mime, data) values\n" + ',\n'.join(rows) + "\non conflict (hash) do nothing;\n")

if __name__ == '__main__':
    files = {'01_imagens': ['IMG'], '02_pmpe_gmf': ['pmpe', 'gmf'], '03_pmce_cfo': ['pmce', 'cfo'], '04_ppce_prf': ['ppce', 'prf', 'prfi', 'prfe']}
    total = 0
    for fname, exs in files.items():
        body = ['begin;\n']
        for ex in exs:
            if ex == 'IMG':
                body.append(images_sql())
            else:
                sq, n = sql_for(ex); body.append(sq); total += n
        body.append('commit;\n')
        txt = '\n'.join(body)
        open(f'carga_banco_questoes_{fname}.sql', 'w').write(txt)
        print(fname, round(len(txt.encode()) / 1024), 'KB')
    print('questões', total)
