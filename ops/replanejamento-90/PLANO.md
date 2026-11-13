# Reorganização em 90 metas — 13/11/2026

Escopo desta aplicação: PMPE, GMF, PRF, PMCE, PPCE e CFO PMCE. PCCE/PRF ADM ficam fora deste lote.

Pedido autorizado: reorganizar os cursos que ainda não fecham o edital em 90 metas, sem alterar as metas onde os alunos já estão. A inclusão de PCCE/PRF ADM foi autorizada na conversa anterior; sua execução fica separada deste lote de seis cursos. Conferir as substituições das resoluções da PRF para usar legislação vigente (resposta expressa). Público: Grupo 1 e conferência pela conta de teste; G2 encerrado, preservar histórico.

## Preservação

- Congelar todas as metas com data até o dia corrente em Brasília e qualquer meta com conclusão de item, mesmo futura. PCCE e PRF ADM: preservar também as três primeiras metas, conforme compromisso informado no chat.
- Nunca alterar IDs, datas ou estados de conclusões, matrículas, tentativas ou diagnósticos. Manter `unlock_goal_id` e itens fixos (discursiva, atualidades, diagnóstico e caderno de erros).
- Em meta futura, troca de assunto ou remoção de item arquiva o original; nunca apagar ou transferir conclusões. Novos itens possuem novas identidades.
- Materiais sempre do próprio curso. Reaproveitamento de caderno comum exige correspondência pedagógica, com registro próprio no curso de destino; nenhuma aula estrangeira.
- Não declarar cobertura apenas pela presença de um tópico ancestral. Conferir texto e recursos; vincular ao assunto efetivamente estudado.
- Atualização de escopo: usuário escolheu manter todo o volume e aceitar metas mais longas; não reduzir questões nem transferir blocos para opcionais. Preservar séries completas ou continuação consecutiva quando extensa, questões após aula e revisões espaçadas. Não usar atividades opcionais como fechamento obrigatório do edital.

## Levantamento inicial (somente leitura)

| Curso | Última meta regular já liberada em 13/11 | Unidades sem vínculo até a Meta 90, considerando ancestrais |
|---|---:|---:|
| PMPE | 33 | 1 |
| CFO PMCE | 12 | 4 |
| PPCE | 12 | 8 |
| PRF | 12 | 55 (31 referências a resoluções antigas) |
| GMF | 19 | 0 |
| PMCE | 12 | 0 |
| PCCE | nenhuma; preservar 01–03 | 224; só 01–03 geradas |
| PRF ADM | nenhuma; preservar 01–03 | 76; só 01–03 geradas |

Meta 0 não entra nas 90 metas de estudo. O número de vínculos não prova ausência de conteúdo: há aulas ligadas a outro tópico, que exigem correção de planejamento somente nas metas futuras. GMF e PMCE não exigem redistribuição de cobertura neste retrato.

## Etapas

1. Exportar metadados e conteúdo sem dados pessoais; levantar congelamento e materiais existentes.
2. Conferir correspondências de aulas/cadernos/leituras e fontes oficiais das normas; registrar dependências reais.
3. Gerar plano concreto por meta, estimativa e pré-condições. Cursos com material insuficiente permanecem em rascunho até completar os recursos, sem anunciar edital fechado.
4. Validar fora de produção invariantes de segurança e cobertura. Preparar SQL restrito a IDs, com conferência de versão, congelamento, curso e materiais; caminho de reversão.
5. Revisar segurança, aplicar em transação e conferir conteúdo, histórico preservado e carga. Registrar resultados e pendências em `docs/ia/` no PR.

Fontes e dados de execução ficam fora do Git; não versionar tokens, contas, dados pessoais ou cópias de conteúdo de aluno.
