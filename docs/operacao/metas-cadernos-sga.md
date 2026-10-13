# Metas do SGA: cadernos Qconcursos e regras de montagem

Registro das decisões tomadas com o mentor para o curso **Sistema Guiado da Aprovação**
(`fec9bb24-aaab-41ce-a98b-a039c3905ee2`). Reescrita aplicada em 13/10/2026.

## O que foi feito

- Metas **futuras** (vencimento a partir de 14/10/2026, Meta 03 até 31/12) dos grupos 1 e 2 foram reescritas:
  158 metas (79 por grupo), 956 itens novos.
- Itens antigos foram **arquivados** (`archived_at`), nunca apagados; conclusões dos alunos ficam no histórico.
- **Intocadas:** "Comece por aqui", Meta 01 e Meta 02 (já liberadas). Metas liberadas nunca são reescritas.

## Regras dos cadernos (reclamação dos alunos: cadernos com tópicos a mais)

- **Um caderno = um subtópico.** Montado por lista fixa de IDs de questões, excluindo questões que também
  estão classificadas em assuntos de outros subtópicos.
- Material: tipo `link`, título `Qconcursos - <subtópico>`,
  URL `https://elite.qconcursos.com/questoes-de-concursos/questoes?notebook_ids[]=<id>`.
- 134 cadernos em uso nas metas futuras: 132 novos + 2 editados à mão pelo mentor, que devem ser preservados:
  - 15292440 — Proposições e conectivos;
  - 15292480 — Periféricos e entrada/saída.
- Bancas: filtro AOCP e similares; História de PE e Estatutos (PM, Juventude) usam todas as bancas.
- Na busca por palavra-chave, sempre usar a expressão **entre aspas**.
- Sem caderno (menos de 5 questões puras), viram leitura/anotação: Cabanos, Frevo, Maracatu, Culinária,
  Festas, Analogias, Princípio multiplicativo.
- História de PE tem cadernos pequenos (6 a 58 questões); as revisões passam a "refazer as erradas".
- **Nunca misturar** cadernos do SGA com os da Imersão PRF.
- **Nunca mencionar grupos** (Grupo 1/2, G1/G2) em títulos, descrições ou orientações vistas pelo aluno.
  A descrição traz só a carga ("Meta de ~3h").
- Os cadernos antigos (gerais) permanecem apenas nas metas já liberadas.

## Formato de cada bloco de disciplina

aula (ou partes) → anotação dirigida → bloco de questões (resolver antes da correção) → lei seca, quando houver
→ questões do caderno → estudo reverso → caderno de erros.

- Aulas divididas em partes: as questões do caderno só entram após a **última parte**
  (aviso "Esta aula continua…" nas anteriores).
- Quantidades de questões mantidas; quando o caderno se esgota, a revisão vira "refazer as erradas".

## Exigências mantidas

- Revisões espaçadas; discursiva a cada 7 metas; caderno de erros semanal.
- Carga: 3 h (grupo 1) e 6 h (grupo 2); 3 ou mais disciplinas por dia; datas até 31/12.
- Os PDFs de "Plano de Ação" enviados pelo mentor são **apenas base estrutural**, não modelo a replicar.

## Onde estão os dados

- Banco: `stage_import.unit` (código, rótulo, nº de questões, anotação dirigida e lei seca por unidade) e a
  função `stage_import.apply_goals(jsonb)`, que arquiva itens antigos e grava os novos, e recusa metas com
  vencimento até 13/10/2026.
- Os scripts geradores ficaram no ambiente temporário da sessão e não estão no repositório.
