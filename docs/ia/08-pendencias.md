# 08 — Pendências (atualizado em 2026-10-30)

Ordem sugerida. Marcar com data quando concluir e mover a lição para `07` se houver.

## Metas dos SGA novos (PRF, PMCE, CFO, PPCE)
- Metas 01–05 publicadas (29/10). Restante (~100 metas por curso) aguardando o usuário dizer
  **"executar metas"**: plano completo em `metas-novas/PLANO.md`.

## Provas anteriores e preparação direcionada (planejamento de 2026-10-30, regras INATIVAS)
**Gatilho:** nada desta seção vale nem é executado até o usuário dizer **"executar provas
anteriores"** (como "executar metas"). Sem o gatilho, só registrar e conversar.
Pedido do usuário. Ao acionar, perguntar o grupo (Grupo 3 primeiro) e o curso a cada
lançamento. As provas estão nas pastas GMF, PRF, PMCE, CFO - PMCE, PMPE e PPCE
do computador do usuário (Downloads). Tudo por `courseId`, só questões reais, sem misturar cursos.

Provas conferidas nos PDFs dos gabaritos definitivos e na web (banca, data, total de
questões, anuladas pela banca; anulações judiciais individuais não entram):

| Curso | Prova | Aplicação | Questões | Anuladas (excluídas por completo) |
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
4. **R4** Card "caiu na última prova" nos tópicos do edital cobrados (anuladas nem existem
   no banco, então não geram card).
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

Decidido pelo usuário em 2026-10-30:
- **Escopo do R1:** as questões da prova anterior entram primeiro **só nos diagnósticos recém-criados**:
  PMPE Metas 15–21 e GMF Metas 01–07 (versões G1 e G2 de cada). Os demais diagnósticos
  publicados não mudam. Depois, a prova anterior ganha uma **aba separada** (formato a definir
  quando o usuário pedir).
- **Anuladas:** questão anulada não entra em nada. Não é extraída, não vai ao banco, a
  diagnóstico, a card nem a contagem. Os números anulados ficam só como lista de auditoria.
- **Auditar** (só relatório, sem alterar nada): (a) conferir que nenhuma anulada existe no
  banco nem nos diagnósticos (inclusive se alguma questão já publicada vem de uma dessas
  provas); (b) listar os cadernos já publicados que poderiam usar o filtro policial (R7);
  troca de caderno em meta publicada só com aprovação.

Também decidido (2026-10-30): as 5 questões da prova anterior **contam dentro do total** do
diagnóstico, não são extras. Apenas **substituem** questões atuais: o total e a metade por
disciplina não mudam. A questão trocada é da mesma disciplina e, sempre que possível, do mesmo
assunto; a removida é arquivada, nunca apagada.

Também decidido (2026-10-30): a **reta final (R3) é só do PMPE** e libera **quando faltarem
30 dias para a prova** (regra por data). Quem compra depois desse ponto já a encontra liberada,
sem ter de concluir as metas regulares. A data da prova do PMPE ainda não foi definida; quando
sair, ela vira o parâmetro da liberação. Outros cursos não têm reta final até nova ordem.

Também decidido (2026-10-30): a reta final aparece numa **aba nova** no menu do aluno (só
PMPE, só depois da liberação). Na implementação, tratá-la como função de
`course_group_settings` (ligar/desligar por grupo) e nunca mostrar o grupo ao aluno.

Data da prova do PMPE conhecida (2026-10-30): **21/02/2027** (prevista, AOCP). Com a regra
de 30 dias, a reta final do PMPE abriria em **22/01/2027**. Se a AOCP mudar a data, a
liberação acompanha. Acesso do SGA: 1 ano (ver `04`).

Sem decisões em aberto. Falta só o gatilho do usuário.

## Contador da prova na tela inicial (pedido do usuário em 2026-10-30, não construído)
- Na tela inicial do aluno, o curso mostra **quanto tempo falta para a prova** (só o PMPE,
  que é o único curso com data por enquanto).
- Orientado por `courseId`, sem regra específica do PMPE: campo de data da prova no curso
  (migração aditiva, com reversão), editável pelo administrador nas configurações do curso;
  o contador só aparece para curso com data preenchida e some depois da prova. Esse mesmo
  campo é o parâmetro da liberação da reta final (30 dias antes).
- Mostrar "prevista" enquanto a banca não confirmar. Nunca mostrar o grupo ao aluno.
- Antes de lançar, perguntar o grupo (Grupo 3 primeiro) e conferir com a conta de teste.

## Site de vendas (fora do repositório, ação do usuário)
- Trocar "Acesso ao SGA válido até a data da prova" por **1 ano**.
- Revisar promessas que a plataforma não cumpre hoje: "metas personalizadas conforme sua
  rotina" (hoje são 2 grupos), "diagnóstico mensal"/"simulados mensais"/"5 simulados com
  ranking" (hoje é o Diagnóstico Semanal). Levar ao advogado junto com os textos legais.

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
- Revisão de 2026-10-30 (aviso atualizado: Vercel Web Analytics e conteúdo real do
  questionário; links legais também na tela de código e no primeiro acesso; o Analytics
  passou a cortar parâmetros e `#` das URLs, porque o link `/auth/confirm?token_hash=…` ia
  inteiro para a Vercel). **Levar ao advogado:**
  1. Perguntas do questionário sobre cansaço, concentração e preparação física: são dado de
     saúde (dado sensível, art. 11)? Se forem, a base "execução de contrato" não serve.
  2. O aviso afirma adendos/cláusulas "firmados com cada fornecedor" (Supabase, Vercel,
     Resend): confirmar que existem antes de manter a frase.
  3. Hotmart descrita como prestadora "em nosso nome": no pagamento ela age por conta própria.
  4. Prazos de 5 anos e 6 meses (registros de acesso): confirmar.
  5. Aceite expresso dos Termos (caixa marcada com registro de data e versão) ou só links
     visíveis? Hoje os Termos dizem "ao acessar, você concorda", sem registro.
  6. O aviso promete avisar na plataforma quando mudar de forma relevante: decidir se a
     atualização de 30/10 exige aviso aos alunos (aviso da tela inicial é por grupo).
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
