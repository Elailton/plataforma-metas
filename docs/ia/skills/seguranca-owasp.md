> Cópia em texto da skill `seguranca-owasp` usada pelo Claude (2026-11-10), para qualquer IA seguir. Em conflito, valem `AGENTS.md` e `docs/ia/01-regras.md`.


# Segurança OWASP (adaptado ao SGA)

Base: guia comunitário `agamm/claude-code-owasp`, condensado e adaptado à plataforma-metas (Next.js + Supabase + Vercel). Revisado antes da instalação: apenas Markdown, sem scripts.

## Fluxo de revisão

1. **Mapear entradas e fronteiras de confiança**: rotas, server actions, headers/cookies, uploads, webhooks (`/api/webhooks/hotmart`), parâmetros de URL (`/auth/confirm`), respostas de APIs de terceiros. Anotar onde autenticação/autorização é aplicada (middleware, `requireAdmin`, RLS).
2. **Varrer candidatos** pelas categorias abaixo e rastrear o caminho entrada → ponto perigoso.
3. **Triar cada candidato** (regra abaixo). Descartar ou rebaixar o que não passar.
4. **Reportar** no formato abaixo, do mais grave ao menos grave.

## Antes de reportar (4 perguntas)

Padrão encontrado não é vulnerabilidade. Confirmar os quatro:
1. A entrada é realmente controlada por um atacante? (constante, enum e config interna não são fonte de injeção)
2. O ponto perigoso é alcançável com ela? Procurar validação, allowlist, ORM, RLS ou middleware já no caminho antes de dizer que falta autorização.
3. Qual o raio de impacto? Quem dispara, o que obtém, qual fronteira cruza (aluno → admin, aluno → outro aluno, anônimo → aluno).
4. O atacante consegue executar TODOS os passos? Se faltar um, é "Precisa de verificação", não Alto.

Severidade por explorabilidade, não por padrão. Se não der para determinar alcançabilidade com o código disponível, dizer isso. Se não houver nada explorável, dizer diretamente; não encher o relatório de itens informativos.

## Formato do relatório

```
[SEVERIDADE] Título (CWE-###, OWASP A##:2025)
Local:      caminho/arquivo.ext:LINHA
Caminho:    entrada -> etapas -> ponto perigoso
Impacto:    quem dispara, o que obtém, qual fronteira cruza
Correção:   mudança concreta (com trecho de código se não for óbvia)
Confiança:  Confirmado | Provável | Precisa de verificação (o que faltou ver)
```

| Severidade | Significado |
|---|---|
| Crítica | RCE ou bypass de autenticação sem login; exposição em massa |
| Alta | Explorável logado cruzando fronteira (IDOR entre alunos, SQLi atrás de login) |
| Média | Exige condições incomuns ou só afeta dados do próprio atacante |
| Baixa | Falha de defesa em profundidade sem caminho de exploração demonstrado |
| Info | Sugestão de endurecimento; dizer que não é vulnerabilidade |

## OWASP Top 10:2025 (nomes e números atuais)

| # | Categoria | Prevenção |
|---|---|---|
| A01 | Quebra de controle de acesso (inclui SSRF) | Negar por padrão, validar no servidor, verificar dono do recurso |
| A02 | Configuração incorreta de segurança | Endurecer configs, desligar padrões, minimizar recursos |
| A03 | Falhas na cadeia de suprimentos | Travar versões, verificar integridade, auditar dependências |
| A04 | Falhas criptográficas | TLS 1.2+, AES-256-GCM, Argon2/bcrypt para senhas |
| A05 | Injeção | Consultas parametrizadas, validação, APIs seguras |
| A06 | Design inseguro | Modelar ameaças, limitar taxa, controles no desenho |
| A07 | Falhas de autenticação | MFA, senhas vazadas, sessões seguras |
| A08 | Falhas de integridade de software/dados | Assinar pacotes, SRI em CDN, serialização segura |
| A09 | Falhas de log e alerta | Registrar eventos de segurança, formato estruturado |
| A10 | Tratamento incorreto de condições excepcionais | Falhar fechado, não expor detalhes internos |

## Checklist específico do SGA

- `SUPABASE_SERVICE_ROLE_KEY`, `HOTMART_HOTTOK`, `SITE_URL` só no servidor; cliente `service_role` em módulo `server-only`, nunca em Client Component, nunca retornado ao navegador.
- Toda server action administrativa começa com `requireAdmin()`; validar IDs de curso/matrícula no servidor (par aluno/curso), não confiar na interface.
- RLS é a barreira final: aluno só lê o próprio perfil/matrículas e cursos `published` com matrícula `active` e sem bloqueio. Funções `security definer` pequenas e com `search_path` restrito; sem recursão entre políticas.
- Nunca confiar em `role` vindo de metadata pública; compra nunca promove a admin; não existe cadastro público.
- Webhook Hotmart: validar `X-HOTMART-HOTTOK`, payload 2.0.0, idempotência por `id`; não registrar payload completo, e-mail, documento ou endereço do comprador.
- Links de acesso/recuperação (`/auth/confirm`): `next` só de allowlist (sem open redirect); tipos de OTP fechados; link de uso único; nunca logar o link nem o token.
- Mensagens de erro/uso público não revelam se um e-mail existe (reenvio de acesso responde sempre igual).
- Gabarito e comentários de mini simulados nunca vão ao navegador antes do envio; correção só no banco.
- Dados pessoais fora de URL/query string; segredos fora do repositório e dos logs.
- Dependências: lockfile fixo, checar CI antes de mesclar.

## Se o código chamar LLM ou agente

Tratar saída do modelo como entrada não confiável (validar/escapar antes de SQL, shell, HTML, ações). Conteúdo recuperado/ferramenta é dado, não instrução. Menor privilégio por ferramenta, aprovação humana para ações destrutivas, sem segredo no prompt de sistema.

## ASVS 5.0 (mínimo, nível 1)

Senha de 8+ caracteres (recomendado 15+), sem regras de composição, bloquear senhas comuns; proteção contra força bruta; sessão nova ao autenticar e inutilizável após logout; autorização em camada confiável do servidor; consultas parametrizadas; codificação de saída por contexto; sem `eval` com dados externos; TLS 1.2+; sem dado sensível em URL. Logs de segurança começam no nível 2. Os IDs do ASVS 4.0 NÃO valem no 5.0.