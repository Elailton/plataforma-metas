# Plano: metas completas dos SGA novos (PRF, PMCE, CFO PMCE, PPCE)

Gatilho: quando o usuário disser **"executar metas"**, seguir este plano até o fim e
gravar todas as metas. Regras de montagem: `../09-regras-metas.md`.

## Decisões do usuário (29/10/2026)
- Sem data de prova. Duração de **3 a 3,5 meses**: cerca de **100 metas** por curso
  (Meta 01 = 02/11/2026, uma por dia, até ~09/02/2027). Conteúdo novo até ~Meta 85;
  o resto é revisão espaçada e reforço em caderno.
- Lançar nos **Grupos 1, 2 e 3**: metas do G1 com `target_groups={1}`, do G2 com `{2}`
  (o G3 vê o grupo que espelha). Carga: G1 ~3h (vídeo em 1,5x), G2 ~6h.
- Professores: Português **Volney Ribeiro** (todos); Dir. Constitucional **Dayana Sales**
  (inclusive PMCE); Informática **Paulo Felipe** na PRF e **Graziela Barros** na PPCE
  (melhor cobertura do edital). Demais disciplinas: a única trilha de cada uma.
- Leitura de apostila e lei seca **só a partir da Meta 08**. Lei seca no Vade Mecum
  do curso, com artigos exatos; priorizar o que mais cai (importância do edital).
- Bancas dos cadernos: PRF **CEBRASPE** (id Qconcursos 2); PMCE e CFO **UECE-CEV/FUNECE**
  (167 e 1311); PPCE **IDECAN** (207). Menos de 40 questões da banca → todas as bancas.

## Decisões do usuário (03/11/2026)
- **PMCE:** a disciplina "Noções de Direito Penal e Processual Penal" é só Processo Penal
  (erro de nome da banca). Os 9 tópicos do edital cadastrado já são todos de processo penal;
  não há lacuna de Direito Penal.
- **CFO PMCE:** sem Atualidades nas metas enquanto o edital não abrir (História do Ceará segue).
- PPCE: trilhas de LEP e Legislação Específica entram normalmente.

## Executado em 03/11/2026 ("executar metas", primeira parte)
- **Metas 06 a 50 publicadas** nos 4 cursos, G1 `{1}` e G2 `{2}` (o G3 vê pelo espelho).
  Gerador: `plan_new.py <curso> <ultima_meta>` (dados em `<curso>.py` e `<curso>_t.txt`) e
  `emit_new.py <curso>` (lotes SQL; a meta é criada só se ainda não existir "Meta NN –" no grupo,
  então rodar de novo não duplica). Depois de gravar, resolver `{AULAS}`/`{TT}`/`{NOTA}`/`{BLOCO}`
  com `resolve.sql.tpl`.
- Cadernos novos no Qconcursos (PMCE 55, CFO 66, PPCE 72), cadastrados como material `link`
  com `Chave:`; lista em `<curso>_nb.txt`. Filtro (pedido do usuário em 03/11): 1º banca + área
  de atuação **Policial** (`administrative_level_ids=6`) se ≥ 40 questões; senão área policial
  de todas as bancas se ≥ 30; senão só a banca se ≥ 30; senão todas as bancas.
- PRF ganhou discursiva aos sábados (trilha do Volney + redação); domingo tem revisão semanal do
  caderno de erros; RLM a cada ≤ 3 dias; lei seca e leitura só da Meta 08 em diante.
- **Falta (próximo "executar metas"):** Metas 51 a ~100. Basta `plan_new.py <curso> 100` e
  `emit_new.py <curso>`: o gerador recalcula do zero e as metas 06–50 já gravadas são puladas
  (mesmo planejamento determinístico). Conferir antes se algum caderno novo é necessário.

## Já feito (29/10/2026)
- **Metas 01 a 05 publicadas** nos 4 cursos (G1 e G2), montadas por `first5.py` +
  `first5.tpl`. O plano completo começa na **Meta 06 (07/11)** e continua de onde
  cada trilha parou (ver `PLAN` em `first5.py`: aulas e assuntos já usados).
- PRF: 118 cadernos do Qconcursos criados (edital inteiro) e cadastrados como material
  (descrição termina em `Chave: <tópico8 ou ctb1..ctb6>`). Dados prontos em `prf.py`
  (aulas, alinhamento aula→assunto `MAP`, cadernos `CAD`/`NBK`, lei seca `LAW`,
  leituras `APOST`/`NOSSO`) e `prf_t.txt` (edital: disciplina, tópico, pai, importância).
- PRF: 31 PDFs "NOSSO PDF" (leis especiais, CTB, resoluções) cadastrados (descrição
  `Trilha: NOSSO PDF | Ordem: NNN`). Língua Estrangeira em gravação: estudar só por questões.
- PMCE/CFO/PPCE: só os cadernos das primeiras metas (chaves `compr`, `signif`, `ortog`,
  `estrut`, `acent`, `logprop`, `relarb`, `seq`, `conj`, `dirind`, `dirsoc`, `dirpol`,
  `dpmapl`, `dpmpaz`, `dpmguer`, `hcecol`, `procorg`, `planest`, `penapl`, `teocon`,
  `princfund`, `dirfund`, `estgov`, `princadm`).
- Tutorial do caderno de erros cadastrado nos 4 cursos; aulas da Legislação
  Extravagante da PMCE ligadas às disciplinas (DH; Desarmamento → Segurança Pública).

## Falta fazer
1. **PMCE, CFO e PPCE — alinhamento** (como em `prf.py`): para cada curso, montar
   `V` (aulas das trilhas escolhidas: `ordem,segundos,base-da-série` — SQL em
   `materials.description`, `Trilha: X | Ordem: NNN | Duração: mm:ss`), `MAP`
   (faixa de aulas → tópico [→ caderno]), `CAD`, `LAW`, `APOST` e o edital `*_t.txt`.
   Ver decisões de 03/11 (PMCE só Processo Penal; CFO sem Atualidades).
2. **Cadernos restantes** de PMCE/CFO/PPCE no Qconcursos (navegador logado, aba do
   Qconcursos): rotina `mk/runAll` — `Thor.Notebook.create({}, {data:{product:'concursos',
   source_project:1, questions_limit:200, populated:true, notebook:{name, filter}}})`,
   filtro `{subject_ids, examining_board_ids, exclude_nullified, exclude_outdated}`;
   nome até 50 caracteres; árvore de assuntos em
   `brokk.qconcursos.com/product/1/subjects?use_separator=true&discipline_ids=N`.
   Cadastrar como material `link` com URL `elite.qconcursos.com/...notebook_ids[]=ID`
   e `Chave: <chave>` no fim da descrição.
3. **Planejador** (`plan_new.py`, a escrever a partir de `replan.py`): uma trilha por
   disciplina; séries inteiras (divide só acima de 90 min G1 / 150 min G2, em metas
   seguidas e sozinha na disciplina); questões logo após cada assunto (Q1/QC);
   assuntos sem aula viram itens só de questões (unidade = tópico-pai); lei seca e
   leitura da Meta 08 em diante (lei seca de assuntos das Metas 01–07 recuperada nas
   Metas 08–14); revisões 7/21 (alta), 10/28 (média), 21 (baixa); RLM a cada ≤3 dias;
   discursiva semanal na PRF (trilha Discursiva do Volney + redação); domingo com
   revisão do caderno de erros; ritmo de vídeo para terminar o conteúdo ~Meta 85;
   toda meta com caderno; tutorial no último item.
4. **Gravar** em lotes (~15 KB, um comando com CTEs, como `first5.tpl`: cria a meta e
   os itens, materiais por fichas `v:TRILHA:ordem`, `q:chave`, `n:ordem`, `a:TRILHA`,
   `vm`, `tu`), depois resolver `{AULAS}`, `{BLOCO}`, `{TT}`, `{NOTA}` (ver `resolve.sql.tpl`).
5. **Verificar**: toda meta com caderno; RLM com caderno; nenhuma leitura/lei seca
   antes da Meta 08; nenhum `{` sobrando; séries não partidas fora da regra; amostra
   de 1 meta por curso/grupo para o usuário. Atualizar `08-pendencias.md`.
