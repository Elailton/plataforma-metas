# AGENTS.md

> **Leia primeiro: o projeto está em produção, com alunos pagantes.**
> Antes de qualquer tarefa, leia a memória do projeto em [`docs/ia/`](docs/ia/README.md):
> regras invioláveis (`01-regras.md`), arquitetura e limites (`02`), dados pessoais (`03`),
> cursos e ofertas (`04`), procedimentos (`05`), decisões (`06`), incidentes (`07`) e
> pendências (`08`). Atualize essa memória no mesmo PR de qualquer mudança relevante.

## Regras de ouro (resumo de `docs/ia/01-regras.md`)

1. **Nada destrutivo no banco de produção.** Arquivar em vez de excluir; migrações
   aditivas, com reversão, rodadas pelo usuário.
2. **Nada de e-mail em massa.** Resend gratuito: 100 e-mails/dia e 3.000/mês.
3. **Perguntar em qual grupo lançar** qualquer conteúdo ou função (1, 2, 3); lançar
   primeiro no Grupo 3. **Nunca mostrar o grupo ao aluno.**
4. **Nunca misturar cursos** e usar só questões reais de prova (inéditas só com
   autorização, marcadas com `[[inedita]]`).
5. **Perguntar antes de mesclar/publicar**; CI `validate` obrigatório; caminho de
   reversão sempre definido.
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

## Grupos, Grupo 3 (teste) e lançamentos

- Grupos de estudo: 1 e 2 (alunos) e 3 (teste, só a conta de teste do administrador).
  O Grupo 3 vê tudo do grupo que espelha (`enrollments.mirror_group`, 1 ou 2) e o que
  foi lançado só para o Grupo 3. Contas do Grupo 3 não aparecem no ranking dos alunos.
- `target_groups` de metas e diagnósticos aceita 1, 2 e 3. A visibilidade é decidida
  no banco (`student_goal_scopes`, `student_group_allowed`).
- `course_group_settings`: por curso e grupo, abas/funções desligadas
  (`metas`, `edital`, `diagnostico_semanal`, `relatorio`, `ranking`, `progresso`) e aviso
  da tela inicial. Aba desligada some do menu e a rota volta para `/aluno`.
- Fluxo de lançamento: lançar primeiro só no Grupo 3, o administrador confere com a
  conta de teste e depois libera nos Grupos 1 e 2. **Antes de lançar qualquer conteúdo
  ou função, perguntar ao usuário em qual grupo lançar (1, 2, 3 ou combinação).**
- Nunca mostrar o número do grupo ao aluno.

## Mini Simulados

Mini simulados por disciplina, cadastrados pelo administrador e resolvidos pelo aluno
na plataforma, orientados por `courseId` (nada específico de um concurso).

- Tabelas: `mini_quizzes`, `mini_quiz_questions`, `mini_quiz_answer_keys` (gabarito e
  comentário, legíveis só pelo administrador), `mini_quiz_attempts` e
  `mini_quiz_attempt_answers`.
- A correção acontece só no banco (`submit_mini_quiz`). O gabarito nunca vai ao navegador
  antes do envio; a revisão vem de `mini_quiz_attempt_review` para a própria tentativa.
- Diagnóstico Semanal (simulado sem disciplina própria, pedido em 21 de outubro de 2026): tentativa
  única (`MINI_QUIZ_ALREADY_DONE`), só pode ser enviado depois de iniciado (`MINI_QUIZ_NOT_STARTED`).
  `start_mini_quiz` registra o início e `submit_mini_quiz` grava `duration_seconds` (cronômetro).
  Mini simulados por disciplina mantêm o intervalo de 7 dias para refazer.
- Durante a prova o texto não pode ser copiado nem selecionado (só clicar nas alternativas).
- Questões de prova trazem a fonte no comentário. Questão inédita (elaborada pela equipe, a pedido do
  usuário em 26 de outubro de 2026) começa com a linha `[[inedita]]` no enunciado, exibida como selo "Inédita".
- Ranking: o aluno escolhe ao iniciar se quer aparecer; ordem por acertos e, no empate, menor tempo
  (`mini_quiz_ranking`, nome curto). Fica dentro de cada diagnóstico e num card da tela inicial.
- Área do aluno: abas "Diagnóstico Semanal" (`/aluno/diagnostico-semanal`) e "Relatório"
  (`/aluno/relatorio`, erros por disciplina e assunto). As rotas antigas `/aluno/mini-simulados` redirecionam.
- O administrador faz a prévia do diagnóstico como aluno (nada é gravado) e publica pela própria tela.
- O diagnóstico mensal usa a primeira tentativa de cada mini simulado no mês (fuso de
  Brasília, `is_first_of_month`). Refazer fica no histórico e não altera o mês.
- Tentativas e respostas nunca são apagadas; questões removidas são arquivadas e um mini
  simulado com tentativas não pode ser excluído, só arquivado.
- Acesso do aluno segue `active_course_ids()`; o administrador salva por
  `admin_save_mini_quiz`, com IDs estáveis e versão `updated_at`.

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
