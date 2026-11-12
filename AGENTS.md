# AGENTS.md

> **AI Memory — qualquer IA começa por [`docs/ia/00-comece-aqui.md`](docs/ia/00-comece-aqui.md).**
> Lá estão a identidade do assistente, a ordem de leitura, o protocolo de cada sessão e os acessos.
> Todos os fluxos (do curso novo ao e-mail de acesso): [`docs/ia/14-fluxos-ponta-a-ponta.md`](docs/ia/14-fluxos-ponta-a-ponta.md);
> receitas práticas: [`docs/ia/15-padroes-tecnicos.md`](docs/ia/15-padroes-tecnicos.md); skills em texto: [`docs/ia/skills/`](docs/ia/skills/).
> A integridade dessa memória é conferida no CI por `tests/ia-memory.test.mjs`.

> **Leia primeiro: o projeto está em produção, com alunos pagantes.**
> Antes de qualquer tarefa, leia a memória do projeto em [`docs/ia/`](docs/ia/README.md):
> regras invioláveis (`01-regras.md`), arquitetura e limites (`02`), dados pessoais (`03`),
> cursos e ofertas (`04`), procedimentos (`05`), decisões (`06`), incidentes (`07`) e
> pendências (`08`). Atualize essa memória no mesmo PR de qualquer mudança relevante.

## Regras de ouro (resumo de `docs/ia/01-regras.md`)

1. **Nada destrutivo no banco de produção.** Arquivar em vez de excluir; migrações
   aditivas, com reversão, revisadas e aplicadas pelo assistente responsável (Claude ou Codex), conforme autorização de 2026-11-11.
2. **Nada de e-mail em massa.** Resend gratuito: 100 e-mails/dia e 3.000/mês.
3. **Perguntar em qual grupo lançar** qualquer conteúdo ou função (1, 2, 3); lançar
   primeiro no Grupo 3. **Nunca mostrar o grupo ao aluno.**
4. **Nunca misturar cursos** e usar só questões reais de prova (inéditas só com
   autorização, marcadas com `[[inedita]]`).
5. **Mesclar/publicar sem perguntar o que o usuário pediu** (decisão de 2026-11-12), com CI `validate` verde; caminho de
   reversão sempre definido. **Toda mudança de código ou banco passa por revisão de segurança
   feita pelo assistente responsável antes do merge/aplicação** (regra esclarecida em 2026-11-11; `docs/ia/01-regras.md`, 4a).
6. **Dados pessoais no mínimo**: nada de CPF, endereço, telefone ou payload em banco,
   log ou repositório; resposta pública nunca revela se um e-mail tem conta ou compra.
7. **Nunca digitar senhas** nem trocar senhas/contas protegidas (admin e conta de teste).
8. Na dúvida, perguntar ao usuário.

---

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
matrícula, concessão, bloqueio ou entitlement associado a uma conta. No webhook,
obter primeiro o lock da transação e depois o do par aluno/curso; um entitlement
pendente sem conta usa somente o lock da transação. Testar RLS e SQL real em banco descartável.

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
- `PURCHASE_EXPIRED` -> entitlement `revoked`;
- `PURCHASE_COMPLETE` -> cria entitlement `active` **somente** se a oferta libera, o curso
  está mapeado e a transação não tem nenhum direito registrado (verificação atômica em
  `create_hotmart_entitlement_if_absent`). Nunca altera um direito existente.

Uma nova aprovação reativa o direito comercial, mas nunca remove um bloqueio administrativo. Reembolso, cancelamento ou chargeback nunca apagam usuário, perfil, matrícula ou histórico de progresso.

Eventos negativos anteriores à conta também devem persistir em `hotmart_entitlements`,
com `user_id = null`, sem e-mail ou payload. Nunca permitir `active` sem aluno.
Uma aprovação antiga/igual ao último `creation_date` é ignorada antes de convidar,
e a RPC verifica novamente atomicamente após eventual convite. Não reatribuir
transações de uma conta a outra. O e-mail normalizado continua identificando a conta.

## Idempotência do webhook

Cada evento Hotmart possui um `id` único e deve ser registrado em `hotmart_webhook_events`.

Não processe novamente eventos concluídos ou ignorados. Eventos com falha podem ser tentados novamente. Eventos presos em processamento devem possuir uma estratégia de recuperação segura.

Nunca registre payload completo, tokens, documentos, endereços ou outros dados pessoais desnecessários.

Exceção única (aprovada em 28/10/2026): `hotmart_webhook_events.buyer_email` guarda o
e-mail normalizado do comprador de eventos `PURCHASE_*` reais (nunca o envio de teste da
Hotmart). Finalidade: entregar o acesso comprado (reprocessar compras que chegaram antes
do cadastro do produto/oferta). Leitura só por `service_role` e administrador (RLS).
Retenção: o pg_cron anula o e-mail após 90 dias quando a transação não gerou direito
(`purge_stale_hotmart_buyer_emails`); a linha nunca é apagada. Exclusão a pedido do
titular: anular `buyer_email` daquele endereço. Nenhum outro dado do comprador é guardado.

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
- acessar somente cursos `published`, com matrícula `active` e sem bloqueio administrativo;
- acessar disciplinas, tópicos e materiais desses cursos; metas somente `published`, itens somente não arquivados.

Um administrador pode gerenciar os dados administrativos mediante papel validado no banco.

Ao criar ou alterar políticas:

- remova políticas permissivas legadas incompatíveis;
- evite recursão entre políticas;
- use funções `security definer` pequenas, com `search_path` restrito, quando necessário;
- não conceda funções internas de Auth a `anon` ou `authenticated`;
- preserve o bypass de RLS exclusivamente para `service_role`;
- valide relacionamentos entre curso, disciplina, tópico, material, meta e item no servidor.

## Metas e progresso

Regras de montagem (séries de aula inteiras, questões em toda meta, RLM com caderno,
lei seca a partir da Meta 08): `docs/ia/09-regras-metas.md`.
**Todo curso fecha o edital em 90 metas** (regra de 09/11/2026); para estruturar um curso novo,
seguir `docs/ia/10-prompt-mestre-cursos.md`.
Assunto que caiu na última prova recebe `syllabus_topics.last_exam = true` e o selo "Cobrado no último
concurso" no item da meta e no Edital (regra em `docs/ia/09-regras-metas.md`).
`goals.kind = 'reta_final'`: metas da reta final, fora de "Minhas Metas", na aba "Reta final" (`/aluno/reta-final`),
liberada 45 dias antes de `courses.exam_date` (o Grupo 3 vê antes para conferir); criadas à mão, marcadas pelo
interruptor "Reta final" da meta no admin.

Uma meta possui vários itens.

Cada item pode possuir:

- disciplina;
- tópico do edital;
- orientação;
- quantidade sugerida de questões;
- materiais vinculados.

Materiais são recursos e não representam progresso.

Salvar metas usa `admin_save_goal`, em uma transação, com versão `updated_at` e
IDs estáveis dos itens. Editar texto, questões, links e ordem preserva conclusões.
Remover itens ou trocar disciplina/tópico arquiva a identidade antiga; não apagar
conclusões nem transferi-las ao tópico novo. Itens arquivados ficam no histórico
do banco, fora do formulário/checklist e dos totais atuais. Não voltar ao padrão
delete/reinsert. Metas com histórico devem ser arquivadas, não excluídas.

O aluno marca apenas o item como concluído. O progresso da meta é:

`itens concluídos / total de itens`

Um item concluído pode marcar seu `syllabus_topic` como estudado. O mesmo tópico deve contar apenas uma vez no percentual do edital, mesmo quando aparece em várias metas.

O usuário ampliou o escopo do beta em 1º de setembro de 2026. O progresso real e persistente dos itens e do edital faz parte da experiência do aluno.

As contas existentes de um administrador e de um aluno de teste são dados protegidos. Nunca as exclua, recrie ou altere suas senhas. O aluno de teste deve receber acesso somente aos cursos atribuídos por matrícula ativa; inicialmente, apenas o curso GMF existente no banco.

## Grupos, lançamentos e avaliações (detalhe obrigatório em `docs/ia/16-grupos-e-avaliacoes.md`)

- Grupo 1 (todos os alunos; novos sempre aqui), Grupo 2 (encerrado para novos), Grupo 3 (só a conta de teste
  do administrador, espelha um grupo). `target_groups` decide quem vê; visibilidade decidida no banco.
- **Perguntar o grupo antes de lançar** qualquer conteúdo ou função; lançar primeiro no Grupo 3.
  **Nunca mostrar o grupo ao aluno.** Textos sempre positivos e aviso "O SGA foi atualizado".
- Funções por grupo em `course_group_settings` (aba some do menu quando desligada).
- Mini Simulados / Diagnóstico Semanal (a cada 7 metas, liberado ao concluir a meta que fecha o bloco),
  Simulado Geral (por data: 14 dias com edital aberto, 30 com fechado — perguntar) e Redação do Simulado
  Geral: correção só no banco, gabarito nunca vai ao navegador antes do envio, tentativas nunca apagadas.
  Regras completas, tabelas e RPCs no arquivo 16.

## Conferência das devolutivas de redação

Toda publicação de PDF de correção gera uma entrega independente à conta de teste
protegida, configurada por UUID no banco. Mesmo caminho do aluno, leitura própria,
sem tentativas ou notas sintéticas e sem alterar o lembrete original. Somente o
usuário configurado com matrícula ativa no Grupo 3 do curso pode conferir; nenhum
privilégio geral para outros alunos. Regras em `docs/ia/17-plano-pdf-redacoes.md`.

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
- Mini Simulados (solicitados pelo usuário em 13 de outubro de 2026), descritos na seção "Mini Simulados".

Fora de escopo até solicitação explícita:

- IA para criar metas;
- gamificação;
- simulados completos além dos Mini Simulados e simulados semanais;
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

## Antes de encerrar qualquer sessão (repetido de propósito no fim)

1. Atualize `docs/ia/estado-atual.md` (foco e próximos passos) e acrescente o registro da sessão no topo
   de `docs/ia/sessoes.md` (modelo no próprio arquivo).
2. Decisões do usuário em `06`, incidentes em `07`, pendências em `08`, no mesmo PR.
3. Nada destrutivo, nada de e-mail em massa, perguntar o grupo, CI verde antes de mesclar, revisão de
   segurança feita, nunca mostrar o grupo ao aluno, nunca gravar segredo ou dado pessoal na memória.
