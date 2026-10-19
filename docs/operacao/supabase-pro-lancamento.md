# Preparação do Supabase para lançamento

Auditoria e alterações em 19/10/2026 no projeto de produção. Escopo: desempenho e segurança; sem alteração de conteúdo, autenticação por convite, matrículas ou progresso. Nenhum adicional pago foi contratado.

## Recursos observados

- PostgreSQL 17; projeto `ACTIVE_HEALTHY`, instância Micro (1 GB, 2 núcleos compartilhados), 60 conexões diretas e capacidade anunciada de 200 clientes pelo pooler.
- Banco de 21 MB; amostra de 10 conexões, incluindo a auditoria. Cache de leitura de 100% nessa amostra; isso não equivale a teste de carga ou medição de CPU.
- SSL do banco obrigatório, autenticação SCRAM no pooler e RLS em todas as tabelas públicas.
- Backups automáticos físicos concluídos; mais recente observado em 19/10/2026 às 02:55 de Brasília. A restauração não foi exercitada. PITR não está habilitado.
- O acesso da integração à cobrança da organização retorna 403: o pagamento do plano foi informado pelo proprietário; recursos e configurações acima foram confirmados pela API do projeto.

## Alterações aplicadas

### Banco

Migração `20261019000100_launch_database_hardening.sql`:

- Dez índices para chaves estrangeiras sem índice de cobertura, incluindo a busca de vínculos por `material_id` e relações de mini simulados, concessões e bloqueios.
- Revogação de execução direta de `handle_new_user` e `check_goal_item_consistency` de PUBLIC, anon e authenticated. As funções continuam funcionando como triggers.
- Revogação de execução anônima de `is_admin` e `has_active_enrollment`. Execução por authenticated e service_role preservada para RLS e rotinas autorizadas.
- Nenhuma definição de função, política RLS ou regra comercial alterada. `lock_timeout=2s` e transação atômica evitam esperar indefinidamente por locks.

A aplicação comparou hashes dos registros de todas as tabelas públicas na mesma transação, com isolamento repeatable read, antes/depois da migração. Todos ficaram idênticos. A versão foi registrada em `supabase_migrations.schema_migrations`.

Uma consulta pontual de vínculos de materiais caiu de 0,663 ms para 0,245 ms na amostra. É apenas um microbenchmark, sem promessa de ganho igual na navegação ou sob carga.

### Supabase Auth

Configurações externas às migrações SQL, aplicadas pela API de gerenciamento:

| Configuração | Antes | Depois |
| --- | --- | --- |
| `disable_signup` | false | true |
| `password_hibp_enabled` | false | true |
| `mailer_otp_exp` | 86399 s | 3600 s |

O cadastro público pela API ficou fechado, coerente com o produto. Convites e criação administrativa do webhook usam Admin API e continuam permitidos. A validação contra senhas vazadas afeta a definição de novas senhas; nenhuma senha existente foi alterada. Links/códigos de autenticação passam a expirar em uma hora; o aluno pode usar o reenvio de acesso quando necessário. Nenhum e-mail de teste foi disparado.

## Validação

- 192 testes do projeto, TypeScript e build passaram.
- Teste em PostgreSQL descartável (PGlite): matriz RLS de alunos por curso/grupo, bloqueados e administradores exatamente igual antes/depois; trigger de criação de perfil funcional; permissões revogadas; dez índices; reaplicação idempotente.
- Em produção: leituras com papéis de aluno e administrador; aluno vê apenas o próprio perfil. Configuração pública de Auth confirma cadastro fechado. Sem criação/exclusão de usuários ou emissão de sessões de teste.
- Diagnóstico Supabase depois: zerados os quatro avisos de execução anônima de funções, o aviso de senhas vazadas, o aviso de expiração longa de OTP e os dez alertas de FKs sem índice.
- Permanecem 17 avisos de funções SECURITY DEFINER executáveis por usuários autenticados: são auxiliares de RLS e RPCs que validam o próprio usuário ou administrador. Não se deve revogar em massa: isso quebraria o produto.
- Permanecem 14 avisos de políticas permissivas sobrepostas (admin + aluno), sem alteração das permissões. Índices recém-criados podem aparecer como “unused” até serem utilizados; não removê-los só por esse indicador.
- `access_resend_requests` tem RLS sem políticas públicas de propósito: é controle interno acessível somente pelo servidor privilegiado.

## Dimensionamento antes do lançamento

A instância Micro foi mantida: não há medição que justifique contratar compute maior nesta etapa. O proprietário informou uma previsão de mais 200 a 400 alunos. Planejar para 400 matrículas adicionais; o pico simultâneo ainda não foi especificado. Ainda falta um teste de carga representativo antes de prometer capacidade.

- Auth usa pool fixo de 10 conexões. Se houver upgrade de compute, revisar a alocação junto com o restante do orçamento de conexões; não aumentar `max_connections` isoladamente.
- Taxa atual de envio do Auth: 100 e-mails/hora. Coordenar campanhas/lotes de convites com esse limite e com a capacidade do provedor SMTP. O teste de entrega real e de alta demanda permanece uma etapa separada.
- Evitar carga destrutiva em produção. Usar ambiente de homologação com dados sintéticos para medir pico de login, metas e marcação de progresso.
- PITR, compute maior e outros adicionais podem ter cobrança. Aprovar custo e janela de operação antes de ativar. Backups existentes não foram restaurados nem alterados.
- A restrição de rede do banco continua aberta a IPv4/IPv6, com SSL e credenciais obrigatórios. Não aplicar allowlist sem conhecer os IPs de saída da Vercel e das integrações: isso pode interromper o serviço.
- A lista de redirects legados não foi reduzida sem confirmar quais domínios continuam sendo usados. CAPTCHA também exige configuração e integração próprias.

## Reversão

Antes de reverter, investigar a falha e preservar os registros. Os índices podem permanecer mesmo se uma configuração de Auth precisar voltar ao estado anterior.

- Auth: restaurar individualmente somente a chave necessária. Antes: `disable_signup=false`, `password_hibp_enabled=false`, `mailer_otp_exp=86399`. Reabrir cadastro ou desativar proteção exige motivo explícito.
- Permissões anteriores: as quatro funções tinham EXECUTE para PUBLIC, anon, authenticated e service_role. Restaurar somente o privilégio que se mostrar necessário; conceder PUBLIC reabre execução a todos os papéis.
- Índices: os dez nomes estão na migração. Se for necessário removê-los, usar uma nova migração com DROP INDEX e verificar dependências e utilização. Nunca apagar dados, funções ou políticas para reverter esta preparação.
