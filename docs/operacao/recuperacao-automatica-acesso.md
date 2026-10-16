# Recuperação automática de acesso

O formulário em `https://sg-diagnostico.vercel.app/` registra nome, WhatsApp e e-mail no banco de contatos e solicita à plataforma o reenvio para o próprio e-mail informado. Nenhum curso, papel ou destinatário alternativo é aceito.

## Caminho do pedido

1. O navegador grava os contatos no banco privado do diagnóstico.
2. Chama `POST /api/access/request` no próprio diagnóstico. O servidor confere o contato salvo para o ID e encaminha somente `email` e `request_id` (UUID do envio) à rota da plataforma. Cookies, tokens e credenciais não são encaminhados. Esse caminho evita depender de chamadas entre domínios pelo navegador.
3. A plataforma reserva o pedido no banco de forma atômica. O mesmo ID nunca dispara dois envios. Aplicam-se 3 pedidos/e-mail, 10/IP e 120 globais por hora, compartilhados com `/auth/reenviar-acesso`.
4. Retorna `202 accepted`, igual para alunos e pessoas sem acesso. Isso confirma registro, não entrega de e-mail.
5. Após a resposta, verifica conta de aluno, matrícula ativa em curso publicado e ausência de bloqueio administrativo. Se não houver acesso, consulta a API Hotmart por esse mesmo e-mail, desde o início do histórico, com paginação limitada e prazo total de 40 segundos. Aceita somente `APPROVED`/`COMPLETE` de pagamento único, com comprador e data de aprovação válidos.
6. Resolve o ID numérico do produto pelo catálogo oficial para obter o `ucode`. Confere o mapeamento ativo para curso publicado e a oferta autorizada. Reconsulta cada transação antes da gravação; se mudou de comprador, produto, oferta, aprovação ou status, não libera.
7. Usa o mesmo processador comercial do webhook, com ID `sales-api:<transação>:<data de aprovação>`, preservando a data **original** da aprovação. A data da consulta nunca substitui o watermark comercial: um reembolso recebido durante a recuperação vence a aprovação antiga. Os eventos de recuperação aparecem no histórico administrativo com esse prefixo; nunca fingem ser eventos entregues pela Hotmart.
8. Cria a conta, quando ausente, sem senha e sem envio antecipado. Revalida o acesso efetivo no banco após reconciliar a matrícula e envia um único e-mail de recuperação ao próprio comprador. A pessoa confirma o e-mail e define a senha ao abrir o link. Falhas ficam como `failed`; não provocam concessão manual.

O webhook continua mantendo o direito comercial. A recuperação agora pode criar a conta e restaurar uma matrícula ausente mediante prova obtida exclusivamente da API Hotmart. Não remove bloqueios, não promove administradores, não aceita curso ou transação do formulário e não sobrescreve eventos comerciais mais recentes. Concessões manuais válidas são preservadas e continuam permitindo reenvio mesmo se a API Hotmart estiver indisponível.

Assinaturas recorrentes não são provisionadas por essa consulta de vendas: uma parcela antiga aprovada não comprova assinatura vigente. Elas continuam dependendo do fluxo comercial já existente ou de atendimento até haver integração específica da situação da assinatura. Compras anteriores a 2020, catálogo sem identidade inequívoca, oferta ausente/restrita e histórico acima dos limites também exigem revisão, sem liberação automática. Uma transação já revogada/suspensa por evento posterior nunca é reativada só porque uma aprovação antiga consta na consulta.

## Banco e implantação

Aplicar `20261015192149_atomic_access_recovery.sql` **antes** da publicação. A migração adiciona somente `request_key` e a RPC `reserve_access_resend`, executável exclusivamente por `service_role`. Nenhuma conta, compra, senha ou matrícula é alterada pela migração.

Continuam as mesmas variáveis `SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`. Não copiar a chave administrativa da plataforma para o diagnóstico. O CORS aceita somente o site do diagnóstico e o `SITE_URL` da plataforma. A CSP do diagnóstico permite conexões somente à própria origem. O diagnóstico também aplica limite de 10 encaminhamentos por IP/hora. No serviço central, o IP observado pode ser o do servidor/proxy; o limite central de 10/IP/hora é conservador e pode agrupar solicitantes. Para volume maior, dimensionar esse limite junto ao limite do SMTP, sem remover os controles por e-mail e globais.

Publicar primeiro a plataforma, verificar `OPTIONS /api/access/request`, depois publicar o diagnóstico. A opção já existente `/auth/reenviar-acesso` continua funcionando.

### Credenciais da consulta de compras

O `HOTMART_HOTTOK` valida apenas o webhook; não dá acesso ao histórico de vendas.
Na conta produtora Hotmart, em **Ferramentas → Credenciais Developers**, criar uma credencial de **produção**, com acesso à consulta de vendas e produtos. Não usar sandbox para consultar compras reais.
Cadastrar diretamente como segredos de **Production**, somente no projeto Vercel `plataforma-metas`:

- `HOTMART_CLIENT_ID`: campo Client ID da credencial.
- `HOTMART_CLIENT_SECRET`: campo Client Secret.
- `HOTMART_BASIC`: token Basic, com ou sem prefixo `Basic `.

Não colar credenciais em chats, commits ou no projeto diagnóstico. Depois de salvar, republicar a plataforma: variáveis novas só entram em uma implantação nova. A aplicação obtém o bearer token no servidor, guarda somente em memória e renova uma vez em HTTP 401. Ausência de credenciais ou falha de API deixa o pedido como `failed`, sem criar matrícula.

Referências oficiais: [autenticação Hotmart](https://developers.hotmart.com/docs/pt-BR/start/app-auth/), [histórico de vendas](https://developers.hotmart.com/docs/en/v1/sales/sales-history/), [catálogo de produtos](https://developers.hotmart.com/docs/en/v1/product/product-list/).

## Conferência e atendimento

`access_resend_requests` guarda hashes HMAC de e-mail/IP, o ID do pedido e o resultado interno: `accepted`, `sent`, `skipped` ou `failed`. Nunca guarda link, senha, HOTTOK ou payload de compra. A retenção dos registros é de 30 dias. O `request_key` permite relacionar o resultado ao `id_envio` do contato, sem copiar seus dados pessoais para a tabela de controle.

- `sent`: o serviço de autenticação aceitou o envio. Isso não comprova entrega na caixa de entrada.
- `skipped`: não havia acesso elegível após a consulta; conferir e-mail exato da compra, status, produto/oferta, matrícula, publicação do curso e bloqueio antes de qualquer concessão.
- `failed`: falha no envio/consulta/configuração. Conferir logs de servidor `hotmart.access_recovery_failed` (somente código técnico, sem e-mail, respostas ou segredo) e Auth/SMTP. `hotmart_not_configured` indica credenciais ausentes; `hotmart_auth_failed` indica falha de autenticação; `hotmart_query_failed` inclui permissão insuficiente, limite ou erro de API. Não liberar acesso em razão do formulário.
- `accepted` antigo: a etapa posterior à resposta pode ter sido interrompida; investigar antes de reenviar. Um novo pedido fica sujeito aos mesmos limites de frequência.

O fluxo não realiza varredura automática nem envia mensagens em massa aos contatos antigos. Testes em produção devem usar endereço fictício sem matrícula (sem envio) ou endereço de teste indicado pelo proprietário. Não usar contas reais de alunos para testes de e-mail.

Validação: suíte de testes, TypeScript, build Next.js, migração PostgreSQL real em PGlite, RPC e permissões no banco publicado; conferir pedido fictício com resultado `skipped`, deduplicação e preflight CORS em produção.
