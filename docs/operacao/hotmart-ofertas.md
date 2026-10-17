# Hotmart: liberação por oferta ("curso apenas" x "curso + SGA")

## Como funciona

- Cada produto Hotmart mapeado tem uma política de oferta:
  - **Aceitar qualquer oferta** (`any`, padrão e comportamento anterior).
  - **Exigir oferta autorizada** (`authorized_offers`): só ofertas cadastradas com "Libera acesso" criam direito.
    **Lista vazia não significa "qualquer oferta"**: nenhuma compra libera acesso até existir uma oferta liberadora.
- O código da oferta é lido de `data.purchase.offer.code` no Webhook 2.0.0 (o mesmo valor do `off=` do checkout).
  `src`, `sck`, `bid` e outros parâmetros nunca são usados.
- Oferta "curso apenas", oferta desconhecida ou evento sem oferta: o evento fica como **ignorado** com o motivo,
  sem convite, sem conta, sem matrícula. Aparece em *Configurações → Integração Hotmart → Eventos recentes recebidos*.
- Eventos posteriores sem oferta (atraso, reembolso, reaprovação) da mesma transação seguem o vínculo já registrado,
  desde que a transação tenha sido criada por uma oferta liberadora. Reembolso/cancelamento/chargeback revogam
  somente o direito daquela transação. Concessões manuais e bloqueios administrativos não mudam.

## Configuração do curso fec9bb24-aaab-41ce-a98b-a039c3905ee2

1. Aplicar a migração `20261009000200_hotmart_offer_authorization.sql` **antes** do deploy.
2. No admin do curso → Configurações → Integração Hotmart:
   - cadastrar o produto pelo **ucode** (não usar `T70472489M`, que é o código do checkout, sem confirmação);
   - ativar **Exigir oferta autorizada**;
   - adicionar `4e4p713s` (ou colar `https://pay.hotmart.com/T70472489M?off=4e4p713s`) como **Libera acesso**;
   - adicionar `qkpqg5ea` como **Não libera (curso apenas)**.
3. Na Hotmart (Ferramentas → Webhook): URL `https://mentoria.cursoprofericklima.com.br/api/webhooks/hotmart`,
   versão 2.0.0, eventos de compra aprovada, atrasada, reembolsada, chargeback, cancelada e expirada,
   produto do curso. O HOTTOK deve ser o mesmo de `HOTMART_HOTTOK` na Vercel.
4. Usar o envio de teste da Hotmart e conferir em "Eventos recentes recebidos" que a coluna **Oferta**
   mostra o código. Só então considerar a integração pronta.

## Reenvio do primeiro acesso

- Página pública `/auth/reenviar-acesso` (link no login).
- Envia o link somente se o e-mail já pertence a um **aluno** com matrícula **ativa** em curso publicado e sem bloqueio.
- Resposta sempre genérica; a verificação e o envio acontecem após a resposta.
- Limites por hora: 3 por e-mail, 10 por IP, 120 no total. Guarda apenas hashes HMAC por 30 dias.
- Não cria conta, matrícula ou papel; nenhuma senha muda até o titular abrir o link no próprio e-mail.
- Opcional: `ACCESS_RESEND_HASH_SECRET` (server-only). Sem ela, a chave do HMAC é a service role.
- O Supabase limita e-mails do SMTP padrão; para volume real, configurar SMTP próprio em Auth → SMTP.

## Texto para a trilha da Hotmart

> **Acesse o Sistema Guiado da Aprovação**
> Entre em https://mentoria.cursoprofericklima.com.br/auth/login com o mesmo e-mail da compra.
> No primeiro acesso, use o link enviado por e-mail para definir sua senha.
> Não recebeu? Peça um novo link em https://mentoria.cursoprofericklima.com.br/auth/reenviar-acesso

## Diagnóstico de origem das matrículas

`diagnostico-origem-matriculas.sql` é somente leitura. Nenhuma matrícula deve ser revogada em massa por falta de oferta.
