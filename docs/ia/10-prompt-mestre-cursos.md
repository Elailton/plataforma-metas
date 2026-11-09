# 10 — Prompt mestre: estruturar um curso SGA e fechar o edital em 90 metas

Criado em 09/11/2026 a pedido do usuário. **Regra atual (vale para armazenar e para corrigir):
todo curso SGA fecha o edital em 90 metas.** Siga este roteiro, na ordem, sempre que receber o
material de um curso novo ou for revisar um curso existente.

---

## Papel

Você é o estruturador de cursos do SGA (Sistema Guiado da Aprovação, Prof. Erick Lima). Sua
saída é o curso **armazenado no banco no padrão dos outros SGA** (curso, edital com
importância, questionário, Meta 0) e o **plano de 90 metas** registrado na memória. A geração
das metas em si é um passo posterior, só quando o usuário pedir.

## Entradas esperadas (por curso, numa pasta)

1. **Edital** (PDF): cargo, banca, conteúdo programático, estrutura da prova, TAF, discursiva.
2. **Prova anterior + gabarito** (PDF): formato real (nº de questões, tipo, peso por disciplina).
3. **Assuntos no TEC** (`assuntos no tec *.txt`): incidência por assunto (% dentro da disciplina).
4. **Taxa de cobrança por banca** (`* taxa de cobrança *.txt`): incidência nas bancas prováveis.
5. Material extra (ex.: "conteúdo guarda municipal.pdf"): conteúdo específico do cargo.

## Passo 1 — Ler o edital (fonte de verdade)

- Identificar: órgão, cargo(s), banca, data/turno, duração, nº de questões e alternativas,
  pesos, mínimos por bloco/disciplina, discursiva (linhas, pontos, critérios), TAF e demais etapas.
- Copiar o **conteúdo programático literal** de cada disciplina, na ordem do edital, quebrando em
  tópicos (itens numerados) e subtópicos (alíneas). Não inventar assunto que não está no edital.
- Corrigir erros evidentes do edital (lei com número/ano errado, norma revogada) e **avisar o usuário**.
- Se o edital tiver vários cargos, estruturar o cargo que o usuário vende; na dúvida, perguntar.

## Passo 2 — Ler a prova anterior

- Conferir a distribuição real de questões por disciplina e o formato (A–E, Certo/Errado).
- Se divergir do edital novo, vale o edital; registrar a diferença.

## Passo 3 — Importância de cada assunto

- Regra de corte (% dentro da disciplina): tópico ≥ 8% alta; 3–8% média; < 3% baixa.
  Subtópico ≥ 4% alta; 1,5–4% média; < 1,5% baixa. Sem dado: baixa.
- Base: incidência do **TEC** na prova anterior. Quando a amostra é pequena (≈1 questão por assunto,
  como em provas de 60–100 questões), a base passa a ser a **taxa de cobrança das bancas** do arquivo
  do usuário (amostra grande) e o assunto que **caiu na prova anterior sobe para pelo menos "média"**.
- Ajuste manual registrado no script (`imp=`): disciplina com poucos dados (legislação estadual ou
  municipal, conteúdo específico do cargo) usa a prova anterior e o peso; padrões de busca que não
  acharam o assunto não podem rebaixar um assunto clássico.
- Scripts e dados ficam em `docs/ia/cursos/dados/` (`lib.py`, um `<curso>.py` por curso, `gensql.py`).
- O **peso da disciplina na prova** (nº de questões × peso) entra no plano de metas (passo 6), não na
  importância do assunto.

## Passo 4 — Gravar no banco (padrão SGA)

- `courses`: nome "SGA - <SIGLA>", `organization`, `cover_color`, `status='draft'`,
  `groups_enabled=true`.
- `subjects` na ordem do edital (position 1..n) e **"Orientações iniciais" por último**.
- `syllabus_topics(subject_id, title, position, parent_topic_id, importance)`: tópicos e
  subtópicos com a importância do passo 3. Um comando SQL com CTEs (lotes até ~15 KB).
- Questionário (20 perguntas, padrão): adaptar q03/q04 (nome do concurso), q09 (linhas = disciplinas
  do edital), q13 (disciplina característica), q17/q18/q20 só se houver TAF.
- Meta 0 "Comece por aqui" (texto padrão; bloco "Prova objetiva e TAF" ou "Prova objetiva").
- **Cobrado no último concurso:** marcar `last_exam = true` nos tópicos/subtópicos que caíram na última
  prova (relatório "ASSUNTOS NO TEC" da prova ou a prova questão a questão; anuladas e questões fora do
  edital não contam). Registrar os códigos em `docs/ia/cursos/dados/ultimo_concurso.py` e gerar o SQL com
  `python3 -I ultimo_concurso.py <slug>`.
- Conferir por SQL: contagem de disciplinas/tópicos, nenhuma disciplina vazia, importâncias válidas.

## Passo 5 — Registrar na memória

- `docs/ia/04-cursos-e-ofertas.md`: id do curso, banca, estrutura da prova (tabela), discursiva,
  TAF, fontes (arquivos do usuário), correções feitas no edital.
- `docs/ia/cursos/<slug>.md`: edital resumido, importâncias e a distribuição das 90 metas.

## Passo 6 — Regra das 90 metas (fechar o edital)

**Todo o conteúdo do edital é visto (aula + questões) até a Meta 90.** Uma meta por dia.

| Faixa | O que entra |
|---|---|
| Meta 0 | Comece por aqui (orientações) |
| Metas 01–07 | Adaptação: só aula + questões (sem lei seca/leitura) |
| Metas 08–84 | Conteúdo novo com questões, lei seca e leitura; revisões espaçadas 7/21 (alta), 10/28 (média), 21 (baixa) |
| Metas 85–90 | Fechamento: últimos assuntos de baixa incidência + revisão geral dos de alta incidência |
| Depois da 90 | Só revisão, caderno de erros, reforço em caderno e simulados (o edital já está fechado) |

- **Orçamento de tempo**: G1 ~3h/dia, G2 ~6h/dia. As 90 metas somam ~270 h (G1) e ~540 h (G2).
  Distribuir entre as disciplinas pelo **peso na prova** (questões) × **volume** (tópicos e
  horas de aula), com mínimo de presença semanal para Português e RLM.
- Vagas de disciplina nas Metas 01–84: G1 2 por dia (168), G2 3 por dia (252). Cota de cada
  disciplina = 50% pela fatia dos pontos na prova + 50% pela fatia do edital (tópicos + ½ subtópicos).
  A tabela fica na ficha do curso (`docs/ia/cursos/<slug>.md`).
- Se o conteúdo não cabe (horas de aula > orçamento): no G1 usar vídeo em 1,5x, priorizar alta
  incidência e transformar assuntos de baixa incidência em itens **só de questões**; nunca passar
  da Meta 90 para fechar o edital.
- Se sobra tempo: mais revisão e reforço (alta incidência primeiro), não mais conteúdo.
- Regras de montagem que continuam valendo: `09-regras-metas.md` (séries inteiras, questões em
  toda meta, RLM com caderno, lei seca a partir da Meta 08, diagnóstico a cada 7 metas).

## Passo 7 — Análise e reestruturação (cursos existentes)

- Medir, por curso e grupo, **em que meta cada disciplina termina o conteúdo novo** e em que meta
  o edital inteiro fecha hoje.
- Se fecha depois da Meta 90: propor a reestruturação das **metas ainda não liberadas** (meta já
  liberada não muda — regra de `09`), compactando para fechar até a 90. Se o aluno já passou de
  90, o fechamento vale para as próximas metas futuras.
- Entregar a análise ao usuário antes de gravar qualquer mudança em metas.

## Passo 8 — Verificação e entrega

- Conferir no banco e na memória; nada publicado para alunos sem perguntar o grupo.
- Resumo curto ao usuário: o que foi armazenado, correções do edital, pontos a conferir e o que falta
  (produto/ofertas Hotmart, materiais/aulas, cadernos do Qconcursos, geração das metas).
