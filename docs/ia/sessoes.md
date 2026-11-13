# Registro de sessões (memória episódica, passagem de bastão entre IAs)

Revisado em: 2026-11-13. Uma entrada por sessão, **a mais nova no topo**, no máximo ~10 linhas. Mantenha
só as 15 mais recentes aqui; ao passar disso, resuma as antigas em uma linha cada em "Resumo anterior"
(esquecimento controlado). Decisões vão também para `06`; tarefas abertas para `08`.

## Modelo

```
### AAAA-MM-DD — <IA/modelo> — <tema>
- Pedido: <o que o usuário pediu, em uma frase>
- Feito: <o que mudou (PRs, migrações, dados), com IDs/arquivos>
- Não feito / bloqueios: <o que ficou e por quê>
- Próximo passo: <o que a próxima IA deve fazer primeiro>
- Conferir: <o que precisa de verificação ou decisão do usuário>
```

## Sessões

### 2026-11-13 — Claude — lote de diagnósticos de 22/11 (início, pausado)
- Pedido: começar o lote semanal de 22/11 e o Simulado Geral 02 PMPE; depois, pausar e guardar para avaliar o TEC Concursos.
- Feito: inventário (6 blocos completos; Simulado Geral 02 publicado sem questões); PMPE 36–42 com 30 questões escolhidas e 15 gabaritos oficiais, em `ops/diagnosticos-2211/pmpe-36-42.json`. Nada gravado no banco. Apagada a pedido a tentativa da conta de teste no diagnóstico Metas 22–28 (respostas e início junto).
- Não feito / bloqueios: Qconcursos devolveu 429 ao ler gabaritos (respostas pela conta autorizada pelo usuário, parceria B2B); lote pausado.
- Próximo passo: definir a fonte (TEC Concursos ou Qconcursos com ritmo lento) e retomar PMPE 36–42, depois GMF, PRF, PMCE, PPCE, CFO e Simulado Geral 02.
- Conferir: o Simulado Geral 02 abre em 22/11 e está vazio; precisa das 60 questões antes disso.

### 2026-11-13 — Codex — passagem técnica e diagnósticos restantes
- Pedido: resumo técnico do trabalho aplicado e atualização da memória para o Claude; PCCE/PRF ADM fora da prioridade por ora.
- Feito: `ops/replanejamento-90/PASSAGEM-CLAUDE.md`, com PR #142 mesclado, cobertura, limites, preservações, testes, ocorrência 429 e reversão.
- Consulta somente leitura: 16 diagnósticos semanais preparados para G1 nos seis cursos, incluindo seis de 15/11, todos com questões e gabaritos comentados. G2/teste não duplicados na conta.
- Faltam criar 56 até a Meta 84: PMPE 7, GMF 9, PRF/PMCE/PPCE/CFO 10 cada. Metas 85–90: mais seis avaliações apenas recomendadas, sem aprovação nem criação.
- Não feito: novos diagnósticos, questões, liberações ou alterações em produção; esta passagem é documental. PCCE/PRF ADM pausados, sem alteração dos dados.
- Próximo passo: alinhar preparação do lote semanal de 22/11 e Simulado Geral 02 PMPE (60 questões); conferir banco antes de novas ações.

### 2026-11-13 — Codex — seis editais contemplados até a Meta 90
- Pedido: PMPE, GMF, PRF, PMCE, PPCE e CFO PMCE; G1 e conferência pela conta de teste; preservar metas liberadas e progresso.
- Decisões: legislação/PDF + questões quando faltar aula; conferir normas da PRF; manter todo o volume aceitando metas mais longas, sem transferir itens a opcionais.
- Feito em produção: 86 metas futuras, 157 itens novos, cinco substituições arquivadas com histórico e 34 fontes oficiais; carga máxima ajustada ~3h31. PR #142 registra lote, controlador e conferência.
- Cobertura real do planejamento: 90 metas em cada curso, zero lacunas; PMPE 182, GMF 156, PRF 221, PMCE 156, PPCE 212 e CFO 204 unidades. Não são conclusões dos alunos.
- Preservado: todas as demais metas idênticas (hash antes/depois), GMF/PMCE sem alterações, datas/público das metas e desbloqueios dos diagnósticos; nenhuma escrita em dados de alunos ou envio de e-mail.
- Verificado: 14 testes de SQL/integridade/transporte e memória; lote completo em PGlite; consulta independente de produção e conferência de cada gravação; revisão de segurança e CI aprovados antes da aplicação.
- Ocorrência: limite 429 da API após 36 metas; retomada com intervalo e reconhecimento das gravações existentes, sem duplicar itens. Reversão só futura e sem progresso, arquivando em vez de apagar.
- Próximo passo: Simulado Geral 02 PMPE (22/11); PCCE/PRF ADM ficam fora deste lote de seis cursos. Manter correspondência pedagógica ao editar as metas.

### 2026-11-13 — Codex — diagnósticos de 15/11 liberados ao Grupo 1
- Pedido: usuário confirmou os seis diagnósticos para G1, preservando 15/11 e conclusão da meta; informou que G2 foi encerrado.
- Feito no banco: seis diagnósticos publicados, antes só G3, agora `target_groups {1,3}`; sem alterar questões, gabaritos, tentativas ou metas.
- Cursos/blocos: PMPE 29–35 (30 questões); GMF 15–21 (40); PRF 08–14 (60); PMCE 08–14 (50); PPCE 08–14 (45); CFO PMCE 08–14 (50).
- Segurança: IDs exatos e seis cursos distintos; transação com bloqueio, validações de metas publicadas G1 no mesmo curso/data, itens, gabaritos/comentários e função ativa; conferência após commit.
- Preservado: status publicado, data 15/11, `unlock_goal_id` original (Meta 35, 21 ou 14) e acesso de teste. Rascunhos G2 e matrículas não alterados; nenhum e-mail.
- Reversão: retirar G1 apenas desses seis IDs, mantendo G3 e todo histórico, se autorizada; não apagar conteúdo ou tentativas.
- Próximo passo: preparar as 60 questões do Simulado Geral 02 PMPE para 22/11; G2 não é público de novas liberações.

### 2026-11-12 — Claude (Opus) — redações (PDF, nota), ajuste visual e Início
- Pedido: corrigir/entregar redações PMPE em PDF; nota geral (objetiva + redação); alinhar ao design o que o Codex fez
  (PDF da correção, Redações, ranking com redação) e deixar o Início menos carregado.
- Feito: PR #131 (`nota_geral`, só G3); Jaiane lançada no painel (27/40); PDFs de devolutiva das 2 alunas;
  PR deste ajuste: avisos do Início num só cartão (redação corrigida, contador, novidades, instalar app),
  Redações/Análise com `PageHeader` e cartões padrão, ranking com colunas alinhadas (Objetiva | com redação).
- Não feito: nota da Cibelle no painel (sessão de admin caiu; pedir login ao usuário).
- Próximo passo: lançar a nota da Cibelle (7, 8, 9, 8) e publicar o PDF dela; conferir o Início no G3.
- Conferir: ligar `nota_geral` no Grupo 1 quando o usuário aprovar.

### 2026-11-11 — Codex — ranking pela nota final
- Pedido: mostrar "com redação" em verde ao lado da objetiva e ordenar pela soma; conta de teste e Grupo 1 confirmados.
- Feito: RPC adicional com autorização e consentimento, função de grupo independente e card comparativo; ranking provisório para correções pendentes.
- Escopo: PMPE; não alterar diagnóstico semanal, notas, tentativas, cópias de conferência ou `nota_geral` do Relatório.
- Verificado: 313 testes locais, TypeScript e build aprovados; teste SQL repetido após endurecer o bloqueio por função de ranking desligada.
- Banco: migração aplicada, função ativa só na PMPE G1/teste; soma 52 + 27 = 79, 4 participantes, 1 correção pendente. Notas e `nota_geral` preservadas.
- Próximo passo: publicar o PR #136 e conferir o card na interface; verificação remota ainda na fila, sem afirmar CI verde.

### 2026-11-11 — Codex — cópia publicada na conta de teste
- Pedido: publicar o PR #134 e entregar a devolutiva atual à conta protegida para replicar o caminho do aluno.
- Feito: PR encontrado já mesclado (`4170581`), produção READY; migração aditiva aplicada e destinatário configurado por RPC administrativa.
- Feito: devolutiva existente entregue automaticamente; cópia com leitura própria, PDF privado, nota e comentário. Publicações futuras usam o trigger.
- Verificado em produção: conta configurada acessa o PDF; outro aluno não acessa; original e contagens de tentativas preservados; cópia não lida na conferência.
- Verificado: endpoint novo registrado no PostgREST e anônimo negado (401/42501). Testes locais de SQL, actions, rota e memória aprovados.
- Limite: CI remoto permaneceu na fila, sem jobs; usuário autorizou publicação após ciência do bloqueio. Não registrar CI como aprovado.
- Próximo passo: conferir pela conta protegida, selecionando o curso PMPE em Relatório → Redações. Acompanhar o CI remoto quando retomar.

### 2026-11-11 — Codex — cópia das devolutivas para conferência
- Pedido: regra permanente e implementação para toda devolutiva também chegar à conta de teste; disponibilizar a atual agora.
- Feito: configuração administrativa por UUID, cópias com leitura independente e trigger de publicação; mesmo caminho de Relatório/Redações/download.
- Segurança: acesso restrito à conta configurada e matrícula ativa no Grupo 3 do curso; sem acesso geral às redações/fotos, sem tentativas sintéticas.
- Verificado: conta protegida já possui matrícula ativa de teste na PMPE; notas e lembrete originais não serão alterados.
- Próximo passo: CI, revisão, migração, configuração do destinatário, publicação e teste da cópia existente.

### 2026-11-11 — Codex — publicação da análise em PDF
- Pedido: usuário esclareceu que a revisão pode ser feita pelo Codex e autorizou migração e publicação completas.
- Feito: revisão de segurança, CI aprovado, migração aditiva aplicada pela API, PR #132 mesclado e deploy de produção READY (`6bcd194`).
- Feito: PDF recebido anexado exclusivamente à redação autorizada, público Grupo 1; lembrete individual não lido, sem e-mail/push e sem alterar notas.
- Verificado: RLS real em transação somente leitura permite PDF ao dono e nega a outro aluno; bucket privado; arquivo baixado confere com o SHA-256 do original.
- Verificado: notas e objetiva preservadas, 1 publicação apenas. Página de análise e download exigem login.
- Próximo passo: corrigir a redação ainda pendente até 17/11; futuras devolutivas pelo painel.
- Regra atualizada: revisão obrigatória de segurança sem exclusividade do Claude (`01`, decisão de 11/11).

### 2026-11-11 — Codex — PDF privado da correção e lembrete individual
- Pedido: acesso pelo Relatório à análise de cada redação, PDF para baixar e aviso só ao destinatário; Grupo 1 direto autorizado.
- Feito: caminho Relatório → Redações → análise; upload no admin; bucket privado, RLS e RPCs de publicação/leitura; aviso individual com controle de versão.
- Conferido no banco (somente leitura): 1 redação corrigida e 1 pendente; memória antiga de 2 pendentes retificada.
- Não feito: merge, migração, deploy, anexo e aviso reais. Exigem revisão pelo Claude antes de publicação, conforme `01`.
- Próximo passo: conferir CI e revisão do PR; aplicar migração e anexar o PDF final pelo painel ao destinatário autorizado, Grupo 1. Não alterar notas ou `nota_geral`.
- Conferir: usar o PDF final aprovado pelo professor; não incluir arquivo/dados de aluno no Git.

### 2026-11-10 — Claude (Opus) — personalização, cursos novos e AI Memory
- Pedido: fases 1–3 da personalização; materiais e 90 metas de PCCE, PRF ADM e GCM; Metas 01–03 para 16/11;
  ofertas Hotmart; regras de correção de redação; memória para qualquer IA.
- Feito: PRs #122–#128 mesclados (introdução, formulário enxuto, grupo único, "Se sobrar tempo");
  materiais Hotmart dos 3 cursos, Vade Mecum PCCE; Metas 01–03 publicadas; mapeamentos Hotmart
  (`04`); docs `00`, `13`–`16`, `estado-atual`, `sessoes`, `skills/`, teste `ia-memory` (PR #129).
- Não feito: Fase 4–5; cadernos novos dos assuntos sem caderno; material faltante de PRF ADM e GCM.
- Próximo passo: mesclar o PR #129 (perguntar); lote de metas 04+ dos 3 cursos; corrigir 2 redações PMPE.
- Conferir: 1ª venda real de PCCE, PRF ADM e GCM; proteção da `main` com Code Owners.

## Resumo anterior
- Até 2026-11-09: ver `06-decisoes.md` e `07-incidentes-e-licoes.md` (histórico completo).
