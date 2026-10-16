# Reenvio de acesso e atendimento

## Fluxo atual

O formulário https://sg-diagnostico.vercel.app/ registra nome, e-mail e WhatsApp e pede o reenvio à plataforma. O servidor considera somente contas de aluno com matrícula ativa em curso publicado e sem bloqueio administrativo. Ter grupo atribuído ou ter concluído o primeiro acesso não é requisito para receber o e-mail.

O formulário e a opção Reenviar acesso do login não consultam vendas na API Hotmart, não criam contas ou matrículas, não atribuem grupo e não reativam acesso suspenso/revogado. Quem não tem matrícula ou não recebe as instruções encontra o atendimento em https://wa.me/5585996885832, telefone +55 (85) 99688-5832. O link abre a conversa; o site não envia mensagens de WhatsApp automaticamente.

A matrícula de uma compra continua sendo criada pelo webhook Hotmart existente, respeitando produto, oferta, idempotência e bloqueios. Uma compra que não gerou matrícula é conferida pela atendente. Aluno matriculado sem grupo mantém essa condição até concluir o questionário ou receber uma atribuição administrativa.

## Caminho técnico

1. O navegador salva o contato no banco privado do diagnóstico.
2. O servidor do diagnóstico valida se o e-mail corresponde ao ID salvo e encaminha somente e-mail e request_id à plataforma, sem cookies ou credenciais.
3. A plataforma reserva a tentativa de forma atômica: mesmo ID não dispara dois envios; limites de 3/e-mail, 10/IP e 120 globais por hora.
4. Retorna 202 genérico. Não revela publicamente se a conta existe e não comprova entrega na caixa de entrada.
5. Após responder, verifica perfil, matrícula ativa, publicação do curso e bloqueios. Grupo não entra nessa consulta. Envia somente ao e-mail da própria conta.
6. Sem acesso elegível, registra skipped. O WhatsApp do suporte está disponível em todas as respostas públicas, no diagnóstico, no login e na tela sem acesso.

## Opções do login

- Reenviar acesso: confere uma matrícula existente e pede um novo e-mail, sujeito aos limites.
- Tenho um código: valida o código numérico do e-mail de convite ou recuperação no Supabase Auth e encaminha para criar a senha. Não consulta compras nem cria matrícula. E-mail malformado, código inválido/expirado, falha de rede e excesso de tentativas exibem aviso sem deixar o botão preso.
- Continuar, no link do e-mail: confirma o token somente após o clique da pessoa, preservando-o contra verificadores automáticos de links. Aceita apenas invite/recovery e destino interno de primeiro acesso.

## Operação

access_resend_requests guarda hashes HMAC de e-mail/IP, request_key e outcome, com retenção de 30 dias. sent significa aceite pelo serviço de autenticação; skipped significa ausência de acesso elegível; limited significa limite de frequência/SMTP; failed significa falha interna ou de envio. Nunca conceder matrícula com base apenas no preenchimento do formulário.

As credenciais da API de vendas que já estejam na Vercel não são necessárias para esse fluxo. Os módulos de consulta comercial antigos permanecem como referência interna, sem importação pelo reenvio público. O HOTTOK do webhook e as credenciais Supabase existentes continuam necessários. Nenhum segredo é copiado para o diagnóstico.

Validação: testes do reenvio com o repositório real simulando aluno sem grupo, ausência de matrícula, administrador, bloqueio e curso não publicado; testes da tela de código; suíte PostgreSQL de autorização; TypeScript e build Next.js. Em produção, usar somente pedido fictício sem matrícula para conferir skipped sem enviar mensagens a alunos.
