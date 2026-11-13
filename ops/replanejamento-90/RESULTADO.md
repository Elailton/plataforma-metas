# Fechamento do edital cadastrado até a Meta 90 — seis cursos

Aplicado e conferido em produção em 13/11/2026. Público autorizado: Grupo 1, com conferência pela conta de teste. Nenhuma nova liberação para G2. Meta 0 fica fora das 90 metas de estudo.

## Decisões do usuário

- Reorganizar os seis cursos em andamento, sem alterar metas já liberadas nem qualquer meta com progresso.
- Usar legislação/PDF e questões quando faltar videoaula adequada no próprio curso, com recursos conferidos.
- Conferir as substituições das resoluções da PRF para usar normas vigentes, mantendo correspondência com o conteúdo do edital.
- **Manter todo o volume e aceitar metas mais longas.** A opção de reduzir questões/transferir aprofundamentos a “Se sobrar tempo” foi recusada. Nenhuma transferência foi planejada.
- PCCE e PRF ADM foram discutidos anteriormente, mas não fazem parte desta aplicação de seis cursos.

## Cobertura conferida no banco

A cobertura é do planejamento, não de conclusões dos alunos. Conta unidades terminais do edital com item próprio ou ancestral programado. As lacunas acrescentadas foram detalhadas em atividades de leitura e prática; não houve marcação automática de estudo.

| Curso | Unidades do edital | Lacunas antes | Lacunas depois | Metas futuras ajustadas |
|---|---:|---:|---:|---:|
| PMPE | 182 | 1 | 0 | 1 |
| GMF | 156 | 0 | 0 | 0 |
| PRF | 221 | 55 | 0 | 68 |
| PMCE | 156 | 0 | 0 | 0 |
| PPCE | 212 | 8 | 0 | 14 |
| CFO PMCE | 204 | 4 | 0 | 3 |

GMF e PMCE não precisaram receber mudanças para este fechamento. Os seis mantêm os mesmos IDs e datas das 90 metas regulares. O lote acrescentou 157 itens (incluindo cinco substituições), com materiais do próprio curso e 34 fontes oficiais adicionais da PRF. Cinco itens anteriores foram arquivados para corrigir um vínculo de aula e quatro referências legislativas; os vínculos históricos são mantidos. Questões anteriores não são cortadas.

A maior carga entre as metas ajustadas é de aproximadamente 211 minutos (3h31), estimada pelas orientações de cada item. As descrições foram atualizadas para refletir a nova carga. As revisões já programadas, o caderno de erros, discursiva e diagnósticos são preservados.

## Conteúdo acrescentado

- PMPE: aula de Estado de Defesa/Estado de Sítio na Meta 63, corrigindo vínculo e anotação que falavam de funções essenciais à Justiça. As 12 questões originais de Organização dos Poderes permanecem; acrescenta-se prática própria de Defesa do Estado.
- CFO PMCE: quatro recortes da Lei Maria da Penha, com leitura delimitada e questões, antes das aulas já programadas que aprofundam o mesmo diploma.
- PPCE: agências executivas; eficiência, eficácia e efetividade; governança e accountability; dignidade e dimensões dos direitos humanos; segurança pública; regime disciplinar funcional; regimento prisional. Regime funcional e disciplina das pessoas presas são tratados em blocos diferentes.
- PRF: direitos e garantias; servidores; carreira/indenizações; Executivo; segurança pública e atribuições da PRF; excesso punível; crimes específicos; provas/local de crime; razão/proporção/sequências; alternativa de idioma; correspondência das resoluções antigas com fontes atuais.

Na PRF a atividade de idioma orienta o aluno a seguir somente a opção de prova (inglês ou espanhol), com os cadernos correspondentes, sem exigir estudo dos dois idiomas.

## Conferência normativa

Fontes: catálogo oficial de resoluções do Ministério dos Transportes e textos baixados diretamente desse catálogo em 13/11. Foram conferidos 182 documentos para localizar revogações, vigência e alterações. Exemplos relevantes:

- 432/2013 → 1.031/2026, publicada em 18/08/2026 (revogação no art. 15; prazos do art. 16 considerados).
- 809/2020 → 1.027/2026, publicada em 18/08/2026 (art. 60).
- 789/2020 e 933/2022 → 1.020/2025 (art. 140).
- 14/1998 → 912/2022 → 993/2023; 24/1998 → 968/2022; 216/2006, 253/2007 e 254/2007 → 960/2022, com alteração 989/2022.
- 227/2007, 268/2008 e 667/2017 → 970/2022, com alteração 1.024/2026.
- Pesos/dimensões: 882/2021 e alterações 899/2022, 994/2023, 1.005/2024 e 1.015/2024.
- PNATRANS: referência histórica 740/2018 estudada pelo conteúdo da 1.004/2023; campanha anual de 2021 substituída pelo estudo permanente de educação para o trânsito nos arts. 74 a 79 do CTB, sem reproduzir calendário vencido.
- Referências antigas já presentes em metas futuras (160/2004, 211/2006, 210/2011 e 561/2015) recebem orientação e fonte atual, sem reduzir questões.

O cadastro histórico do edital traz “92/1998”; a referência correta é 92/1999. A atividade usa a referência correta e a fonte atual 938/2022. O título histórico do edital não é alterado nesta operação. Isso não é uma nova validação jurídica de todo o acervo; os demais materiais de aula e Vade Mecum são os já cadastrados pelo curso.

## Segurança e testes antes de aplicar

- Nove testes de SQL real em PGlite: caminho de gravação, preservação histórica, texto tratado como dado, recusa de meta já liberada, progresso futuro, versão concorrente, alteração de item fora do formulário, disciplina/material de outro curso e público diferente.
- O lote completo de 86 metas foi executado em banco descartável com o snapshot de conteúdo: 157 itens novos, cinco anteriores arquivados e preservados, nenhuma escrita em tabelas de alunos; todas as demais metas permanecem idênticas.
- Cada gravação de produção tem transação própria, locks e conferência de data/versão/conteúdo/progresso, tópico/subtópico e materiais do curso. Nenhuma alteração de autenticação, RLS, matrículas, conclusões, tentativas, gabaritos ou e-mails.
- Reversão por meta futura: arquivar os itens deste lote, reativar as cinco identidades anteriores aplicáveis e restaurar título/descrição. O controlador recusa reverter metas já liberadas, com progresso ou alteradas posteriormente. Fontes adicionais podem permanecer sem vínculo; não apagar dados.

## Aplicação

Executada após revisão de segurança e CI aprovado. Conferência de produção:

- Cada um dos seis cursos tem exatamente 90 números distintos de metas regulares publicadas para G1, Meta 01 a 90; 1.131 unidades terminais, nenhuma sem vínculo próprio ou ancestral no planejamento.
- 86 metas gravadas/conferidas; 157 itens novos ativos, cinco originais arquivados e mantidos. Cada meta modificada confere com o estado esperado integral dos itens e materiais.
- Todas as metas fora do lote continuam idênticas pelos hashes de linhas, itens e materiais antes/depois; nenhum dado de aluno foi escrito.
- Desbloqueios, datas e públicos de todos os diagnósticos dos seis cursos conferem exatamente com o snapshot anterior.
- GMF e PMCE não receberam nenhuma mudança; não foi cortado volume nem criado bloco opcional para esconder lacunas.
- A API impôs 429 após 36 metas. Retomada com intervalo e diário persistente reconheceu as existentes; não houve duplicação. O controlador não repete automaticamente gravações com resultado incerto.

Evidências agregadas e SQL de reversão ficam no diretório privado de execução, fora do Git. PR #142 guarda o plano sem dados pessoais, testes e regras de preservação. Esta conferência comprova a cobertura do planejamento cadastrado, não a conclusão dos alunos nem uma nova auditoria jurídica integral de todo material antigo.
