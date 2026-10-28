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

## Importar materiais da Hotmart Club (aulas por curso)

Feito em 28/10/2026 para o SGA - PMCE (624 materiais); o mesmo método vale para PRF, PPCE e CFO.
Só adiciona linhas em `materials`; nunca apaga nem altera materiais existentes.

1. **Fonte:** a área de membros do curso (`hotmart.com/pt-br/club/<slug>/products/<id>`), no navegador
   já logado (nunca digitar senha). O HTML da página de trilhas só traz os links das trilhas; as aulas
   aparecem ao expandir os módulos (`[data-test=module-list]`, botões `aria-expanded=false`; clicar um a um com
   ~1,2 s de intervalo, a sessão pode expirar se for rápido demais). Cada aula é `a[href*="/content/<hash>"]`,
   com título (`span[title]`), duração (`mm:ss`) e miniatura (aula em vídeo).
2. **Escopo:** importar só disciplinas e Vade Mecum. Ficam de fora os bônus (Eventos, Madrugadão, Plano de
   Ação, Upgrade Turbo, Cronograma, Simulados, Mini Simulados, Teoria em Questões, Matemática Básica, etc.),
   "Comece por aqui", SGA e Edital Verticalizado. Perguntar ao usuário se houver dúvida de escopo.
3. **Mapeamento:** cada módulo vai para a disciplina (`subjects.position`) do mesmo curso; módulo sem
   disciplina correspondente fica com `subject_id` nulo (ex.: Vade Mecum, Legislação Extravagante no PMCE).
4. **Formato gravado (igual ao PMPE/GMF):** `url` = `https://hotmart.com/pt-BR/club/<slug>/products/<id>/content/<hash>?track=<trilha>`
   (sem `?track=` se o módulo não tem trilha própria); `description` = `Trilha: <nome> | Ordem: 001 | Duração: mm:ss`;
   `type` = `apostila` (título com apostila/pdf), `videoaula` (tem duração/miniatura) ou `link` (o resto).
5. **Gravação:** `execute_sql` com CTE (`values` por módulo + `$b$...$b$` com linhas `hash§tipo§duração§título§ordem`,
   `string_to_array`), `insert ... where not exists (mesma url no curso)`: idempotente. Lotes de ~12 KB.
   Conferir depois: total por disciplina e que nenhum outro curso mudou.
6. Curso já publicado: o aluno passa a ver os materiais assim que gravados; avisar o usuário e perguntar o grupo
   antes quando o conteúdo for novo para os alunos.
