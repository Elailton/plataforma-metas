# Proteção do repositório público

Um repositório público permite leitura, download e forks. Visitantes não ganham
acesso de escrita ao original. Para impedir a leitura por terceiros, é necessário
torná-lo privado; cópias anteriores não podem ser recuperadas por essa mudança.

## Configurações administrativas necessárias

Estas configurações precisam ser aplicadas no GitHub. Os arquivos deste projeto
não as ativam automaticamente.

1. Em Settings → Collaborators, revise pessoas com acesso e retenha somente os
   acessos necessários. Revise também deploy keys com escrita, GitHub Apps e
   integrações (incluindo ferramentas que criam commits automaticamente).
2. Em Settings → Rules → Rulesets, crie uma regra ativa para a branch principal
   `main`: impedir exclusão e force push, exigir pull request, resolução de
   conversas e o check `validate` do workflow `Validate beta`.
3. Restrinja bypass às identidades estritamente necessárias. Uma integração com
   permissão de bypass pode continuar alterando a branch diretamente.
4. Se houver outro revisor confiável, exija uma aprovação, revisão dos code owners,
   descarte de aprovações antigas e aprovação após o último push. O autor não pode
   aprovar o próprio PR: exigir sua própria aprovação quando você é o único
   mantenedor bloqueia seus merges. CODEOWNERS indica responsabilidade, mas não
   restringe escrita sozinho. Se for o único mantenedor, exija PR e checks sem
   aprovação obrigatória, ou defina outro revisor confiável antes de ativá-la.
5. Em Settings → Actions → General, use token com permissões de leitura, desative
   a permissão para Actions criar/aprovar PRs e exija aprovação das execuções de
   colaboradores externos. Não aprove workflow de fork sem revisar suas mudanças.
6. Em Settings → Advanced Security (ou Code security), habilite os recursos
   disponíveis de secret scanning, push protection e private vulnerability reporting.
7. Proteja a conta proprietária com autenticação de dois fatores/passkey. Revise
   sessões, tokens e aplicativos autorizados nas configurações pessoais.
8. Confira no provedor de deploy que contribuições externas não recebem segredos
   ou acesso à produção antes de revisão/autorização. Preserve as integrações
   necessárias ao funcionamento atual ao revisar os acessos.

## Alterações locais

- O CI declara `contents: read`, não persiste credenciais no checkout e tem limite
  de execução de 20 minutos.
- `.github/CODEOWNERS` indica `@Elailton` como responsável por todos os arquivos.
- `SECURITY.md` orienta o relato privado de vulnerabilidades e resposta a segredos
  expostos.

Nada disso altera permissões do Supabase, credenciais ou dados de produção.
Não use o banco com alunos para testes de segurança destrutivos. Os testes SQL/RLS
do repositório usam bancos descartáveis; aprovação desses testes não comprova que
o banco de produção está com as mesmas migrações e políticas aplicadas.
