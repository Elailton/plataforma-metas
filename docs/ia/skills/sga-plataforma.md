> Cópia em texto da skill `sga-plataforma` usada pelo Claude (2026-11-10), para qualquer IA seguir. Em conflito, valem `AGENTS.md` e `docs/ia/01-regras.md`.


# SGA – Sistema Guiado da Aprovação (Prof. Erick Lima)

Plataforma de mentoria com metas para concursos policiais. O mentor cria cursos, edital, metas e diagnósticos; o aluno segue as metas, marca o progresso e faz o Diagnóstico Semanal. Converse em português.

## Infraestrutura
- Repositório: GitHub `Elailton/plataforma-metas` (Next.js + TypeScript + Supabase + Vercel). Clonar o repositório. Ler `AGENTS.md` antes de mexer no código (regras de matrícula, Hotmart, RLS, grupos, mini simulados). Memória em `docs/ia/` (regras invioláveis em `01-regras.md`, regras de metas em `09-regras-metas.md`, procedimentos em `05-runbooks.md`).
- Supabase: projeto `cbryvevesiaoqmwwlnet`.
  - `execute_sql` funciona para dados. migrações: o Claude revisa e aplica com `apply_migration` (autorização de 2026-11-10); sem essa ferramenta, entregar o .sql ao usuário para rodar no SQL Editor e conferir por SQL.
  - `execute_sql` cancela consultas com vários comandos: usar UM comando com CTEs que modificam dados (`with d(...) as (values ...), ins as (insert ... returning ...) insert ...`). Lotes de até ~15–19 KB. Textos entre `$q$...$q$`; para quebras de linha usar o marcador `⏎` e `replace(x,'⏎',chr(10))`.
  - Um SELECT na mesma CTE mostra o estado anterior ao UPDATE: reconsultar depois.
- Fluxo de código: branch separada, PR via `gh api repos/Elailton/plataforma-metas/pulls` (`gh pr create`/GraphQL não funciona), merge com rebase (`gh api -X PUT .../pulls/N/merge -f merge_method=rebase`). Merge: perguntar ao usuário antes (regra 5 do `AGENTS.md`), com CI `validate` verde. CI roda `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm build`; a Vercel publica a `main`. O stop hook exige upstream (`git config --add remote.origin.fetch +refs/heads/B:refs/remotes/origin/B; git fetch origin B; git branch -u origin/B`).
- Sem rede para npm no container. Testes SQL locais: Postgres 16 (`/usr/lib/postgresql/16/bin`, initdb como `nobody`, porta 5499), montando num .sql a fixture de `tests/helpers/database.mjs` + migrações + `seedSql` de `tests/helpers/rls-scenario.mjs` e rodando com psql. Apagar ao terminar.

## Regras fixas (sempre)
- Antes de lançar qualquer conteúdo ou função, PERGUNTAR em qual grupo lançar (1, 2, 3 ou combinação), para cada curso. Fluxo: lança no Grupo 3, o usuário confere com a conta de teste e depois libera para 1/2.
- Nunca mostrar ao aluno o número do grupo (G1/G2).
- Nunca misturar conteúdo de cursos diferentes (PMPE, GMF, PRF, PMCE, CFO PMCE, PPCE).
- Só questões reais de prova. Inédita só com autorização do usuário: linha `[[inedita]]` no início do enunciado e comentário terminando em "Questão inédita elaborada pela equipe do Sistema Guiado da Aprovação.". As explicações são próprias.
- Nada de e-mails em massa. Nada de exclusão definitiva: arquivar. Exceção só com pedido explícito.
- Merge/publicação de código: perguntar antes, com CI verde e revisão de segurança; conteúdo para alunos segue o fluxo de grupos acima.
- Nunca digitar senhas em campos; usar só sessões já logadas no navegador; não ler tokens/credenciais pelo navegador. Contas protegidas: o administrador e a conta de teste do administrador (aluno do Grupo 3, espelhando o G1 em todos os cursos). Não alterar/recriar essas contas além do pedido.
- PDFs de simulado foram abandonados ("esqueça os pdf").

## Cursos (tabela `courses`)
| Curso | slug | id | status |
|---|---|---|---|
| SGA - PMPE | sistema-guiado-da-aprovacao | fec9bb24-aaab-41ce-a98b-a039c3905ee2 | published (12 disciplinas) |
| SGA - GMF | sga-gmf | 3f595180-4648-4f76-94e7-eb2ef88572bd | published (10 disciplinas) |
| SGA - PRF | sga-prf | a845c350-baad-4711-a1e4-1ef1fc6f832c | published, metas 01–05 (14 disciplinas) |
| SGA - PMCE (soldado) | sga-pmce | 6305aafa-3263-46c9-b1b7-1001c01b5994 | published, metas 01–05 (10) |
| SGA - PPCE | sga-ppce | 4b4f4900-a0a3-4ebd-8507-511c16eb9029 | published, metas 01–05 (10) |
| SGA - CFO PMCE | sga-cfo-pmce | c09903b0-651f-43a8-9c43-5f8fe7f6cb17 | published, metas 01–05 (10) |
Outros (PF Agente, gmf, rascunho, TESTE HOTMART, teste) estão arquivados ou são rascunhos sem uso.

Pendências dos cursos novos (PRF, PMCE, CFO PMCE, PPCE): plano completo em `docs/ia/metas-novas/PLANO.md`; executar quando o usuário disser "executar metas", seguindo as regras de montagem abaixo — perguntar o grupo antes de lançar.

## Regras de montagem de metas (desde 29/10/2026; detalhe em `docs/ia/09-regras-metas.md`)
Valem para toda meta nova e para correções de metas ainda não liberadas (meta liberada não muda).
- Antes de montar: alinhar cada assunto do edital às aulas (um professor por disciplina), apostila, lei seca no Vade Mecum e caderno do Qconcursos. Faltou caderno → criar priorizando a banca do concurso. Incidência do TEC define ordem e peso.
- Série de aulas ("Parte 01, 02…") inteira na mesma meta. Só divide acima de ~90 min efetivos no G1 (1,5x + anotação) / ~150 min no G2, em metas seguidas e sozinha na disciplina. Nunca fim de uma série + começo de outra na mesma meta.
- Questões são a base: toda aula seguida de questões do assunto no caderno do Qconcursos (link no item). Assunto concluído → 1ª resolução G1 12/10/8, G2 20/15/10 (alta/média/baixa); assunto que continua → G1 6 / G2 10. Toda meta tem caderno. RLM sempre com caderno, prática no máximo a cada 3 dias.
- Revisões espaçadas com caderno: alta 7 e 21 dias, média 10 e 28, baixa 21. Sobra de tempo vira reforço em caderno.
- Da Meta 08 em diante: lei seca no Vade Mecum do curso com artigos exatos (G1 20 / G2 30 min), priorizada; leitura da apostila (G1 20 / G2 30 min). Metas 01–07: só aula + questões.
- Carga: G1 ~3h, G2 ~6h; 10 min de caderno de erros; domingo com revisão semanal. Título "Meta N – Disciplina · Disciplina". Atualidades, mini simulados e redação seguem calendário próprio e mantêm o ID.
- Replanejamento (procedimento em `05-runbooks.md`): exportar, planejar em Python, gravar em lotes arquivando os itens antigos (fixos mantêm ID), resolver textos por SQL, verificar (toda meta com caderno, RLM, nenhum `{` sobrando).

## Padrão para criar um curso SGA novo
1. Copiar de um SGA existente: `organization`, `cover_color`, `status='draft'`, `groups_enabled=true`, `questionnaire_schema`.
2. Questionário de entrada (20 perguntas). Adaptar ao concurso só: q03 (índice 2, experiência com concursos para X), q04 (índice 3, quanto do edital de X já estudou), q09 (índice 8, matriz com as disciplinas do curso em `rows`), q13 (índice 12, pergunta da disciplina característica). As demais são genéricas (horas, rotina, questões, revisão, TAF). Conferir que não sobrou nome de outro concurso.
3. Edital: `subjects(course_id,name,position a partir de 1)` e `syllabus_topics(subject_id,title,position a partir de 1,parent_topic_id,importance high/medium/low)`. Gerar JSON com script Python `t(title, imp, *subs)` e inserir com CTE `materialized` + `gen_random_uuid()` (subjects -> tópicos -> subtópicos, usando `where exists(select 1 from <cte anterior> ...)` para garantir a ordem).
4. Importância pela incidência do TEC Concursos (% dentro da disciplina, relatório enviado pelo usuário): tópico >= 8% alta, 3–8% média, < 3% baixa; subtópico >= 4% alta, 1,5–4% média, < 1,5% baixa. Sem dado: baixa (História do Ceará: média). Disciplinas compostas usam o relatório de cada parte.
5. Corrigir erros do edital e avisar: Maria da Penha é 11.340/2006 (não /16); PPCE Lei 14.582/2009; CONTRAN da PRF revogadas mapeadas para as substitutas; "Estatuto do Torcedor (Lei 12.984/2014)" no CFO é erro (12.984 é HIV; o Estatuto 10.671/2003 foi substituído pela Lei Geral do Esporte 14.597/2023).

## Grupos (todo o produto)
- `enrollments.study_group` 1/2/3 e `mirror_group` (1/2). Grupo 3 = só a conta de teste; vê o grupo espelhado + o que foi lançado para 3; fica fora do ranking.
- `target_groups` (subconjunto de {1,2,3}) em metas e diagnósticos. Visibilidade no banco (`student_goal_scopes`, `student_group_allowed`).
- `course_group_settings(course_id, study_group, disabled_features[metas|edital|diagnostico_semanal|relatorio|ranking|progresso], notice)` — aba "Grupos" do curso no admin. RPC `admin_set_enrollment_group(id, course, group, mirror)`.

## Diagnóstico Semanal (mini_quizzes)
- Tabelas: `mini_quizzes` (course_id, title, description, week_number, release_date, position, subject_id null = diagnóstico semanal, status draft/published, target_groups, unlock_goal_id), `mini_quiz_questions` (quiz_id, position 0-based, subject_id, topic_id, statement, alternatives jsonb [{key,text}] 2–5), `mini_quiz_answer_keys` (question_id, correct_key A–E, explanation). Editar questões no lugar (IDs estáveis); nunca apagar.
- Tentativa única, cronômetro (`start_mini_quiz` / `submit_mini_quiz`), sem copiar texto, ranking opcional (acertos, depois menor tempo), aba Relatório com erros por disciplina/assunto, prévia e publicação pelo admin. Rotas `/aluno/diagnostico-semanal`, `/aluno/relatorio`.

### REGRAS do Diagnóstico Semanal (usuário, 29–30/10/2026; também em `docs/ia/01-regras.md` 16a)
- Um por grupo a cada 7 metas: Metas 01–07, 08–14, 15–21...
- **Liberação SÓ após a CONCLUSÃO da meta que fecha o bloco**: 01–07 → concluir a Meta 07; 08–14 → Meta 14; 15–21 → Meta 21. No banco: `mini_quizzes.unlock_goal_id` = meta de fechamento **do grupo daquela versão** (versão G1 → meta do G1; o G3 segue o espelho) + função `mini_quiz_unlocked` na RLS e em start/submit. Meta concluída = todos os itens não arquivados marcados pelo aluno. `release_date` = due_date dessa meta (piso). Quem já iniciou/enviou mantém acesso. **Todo diagnóstico novo nasce com `unlock_goal_id` e `release_date` preenchidos** (ligar por título "Meta N" + curso + grupo).
- Tamanho = metade da prova real, metade por disciplina. PMPE 30 (5 por disciplina). GMF 40 (PT 5, RLM 4, INF 4, ATU 3, FOR 4; ADM 5, CONST 5, PEN 5, LEG 5).
- Questões só de assuntos estudados nas metas do bloco **daquele grupo** (aulas e cadernos das metas) — conferir uma a uma antes de liberar. Disciplina sem conteúdo no bloco: perguntar ao usuário (PMPE G1 15–21 manteve História como revisão).
- Revisão crítica antes de liberar: questão contestável (gabarito discutível, duas certas, erro no texto, depende de texto ausente, lei desatualizada) ou fora do assunto vira **inédita** do mesmo assunto, com resposta verificável em lei/gramática.
- Lançamento: primeiro só no G3 (para o G3 ver antes da data: release_date = hoje e versão G2 em rascunho); ao liberar: G1 → {1,3}, G2 → {2}, release_date = data da meta.
- Descrição: "Com cronômetro; a correção comentada aparece depois do envio."
- Diagnósticos existentes (todos com unlock_goal_id): PMPE 01–07 G1 `d3b83f20-717c-492f-9ee2-f62f2a2ad202`, G2 `65dc2d3c-2ca3-442e-a4e5-2cb3cb9c1f2c`; 08–14 G1 `2499aaa9-ba8a-4e5c-bb6f-d710e6ee9473`, G2 `5f060045-f59a-400a-875a-38f7456cb226`; 15–21 G1 `83322276-31a9-4f7f-8c88-20cb168c7151`, G2 `2e23cb78-3cf7-4c69-a3c9-ad19b80a15e8`. GMF 01–07 G1 `dbb9973e-4edd-416a-a63a-aada39772695`, G2 `1bafa6fb-fbf2-4d70-92ec-caf371243ab9`.

### Formatos
- Enunciado: `**Texto associado**\n\n<texto>` quando houver; `**negrito**` para termo destacado; `__sublinhado__`; lacunas com `\_` (sublinhado escapado), nunca `____` puro (vira marcação e some). Sem rótulos "Texto 1" / "Leia o texto".
- Explicação:
  ```
  **Imparável**, a resposta é a **letra X**.

  <explicação simples; "Por que as outras erram:" com •>

  Questão de concurso: BANCA - ANO - Órgão - Cargo (Qconcursos ID).
  ```
- Certo/Errado: alternativas [A Certo, B Errado]; "**Imparável**, a resposta é **Certo** (letra A)." sem frase redundante "O item está certo".

## Qconcursos (navegador embutido logado na conta do usuário, aba "seed")
- Caderno: `/questoes-de-concursos/questoes?notebook_ids[]=N&page=P` (20 por página). Busca livre: `?q=...`.
- Parser no navegador (`window.__parse(html)`): `.js-question[data-question-id]`; breadcrumbs `.q-question-breadcrumb a.q-link`; info `.q-question-info`; alternativas `label.js-choose-alternative` (input value + `.js-alternative-content`). O texto associado não vem no HTML: evitar questões que dependem dele.
- Gabarito: responder como usuário — POST `/api/questions/{id}/answer` com `{answer:'A'}` e header `X-CSRF-Token` (meta csrf-token). Resposta traz `resolve.right_answer`; status `correct` significa que A era a certa. Cloudflare limita (429): espaçar ~10 s entre chamadas.
- JS do navegador expira em 45 s: rodar loops assíncronos em segundo plano e consultar depois. Navegar na aba apaga as variáveis globais.
- Não copiar comentários de professores do Qconcursos; escrever explicações próprias; citar a fonte.
- Rejeitar questão desatualizada (gabarito contra jurisprudência atual), fora do assunto, difícil demais ou sem texto.
- Cadernos conhecidos (PMPE): RLM 15292440 (só negação/equivalência — sugerido ao usuário corrigir); DH 15271074, 15294225–15294229; PT 15270937, 15294117, 15294140; História 15294142 (só 7 questões; busca subject_ids[]=10642); INF/CON do G2 15294191 e 15294207.
- Leis estaduais de PE: texto atualizado em legis.alepe.pe.gov.br (abrir pelo navegador embutido; WebFetch é bloqueado). Estatuto PMPE = Lei 6.783/1974 (valor PM art. 26; deveres art. 30; afastamentos art. 62; soldo arts. 54–55).

## Hotmart
- `hotmart_product_mappings` (hotmart_product_ucode, offer_policy any/authorized_offers, active) e `hotmart_offer_rules` (mapping_id, offer_code, grants_access, label).
- PMPE: ucode af36e37a-d94f-4bdc-a761-0f05faf09173 (ofertas liberadas 4e4p713s, t43w9ztx, dfr303px, r87yyfbz).
- GMF: mapeamentos 41a3b177 (ucode fb056612-...) e 0f5cf2ed (ucode 0bd11502-...) liberam fx39ie5v, rhp2q094, henwjt9b, vnevmgwm ("GMF + SGA").
- Ofertas Turbo sem SGA cadastradas como não libera: `peo739yu` (PMCE Turbo), `dq9i812d` (PRF Turbo).
- Evento de oferta não cadastrada fica "ignored"; o aluno recupera pelo "Primeiro acesso" (recoverHotmartPurchases).
- Código de acesso por e-mail tem 8 dígitos; vale o do e-mail mais recente. Para refazer o questionário/primeiro acesso de um aluno, resetar o processo dele a pedido.

## Estilo de entrega
- Responder curto, em português, com o resultado e o que falta. Tabelas quando comparar grupos/cursos.
- Sempre listar correções de edital feitas e pontos para o usuário conferir.