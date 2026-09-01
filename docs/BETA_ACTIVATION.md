# Ativação do beta

Este documento é o checklist operacional para ativar a plataforma sem depender da conta Hotmart.

## Dados protegidos

- Não excluir nem recriar o administrador existente.
- Não excluir nem recriar o aluno de teste existente.
- Não alterar as senhas dessas contas.
- Não limpar `auth.users`, `profiles`, `enrollments` ou o histórico de progresso.

## Banco

1. Fazer backup do projeto Supabase existente.
2. Aplicar, em ordem, as migrações de `supabase/migrations`.
3. Confirmar que `student_goal_item_completions` foi criada com RLS ativa.
4. Confirmar que o administrador mantém `profiles.role = 'admin'`.
5. Confirmar que o aluno mantém `profiles.role = 'student'`.

## Preparação da GMF

1. Entrar com o administrador.
2. Criar ou abrir o curso GMF existente.
3. Cadastrar disciplinas e tópicos do edital.
4. Cadastrar materiais.
5. Criar ao menos uma meta com itens e publicá-la.
6. Publicar o curso.
7. Abrir a aba **Alunos**, informar o e-mail da conta de aluno existente e selecionar **Liberar acesso**.
8. Confirmar que a matrícula está `active`.

A matrícula manual é uma ferramenta temporária do beta. Ela não cria usuário, não altera senha e não aceita contas administrativas.

## Resultado esperado para o aluno

- Com apenas a GMF ativa, o aluno vê somente a GMF.
- Com GMF e PRF ativas, o seletor mostra os dois cursos e mantém os dados separados.
- Ao suspender ou revogar uma matrícula, o curso deixa de aparecer imediatamente.
- Ao reativar a matrícula, o curso volta e o progresso anterior permanece.
- O aluno vê somente metas publicadas.
- A conclusão de um item persiste após atualizar a página ou entrar novamente.
- Um tópico repetido em várias metas conta apenas uma vez no progresso do edital.

## Vercel

Configurar:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SITE_URL`

`HOTMART_HOTTOK` pode permanecer ausente enquanto a integração não for ativada. O endpoint responderá como não configurado e não processará compras.

Depois de alterar variáveis, executar um novo deploy da `main`.

## Validação

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm exec tsc --noEmit
pnpm build
```

Executar um teste manual completo com as contas preservadas:

1. login do administrador;
2. criação e publicação de conteúdo;
3. matrícula manual do aluno na GMF;
4. login do aluno;
5. conclusão de um item;
6. atualização da página;
7. suspensão da matrícula pelo administrador;
8. confirmação de que a GMF sumiu para o aluno;
9. reativação e confirmação de que o progresso voltou.

