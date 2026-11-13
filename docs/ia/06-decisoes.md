# 06 — Registro de decisões

Formato: data — decisão — motivo — status. Não apagar: marcar "substituída por".

| Data | Decisão | Motivo | Status |
|---|---|---|---|
| 2026-11-13 | Fechar o edital dos seis cursos até a Meta 90 só em metas futuras sem progresso; usar legislação/PDF + questões quando faltar aula adequada; conferir normas da PRF; manter volume integral aceitando metas mais longas | Confirmações expressas do usuário; rejeitou reduzir questões/transferir aprofundamentos a opcionais | Vigente; lote preparado em `ops/replanejamento-90/` |
| 2026-11-13 | G2 encerrado; novas liberações destinadas a G1 e teste. Seis diagnósticos de 15/11 autorizados para G1 sem antecipar data nem retirar conclusão da meta | Confirmação expressa do usuário | Vigente; banco conferido |
| 2026-09-01 | Progresso real por item e percentual do edital fazem parte do produto | Escopo do beta ampliado pelo usuário | Vigente |
| 2026-10-09 | Liberação por oferta (`authorized_offers`): só ofertas "+ SGA" liberam | Separar "curso apenas" de "curso + SGA" | Vigente |
| 2026-10-16 | Reenvio de acesso não consulta a API de vendas; casos sem matrícula vão ao suporte | API da Hotmart instável; evitar criar acesso sem prova | Vigente |
| 2026-10-21 | Diagnóstico Semanal com tentativa única, cronômetro e ranking opcional | Pedido do usuário | Vigente |
| 2026-10-22 | Grupo 3 = teste do admin; lançar primeiro no G3 | Conferência antes de liberar para alunos | Vigente |
| 2026-10-26 | Questões inéditas permitidas só com autorização, com selo "Inédita" | Repor questões com gabarito duvidoso | Vigente |
| 2026-10-26 | Questionário não editável pelo aluno; mudança só a pedido, com reinício das metas | Respostas definem o grupo e as metas | Vigente |
| 2026-10-27 | Vercel Hobby → **Pro** | Hobby proíbe uso comercial e pausa o site ao estourar CPU | Vigente |
| 2026-10-27 | Orçamento Vercel US$ 200 com alertas e **sem pausa** | Pausar tiraria o site do ar na Black Friday | Vigente |
| 2026-10-27 | Lista de metas sem materiais; materiais só na meta aberta | 84 % do tempo do banco; capacidade +70 % | Vigente |
| 2026-10-27 | Recarga da liberação espalhada em até 90 s | Evitar pico à meia-noite | Vigente |
| 2026-10-27 | Conexões do Auth em 25 % (era 10 fixas) | Erros 500 em rajada de convites (21/10) | Vigente |
| 2026-10-27 | Proteção de senha vazada **desligada** | Decisão do usuário (já discutido) | Vigente |
| 2026-10-27 | Botão admin "Copiar link de acesso" | Alunos com dificuldade de achar o e-mail | Vigente |
| 2026-10-27 | Ofertas "GMF sem SGA", "curso apenas" e "Turbo" não liberam o SGA | Regra comercial confirmada | Vigente |
| 2026-10-27 | "Encontrar minha compra" fica no ar **sem links** nas telas | Usuário quer testar antes; API de vendas recusando | Vigente |
| 2026-10-28 | Resend continua no plano gratuito (100/dia) | Volume previsto cabe; upgrade não é possível | Vigente |
| 2026-10-28 | Guardar o e-mail do comprador nos eventos da Hotmart (só e-mail, 90 dias se não virar acesso) | Permitir reprocessar compras que chegaram antes do cadastro | Vigente (Fase B, migração 20261028000100) |
| 2026-10-28 | "Reenviar acesso" só com e-mail (Parte 2) adiado | Pouco ganho frente à complexidade e ao orçamento de e-mail | Adiada |
| 2026-10-28 | E-mail de recuperação com assunto "Seu acesso ao Sistema Guiado da Aprovação" e botão "Acessar o SGA"; convite no mesmo padrão | "Redefina sua senha" confundia quem nunca criou senha | Vigente |
| 2026-10-28 | "Compra concluída" cria acesso só sem direito anterior; limpeza do e-mail pelo pg_cron | Recuperar aprovações perdidas sem tocar em parcelado em atraso/reembolso | Vigente |
| 2026-10-28 | Reprocessar compras pendentes: prévia + confirmação, ≤ 20/dia, rascunho bloqueia, e-mail parecido fica fora | Orçamento do Resend e evitar conta duplicada; não guardamos nome, então a comparação é por e-mail | Vigente |
| 2026-10-28 | Publicar Aviso de Privacidade (`/privacidade`) e Termos de Uso (`/termos`); controlador Curso Professor Erick Lima Ltda (CNPJ 52.992.972/0001-03); canal do titular = WhatsApp do suporte; guarda de 5 anos; resposta em 15 dias | Conformidade com a LGPD; textos em `lib/legal/content.ts` | Vigente (aguarda revisão jurídica) |
| 2026-10-28 | Criar esta memória (`docs/ia/`) e `CLAUDE.md` | Projeto em produção precisa de regras consultáveis por IAs | Vigente |

## 2026-10-29 — Merge sem pedir autorização
O usuário disse: "não precisa da minha autorização, pode fazer". Mudanças de código podem
ser mescladas (rebase) assim que o CI `validate` passar, informando depois o que entrou.
Continua valendo: nada destrutivo no banco, migrações rodadas pelo usuário e perguntar o
grupo antes de lançar conteúdo.

- 30/10/2026 — Diagnóstico Semanal passa a ser liberado pela **conclusão** da meta que fecha o
  bloco (Meta 07, 14, 21...), não só pela data. Coluna `mini_quizzes.unlock_goal_id` + função
  `mini_quiz_unlocked` (RLS e `start/submit`). Migração `20261030000100_mini_quiz_unlock_goal.sql`.

- 05/11/2026 — Texto associado recolhível em todas as questões (pedido do usuário): o aluno
  recolhe/expande o texto-base; marcador opcional `[[/texto]]` no fim do texto
  (`lib/mini-quizzes/statement.mjs`, `components/mini-quizzes/question-statement.tsx`). Retirado dos
  enunciados o resto de prova "Texto para as questões X a Y".

- 05/11/2026 — Texto associado compacto (pedido do usuário): parágrafos sem linha em branco entre eles,
  com recuo de primeira linha (~3 espaços); linhas quebradas da prova são unidas e a numeração de linhas
  removida na exibição (`lib/mini-quizzes/passage.mjs`). O banco não muda. Referências "(linhas X a Y)"
  retiradas dos comandos dos diagnósticos, que já citam o trecho.

- 06/11/2026 — Aba "Simulados" no menu do aluno (pedido do usuário): substitui as abas "Diagnóstico
  Semanal" e "Relatório", que viram abas internas, mantendo o visual atual (o protótipo com visual novo
  foi recusado). Libera espaço no menu do celular para o Simulado Mensal, que entrará como seção da aba.
- 06/11/2026 — "Caderno de erros" vira tela própria (`/aluno/relatorio/caderno-de-erros`), acessada por um botão em destaque no topo do Relatório; o Relatório fica com o desempenho por disciplina e assunto.
- 06/11/2026 — Seção "Mensal" (Simulado Mensal, simulado geral) na aba Simulados: tipo `kind` em `mini_quizzes` em vez de tabela nova, para reaproveitar tentativa única, cronômetro, ranking, grupos e relatório. Visível ao Grupo 3 sempre e aos alunos só depois de um simulado mensal liberado para o grupo (lançamento primeiro no Grupo 3). Migração `20261106000100_simulado_mensal.sql`, rodada pelo usuário.
- 06/11/2026 — Simulado Mensal virou **Simulado Geral**: liberado por data (14 dias com edital aberto, 30 com edital fechado), sem relação com as metas. O aluno vê os próximos fechados (no máximo 2 pendentes por tipo) por `student_upcoming_quizzes` (migração `20261106000200`), sem acesso às questões.

## 2026-11-08 — Redação opcional no Simulado Geral

- Pedido do usuário: o simulado geral fica na aba Simulados (fora das metas), com aviso na tela inicial;
  cronômetro com o tempo real da prova (PMPE: 5 h); redação opcional com tema de atualidade (IA), envio por
  foto e/ou texto colado, dois avisos de urgência antes do envio, correção em até 7 dias e resultado no
  Relatório. A correção é feita pela equipe fora da plataforma e lançada em `/admin/mini-simulados/redacoes`.
- O cronômetro regressivo não envia a prova sozinho ao zerar (evita perder respostas); mostra "Tempo esgotado".

## 2026-11-09 — Edital fecha em 90 metas; três cursos novos armazenados

- Pedido do usuário: "todos os cursos devem fechar o edital em 90 metas", ao armazenar e ao corrigir;
  primeiro um prompt mestre (`10-prompt-mestre-cursos.md`), depois segui-lo. Geração de metas fica para depois.
- Armazenados os editais de SGA - PRF ADM, SGA - GCM Itaitinga e SGA - PCCE (fichas em `cursos/`), com
  importância e questionário (q09/q13) ajustados ao edital. "Orientações iniciais" passou a ser a última disciplina.
- Importância: quando a amostra da prova no TEC é pequena (1 questão por assunto), a base passa a ser a taxa
  de cobrança das bancas enviada pelo usuário; assunto que caiu na prova anterior sobe para pelo menos "média".
- Análise dos cursos atuais em `metas-novas/ANALISE-90-METAS.md`; nenhuma meta alterada até o usuário aprovar.

## 2026-11-09 — Selo "Cobrado no último concurso"

- Pedido do usuário: card "Cobrado no Último Concurso" nos assuntos que estiveram na última prova, nas metas,
  e virar regra. Implementado como selo no item da meta e no Edital do aluno, coluna `syllabus_topics.last_exam`
  e caixa "Último concurso" no editor de edital do admin.
- Lançado como função de grupo `ultimo_concurso`, desligada nos Grupos 1 e 2 pela migração (o Grupo 3 confere
  primeiro). Cursos criados depois disso começam com a função ligada; desligar na aba Grupos se preciso.
- Mapeamento dos 9 cursos feito pelos relatórios do TEC da última prova (GCM pela prova de 2015).

## 2026-11-09 — Diagnósticos de 15/11 e fechamento da PMPE em 90 metas
- Fluxo pedido pelo usuário ("faça isso tudo nessa linha de fluxo"), prompt em `11-prompt-fluxo-novembro.md`.
- 12 diagnósticos (G1 e G2 de PMPE 29–35, GMF 15–21, PRF/PMCE/PPCE/CFO 08–14), cada um com pelo menos 5
  questões da última prova (`bank_item_id`) dentro do total. Versão G1 publicada só para `{3}`; G2 em rascunho.
- Importação das questões do Qconcursos por tabela temporária `qc_import_staging` (só INSERT anônimo com código
  de uso único, sem SELECT), removida ao fim. Motivo: o volume de enunciados não cabia na conversa.
- GMF: sem caderno de Atualidades no bloco, as 3 vagas foram para Fortaleza, Constitucional e Legislação.
- Questões de prova anterior trocadas por desatualização ou falta de legenda: PRF itens 82 e 79 (peso por eixo e
  registrador) e CFO questão 7 (alternativas em símbolos sem a legenda original).
- PMPE: Metas 82–90 criadas (01–09/01/2027) com os 7 tópicos que faltavam e revisão final; G1 em `{3}`, G2 rascunho.
- Trocas na conferência: questões de caderno fora do curso (política do Piauí), com gabarito duvidoso (Pangeia sem a
  Antártida) ou confusas (crimes em tempo de guerra) foram substituídas por outras do mesmo caderno; questão que
  repetia a da prova anterior no mesmo diagnóstico ou um diagnóstico antigo do grupo também foi trocada.
- Os 12 diagnósticos ficaram completos (gabarito e explicação em todas). Versões G1 publicadas só no Grupo 3;
  `qc_import_staging` removida em 09/11.

## 2026-11-10 — Introdução do primeiro acesso e Reta final em 45 dias

- O primeiro acesso abre com uma tela de apresentação do SGA (antes do questionário):
  edital em 90 metas, Reta final 45 dias antes da prova, Diagnóstico Semanal, até 6
  Simulados Gerais, revisão espaçada e relatório. Imagem em `public/apresentacao/sga-mockup.webp`.
- A aba Reta final passa a abrir 45 dias antes de `courses.exam_date` (antes eram 30):
  `RETA_FINAL_DAYS = 45` em `lib/courses/exam-date.mjs`.

## 2026-11-10 — Prévia do primeiro acesso no admin

- `/admin/cursos/<id>/primeiro-acesso` mostra ao administrador o mesmo formulário do aluno
  (introdução, questionário, revisão e senha), com o questionário do curso. Prop `preview`:
  nada é gravado. Botão "Prévia do primeiro acesso" ao lado de "Prévia do aluno".
- Textos do primeiro acesso: as respostas personalizam o relatório; a disponibilidade define o ritmo.
## 2026-11-10 — Pergunta 1 do questionário: mínimo de 2 horas
- O SGA fecha o edital em 90 dias, com revisão espaçada e questões organizadas automaticamente, e exige no
  mínimo 2 horas por dia. A pergunta 1 passa a ter 4 opções: 2 horas (`de_1_a_2h`), 3 horas (`de_2_a_3h`),
  4 horas (`de_3_a_4h`) e Mais de 4 horas (`de_4_a_6h`). Os códigos antigos foram mantidos, então
  `study_group_from_q01` não muda (até 4h → Grupo 1; mais de 4h → Grupo 2) e respostas antigas continuam válidas.
- A validação aceita qualquer subconjunto das faixas conhecidas, desde que tenha ao menos uma de cada grupo.
- A prévia mudou para `/previa/primeiro-acesso/<id>` (tela cheia, só administrador) e já aplica a
  Pergunta 1 padrão (`withAvailabilityStandard`), para conferir antes de atualizar o banco.
- No computador (≥ 900 px) a apresentação usa até 1120 px: texto ao lado do mockup e 3 colunas.

## 2026-11-10 — Plano de personalização aprovado (substitui a ideia de plano individual por aluno)

- Aprovado com todas as recomendações: base de 90 metas (~2h30) igual para todos num grupo só;
  formulário enxuto (horas, rotina, redação, TAF, acessos); horas viram o bloco opcional "Se sobrar
  tempo"; "Seu reforço" após cada diagnóstico; "pode acelerar" com ≥ 80% nos 2 últimos; relatório mensal.
- G2 fecha para novos alunos já (migração `20261110000100`); os 56 atuais passam ao G1 junto com os
  extras de 4h (Fase 3).
- Textos ao aluno sempre positivos; mudança de grupo nunca é citada ("metas atualizadas conforme o
  seu relatório"); aviso "O SGA foi atualizado" a cada melhoria percebida (regra 12a de `01`).
- Motivo: personalizar sem perder o controle de um plano revisado; domínio declarado é pouco
  confiável, o diagnóstico mede. Detalhes e prompts: `12-plano-personalizacao.md`.

## 2026-11-10 — Migrações aplicadas pelo Claude

- O usuário autorizou de forma permanente: "pode automatizar rodar a migração, eu não reviso pois não
  tenho conhecimento, então sempre deve ser revisado por você". O Claude revisa, testa no CI e aplica
  (`apply_migration`), confere por SQL e registra. Substitui "o usuário roda no SQL Editor".
- Primeira aplicada assim: `20261110000100_questionario_enxuto.sql`.

## 2026-11-10 — Revisão de segurança obrigatória e Fase 2

- Regra nova (pedido do usuário): toda mudança de código ou banco passa por revisão de segurança
  feita pelo Claude antes do merge/aplicação (`01-regras.md`, 4a; runbook em `05`).
- Fase 2 (grupo único) autorizada ("rode a fase 2"): o painel mostra o Grupo 2 como "encerrado" e
  explica que todo aluno novo entra no Grupo 1. Nada muda para o aluno.

## 2026-11-10 — Matriz geral fechada em 90 e Fase 3

- PMPE: Metas 82–90 (G1) liberadas para o Grupo 1 (estavam só no G3). PMPE fecha o edital na Meta 90.
- GMF: Metas 91–104 (G1) e 91–99 (G2) viraram `kind = 'reta_final'` (revisão final); plano principal em 90.
  A Reta final do GMF só abre com `exam_date` definido e a função ligada.
- PRF: itens de Língua Estrangeira (Metas 76 e 77) ganharam o caderno de Espanhol ao lado do de Inglês,
  com a orientação de usar o idioma escolhido.
- CFO: caderno 15563896 (30 questões do Estatuto do Torcedor, sem anuladas/desatualizadas) na Meta 83 (G1),
  com aviso de que os crimes hoje estão na Lei Geral do Esporte.
- GCM Itaitinga fica fora até ter as 90 metas.
- Fase 3 implementada com tabela própria de extras (ver `12`).

## 2026-11-10 — Liberação da Fase 3 e migração do Grupo 2

- Aprovado pelo usuário ("aprovado, pode continuar"). Bloco "Se sobrar tempo" ligado nos Grupos 1 e 2 dos
  6 cursos em funcionamento; aviso "O SGA foi atualizado" nos Grupos 1, 2 e 3 por 7 dias.
- 55 alunos do Grupo 2 (PMPE, GMF, PRF, PMCE, PPCE, CFO) passaram ao Grupo 1, com nível extra 3 (pelas horas).
- **Progresso preservado na troca**: como a liberação é sequencial, quem tinha concluído as k primeiras metas
  do G2 recebeu as k primeiras metas do G1 como concluídas (758 conclusões, 30 alunos). As conclusões antigas
  do G2 continuam no banco. Motivo: o G2 cobre o mesmo conteúdo em ritmo maior; sem isso o aluno voltaria à Meta 1.
- Tentativas de diagnóstico do G2 ficam no histórico; os diagnósticos do G1 aparecem para eles como novos.
- GCM Itaitinga (fora do plano): o único aluno do G2 continua no G2.
- 2026-11-10: PRF ADM e GCM Itaitinga começam (16/11) com material incompleto; as aulas são acrescentadas conforme o usuário publica e as metas avançam, sem alterar metas já publicadas.
- 2026-11-10: criada a AI Memory (`docs/ia/00-comece-aqui.md`, `14`, `15`, `skills/`) e o teste `tests/ia-memory.test.mjs` no CI, para qualquer IA continuar o trabalho com o mesmo contexto (pedido do usuário). A skill antiga dizia que o merge era liberado com CI verde; vale o `AGENTS.md`: perguntar antes de mesclar.
- 2026-11-10: AI Memory reorganizada em 3 níveis (curto: identidade/regras; médio: `estado-atual.md`, `sessoes.md`, `08`; longo: conhecimento e histórico), com base na pesquisa do usuário e em fontes (agents.md, Cline Memory Bank, CSA 2026). `AGENTS.md` encurtado (grupos e avaliações movidos para `16`), pontes `GEMINI.md` e `.github/copilot-instructions.md`, `CODEOWNERS` para a memória, teste de caracteres invisíveis e datas de revisão.

## 2026-11-11 — Devolutiva individual em PDF
O usuário pediu Relatório → Redações → página de análise e download privado, com lembrete
na plataforma somente para o dono da redação. Autorizou lançamento direto no Grupo 1.
O PDF não entra no Git nem em bucket público; publicação pelo administrador após a nota.
Sem e-mail em massa, sem alteração de notas ou da função `nota_geral`. Plano em `17-plano-pdf-redacoes.md`.

## 2026-11-11 — Revisão de segurança sem exclusividade de ferramenta
Esclarecimento explícito do usuário: a revisão de segurança antes de migração é obrigatória,
mas pode ser executada pelo Codex; a referência exclusiva ao Claude era própria do fluxo
anterior. Substitui a exclusividade registrada em 10/11, sem dispensar testes, CI, reversão
e verificação posterior. Nesta sessão, o usuário autorizou revisar, aplicar a migração,
mesclar, publicar e entregar a devolutiva individual na plataforma, direto no Grupo 1.

## 2026-11-11 — Toda devolutiva deve chegar também à conta de teste
O usuário autorizou implementar/publicar a entrega automática de cada análise em PDF
à conta de teste protegida e disponibilizar a já existente imediatamente. A conferência
segue o caminho normal do aluno, com leitura separada, sem criar tentativas ou notas
fictícias. Restringir ao UUID configurado e à matrícula ativa no Grupo 3 do mesmo curso.
Não alterar acesso comercial, senha, nota ou lembrete do aluno original.

## 2026-11-11 — Ranking do Simulado Geral soma redação
Usuário pediu selo verde "com redação", comparação com a objetiva e classificação
pela nota final. Confirmou conta de teste e Grupo 1; escopo PMPE. Usar função separada
`ranking_nota_final`, preservando `nota_geral`, diagnóstico semanal e consentimento.

## 2026-11-12 — Publicar sem perguntar, cursos fechados e escopo enxuto
- **Publicar:** o usuário autorizou mesclar e publicar sem pedir aprovação o que ele pediu (CI verde e revisão
  de segurança continuam obrigatórios). Ele não é programador; confere só conteúdo e organização.
- **Nota geral** (objetiva + redação) ligada nos Grupos 1 e 2 de todos os cursos.
- **Aviso "O SGA foi atualizado"** retirado em 12/11 (antes do previsto para 17/11).
- **GCM Itaitinga:** curso arquivado, não existe mais.
- **PCCE e PRF ADM:** em espera até o primeiro aluno usar (a partir de 16/11); sem venda, sem SGA. Webhook depois.
- **GMF não tem Reta final:** as 23 metas `reta_final` (14 G1, 9 G2) foram arquivadas. **Todo curso termina na
  Meta 90 com o edital 100% na aba Edital.** A aba passou a contar o tópico como estudado quando ele inteiro ou
  todos os seus subtópicos foram estudados (item no tópico inteiro marca os subtópicos).
- **Aulas faltantes** (PRF ADM, GCM): pendentes, talvez cobertas por apostilas.
- **Proteção da `main` com Code Owners:** não usar (bloquearia os merges automáticos; o usuário não revisa código).
- **Fechados sem mesclar:** PRs #130 (compra com e-mail errado), #99 (banco de questões), #98, #88 e #27.
- **Jurídico e promessas do site:** resolvidos pelo usuário.
