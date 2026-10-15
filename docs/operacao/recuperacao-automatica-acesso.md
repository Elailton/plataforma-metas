# Recuperação automática de acesso

O formulário em `https://sg-diagnostico.vercel.app/` registra nome, WhatsApp e e-mail no banco de contatos e solicita à plataforma o reenvio para o próprio e-mail informado. Nenhum curso, papel ou destinatário alternativo é aceito.

## Caminho do pedido

1. O navegador grava os contatos no banco privado do diagnóstico.
2. Chama `POST https://mentoria.cursoprofericklima.com.br/api/access/request`, enviando somente `email` e `request_id` (UUID do envio). A chamada parte do navegador para manter o limite por IP de cada solicitante.
3. A plataforma reserva o pedido no banco de forma atômica. O mesmo ID nunca dispara dois envios. Aplicam-se 3 pedidos/e-mail, 10/IP e 120 globais por hora, compartilhados com `/auth/reenviar-acesso`.
4. Retorna `202 accepted`, igual para alunos e pessoas sem acesso. Isso confirma registro, não entrega de e-mail.
5. Após a resposta, verifica conta de aluno, matrícula ativa em curso publicado e ausência de bloqueio administrativo. Envia o e-mail de recuperação do Supabase somente quando todas as condições forem satisfeitas. A pessoa define a senha apenas após abrir o link no próprio e-mail.

O direito comercial continua sendo mantido pelo webhook Hotmart existente, incluindo produto/oferta, eventos fora de ordem, reembolsos e cancelamentos. O fluxo público de reenvio não cria nem reativa matrícula, não remove bloqueios, não cria usuários e não promove administradores. Concessões manuais válidas também são preservadas. Uma compra cujo webhook falhou e ainda não produziu conta/matrícula exige revisão do evento pela equipe.

## Banco e implantação

Aplicar `20261015192149_atomic_access_recovery.sql` **antes** da publicação. A migração adiciona somente `request_key` e a RPC `reserve_access_resend`, executável exclusivamente por `service_role`. Nenhuma conta, compra, senha ou matrícula é alterada pela migração.

Continuam as mesmas variáveis `SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`. Não copiar a chave administrativa da plataforma para o diagnóstico. O CORS aceita somente o site do diagnóstico e o `SITE_URL` da plataforma. A CSP do diagnóstico libera conexão apenas para a origem da plataforma, além da própria origem.

Publicar primeiro a plataforma, verificar `OPTIONS /api/access/request`, depois publicar o diagnóstico. A opção já existente `/auth/reenviar-acesso` continua funcionando.

## Conferência e atendimento

`access_resend_requests` guarda hashes HMAC de e-mail/IP, o ID do pedido e o resultado interno: `accepted`, `sent`, `skipped` ou `failed`. Nunca guarda link, senha, HOTTOK ou payload de compra. A retenção dos registros é de 30 dias. O `request_key` permite relacionar o resultado ao `id_envio` do contato, sem copiar seus dados pessoais para a tabela de controle.

- `sent`: o serviço de autenticação aceitou o envio. Isso não comprova entrega na caixa de entrada.
- `skipped`: não havia acesso elegível; conferir e-mail da compra, matrícula, curso, bloqueio e processamento do webhook antes de qualquer concessão.
- `failed`: falha no envio/consulta. Conferir os logs do Auth/SMTP; não liberar acesso em razão do formulário.
- `accepted` antigo: a etapa posterior à resposta pode ter sido interrompida; investigar antes de reenviar. Um novo pedido fica sujeito aos mesmos limites de frequência.

O fluxo não realiza varredura automática nem envia mensagens em massa aos contatos antigos. Testes em produção devem usar endereço fictício sem matrícula (sem envio) ou endereço de teste indicado pelo proprietário. Não usar contas reais de alunos para testes de e-mail.

Validação: suíte de testes, TypeScript, build Next.js, migração PostgreSQL real em PGlite, RPC e permissões no banco publicado; conferir pedido fictício com resultado `skipped`, deduplicação e preflight CORS em produção.
