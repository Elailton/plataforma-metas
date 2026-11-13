"""Especificação pedagógica: recursos do curso e fontes oficiais, sem dados de aluno."""
from planejar import *

def build(snapshot,source_dir,today):
 p=Plan(snapshot,today);globals()["LAST"]=p;src=Path(source_dir)
 manifest=json.loads((src/'manifest.json').read_text())
 def official(cid,n,y):
  ms=[m for m in manifest if m['ok'] and m['number']==n and m['year']==y and 'anexo' not in m['title'].lower()]
  if not ms:raise ValueError(('OFFICIAL_SOURCE_MISSING',n,y))
  # prefer standalone clean original, except where a consolidated document is available
  ms.sort(key=lambda m:('consolid' not in m['title'].lower(),len(m['title'])))
  m=ms[0];return p.add_source(cid,f'Fonte oficial — Resolução CONTRAN nº {n}/{y}',m['url']+'/@@download/file',f'Texto oficial do Ministério dos Transportes; conferência em {today}. Correspondência curricular documentada no plano.')
 def packet(course,label,titles,theory,books,excerpt,**kwargs):
  cid=p.cid(course)
  return p.packet(cid,label,titles,[p.mat(cid,x) for x in theory],[p.mat(cid,x) for x in books],excerpt,**kwargs)
 # PMPE: corrigir a identidade de dois itens futuros cuja aula e orientação não correspondem.
 cid=p.cid('PMPE');t=p.topic(cid,'Defesa do Estado');g=next(g for g in p.goals.values() if g['course_id']==cid and number(g)==63 and 1 in g['target_groups'] and g['status']!='archived')
 assert not protected(g,today)
 for i in list(p.active[g['id']]):
  if i['id'] not in ['b0507825-ecf2-4fb9-82f6-f180840ffe91']:continue
  new=copy.deepcopy(i);new['topic_id']=t['parent_topic_id'];new['subtopic_id']=t['id']
  if i['suggested_questions']:
   new['materials']=[p.mat(cid,'Qconcursos - Estado de Defesa e Estado de Sítio')];new['instructions']='Questões — 1ª resolução de «Estado de Defesa e Estado de Sítio»: resolva 12 questões do caderno do Qconcursos indicado, sobre hipóteses de decretação, competência, prazos, controle político e limites constitucionais. Faça a correção e registre os erros (~36 min).'
  else:
   new['materials']=p.links[i['id']];new['instructions']='Assista à aula: Da Defesa do Estado e Das Instituições Democráticas - Do Estado de Defesa e do Estado de Sítio (~31 min em 1,5x). Anotação dirigida: compare hipóteses de decretação, autoridades competentes, prazos, controle pelo Congresso e restrições admitidas nos arts. 136 a 141 da Constituição. Em seguida, realize as questões do mesmo assunto nesta meta.'
  ni=p.replace(i,new);p.links[ni['id']]=ni['materials']
 p.new(g['id'],t,'Questões — Estado de Defesa e Estado de Sítio: resolva 12 questões do caderno indicado, comparando hipóteses de decretação, competência, prazos e controle pelo Congresso. Corrija as respostas e registre as dúvidas (~36 min).',12,[p.mat(cid,'Qconcursos - Estado de Defesa e Estado de Sítio')],'defesa-questoes')
 # CFO: o curso já tem as quatro aulas; explicitar os quatro recortes faltantes na lei e na prática.
 packet('CFO PMCE','Lei Maria da Penha: disposições, proteção e atuação institucional',
 ['Disposições preliminares','Medidas protetivas de urgência','Atuação do Ministério Público e assistência judiciária','Disposições transitórias e finais'],
 ['VADE MECUM PMCE CFO'],['Qconcursos - Lei Maria da Penha'],
 'Leia a Lei nº 11.340/2006 no Vade Mecum: arts. 1º a 4º (disposições preliminares), 18 a 24-A (medidas protetivas), 25 a 28 (Ministério Público e assistência judiciária) e 40 a 46 (disposições finais). Use o texto atualizado do curso.',reading=24,questions=12,earliest=30,latest=62,preferred=38)
 # PPCE: estudo dirigido por lei/PDF, conforme alternativa autorizada para assuntos sem aula própria.
 packet('PPCE','Agências executivas',['Agências executivas'],['6ca8f79f-0a30-4556-aba2-e854cd86e19b'],['Qconcursos - Delegação, agências e serviços públicos'],'Na apostila de Direito Administrativo, estude a qualificação de agência executiva, contrato de gestão, requisitos e distinção em relação às agências reguladoras.',questions=8,earliest=25,preferred=35)
 packet('PPCE','Eficiência e governança',['Eficiência, eficácia e efetividade no setor público','Governança e accountability'],['6ca8f79f-0a30-4556-aba2-e854cd86e19b'],['Qconcursos - Controle da administração','Qconcursos - Processo organizacional'],'Na apostila de Direito Administrativo, compare eficiência, eficácia e efetividade e estude governança, prestação de contas, transparência e responsabilização.',questions=12,earliest=25,preferred=39)
 packet('PPCE','Direitos humanos no ordenamento brasileiro',['Dignidade da pessoa humana e direitos humanos','Dimensões dos direitos humanos no Brasil'],['VADE MECUM PPCE'],['Qconcursos - Direitos humanos: conceito e fundamentos'],'No Vade Mecum, leia os arts. 1º, III, 3º, 4º, II, 5º e 6º da Constituição e relacione-os ao estudo das dimensões dos direitos humanos. Retome a classificação apresentada no material de Direitos Humanos do curso.',questions=12,earliest=25,preferred=43)
 packet('PPCE','Organização constitucional da segurança pública',['Organização da segurança pública'],['VADE MECUM PPCE'],['Qconcursos - Segurança pública na CF'],'Leia o art. 144 da Constituição no Vade Mecum: órgãos, atribuições, preservação da ordem pública e polícia penal.',questions=12,earliest=25,preferred=48)
 packet('PPCE','Regime disciplinar funcional',['Regime disciplinar'],['VADE MECUM PPCE'],['Qconcursos - Legislação do Estado do Ceará'],'No Vade Mecum PPCE, estude o regime disciplinar funcional aplicável à Polícia Penal do Ceará: deveres, transgressões, sanções, competências e procedimento. Diferencie esse regime funcional das regras disciplinares destinadas às pessoas privadas de liberdade.',reading=20,questions=10,earliest=35,preferred=53)
 packet('PPCE','Regimento Geral dos Estabelecimentos Prisionais',['Portaria nº 1.220/2014 (Regimento Geral dos Estabelecimentos Prisionais do Estado do Ceará)'],['VADE MECUM PPCE'],['Qconcursos - Execução penal: políticas e resoluções','Qconcursos - Lei de Execução Penal'],'No Vade Mecum PPCE, leia o Regimento Geral dos Estabelecimentos Prisionais do Ceará, Portaria nº 1.220/2014: direitos, deveres, faltas, sanções e procedimentos relativos às pessoas privadas de liberdade. Relacione a leitura aos arts. 44 a 60 da Lei de Execução Penal.',reading=20,questions=10,earliest=35,preferred=56)
 # PRF: legislação vigente para as referências históricas do edital.
 cid=p.cid('PRF');missing=json.loads((Path(snapshot)/'SGA_-_PRF-missing.json').read_text())
 mapping={4:(911,2022),14:(993,2023),24:(968,2022),36:(36,1998),92:(938,2022),110:(110,2000),216:(960,2022),227:(970,2022),253:(960,2022),254:(960,2022),268:(970,2022),290:(882,2021),292:(916,2022),349:(955,2022),360:(1020,2025),432:(1031,2026),441:(946,2022),453:(940,2022),520:(882,2021),552:(945,2022),619:(918,2022),667:(970,2022),723:(723,2018),735:(735,2018),789:(1020,2025),803:(882,2021),809:(1027,2026),780:(969,2022),740:(1004,2023),471:(909,2022)}
 grouped=collections.defaultdict(list)
 for t in missing:
  m=re.search(r'Resolução nº (\d+)/(\d+)',t['title'])
  if m:
   old=int(m[1]);grouped[mapping.get(old,('education',0))].append(t)
 qbook=p.mat(cid,'Qconcursos - Resoluções do CONTRAN');normjobs=[]
 for k,ts in grouped.items():
  n,y=k
  if n=='education':
   source=p.mat(cid,'Nosso PDF - Código de Trânsito Brasileiro');label='Educação para o trânsito';excerpt='No Código de Trânsito Brasileiro, leia os arts. 74 a 79: educação para o trânsito, campanhas permanentes, atribuições e articulação entre órgãos. A referência anual de 2021 do edital é tratada pelo conteúdo permanente do CTB, sem reproduzir um calendário vencido.'
  else:
   source=official(cid,n,y);label=f'Resolução CONTRAN nº {n}/{y}'
   excerpt=f'Leia a fonte oficial da Resolução CONTRAN nº {n}/{y}, nos dispositivos correspondentes aos assuntos indicados neste bloco. Compare requisitos, competências, hipóteses de aplicação e exceções. '
   old=', '.join(t['title'].replace('Resolução nº ','') for t in ts)
   excerpt+=f'Correspondência com as referências do edital: {old}. Estude a regra atual da fonte vinculada, não a redação histórica revogada.' if not (len(ts)==1 and str(n)+'/'+str(y) in ts[0]['title']) else 'Leia os dispositivos do assunto na fonte vinculada.'
  updates={723:[(844,2021)],918:[(991,2023)],960:[(989,2022)],970:[(1024,2026)],882:[(899,2022),(994,2023),(1005,2024),(1015,2024)],916:[(1021,2026)]}.get(n,[])
  sources=[source]+[official(cid,a,b) for a,b in updates]
  if updates:excerpt+=' Considere também as alterações nas fontes oficiais complementares vinculadas.'
  normjobs.append((cid,label,[t['title'] for t in ts],sources,[qbook],excerpt,12 if n in [36,110,909,940,955] else 20))
 def prf(label,titles,books,excerpt,reading=20,questions=12,preferred=35,earliest=20):
  p.packet(cid,label,titles,[p.mat(cid,'Vade Mecum PRF')],[p.mat(cid,b) for b in books],excerpt,reading=reading,questions=questions,earliest=earliest,latest=87,preferred=preferred)
 prf('Direitos e garantias individuais, coletivos e sociais',['Direito à vida, à liberdade, à igualdade, à segurança e à propriedade','Garantias constitucionais individuais','Garantias dos direitos coletivos, sociais e políticos'],['Qconcursos - Direitos individuais','Qconcursos - Direitos sociais, nacionalidade e políticos'],'No Vade Mecum, retome a Constituição, arts. 5º a 17, priorizando direitos individuais e coletivos, garantias, direitos sociais e direitos políticos. Sistematize as diferenças entre direito e garantia e as restrições previstas no texto constitucional.',reading=30,preferred=30)
 prf('Servidores: disposições constitucionais',['Disposições constitucionais aplicáveis'],['Qconcursos - Agentes públicos e Lei 8.112'],'Leia no Vade Mecum os arts. 37 a 41 da Constituição: ingresso, cargos, remuneração, acumulação, estabilidade e responsabilidades.',preferred=33)
 prf('Lei nº 8.112/1990',['Lei nº 8.112/1990 e suas alterações'],['Qconcursos - Agentes públicos e Lei 8.112'],'No Vade Mecum, leia a Lei nº 8.112/1990: provimento, vacância, direitos, vantagens, deveres, proibições e regime disciplinar. Relacione a leitura ao bloco de agentes públicos já programado no curso.',reading=40,preferred=47)
 prf('Carreira e indenizações da PRF',['Carreira de policial rodoviário federal: Lei nº 9.654/1998 e alterações','Lei nº 12.855/2013 (indenização fronteiras)','Lei nº 13.712/2018 (indenização PRF)','Decreto nº 8.282/2014 (carreira de PRF)'],['Qconcursos - Carreira PRF (Lei 9.654/1998)'],'No Vade Mecum PRF, estude a Lei nº 9.654/1998 e as normas de desenvolvimento na carreira, a indenização da Lei nº 12.855/2013 e as alterações da Lei nº 13.712/2018. Compare beneficiários, requisitos, vedações e regras de progressão/promoção do Decreto nº 8.282/2014 e suas alterações.',reading=40,questions=8,preferred=54)
 prf('Forma de governo e funções do Executivo',['Forma e sistema de governo','Chefia de Estado e chefia de governo'],['Qconcursos - Poder Executivo'],'Leia no Vade Mecum os arts. 76 a 91 da Constituição. Compare república e monarquia, presidencialismo e parlamentarismo e as funções de chefe de Estado e chefe de governo.',preferred=38)
 prf('Segurança pública e atribuições da PRF',['Organização da segurança pública','Atribuições constitucionais da Polícia Rodoviária Federal'],['Qconcursos - Defesa do Estado e segurança pública','Qconcursos - PRF: art. 144 e Decreto 1.655'],'Leia o art. 144 da Constituição, especialmente o § 2º, no Vade Mecum. Diferencie as funções dos órgãos de segurança pública e as atribuições constitucionais da PRF.',preferred=41)
 prf('Excesso punível',['Excesso punível'],['Qconcursos - Ilicitude'],'Leia o art. 23, parágrafo único, do Código Penal no Vade Mecum e relacione o excesso doloso ou culposo às causas de exclusão da ilicitude.',reading=10,questions=8,preferred=36)
 for title,book,articles in [
  ('Crimes contra a dignidade sexual','Qconcursos - Crimes contra a dignidade sexual','arts. 213 a 234-C'),
  ('Crimes contra a incolumidade pública','Qconcursos - Crimes contra a incolumidade pública','arts. 250 a 285'),
  ('Crimes contra a fé pública','Qconcursos - Crimes contra a fé pública','arts. 289 a 311-A'),
  ('Crimes contra a Administração Pública','Qconcursos - Crimes contra a administração pública','arts. 312 a 359-H')]:
  prf(title,[title],[book],f'No Vade Mecum, estude os {articles} do Código Penal, nos crimes previstos no edital. Compare elementos do tipo, sujeitos, consumação e distinções entre figuras próximas.',reading=25,questions=10,preferred=50)
 prf('Provas e preservação do local de crime',['Preservação de local de crime','Provas ilícitas'],['Qconcursos - Local de crime e diligências','Qconcursos - Provas'],'No Vade Mecum, leia os arts. 6º, I e II, 157 e 158-A a 158-F do CPP: preservação do local, prova ilícita, derivação, exceções e cadeia de custódia.',reading=25,preferred=39)
 # Matemática e idioma: estudo reverso com os textos e comentários dos cadernos do próprio curso.
 for label,titles,books,excerpt in [
 ('Razão, proporção e sequências',['Razão e proporção com aplicações','Sequências numéricas'],['Qconcursos - Razão, proporção e regra de três','Qconcursos - Sequências, PA e PG'],'Use os enunciados e comentários dos cadernos para sistematizar razão, proporção, proporcionalidade direta/inversa e reconhecimento de padrões. Registre uma resolução-modelo por tipo, antes de avançar para a prática.'),
 ('Leitura e gramática aplicada ao idioma',['Compreensão de texto escrito em língua espanhola','Itens gramaticais relevantes para a compreensão dos conteúdos semânticos'],['Qconcursos - Inglês','Qconcursos - Espanhol'],'Escolha somente o idioma que você fará na prova: inglês ou espanhol. Leia os textos associados às questões do caderno correspondente, identifique ideia central, referentes, conectivos e estruturas gramaticais que alteram o sentido. Use os comentários para conferir a leitura; não é necessário estudar os dois idiomas.')]:
  bs=[p.mat(cid,b) for b in books];p.packet(cid,label,titles,bs,bs,excerpt,reading=20,questions=10,earliest=20,latest=82,preferred=45)
 for c,label,titles,sources,books,excerpt,reading in normjobs:
  p.packet(c,label,titles,sources,books,excerpt,reading=reading,questions=8,earliest=13,latest=87,preferred=42)
 # Atualizar também as referências revogadas já presentes nas metas futuras, mantendo quantidade e materiais anteriores.
 replacements={'160/2004':(973,2022),'211/2006':(882,2021),'210/2011':(882,2021),'561/2015':(985,2022)}
 for old in list(p.original_items.values()):
  g=p.goals[old['goal_id']]
  if old['archived_at'] or g['course_id']!=cid or protected(g,today):continue
  hits=[ref for ref in replacements if ('Resolução nº '+ref) in old['instructions']]
  if not hits:continue
  new=copy.deepcopy(old);new['materials']=list(p.links[old['id']]);notes=[]
  for ref in hits:
   n,y=replacements[ref];mid=official(cid,n,y)
   if mid not in new['materials']:new['materials'].append(mid)
   new['instructions']=new['instructions'].replace('Resolução nº '+ref,f'Resolução CONTRAN nº {n}/{y}')
   notes.append(f'A referência histórica {ref} do edital corresponde ao conteúdo da Resolução CONTRAN nº {n}/{y}; use a fonte oficial vinculada e suas alterações.')
  new['instructions']='Atualização legislativa: '+' '.join(notes)+' '+new['instructions']
  ni=p.replace(old,new);p.links[ni['id']]=ni['materials']
 for item in p.new_items:
  item['instructions']=item['instructions'].replace('92/1998','92/1999')
 return p

if __name__=='__main__':
 snapshot,sources,out=sys.argv[1:4];today=sys.argv[4] if len(sys.argv)>4 else str(datetime.date.today())
 p=build(snapshot,sources,today);data=p.output();Path(out).write_text(json.dumps(data,ensure_ascii=False,indent=2))
 print(json.dumps({'changed_goals':len(p.changed),'archived_items':len(p.archives),'new_items':len(p.new_items),'optional_items':len(p.extra_items),'sources':len(p.new_materials),'packets':len(p.packets),'max_minutes':max(r['minutes'] for r in data['projected'])},ensure_ascii=False))
