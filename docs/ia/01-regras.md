# 01 — Regras invioláveis

A plataforma está **em produção com alunos pagantes**. Na dúvida, não faça: pergunte.
Regras técnicas de código (matrículas, RLS, webhook, segredos) estão no `AGENTS.md`.

## 1. Dados e banco de produção (Supabase `cbryvevesiaoqmwwlnet`)

1. **Nada destrutivo.** Proibido DELETE/TRUNCATE/DROP/UPDATE em massa sobre dados de
   alunos (perfis, matrículas, progresso, tentativas, questionários, compras). Arquivar
   em vez de excluir. Exceção só com pedido explícito do usuário, para um caso nomeado
   (ex.: "reinicie as metas do aluno X"), e registrando em `07`.
2. **Migrações**: preparar o arquivo em `supabase/migrations/` com o SQL de reversão no
   cabeçalho; o usuário roda no SQL Editor; depois conferir por consulta. Só migrações
   aditivas/não destrutivas, salvo pedido explícito.
3. **Testes de permissão/RLS em produção** só dentro de transação desfeita
   (`begin; ... rollback;`) ou somente leitura (`begin read only`).
4. **Teste de carga e dados sintéticos** só em banco separado (branch do Supabase),
   nunca em produção; apagar o branch ao terminar.
5. Antes de qualquer ação com custo (branch, compute, plano), apresentar custo,
   impacto e plano, e esperar autorização.

## 2. Alunos e comunicação

6. **Nada de e-mail em massa.** Qualquer envio que alcance vários alunos precisa de
   confirmação explícita do usuário, com a contagem exata antes.
7. **Orçamento de e-mail**: Resend no plano gratuito — **100 e-mails/dia, 3.000/mês**
   (decisão de 2026-10-28: não haverá upgrade). Supabase Auth limitado a 100/h.
   Nenhuma funcionalidade pode disparar envios em lote sem respeitar esse orçamento.
8. **Nunca mostrar ao aluno o número do grupo** (G1/G2/G3) nem a palavra "grupo".
9. Contas protegidas: a conta do administrador e a conta de teste do administrador
   (aluno do Grupo 3). Não excluir, recriar nem trocar senha.
10. **Nunca digitar senhas** em campos; usar só sessões já logadas. Se o usuário
    colar uma senha no chat, não usar e lembrar de trocá-la.
11. Não guardar nem repetir dados pessoais de compradores vindos de payloads colados
    (CPF, endereço, telefone). Só e-mail quando estritamente necessário.
12. Resposta pública nunca revela se um e-mail tem conta, matrícula ou compra.

## 3. Conteúdo pedagógico

13. **Antes de lançar qualquer conteúdo ou função, perguntar em qual grupo** (1, 2, 3
    ou combinação). Fluxo: lança no Grupo 3 → usuário confere com a conta de teste →
    libera para 1/2.
14. **Nunca misturar conteúdo de cursos** (PMPE, GMF, PRF, PMCE, CFO PMCE, PPCE).
15. **Só questões reais de prova** no Diagnóstico Semanal, com fonte. Questão inédita
    só quando o usuário autorizar, marcada com a linha `[[inedita]]` (selo "Inédita").
16. Explicações são próprias (não copiar comentários de professores do Qconcursos).
16a. **Diagnóstico Semanal só libera após a CONCLUSÃO da meta que fecha o bloco**
    (Metas 01–07 → concluir a Meta 07; 08–14 → Meta 14; 15–21 → Meta 21...). Todo
    diagnóstico novo nasce com `unlock_goal_id` = a meta que fecha o bloco **do grupo
    daquela versão** e `release_date` = data dessa meta. Questões só de assuntos estudados
    no bloco; questão contestável ou fora do assunto vira inédita (com autorização).
17. Não alterar regras comerciais, ofertas, conteúdo pedagógico ou progresso sem
    necessidade demonstrada e pedido do usuário.

## 4. Código e publicação

18. Trabalhar em branch; PR via `gh`; CI `validate` (testes, `tsc`, build) obrigatório.
19. **Perguntar antes de mesclar/publicar**, exceto quando o pedido do usuário já for
    "faça e publique". Se o usuário interromper um merge, tratar como "não publicar".
20. Funcionalidade nova voltada ao aluno pode ir ao ar **escondida** (sem links) para
    o usuário testar por URL antes de expor.
21. Toda mudança com risco tem caminho de reversão descrito (Rollback da Vercel,
    revert do PR, SQL de reversão).
22. Atualizar esta memória (`docs/ia/`) no mesmo PR da mudança.

## 5. Segurança e LGPD

23. Segredos só no servidor (Vercel), nunca em `NEXT_PUBLIC_*`, nunca em log, nunca no
    repositório. Não trocar/girar chaves às pressas: `SUPABASE_JWT_SECRET` derruba todas
    as sessões.
24. Dados pessoais: guardar o mínimo, com finalidade e prazo (ver `03-dados.md`).
    Não declarar conformidade com a LGPD; apontar lacunas e o que exige jurídico.
25. Links de acesso gerados pelo admin são de uso único e nunca vão para log.
