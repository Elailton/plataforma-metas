# 18 — Prompt mestre: Diagnósticos Semanais e Simulados (TEC Concursos)

Decisão do usuário em 13/11/2026: **cadernos das metas continuam no Qconcursos** (parceria B2B);
**Diagnósticos Semanais e Simulados Gerais usam o TEC Concursos**, sempre com o filtro
**Área (Carreira) = Policial**. Rotina diária às ~10h: **2 diagnósticos por curso** nos 6 cursos
ativos até fechar os blocos da Meta 84. Siga este arquivo à risca; regras gerais em `01-regras.md`,
formato das avaliações em `16-grupos-e-avaliacoes.md` e `docs/ia/skills/sga-plataforma.md`.

## 0. Antes de começar (toda execução)
1. `git pull` da `main`; leia `00-comece-aqui.md`, `estado-atual.md`, `08-pendencias.md` e este arquivo.
2. Confira no banco (Supabase `cbryvevesiaoqmwwlnet`) o que já existe — **nunca confie só na memória**.
3. Navegador: usar o **Chrome do usuário** (Claude in Chrome, decisão de 14/11), onde o TEC está logado no
   **Plano Padrão** (sem o limite de 15 questões/dia da conta gratuita). O navegador interno estava deslogado.
   A janela do Chrome precisa estar **visível (não minimizada)**: minimizada, a aba congela (capturas de tela
   expiram e o gerador de cadernos não conclui). Sem login ou com a janela congelada, **pare** e avise.
   Nunca digite senha. Cookies: "Somente essenciais".
4. O usuário **autorizou** (13/11/2026) resolver questões na conta TEC dele apenas para ler o
   gabarito oficial, e no Qconcursos pela parceria B2B. Ritmo: **uma questão a cada ≥ 20 s**; se vier
   429 ou "Just a moment", espere 2 min; persistindo, pare o curso do dia e registre. Nunca resolva
   CAPTCHA nem tente contornar bloqueio. **Navegar também é devagar** (≥ 10 s por troca de questão, sem
   varrer dezenas de questões em sequência): em 13/11 a triagem rápida gerou reCAPTCHA e 429 (ver `07`).
   Progresso parcial fica em `ops/diagnosticos-2211/*.json` até o diagnóstico/simulado estar completo.

## 1. Cursos, tamanho e banca de referência
| Curso (slug) | Questões | Formato | Banca de referência |
|---|---:|---|---|
| PMPE (`sistema-guiado-da-aprovacao`) | 30 | A–E | INSTITUTO AOCP |
| GMF (`sga-gmf`) | 40 | A–D/E conforme prova | IDECAN |
| PRF (`sga-prf`) | 60 | Certo/Errado (A Certo, B Errado) | CESPE/CEBRASPE |
| PMCE (`sga-pmce`) | 50 | A–D | CEV/UECE |
| PPCE (`sga-ppce`) | 45 | A–E | IDECAN |
| CFO PMCE (`sga-cfo-pmce`) | 50 | A–E | IDECAN |

Metade da prova real, **metade por disciplina**: copie a distribuição por disciplina do último
diagnóstico publicado do curso (mesmas disciplinas e quantidades), restrita às disciplinas que
aparecem nas metas do bloco; se uma disciplina não aparece no bloco, redistribua entre as que aparecem.
PCCE e PRF ADM estão **pausados** (13/11): não gerar. G2 **não** recebe novas entregas.

## 2. Qual diagnóstico gerar
- Blocos de 7 metas regulares publicadas para G1: 01–07, 08–14, … 78–84 (título `Meta NN – …`).
- Próximo bloco de cada curso = o menor bloco sem `mini_quizzes` `kind='semanal'` publicado para G1.
- Por execução: até **2 blocos por curso**, na ordem de liberação (data da meta que fecha o bloco).
- Prioridade do dia: (1) Simulado Geral com liberação em ≤ 9 dias e sem questões; (2) diagnósticos
  cuja meta de fechamento é mais próxima; (3) os demais.

## 3. Seleção das questões (TEC Concursos)
Filtros em "Filtrar questões": **Objetivas (todas)** + **Área (Carreira): Policial** + **Matéria e
assunto** correspondente a cada tópico do bloco (leia `goal_items` → `subjects`/`syllabus_topics` das 7
metas, itens não arquivados). Preferir a **banca de referência** do curso; se faltar, outras bancas da
área policial. Ano: preferir os mais recentes (≥ 2019). Gere o caderno com nome
`SGA <curso> Diag Metas XX–YY <disciplina>` numa pasta `SGA Diagnósticos`.

Rejeitar: anulada, desatualizada (lei revogada/alterada, gabarito contra jurisprudência atual),
fora do assunto do bloco, dependente de imagem/gráfico/negrito/sublinhado que se perde, muito acima do
nível do cargo (magistratura, procuradoria), itens de outra matéria misturados, texto truncado.
Não repetir questão já usada em qualquer diagnóstico do curso (compare o início do enunciado com
`mini_quiz_questions.statement` do curso) nem a mesma questão dentro do lote.

**Última prova (R1):** cada diagnóstico leva **no mínimo 5** questões de `question_bank_items` do curso
(`origin <> 'diagnostico'`, não arquivadas, ainda não usadas em `mini_quiz_questions.bank_item_id`)
cujo `subject_id`/`topic_id` esteja nas metas do bloco; grave `bank_item_id`. Se houver menos de 5
compatíveis, use as que houver e registre. Gabarito delas: `question_bank_answer_keys`.

## 4. Gabarito e comentário
- Gabarito oficial: resolva no TEC (ritmo acima) e leia o resultado; confira com o seu raciocínio. Se
  divergir de forma clara ou o TEC indicar anulação/alteração, **descarte** a questão.
- Comentário **próprio** (nunca copiar comentário do TEC/Qconcursos), simples, no formato:
  ```
  **Imparável**, a resposta é a **letra X**.

  <explicação curta e correta>
  Por que as outras erram:
  • A: …

  Questão de concurso: BANCA - ANO - Órgão - Cargo (TEC Concursos #ID).
  ```
  Certo/Errado: `**Imparável**, a resposta é **Certo** (letra A).` Questão da última prova:
  `Questão da última prova: BANCA - ANO - Órgão - Cargo, questão N.`
- Enunciado: `**Texto associado**\n\n<texto>` quando houver texto-base (regras em `16`); sem
  "Texto para as questões X a Y"; `**negrito**`, `__sublinhado__`.

## 5. Gravação (SQL de um comando com CTEs)
Espelhe o último diagnóstico publicado do curso (`kind='semanal'`):
- `mini_quizzes`: `course_id`, `title='Diagnóstico Semanal: Metas XX a YY'`, `description` igual ao
  modelo do curso trocando números ("NN questões de concursos (metade do previsto no edital) sobre os
  assuntos que você estudou nas metas XX a YY, incluindo questões da última prova. Com cronômetro; a
  correção comentada aparece depois do envio."), `week_number` = nº do bloco, `release_date` = data da
  meta que fecha o bloco, `position` = próximo, `kind='semanal'`, `status='published'`,
  `target_groups='{1,3}'`, `unlock_goal_id` = meta que fecha o bloco, `subject_id` nulo.
- `mini_quiz_questions` (position 0..n-1, agrupadas por disciplina na ordem do último diagnóstico,
  `subject_id`, `topic_id`, `statement`, `alternatives` [{key,text}], `bank_item_id` quando houver) e
  `mini_quiz_answer_keys` (`correct_key`, `explanation`).
- Lotes de ~15 KB; um diagnóstico pode ir em 2–3 comandos (cabeçalho + questões em partes).
- Conferir depois: total de questões, distribuição, chaves dentro das alternativas, posições contínuas,
  ≥ 5 `bank_item_id`, `release_date`/`unlock_goal_id` corretos, nenhuma duplicata.

## 6. Simulado Geral
Mesmas fontes e regras, formato e tamanho da **prova real** do curso (PMPE: 60, AOCP), todas as
disciplinas, `kind='mensal'`, liberado por data. Preencher o já publicado e vazio antes da data.
Redação: não inventar tema sem aprovação do usuário; se o simulado anterior teve redação e este não
tiver `essay_prompt`, registre a pendência e avise.

## 7. Fim de cada execução
1. Registrar progresso (blocos gerados, IDs, pendências, motivos de descarte) em `08-pendencias.md`,
   `estado-atual.md` e uma entrada em `sessoes.md`; PR com CI `validate` verde e mesclar (decisão de
   12/11). Nunca gravar dados pessoais na memória.
2. Mensagem final curta ao usuário: o que foi publicado por curso, o que falta e qualquer bloqueio.
3. Nada destrutivo no banco, nada de e-mail, não alterar metas, não mostrar grupo ao aluno.

## 8. Notas técnicas do TEC (descobertas em 14/11/2026, pelo próprio cliente do site)
- Na página `/questoes/filtrar`, o serviço Angular `tec` (`angular.element(document.querySelector('[ng-controller]')).injector().get('tec')`)
  expõe `apiGet`/`apiPost`. Listas de filtros: `/enums/areas`, `/bancas`, `/materias`, `/assuntos` (com `materia`),
  `/anos`, `/enums/filtros-questao` (parâmetros `universo='CONCURSOS'`, `formato='OBJETIVA'`).
- O componente do gerador tem `vm.adicionarFiltro(item)` / `vm.limparFiltros()` e `vm.numeroQuestoesEncontradas`;
  os itens vêm de `injector.get('tecDadosBuscadores')` (`areas`, `bancas`, `materias`, `anos`, `filtrosQuestao`).
- IDs úteis: área `POLICIAL`; bancas `106` Instituto AOCP, `79` AOCP, `95` IDECAN, `171` CEV UECE,
  `4` CEBRASPE; matérias `3` Português, `2` Constitucional, `217` Raciocínio Lógico, `4` Informática,
  `183` Direitos Humanos, `172` Legislação Penal e Processual Penal Especial, `99` História;
  opções `REMOVER_ANULADAS`, `REMOVER_DESATUALIZADAS`, `REMOVER_AS_QUE_RESOLVI`.
  Exemplo (14/11): RLM + Instituto AOCP + Policial + 2019–2026 sem anuladas/desatualizadas/resolvidas = 63 questões.
- Gabarito: na página `/questoes/<id>`, marcar uma alternativa e clicar "Resolver questão" (POST
  `/api/questoes/<id>/resolucao`); o texto mostra "alternativa correta" ou indica a certa. Ritmo ≥ 20 s.
- O botão "RESOLVER" do gerador posta o formulário e recarrega a página; com a janela minimizada o caderno
  não foi criado. Com a janela visível, conferir em "Meus cadernos".
