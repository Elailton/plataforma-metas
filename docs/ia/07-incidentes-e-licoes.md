# 07 — Incidentes e lições aprendidas

Formato: data — o que aconteceu — causa — o que mudou / lição.

| Data | O que aconteceu | Causa | O que mudou / lição |
|---|---|---|---|
| 2026-09-03 | Convite falhou por limite de e-mail | SMTP padrão do Supabase | SMTP próprio (Resend) configurado |
| 2026-10-10 a 10-16 | Reenvios com status `failed` | Consulta à API de vendas da Hotmart falhando | Reenvio deixou de consultar a API (decisão de 10-16) |
| 2026-10-16/17 | 20 compras do PMPE com SGA só com evento "compra concluída" (sem "aprovada") | Aprovações anteriores ao webhook do PMPE | Lição: aprovação perdida deixa o aluno de fora; ver pendência "COMPLETE" |
| 2026-10-20 | 12 compras do GMF (`fx39ie5v`) ignoradas | Produto sem mapeamento ativo na hora da venda | Lição: cadastrar produto/oferta **antes** de vender; sem e-mail guardado não dá para reprocessar |
| 2026-10-21 | 12 convites com erro 500 do Auth numa rajada de compras | Auth com só 10 conexões | Conexões do Auth em 25 % (10-27); Hotmart reenviou |
| 2026-10-21 a 10-27 | Liberações manuais quase diárias (60 de 71 sem compra registrada) | Compras de ofertas "sem SGA", e-mail diferente, compras antes do cadastro | C/D/E de autoatendimento (10-27); ofertas cadastradas (10-28) |
| 2026-10-26 | Celular quebrava a formatação do diagnóstico | URL longa dentro de `fieldset` | `min-w-0` e quebra de palavras; revisar telas em 320/375 px |
| 2026-10-27 | Pico de 5.527 requisições em 12 min | Uma única sessão (conta de teste) navegando; proxy consulta perfil/matrícula a cada navegação/prefetch | Lição: separar tráfego de teste antes de concluir sobre carga |
| 2026-10-27 | Plano Vercel Hobby com 58 % da CPU mensal usada | Plano gratuito em uso comercial | Upgrade para Pro |
| 2026-10-27 | Alunos "não recebem o e-mail" | Resend mostra 100 % entregue: o aluno não reconhece (assunto "Redefina sua senha", spam, Hotmail) | Telas com orientação; pendência: trocar texto do e-mail |
| 2026-10-27 | Merge publicado apesar de o usuário interromper | A chamada de merge já tinha rodado | Lição: interrupção = não publicar; reverter na hora e avisar |
| 2026-10-27 | Branch do Supabase com "MIGRATIONS_FAILED" | Várias mudanças de produção foram feitas por SQL fora do histórico de migrações | Lição: o histórico de migrações não reproduz produção; para testes, copiar o esquema real |
| 2026-10-27 | API de vendas da Hotmart responde 400 em todas as consultas | Credenciais/permissões da conta Hotmart | "Encontrar minha compra" usa os registros do webhook primeiro; revisar credenciais |
| 2026-10-28 | "Encontrar minha compra" mandava ao suporte uma compra "curso apenas" de curso em rascunho | Filtro de curso publicado aplicado também à explicação | Corrigido (PR #81) |
| 2026-11-06 | Aluno do GMF pediu para mudar respostas do questionário (não achava onde) | Não existe tela para isso; o aviso não dizia como pedir | Com autorização do usuário: questionário reaberto, 4 conclusões de itens apagadas (metas reiniciadas), acesso reenviado por e-mail; aviso do questionário passou a indicar o WhatsApp do suporte |
| 2026-11-06 | Plataforma toda lenta logo após publicar a aba Simulados | `student_upcoming_quizzes` (~1,3 s) chamada no layout de toda página, recalculando o escopo do aluno por meta | Menu passou a usar `student_has_general_quiz` (leve); a lista de próximos ficou só nas telas Semanal/Geral e foi otimizada (migração `20261106000300`). Lição: nada pesado no layout; medir com `pg_stat_statements` antes de publicar RPC nova |

## 2026-11-08 — Redação do Simulado Geral recusada (erro 42809)

- **O que houve:** no primeiro teste real (conta de teste), a foto subiu e as respostas foram enviadas,
  mas a redação não foi gravada: `submit_mini_quiz_essay` usava `= any (public.active_course_ids())` e,
  em produção, `active_course_ids()` devolve `setof uuid` (linhas), não array → `42809 op ANY/ALL (array)
  requires array on right side`. Nenhum aluno afetado (só a conta de teste tinha feito o simulado).
- **Causa da falha no teste:** o banco descartável usava um *stub* de `active_course_ids()` que devolvia
  `uuid[]`, diferente da produção.
- **Correção:** migração `20261108000400_redacao_corrige_cursos_ativos.sql` (`in (select public.active_course_ids())`).
- **Lição:** nos testes SQL, copiar a assinatura real das funções auxiliares (`pg_get_function_result`)
  em vez de inventar o stub; para `active_course_ids()`, usar sempre `in (select ...)`.

## 2026-11-10 — Formulário enxuto travava o envio do primeiro acesso

- O que houve: depois de gravar o formulário de 5 perguntas nos cursos (Fase 1), o envio do aluno
  passava por `normalizeSubmission`, que ainda exigia as respostas q01 a q20. O aluno que tentasse
  concluir o primeiro acesso receberia erro.
- Causa: a prévia do administrador não envia nada, então o caminho de envio não foi exercitado; o
  teste cobria o validador do questionário, mas não o envio do aluno.
- Correção: `normalizeSubmission` conta as perguntas presentes (até 8 ou 20); teste novo do envio
  enxuto; simulação ponta a ponta (rótulos → normalização) com o questionário de cada curso.
- Lição: mudança de formato de dados exige testar **o caminho de gravação real** (envio do aluno),
  não só a tela; incluir isso na revisão de segurança/qualidade antes de aplicar no banco.

## 2026-11-11 — Verificação remota sem iniciar
Os runs de `validate` do PR #134 permaneceram `queued`, sem jobs. O GitHub recusou
cancelamento e reexecução; nova execução do mesmo código também ficou na fila.
Testes locais (incluindo SQL real), TypeScript e build aprovados; preview da Vercel
aprovado. Usuário informado do bloqueio e autorizou publicar. Na retomada, PR já
mesclado e produção READY; migração/configuração aplicadas após nova revisão/testes.
Não afirmar CI verde quando só há testes locais. Não repetir atualizações técnicas
sem nova informação útil. Não houve alteração de nota, tentativa ou leitura original.

## 2026-11-13 — Limite de requisições durante lote de conteúdo

A API de gerenciamento do Supabase retornou 429 depois de 36 metas verificadas. As transações anteriores estavam confirmadas; a requisição recusada não foi tratada como sucesso. A retomada reconheceu o conteúdo já aplicado por IDs e estado exato, preservou o hash original das metas congeladas e terminou as 86 sem duplicação. O controlador agora espaça chamadas e respeita Retry-After somente para 429; outros resultados incertos exigem nova leitura antes de retomar. Lição: lotes em produção precisam de intervalo, diário persistente, idempotência e conferência após cada transação, além da revisão prévia.
