# Bloqueio administrativo por curso

## Regra

Um bloqueio aberto em `course_access_blocks` impede o acesso daquele aluno àquele
curso, independentemente das compras ou concessões manuais. Não cancela compra,
não envia reembolso, não apaga conta/progresso e não altera outros cursos.

Prioridade de reconciliação:

1. Bloqueio administrativo aberto: matrícula `suspended`.
2. Sem bloqueio, qualquer compra/concessão `active`: matrícula `active`.
3. Sem direito ativo, algum direito `suspended`: matrícula `suspended`.
4. Sem direito ativo/suspenso: matrícula `revoked`.

Eventos Hotmart continuam atualizando seus próprios entitlements durante um
bloqueio. Nenhum evento remove o bloqueio. Desbloquear apenas recalcula os direitos
atuais: um reembolso ocorrido durante o bloqueio pode deixar o curso sem acesso.

## Operação no painel

Admin → Cursos → curso → Alunos:

- **Acesso efetivo**: resultado final que o aluno tem.
- **Compras Hotmart**: quantidade por status, sem expor transações ou dados do comprador.
- **Concessão manual**: direito independente. Suspenso é pausa; revogado encerra
  aquele direito. Nenhum deles vence uma compra ativa.
- **Bloquear neste curso / Desbloquear**: confirmação com motivo (3–500 caracteres).
  Não inclua informações sensíveis. O motivo atual, responsável e data são visíveis
  somente no painel administrativo. O banco preserva todos os episódios, incluindo
  o motivo, data e responsável pelo desbloqueio.

Após confirmação, o painel atualiza os dados e informa o resultado efetivo.
Ao recarregar/navegar, o aluno perde o curso bloqueado. Se não houver outro curso
publicado com acesso ativo, cai em `/auth/sem-acesso`. Não é necessário encerrar
a sessão inteira. RLS protege as novas consultas e alterações de progresso;
conteúdo já carregado/baixado e arquivos externos públicos não podem ser recolhidos.
Não há notificação em tempo real para apagar uma página já renderizada sem interação.

## Publicação (banco antes do código)

1. Confirmar backup/recuperação disponível do Supabase de produção.
2. Aplicar somente a nova migration
   `supabase/migrations/20260904000100_admin_course_access_blocks.sql`, após as três
   migrations de 20260901 já existentes. Não reaplicar migrations antigas nem zerar banco.
3. A migration é transacional, cria uma tabela vazia e substitui funções sem modificar
   contas, direitos, matrículas ou progresso existentes. Não bloqueia ninguém por padrão.
4. Fazer merge da branch revisada e deploy na Vercel. O código novo depende da tabela/RPC;
   se a migration faltar, a consulta administrativa falha explicitamente.
5. Validar abaixo com aluno/curso de teste, mantendo as contas protegidas.

Não há novas variáveis de ambiente, chaves ou configurações Hotmart/Supabase Auth.
Continuam as existentes: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `HOTMART_HOTTOK` e `SITE_URL` de produção.
O webhook, mapeamentos, eventos selecionados e primeiro acesso não mudam.

## Verificação após deploy

1. Aluno com compra ativa e progresso: bloquear pelo painel, conferir o motivo e badge.
2. Recarregar como aluno: curso some; URL direta de meta bloqueada não entrega conteúdo.
3. Outro curso válido continua disponível; outro aluno do mesmo curso não é afetado.
4. Conceder acesso manual enquanto bloqueado: permanece bloqueado e mensagem explica.
5. Desbloquear com direito válido: acesso/progresso retornam.
6. Sem direito válido: desbloquear não concede matrícula ativa.
7. Em homologação, nova aprovação e reembolso durante o bloqueio atualizam a compra,
   mas nunca removem o bloqueio. Conferir reembolso automático real separadamente.

Consulta de auditoria (SQL Editor/admin, somente leitura):

```sql
select id, user_id, course_id, reason, blocked_by, blocked_at,
       release_reason, released_by, released_at
from public.course_access_blocks
order by blocked_at desc;
```

Motivos não são disponibilizados ao aluno. `authenticated` possui apenas SELECT
sob RLS de admin; INSERT/UPDATE/DELETE diretos são negados. A RPC valida admin,
perfil student, par matrícula/curso e motivo, usando `auth.uid()` como responsável.

## Testes automatizados e limites

`pnpm test` inclui os testes existentes e SQL real em PostgreSQL/WASM (PGlite),
sem acessar Supabase de produção ou enviar e-mails. A fixture implementa só o
esquema Auth necessário. A extensão pgcrypto é omitida nessa fixture pois
`gen_random_uuid` já está disponível; o restante das migrations é executado sem alterações.
Testes cobrem RLS, ID inválido, papel admin/student/anon, preservação de dados,
prioridade do bloqueio, compras novas/antigas, direitos manuais, desbloqueio e auditoria.
PGlite é somente devDependency, não participa do aplicativo ou do webhook.
Não simula múltiplas conexões concorrentes, entrega de e-mail, cache de navegador
nem o ambiente Supabase inteiro. Os locks têm ordem consistente aluno/curso antes
das escritas, revisada no SQL; concorrência real deve ser confirmada em homologação.

## Rollback seguro

- Se a migration falhar, sua transação reverte; investigar o erro, sem apagar tabelas.
- Se o novo painel falhar, restaurar o deploy anterior na Vercel, mantendo a migration.
  Ela é compatível com as assinaturas anteriores e mantém os bloqueios protegidos.
- O painel antigo não oferece desbloqueio. Preferir corrigir/republicar o novo painel;
  se necessário, usar a mesma RPC sob sessão administrativa autenticada e registrar motivo.
- Não remover a tabela, restaurar reconciliação antiga, mudar `enrollments.status`
  diretamente ou apagar bloqueios: isso pode liberar acessos indevidos e perder auditoria.
- Qualquer retirada definitiva da funcionalidade exige outra migration revisada,
  decisão explícita sobre bloqueios ativos e preservação do histórico.
