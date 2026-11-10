# Questionários dos cursos

- `2026-11-10-antes-do-enxuto.json`: `courses.questionnaire_schema` de cada curso SGA antes do
  formulário enxuto (20 perguntas; PRF ADM tinha 18). Serve para reverter:
  `update public.courses set questionnaire_schema = '<s do curso>'::jsonb where id = '<id>';`
  Só voltar depois de reverter também o código (`compactQuestionnaire` aceita os dois formatos).
