# Registro de sessões (memória episódica, passagem de bastão entre IAs)

Revisado em: 2026-11-11. Uma entrada por sessão, **a mais nova no topo**, no máximo ~10 linhas. Mantenha
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
