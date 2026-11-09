# 11 — Prompt do fluxo de 09/11/2026: diagnósticos, 90 metas, contador e provas anteriores

Pedido do usuário em 09/11/2026: "faça isso tudo nessa linha de fluxo; faça um prompt antes e siga
com ele". O pedido aciona o gatilho **"executar provas anteriores"** (`08-pendencias.md`, R1–R7).
Cursos novos (PRF ADM, GCM Itaitinga, PCCE) ficam de fora: as metas deles serão geradas depois.

## Papel e limites
- Você opera o SGA em produção. Valem `01-regras.md`, `09-regras-metas.md` e o `AGENTS.md`.
- Grupo: tudo novo para aluno é lançado **primeiro só no Grupo 3** (o usuário confere com a conta
  de teste e depois libera G1/G2). Nunca mostrar o grupo ao aluno.
- Só questões reais de prova; nunca misturar cursos; nada destrutivo (arquivar, não apagar);
  migrações aditivas com reversão, rodadas pelo usuário; meta já liberada não muda.

## Ordem (prazos primeiro)

### Fase A — Diagnósticos do próximo bloco (liberam em 15/11)
| Curso | Bloco | Tamanho (metade da prova) |
|---|---|---|
| PMPE | Metas 29 a 35 | 30 (5 por disciplina) |
| GMF | Metas 15 a 21 | 40 (PT 5, RLM 4, INF 4, ATU 3, FOR 4, ADM 5, CON/DH 5, PEN/PP 5, LEG 5) |
| PRF | Metas 08 a 14 | 60 |
| PMCE | Metas 08 a 14 | 50 |
| PPCE | Metas 08 a 14 | 45 |
| CFO PMCE | Metas 08 a 14 | 50 |

1. Para cada curso e grupo (G1 e G2): listar os cadernos do Qconcursos das metas do bloco.
2. Coletar questões desses cadernos no navegador logado (gabarito pelo POST de resposta), escrever
   explicações próprias no formato "Imparável…", com a fonte. Rejeitar anuladas, desatualizadas,
   fora do assunto, sem texto.
3. **R1 (provas anteriores):** cada diagnóstico novo leva **no mínimo 5 questões da última prova** do
   curso (mesma banca/ano/cargo da tabela de `08`), só de assuntos estudados no bloco, **dentro do
   total** (substituem, não somam), nunca anuladas, sem repetir entre diagnósticos; comentário com a
   fonte da prova anterior.
4. Gravar como rascunho, conferir formatação (texto associado, sublinhados, Certo/Errado), publicar
   com `target_groups = {3}` e `unlock_goal_id` = meta que fecha o bloco do grupo espelhado,
   `release_date` = data dessa meta.

### Fase B — Contador da prova (pedido de 30/10)
- Campo `courses.exam_date` (+ `exam_date_confirmed`), editável nas configurações do curso.
- Card na tela inicial do aluno com os dias que faltam; "prevista" enquanto não confirmada; some após a
  prova. Função de grupo `contador_prova`, começando ligada só no Grupo 3. PMPE: 21/02/2027 (prevista).

### Fase C — Provas anteriores (R2 e R3)
- **R2 banco de questões por curso**: origem (prova anterior / diagnóstico), disciplina, tópico, banca,
  ano, bloco; gabarito só para o admin (RLS); nada apagado.
- **R3 reta final (só PMPE)**: aba própria, metas criadas à mão, liberada 30 dias antes de `exam_date`
  (quem compra depois já encontra liberada), função de grupo, só Grupo 3 no início.

### Fase D — Corte para as 90 metas (`metas-novas/ANALISE-90-METAS.md`)
1. **PMPE**: encaixar os 7 tópicos que faltam nas metas futuras ≤ 84 e criar as Metas 82–90 de
   fechamento (G1 e G2).
2. **GMF G1**: antecipar os 6 tópicos das Metas 91–94 para antes da 90; Metas 91+ viram revisão.
3. **PRF, PMCE, PPCE, CFO**: replanejar a partir da Meta 15 até a 90 (conteúdo até a 84), seguindo
   `PLANO.md` "Falta fazer" (alinhamento, cadernos, planejador, gravação).
- Itens antigos arquivados, nunca apagados; itens fixos mantêm o ID; conferir por SQL.

## Verificação e entrega (cada fase)
- Conferir no banco (contagens, gabaritos, grupos, datas) e na prévia do admin.
- Código: branch + PR, CI `validate` verde, merge autorizado pelo usuário em 09/11 para este fluxo.
- Atualizar `08-pendencias.md` (marcar feito) e `06-decisoes.md`.
- Resumo curto ao usuário por fase: o que foi lançado (só G3), o que conferir e o que falta.
