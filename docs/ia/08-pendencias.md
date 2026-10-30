# 08 — Pendências (atualizado em 2026-10-30)

Ordem sugerida. Marcar com data quando concluir e mover a lição para `07` se houver.

## Metas dos SGA novos (PRF, PMCE, CFO, PPCE)
- Metas 01–05 publicadas (29/10). Restante (~100 metas por curso) aguardando o usuário dizer
  **"executar metas"**: plano completo em `metas-novas/PLANO.md`.

## Provas anteriores e preparação direcionada (planejamento de 2026-10-30, nada executado)
Pedido do usuário. Só executar com autorização, perguntando o grupo (Grupo 3 primeiro) e o
curso a cada lançamento. As provas estão nas pastas GMF, PRF, PMCE, CFO - PMCE, PMPE e PPCE
do computador do usuário (Downloads). Tudo por `courseId`, só questões reais, sem misturar cursos.

Provas conferidas nos PDFs dos gabaritos definitivos e na web (banca, data, total de
questões, anuladas pela banca; anulações judiciais individuais não entram):

| Curso | Prova | Aplicação | Questões | Anuladas |
|---|---|---|---|---|
| PMPE | Soldado, AOCP, tipo 1 | 28/01/2024 | 60 | nenhuma |
| GMF | Guarda Municipal, IDECAN, tipo A | 18/06/2023 | 80 | 29, 46, 76 |
| PMCE | Soldado QPPM, CEV/UECE, gabarito 1 | 13/07/2025 | 100 | 9, 37, 57, 90 |
| CFO PMCE | 2º Tenente QOPM, IDECAN, tipo B | fev/2023 | 100 | 17, 19 |
| PPCE | Policial Penal, IDECAN, tipo B | 14/07/2024 | 90 | 13, 42, 82, 83 |
| PRF | Parte comum, Cebraspe, 578_PRF_001_01 | 2021 | 112 (itens 9–120) | 39, 45, 67, 69, 76, **83**, 89, 98, 99 |
| PRF | Inglês 578_PRF_ING_01 / Espanhol 578_PRF_ESP_02 | 2021 | 8 cada | item 1 de cada |

Na PRF cada prova completa tem 10 anuladas (9 comuns + 1 do idioma). A lista enviada pelo
usuário trazia o item 82 na parte comum; o gabarito definitivo anula o 83. O gabarito do PMPE
só traz as letras (sem a palavra "definitivo"): confirmar antes de usar.

Requisitos (R1–R7):
1. **R1** Todo Diagnóstico Semanal leva no mínimo 5 questões da prova anterior do curso, só de
   assuntos cobrados nela e estudados no bloco; selo "Prova anterior" (banca, ano, cargo);
   o aluno vê o desempenho nelas; nunca anuladas; sem repetir questão entre diagnósticos.
2. **R2** Banco de questões por curso (provas anteriores e questões dos diagnósticos, com
   origem, disciplina, tópico, banca, ano e bloco) para o simulado geral, que fica para depois.
   Nada é apagado; gabarito fora do alcance do aluno (RLS).
3. **R3** Metas de reta final: tipo próprio, criadas à mão, apresentação visual diferente.
4. **R4** Card "caiu na última prova" nos tópicos do edital cobrados (anuladas não contam).
5. **R5** Tempo estimado das metas: hoje existe **só como texto** na descrição ("Meta de ~3h":
   365 de 366 metas do GMF e 158 de 170 do PMPE). Preservar; coluna nova só se um painel exigir.
6. **R6** Trilha prioritária (selo "prioridade" marcado pelo mentor; o sistema só sugere
   tópicos de importância alta e os cobrados na última prova). Painel "Meu mapa do edital"
   dentro da aba Edital que já existe: escala das metas, cobertura por incidência e da trilha.
7. **R7** Cadernos do Qconcursos: aplicar o filtro de área policial sempre que restarem 30
   questões ou mais; abaixo disso manter genérico e registrar a contagem. Metas já publicadas
   só mudam com aprovação, preservando conclusões (`admin_save_goal`).

Ordem: banco e extração (R2) → mapeamento por tópico → card (R4) → diagnósticos com R1 →
trilha e painel (R6) → reta final (R3). R7 é independente (só metas novas).

Decisões em aberto: as 5 questões contam dentro do total do diagnóstico ou são extras? Os 8
diagnósticos já publicados recebem as 5 questões? Quando a reta final libera (data, conclusão
ou direto para quem compra tarde) e onde aparece (seção em Minhas Metas ou aba nova)? Assunto
cuja única questão foi anulada ganha o card (proposta: não)? Cadernos publicados: auditar ou
só metas novas?

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
- ~~Aviso de privacidade e termos de uso~~ — publicados em `/privacidade` e `/termos`
  (2026-10-28), preenchidos com dados públicos do CNPJ. **Ainda exigem validação jurídica**:
  menores de idade, prazo de 5 anos, DPAs dos fornecedores (Res. CD/ANPD 19/2024), registros
  de acesso por 6 meses. Endereço (Av. Carneiro de Mendonça, 340, Fortaleza/CE) e e-mail
  (cursoprofericklima@gmail.com) informados pelo usuário em 2026-10-28. A política do site de
  vendas só cita direitos europeus: o advogado deve alinhá-la à LGPD.
- Plano de resposta a incidente (prazo de 3 dias úteis à ANPD), registro de operações de
  tratamento e rotina de anonimização após 5 anos.
- Regras do banco para metas futuras: hoje um aluno consegue ler pela API itens e
  materiais de metas ainda não liberadas do próprio curso/grupo (a tela esconde).
- Converter variáveis sensíveis da Vercel (service role, JWT secret, URLs do Postgres)
  para o tipo "Secret" e restringir a produção, numa janela de baixo uso.
- Limite global do reenvio (120/h) pode barrar pedidos legítimos em pico.
- Firewall/limites de taxa na Vercel para `/auth/*`.
- Conferir backups/PITR do Supabase.
- Teste de carga repetível se o volume superar muito o previsto.
