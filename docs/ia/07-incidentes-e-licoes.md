# 07 — Incidentes e lições aprendidas

Formato: data — o que aconteceu — causa — o que mudou / lição.

| Data | O que aconteceu | Causa | O que mudou / lição |
|---|---|---|---|
| 2026-09-03 | Convite falhou por limite de e-mail | SMTP padrão do Supabase | SMTP próprio (Resend) configurado |
| 2026-10-10 a 10-16 | Reenvios com status `failed` | Consulta à API de vendas da Hotmart falhando | Reenvio deixou de consultar a API (decisão de 10-16) |
| 2026-10-16/17 | 20 compras do PMPE com SGA só com evento "compra concluída" (sem "aprovada") | Aprovações anteriores ao webhook do PMPE | Lição: aprovação perdida deixa o aluno de fora; ver pendência "COMPLETE" |
| 2026-10-20 | 12 compras do GMF (`fx39ie5v`) ignoradas | Produto sem mapeamento ativo na hora da venda | Lição: cadastrar produto/oferta **antes** de vender; sem e-mail guardado não dá para reprocessar |
| 2026-10-21 | 12 convites com erro 500 do Auth numa rajada de compras | Auth com só 10 conexões | Conexões do Auth em 25 % (10-27); Hotmart reenviou |
| 2026-10-21 a 10-27 | Liberações manuais quase diárias (60 de 71 sem compra registrada) | Compras de ofertas "sem SGA", e-mail diferente, compras antes do cadastro | C/D/E de autoatendimento (10-27); ofertas cadastradas (10-28) |
| 2026-10-26 | Celular quebrava a formatação do diagnóstico | URL longa dentro de `fieldset` | `min-w-0` e quebra de palavras; revisar telas em 320/375 px |
| 2026-10-27 | Pico de 5.527 requisições em 12 min | Uma única sessão (conta de teste) navegando; proxy consulta perfil/matrícula a cada navegação/prefetch | Lição: separar tráfego de teste antes de concluir sobre carga |
| 2026-10-27 | Plano Vercel Hobby com 58 % da CPU mensal usada | Plano gratuito em uso comercial | Upgrade para Pro |
| 2026-10-27 | Alunos "não recebem o e-mail" | Resend mostra 100 % entregue: o aluno não reconhece (assunto "Redefina sua senha", spam, Hotmail) | Telas com orientação; pendência: trocar texto do e-mail |
| 2026-10-27 | Merge publicado apesar de o usuário interromper | A chamada de merge já tinha rodado | Lição: interrupção = não publicar; reverter na hora e avisar |
| 2026-10-27 | Branch do Supabase com "MIGRATIONS_FAILED" | Várias mudanças de produção foram feitas por SQL fora do histórico de migrações | Lição: o histórico de migrações não reproduz produção; para testes, copiar o esquema real |
| 2026-10-27 | API de vendas da Hotmart responde 400 em todas as consultas | Credenciais/permissões da conta Hotmart | "Encontrar minha compra" usa os registros do webhook primeiro; revisar credenciais |
| 2026-10-28 | "Encontrar minha compra" mandava ao suporte uma compra "curso apenas" de curso em rascunho | Filtro de curso publicado aplicado também à explicação | Corrigido (PR #81) |
