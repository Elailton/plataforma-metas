# 09 — Regras de montagem das metas (vigentes desde 2026-10-29)

Pedido do usuário em 2026-10-29, depois de rever as metas da PMPE e da GMF. Valem para
**toda meta nova** e para correções de metas **ainda não liberadas** (meta liberada não
muda). O gerador e o passo a passo estão em `05-runbooks.md`.

## Selo "Cobrado no último concurso" (regra de 2026-11-09)
- Todo assunto do edital (tópico ou subtópico) que caiu na **última prova** do curso é marcado
  `syllabus_topics.last_exam = true`, ao armazenar o curso e ao corrigir. Fonte: relatório "ASSUNTOS NO
  TEC" da última prova; sem relatório, a própria prova, questão a questão. Questão anulada não conta;
  questão fora do edital não marca nada.
- O aluno vê o selo **"Cobrado no último concurso"** no item da meta e no assunto do Edital. No item,
  vale a marca do nível do item (subtópico); tópico marcado sem nenhum subtópico marcado passa o selo a
  todos os subtópicos (`isLastExamItem`).
- Ao montar metas, assunto com o selo entra antes e com mais questões, como os de alta incidência.
- O mapeamento de cada curso fica em `cursos/dados/ultimo_concurso.py` (código disciplina.tópico.subtópico).
- Lançamento por grupo: função `ultimo_concurso` em `course_group_settings` (começou ligada só no Grupo 3).

## Regra atual: o edital fecha em 90 metas (2026-11-09)
- **Todo curso SGA fecha o edital em 90 metas**, ao armazenar e ao corrigir. Todo assunto do
  edital tem aula (ou, no G1, itens só de questões para baixa incidência) e questões até a Meta 90.
- Faixas:
  - Metas 01–07: adaptação.
  - Metas 08–84: conteúdo novo com lei seca e leitura.
  - Metas 85–90: fechamento (últimos assuntos de baixa incidência e revisão geral de alta).
  - Depois da 90: só revisão, caderno de erros, reforço e simulados.
- Substitui o plano de ~100 metas de `metas-novas/PLANO.md`. Procedimento:
  `10-prompt-mestre-cursos.md`. Análise dos cursos atuais: `metas-novas/ANALISE-90-METAS.md`.

## 0. Antes de montar: alinhamento do edital
- Cada assunto do edital (tópico/subtópico) é ligado às suas **aulas** (um professor por
  disciplina; Português do Zero e trilhas repetidas ficam de fora), à **apostila**, à
  **lei seca no Vade Mecum** (disciplinas jurídicas) e a um **caderno do Qconcursos**.
- Todo assunto tem caderno. Se faltar, cria-se no Qconcursos da conta do professor,
  priorizando a **banca do concurso** e completando com cargos policiais de outras bancas;
  sem anuladas e desatualizadas.
- A **incidência** (relatório do TEC) define a ordem e o peso: assunto de alta cobrança
  vem antes, tem mais questões e mais revisões.

## 1. Aulas em partes (série)
- Série = aulas do mesmo título com "Parte 01, 02…". **Todas as partes na mesma meta.**
- Só divide se a série passar de ~90 min efetivos no Grupo 1 (vídeo em 1,5x + anotação)
  ou ~150 min no Grupo 2. Aí as partes vão em **metas seguidas** e, nesse dia, a série
  fica **sozinha** na disciplina.
- **Nunca** juntar o fim de uma série com o começo de outra na mesma meta
  (ex.: "Windows Parte 04 + Linux Parte 01" — errado).

## 2. Questões são a base
- **Toda aula é seguida, na mesma meta, de questões do assunto** no caderno do Qconcursos
  (link no item). Nunca "no banco de questões que você usa".
- Assunto concluído → 1ª resolução (G1: 12/10/8 questões por incidência alta/média/baixa;
  G2: 20/15/10). Assunto que continua → questões da parte vista no dia (G1 6, G2 10).
- **Toda meta tem pelo menos um caderno.**
- **Raciocínio Lógico sempre com caderno** e prática no máximo a cada 3 dias depois de
  iniciado (matéria de prática).
- Revisões espaçadas com caderno: alta 7 e 21 dias; média 10 e 28; baixa 21.
- Sobra de tempo vira **reforço** em caderno, assuntos de alta incidência primeiro.

## 3. Lei seca e leitura a partir da Meta 08
- Da Meta 08 em diante, ao concluir assunto jurídico: **lei seca no Vade Mecum do curso**
  com os artigos exatos (G1 20 min, G2 30 min), priorizada sobre a leitura.
- Leitura do trecho da apostila em PDF (G1 20 min, G2 30 min), até 3 dias depois da aula.
- Metas 01 a 07: só aula + questões (adaptação).

## 4. Carga e formato
- G1 ~3h (vídeo em 1,5x), G2 ~6h; 10 min de caderno de erros; domingo com revisão
  semanal do caderno de erros. Uma meta por dia, inclusive fim de semana.
- G1 com até 2 disciplinas de aula por dia; G2 até 3. Título:
  "Meta N – Disciplina · Disciplina".
- Atualidades, mini simulados e redação seguem o calendário próprio.
- Correção de meta futura: itens antigos são **arquivados** (nunca apagados); itens fixos
  (Atualidades, mini simulado, redação) mantêm o ID.

## 5. Diagnóstico Semanal (regra do usuário, 29/10/2026)
- Um diagnóstico a cada 7 metas, **por grupo**: Meta 07 → Metas 01 a 07; Meta 14 → Metas 08 a 14;
  Meta 21 → Metas 15 a 21; e assim por diante.
- **Liberação = conclusão da meta que fecha o bloco** (regra de 30/10/2026): o aluno só vê o
  diagnóstico das Metas 01 a 07 depois de concluir a Meta 07 (todos os itens não arquivados);
  08 a 14 → Meta 14; 15 a 21 → Meta 21. Gravar em `mini_quizzes.unlock_goal_id` a meta que fecha
  o bloco **daquele grupo** (versão G1 → meta do G1; o G3 usa a meta do grupo espelhado).
  `release_date` = data dessa meta (piso: as duas condições valem). Quem já iniciou ou enviou
  continua com acesso mesmo se desmarcar um item.
- Ao revisar: questões que dão margem a recurso ou fora do assunto do bloco viram **inéditas**
  (`[[inedita]]`) do mesmo assunto, com resposta verificável na lei ou na gramática.
- **Tamanho = metade da prova real**, e cada disciplina com metade das questões dela na prova
  (arredondando para fechar o total). PMPE: prova 60 → 30 (5 por disciplina).
  GMF: prova 80 → 40 (Português 5, RLM 4, Informática 4, Atualidades 3, Fortaleza 4;
  Dir. Administrativo 5, Constitucional/DH 5, Penal/Processo Penal 5, Legislação 5).
- Questões só dos **cadernos do Qconcursos usados nas metas do bloco** (o que o grupo estudou).
  Disciplina sem conteúdo no bloco: usar assuntos já estudados em blocos anteriores.
- Lançar **primeiro só no Grupo 3** para o usuário conferir as questões; depois liberar no G1/G2.
  **Perguntar sempre, para cada curso, em qual grupo lançar.**
