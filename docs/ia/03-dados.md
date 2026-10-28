# 03 — Dados, dados pessoais e retenção

O modelo completo (matrícula, direitos, bloqueios, metas, mini simulados) está no
`AGENTS.md`. Aqui: o que cada tabela guarda de sensível e por quanto tempo.

## Tabelas principais

| Tabela | Conteúdo | Dado pessoal |
|---|---|---|
| `auth.users` | Contas (Supabase Auth) | e-mail, último login, IP em logs do Auth |
| `profiles` | Nome, iniciais, papel (`student`/`admin`) | nome |
| `enrollments` | Matrícula por curso, `status`, `study_group`, `mirror_group`, `questionnaire` (jsonb) | respostas do questionário (rotina, horas, experiência — sem dado sensível de saúde) |
| `course_questionnaire_submissions` | Histórico de respostas | idem |
| `hotmart_entitlements` | Direito por transação (`transaction`, status, oferta) ligado a `user_id` | indireto |
| `hotmart_webhook_events` | Evento recebido: id, tipo, transação, ucode, oferta, status | **não guarda e-mail nem payload** (regra atual) |
| `manual_course_grants` | Concessões manuais | indireto |
| `course_access_blocks` | Bloqueios com motivo (privado do admin) | motivo pode citar pessoa: evitar |
| `student_goal_item_completions` | Progresso por item | — |
| `mini_quiz_attempts` / `_answers` | Tentativas e respostas | — |
| `access_resend_requests` | Pedidos de reenvio: hashes HMAC de e-mail/IP, outcome | só hash, **retenção 30 dias** |

## Regras de dados pessoais

- Mínimo necessário. Proibido gravar CPF, endereço, telefone, dados de pagamento ou
  payload completo da Hotmart.
- Leitura de e-mails só no servidor (service role) ou por administrador.
- Logs (`console.*`, `logSafeServerError`) não podem conter e-mail, token, link de
  acesso ou payload.
- Supabase e Vercel ficam nos EUA (transferência internacional): precisa constar no
  aviso de privacidade (ainda não existe — ver `08-pendencias.md`).
- Pedido de exclusão do titular: tratar caso a caso com o usuário; nunca apagar
  progresso/histórico de outros.

## Fonte de verdade

Contagens e cadastros mudam: sempre consultar o banco antes de agir. Consultas úteis:
`docs/operacao/diagnostico-origem-matriculas.sql` (somente leitura).
