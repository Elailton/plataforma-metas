# 02 — Arquitetura e estado atual (revisado em 2026-10-28)

## Peças

| Peça | Detalhe |
|---|---|
| App | Next.js 16 (App Router, server actions), TypeScript, repositório `Elailton/plataforma-metas` |
| Hospedagem | Vercel **Pro** (desde 2026-10-27), região `iad1`, Fluid compute, Rollback disponível, prévias protegidas por login Vercel. Orçamento de gastos: US$ 200, alertas 50/75/100 %, **sem pausa** |
| Domínio | `mentoria.cursoprofericklima.com.br` |
| Banco/Auth | Supabase **Pro**, projeto `cbryvevesiaoqmwwlnet`, `us-east-1`, compute **Micro** (60 conexões) |
| Auth | Conexões do Auth em **25 %** do máximo (15 hoje). Link/código de e-mail com validade > 1 h. Proteção de senha vazada: desligada (decisão do usuário) |
| E-mail | SMTP próprio no Supabase Auth via **Resend** (`smtp.resend.com:465`), remetente `no-reply@mentoria.cursoprofericklima.com.br`, nome "Sistema Guiado da Aprovação". Plano gratuito: 100/dia, 3.000/mês. Limite do Auth: 100 e-mails/h |
| Pagamentos | Hotmart: webhook `POST /api/webhooks/hotmart` (Webhook 2.0.0, header `X-HOTMART-HOTTOK`). API de vendas (credenciais `HOTMART_CLIENT_ID/SECRET/BASIC`) **recusa consultas (400 invalid_parameter)** desde 2026-10-27 |
| Suporte | WhatsApp `https://wa.me/5585996885832` (`lib/support.ts`) |

## Fluxo de acesso do aluno

1. Compra na Hotmart → webhook valida HOTTOK, idempotência por `id` do evento.
2. Produto mapeado por `ucode` (`hotmart_product_mappings`); política `authorized_offers`:
   só ofertas cadastradas como "libera" criam direito (`hotmart_offer_rules`).
3. Cria/convida a conta (e-mail "Seu primeiro acesso…"), grava o direito por transação
   (`hotmart_entitlements`) e reconcilia a matrícula (`enrollments`), respeitando bloqueio.
4. Link do e-mail → `/auth/confirm` (o token só é consumido ao tocar "Continuar") →
   `/auth/primeiro-acesso` (cria senha) → questionário do curso → grupo calculado pelo
   banco (`save_course_questionnaire`) → área do aluno.
5. Recuperação: `/auth/reenviar-acesso` (só para quem já tem matrícula ativa; resposta
   genérica; limites 3/e-mail, 10/IP, 120 global por hora), `/auth/codigo` (código do
   e-mail), botão admin **"Copiar link de acesso"** (link de uso único para WhatsApp).
6. `/auth/encontrar-compra` (código HP… da Hotmart): existe, **sem links nas telas**
   (decisão de 2026-10-27). Usa primeiro os registros do webhook; API só se faltar e-mail.

Desde a migração `20261028000100` (Fase B), todo evento de compra real guarda o e-mail
normalizado do comprador (inclusive os ignorados por produto/oferta sem cadastro), para
reprocessar depois. "Compra concluída" (`PURCHASE_COMPLETE`) cria acesso só quando a
transação não tem nenhum direito. Eventos anteriores à migração não têm e-mail.

## Área do aluno

- `getStudentCourseSnapshot` monta metas/edital/progresso. **Não traz materiais**: os
  materiais são carregados só na página da meta aberta (`getGoalItemMaterials`).
- Liberação de meta: data (00:00 America/Fortaleza) **e** meta anterior concluída.
  `GoalReleaseRefresh` espalha a recarga em até 90 s após a liberação (evita pico).
- O aluno vê até 10 metas à frente da atual, só as com data já liberada.
- Diagnóstico Semanal (`mini_quizzes` com `subject_id` nulo): tentativa única,
  cronômetro, ranking opcional; correção só no banco.

## Capacidade medida (teste de carga em branch, 2026-10-27)

- Cenário: 6 cursos × 220 metas, 1.200 alunos sintéticos, RLS real, compute Micro.
- **~22 aberturas de página por segundo** (≈1.300/min) antes de enfileirar; com 32
  simultâneos, 1,6 s por página. Antes da otimização dos materiais: 13/s.
- Pico real observado: ~10 alunos no mesmo intervalo de 5 min; 90 alunos/dia.
- Gargalo é CPU do Postgres (RLS em cascata). Ampliar: compute Small/Medium no Supabase.

## Integração com IAs

- Supabase MCP: `execute_sql` funciona (vários comandos numa transação funcionam;
  `apply_migration` costuma ser cancelado → usuário roda a migração).
- Vercel MCP: acesso ao time `team_6e3R0tU6Zj0WxscAyqTzcZx6`, projeto
  `prj_eYmjORDWd3Q5Biu0yATnZuuGfZOV` (logs, erros, deploys).
- O sandbox da IA não alcança `*.supabase.co` nem a API da Hotmart por HTTP.
