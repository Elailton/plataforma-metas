# 17 — PDF individual de correção de redação

Revisado em: 2026-11-11.

## Pedido e escopo
O usuário autorizou o caminho Relatório → Redações → Análise da redação → baixar PDF,
com lançamento direto no Grupo 1 e aviso somente ao dono da redação corrigida.
Não alterar notas, função `nota_geral`, outros alunos ou outros cursos. Sem e-mail/push.

## Implementação
- Bucket privado `essay-feedback-reports`, até 3 MB, PDF apenas, nomes de arquivo só com UUIDs.
- Professor publica PDF na fila de correção após a nota; cada versão usa arquivo novo.
- Tabela `mini_quiz_essay_reports` liga arquivo à redação e ao público escolhido no admin.
- RLS exige dono, matrícula ativa, curso publicado, público permitido e redação corrigida.
- Aviso na tela inicial só para quem tem PDF próprio ainda não visto. Abrir a análise
  marca a versão como vista; prefetch não marca. PDF continua no Relatório.
- Download autenticado por rota sem cache, sem endereço público e sem service_role.
- Troca concorrente usa comparação do caminho anterior; preserva arquivos anteriores.

## Validação e lançamento
Testar SQL real em PGlite: dono/outro aluno, curso/grupo, bloqueio, status, upload admin,
publicação inválida, reenvio, leitura e troca de versão. Executar testes, tsc e build.
Revisão de segurança pelo Codex documentada no PR; a revisão exigida pelo Claude
continua pendente antes de merge/aplicação. Nenhuma migração de produção pelo Codex.
Após aprovação: Claude revisa/aplica migração, publica o código e anexa o PDF correto
pelo painel para a redação autorizada, público Grupo 1. Conferir conta destinatária.
