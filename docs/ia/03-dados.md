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
| `goal_extra_items` / `goal_extra_item_materials` | Bloco "Se sobrar tempo" (2026-11-10): extras por meta, nível 1–3, fora do progresso e sem conclusão | — |
| `enrollments.extra_tier_override` | Volume extra definido pelo admin (null = pela resposta de horas) | — |
| `mini_quiz_attempts` / `_answers` | Tentativas e respostas | — |
| `mini_quiz_essay_reports` + bucket privado `essay-feedback-reports` | PDF de devolutiva ligado à redação, público, publicação e primeira abertura; implementação de 11/11 ainda não publicada | conteúdo pedagógico e identificação eventualmente presente no PDF. Acesso só ao dono com matrícula ativa e ao administrador; caminhos sem nomes. Mesma política de retenção das respostas, com execução/revisão jurídica pendentes em `08` |
| `access_resend_requests` | Pedidos de reenvio: hashes HMAC de e-mail/IP, outcome | só hash, **retenção 30 dias** |

## Conferência das devolutivas (11/11/2026)
`essay_report_test_recipient` guarda apenas o UUID da conta de teste controlada pelo
responsável, com leitura/configuração administrativa. `mini_quiz_essay_report_test_copies`
guarda vínculo, curso, caminho do PDF e primeira abertura da cópia. Não replica fotos,
texto original, tentativas ou respostas. A RPC expõe nota/comentário e pontuação objetiva
somente para conferência, sem usar esses valores nas estatísticas da conta de teste.
O PDF continua privado e pode conter a identificação já presente na devolutiva original.
Só a conta configurada, com matrícula ativa no Grupo 3 do curso, pode abrir a cópia;
qualquer conta comum, outro usuário de teste ou matrícula bloqueada é negada.
Mesma finalidade pedagógica e retenção da devolutiva original, pendente da validação
jurídica geral registrada em `08`. Não há novo fornecedor ou comunicação por e-mail.

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

## Ranking com nota final (11/11/2026)
Com `ranking_nota_final` habilitado por curso/público, a RPC de ranking inclui somente
status resumido, total da redação e soma, além do nome curto, objetiva e tempo já
compartilhados por quem escolheu participar. Não retorna texto, comentário, fotos,
PDF, notas por critério, e-mail ou IDs dos outros alunos. Convite de participação
e aviso de privacidade atualizados; validar com o jurídico a abrangência da opção
de participação dos alunos anteriores. Sem mudança de notas ou nova retenção.
