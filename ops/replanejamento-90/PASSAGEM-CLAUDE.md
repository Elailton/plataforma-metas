# Passagem técnica para o Claude — 13/11/2026

Leia primeiro a ordem de `docs/ia/00-comece-aqui.md`. Esta passagem resume trabalho já aplicado; não é autorização para repetir o lote nem para criar/publicar novas avaliações.

## Escopo e decisões atuais

- Cursos: PMPE, GMF, PRF, PMCE, PPCE e CFO PMCE. **PCCE e PRF ADM estão pausados por pedido expresso do usuário em 13/11.** Não retomar automaticamente por chegada de aluno sem alinhar a prioridade.
- G2 encerrado para novas entregas; preservar seu histórico. Público do trabalho: G1 e conferência pela conta protegida de teste, sem mostrar grupos ao aluno.
- O usuário escolheu manter todo o volume, aceitando metas mais longas. Não reduzir questões, nem transferir blocos obrigatórios para “Se sobrar tempo”.
- Legislação/PDF + questões autorizados quando faltar aula adequada no próprio curso. PRF: conferir referências normativas atuais.

## Já aplicado em produção

**PR #142 mesclado**, commit final na main `fe1943f4eac9d7badccce9194661173e34ff4443`:
https://github.com/Elailton/plataforma-metas/pull/142

Foram complementadas 86 metas futuras, sem progresso, com 157 itens novos (incluindo cinco substituições arquivadas com histórico) e 34 fontes oficiais da PRF. A maior carga estimada entre as metas ajustadas é ~211 minutos (3h31). GMF e PMCE já estavam completos e não receberam alterações.

| Curso | Metas regulares | Unidades terminais do edital | Lacunas após aplicação | Metas ajustadas |
|---|---:|---:|---:|---:|
| PMPE | 90 | 182 | 0 | 1 |
| GMF | 90 | 156 | 0 | 0 |
| PRF | 90 | 221 | 0 | 68 |
| PMCE | 90 | 156 | 0 | 0 |
| PPCE | 90 | 212 | 0 | 14 |
| CFO PMCE | 90 | 204 | 0 | 3 |

**Limite da afirmação:** 100% das 1.131 unidades do edital cadastrado estão contempladas no planejamento até a Meta 90, por item próprio ou ancestral. Isso não significa conclusão dos alunos nem nova auditoria jurídica integral de todos os materiais antigos. Meta 0 fica fora da contagem.

Correções principais:
- PMPE Meta 63: aula de Estado de Defesa/Estado de Sítio corrigida para o assunto certo. As 12 questões originais de Organização dos Poderes permanecem; prática de Defesa do Estado acrescentada separadamente.
- CFO PMCE: quatro recortes de Maria da Penha, com leitura e prática.
- PPCE: oito lacunas, separando regime disciplinar dos servidores da disciplina das pessoas presas.
- PRF: 55 lacunas, incluindo 31 referências antigas do CONTRAN; fontes oficiais atuais e orientação de estudar somente o idioma escolhido na prova.

Não houve alteração de metas liberadas, conclusões, matrículas, tentativas, notas, questões/gabaritos dos diagnósticos, RLS ou autenticação. Datas/públicos das metas e desbloqueios das avaliações permaneceram iguais. Nenhum e-mail enviado. Não houve migração nem mudança de interface.

## Segurança, testes e conferência

- CI `validate` aprovado: testes, TypeScript e build. 14 testes novos de SQL/integridade/transporte, além da memória; lote completo de 86 operações exercitado em PGlite.
- SQL com IDs explícitos, locks, conferência de versão/conteúdo/curso/material, recusa de metas liberadas ou com progresso, arquivamento em vez de exclusão.
- Consulta independente de produção confirmou 90 números distintos e zero lacunas nos seis cursos. Conferência do estado completo de cada meta ajustada; hashes antes/depois idênticos para todas as metas fora do lote. Desbloqueios dos diagnósticos idênticos ao snapshot.
- A API retornou 429 após 36 metas; retomada com intervalo e reconhecimento exato das já gravadas concluiu as 86, sem duplicação. Repetição automática somente de 429; resultados incertos exigem nova leitura.
- Reversão preparada por meta ainda futura e sem progresso: arquivar novos itens, reativar originais aplicáveis, restaurar textos. Recusar reversão após liberação, progresso ou edição posterior.
- Código e lote revisável: `ops/replanejamento-90/`; relatório detalhado: `RESULTADO.md`. Evidências e SQL de reversão persistem no diretório privado de execução fora do Git, sem dados pessoais. Não reaplicar a partir de um novo snapshot.

## Diagnósticos semanais — consulta de 13/11

Contagem somente de G1, sem duplicar a conta de teste nem contar G2, Simulados Gerais ou mini simulados por disciplina. Os 16 preparados estão publicados e têm questões e gabaritos comentados; **incluem os seis de 15/11 ainda sujeitos à data e à conclusão da meta de desbloqueio**.

| Curso | Já preparados | Faltam criar até a Meta 84 |
|---|---:|---:|
| PMPE | 5 | 7 |
| GMF | 3 | 9 |
| PRF | 2 | 10 |
| PMCE | 2 | 10 |
| PPCE | 2 | 10 |
| CFO PMCE | 2 | 10 |
| Total | 16 | 56 |

Regra atual: um diagnóstico por sete metas, total de 12 blocos completos por curso até a Meta 84 (72 nos seis cursos). **Ainda faltam criar 56.** Recomendada uma avaliação de encerramento das Metas 85–90 por curso: mais seis, total potencial de 62 pendentes. **Essa extensão foi apenas sugerida, não aprovada nem criada.** Não incluir Simulado Geral nessa soma.

Próximo lote semanal, seguindo as datas atuais: 22/11; PMPE Metas 36–42, GMF 22–28 e PRF/PMCE/PPCE/CFO 15–21. Aplicar regras de questões reais, cadernos do bloco, comentários e lançamento por grupo; conferir novamente o banco antes de gerar.

Outra pendência independente: Simulado Geral 02 PMPE em 22/11, 60 questões ainda por preparar, já registrada em `08-pendencias.md`.
