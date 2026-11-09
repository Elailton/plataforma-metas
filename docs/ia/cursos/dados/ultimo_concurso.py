# Assuntos do edital cobrados na ÚLTIMA PROVA de cada curso (regra de 09/11/2026).
# Fonte: relatório "ASSUNTOS NO TEC" da última prova (pastas do usuário) ou, sem relatório, a própria prova.
# Código = posição da disciplina . posição do tópico [. posição do subtópico], como gravado no banco.
# Marcar um subtópico marca também o tópico. Tópico marcado sem subtópico marcado = todos os
# subtópicos herdam o selo nas metas. Questões anuladas não contam.
# Gerar SQL:  python3 -I ultimo_concurso.py <slug>
import sys
CURSOS = {
 # PMPE — Soldado AOCP, 28/01/2024 (60 questões)
 "sistema-guiado-da-aprovacao": [
   "0.0", "0.1", "0.4", "0.5", "0.8.5", "0.10", "0.11", "0.12",            # Português
   "1.3.0", "1.4.2", "1.4.4", "1.4.5", "1.5", "1.7",                        # História de PE
   "2.0.0", "2.0.1", "2.1.2", "2.1.3", "2.1.4", "2.2", "2.3.0", "2.3.6",    # RLM
   "3.0.0", "3.2.0", "3.2.6", "3.5.0", "3.6.0", "3.6.1", "3.6.3", "3.6.4",  # Informática
   "4.0", "4.1.0", "4.1.5", "4.2.1", "4.2.2", "4.3.0", "4.3.1", "4.3.2", "4.4.0",  # Constitucional
   "5.0.0", "5.1.1", "5.3", "5.6", "5.7", "5.8", "5.11", "5.12", "5.13", "5.16",   # DH e Leg. Extravagante
 ],
 # GMF — Guarda Municipal de Fortaleza, IDECAN, 18/06/2023 (80 questões; anuladas 29, 46, 76)
 "sga-gmf": [
   "1.1", "1.3", "1.4", "1.5", "1.6", "1.8", "1.9", "1.15",                 # Português
   "2.1.1", "2.1.2", "2.2.4", "2.3", "2.4.1",                                # RLM e Matemática
   "3.1.3", "3.2", "3.3", "3.4", "3.6", "3.8.1", "3.9.1",                    # Informática
   "4.1.1", "4.1.2", "4.1.3",                                                # Atualidades
   "6.2.1", "6.2.2", "6.3.1", "6.3.2", "6.3.3",                              # Dir. Administrativo
   "7.1", "7.2", "7.3", "7.4.1", "7.5", "7.6", "7.7", "7.8.1", "7.8.4",      # Constitucional e DH
   "8.1", "8.2", "8.3", "8.4",                                               # Penal
   "9.1", "9.7", "9.9", "9.10.1", "9.10.2", "9.11",                          # Leg. extravagante e municipal
 ],
 # PRF — Policial Rodoviário Federal, CEBRASPE, 2021 (parte comum + idiomas; anuladas fora)
 # CONTRAN cobradas e substitutas no edital: 882/2021→210, 909/2022→471, 960/2022→254,
 # 969/2022→780, 1.004/2023→740 (o TEC reclassificou as questões nas resoluções novas).
 "sga-prf": [
   "1.1", "1.5.1", "1.5.5", "1.6.1", "1.6.2", "1.7.1", "1.7.2", "1.7.4",     # Português
   "2.1", "2.2.2", "2.3.1", "2.5.1", "2.5.2",                                # RLM
   "3.2.1", "3.2.2", "3.3.1", "3.4.1", "3.4.2", "3.5",                       # Informática
   "4.1", "4.8", "4.9",                                                      # Física
   "5.4.3", "5.4.4", "5.4.5", "5.5.1", "5.5.2",                              # Ética
   "6.4", "6.7",                                                             # Geopolítica
   "7.1.1", "7.1.2", "7.2.1", "7.2.2",                                       # Idiomas
   "8.1", "8.2", "8.3.8", "8.3.13", "8.3.22", "8.3.23", "8.3.25", "8.3.32", "8.3.33", "8.3.35",  # Trânsito
   "9.1.1", "9.3.1", "9.3.4", "9.3.7", "9.4.1", "9.5.2", "9.6.2", "9.8.2",   # Administrativo
   "10.2.1", "10.2.3", "10.2.6", "10.4",                                     # Constitucional
   "11.6.5", "11.6.6",                                                       # Penal
   "12.3.1", "12.3.6", "12.4.2", "12.5",                                     # Processo Penal
   "13.1", "13.3", "13.6", "13.8", "13.9", "13.12",                          # Legislação Especial
   "14.1.1", "14.2",                                                         # Direitos Humanos
 ],
 # PMCE — Soldado QPPM, CEV/UECE, 13/07/2025 (100 questões; anuladas 9, 37, 57, 90).
 # Direitos Humanos e Segurança Pública vieram "Sem classificação" no TEC: só as leis identificadas.
 "sga-pmce": [
   "1.1", "1.3", "1.4", "1.6", "1.7", "1.8", "1.9", "1.10", "1.14", "1.15", "1.16",  # Português
   "2.2.3", "2.2.4", "2.3", "2.4.1",                                          # RLM / Matemática
   "3.1", "3.3.3", "3.3.4", "3.4.1", "3.5.1", "3.7.2", "3.8",                 # Atualidades / História do CE
   "4.1", "4.2.1", "4.3.4", "4.7", "4.8.3",                                   # Adm. Pública
   "5.1.1", "5.1.3", "5.2.2", "5.2.3", "5.3.3", "5.4.2", "5.5.1", "5.6.1", "5.8",  # Constitucional
   "6.6", "6.7", "6.14",                                                      # Direitos Humanos
   "7.1", "7.2", "7.3", "7.4", "7.5.3", "7.5.4", "7.6", "7.7", "7.9", "7.11", "7.12", "7.13",  # Penal Militar
   "8.2", "8.3", "8.4", "8.5", "8.6", "8.7",                                  # Processo Penal
   "9.4", "9.6",                                                              # Criminologia
   "10.1", "10.4",                                                            # Segurança Pública
 ],
 # CFO PMCE — 2º Tenente QOPM, IDECAN, fev/2023 (100 questões; anuladas 17, 19)
 "sga-cfo-pmce": [
   "1.1", "1.3", "1.5", "1.6", "1.7", "1.8", "1.9", "1.10",                  # Português
   "2.1.1", "2.2.2", "2.2.3", "2.3", "2.4.1", "2.4.2", "2.4.3",              # RLM
   "3.1", "3.2", "3.3.1", "3.3.2",                                           # Atualidades
   "4.3.1", "4.7", "4.8.2", "4.8.5", "4.11",                                 # Adm. Pública
   "5.1.1", "5.4.1", "5.5", "5.7", "5.8",                                    # Constitucional
   "6.1", "6.3", "6.8", "6.10", "6.11",                                      # Direitos Humanos
   "7.1", "7.2", "7.4", "7.5.1", "7.5.4", "7.6", "7.8", "7.9", "7.11", "7.12", "7.13",  # Penal Militar
   "8.1.1", "8.1.4", "8.1.7", "8.2.11", "8.4", "8.7", "8.10", "8.21", "8.27", "8.28", "8.31",  # Penal / Proc.
   "9.1", "9.2.2", "9.2.3", "9.2.8",                                         # Abuso / Maria da Penha
   "10.3", "10.8",                                                           # Segurança Pública
 ],
 # PPCE — Policial Penal do Ceará, IDECAN, 14/07/2024 (90 questões; anuladas 13, 42, 82, 83)
 "sga-ppce": [
   "1.1.1", "1.1.2", "1.2.1", "1.3.1", "1.3.2", "1.4.1", "1.4.2",            # Português
   "2.1", "2.2", "2.3", "2.4", "2.11.2",                                     # Informática
   "3.1.1", "3.2.4", "3.3", "3.4.1", "3.4.2",                                # RLM
   "4.2.3", "4.9.2", "4.9.4", "4.10", "4.11", "4.12",                        # Adm. Pública e Ética
   "5.1",                                                                    # Legislação Específica (CE-CE)
   "6.1.2", "6.1.4", "6.2.1", "6.2.3", "6.2.6", "6.2.7", "6.2.21", "6.3", "6.4.5", "6.5",  # Dir. Administrativo
   "7.2.1", "7.2.3", "7.3.1", "7.5.1", "7.8.1", "7.9.1", "7.9.2", "7.9.4",   # Constitucional
   "8.2", "8.4", "8.5", "8.7",                                               # Direitos Humanos
   "9.3.1", "9.3.4", "9.4", "9.6", "9.7", "9.8", "9.12",                     # Penal
   "10.1", "10.2", "10.3", "10.6", "10.7", "10.11", "10.13", "10.14.1", "10.14.5",  # Leg. Extravagante
 ],
 # PRF ADM — Agente Administrativo, FUNCAB, 25/05/2014 (60 questões)
 "sga-prf-adm": [
   "1.1", "1.3", "1.4", "1.5", "1.7", "1.8", "1.9", "1.10", "1.11",          # Português
   "2.1", "2.2", "2.5.1", "2.5.2", "2.5.3",                                  # Ética
   "3.2", "3.3.2", "3.3.3", "3.5", "3.6", "3.7",                             # RLM
   "4.1.1", "4.2.1", "4.3.1", "4.4.1",                                       # Constitucional
   "5.1", "5.1.1", "5.3", "5.4", "5.5", "5.5.1", "5.5.2", "5.7", "5.8",      # Dir. Administrativo
   "6.1", "6.1.1", "6.2.3", "6.2.5", "6.2.8", "6.2.9", "6.3",                # Administração
   "7.1", "7.2.1", "7.2.2", "7.2.3", "7.2.4", "7.4",                         # Arquivologia
   "8.1", "8.2", "8.3", "8.5",                                               # Informática
   "9.1", "9.2", "9.3", "9.4",                                               # Legislação PRF
 ],
 # PCCE — Oficial Investigador, CEV/UECE, 2025 (100 questões)
 "sga-pcce": [
   "1.1", "1.2", "1.3.1", "1.3.2", "1.4.1", "1.5.2", "1.5.3", "1.5.4", "1.5.5", "1.6.1",  # Português
   "2.1", "2.2", "2.3", "2.4", "2.5", "2.6", "2.8",                          # Informática
   "3.2", "3.3.3", "3.6", "3.7",                                             # RLM
   "4.3.1", "4.4.1", "4.5", "4.6.1", "4.7.1", "4.9.2", "4.10.2",             # Constitucional
   "5.2", "5.3.3", "5.5.4", "5.6.3", "5.7.1", "5.8.2", "5.10",               # Dir. Administrativo
   "6.1.1", "6.1.5", "6.3.6", "6.6", "6.9", "6.10", "6.12",                  # Penal
   "7.1.1", "7.1.2", "7.2.1", "7.3", "7.3.2", "7.4", "7.5.2",                # Processo Penal
   "8.4", "8.6", "8.11", "8.14", "8.21", "8.22", "8.23", "8.25",             # Leg. Especial
   "9.1", "9.2", "9.3",                                                      # Legislação Estadual
   "10.1", "10.2", "10.3", "10.6", "10.11",                                  # Contabilidade
   "11.1.1", "11.1.3", "11.3.1",                                             # Criminologia
   "12.3.1", "12.4", "12.5", "12.6.1",                                       # Medicina Legal
   "13.1", "13.2.1", "13.2.3", "13.2.5", "13.2.7", "13.2.8",                 # Estatística
 ],
 # GCM Itaitinga — Guarda Municipal, FUNCEPE, 23/08/2015 (60 questões). Sem relatório do TEC:
 # classificação feita questão a questão na prova. Q44 (JECRIM), Q45 (peculato), Q46 (acumulação)
 # e Q49 (contravenções) estão fora do edital e não marcam nada.
 "sga-gcm-itaitinga": [
   "1.1", "1.3", "1.4", "1.5", "1.7.1", "1.7.2", "1.8", "1.9", "1.10",       # Português
   "2.1", "2.2", "2.7", "2.8", "2.9",                                        # Matemática
   "3.1", "3.2", "3.3", "3.5", "3.6",                                        # Atualidades
   "4.1", "4.3", "4.4", "4.5", "4.12", "4.13",                               # Específicos
 ],
}

def sql(slug, codes):
    vals = ",".join(f"('{c}')" for c in codes)
    return f"""with codes(code) as (values {vals}),
x as (
  select st.id, st.parent_topic_id,
         case when p.id is null then s.position||'.'||st.position else s.position||'.'||p.position||'.'||st.position end code
  from public.syllabus_topics st
  join public.subjects s on s.id = st.subject_id
  join public.courses c on c.id = s.course_id and c.slug = '{slug}'
  left join public.syllabus_topics p on p.id = st.parent_topic_id
),
hit as (select x.* from x join codes using (code)),
upd as (
  update public.syllabus_topics set last_exam = true
  where id in (select id from hit union select parent_topic_id from hit where parent_topic_id is not null)
  returning id
)
select (select count(*) from codes) codigos, (select count(*) from hit) achados, (select count(*) from upd) marcados,
       (select string_agg(code, ',') from codes where code not in (select code from hit)) nao_achados"""

if __name__ == "__main__":
    slug = sys.argv[1]
    print(sql(slug, CURSOS[slug]))
