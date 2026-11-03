# Banco de questões — extração das provas anteriores

Gerado em 03/11/2026 a partir dos PDFs (prova + gabarito definitivo) nas pastas do usuário
(Downloads/PMPE, GMF, PMCE, CFO - PMCE, PPCE, PRF).

Ordem: `keys.py` (gabaritos) → `crops.py` (figuras) → `run.sh` (colunas, questões, enunciados,
ajustes manuais) → `classify.py` (disciplina por faixa e tópico do edital, classificação manual)
→ `seed.py` (arquivos `carga_banco_questoes_0N_*.sql` para o SQL Editor, idempotentes).
`carga_banco_questoes_05_diagnosticos.sql` copia as questões dos diagnósticos já cadastrados.

| Prova | Banca | Questões válidas | Anuladas (fora) |
|---|---|---|---|
| PMPE Soldado 2024, tipo 1 | Instituto AOCP | 60 | — |
| Guarda Municipal de Fortaleza 2023, tipo A | IDECAN | 77 | 29, 46, 76 |
| PMCE Soldado 2025, gabarito 1 | CEV/UECE | 96 | 9, 37, 57, 90 |
| CFO PMCE (2º Ten QOPM) 2023, tipo B | IDECAN | 98 | 17, 19 |
| Policial Penal CE 2024, tipo B | IDECAN | 86 | 13, 42, 82, 83 |
| PRF 2021, 578_PRF_001_01 (itens 9–120) | Cebraspe | 103 | 39, 45, 67, 69, 76, 83, 89, 98, 99 |
| PRF 2021 Inglês / Espanhol | Cebraspe | 7 + 7 | item 1 de cada |

Cebraspe: alternativas A = Certo, B = Errado. Questões com figura/tabela usam `[[imagem:hash]]`.
PMCE Q75 (Direito Penal, na parte de Processo Penal da prova) ficou sem tópico: o edital do curso
só tem Processo Penal.
