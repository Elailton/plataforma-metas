# 05 — Runbooks (procedimentos prontos)

Sempre: confirmar o aluno pelo e-mail no banco, agir só no caso pedido, registrar em
`07` se envolver exceção destrutiva.

## Suporte a aluno

### "Não recebi o e-mail"
1. Conferir a conta: `auth.users` (criada? `email_confirmed_at`, `last_sign_in_at`,
   `recovery_sent_at`) e `enrollments` (ativa? questionário?).
2. Conferir a entrega no Resend (Emails → filtrar pelo destinatário): "Delivered" quase
   sempre significa que chegou e a pessoa não reconheceu (spam, Promoções, Lixo
   eletrônico no Hotmail). Assunto do reenvio: "Seu acesso ao Sistema Guiado da Aprovação".
3. Já entrou alguma vez → orientar "Esqueci minha senha" no login.
4. Nunca entrou / pessoa com dificuldade → admin: Cursos → curso → Alunos →
   **"Copiar link de acesso"** e enviar pelo WhatsApp (uso único; cada link novo
   invalida os anteriores; gerar na hora de enviar).
5. E-mail não existe na plataforma → provavelmente comprou com outro e-mail, comprou
   oferta "curso apenas", ou a compra chegou antes do cadastro do produto/oferta.
   Conferir `hotmart_webhook_events` pelo código HP… e a oferta em `04`.

### Refazer o questionário (a pedido)
`update enrollments set questionnaire = null, group_manual_override = false where id = <matrícula>;`
e reenviar o acesso. O histórico fica em `course_questionnaire_submissions`.

### Reiniciar metas de um aluno (só com pedido explícito)
Apagar as linhas de `student_goal_item_completions` daquele aluno nos itens daquele
curso. É destrutivo: confirmar com o usuário, contar antes, registrar em `07`.

### Reprocessar compras pendentes (admin)
Admin → curso → Configurações → "Reprocessar compras pendentes" → **Ver prévia** →
conferir (reembolsadas/atrasadas nunca liberam; "possível conta duplicada" fica fora e
deve ser conferida à mão) → marcar a confirmação → **Liberar**. Máximo de 20 por dia
(todos os cursos), curso em rascunho bloqueia. Reprocessar de novo não duplica (id de
evento `reprocess:<transação>`). Quem já tem conta recebe o curso sem e-mail.

### Liberar acesso manual
Admin → curso → Alunos → "Conceder acesso manual" (nome é obrigatório para conta nova).
Preferir antes descobrir por que a compra não liberou (oferta? e-mail diferente?).

## Hotmart

### Cadastrar produto/ofertas de um curso
1. Ucode vem do payload real do webhook (`data.product.ucode`), nunca do código do
   checkout. Mapear em `hotmart_product_mappings` com `offer_policy='authorized_offers'`.
   **Oferta em dúvida (não cadastrada ou sem rótulo): sempre gerar o link
   `https://pay.hotmart.com/<checkout>?off=<oferta>` e enviar ao usuário para ele conferir
   antes de cadastrar** (pedido do usuário em 2026-10-28).
2. Cadastrar em `hotmart_offer_rules` cada oferta com `grants_access` true/false e um
   rótulo claro. Confirmar com o usuário quais liberam (gerar os links de checkout para
   ele conferir).
3. Compras recebidas antes do cadastro: as anteriores a 28/10/2026 não têm e-mail (não
   reprocessáveis); as posteriores guardam o e-mail e podem ser reprocessadas. Se a
   "Compra concluída" chegar depois do cadastro, o acesso é criado automaticamente.
4. Atualizar `04-cursos-e-ofertas.md`.

### Teste de webhook
O envio de teste da Hotmart usa o ucode fixo `fb056612-…` e oferta `test`: aparece nos
eventos, não é venda real.

## Código, deploy e banco

### Fluxo de mudança
branch → commit (com as linhas de atribuição) → `git push` → PR via `gh api` →
aguardar check `validate` → mostrar o resumo e pedir para mesclar → merge com rebase →
aguardar o status da Vercel "success" → conferir no site.

### Migração
Arquivo em `supabase/migrations/AAAAMMDDHHMMSS_nome.sql`, aditivo, com reversão no
cabeçalho → enviar ao usuário → ele roda no SQL Editor → conferir por SQL.

### Reverter um deploy
Vercel → projeto → Deployments → deploy anterior → "Promote"/Rollback; ou `git revert`
do PR e novo merge.

### Teste de carga
Criar branch do Supabase (custa centavos/hora), recriar o esquema de produção (tabelas,
índices, funções e políticas do aluno), dados sintéticos, gerar carga com `dblink`
conectando pelo host `db.<ref>.supabase.co`, medir, **apagar o branch**.

## Qconcursos (Diagnóstico Semanal)
Ver a skill `sga-plataforma`. Usar a sessão já logada no navegador; respeitar a cota de
respostas do usuário; questões anuladas/desatualizadas ficam fora.

## Replanejar metas futuras (regras de `09-regras-metas.md`)

Usado em 29/10/2026 nas metas não liberadas de PMPE e GMF (Grupos 1 e 2).

1. Exportar por SQL, por curso e grupo: metas futuras (`due_date` > hoje em
   America/Fortaleza), itens ativos, edital com importância, materiais (aulas com
   duração, cadernos do Qconcursos, apostila, Vade Mecum, tutorial do caderno de erros).
2. Planejar fora do banco (script Python): uma trilha por disciplina, séries de aula
   inteiras (dividir só acima de ~90 min no G1 / ~150 min no G2, em metas seguidas e
   sozinha na disciplina), questões logo após cada assunto, lei seca e leitura a partir
   da Meta 08, revisões espaçadas, RLM com caderno, orçamento diário por grupo.
3. Gravar em lotes de ~15 KB, um comando com CTEs: arquivar (`archived_at`) os itens
   ativos das metas futuras, exceto os fixos (Atualidades, Mini simulado, Redação), que
   mantêm o ID e só mudam `position`; inserir os itens novos e os materiais; atualizar o
   título. Conferir `esperados = resolvidos = itens` em cada lote.
4. Resolver os textos ({AULAS}, {NOTA}, {BLOCO}, {TT}) por SQL a partir dos materiais
   vinculados e da anotação dirigida do item antigo do mesmo assunto.
5. Verificar: toda meta futura com questões, toda questão com caderno do Qconcursos,
   RLM sempre com caderno, nenhum `{` sobrando, nenhum item fixo arquivado.
6. Reversão: reativar os itens arquivados no horário da gravação e arquivar os novos.
