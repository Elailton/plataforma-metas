# 15 — Padrões técnicos (como fazer na prática)

Receitas testadas em 2026 pelo Claude neste projeto, para qualquer IA repetir. Complementa
`14-fluxos-ponta-a-ponta.md` (o quê) e `05-runbooks.md` (procedimentos de suporte e deploy).

## Git e GitHub
- Branch por tarefa; commits pequenos com as linhas de atribuição da IA, se houver.
- PR pela API REST: `gh api repos/Elailton/plataforma-metas/pulls -f title=… -f head=<branch> -f base=main -f body=…`
  (GraphQL/`gh pr create` pode estar bloqueado). Checks: `gh api repos/…/commits/<sha>/check-runs`.
- Merge **só depois de perguntar**: `gh api -X PUT repos/…/pulls/<n>/merge -f merge_method=rebase`.
- CI `validate`: `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm build`. Vercel publica a `main`.

## SQL no Supabase (projeto `cbryvevesiaoqmwwlnet`)
- Prefira **um comando** com CTEs que modificam dados:
  `with v(...) as (values ...), ins as (insert ... returning ...) insert ... select ... from ins join v ...`.
  Lotes de até ~15–19 KB por chamada. Textos longos: `$q$...$q$`.
- Um `select` na mesma CTE vê o estado **anterior** ao `update`: reconsulte depois.
- Para manter ordem entre inserts dependentes use `materialized` e `where exists (select 1 from <cte anterior>)`.
- Idempotência: `where not exists (select 1 from <tabela> where <chave natural>)` (ex.: material por URL
  no mesmo curso; meta por título no mesmo curso).
- Leitura de produção sem risco: `begin read only; …; rollback;`. Nunca DELETE/TRUNCATE em dados de aluno.
- Migrações: arquivo `supabase/migrations/AAAAMMDDHHMMSS_nome.sql`, aditivo, reversão no cabeçalho, teste
  em banco descartável (PGlite nos testes: `tests/helpers/database.mjs` + `applyMigration`), revisão de
  segurança, aplicar e conferir por SQL (`05-runbooks.md`).

## Criar metas (modelo usado em 10/11/2026)
Gerar o SQL por script (Python) a partir de uma especificação por meta: lista de blocos
"aula" (títulos exatos das aulas → URLs dos materiais) e "questões" (tópico, caderno, nº de questões).
1. Materiais novos (cadernos/tutorial), idempotente por URL.
2. Metas em rascunho: `insert into goals(course_id,title,description,status,due_date,target_groups,kind)`
   com `status='draft'`.
3. Itens + vínculos num comando: `ins as (insert into goal_items(goal_id,subject_id,topic_id,instructions,
   suggested_questions,position) ... returning id,goal_id,position)` e
   `insert into goal_item_materials(goal_item_id,material_id,position)` ligando por (título da meta, posição,
   URL do material).
4. `update goals set status='published' where course_id=… and status='draft' and title ~ '^Meta 0[123] '`.
5. Conferência: itens por meta, itens sem tópico = 0, itens sem material = 0.
Textos padrão: aula → "Assista, nesta ordem, às aulas: … (~N min em 1,5x). Anotação dirigida: …";
questões → "Questões — 1ª resolução de «assunto»: resolva N questões no caderno do Qconcursos deste
assunto (link nos materiais deste item), sem consultar o material (~3 min por questão). Estudo reverso: …".
Descrição da meta: "Meta de ~Xh YYm. Em cada disciplina: aula → anotação dirigida → questões do caderno →
estudo reverso → caderno de erros." + bloco do caderno de erros (cores vermelho/amarelo/laranja/azul).

## Hotmart Club: ler as aulas de um curso (navegador logado na conta compradora)
1. "Minhas compras" → curso. Cabeçalhos de módulo: `[aria-label^="Progresso do módulo"]`; clicar no
   `button` pai expande o módulo.
2. Aulas: `a[href*="/content/"]`; o texto traz "mm:ss Título Disponível até …". Ignorar o link fixo
   "Edital Verticalizado" que aparece em todo módulo e os itens "EM PERÍODO DE PRODUÇÃO".
3. Rodar o laço em segundo plano no navegador (scripts têm limite de ~45 s) e ler o resultado depois.
4. URL do material: `https://hotmart.com/pt-BR/club/<club>/products/<id>/content/<cid>`.
5. "Bloco de Questões" é aula de resolução: cadastrar, mas o planejador não conta como aula nova.

## Hotmart: descobrir o ucode de um produto
- Melhor: `data.product.ucode` de uma venda real no webhook (`hotmart_webhook_events.product_ucode`).
- Antes da 1ª venda: abrir o checkout `https://pay.hotmart.com/<código>?off=<oferta>`, ler o JSON do
  `<script>` que contém `"ucode"` (formato "devalue": o valor do campo é o índice do array) e conferir que
  o `id` do produto é o mesmo do Hotmart Club. Confirmar na primeira venda real.
- O teste da Hotmart ("Enviar teste") sempre usa `fb056612-bcc6-4217-9e6d-2a5d1110ac2f` e oferta `test`.

## Qconcursos
- Caderno: `/questoes-de-concursos/questoes?notebook_ids[]=N&page=P` (20 por página).
- Parser: `.js-question[data-question-id]`, breadcrumbs `.q-question-breadcrumb a.q-link`, info
  `.q-question-info`, alternativas `label.js-choose-alternative`. O texto associado não vem no HTML.
- Gabarito: responder pela própria conta (`POST /api/questions/{id}/answer` com CSRF) espaçando ~10 s
  (limite 429). Não copiar comentários de professores; escrever explicação própria e citar a fonte.
- Rejeitar questão desatualizada, fora do assunto ou dependente de texto ausente.

## Formatos de questão (diagnósticos e simulados)
- Enunciado com texto-base: começa com `**Texto associado**`; fim opcional `[[/texto]]`.
  `**negrito**`, `__sublinhado__`, lacuna `\_`. Inédita (só com autorização): linha `[[inedita]]`.
- Explicação:
  ```
  **Imparável**, a resposta é a **letra X**.

  <explicação simples; "Por que as outras erram:" com •>

  Questão de concurso: BANCA - ANO - Órgão - Cargo (Qconcursos ID).
  ```
- Certo/Errado: alternativas A Certo, B Errado.

## Testes locais
- Testes de SQL usam PGlite (`@electric-sql/pglite`) com a fixture de `tests/helpers/database.mjs` e o
  cenário `tests/helpers/rls-scenario.mjs`; cada teste aplica as migrações necessárias.
- Rodar um arquivo: `node --test tests/<arquivo>.test.mjs`.
