# Grupos de estudo por curso

## Comportamento

A divisão é opcional por curso, preservando cursos existentes até que o administrador a ative. Cada matrícula tem Grupo 1 (até 4 horas diárias), Grupo 2 (mais de 4 horas) ou Sem grupo. Em cursos segmentados, Sem grupo não recebe nenhuma meta, inclusive metas compartilhadas.

Uma meta pode atender um grupo ou ambos. A publicação e a data de liberação continuam obrigatórias; matrícula ativa, curso publicado e ausência de bloqueio continuam necessários. RLS protege metas, itens e vínculos de materiais inclusive por ID direto. Materiais e edital continuam sendo o acervo comum do curso; o que é segmentado são as metas e seus itens.

A primeira resposta de disponibilidade define o grupo. Depois do primeiro questionário, o aluno não pode refazê-lo para mudar de grupo. Uma alteração manual pelo administrador, inclusive Sem grupo, tem prioridade sobre importações posteriores. Mudanças de grupo não apagam itens nem conclusões.

## Aplicação

1. Aplicar `supabase/migrations/20261009000100_course_groups.sql` no Supabase, depois das migrações anteriores, incluindo `20260912000100_goal_release_guard.sql`.
2. Publicar a versão da aplicação que inclui essa migração. A aplicação consulta novas colunas; a ordem banco antes de aplicação é necessária.
3. No curso, abrir Configurações > Grupos e questionário. Carregar a configuração JSON de 20 perguntas, ou manter `[]` quando as respostas serão importadas de um formulário externo.
4. Classificar os alunos existentes na aba Alunos ou importar suas respostas antes de ativar a divisão. Ativar sem classificar impede que esses alunos vejam metas, intencionalmente.
5. Ativar a divisão somente no curso desejado. Editar cada meta para Grupo 1, Grupo 2 ou ambos. Metas antigas começam compartilhadas para os grupos 1 e 2.
6. Publicar o curso e as metas quando for o momento de liberar o acesso.

## Primeiro acesso

Os convites e e-mails existentes continuam apontando para `/auth/primeiro-acesso`. A página identifica as matrículas do usuário autenticado; não usa curso/grupo recebidos no link. Em cursos com questionário configurado, solicita as respostas antes da definição de senha. Sem questionário configurado, o administrador importa as respostas externas ou atribui manualmente o grupo.

O aluno autenticado com questionário pendente em um curso publicado é direcionado ao primeiro acesso antes de usar a área do aluno. Respostas já importadas dispensam preenchimento novamente. Links de recuperação de senha de alunos com respostas existentes não reapresentam o questionário.

As 20 respostas ficam visíveis em Minha Conta e para o administrador na matrícula do curso. As boas-vindas destacam disponibilidade, rotina, formato de estudo, revisão e ajuda necessária. Respostas, WhatsApp e histórico são privados da conta e dos administradores.

## Importação externa

Na seção Configurações, colar um objeto JSON por aluno, com `id_envio`, `email`, `aluno`, `whatsapp`, `versao`, `q01` a `q20` e `respostas` (objeto ou string JSON). O e-mail precisa corresponder a uma conta de aluno matriculada no curso. Contas administrativas são recusadas. O campo externo `grupo` não concede autorização: o sistema calcula o grupo a partir de `respostas.q01`.

Faixas reconhecidas: `ate_1h`, `de_1_a_2h`, `de_2_a_3h`, `de_3_a_4h` para Grupo 1; `de_4_a_6h`, `mais_6h` para Grupo 2. O texto `q01` também precisa indicar uma faixa do mesmo grupo. Todos os campos de resposta são necessários.

O ID de envio garante idempotência: repetir exatamente o mesmo envio não o duplica; reutilizar o ID com dados diferentes é recusado. O histórico fica no banco. A importação não cria uma conta, envia convite, altera senha ou promove administradores; matrícula/convite continuam no fluxo administrativo existente.

## Configuração das perguntas

A configuração é um array com 20 objetos em ordem `q01` a `q20`. Cada objeto contém `id`, `title`, `type` (`single`, `multiple` ou `matrix`) e `options` com `value` e `label`. Perguntas `matrix` também usam `rows`, com `value` e `label`. A pergunta 1 é `single`, com as seis faixas reconhecidas. As outras perguntas são dados do curso, sem dependência de concurso específico no código.

## Verificação

Executar `pnpm test`, `pnpm exec tsc --noEmit` e `pnpm build`. Os testes de grupos usam PostgreSQL descartável via PGlite, executam as migrações reais e verificam RLS, acesso por ID, escrita de conclusões, importação idempotente, prioridade administrativa e preservação de progresso. Isso não substitui a verificação de convite/SMTP e login na implantação final.

A migração não atribui grupos em massa nem ativa a divisão automaticamente. Para interromper a segmentação de um curso, desativá-la no painel; isso devolve as metas aos matriculados ativos. Para reverter a aplicação, fazer uma nova implantação; preservar as colunas e tabelas para não apagar respostas e histórico.
