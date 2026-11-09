# Análise e reestruturação: fechar o edital em 90 metas (2026-11-09)

Regra do usuário (09/11/2026): **todos os cursos devem fechar o edital em 90 metas**. Vale para
armazenar cursos novos e para corrigir os existentes. O procedimento está em `../10-prompt-mestre-cursos.md`.
Nada foi alterado nas metas: esta é a análise para o usuário aprovar.

Medida no banco em 09/11/2026:
- Metas não arquivadas por grupo, com número tirado do título "Meta N".
- Tópico de 1º nível coberto = aparece num item não arquivado.
- "Meta de hoje" = última meta publicada com data ≤ hoje. Meta liberada não muda (`09-regras-metas.md`).

| Curso | Grupo | Metas | Hoje | Tópicos cobertos / edital | Último tópico novo | Faltam (alta/média/baixa) |
|---|---|---|---|---|---|---|
| PMPE | G1 | 81 | 29 | 57 / 64 | Meta 67 | 7 (0/3/4) |
| PMPE | G2 | 81 | 29 | 58 / 64 | Meta 64 | 6 (0/2/4) |
| GMF | G1 | 104 | 15 | 70 / 72 | **Meta 94** | 2 (0/1/1) |
| GMF | G2 | 99 | 15 | 70 / 72 | Meta 90 | 2 (0/1/1) |
| PRF | G1 | 50 | 8 | 39 / 91 | Meta 48 | 52 (28/18/6) |
| PRF | G2 | 50 | 8 | 48 / 91 | Meta 50 | 43 (21/16/6) |
| PMCE | G1 | 50 | 8 | 45 / 104 | Meta 48 | 59 (14/25/20) |
| PMCE | G2 | 50 | 8 | 60 / 104 | Meta 50 | 44 (11/18/15) |
| PPCE | G1 | 50 | 8 | 40 / 89 | Meta 48 | 49 (17/20/12) |
| PPCE | G2 | 50 | 8 | 51 / 89 | Meta 50 | 38 (11/17/10) |
| CFO PMCE | G1 | 50 | 8 | 45 / 116 | Meta 50 | 71 (21/31/19) |
| CFO PMCE | G2 | 50 | 8 | 56 / 116 | Meta 50 | 60 (16/27/17) |
| PRF ADM, GCM Itaitinga, PCCE | — | só Meta 0 | — | 0 / 58, 56, 119 | — | plano do zero |

## Diagnóstico e proposta por curso

### PMPE: cabe nas 90 sem mexer no que foi liberado
- Hoje o edital fica com 6–7 tópicos de fora: Direito Constitucional, DH/Legislação Extravagante,
  Discursiva e História de Pernambuco. Nenhum é de alta incidência.
- **Proposta:**
  - incluir os tópicos que faltam nas metas futuras 68–84;
  - criar as Metas 82–90 (fechamento: baixa incidência + revisão geral de alta);
  - depois da 90, só revisão, caderno de erros e simulados.

### GMF: o G1 passa da 90
- **G1:** 6 tópicos só começam nas Metas 91–94.
  - Lei Orgânica de Fortaleza (M91).
  - CF arts. 182–183 e 226–230 (M92).
  - CPP busca e apreensão (M92).
  - Extensões e arquivos (M93).
  - Estruturação do texto (M94).
- **G1, proposta:**
  - antecipar esses 6 tópicos para antes da Meta 90;
  - incluir os 2 tópicos nunca vistos (Penal/Processo Penal);
  - transformar as Metas 91–104 em revisão/reforço.
  - Alterar só itens de metas ainda não liberadas (a partir da Meta 16), arquivando os antigos.
- **G2:** fecha na Meta 90. Falta só incluir os 2 tópicos de Penal/Processo Penal.

### PRF, PMCE, PPCE e CFO PMCE: faltam as Metas 51–90, e o ritmo atual não fecha
- O plano antigo (`PLANO.md`) era de ~100 metas, com conteúdo novo até ~85. A nova regra pede conteúdo
  novo até a 84 e fechamento até a 90.
- Nas Metas 09–50 o G1 cobre só **0,6–0,8 tópico por meta**. Para fechar até a 84 só com as Metas
  51–84, o ritmo teria de saltar para:
  - PRF: 1,5 (G1) / 1,3 (G2);
  - PMCE: 1,7 / 1,3;
  - PPCE: 1,4 / 1,1;
  - CFO PMCE: **2,1** / 1,8.
- **Proposta (recomendada):**
  - **replanejar a partir da Meta 15**, a primeira de um bloco de diagnóstico ainda não liberado.
    Isso distribui o restante do edital nas Metas 15–84, cerca de 1,0–1,4 tópico por meta no G1,
    ritmo parecido com o das Metas 01–08;
  - **no G1, os assuntos de baixa incidência viram itens só de questões**, com caderno e sem aula
    completa;
  - **Metas 85–90:** fechamento.
  - As metas 15–50 já publicadas, mas ainda não liberadas, são corrigidas arquivando os itens
    antigos, nunca apagando.
- **Alternativa:** manter as Metas 09–50 e acelerar só nas Metas 51–84. Isso exige o dobro do ritmo
  no G1 (aulas mais longas ou mais disciplinas por dia), o que vai contra o limite de ~3h.

### PRF ADM, GCM Itaitinga e PCCE: planejar do zero em 90
- A distribuição de vagas por disciplina está em `../cursos/<slug>.md`.
- Falta, para gerar:
  - aulas e materiais de cada disciplina, com o professor de cada trilha;
  - os cadernos do Qconcursos;
  - a Meta 01 com data de início;
  - o grupo em que lançar.

## O que o usuário precisa decidir
1. Aprovar a regra de corte para os 4 cursos de 50 metas: replanejar a partir da Meta 15 (recomendado)
   ou só a partir da 51.
2. Aprovar, no G1, a troca de aula por "só questões" nos assuntos de baixa incidência quando faltar tempo.
3. GMF G1: antecipar os 6 tópicos e transformar as Metas 91–104 em revisão.
4. Data de início e grupo de lançamento de PRF ADM, GCM Itaitinga e PCCE.
