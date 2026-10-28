# 04 — Cursos, produtos e ofertas Hotmart (retrato de 2026-10-28)

**O banco é a fonte de verdade** (`courses`, `hotmart_product_mappings`,
`hotmart_offer_rules`). Confira antes de agir; atualize este retrato quando mudar.

## Cursos

| Curso | id | Status | Observação |
|---|---|---|---|
| SGA - PMPE | `fec9bb24-aaab-41ce-a98b-a039c3905ee2` | publicado | ~88 alunos ativos, 163 metas publicadas |
| SGA - GMF | `3f595180-4648-4f76-94e7-eb2ef88572bd` | publicado | ~72 alunos ativos, 204 metas publicadas |
| SGA - PRF | `a845c350-baad-4711-a1e4-1ef1fc6f832c` | rascunho | edital pronto; metas pendentes |
| SGA - PMCE (soldado) | `6305aafa-3263-46c9-b1b7-1001c01b5994` | rascunho | edital pronto; metas pendentes |
| SGA - PPCE | `4b4f4900-a0a3-4ebd-8507-511c16eb9029` | rascunho | edital pronto; metas pendentes |
| SGA - CFO PMCE | `c09903b0-651f-43a8-9c43-5f8fe7f6cb17` | rascunho | edital pronto; metas pendentes |

Cursos novos têm a "Meta 0 — Comece por aqui" em rascunho. Compras com SGA de cursos em
rascunho já criam matrícula: o aluno vê "Acesso não liberado" até a publicação.

## Produtos (ucode) e ofertas

`+` libera o SGA · `-` curso apenas (não libera). Checkout: `https://pay.hotmart.com/<código>?off=<oferta>`.

| Curso | Checkout | ucode | Ofertas |
|---|---|---|---|
| PMPE | `T70472489M` | `af36e37a-d94f-4bdc-a761-0f05faf09173` | `t43w9ztx`+ (alunos/ex), `4e4p713s`+ (novos), `dfr303px`+ (alunos/ex parcelado), `r87yyfbz`+ (novos parcelado); `qkpqg5ea`− curso apenas, `hr5ag98v`− e `jgqsearh`− Turbo |
| GMF | `C67379049F` | `0bd11502-fe5c-42aa-a2f4-d3d55ad51866` (vendas) e `fb056612-…` (ucode fixo dos testes da Hotmart) | `fx39ie5v`+ (alunos/ex), `vnevmgwm`+ (novos), `rhp2q094`+ (alunos/ex parcelado), `henwjt9b`+ (novos parcelado); `mu2s6m03`−, `suob1gh7`−, `cyejuxok`− "GMF sem SGA" |
| CFO PMCE | `Q71595867Y` | `6dd1ffce-8162-4160-a166-437eee2b518c` | `aeezrp0f`+, `9fy3qydk`+, `na0gapv3`+, `n5f6525d`+; `9d5as0qw`−, `sufpthel`− (sem SGA, confirmado 28/10) |
| PMCE | `X25479334G` | `71cc3eba-ab2f-4a47-a973-2972175615e7` | `qao1b38j`+, `0irwm9tl`+, `00kggstw`+, `h4a2n6je`+; `1imnzz5x`−, `kftyjfqc`− |
| PPCE | `O66446852H` | `1e4ad940-5886-42f0-813f-133384cd6693` | `y72wg47k`+, `t1e0ol35`+, `1pitc078`+, `bbz5otbm`+; `ou6u9p9r`− Turbo |
| PRF | `U91982297E` | `3d8e7813-847d-4140-a1aa-d5fdfe0532bd` | `acuq8iko`+, `m50mentn`+, `fi4b2za6`+, `zxrkgal3`+; `2gf1w761`− Turbo |

Pendente de confirmação: a primeira venda real de CFO, PMCE, PPCE e PRF pelas ofertas
"+" confirma que o checkout corresponde ao ucode cadastrado. Se chegar como "Produto sem
mapeamento ativo", o produto é outro.

## Links de compra vigentes (confirmados pelo usuário em 2026-10-28)

Só estes 12 links são usados na venda; os links antigos foram descartados. As ofertas
antigas (parceladas e "curso apenas") **continuam cadastradas**: compras já feitas, atrasos
e reembolsos delas ainda chegam pelo webhook e precisam ser reconhecidos. Não remover.
Formato: `https://pay.hotmart.com/<checkout>?off=<oferta>&checkoutMode=10`.

| Curso | Alunos e ex-alunos | Novos alunos |
|---|---|---|
| PRF (`U91982297E`) | `acuq8iko` | `m50mentn` |
| CFO PMCE (`Q71595867Y`) | `aeezrp0f` | `9fy3qydk` |
| GMF (`C67379049F`) | `fx39ie5v` | `vnevmgwm` |
| PPCE (`O66446852H`) | `y72wg47k` | `t1e0ol35` |
| PMCE (`X25479334G`) | `qao1b38j` | `0irwm9tl` |
| PMPE (`T70472489M`) | `t43w9ztx` | `4e4p713s` |

## Regras de negócio confirmadas pelo usuário

- Ofertas "sem SGA"/"curso apenas"/"Turbo" **não** liberam o SGA (2026-10-27).
- Cada curso tem 4 ofertas que liberam: à vista e parcelada × alunos/ex-alunos e novos.
