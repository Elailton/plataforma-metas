# 03 — Dados, dados pessoais e retenção

O modelo completo (matrícula, direitos, bloqueios, metas, mini simulados) está no
`AGENTS.md`. Aqui: o que cada tabela guarda de sensível e por quanto tempo.

## Tabelas principais

| Tabela | Conteúdo | Dado pessoal |
|---|---|---|
| `auth.users` | Contas (Supabase Auth) | e-mail, último login, IP em logs do Auth |
| `profiles` | Nome, iniciais, papel (`student`/`admin`) | nome |
| `enrollments` | Matrícula por curso, `status`, `study_group`, `mirror_group`, `questionnaire` (jsonb) | respostas do questionário: horas, rotina (trabalho, escalas, filhos/familiares), experiência e desempenho, hábitos e dificuldades de estudo (cansaço, concentração), preparação física. **Se cansaço/concentração/preparação física são dado de saúde está com o advogado** (`08`) |
| `course_questionnaire_submissions` | Histórico de respostas | idem |
| `hotmart_entitlements` | Direito por transação (`transaction`, status, oferta) ligado a `user_id` | indireto |
| `hotmart_webhook_events` | Evento recebido: id, tipo, transação, ucode, oferta, status, `buyer_email` | **só o e-mail normalizado** de compras reais (desde 28/10/2026); nunca nome/payload. Retenção 90 dias se a transação não gerou direito |
| `manual_course_grants` | Concessões manuais | indireto |
| `course_access_blocks` | Bloqueios com motivo (privado do admin) | motivo pode citar pessoa: evitar |
| `student_goal_item_completions` | Progresso por item | — |
| `mini_quiz_attempts` / `_answers` | Tentativas e respostas | — |
| `access_resend_requests` | Pedidos de reenvio: hashes HMAC de e-mail/IP, outcome | só hash, **retenção 30 dias** |

## Aviso de privacidade e termos

Textos em `lib/legal/content.ts` (páginas `/privacidade` e `/termos`, públicas; links no login,
na tela de código, no primeiro acesso e em Conta). O Vercel Web Analytics está ativo em
produção (`components/safe-analytics.tsx`) e corta parâmetros e `#` das URLs antes do envio:
nunca enviar e-mail, token ou ID pessoal em URL ou evento. **Qualquer mudança em dados tratados, fornecedores, prazos ou bases legais exige
atualizar o aviso no mesmo PR.**

## Regras de dados pessoais

- Mínimo necessário. Proibido gravar CPF, endereço, telefone, dados de pagamento ou
  payload completo da Hotmart.
- Leitura de e-mails só no servidor (service role) ou por administrador.
- Logs (`console.*`, `logSafeServerError`) não podem conter e-mail, token, link de
  acesso ou payload.
- Supabase e Vercel ficam nos EUA (transferência internacional): precisa constar no
  aviso de privacidade (consta na seção 4; contratos com os fornecedores a confirmar — ver
  `08-pendencias.md`).
- `buyer_email` dos eventos Hotmart: finalidade única de entregar o acesso comprado;
  limpeza diária pelo pg_cron (`hotmart-buyer-email-retention`, 06:17 UTC). Pedido do
  titular: `update hotmart_webhook_events set buyer_email = null where buyer_email = '<e-mail>'`.
- Pedido de exclusão do titular: tratar caso a caso com o usuário; nunca apagar
  progresso/histórico de outros.

## Fonte de verdade

Contagens e cadastros mudam: sempre consultar o banco antes de agir. Consultas úteis:
`docs/operacao/diagnostico-origem-matriculas.sql` (somente leitura).
