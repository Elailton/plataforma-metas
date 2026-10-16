# E-mails de autenticação

Os modelos `supabase/email-templates/invite.html` e `recovery.html` são modelos Go usados pelo Supabase Auth. Usam identidade visual da plataforma, nome de `Data.full_name` com fallback, layout por tabelas e CSS inline para clientes de e-mail. Não usam imagens remotas, fontes externas nem rastreamento.

Preservam o fluxo SSR `/auth/confirm?token_hash=...&type=invite|recovery&next=/auth/primeiro-acesso`. O botão e o link alternativo têm o mesmo destino. Não substituir pelo fragmento de acesso do fluxo implícito. Os modelos não definem o grupo: o aluno autenticado segue o questionário/matrícula existentes. Convites e recuperações são e-mails de acesso, sem escolha pública de curso ou papel.

Configuração no Supabase Auth:

- `smtp_sender_name`: Sistema Guiado de Aprovação.
- `mailer_subjects_invite`: Seu primeiro acesso ao Sistema Guiado de Aprovação.
- `mailer_subjects_recovery`: Redefina sua senha — Sistema Guiado de Aprovação.
- `mailer_templates_invite_content`: conteúdo de `invite.html`.
- `mailer_templates_recovery_content`: conteúdo de `recovery.html`.

O remetente, SMTP, senha SMTP, limites, validade dos tokens e URLs permitidas não precisam mudar para aplicar o visual. Atualizar somente os campos acima pela configuração de Auth; não registrar configurações completas que possam conter segredos. Não enviar convites/redefinições a alunos apenas para validar o layout sem instrução explícita.

## Entrega

Um layout mais bonito não garante que o e-mail deixe de cair no spam. Usar SMTP próprio com domínio verificado, SPF do Return-Path e DKIM alinhados com o remetente, DMARC válido, reputação de envio e destinatários reais. Verificar o resultado em cabeçalhos `Authentication-Results` e registros do provedor. Desabilitar rastreamento de cliques dos e-mails de acesso no provedor, quando configurado, para não reescrever links pessoais.

A revisão de DNS identificou SPF/DKIM da Resend e um trecho inválido na política DMARC do domínio principal. Um TXT DMARC válido específico para o subdomínio do remetente evita depender desse registro. Não alterar SPF/MX de outros serviços de e-mail ao corrigir a mentoria. Começar com `p=none`; evoluir a política depois de confirmar os remetentes legítimos.
