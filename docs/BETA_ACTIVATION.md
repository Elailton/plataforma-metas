# Ativação do beta

Este é o checklist operacional para ativar a Mentoria Imparáveis preservando o administrador, o aluno de teste e todo o progresso existente.

## Regra de acesso

- `enrollments` é o acesso efetivo que o aplicativo consulta.
- `hotmart_entitlements` guarda um direito comercial por `purchase.transaction`.
- `manual_course_grants` guarda a concessão administrativa independente.
- Uma concessão manual ativa ou ao menos um entitlement ativo mantém a matrícula `active`.
- Sem direito ativo, mas com algum direito suspenso, a matrícula fica `suspended`.
- Sem direito ativo ou suspenso, a matrícula fica `revoked`.
- Nenhuma reconciliação apaga matrícula, usuário ou progresso.

## Ordem segura de ativação

1. Fazer backup do projeto Supabase e registrar o SHA atualmente em produção.
2. Aplicar as migrations, em ordem, inclusive `20260901000300_hotmart_entitlements.sql`.
3. Configurar Auth, URLs e SMTP no Supabase.
4. Configurar as variáveis de produção na Vercel e fazer o deploy.
5. Validar o beta pela matrícula manual preservada.
6. Somente depois cadastrar o HOTTOK e ativar a configuração de Webhook na Hotmart.

## Banco e migration nova

A migration `supabase/migrations/20260901000300_hotmart_entitlements.sql` é aditiva. Ela:

- cria `hotmart_entitlements` com `transaction` única;
- cria `manual_course_grants` e copia as matrículas manuais existentes; se nunca houve uma compra aprovada processada, preserva todas as matrículas anteriores como concessões beta, inclusive o aluno de teste legado;
- cria a reconciliação atômica do acesso efetivo;
- substitui a função de matrícula manual para usar a concessão independente;
- habilita RLS nas novas tabelas;
- permite leitura comercial somente a administradores e escrita somente via servidor/RPC protegida.

Ela não limpa nem recria `auth.users`, `profiles`, `enrollments`, cursos, metas, materiais ou `student_goal_item_completions`.

Depois de aplicar, confirme no Supabase SQL Editor:

```sql
select to_regclass('public.hotmart_entitlements') as entitlements,
       to_regclass('public.manual_course_grants') as manual_grants;

select id, role
from public.profiles
where role in ('admin', 'student');

select user_id, course_id, status, source
from public.enrollments
order by enrolled_at;
```

## Variáveis na Vercel

Cadastre em **Project Settings → Environment Variables**, no mínimo para **Production**, e faça um novo deploy:

| Variável | Valor |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | chave pública/anon do projeto |
| `SUPABASE_SERVICE_ROLE_KEY` | chave service role/secret, somente servidor |
| `HOTMART_HOTTOK` | HOTTOK copiado da aba Autenticação do Webhook Hotmart |
| `SITE_URL` | `https://mentoriaimparaveis.vercel.app` |

Nunca use prefixo `NEXT_PUBLIC_` no HOTTOK ou na chave service role. Não registre esses valores em logs, screenshots ou commits.

Enquanto a Hotmart não estiver pronta, `HOTMART_HOTTOK` pode permanecer ausente; o endpoint responderá `503` sem alterar dados. Para ativar a integração, a variável passa a ser obrigatória.

## Configuração no Supabase

1. Em **Authentication → URL Configuration**, defina **Site URL** como `https://mentoriaimparaveis.vercel.app`.
2. Em **Redirect URLs**, permita `https://mentoriaimparaveis.vercel.app/auth/confirm` e, se a tela exigir o caminho completo usado pelo convite, `https://mentoriaimparaveis.vercel.app/**`.
3. Em **Authentication → Providers → Email**, mantenha login por e-mail/senha e desative **Allow new users to sign up**. Os convites administrativos continuam sendo feitos pelo servidor.
4. Em **Authentication → Emails → SMTP Settings**, configure SMTP próprio antes do beta com compradores reais. O SMTP padrão do Supabase é apenas para testes limitados e não entrega convites para qualquer endereço.
5. Em **Authentication → Email Templates → Invite user**, substitua o link padrão pelo fluxo SSR baseado em `token_hash` (o fragmento `#access_token=...` do fluxo implícito nunca chega a um Route Handler). Use exatamente:

   ```html
   <h2>Você foi convidado</h2>

   <p>Siga o link abaixo para definir sua senha e acessar a plataforma:</p>
   <p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/auth/primeiro-acesso">Aceitar convite</a></p>
   ```

   O endpoint `/auth/confirm` só aceita `type=invite` e só redireciona para `/auth/primeiro-acesso` (lista fechada, sem open redirect). Não é necessário alterar mais nada no restante do template.
6. Não altere a função/trigger que cria novos perfis como `student` e não promova papel por metadata.

Referências: [URLs de redirecionamento](https://supabase.com/docs/guides/auth/redirect-urls), [convites](https://supabase.com/docs/guides/auth/users#inviting-users) e [SMTP próprio](https://supabase.com/docs/guides/auth/auth-smtp).

## Preparação do curso e do aluno de teste

1. Entre com o administrador existente.
2. Abra ou crie a GMF.
3. Cadastre disciplinas, tópicos, materiais e ao menos uma meta publicada.
4. Publique o curso.
5. Em **Curso → Alunos**, informe o e-mail da conta de aluno de teste existente e selecione **Liberar acesso**.
6. Confirme que a matrícula GMF está `active`.
7. Entre com o aluno, conclua um item, atualize a página e confirme a persistência.

A matrícula manual não cria conta, não muda senha e não aceita administrador. Um futuro reembolso Hotmart da GMF não remove essa concessão manual.

## Valores que precisam vir da Hotmart

São necessários:

- o HOTTOK único da conta, em **Ferramentas → Webhook (API e notificações) → Autenticação**;
- o `data.product.ucode` de cada produto/oferta que deve liberar um curso;
- opcionalmente `data.product.id` e o nome, apenas para identificação administrativa.

Não são necessárias credenciais OAuth da API Hotmart para receber o webhook. O HOTTOK é enviado no header `X-HOTMART-HOTTOK`.

O `product.ucode` pode ser obtido no payload de um teste/histórico do Webhook, no campo `data.product.ucode`, ou pela API **Obter Produtos**. O identificador principal é o UUID `ucode`; o ID numérico é apenas auxiliar. Referências: [Webhook de compras 2.0.0](https://developers.hotmart.com/docs/pt-BR/2.0.0/webhook/purchase-webhook/) e [Obter Produtos](https://developers.hotmart.com/docs/pt-BR/v1/product/product-list/).

Depois de obtê-lo, cadastre no aplicativo em **Admin → Cursos → GMF (ou PRF) → Configurações → Integração Hotmart**. Cada produto fica vinculado a exatamente um curso; vários produtos podem apontar para o mesmo curso.

## Configuração do Webhook Hotmart

Na Hotmart:

1. Acesse **Ferramentas → Ver todas → Webhook (API e notificações)**.
2. Selecione **Cadastrar Webhook**.
3. Dê um nome, como `Mentoria Imparáveis - Produção`.
4. Associe os produtos desejados, ou todos os produtos se os mapeamentos no Admin já estiverem completos.
5. Selecione a versão **2.0.0**.
6. Informe a URL `https://mentoriaimparaveis.vercel.app/api/webhooks/hotmart`.
7. Selecione estes eventos:
   - Compra aprovada — `PURCHASE_APPROVED`;
   - Compra atrasada — `PURCHASE_DELAYED`;
   - Compra reembolsada — `PURCHASE_REFUNDED`;
   - Chargeback — `PURCHASE_CHARGEBACK`;
   - Compra cancelada — `PURCHASE_CANCELED`;
   - Compra expirada — `PURCHASE_EXPIRED`.
8. Salve e confirme que a configuração ficou ativa.

A Hotmart documenta que posts com erro podem ser reenviados e que uma configuração com URL falhando pode ser desativada. A idempotência por `event.id` torna os reenvios seguros. Referência: [configuração e histórico de Webhooks](https://help.hotmart.com/pt-br/article/360001491352/como-configurar-a-api-do-meu-produto-usando-o-webhook-postback-).

## Teste sem compra real

1. Faça o deploy e aplique a migration antes do teste.
2. Na tela de Webhook, abra **Minhas configurações**.
3. No lado direito da configuração, clique no ícone de lista/Teste indicado pela Hotmart.
4. Execute primeiro um `PURCHASE_APPROVED` para o produto configurado.
5. Se a tela permitir editar o comprador, use o e-mail da conta de aluno de teste preservada. Não use o e-mail do administrador.
6. O teste deve retornar HTTP `200` e aparecer na aba **Histórico**. Abra o Payload e o Histórico de Responses para conferir `id`, `creation_date`, `data.product.ucode`, `data.purchase.transaction` e a resposta do endpoint.

Se o Teste usar comprador fictício e não permitir editar o e-mail, ele valida entrega, HOTTOK e mapeamento, mas poderá criar um usuário de teste quando o produto estiver mapeado. Para validar apenas conectividade sem criar convite, rode a primeira vez antes de cadastrar aquele `product.ucode`: o evento ficará `ignored`. Copie o `ucode`, cadastre-o no Admin e repita conscientemente.

O botão Teste pode gerar uma transação sintética nova para cada envio. Nesse caso ele não simula com fidelidade a sequência aprovação → reembolso da **mesma** transação; essa reconciliação é coberta pelos testes automatizados. Não altere manualmente uma transação real no banco.

## Como verificar o resultado

No Admin:

1. Abra o curso mapeado e confirme a integração ativa.
2. Em **Alunos**, confirme que o aluno aparece com acesso ativo.
3. Entre com o aluno e confirme que apenas cursos `published` com matrícula `active` aparecem.

No Supabase SQL Editor, substitua `HP...` pela transação do payload de teste:

```sql
select transaction, product_ucode, product_id, buyer_ucode, status,
       last_event_id, last_event_creation_date
from public.hotmart_entitlements
where transaction = 'HP...';

select hotmart_event_id, event_type, transaction, product_ucode,
       processing_status, processed_at, error_message
from public.hotmart_webhook_events
where transaction = 'HP...'
order by created_at desc;

select user_id, course_id, status, source, updated_at
from public.enrollments
where user_id = (
  select public.find_auth_user_id_by_email('aluno@teste.com')
);

select user_id, course_id, status
from public.manual_course_grants
where user_id = (
  select public.find_auth_user_id_by_email('aluno@teste.com')
);
```

O resultado esperado para aprovação é entitlement `active`, evento `processed` e matrícula `active`. Produto não mapeado deve produzir evento `ignored` e nenhum entitlement/matrícula novo. Evento antigo da mesma transação deve ficar `ignored` sem regredir o entitlement.

## Rollback seguro

Se algo falhar:

1. Desative a configuração do Webhook na Hotmart para interromper novos eventos.
2. Na Vercel, faça rollback para o deployment/commit anterior.
3. Não apague tabelas, contas, matrículas, entitlements ou progresso.
4. Preserve `hotmart_webhook_events` e `hotmart_entitlements` para auditoria.
5. Corrija e reaplique o código; eventos `failed` podem ser reenviados com segurança, enquanto `processed`/`ignored` não rodam novamente.

Como a migration é aditiva, o rollback de código anterior pode conviver com as tabelas novas. Se for indispensável desfazer também o banco, restaure o backup/PITR criado antes da migration em uma janela controlada. Não use `drop table` como rollback em produção, pois isso destruiria o histórico comercial.

## Validação técnica

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm exec tsc --noEmit
pnpm build
```

Depois faça o teste manual: login Admin, criação/publicação de conteúdo, concessão manual GMF, login do aluno, conclusão e recarga de item, suspensão/reativação manual e reaparecimento do progresso.
