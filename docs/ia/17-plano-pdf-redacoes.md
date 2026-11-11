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
- Aviso de privacidade atualizado: PDF individual e primeira abertura para controlar lembrete.
- Troca concorrente usa comparação do caminho anterior; preserva arquivos anteriores.

## Validação e lançamento
Testar SQL real em PGlite: dono/outro aluno, curso/grupo, bloqueio, status, upload admin,
publicação inválida, reenvio, leitura e troca de versão. Executar testes, tsc e build.
Revisão de segurança pelo Codex documentada no PR. Em 11/11 o usuário esclareceu que
a revisão pode ser feita pelo assistente responsável, sem exclusividade do Claude,
e autorizou migração e publicação após a revisão. Conferir CI e estado de produção.
Aplicar a migração aditiva, publicar o código, anexar o PDF recebido à redação autorizada
para Grupo 1 e conferir acesso exclusivo do destinatário, mantendo o lembrete não lido.

## Publicado em 11/11/2026
PR #132 mesclado, CI aprovado, migração aplicada pela API do Supabase e produção
READY no commit `6bcd194`. Primeiro PDF anexado somente ao destinatário autorizado,
público Grupo 1. Teste RLS de produção, em transação somente leitura: dono vê arquivo
e relatório; outro aluno não vê. Bucket privado, SHA-256 do download igual ao original.
O aviso permaneceu não lido na conferência, sem consumir a notificação em teste.
Sem e-mail/push e sem alterar notas ou habilitar `nota_geral` para outros públicos.
