# 16 — Grupos, lançamentos e avaliações (Diagnóstico Semanal, Simulado Geral, Redação)

Revisado em: 2026-11-10. Texto movido do `AGENTS.md` (2026-11-10) para deixar o arquivo raiz curto;
o conteúdo é o mesmo e continua obrigatório. Correção de redação: `13-correcao-redacao.md`.

## Grupos, Grupo 3 (teste) e lançamentos

- Grupos de estudo: 1 e 2 (alunos) e 3 (teste, só a conta de teste do administrador).
  O Grupo 3 vê tudo do grupo que espelha (`enrollments.mirror_group`, 1 ou 2) e o que
  foi lançado só para o Grupo 3. Contas do Grupo 3 não aparecem no ranking dos alunos.
- `target_groups` de metas e diagnósticos aceita 1, 2 e 3. A visibilidade é decidida
  no banco (`student_goal_scopes`, `student_group_allowed`).
- `course_group_settings`: por curso e grupo, abas/funções desligadas
  (`metas`, `edital`, `diagnostico_semanal`, `simulado_mensal`, `relatorio`, `ranking`, `progresso`,
  `ultimo_concurso`, `contador_prova`, `reta_final`) e aviso
  da tela inicial. Aba desligada some do menu e a rota volta para `/aluno`.
- Fluxo de lançamento: lançar primeiro só no Grupo 3, o administrador confere com a
  conta de teste e depois libera nos Grupos 1 e 2. **Antes de lançar qualquer conteúdo
  ou função, perguntar ao usuário em qual grupo lançar (1, 2, 3 ou combinação).**
- Nunca mostrar o número do grupo ao aluno.
- **Grupo único para novos alunos (2026-11-10):** `study_group_from_q01` manda toda faixa válida
  para o Grupo 1; o Grupo 2 não recebe alunos novos. Os alunos atuais do G2 passam para o G1 junto
  com o bloco "Se sobrar tempo" (Fase 3 de `docs/ia/12-plano-personalizacao.md`), nunca antes.
- **Textos ao aluno sempre positivos**: nada prejudicial; mudança de grupo nunca é citada ("as metas
  foram atualizadas conforme o seu relatório"); toda atualização percebida leva o aviso
  "O SGA foi atualizado" (`docs/ia/01-regras.md`, regra 12a).
- **Formulário enxuto (2026-11-10):** `compactQuestionnaire` (`lib/groups/schema.mjs`) monta, a partir
  do questionário de 20 perguntas, o de até 5: horas (padrão `AVAILABILITY_STANDARD`, sem citar
  mínimo de horas), rotina, redação, TAF (se houver) e acessos. Domínio e nível são medidos pelos
  diagnósticos. O banco aceita o questionário do curso (até 8 ou 20 perguntas). Prévia do
  administrador em `/previa/primeiro-acesso/<curso>` (nada é gravado).
- Plano de personalização (horas + reforço + relatório) e prompts de cada fase:
  `docs/ia/12-plano-personalizacao.md`.

## Mini Simulados

Mini simulados por disciplina, cadastrados pelo administrador e resolvidos pelo aluno
na plataforma, orientados por `courseId` (nada específico de um concurso).

- Tabelas: `mini_quizzes`, `mini_quiz_questions`, `mini_quiz_answer_keys` (gabarito e
  comentário, legíveis só pelo administrador), `mini_quiz_attempts` e
  `mini_quiz_attempt_answers`.
- A correção acontece só no banco (`submit_mini_quiz`). O gabarito nunca vai ao navegador
  antes do envio; a revisão vem de `mini_quiz_attempt_review` para a própria tentativa.
- Diagnóstico Semanal: um por grupo a cada 7 metas (Meta 07 → 01 a 07, Meta 14 → 08 a 14...), liberado só depois que o
  aluno **conclui** a meta que fecha o bloco (`mini_quizzes.unlock_goal_id`, checado no banco por
  `mini_quiz_unlocked`) e a partir da data dessa meta, com metade das questões da prova real (metade por disciplina), só de cadernos usados nas
  metas do bloco; lançar primeiro no Grupo 3 e perguntar o grupo para cada curso (`docs/ia/09-regras-metas.md`).
- Diagnóstico Semanal (simulado sem disciplina própria, pedido em 21 de outubro de 2026): tentativa
  única (`MINI_QUIZ_ALREADY_DONE`), só pode ser enviado depois de iniciado (`MINI_QUIZ_NOT_STARTED`).
  `start_mini_quiz` registra o início e `submit_mini_quiz` grava `duration_seconds` (cronômetro).
  Mini simulados por disciplina mantêm o intervalo de 7 dias para refazer.
- Durante a prova o texto não pode ser copiado nem selecionado (só clicar nas alternativas).
- Questão com texto-base começa com a linha `**Texto associado**`; o aluno recolhe e expande o texto (`lib/mini-quizzes/statement.mjs`).
  O texto é exibido compacto (`lib/mini-quizzes/passage.mjs`): linhas quebradas da prova viram parágrafos com recuo
  de primeira linha, a numeração de linhas sai, e rótulo ("Texto I"), título, versos e fonte são separados. Não citar
  "(linhas X a Y)" no comando; citar o trecho.
  O fim do texto é a linha `[[/texto]]` (opcional); sem ela, o texto vai até a última linha de fonte
  ("Disponível em", "Fonte:", http) ou, sem fonte, até o último parágrafo. Não deixar "Texto para as questões X a Y".
- Questões de prova trazem a fonte no comentário. Questão inédita (elaborada pela equipe, a pedido do
  usuário em 26 de outubro de 2026) começa com a linha `[[inedita]]` no enunciado, exibida como selo "Inédita".
- Ranking: o aluno escolhe ao iniciar se quer aparecer; ordem por acertos e, no empate, menor tempo
  (`mini_quiz_ranking`, nome curto). Fica dentro de cada diagnóstico e num card da tela inicial.
- Área do aluno: aba "Simulados" (`/aluno/simulados`, pedida em 06/11/2026) reúne, em abas internas,
  "Diagnóstico Semanal" (`/aluno/diagnostico-semanal`) e "Relatório" (`/aluno/relatorio`, desempenho por
  disciplina e assunto, com o botão "Caderno de erros" no topo levando a `/aluno/relatorio/caderno-de-erros`); cada seção segue o liga/desliga do grupo e a aba some só com todas desligadas.
  Abas internas: "Semanal", "Geral" e "Relatório".
- Simulado Geral (pedido em 06/11/2026; no banco `mini_quizzes.kind = 'mensal'` e a função de grupo
  `simulado_mensal`, nomes internos mantidos): todas as disciplinas no formato da prova real do curso,
  **liberado por data, sem relação com as metas** (`release_date`, `unlock_goal_id` nulo), a cada
  **14 dias com edital aberto** e **30 dias com edital fechado** — sempre perguntar ao usuário se o
  edital está aberto ou fechado ao gerar um simulado. `time_limit_minutes` (tempo da prova, informativo).
  Sem disciplina própria, segue no banco as regras do diagnóstico (tentativa única, cronômetro, ranking,
  grupos). Lista em `/aluno/simulado-geral`; prova e correção reutilizam as páginas do diagnóstico, que
  conferem a função do grupo pelo tipo. A seção aparece para o Grupo 3 sempre e para os demais quando
  houver simulado geral publicado para o grupo (aberto ou ainda fechado).
- Próximos fechados (06/11/2026): `student_upcoming_quizzes` devolve só título e condição dos
  diagnósticos e simulados gerais ainda fechados (e dos blocos de 7 metas ainda sem diagnóstico). O aluno
  vê no máximo **2 pendentes por tipo** (abertos não feitos + fechados; `pendingQuizWindow`). Ao lançar um
  simulado geral, **deixar sempre o da próxima data já publicado e fechado** (mesmo sem questões), para
  instigar o aluno; preencher as questões antes da data. As rotas antigas `/aluno/mini-simulados` redirecionam.
- Redação do Simulado Geral (pedida em 08/11/2026): opcional e **feita no tempo da prova**.
  `mini_quizzes.essay_prompt` traz a proposta, mostrada só depois de iniciar (fim da prova). Abaixo dela,
  o aluno anexa até 3 fotos da folha e/ou digita o texto (rascunho do texto só no navegador,
  `essayDraftKey`); tudo vai **junto com as respostas** no botão Enviar: as fotos sobem antes (bucket
  privado `mini-quiz-essays`, pasta `<aluno>/<simulado>/`), depois `submit_mini_quiz` e em seguida
  `submit_mini_quiz_essay`, que só aceita até 15 minutos após o envio das respostas (`ESSAY_TOO_LATE`).
  **Não existe envio posterior.** Sem redação, o aluno confirma "Enviar sem redação?". Com redação, 2
  avisos (legibilidade → anulação sem recurso; conteúdo fora da redação → banimento). Uma redação por
  tentativa, em `mini_quiz_essays`; texto sem limite visível (interno 12.000 caracteres, ~100 linhas).
  Correção fora da plataforma (regras: `docs/ia/13-correcao-redacao.md`), prazo de **7 dias**; o administrador lança 4 notas de 0 a 10 ou a anulação
  (`admin_grade_mini_quiz_essay`, tela `/admin/mini-simulados/redacoes`) e o resultado aparece no Relatório.
  Com `time_limit_minutes`, o cronômetro é regressivo (tempo real da prova; não envia sozinho ao zerar).
  Antes de iniciar: quadro "Redação: prepare-se ANTES de iniciar" (aviso "Novidade em teste", folha para
  baixar, orientações) e 2 avisos ao clicar em Iniciar. A folha (PDF **sem o tema**) fica em
  `public/folhas-redacao/` e é indicada na proposta pela linha `[[folha:/folhas-redacao/<arquivo>.pdf]]`.
- **Nota geral** (pedida em 11/11/2026, função de grupo `nota_geral`, migração `20261111000100`): na correção do
  Simulado Geral e no Relatório, o aluno vê "Objetiva X/60 + Redação Y/40 = Z/100", como no edital PMPE
  (Tabela 10.1: 1 ponto por questão + redação até 40 = 100 na 1ª etapa). Redação pendente/anulada/ausente soma 0.
  Só exibição (`combinedScore` em `lib/mini-quizzes/essay.mjs`). Começou desligada nos Grupos 1 e 2.
- O administrador faz a prévia do diagnóstico como aluno (nada é gravado) e publica pela própria tela.
- O diagnóstico mensal usa a primeira tentativa de cada mini simulado no mês (fuso de
  Brasília, `is_first_of_month`). Refazer fica no histórico e não altera o mês.
- Tentativas e respostas nunca são apagadas; questões removidas são arquivadas e um mini
  simulado com tentativas não pode ser excluído, só arquivado.
- Acesso do aluno segue `active_course_ids()`; o administrador salva por
  `admin_save_mini_quiz`, com IDs estáveis e versão `updated_at`.

