# Memória do projeto para IAs (SGA — plataforma-metas)

Esta pasta é a **fonte de verdade operacional** para qualquer IA ou pessoa que trabalhe
no projeto. O `AGENTS.md` (raiz) traz as regras técnicas de código; aqui ficam as regras
de operação, o estado atual, as decisões e as lições aprendidas com alunos reais.

Leia nesta ordem antes de qualquer tarefa:

| Arquivo | Para que serve |
|---|---|
| [01-regras.md](01-regras.md) | Regras invioláveis (dados, alunos, conteúdo, e-mail, publicação) |
| [02-arquitetura.md](02-arquitetura.md) | Como o sistema funciona hoje, limites de infraestrutura e capacidade medida |
| [03-dados.md](03-dados.md) | Tabelas, o que cada uma guarda, dados pessoais e retenção |
| [04-cursos-e-ofertas.md](04-cursos-e-ofertas.md) | Cursos, produtos e ofertas Hotmart (retrato datado; o banco é a verdade) |
| [05-runbooks.md](05-runbooks.md) | Procedimentos prontos: suporte a aluno, cadastro de oferta, deploy, migração |
| [06-decisoes.md](06-decisoes.md) | Registro de decisões com data e motivo |
| [07-incidentes-e-licoes.md](07-incidentes-e-licoes.md) | O que deu errado, causa e o que mudou |
| [08-pendencias.md](08-pendencias.md) | Trabalho em aberto e próximos passos combinados |

## Como manter esta memória

- **Toda mudança relevante atualiza a memória no mesmo PR**: nova regra → `01`; nova
  peça ou limite → `02`; nova coluna/tabela → `03`; nova oferta/curso → `04`; novo
  procedimento → `05`; decisão do usuário → `06`; incidente → `07`; item concluído ou
  criado → `08`.
- Escreva **data (AAAA-MM-DD) e motivo**. Nunca apague histórico de `06` e `07`:
  marque como "substituída por" quando mudar.
- **Sem dados pessoais**: nada de nome, e-mail, CPF ou telefone de aluno; nada de
  senhas, tokens, chaves ou HOTTOK. Use IDs técnicos quando precisar.
- Retratos de dados (ex.: ofertas, contagens) envelhecem: indique a data e confira no
  banco antes de agir.
- Se a memória contradizer o código ou o banco, **o código/banco vence**; corrija a
  memória e avise o usuário.
