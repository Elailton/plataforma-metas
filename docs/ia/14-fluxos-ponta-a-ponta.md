# 14 — Fluxos de ponta a ponta (da criação do curso ao e-mail de acesso)

Mapa único de **todos os fluxos** do SGA, na ordem em que acontecem. Cada etapa diz o que fazer, onde
está o detalhe e como conferir. Escrito em 2026-11-10 para qualquer IA continuar o trabalho.
Regras invioláveis em `01-regras.md`; técnica em `AGENTS.md`; como fazer em `15-padroes-tecnicos.md`.

```
Material do curso → Curso + edital → Questionário + Meta 0 → Aulas/materiais → Cadernos Qconcursos
→ Plano das 90 metas → Metas (lotes) → Diagnósticos/Simulados/Redação → Grupos e lançamento
→ Publicar curso → Produto/ofertas Hotmart → Webhook → Compra → E-mail de acesso → Primeiro acesso
→ Questionário → Área do aluno → Suporte/recuperação → Correção de redação → Manutenção semanal
```

---

## A. Criar o curso

**A1. Receber o material** (pasta do usuário): edital, prova anterior + gabarito, relatórios de
incidência (TEC, taxa por banca), material extra. Sem edital: perguntar.

**A2. Estruturar** seguindo `10-prompt-mestre-cursos.md` passos 1–5:
- `courses` "SGA - <SIGLA>", `status='draft'`, `groups_enabled=true`, copiar `organization`,
  `cover_color` e `questionnaire_schema` de um SGA existente.
- `subjects` na ordem do edital + "Orientações iniciais" por último; `syllabus_topics` com
  importância (alta/média/baixa pela incidência) e `last_exam` (caiu na última prova).
- Corrigir erros do edital e **avisar o usuário** (ex.: Maria da Penha é 11.340/2006).
- Scripts em `docs/ia/cursos/dados/`. Ficha em `docs/ia/cursos/<slug>.md`; resumo em `04`.

**A3. Questionário de entrada**: hoje é o **enxuto** (até 5 perguntas: horas, rotina, redação, TAF se
houver, acessos), gerado por `compactQuestionnaire` (`lib/groups/schema.mjs`) a partir do de 20.
Todo aluno novo vai para o **Grupo 1** (`study_group_from_q01`). Horas definem o nível do bloco
"Se sobrar tempo" (`12-plano-personalizacao.md`). Prévia do admin: `/previa/primeiro-acesso/<curso>`.

**A4. Meta 0 "Comece por aqui"** (texto padrão), `target_groups {1,2,3}`.

**A5. Data da prova** (`courses.exam_date`), quando houver: liga o contador e a aba "Reta final"
(45 dias antes). Perguntar ao usuário.

## B. Materiais

**B1. Aulas da Hotmart**: no Hotmart Club ("Minhas compras" → curso), expandir cada módulo e ler os
links `/content/<id>` com duração "mm:ss". Gravar em `materials` (`type='videoaula'`, título da aula,
URL do conteúdo, descrição `Trilha: <módulo> | Ordem: NNN | Duração: mm:ss`, disciplina certa).
Não duplicar URL. Procedimento em `15-padroes-tecnicos.md`.
**Material incompleto** (PRF ADM e GCM em 10/11/2026): recadastrar a cada lote de metas (ver `08`).

**B2. Vade Mecum e apostilas**: material `apostila` do curso (ex.: Vade Mecum PCCE). Lei seca entra a
partir da Meta 08.

**B3. Cadernos do Qconcursos**: um caderno por assunto (link
`…/questoes?notebook_ids[]=<id>`), material `link` na disciplina. Reaproveitar caderno de outro SGA
com o mesmo assunto quando for fiel; faltou → criar ("Gerar caderno" com os filtros, priorizando a
banca do concurso). **Toda meta tem caderno; RLM sempre com caderno.**

**B4. Tutorial do caderno de erros** (`/tutoriais/caderno-de-erros.pdf`) ligado à Meta 01.

## C. Planejar e criar as metas

**C1. Plano das 90 metas** (`10` passo 6 + `09-regras-metas.md`): vagas por disciplina (peso na prova
+ fatia do edital), uma trilha por disciplina, séries de aula inteiras, vídeo em 1,5x, ~2h30/dia no
grupo único. Script `docs/ia/cursos/dados/plano90.py` (variante `plano90_gcm.py`); resultado em
`docs/ia/cursos/<slug>-plano-90.md`. Disciplina sem aula gravada entra só com questões (a partir da 15).

**C2. Criar metas em lotes** (normalmente 3–7 por vez, perto da data):
1. materiais que faltam (cadernos, tutorial) → 2. `goals` em **rascunho** (`status='draft'`,
`due_date`, `target_groups`, `kind='regular'`) → 3. `goal_items` (disciplina, tópico, instrução,
questões sugeridas) + `goal_item_materials` → 4. **publicar** (`status='published'`).
A ordem importa: o gatilho `check_goal_item_consistency` exige itens válidos antes de publicar.
Título "Meta NN – Disciplina · Disciplina"; descrição com tempo total e o caderno de erros.
Liberação para o aluno: data (00:00 Fortaleza) **e** meta anterior concluída.

**C3. Conferir** por SQL: cada meta com itens, nenhum item sem tópico, nenhum item sem material, toda
meta com caderno. Meta já liberada **não muda**; correções só em metas futuras (arquivar itens, nunca
apagar; `05-runbooks.md` "Replanejar metas futuras").

**C4. "Se sobrar tempo"** (`goal_extra_items`, níveis 1–3 pelas horas): gerar para metas futuras com
cadernos já usados no curso (`12` Fase 3).

## D. Avaliações

**D1. Diagnóstico Semanal**: um a cada 7 metas, liberado só após **concluir** a meta que fecha o bloco
(`unlock_goal_id`), metade da prova real, questões só dos cadernos do bloco, revisão crítica de cada
questão (regras em `16-grupos-e-avaliacoes.md` e `skills/sga-plataforma.md`). Lançar primeiro no Grupo 3.

**D2. Simulado Geral** (`kind='mensal'`): todas as disciplinas no formato da prova, por **data**
(14 dias com edital aberto, 30 com fechado — **perguntar** se o edital está aberto). Deixar o próximo
publicado e fechado.

**D3. Redação do Simulado Geral**: proposta em `essay_prompt`, folha PDF sem o tema em
`public/folhas-redacao/` (gerada por `docs/ia/folha-redacao/gerar.py`). Correção: `13-correcao-redacao.md`.

## E. Grupos, lançamento e publicação

**E1. Grupos**: Grupo 1 (todos os alunos), Grupo 2 (encerrado para novos), Grupo 3 (só a conta de teste
do administrador). `target_groups` decide quem vê. **Perguntar o grupo** antes de lançar.
Nunca mostrar grupo ao aluno.

**E2. Funções por grupo** (`course_group_settings.disabled_features`) e aviso da tela inicial
(`notice`). Toda melhoria percebida leva o aviso **"O SGA foi atualizado!"** por 7 dias (`12`).

**E3. Publicar o curso** (`courses.status='published'`): só com ordem do usuário. Curso em rascunho
não recebe matrícula pelo webhook nem aparece ao aluno.

## F. Venda e liberação automática do acesso (Hotmart → e-mail)

**F1. Produto e ofertas** (`05-runbooks.md` "Cadastrar produto/ofertas"):
- `hotmart_product_mappings`: `hotmart_product_ucode` (UUID do produto), `offer_policy='authorized_offers'`.
  O ucode vem do payload real do webhook **ou** do dado `ucode` da página de checkout
  (`pay.hotmart.com/<código>`), conferido com o id do produto no Club. O **código do checkout** (ex.:
  `Y108231024P`) **não** é o ucode.
- `hotmart_offer_rules`: cada oferta (`off=`) com `grants_access` true (libera SGA) ou false (curso
  apenas/Turbo). Oferta em dúvida → gerar o link de checkout e o usuário confere.
- Registrar em `04-cursos-e-ofertas.md`.

**F2. Webhook na Hotmart** (ação do usuário no painel): URL `https://<domínio>/api/webhooks/hotmart`,
versão **2.0.0**, eventos de compra (aprovada, completa, atrasada, reembolsada, chargeback, cancelada,
expirada), **só produtos com SGA**, sem o mesmo produto em duas configurações. O teste da Hotmart usa
produto fictício (`fb056612-…`, oferta `test`) e fica "ignored": prova a ligação, não o mapeamento.

**F3. Compra → acesso** (`AGENTS.md` "Integração Hotmart"):
1. `POST /api/webhooks/hotmart` valida `X-HOTMART-HOTTOK`, versão 2.0.0, idempotência pelo `id`.
2. Produto pelo ucode; oferta autorizada? Curso publicado?
3. Localiza a conta pelo e-mail normalizado ou **convida** (Supabase Auth → e-mail via Resend,
   remetente `no-reply@mentoria.cursoprofericklima.com.br`, "Sistema Guiado da Aprovação").
4. Garante perfil `student` (nunca admin), grava o direito em `hotmart_entitlements` e reconcilia a
   matrícula (`enrollments`), respeitando bloqueio administrativo.
5. Eventos negativos revogam o direito, nunca apagam conta, matrícula ou progresso.
Limites de e-mail: Resend gratuito 100/dia e 3.000/mês; Auth 100/h. **Nada de envio em massa.**

**F4. Primeiro acesso do aluno**: link do e-mail → `/auth/confirm` (token só é consumido ao tocar
"Continuar") → `/auth/primeiro-acesso` (cria senha) → introdução do SGA → questionário do curso →
grupo calculado no banco (`save_course_questionnaire`) → área do aluno (`/aluno`).

**F5. Recuperação**: `/auth/reenviar-acesso` (resposta sempre genérica; limites por e-mail/IP/global),
`/auth/codigo` (código de 8 dígitos do e-mail mais recente), "Esqueci minha senha", botão do admin
**"Copiar link de acesso"** (uso único, para WhatsApp). Compra que chegou antes do cadastro do
produto/oferta: "Primeiro acesso" recupera, ou admin → Configurações → "Reprocessar compras pendentes"
(prévia, máximo 20/dia). Concessão manual: admin → Alunos → "Conceder acesso manual".

**F6. Suporte** (`05-runbooks.md` "Suporte a aluno"): "não recebi o e-mail", refazer questionário,
bloqueio por curso, e-mail diferente da compra. Resposta pública nunca revela se um e-mail tem conta.

## G. Rotina

**G1. Semanal**: gerar o próximo lote de metas de cada curso (conferir aulas novas na Hotmart), o
diagnóstico do bloco que fecha, o próximo Simulado Geral; olhar `08-pendencias.md`.
**G2. Redações**: corrigir dentro de 7 dias do envio (`13`), lançar pelo painel.
**G3. Avisos**: remover o "O SGA foi atualizado" após 7 dias.
**G4. Antes de mexer em código**: branch → testes → revisão de segurança → PR → perguntar → merge.
**G5. Memória**: atualizar `06`/`07`/`08` e fichas no mesmo PR.
