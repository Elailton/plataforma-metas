# Correções de progresso, rascunhos e eventos anteriores à conta

Base: `main` em `fc3b1a1428c7c0594fcc60d55aa84bf73e71abd9` (PR #8 já incorporado).
Sem reset, remoção de contas, redesign ou mudança nas regras de bloqueio/manual.

## Validação e arquivos

Validação local: `pnpm install --frozen-lockfile`, `pnpm test` (70 testes),
`pnpm exec tsc --noEmit` e `pnpm build` passaram. Inclui regressões do formulário,
server actions, webhook real com HOTTOK inválido, núcleo comercial e SQL/RLS no
PostgreSQL descartável. Não foi executado SQL nem teste autenticado em produção.

Alterados: `AGENTS.md`, `README.md`, `components/admin/goal-form.tsx`,
`lib/admin/actions/goals.ts`, `lib/admin/queries.ts`, `lib/student/queries.ts`,
`lib/hotmart/core.mjs`, `lib/hotmart/core.d.mts`, `lib/hotmart/supabase-repository.ts`,
`tests/admin-course-blocks.test.mjs`, `tests/hotmart-core.test.mjs`.

Novos: este guia, as duas migrations listadas abaixo,
`tests/beta-regressions.test.mjs`, `tests/goal-save-actions.test.mjs`,
`tests/hotmart-route.test.mjs`, `tests/helpers/database.mjs`.

## O que muda

1. Metas são salvas atomicamente pela RPC `admin_save_goal`, com IDs estáveis e
   conferência de `updated_at`. Texto, prazo, materiais e ordem não zeram conclusões.
   Uma tela desatualizada recebe erro e precisa ser recarregada antes de salvar.
2. Remover um item ou trocar disciplina/tópico arquiva sua identidade anterior
   em `goal_items.archived_at`. Seu histórico de conclusões permanece no banco;
   um item/tópico novo não herda conclusão. Arquivados não entram no checklist
   nem nos percentuais atuais. A FK impede exclusão em cascata de itens com
   progresso, inclusive se uma versão antiga tentar recriá-los ao salvar.
   Para retirar uma meta com histórico, use **Arquivar**, não **Excluir**.
3. RLS exige curso publicado, matrícula ativa e ausência de bloqueio; metas
   também precisam estar publicadas. Itens e vínculos de materiais de rascunhos
   ficam ocultos em consultas diretas autenticadas, não apenas na interface.
   Admin continua podendo editar/visualizar rascunhos.
4. Eventos negativos recebidos antes da conta guardam o estado por transação em
   `hotmart_entitlements`, com `user_id = null`, sem e-mail/nome/payload.
   Um direito pendente nunca pode estar `active`. Aprovação antiga/igual é ignorada;
   uma aprovação mais nova pode convidar o aluno e associar a mesma transação.
   Mesmo se um refund chegar durante o convite, a RPC impede acesso indevido.
   Nessa corrida específica o convite pode já ter sido enviado; ele não concede matrícula.

As regras de várias compras por curso, matrícula manual, bloqueio administrativo,
e-mail normalizado, idempotência de `event.id`, primeiro acesso e preservação do
progresso após reembolso permanecem. Nenhum merge por `buyer.ucode` foi introduzido.

## Aplicação em produção — nesta ordem

1. Confirme backup/exportação acessível do banco. Não edite metas durante esta janela.
2. No SQL Editor do projeto Supabase usado pela produção, execute integralmente:
   - `supabase/migrations/20260904000200_goal_progress_and_published_rls.sql`
   - `supabase/migrations/20260904000300_hotmart_events_before_account.sql`
   As quatro migrations anteriores precisam estar aplicadas. Não execute novamente
   migrations antigas. Cada arquivo novo possui `BEGIN/COMMIT`: erro desfaz o arquivo.
3. Faça merge da PR em `main` e confirme que o deployment de produção da Vercel
   usa o commit novo. Não basta aplicar SQL, nem apenas abrir a preview.
4. Recarregue o Admin antes de voltar a editar e execute os testes manuais abaixo.

Verificação somente leitura (os três resultados devem ser `true`):

```sql
select
  exists (select 1 from information_schema.columns where table_schema='public'
    and table_name='goal_items' and column_name='archived_at') as itens_arquivaveis,
  to_regprocedure('public.admin_save_goal(uuid,uuid,jsonb,jsonb,timestamp with time zone)')
    is not null as salvar_meta_atomico,
  exists (select 1 from information_schema.columns where table_schema='public'
    and table_name='hotmart_entitlements' and column_name='user_id' and is_nullable='YES')
    as evento_antes_da_conta;
```

Nenhuma variável nova. Preserve `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `HOTMART_HOTTOK`
e `SITE_URL=https://mentoriaimparaveis.vercel.app` no ambiente correto.
Service role/HOTTOK permanecem exclusivamente no servidor.

Nenhuma alteração adicional de SMTP, template de convite, Hotmart product mappings
ou seleção de eventos é exigida por esta rodada. O webhook continua em
`https://mentoriaimparaveis.vercel.app/api/webhooks/hotmart`.

## Testes de aceite

Use curso/aluno destinados a testes, sem apagar usuários ou progresso existentes:

1. Publique uma meta com dois itens. Como aluno, conclua um; guarde seu ID e a linha
   de `student_goal_item_completions`. Como admin, altere título, prazo, orientação,
   materiais e ordem. Recarregue como aluno: a conclusão e seu registro devem permanecer.
2. Remova o item concluído, mantendo outro. O item removido fica com `archived_at`
   preenchido e sua conclusão continua no banco; não aparece no checklist atual.
   Trocar o tópico cria um item novo sem conclusão, preservando o anterior arquivado.
3. Abra a mesma meta em duas telas. Salve na primeira. A segunda deve exigir recarga,
   sem aplicar alterações parciais nem arquivar itens recém-adicionados.
4. Mova a meta para rascunho/arquivado: aluno não pode consultar meta, itens ou links.
   Mova o curso para rascunho: nem os demais conteúdos ficam acessíveis ao aluno.
   Publique novamente e confirme que as conclusões reaparecem. Não basta testar
   como `postgres` no SQL Editor: ele ignora RLS. Os testes automatizados usam
   papéis `authenticated`/`anon` e alunos diferentes contra PostgreSQL descartável.
5. Em ambiente isolado de teste, envie eventos válidos da mesma transação: refund
   com `creation_date` mais novo, depois approval antigo, depois approval mais novo.
   Primeiro: entitlement `revoked`/usuário nulo e nenhum convite. Segundo: `ignored`,
   sem conta/acesso. Terceiro: uma conta/convite e acesso ativo. Não invente eventos
   comerciais contra alunos reais nem altere eventos processados para repetir teste.
   Os testes locais já cobrem essa sequência sem compra nem reembolso reais.
6. Reconfirme que compra manual/Hotmart ativa não vence bloqueio administrativo e
   que um curso sem matrícula nunca é liberado por alterar IDs.

## Limites e dados anteriores

- Conclusões que o código antigo já excluiu não podem ser reconstruídas por esta
  migration. Recuperação exige um backup anterior e reconciliação específica.
- Eventos negativos antigos marcados `processed` sem entitlement não possuem
  `creation_date` comercial na tabela de eventos. Não é seguro sintetizar estados
  a partir de `created_at`/`processed_at`, nem reprocessar tudo automaticamente.
  Se houver casos históricos, compare a transação com o histórico real Hotmart e
  faça uma reconciliação direcionada autorizada, sem apagar logs/direitos.
- Igualdade de `creation_date` continua ignorada, preservando a regra anterior.
- Os testes de corrida cobrem ambas as ordens e refund durante convite; o banco
  descartável PGlite não substitui teste de carga multiconexão de produção.

## Rollback seguro

Se uma migration falhar antes do commit, seu arquivo inteiro é revertido. Corrija
a causa antes de prosseguir; não ignore erros nem remova políticas para contornar.

Se o deployment falhar, mantenha as migrations aditivas e reverta/promova o último
deployment estável na Vercel temporariamente. Suspenda edição de metas e investigue
o webhook: a versão antiga não registra eventos novos anteriores à conta, e não
filtra itens arquivados no formulário do admin. A FK continuará bloqueando a
exclusão de itens com conclusões; isso pode produzir erro ao salvar na versão antiga.
Prefira corrigir e redeployar esta versão em vez de permanecer nesse estado.

Não remova `archived_at`, não torne `user_id` NOT NULL enquanto existirem pendentes,
não apague entitlements/conclusões, não restaure a antiga RLS permissiva e não
resete o banco. Uma reversão de esquema exigiria migration compensatória revisada
para os dados existentes. As contas de admin/teste são preservadas em todo o processo.
