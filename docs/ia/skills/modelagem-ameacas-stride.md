> Cópia em texto da skill `modelagem-ameacas-stride` usada pelo Claude (2026-11-10), para qualquer IA seguir. Em conflito, valem `AGENTS.md` e `docs/ia/01-regras.md`.


# Modelagem de ameaças (STRIDE)

Adaptado de `dralgorhythm/claude-agentic-framework` (skill threat-modeling), em português e ajustado ao SGA. Revisado antes da instalação: apenas Markdown.

## Procedimento

1. **Mapear a superfície de ataque**: com Grep/Glob achar pontos de entrada e fronteiras de confiança; esboçar o fluxo de dados (quem envia, por onde passa, onde é guardado).
2. **Enumerar ameaças por STRIDE em cada componente**:
   - **S**poofing (falsificação de identidade): alguém se passa por aluno/admin/Hotmart?
   - **T**ampering (adulteração): parâmetro, payload, ID de curso/matrícula ou token alterado?
   - **R**epudiation (repúdio): a ação administrativa fica registrada com autor e data?
   - **I**nformation disclosure (vazamento): e-mail, gabarito, link de acesso, PII em log/URL/erro?
   - **D**enial of service (negação): reenvio de acesso em massa, endpoints sem limite, tentativas repetidas?
   - **E**levation of privilege (elevação): aluno vira admin, aluno acessa outro curso/aluno, compra ativa bloqueio revertido?
3. **Rastrear o fluxo de dados**: entrada do usuário → processamento → armazenamento; caminho do token de autenticação; caminhos de dado sensível; apontar onde há risco de injeção ou vazamento.
4. **Classificar severidade**: Crítica / Alta / Média / Baixa. Crítica e Alta devem ser corrigidas antes de mesclar.
5. **Registrar** cada ameaça com categoria STRIDE, severidade e mitigação.

## Ameaças de agentes e IA (quando houver fronteira modelo/ferramenta)

- **Injeção de prompt indireta**: instrução escondida em página, arquivo, e-mail ou resposta de API que o modelo executa como se fosse do usuário.
- **Ferramenta envenenada**: servidor MCP/ferramenta comprometida devolve saída criada para manipular o agente.
- **Violação de hierarquia de instruções**: conteúdo de fonte menos confiável sobrescreve instruções do usuário.
- **Tokens com escopo excessivo**: chaves/credenciais mais amplas do que a tarefa exige.
- **Configuração que executa código**: hooks, settings e definições MCP que rodam sozinhos ao abrir um repositório.

## Modelo de documento

```markdown
## Ativo: <ex.: link de acesso do aluno>

### Ameaças
| Ameaça | Tipo STRIDE | Severidade | Mitigação |
|---|---|---|---|
| Link copiado e enviado para a pessoa errada | Spoofing / Info. disclosure | Alta | Uso único, expiração curta, nunca logar, enviar só ao próprio aluno |
| Reenvio de acesso revela se o e-mail existe | Info. disclosure | Média | Mensagem genérica idêntica, tempo de resposta uniforme |
```

## Pontos de partida no SGA

- Webhook Hotmart (HOTTOK, idempotência, eventos fora de ordem, ucode desconhecido).
- Login, primeiro acesso, `/auth/confirm` (OTP, `next`, link expirado).
- Permissões: admin x aluno, grupos 1/2/3, bloqueio por curso, RLS.
- Mini simulados: gabarito antes do envio, tentativa única, ranking.
- Ações administrativas que geram acesso (concessão manual, link de acesso copiado).

Não aprovar código com vulnerabilidade crítica. Não criar criptografia própria. Não pular a análise de ameaças.