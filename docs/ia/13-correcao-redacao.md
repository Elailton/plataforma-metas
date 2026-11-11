# 13 — Correção das redações do Simulado Geral (regras do usuário)

Registrado em 2026-11-10 a pedido do usuário ("quero que guarde em pendências e as regras da correção, como
deve ser feita; irei usar outra IA para esse projeto e preciso que ela tenha esse contexto"). Vale para
qualquer IA que corrija ou ajude a corrigir. Fila atual em `08-pendencias.md`, "Redações para corrigir".

## Como a redação chega
- Hoje só o **Simulado Geral 01 da PMPE** (curso `sistema-guiado-da-aprovacao`) tem redação, publicado em
  08/11/2026 para todos os grupos. Funcionamento técnico em `16-grupos-e-avaliacoes.md`, "Redação do Simulado Geral".
- Opcional e feita **no tempo da prova**. Junto com as respostas, o aluno envia: só foto(s) da folha (até 3),
  só o texto digitado, ou os dois. Não existe envio posterior (15 min de tolerância, `ESSAY_TOO_LATE`).
- Folha padrão SGA (PDF em `public/folhas-redacao/`): PMPE com 20 linhas numeradas, mínimo na 15 e máximo na
  20, campo "Título", 4 quadrados pretos nos cantos (confirmam que a folha inteira saiu na foto), sem nome/CPF.
- O aluno foi avisado 2 vezes antes de iniciar e 2 antes de enviar: folha inteira e 100% legível; foto
  embaçada, escura, cortada ou letra ilegível = **anulação sem recurso**; conteúdo fora da redação pode
  causar **banimento**; texto digitado tem **correção aproximada** (não avalia letra, margens nem linhas).
- **Prazo prometido: resultado em até 7 dias após o envio.**

## Onde lançar
- Painel do administrador **Mini Simulados > Redações** (`/admin/mini-simulados/redacoes`): fotos (link
  assinado válido por 1 hora), texto digitado, prazo e formulário com **4 notas inteiras de 0 a 10**,
  comentário (até 4.000 caracteres) e os botões Salvar nota / Anular / Voltar para a fila.
- Grava pela RPC `admin_grade_mini_quiz_essay`. **Nunca lançar nota por SQL direto**: sempre pelo painel.
- O resultado aparece ao aluno na página do simulado e no **Relatório** (4 barras + comentário).
- A correção é feita **fora da plataforma** (a IA ajuda; o professor confere e lança). A IA não acessa as
  fotos sem o professor: ele baixa/mostra a imagem ou cola o texto.

## Conferência obrigatória na conta de teste (11/11/2026)
Toda devolutiva em PDF deve estar disponível também na conta de teste protegida,
no mesmo curso e caminho Relatório → Redações. A entrega de conferência é automática,
com identificação e lembrete próprios. Ler a cópia não marca o aviso real como lido.
Não criar tentativas, respostas ou notas para simular entrega. Antes de liberar um
curso novo, garantir matrícula ativa da conta protegida no Grupo 3 desse curso.
A conta é configurada por UUID no banco, sem e-mail/senha no código. Detalhes em `17`.

## Proposta do Simulado Geral 01 (PMPE)
**Tema: O uso da inteligência artificial na segurança pública: entre a eficiência e a proteção dos
direitos fundamentais.** Textos motivadores (didáticos): I – IA no cotidiano e na segurança pública
(reconhecimento facial, leitura de placas, câmeras, eficiência); II – uso criminoso (deepfakes, golpes contra
idosos, fraudes, notícias falsas) e erros de reconhecimento facial com alguns grupos (abordagens/prisões de
inocentes); III – CF art. 5º, X; EC 115/2022 (proteção de dados, art. 5º, LXXIX); LGPD (Lei 13.709/2018).
Comando: texto dissertativo-argumentativo, norma-padrão, ponto de vista com argumentos consistentes.

## Critérios (edital PMPE 2026, Instituto AOCP)
Dissertativo-argumentativo, **15 a 20 linhas**, **40 pontos**, mínimo **12** (eliminatório na prova real).
Quatro critérios de 0 a 10 (inteiros na plataforma):
1. **Tema, informatividade e argumentação** – aderência ao tema e ao recorte (eficiência × direitos
   fundamentais), repertório, argumentos consistentes, ponto de vista claro.
2. **Coesão e coerência** – conectivos, referenciação, progressão, sem contradição, articulação entre parágrafos.
3. **Estrutura dissertativo-argumentativa e paragrafação** – introdução com tese, desenvolvimento,
   conclusão; parágrafos delimitados; número de linhas (o desconto por linhas fora de 15–20 entra aqui).
4. **Norma-padrão** – pontuação, ortografia, acentuação, concordância, regência, crase, colocação
   pronominal; na folha, legibilidade.

**Zera / anula:** fuga ao tema; não ser dissertativo-argumentativo; desorganização grave ou conteúdo
ofensivo; lápis ou tinta que não seja azul/preta; em branco, ilegível ou fora da área; **qualquer
identificação** (nome, assinatura, números, sinais, desenhos). O que passar da linha 20 não é avaliado.
No SGA, foto ilegível, embaçada ou cortada (sem os 4 quadrados) também anula.

Régua fixa: 9–10 excelente; 7–8 bom com falhas pontuais; 5–6 mediano; 3–4 fraco; 0–2 muito fraco. A mesma
falha recebe sempre o mesmo desconto. Não inventar regra do edital; o que não estiver nele é "critério
interno do SGA" e deve ser dito assim.

## Procedimento para cada redação
1. **Triagem de anulação** antes de qualquer nota: foto legível e completa (4 quadrados)? identificação?
   lápis/cor? tema e tipo textual? Se anular, motivo objetivo em 1–2 frases (vai no comentário) e parar.
2. **Transcrição**: com foto, transcrever linha a linha (`[ilegível]` onde não der) e contar as linhas. Só
   texto digitado: avisar que linhas e legibilidade não são avaliadas (correção aproximada).
3. **Notas**: as 4 notas inteiras, cada uma com 1–3 justificativas citando trechos do aluno; total /40 e se
   ficou acima ou abaixo de 12.
4. **Comentário ao aluno** (pronto para colar, até ~1.500 caracteres): 2ª pessoa, respeitoso e direto;
   1 ponto forte, os 2–3 problemas principais com exemplo do próprio texto e como corrigir, 1 orientação
   prática para o próximo simulado. Seguir a regra 12a (`01-regras.md`): nada humilhante; nunca citar grupo.
5. **Saída**:
   ```
   Tema/argumentação: X/10
   Coesão/coerência: X/10
   Estrutura/paragrafação: X/10
   Norma-padrão: X/10
   Total: XX/40
   Comentário: <texto pronto para colar>
   ```
   ou `ANULAR – motivo: <texto pronto para colar>`.

## Privacidade e segurança
- Não pedir, copiar nem registrar nome, e-mail, CPF ou telefone do aluno; identificar a redação só pela
  posição na fila do painel. Não salvar fotos nem textos dos alunos no repositório, em documentos ou em
  outra IA além do necessário para corrigir.
- Banimento por conteúdo fora da redação: a IA só aponta; a decisão é do usuário.
- Skill equivalente para Claude: `correcao-redacao-sga` (mesmas regras, inclui modo treino).
