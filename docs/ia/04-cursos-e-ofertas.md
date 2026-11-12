# 04 — Cursos, produtos e ofertas Hotmart (retrato de 2026-10-28)

**O banco é a fonte de verdade** (`courses`, `hotmart_product_mappings`,
`hotmart_offer_rules`). Confira antes de agir; atualize este retrato quando mudar.

## Prazo do SGA e data da prova (informado pelo usuário em 2026-10-30)

- O SGA é vendido junto com o curso na Hotmart e o acesso vale **1 ano** (não "até a data da
  prova"). O sistema não guarda data de fim: o fim depende do evento `PURCHASE_EXPIRED` da
  Hotmart (revoga o direito). Conferir na Hotmart se o produto/oferta tem esse prazo.
- **PMPE:** edital de 30/09/2026 (AOCP, 1.250 vagas de soldado); prova objetiva **prevista
  para 21/02/2027** (data provável, pode mudar). Fontes: Concursos no Brasil e Diário de
  Pernambuco, conferidas em 2026-10-30.
- **Estrutura da prova PMPE (Soldado, cargo 201, Edital de Abertura 001/2026, DOE-PE extra de
  29/09/2026, Instituto AOCP; conferida no PDF enviado pelo usuário em 2026-11-06):** prova objetiva
  com 60 questões de 5 alternativas (A–E), 1 ponto cada, só uma correta, em 3 blocos:
  | Bloco | Disciplina | Questões |
  |---|---|---|
  | I | Língua Portuguesa | 10 |
  | I | História de Pernambuco | 10 |
  | II | Raciocínio Lógico | 10 |
  | II | Informática | 10 |
  | III | Direito Constitucional | 10 |
  | III | Direitos Humanos e Legislação Extravagante | 10 |
  Aprovação: mínimo de 30% em cada bloco, nenhuma disciplina zerada e 30% no total. Redação
  dissertativo-argumentativa (40 pontos, 15–20 linhas). Objetiva + redação em **5 horas**, turno da
  manhã, em 21/02/2027 (Anexo I). Depois: exames médicos, TAF e avaliação psicológica.
- **Simulado Geral da PMPE (decidido em 2026-11-06):** a mesma estrutura da objetiva (60 questões,
  10 por disciplina, na ordem da tabela), só questões reais da AOCP, sem repetir as dos diagnósticos;
  `time_limit_minutes = 300` (5 horas, o tempo real da prova, com a redação opcional dentro do tempo;
  era 240 até 08/11/2026). Edital
  **aberto**, então **a cada 14 dias**: o 1º libera em **08/11/2026** e o 2º em **22/11/2026**
  (publicado e fechado, para o aluno ver a próxima data). Não depende das metas. Os demais cursos
  (edital fechado, a cada 30 dias) ficam sem simulado geral por enquanto, sem previsão.
  Cadastro: 1º `7ae50acd-2053-40ab-a6f7-d123535617c5` (60 questões enviadas pelo usuário, sem banca
  informada; redação sobre IA em `docs/ia/redacao-simulado-geral-01-pmpe.md`; o antigo 1º vazio
  `b54942ff-…` foi arquivado), 2º `ae94d866-dfcf-4b16-885a-16b140495631`.
- **Redação (edital PMPE/AOCP):** dissertativo-argumentativa, 15–20 linhas, 40 pontos em 4 critérios de
  10 (tema/informatividade/argumentação; coesão e coerência; estrutura e paragrafação; norma-padrão,
  inclusive legibilidade), mínimo 12. Zera: fuga ao tema ou ao tipo textual, desorganização grave ou
  ofensa, lápis/cor de tinta errada, branco/ilegível/fora da folha definitiva, identificação. Só é
  corrigida a de quem passa na objetiva dentro do corte (soldado: 4.866º na ampla). Fonte: resumo do
  edital em voceconcursado.com.br, conferido em 08/11/2026.
- O site de vendas ainda diz "Acesso ao SGA válido até a data da prova do concurso": o
  usuário precisa corrigir para 1 ano (fora do repositório).

## Cursos

| Curso | id | Status | Observação |
|---|---|---|---|
| SGA - PMPE | `fec9bb24-aaab-41ce-a98b-a039c3905ee2` | publicado | ~88 alunos ativos, 163 metas publicadas |
| SGA - GMF | `3f595180-4648-4f76-94e7-eb2ef88572bd` | publicado | ~72 alunos ativos, 204 metas publicadas |
| SGA - PRF | `a845c350-baad-4711-a1e4-1ef1fc6f832c` | rascunho | edital pronto; metas pendentes |
| SGA - PMCE (soldado) | `6305aafa-3263-46c9-b1b7-1001c01b5994` | rascunho | edital pronto; metas pendentes |
| SGA - PPCE | `4b4f4900-a0a3-4ebd-8507-511c16eb9029` | rascunho | edital pronto; metas pendentes |
| SGA - CFO PMCE | `c09903b0-651f-43a8-9c43-5f8fe7f6cb17` | rascunho | edital pronto; metas pendentes |
| SGA - PRF ADM | `4c3ca70b-72ac-4dcc-93ec-d08c4832df11` | rascunho | edital (FUNCAB 2014, 60 q) em 09/11/2026; só Meta 0 — ficha `cursos/sga-prf-adm.md` |
| SGA - GCM Itaitinga | `4b7cb696-2a50-4880-9a56-54dcc4a239cb` | rascunho | edital (FUNCEPE 2015, 60 q, P2 peso 3) em 09/11/2026; só Meta 0 — ficha `cursos/sga-gcm-itaitinga.md` |
| SGA - PCCE (Oficial Investigador) | `0203ffcb-bf2e-4e99-8706-de1785d22116` | rascunho | edital (CEV/UECE 2025, 100 q + redação + TAF) em 09/11/2026; só Meta 0 — ficha `cursos/sga-pcce.md`. Não confundir com PPCE |

Regra de 09/11/2026: todo curso fecha o edital em **90 metas** (`09-regras-metas.md`).

Cursos novos têm a "Meta 0 — Comece por aqui" em rascunho. Compras com SGA de cursos em
rascunho já criam matrícula: o aluno vê "Acesso não liberado" até a publicação.

## Produtos (ucode) e ofertas

`+` libera o SGA · `-` curso apenas (não libera). Checkout: `https://pay.hotmart.com/<código>?off=<oferta>`.

| Curso | Checkout | ucode | Ofertas |
|---|---|---|---|
| PMPE | `T70472489M` | `af36e37a-d94f-4bdc-a761-0f05faf09173` | `t43w9ztx`+ (alunos/ex), `4e4p713s`+ (novos), `dfr303px`+ (alunos/ex parcelado), `r87yyfbz`+ (novos parcelado); `qkpqg5ea`− curso apenas, `hr5ag98v`− e `jgqsearh`− Turbo |
| PMPE (produto novo, 12/11/2026) | `V108430432G` (id 8936786) | `136b2293-eaf2-4309-aaa2-0c66d4a46126` | `ugpytyxv`+ (alunos), `s6oxmwd9`+, `wyr23b3o`+, `i1x50duq`+, `wvhiexw9`+ (testes de preço, novos) |
| GMF | `C67379049F` | `0bd11502-fe5c-42aa-a2f4-d3d55ad51866` (vendas) e `fb056612-…` (ucode fixo dos testes da Hotmart) | `fx39ie5v`+ (alunos/ex), `vnevmgwm`+ (novos), `rhp2q094`+ (alunos/ex parcelado), `henwjt9b`+ (novos parcelado); `mu2s6m03`−, `suob1gh7`−, `cyejuxok`− "GMF sem SGA" |
| CFO PMCE | `Q71595867Y` | `6dd1ffce-8162-4160-a166-437eee2b518c` | `aeezrp0f`+, `9fy3qydk`+, `na0gapv3`+, `n5f6525d`+; `9d5as0qw`−, `sufpthel`− (sem SGA, confirmado 28/10) |
| PMCE | `X25479334G` | `71cc3eba-ab2f-4a47-a973-2972175615e7` | `qao1b38j`+, `0irwm9tl`+, `00kggstw`+, `h4a2n6je`+; `1imnzz5x`−, `kftyjfqc`− |
| PPCE | `O66446852H` | `1e4ad940-5886-42f0-813f-133384cd6693` | `y72wg47k`+, `t1e0ol35`+, `1pitc078`+, `bbz5otbm`+; `ou6u9p9r`− Turbo |
| PRF | `U91982297E` | `3d8e7813-847d-4140-a1aa-d5fdfe0532bd` | `acuq8iko`+, `m50mentn`+, `fi4b2za6`+, `zxrkgal3`+; `2gf1w761`− Turbo |
| PRF ADM | `Y108231024P` | `841567fd-404b-40a3-b693-7ae74896f5eb` (produto 8825974) | `oip1gp5w`+ (cadastrada em 10/11/2026) |
| PCCE | `W79187935C` | `671b9533-75a1-48f9-8aa4-86453f8cdd64` (produto 2629594, "Imersão PCCE") | `kwkkrdu3`+ (cadastrada em 10/11/2026) |
| GCM Itaitinga | `H108323440W` | `2087a8bf-467f-4dc3-acfd-1a47b83509f7` (produto 8876393, "GMI") | `st6riqpl`+ (cadastrada em 10/11/2026) |

Pendente de confirmação: a primeira venda real de CFO, PMCE, PPCE e PRF pelas ofertas
"+" confirma que o checkout corresponde ao ucode cadastrado. Se chegar como "Produto sem
mapeamento ativo", o produto é outro.

PRF ADM, PCCE e GCM (10/11/2026): ucode lido do próprio checkout (`pay.hotmart.com/<código>`, dado
`ucode` da página), conferido com o id do produto do Hotmart Club. Política `authorized_offers` com só a
oferta informada pelo usuário; outras ofertas desses produtos chegam como "Oferta não cadastrada" e
precisam ser classificadas com o usuário. Webhook: o usuário precisa cadastrar a configuração dos produtos
PCCE e PRF ADM na Hotmart (o GMI já tem "SGA - GMI").

## Regras de negócio confirmadas pelo usuário

- Ofertas "sem SGA"/"curso apenas"/"Turbo" **não** liberam o SGA (2026-10-27).
- Cada curso tem 4 ofertas que liberam: à vista e parcelada × alunos/ex-alunos e novos.
