# 12 — Plano de personalização (aprovado em 2026-11-10)

Pedido do usuário: "esta aprovado, resolva, a decisão é o que for recomendado. Siga o plano geral e
sempre crie prompts completos para você seguir. Atualização da memória deve ocorrer. Deve haver o
aviso que o SGA foi atualizado. Nunca deve ocorrer de os textos informarem algo prejudicial; não deve
haver transparência sobre mudança de grupos, mas dizer que as metas foram atualizadas conforme relatório."

Documento do plano para o usuário: Claude Doc "Plano: metas personalizadas pelas horas, reforço e
relatório" (claude.ai/artifact/Fjr7bdnaE5JMuNohwr7c6M). Esta página é a versão de trabalho para IAs.

## Decisões (todas as recomendações aceitas)
| Tema | Decisão |
|---|---|
| Base | 90 metas iguais para todos, ~2h30 por dia, num grupo só (Grupo 1). Um plano por curso. |
| Formulário | Enxuto: horas, rotina, redação, TAF (se o curso tiver) e acessos. Sem domínio/nível. |
| Pergunta 1 | 2 horas / 3 horas / 4 horas / Mais de 4 horas (valores `de_1_a_2h`…`de_4_a_6h`). Textos sem "mínimo de horas". |
| Alunos atuais do G2 (56 em 10/11) | Passam ao G1 **junto com** o bloco "Se sobrar tempo" de 4h (Fase 3), nunca antes, para não perderem volume. |
| Novos alunos | Sempre G1 (migração `20261110000100_questionario_enxuto.sql`). |
| "Pode acelerar" | Disciplina com ≥ 80% nos 2 últimos diagnósticos do aluno. |
| Ordem | Fase 1 → 2 → 3 → 4 → 5, cada uma conferida no Grupo 3 antes de liberar. |

## Regras de texto (valem para todas as fases)
- Nada prejudicial ao aluno: não usar "reiniciar", "cortar", "rebaixar", "perder", "menos conteúdo".
- Mudança de grupo nunca aparece. Mensagem padrão: **"Suas metas foram atualizadas conforme o seu relatório."**
- Toda atualização que o aluno percebe leva o aviso da tela inicial (`course_group_settings.notice`),
  primeiro no Grupo 3, por 7 dias, e depois nos demais. Modelo:
  > **O SGA foi atualizado!** <o que melhorou, em uma frase>. Suas metas foram atualizadas conforme o seu relatório.
- Nunca mostrar número de grupo nem a palavra "grupo".

## Prompts das fases

Cada prompt abaixo é completo: copie e siga. Todos assumem: ler `AGENTS.md` e `docs/ia/` antes;
branch separada; PR via `gh api`; CI `validate` verde; perguntar antes do merge; migração aditiva com
reversão no cabeçalho, entregue ao usuário para rodar no SQL Editor; conferir por SQL depois;
lançar primeiro no Grupo 3; atualizar `06`, `08` e este arquivo no mesmo PR.

### Fase 1 — Formulário enxuto e textos sem horas (PR #123) — EM ANDAMENTO
> Objetivo: o primeiro acesso passa a ter a introdução do SGA e o formulário enxuto.
> 1. `lib/groups/schema.mjs`: aceitar questionário de até 8 ou de 20 perguntas; `compactQuestionnaire`
>    monta o enxuto a partir do de 20 (q01 padrão, rotina, redação, TAF se houver, acessos), renumerado.
> 2. Textos do primeiro acesso: sem "mínimo de 2 horas", sem "metas serão reiniciadas"; as respostas
>    "ajustam o volume das suas metas".
> 3. Prévia do administrador em `/previa/primeiro-acesso/<curso>` já com o formulário enxuto.
> 4. Migração `20261110000100_questionario_enxuto.sql`: banco aceita o questionário do curso e toda
>    faixa válida vai para o Grupo 1. Teste `tests/questionario-enxuto.test.mjs`.
> 5. Depois do merge e da migração: gravar em `courses.questionnaire_schema` dos 9 cursos SGA o
>    resultado de `compactQuestionnaire` (um UPDATE por curso; conferir com SELECT). Alunos que já
>    responderam não mudam; os que ainda não responderam veem o novo formulário.
> 6. Sem aviso "O SGA foi atualizado" nesta fase: quem já respondeu não percebe mudança.

### Fase 2 — Grupo único
> Objetivo: ninguém novo entra no Grupo 2 e o painel deixa de depender dele.
> 1. Conferir que a migração da Fase 1 está aplicada (`select public.study_group_from_q01('mais_6h')` = 1).
> 2. Painel: nas telas de metas e diagnósticos, o Grupo 2 aparece como "Grupo 2 (encerrado)" e não é
>    oferecido como padrão para conteúdo novo; nada é apagado.
> 3. Parar de gerar metas/diagnósticos novos para o G2, **exceto** o que os 56 alunos atuais precisam
>    até a Fase 3 (diagnósticos dos blocos que eles alcançarem).
> 4. Nenhum texto ao aluno nesta fase.

### Fase 3 — "Se sobrar tempo" (volume por horas) e migração do G2
> Objetivo: quem tem mais horas recebe mais questões e revisão, sem mudar a base.
> 1. Migração aditiva: `goal_items.extra_tier smallint null check (extra_tier in (1,2,3))`
>    (null = base). Função `student_extra_tier(enrollment)` a partir de `questionnaire->answers->>'q01'`
>    (de_1_a_2h/ate_1h → 0; de_2_a_3h → 1; de_3_a_4h → 2; de_4_a_6h/mais_6h → 3) e coluna opcional
>    `enrollments.extra_tier_override` para o administrador. RLS: o aluno só lê itens extras de tier ≤ o seu.
> 2. Progresso da meta e do edital **ignoram** itens com `extra_tier` (contam só a base).
> 3. Tela da meta: seção "Se sobrar tempo" abaixo da base, recolhida, com os itens do nível do aluno.
> 4. Conteúdo: gerar com o gerador de `docs/ia/metas-novas/` itens extras por meta: tier 1 ≈ 30 min,
>    tier 2 ≈ 1h30, tier 3 ≈ 2h, só com cadernos dos assuntos da própria meta e revisão de assuntos já
>    vistos; nunca assunto futuro; nunca misturar cursos.
> 5. Lançar no Grupo 3 (conta de teste simulando cada faixa), depois liberar.
> 6. Migração dos 56 alunos do G2 para o G1 (só depois dos extras publicados no G1): por aluno,
>    `admin_set_enrollment_group(id, curso, 1, …)`; conclusões ficam; edital estudado fica.
>    Itens do G1 cujo tópico o aluno já estudou aparecem como já estudados no Edital (regra existente).
> 7. Aviso (7 dias, G3 primeiro): **"O SGA foi atualizado! Agora suas metas trazem um bloco 'Se sobrar
>    tempo' com questões e revisão extras para o seu ritmo. Suas metas foram atualizadas conforme o seu
>    relatório."**

### Fase 4 — "Seu reforço" e "pode acelerar"
> Objetivo: depois de cada Diagnóstico Semanal, o aluno recebe os cadernos dos assuntos em que errou.
> 1. Antes: marcar `topic_id` nas 60 questões de diagnóstico do PMPE sem assunto (10/11/2026).
> 2. RPC `student_reinforcement(course)` (security definer, só o próprio aluno): assuntos com erro na
>    última tentativa de diagnóstico → links de caderno já usados nas metas publicadas daquele assunto
>    (mesmo curso e grupo). Até 5 assuntos, ordenados por erros e importância.
> 3. "Pode acelerar": disciplina com ≥ 80% nas 2 últimas tentativas → selo nos itens de questões dela.
> 4. Bloco "Seu reforço" na meta atual e na tela inicial; não conta no progresso; calculado na hora.
> 5. Função de grupo nova `reforco` em `course_group_settings` (desligada no G1/G2 até liberar).
> 6. Aviso: **"O SGA foi atualizado! Depois de cada Diagnóstico Semanal, você recebe um reforço com os
>    assuntos que mais precisam da sua atenção."**

### Fase 5 — Relatório mensal
> Objetivo: o relatório mostra a evolução mês a mês por disciplina e assunto.
> 1. Calcular por mês (fuso de Brasília, primeira tentativa do mês, regra `is_first_of_month`) o
>    percentual por disciplina; comparar com o mês anterior.
> 2. Texto sempre construtivo: "Informática: 72% → 45%. Seu reforço passa a priorizar Informática."
>    Nunca "você piorou"; usar "precisa de mais atenção".
> 3. Versão 1 após o primeiro diagnóstico. Sem tabela nova nem tarefa agendada.
> 4. Função de grupo `relatorio_mensal`; aviso: **"O SGA foi atualizado! Seu relatório agora mostra
>    sua evolução mês a mês."**

## Estado
| Fase | Estado |
|---|---|
| 1 | **Concluída em 2026-11-10**: PR #123 mesclado; migração `questionario_enxuto` aplicada e conferida; formulário enxuto gravado nos 9 cursos (PRF ADM com 4 perguntas, sem TAF). Cópia dos questionários de 20 perguntas em `docs/ia/questionarios/` |
| 2 | **Concluída em 2026-11-10**: rótulos e textos do painel (Grupo 2 "encerrado"); nada muda para o aluno |
| 3–5 | Pendentes, nesta ordem |
