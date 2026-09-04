# AGENTS.md

## Objetivo do produto

Este repositório implementa uma plataforma reutilizável de mentoria e acompanhamento de metas para concursos públicos.

A plataforma não cria metas por IA. O mentor ou administrador cria manualmente cursos, editais, materiais, metas e itens de meta. O sistema transforma esses dados em uma experiência interativa para o aluno.

Nunca implemente regras, dados ou componentes específicos para PRF, GMF, PPCE ou qualquer concurso concreto. Toda funcionalidade de curso deve ser orientada por `courseId`.

## Stack

- Next.js
- TypeScript
- Supabase Auth e Postgres
- Vercel
- GitHub

## Áreas do produto

Área do aluno:

- Início
- Minhas Metas
- Edital
- Meu Progresso
- Minha Conta

Área administrativa:

- Dashboard
- Cursos
- Visão geral do curso
- Edital
- Metas
- Materiais
- Alunos
- Configurações
- Integração Hotmart

Não altere a navegação ou a interface além do necessário para a tarefa solicitada.

## Modelo de pessoas e matrículas

`profiles` representa a pessoa e nunca deve representar sua matrícula.

Uma pessoa pode possuir vários cursos usando:

`profiles -> enrollments -> courses`

A tabela `enrollments` possui:

- `id`
- `user_id`
- `course_id`
- `status`
- `source`
- `enrolled_at`
- `updated_at`

Status permitidos:

- `active`
- `suspended`
- `revoked`

Fontes permitidas:

- `hotmart`
- `manual` para concessões administrativas independentes, preservadas mesmo com a integração comercial ativa

### Direitos independentes e bloqueio administrativo por curso

A matrícula é o acesso efetivo, não a origem única desse acesso. Preserve os direitos
por transação em `hotmart_entitlements` e as concessões em `manual_course_grants`.
Revogar uma concessão manual não revoga uma compra válida, nem o contrário.

`course_access_blocks` registra cada bloqueio administrativo por aluno/curso, com
motivo, administrador e data; o desbloqueio fecha o registro sem apagar o histórico.
Um bloqueio aberto tem prioridade sobre todos os direitos: a matrícula fica
`suspended`, inclusive após novos eventos Hotmart ou concessões manuais.
Desbloquear não cria direito: reconciliar novamente as compras/concessões existentes.
Outros cursos, conta e progresso nunca são afetados pelo bloqueio de um curso.

O painel deve separar acesso efetivo, concessão manual, compras e bloqueio. Mensagens
de sucesso devem usar o estado efetivo retornado pelo banco, não só a ação solicitada.
Motivos são privados do administrador. Escritas ocorrem somente pela RPC protegida.
Operações concorrentes devem obter o advisory lock aluno/curso antes de escrever
matrícula, concessão, bloqueio ou entitlement. Testar RLS e SQL real em banco descartável.

Deve existir uma única matrícula por par `(user_id, course_id)`.

Não reintroduza `profiles.course_id`. Consultas, contadores, autorização e interface devem usar `enrollments`.

## Autenticação e acesso

Não existe cadastro público de aluno ou administrador.

O login deve informar que o acesso é liberado para alunos matriculados e que deve ser usado o mesmo e-mail da compra.

Regras obrigatórias:

- nunca permitir escolha pública de papel;
- nunca permitir criação pública de administrador;
- nunca permitir escolha pública de curso;
- alunos sem matrícula ativa não acessam `/aluno`;
- somente administradores acessam `/admin`;
- não confiar apenas na interface ou no middleware;
- validar autorização e IDs novamente no servidor;
- nunca confiar em `role` recebido por metadata pública;
- uma compra nunca pode promover ou transformar uma conta em administrador.

## Integração Hotmart

A Hotmart libera acesso automaticamente após uma compra aprovada.

Fluxo principal:

1. receber `POST /api/webhooks/hotmart`;
2. validar o header `X-HOTMART-HOTTOK`;
3. aceitar somente payload Webhook 2.0.0 válido;
4. normalizar o e-mail do comprador;
5. localizar o curso por `data.product.ucode`;
6. localizar ou convidar o usuário pelo e-mail;
7. garantir um perfil `student`;
8. atualizar o direito por transação e reconciliar a matrícula, respeitando o bloqueio administrativo;
9. registrar o processamento idempotente do evento.

Use `product.ucode` como identificador principal. Não hardcode produtos Hotmart. Vários produtos podem liberar o mesmo curso.

O mapeamento é armazenado em `hotmart_product_mappings` e administrado dentro das configurações de cada curso.

Eventos e efeitos sobre o direito comercial (a matrícula é reconciliada separadamente):

- `PURCHASE_APPROVED` -> entitlement `active`;
- `PURCHASE_DELAYED` -> entitlement `suspended`;
- `PURCHASE_REFUNDED` -> entitlement `revoked`;
- `PURCHASE_CHARGEBACK` -> entitlement `revoked`;
- `PURCHASE_CANCELED` -> entitlement `revoked`;
- `PURCHASE_EXPIRED` -> entitlement `revoked`.

Uma nova aprovação reativa o direito comercial, mas nunca remove um bloqueio administrativo. Reembolso, cancelamento ou chargeback nunca apagam usuário, perfil, matrícula ou histórico de progresso.

## Idempotência do webhook

Cada evento Hotmart possui um `id` único e deve ser registrado em `hotmart_webhook_events`.

Não processe novamente eventos concluídos ou ignorados. Eventos com falha podem ser tentados novamente. Eventos presos em processamento devem possuir uma estratégia de recuperação segura.

Nunca registre payload completo, tokens, documentos, endereços ou outros dados pessoais desnecessários.

## Segredos e clientes Supabase

Segredos são exclusivamente server-side:

- `SUPABASE_SERVICE_ROLE_KEY`
- `HOTMART_HOTTOK`
- `SITE_URL`

Nunca use prefixo `NEXT_PUBLIC_` em segredos.

O cliente com `service_role`:

- deve permanecer em módulo com `server-only`;
- nunca pode ser importado por Client Components;
- deve ser usado apenas em operações administrativas internas, como o webhook;
- nunca pode ser exposto ao navegador ou retornado em respostas.

## RLS e autorização

RLS é a barreira definitiva de acesso.

Um aluno pode:

- ler o próprio perfil;
- ler as próprias matrículas;
- acessar somente cursos com matrícula `active`;
- acessar disciplinas, tópicos, materiais, metas e itens pertencentes a cursos com matrícula `active`.

Um administrador pode gerenciar os dados administrativos mediante papel validado no banco.

Ao criar ou alterar políticas:

- remova políticas permissivas legadas incompatíveis;
- evite recursão entre políticas;
- use funções `security definer` pequenas, com `search_path` restrito, quando necessário;
- não conceda funções internas de Auth a `anon` ou `authenticated`;
- preserve o bypass de RLS exclusivamente para `service_role`;
- valide relacionamentos entre curso, disciplina, tópico, material, meta e item no servidor.

## Metas e progresso

Uma meta possui vários itens.

Cada item pode possuir:

- disciplina;
- tópico do edital;
- orientação;
- quantidade sugerida de questões;
- materiais vinculados.

Materiais são recursos e não representam progresso.

O aluno marca apenas o item como concluído. O progresso da meta é:

`itens concluídos / total de itens`

Um item concluído pode marcar seu `syllabus_topic` como estudado. O mesmo tópico deve contar apenas uma vez no percentual do edital, mesmo quando aparece em várias metas.

O usuário ampliou o escopo do beta em 1º de setembro de 2026. O progresso real e persistente dos itens e do edital faz parte da experiência do aluno.

As contas existentes de um administrador e de um aluno de teste são dados protegidos. Nunca as exclua, recrie ou altere suas senhas. O aluno de teste deve receber acesso somente aos cursos atribuídos por matrícula ativa; inicialmente, apenas o curso GMF existente no banco.

## Escopo atual

O escopo atualmente autorizado inclui:

- arquitetura multi-curso por `enrollments`;
- remoção do cadastro público;
- mapeamento produto Hotmart para curso;
- webhook Hotmart seguro;
- provisionamento e convite de usuário;
- suspensão, revogação e reativação de matrícula;
- RLS e autorização compatíveis;
- testes para múltiplos cursos no mesmo e-mail.
- progresso persistente por item de meta;
- seleção independente entre vários cursos ativos;
- matrícula manual administrativa de contas de aluno existentes durante o beta.

Fora de escopo até solicitação explícita:

- IA para criar metas;
- ranking;
- gamificação;
- simulados;
- funcionalidades específicas de um concurso;
- grandes reformulações visuais.

## Forma de trabalhar

Antes de modificar arquivos:

1. inspecione o estado atual do repositório;
2. identifique migrações, autenticação, RLS e usos de `courseId`;
3. procure referências legadas a `profiles.course_id`;
4. proponha um plano de implementação;
5. trabalhe em branch separada.

Durante a implementação:

- preserve alterações existentes não relacionadas;
- faça mudanças pequenas e coerentes com o escopo;
- prefira lógica de domínio testável separada de Next.js e Supabase;
- trate entradas externas como não confiáveis;
- mantenha operações idempotentes;
- não envie ou armazene senhas em texto simples;
- não apague histórico por mudança de status da compra.

## Validação mínima

Antes de concluir uma alteração relevante, execute:

```bash
pnpm test
pnpm exec tsc --noEmit
pnpm build
```

O conjunto de testes deve cobrir, quando aplicável:

- mesmo e-mail com vários cursos;
- uma única conta para o mesmo e-mail normalizado;
- idempotência do evento;
- aprovação, atraso, reaprovação e revogação;
- impossibilidade de o webhook criar ou matricular administradores;
- bloqueio de acesso sem matrícula ativa.

Confirme também que:

- não existem links ou páginas de cadastro público;
- não existem usos funcionais de `profiles.course_id`;
- `service_role` e HOTTOK não aparecem em código de navegador;
- a migração é aplicável antes do deploy;
- nenhuma funcionalidade fora do escopo foi adicionada.
