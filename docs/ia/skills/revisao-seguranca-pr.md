> Cópia em texto da skill `revisao-seguranca-pr` usada pelo Claude (2026-11-10), para qualquer IA seguir. Em conflito, valem `AGENTS.md` e `docs/ia/01-regras.md`.


# Revisão de segurança de mudanças (PR/diff)

Adaptado das skills `differential-review`, `insecure-defaults` e `sharp-edges` do repositório trailofbits/skills (licença CC BY-SA 4.0; esta versão condensada mantém a atribuição e a mesma licença). A parte de CodeQL e os fluxos paralelos do original NÃO foram trazidos (exigem ferramentas que não rodam no ambiente). Revisado antes da instalação: Markdown e referências, sem comandos de rede.

## Princípios

1. **Risco primeiro**: autenticação, autorização, RLS, criptografia, links de acesso, chamadas externas, remoção de validação.
2. **Baseado em evidência**: cada achado com arquivo:linha, histórico git e cenário de ataque concreto.
3. **Adaptativo**: PR pequeno em área de risco alto recebe revisão profunda ("Heartbleed foram 2 linhas"). Classificar por RISCO, não por tamanho.
4. **Honesto**: dizer o que não foi coberto e o nível de confiança.
5. **Sempre deixar um relatório** curto (no chat, ou arquivo no scratchpad se for longo).

## Racionalizações a rejeitar

| Racionalização | Por que está errada | Ação |
|---|---|---|
| "PR pequeno, revisão rápida" | Tamanho não mede risco | Classificar por risco |
| "Conheço este código" | Familiaridade gera ponto cego | Reconstruir o contexto base |
| "Histórico git demora" | Histórico revela regressões | Nunca pular |
| "O impacto é óbvio" | Chamadores indiretos escapam | Contar chamadores |
| "Sem testes não é problema meu" | Falta de teste eleva o risco | Registrar no relatório |
| "É só refatoração" | Refatoração quebra invariantes | Tratar como ALTO até provar BAIXO |

## Fluxo (análise diferencial)

1. **Triagem**: listar arquivos alterados e classificar risco.
   - ALTO: login/sessão/OTP, `requireAdmin`, políticas RLS e funções `security definer`, webhook Hotmart, service_role, remoção de validação, nova chamada externa.
   - MÉDIO: regra de negócio, mudança de estado, nova rota/ação pública.
   - BAIXO: textos, estilo, testes, logs.
2. **Análise do código**: para cada trecho ALTO/MÉDIO, ler o contexto, rodar `git blame`/`git log -p` no código de segurança que foi REMOVIDO (vem de commit de correção? reintroduz bug antigo?).
3. **Cobertura de testes**: o código alterado tem teste? Se não, subir a severidade e dizer.
4. **Raio de impacto**: contar chamadores (`grep`); ALTO risco com muitos chamadores exige análise adversarial.
5. **Análise adversarial (só ALTO)**: quem é o atacante (anônimo, aluno, aluno de outro curso, admin comprometido)? Qual a sequência concreta de passos? O que ele obtém? Cruzar com a base.
6. **Relatório**: achados por severidade, com arquivo:linha, cenário, correção e confiança.

### Sinais de alerta (parar e investigar)

- Código removido de commit de "fix", "segurança" ou CVE.
- Verificação de papel/dono removida, ou `requireAdmin` ausente em nova action.
- Validação removida sem substituição; allowlist de `next`/redirect afrouxada.
- Política RLS ampliada, `using (true)`, função `security definer` sem `search_path`.
- Segredo ou service_role passando para código de navegador.

## Padrões inseguros por omissão (varredura)

Só reportar se o app de fato roda com o valor inseguro; `env['CHAVE']` que falha é seguro, `env.get('CHAVE') or 'dev'` não é.

| Categoria | Exemplo |
|---|---|
| Segredo reserva | `SECRET = process.env.KEY ?? "dev"` |
| Credencial padrão | usuário `admin`/`admin123` em seed que vai para produção |
| Chave que falha aberta | `REQUIRE_AUTH` com padrão `false`; modo de teste ligado por omissão |
| Criptografia fraca | MD5/SHA1 para senha; comparação não constante de token |
| Acesso permissivo | CORS `*` com credenciais, bucket público, `using (true)` |
| Vazamento de debug | stack trace ou mensagem interna na resposta; log com e-mail/token/link |

Distinguir candidato **configurável** (padrão alternativo — só é bug se o app roda com ele) de **incondicional** (inseguro como escrito, sem configuração).

## Sharp edges (APIs/configs que convidam ao erro)

Princípio: o caminho mais fácil deve ser o seguro.

- **Parâmetro escolhe algoritmo/modo** (`alg: none` em JWT): nunca deixar entrada não confiável decidir uma decisão de segurança.
- **Zero/vazio/nulo desliga a proteção**: o que acontece com `timeout=0`, `max_attempts=0`, `key=""`, `lifetime=-1`? Validar e rejeitar combinações perigosas.
- **Tipos primitivos para conceitos diferentes** (tudo é `string`): chaves, tokens e IDs de curso/matrícula trocáveis sem erro de tipo. Preferir tipos/validadores semânticos.
- **Comparação que parece igual mas não é** (`==` vs comparação em tempo constante).
- **Penhascos de configuração**: uma flag errada derruba tudo sem aviso; env var que sobrescreve segurança; typo aceito como verdadeiro.
- **Falhar aberto** em vez de fechado diante de erro (exceção que concede acesso).

## Checklist final

- [ ] Todos os arquivos alterados analisados
- [ ] `git blame` no código de segurança removido
- [ ] Raio de impacto calculado para risco ALTO
- [ ] Cenários de ataque concretos (não genéricos)
- [ ] Achados com arquivo:linha e commit
- [ ] Cobertura de teste dita explicitamente
- [ ] Resumo entregue ao usuário

## Quando NÃO usar

Código novo sem base de comparação, mudanças só de documentação ou formatação, ou quando o usuário pede só um resumo rápido.