# Dados do edital dos cursos criados em 09/11/2026

- `*_edital.json`: disciplinas, tópicos, subtópicos e importância **exatamente como gravados no banco**.
- `prfadm.py`, `pcce.py`, `gcm.py`: como a importância foi calculada (padrões de busca nos arquivos de
  incidência do TEC enviados pelo usuário + ajustes manuais `imp=`). `lib.py` tem a regra.
- `gensql.py <json> <course_id> <ini> <fim>`: gera o INSERT (um comando com CTEs) no padrão SGA.
- Os arquivos de incidência ficam com o usuário (pastas "PRF ADM", "GCM Itaitinga", "PCCE" no computador
  dele); não vão para o repositório.
