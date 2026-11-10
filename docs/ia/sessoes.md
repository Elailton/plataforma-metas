# Registro de sessões (memória episódica, passagem de bastão entre IAs)

Revisado em: 2026-11-10. Uma entrada por sessão, **a mais nova no topo**, no máximo ~10 linhas. Mantenha
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
