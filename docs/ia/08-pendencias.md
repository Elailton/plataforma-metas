# 08 — Pendências (atualizado em 2026-10-28)

Ordem sugerida. Marcar com data quando concluir e mover a lição para `07` se houver.

## Acesso e compras
1. ~~Texto do e-mail de acesso~~ — **concluído em 2026-10-28** (templates aplicados no
   Supabase e versionados em `supabase/templates/`).
2. ~~Guardar o e-mail do comprador~~ e 3. ~~"Compra concluída" cria acesso~~ —
   **concluído em 2026-10-28** (migração `20261028000100` aplicada; Fase B).
4. ~~Botão "Reprocessar compras pendentes"~~ — **concluído em 2026-10-28** (Fase C).
5. Revisar credenciais da API de vendas da Hotmart (400 em todas as consultas).
6. Decidir se "Encontrar minha compra" volta às telas (hoje só por URL).
7. Parte 2 ("Reenviar acesso" só com e-mail): adiada; reavaliar após 1–4.

## Lançamento dos cursos novos (PRF, PMCE, PPCE, CFO PMCE)
- Metas, Meta 0 e publicação. **Perguntar o grupo antes de lançar.**
- Confirmar na primeira venda de cada um que o ucode está certo.

## Segurança, LGPD e operação
- Aviso de privacidade (dados coletados, finalidade, fornecedores nos EUA, contato do
  titular) — exige validação jurídica.
- Regras do banco para metas futuras: hoje um aluno consegue ler pela API itens e
  materiais de metas ainda não liberadas do próprio curso/grupo (a tela esconde).
- Converter variáveis sensíveis da Vercel (service role, JWT secret, URLs do Postgres)
  para o tipo "Secret" e restringir a produção, numa janela de baixo uso.
- Limite global do reenvio (120/h) pode barrar pedidos legítimos em pico.
- Firewall/limites de taxa na Vercel para `/auth/*`.
- Conferir backups/PITR do Supabase.
- Teste de carga repetível se o volume superar muito o previsto.
