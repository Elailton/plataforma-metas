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

## Cópia automática para conferência (pedido de 11/11/2026)
Cada PDF publicado deve gerar uma entrega separada à conta de teste protegida.
Usar configuração administrativa por UUID, nunca e-mail/senha no código ou na memória.
A cópia tem identidade e leitura próprias e usa o PDF privado original; abrir a cópia
não marca a entrega real como lida. Não criar tentativas, respostas ou notas artificiais.
A conta configurada só vê cópias no curso em que possui matrícula ativa no Grupo 3.
Não estender esse privilégio a todas as contas de teste nem a alunos comuns.
Sincronizar publicações futuras e incluir a devolutiva já publicada. Outros cursos
exigem a matrícula de teste correspondente; nenhuma matrícula ou senha é alterada.
Plano técnico: tabela privada de destinatário, tabela de cópias, trigger de publicação,
RPC de leitura mínima, permissão de Storage restrita à cópia e integração no mesmo
caminho Relatório → Redações, com lembrete independente. Revisão, SQL real, CI e deploy.

### Cópia publicada e conferida em 11/11/2026
PR #134 mesclado, produção READY no commit `4170581`, migração aplicada e conta
protegida configurada por UUID no banco. A devolutiva existente está na conta de
teste, com nota/comentário/PDF e aviso independente. Conferir selecionando o curso
correspondente antes de abrir Relatório → Redações.
Configuração administrativa preencheu as cópias antigas sem alterar a redação real
ou o total de tentativas da conta de teste. RLS real negou outro aluno; API negou
anônimo. A publicação foi autorizada expressamente após informação de CI remoto
preso na fila; testes locais e build passaram, sem alegar execução remota aprovada.
