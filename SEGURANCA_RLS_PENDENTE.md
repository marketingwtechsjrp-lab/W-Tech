# ⚠️ Exposição do banco — diagnóstico e plano de correção

**Levantado em:** 25/08/2026
**Status:** NÃO corrigido. O dono optou por priorizar o Chat de IA da Gerência e
tratar isto depois. Este documento existe para que a correção não dependa de
refazer a investigação.

## Atualização de 06/10/2026 — correção em andamento

O dono pediu "deixe tudo seguro" e decidiu **não trocar as chaves**; então o
que importa é parar de entregá-las. Feito até aqui:

1. **Banco, etapa 1 (aplicada em 06/10 16:03):** `anon` e `authenticated`
   perderam todo acesso a `SITE_Users` e `SITE_Roles`, exceto
   `SITE_Users(id, role, receives_leads)` — o gatilho `auto_distribute_lead` e
   a policy `Admins_Manage_All` de `SITE_Leads` leem essas colunas com o papel
   do visitante (sem elas, todo lead do site e do CRM falha). Também saiu do
   anon: `site_user_login` (login sem limite de tentativas) e as rotinas
   `pop_wa_send`, `processar_fila_whatsapp`, `pop_*` e `update_quiz_lead`.
   O painel já usava `/api/staff/*` para usuários e cargos desde 13/08.
   SQL e desfazer: repositório do Gestão, `docs/seguranca-banco/`.
2. **Passe da equipe (v3.50.0):** `/admin` troca a chave anônima por um JWT
   `authenticated` de 15 min emitido em `GET /api/staff/db-token`
   (`api/_dbToken.ts`, `lib/staffDbToken.ts`). Exige `SUPABASE_JWT_SECRET`
   (= `PGRST_JWT_SECRET`) no serviço. É o "Caminho C" que faltava no §4: o
   banco passa a distinguir equipe de visitante sem migrar o login nem
   reescrever o painel.

Próximo: com o passe no ar, fechar para `anon` as tabelas só do painel e deixar
`SITE_SystemSettings` com leitura anônima apenas das chaves públicas
(aparência, SEO, contato, pixel/GA, webhooks de lead). Depois, os formulários
públicos de lead/matrícula/pedido passam por endpoint do servidor.

## Atualização de 04/11/2026 — pedidos (`SITE_Sales`, `SITE_SaleItems`)

**Status: aplicado em 04/11/2026** (site na v3.53.0, depois a migração). Conferido pelo
PostgREST: visitante recebe 401 ao ler e ao gravar, painel e `/rastreio` seguem respondendo.
A ordem foi:

1. Site com `/api/order-tracking` e `/api/client-orders` (`api/_clientOrders.ts`).
   `/rastreio` e `/meus-pedidos` deixam de ler e gravar a tabela pelo navegador.
2. `migrations/2026-11-04_fechar_vendas_anon.sql` (o desfazer está no cabeçalho).

O que muda: `anon` perde todo acesso às duas tabelas; RLS ligada; o painel segue pelo
passe da equipe (`authenticated`). Loja e app usam `service_role`, o gestão usa
`gestao_app`, e os dois têm BYPASSRLS. `hermes_ro` não tem: ganhou policy só de leitura
para não passar a ver 0 linhas sem erro (não leu vendas desde 23/10; se não precisar,
tire a policy e o GRANT). O rastreio não devolve mais endereço, e nenhum pedido em
produção tinha `shipping_address` preenchido, então a tela não muda.

Para conferir a qualquer momento (tem que responder 401):

```bash
curl -s -o /dev/null -w '%{http_code}\n' "$VITE_SUPABASE_URL/rest/v1/SITE_Sales?select=id&limit=1" -H "apikey: $VITE_SUPABASE_ANON_KEY"
```

## Atualização de 04/11/2026 — leads, matrículas e mecânicos

**Status: aplicado em 04/11/2026** (v3.55.0). Conferido pelo PostgREST e com navegador nas
páginas públicas, sem nenhuma consulta recusada. **"RLS ligada" não quer dizer fechada:** as
três tabelas tinham RLS com policy `USING (true)`, e a `anon` lia 3.310 leads (166 com CPF),
258 matrículas e 390 mecânicos, além de poder alterar e apagar. A ordem foi esta, e só
funciona nela:

1. `migrations/2026-11-04_contagem_matriculas_publica.sql` e reiniciar o PostgREST
   (`docker service update --force wtechdb_suparest`). O código novo pede o campo
   `enrollment_count`: sem ele o prerender e as páginas de curso falham.
2. Site com `/api/public-leads`, `/api/public-enrollments` e o login do portal.
3. Conferir o site no ar, e só então
   `migrations/2026-11-04_fechar_leads_matriculas_mecanicos.sql` (o desfazer está no cabeçalho).

O que muda para o visitante:

- **Leads:** só INSERT nas colunas de formulário. `client_code` fica de fora: quem escolhesse
  o próprio código com o e-mail de outra pessoa entraria no portal e veria os pedidos dela.
  Dedupe, recadastro e quiz passam por `/api/public-leads`, que não devolve dado da ficha.
- **Checkout:** o preenchimento vem do que a pessoa digitou (`sessionStorage`), não do banco.
  Link com `?lid=` aberto em outro aparelho chega com o formulário vazio.
- **Matrículas:** nada direto. Vagas saem de `enrollment_count`; obrigado, confirmação e
  certificado passam por `/api/public-enrollments`. O id da matrícula também vai no QR do
  certificado, então CPF nunca sai, contato só com questionário em aberto e antes do
  check-in, e o certificado deixou de mostrar o e-mail do aluno.
- **Mecânicos:** leitura das colunas do mapa, só de aprovado. E-mail, endereço e foto saíram
  da consulta pública porque nenhuma tela os mostrava.
- **Portal do cliente:** login pelo servidor, CPF e RG mascarados, 20 códigos errados por hora
  travam o IP. Por e-mail só entra pedido sem dono, nunca o de outro cliente: 8 pedidos antigos,
  cujo `client_id` aponta para um cadastro que não existe mais, deixam de aparecer no portal
  (seguem no painel). Para devolvê-los, corrigir o `client_id` desses pedidos.

Para conferir a qualquer momento (tem que responder 401):

```bash
curl -s -o /dev/null -w '%{http_code}\n' "$VITE_SUPABASE_URL/rest/v1/SITE_Leads?select=id&limit=1" -H "apikey: $VITE_SUPABASE_ANON_KEY"
```

## Atualização de 04/11/2026 — o resto do que a chave anônima alcançava

**Status em 05/11/2026: etapas 1, 2 e 3 feitas, com OK direto do dono. Etapas 4, 5 e 6 ainda não.** O site
v3.57.0 entrou no ar às 01h36, no mesmo deploy da v3.56.0, v3.56.1 e v3.57.1. Até a etapa 4, a `anon` continua lendo e
gravando `SITE_Orders` (3 CPFs), `SITE_AuditLogs`, `SITE_CaptureLeads`, `SITE_EmailFlows` e `SITE_FlowEnrollments`.

Conferido no ar: PostgREST como visitante (401 ao ler o que fechou e ao gravar conteúdo, 200 no conteúdo público, 42
chaves de configuração e nenhum segredo); 19 páginas públicas no navegador, sem consulta recusada; `/captura` soma votos
por `/api/public-capture` sem ler `SITE_CaptureLeads`; `/api/ai-generate` e `/api/staff/config/ai-keys` respondem 401
sem sessão; nenhum bundle chama provedor de IA; log do banco sem erro de permissão além das sondas da conferência.

**Falta ver o painel com alguém logado:** uma geração de IA de verdade (Blog ou SEO), a aba GPT & Gemini, e um login
aparecendo em Logs de Atividade. O acesso do `authenticated` só foi medido pela matriz, e o `/api/ai-generate` só contra
um provedor simulado. Os erros reais saem com
`docker logs --since 1h <container wtechdb_supadb> 2>&1 | grep 'permission denied'`.

Medido com `has_table_privilege` e `SET ROLE anon` (só contagens): eram **119 tabelas e visões com privilégio
para `anon`**, não as 3 que este documento citava.

### Classificação

| Nível | O que é | Tabelas (linhas que a `anon` lia) |
|---|---|---|
| 1. Segredos | Permite tomar o site ou gastar em nome da empresa | `SITE_SystemSettings` (58, com `openai_api_key`, `openrouter_api_key`, `gemini_api_key`, `email_smtp_pass`, `meli_secret`, e `gtm_id` gravável), `SITE_Settings` (8, com `gemini_api_key`), `config_crm` (0, coluna `supabase_secretkey`) |
| 2. Pessoas | Conversa e contato em massa | `SITE_WaAtendenteMensagens` (101.414, 64.739 com texto), `SITE_MarketingListMembers` (3.518), `SITE_LeadHistory` (2.759), `SITE_WhatsAppCloudMessages` (2.653), `SITE_CampaignQueue` (2.334), `SITE_EmailLogs` (959), `SITE_FlowEnrollments` (699), `SITE_Automacao_Fila` (353), `SITE_WhatsAppCloudConversations` (276), `chats` (112), `SITE_Pix_Recovery_Stats` (86), `SITE_WhatsAppAIMemory` (62), `n8n_chat_histories` (32), `SITE_CaptureLeads` (8), `SITE_Orders` (3, todos com CPF), `SITE_SupportMessages` (3), `SITE_SupportTickets` (1), `profiles` (1) |
| 3. Empresa | Financeiro, auditoria e operação | `SITE_AuditLogs` (19.384, apagável por qualquer um), `SITE_StockMovements` (1.207), `SITE_Tasks` (374), `SITE_Transactions` (101), `view_sales_by_attendant` (12), `SITE_VSLRetention` (42), e as demais do painel |
| 4. Integridade | Conteúdo público com escrita aberta | `SITE_Products` (trocar preço), `SITE_Courses` (preço e `custom_link` de checkout), `SITE_LandingPages` (pixel), `SITE_BlogPosts`, `SITE_SuspensionOil`, `SITE_CertificateLayouts` |
| 5. Sobra | Sem dado hoje ou sem acesso real, só privilégio sobrando | `SITE_Customers` (`password_hash`, 0 linhas por RLS), `SITE_Graph*`, `SITE_Knowledge*`, `leads`, `tasks`, `workshop_*` e outras |

Duas armadilhas que a lista de tabelas sozinha não mostra:

- **Visão roda com os direitos do dono.** Fechar `SITE_Transactions` não fecha
  `view_sales_by_attendant`, nem fechar `SITE_VSLProgress` fecha `SITE_VSLRetention`. As duas
  precisam de `REVOKE` próprio. (`SITE_SpringModels` é `security_invoker` e segue a tabela.)
- **Policy velha quebra o painel quando a RLS é ligada.** As policies de `SITE_MarketingCampaigns`,
  `SITE_MarketingLists` e `SITE_CampaignQueue` leem `auth.users` e nunca rodaram, porque a RLS estava
  desligada. Ligar sem apagá-las daria 42501 para o painel.

### Quem usa (como foi conferido)

- **Rotas públicas:** grafo de imports a partir de `App.tsx`, sem entrar em `pages/Admin.tsx`.
  Único componente do painel em rota pública: `AffiliatesManagerView` em `/afiliados`, que só lê `SITE_Config`.
- **Uso real:** `pg_stat_statements` por papel desde 23/10, com `dealloc = 0` (nada descartado).
- **Loja e app:** usam `supabaseAdmin` em tudo que é sensível. O cliente com a chave pública (`supabase.from`)
  só lê `SITE_Products` (loja e app) e `SITE_Courses` (app), inclusive com `select('*')`.
- **Gestão:** `gestao_app` e `service_role`, sem chave anônima no ambiente.
- **`hermes_ro`:** só leu `gestao.*` desde 23/10, e as skills citam `SITE_Enrollments`, `SITE_Courses` e
  `SITE_Leads`. Ganhou policy para não passar a ver 0 linhas sem erro, menos nos segredos.
- **Realtime:** não existe serviço na VPS, então os `.channel()` do painel não dependem de nada disto.
- **Gatilhos:** o único que roda com o papel do visitante e lê tabela é `auto_distribute_lead`, em `SITE_Users`.
  É por isso que as 3 colunas de `SITE_Users` ficam (ver a próxima leva).

### Ordem de publicação

Só funciona nesta ordem. Etapas 1 e 2 não dependem do site e podem entrar antes dele.

1. `migrations/2026-11-04_fechar_segredos_e_dados_do_painel.sql` (**aplicada em 05/11/2026**)
2. `migrations/2026-11-04_conteudo_publico_somente_leitura.sql` (**aplicada em 05/11/2026**)
3. (**no ar desde 05/11/2026**) **Site v3.57.0**, com `/api/public-capture`, fluxos e auditoria pelo servidor. O código precisa estar
   no `main` antes: `ssh motocenter-vps 'nohup bash /root/deploy-site.sh > /root/deploy-site-3.57.0.log 2>&1 < /dev/null &'`
4. Conferir `/captura/<slug>` no ar, e só então
   `migrations/2026-11-04_fechar_captura_pedidos_fluxos_auditoria.sql`. Antes do site novo ela quebra a
   captura, a inscrição em fluxo de lead novo e o registro de login fora de `/admin`.
5. Conferir uma tela de IA do painel e a aba Configurações > GPT & Gemini no ar, e só então
   `migrations/2026-11-05_chaves_ia_so_no_servidor.sql`. Antes do site novo ela deixa toda tela de IA do
   painel respondendo "API Key não configurada".
6. Trocar as chaves de IA pela aba Configurações > GPT & Gemini. Só depois da etapa 5 a troca adianta: antes
   dela, a chave nova ainda chega ao navegador da equipe.

Aplicar sempre com `psql -U supabase_admin` (o comando está no cabeçalho de cada arquivo, com o desfazer).
Cada migração tem `lock_timeout` de 5 s: se alguma consulta segurar uma tabela, ela desiste inteira, sem
gravar nada, e é só rodar de novo.

### O que muda

- **Configurações:** a `anon` lê só as chaves públicas de `SITE_SystemSettings`, em lista de permissão.
  **Chave nova que o site público precise ler tem de entrar na policy "Visitante le configuracoes publicas"**,
  senão o visitante não a recebe. As chaves de IA, SMTP e Mercado Livre ficam só para o painel.
  `webhook_lead` continua legível porque os formulários disparam o webhook pelo navegador.
- **`SITE_Config`:** a `anon` deixa de ler `ai_last_report`, `ai_last_scan`, `push_send_log`,
  `app_blocked_users` e `crm_roleta_pointer`, que só o servidor usa.
- **Captura:** voto e soma passam por `/api/public-capture`, que não devolve quem votou. A campanha segue
  legível, menos rascunho. De quebra, corrige o envio: desde 16/09 o navegador manda `landing_page`, coluna que
  `SITE_CaptureLeads` não tem e que o PostgREST recusa. O último lead de captura é de 14/07.
- **Fluxo de boas-vindas:** lead novo de página pública é inscrito pelo servidor (`api/_publicLeads.ts`).
  Antes o navegador lia as inscrições com o e-mail da pessoa.
- **Auditoria:** login e logout são registrados pelo servidor, com o nome que vem da sessão. O painel só lê e
  inclui em `SITE_AuditLogs`: sem `UPDATE` e `DELETE`, nem a equipe altera a própria trilha.
- **`pages/Checkout.tsx`:** não grava mais em `SITE_Orders`. Essa tela criava um pedido com status `Paid` sem
  cobrar nada. Agora guarda o interesse e o CPF na ficha do lead por `/api/public-leads`. Ela já não tinha
  visita: 0 acessos em 90 dias, e o carrinho leva a `/checkout`, que dá 404. Os 3 pedidos antigos são de 05/12/2025.
- **Conteúdo:** visitante só lê. As leituras não mudam, nem as da loja e do app com a chave pública.
- **Chaves de IA (§3.2):** nenhuma tela do painel lê mais `openai_api_key`, `gemini_api_key` e
  `openrouter_api_key`, nem chama o provedor pelo navegador. `lib/ai.ts` passa por `/api/ai-generate`
  (`api/_aiGenerate.ts`), com os mesmos modelos, e exige sessão com permissão de alguma tela que usa IA. A aba
  GPT & Gemini só grava, por `/api/staff/config/ai-keys`, e mostra se a chave existe; campo em branco mantém a
  atual. Para apagar uma chave, só direto no banco. A mensagem de erro do provedor não chega mais à tela:
  fica "sem saldo" ou "não respondeu", e o detalhe vai para o log do servidor, sem a chave.

### O que a `anon` ainda alcança depois das 4 etapas

| Acesso | Tabelas |
|---|---|
| Lê | `SITE_BlogPosts`, `SITE_CaptureCampaigns` (sem rascunho), `SITE_CertificateLayouts`, `SITE_Config` (61 chaves), `SITE_Courses`, `SITE_GlossaryTerms` (publicados), `SITE_LandingPages`, `SITE_Mechanics` (colunas do mapa, aprovados), `SITE_Products`, `SITE_SpringModels`, `SITE_SpringRecommendations`, `SITE_SuspensionOil`, `SITE_SystemSettings` (42 chaves), `SITE_Users` (`id`, `role`, `receives_leads`) |
| Só grava | `SITE_Leads` (colunas de formulário), `SITE_Mechanics` (candidatura), `SITE_Analytics_Events`, `SITE_Analytics_PageViews` |

### Validação antes de aplicar (BEGIN; ... ROLLBACK;)

`scripts/rls-matriz.sql` mede leitura e gravação de 138 objetos para `anon`, `authenticated`, `hermes_ro`,
`service_role` e `gestao_app`, antes e depois. Resultado, com as três migrações juntas (2 s de transação):

- `anon`: exatamente a tabela acima.
- Outros papéis, só estas diferenças, todas de propósito: `authenticated` sai de `SITE_Settings` e `config_crm`
  (ninguém usa), perde `UPDATE` e `DELETE` em `SITE_AuditLogs`; `hermes_ro` sai de `SITE_Settings` e vê 42 das 58
  chaves de `SITE_SystemSettings`.
- Nenhum erro novo para quem tem acesso. Os `ERRO` que a matriz mostra já existem hoje: `hermes_ro` sem
  acesso a função de `auth` em policy antiga, e a sonda de `UPDATE` em coluna de identidade (428C9).
- Aplicar e desfazer as três voltou ao efeito original nas 690 combinações de papel e tabela. As policies
  novas ficam, sem abrir nada, e as antigas de tabelas sem RLS não voltam porque nunca valeram.

O que **não** dá para validar sem aplicar: a resposta do PostgREST. Depois de cada etapa, conferir (tem que
responder 401, e a última não pode listar `openai_api_key`):

```bash
for t in SITE_Transactions SITE_WaAtendenteMensagens SITE_MarketingListMembers SITE_Tasks; do curl -s -o /dev/null -w "$t %{http_code}\n" "$VITE_SUPABASE_URL/rest/v1/$t?select=*&limit=1" -H "apikey: $VITE_SUPABASE_ANON_KEY"; done
```

```bash
curl -s "$VITE_SUPABASE_URL/rest/v1/SITE_SystemSettings?select=key" -H "apikey: $VITE_SUPABASE_ANON_KEY"
```

E abrir `/admin` logado nas telas de Configurações, WhatsApp, Marketing e Financeiro.

### Consultas suspeitas que precisam de atenção do dono

Entre 23/10 e 04/11, o `pg_stat_statements` registra como `anon`: `customer_cpf, customer_email` de
`SITE_Orders` com filtro de CPF preenchido (2 vezes), `*` de `SITE_Orders` e de `SITE_GraphSecrets`,
`details` de `SITE_AuditLogs` e `telefone` de `dados_cliente`. Nenhuma tela do site faz isso e nenhuma sessão
local encontrada na busca fez essas consultas. **Não dá para saber quem foi:** nem o Traefik nem o PostgREST
guardam log de acesso. Tratar como possível acesso externo aos 3 CPFs de `SITE_Orders`.

### Próxima leva, nesta ordem

1. **Trocar os 5 segredos de `SITE_SystemSettings` e o `gemini_api_key` de `SITE_Settings`.** Fechar a leitura
   não desfaz o que já vazou: `context/SettingsContext.tsx` faz `select('*')`, então os segredos foram para o
   navegador de todo visitante (59.786 leituras só desde 23/10). O dono tinha decidido não trocar em 06/10; com
   isso e as consultas acima, vale rever.
2. **`email_smtp_pass` e `meli_secret`:** a aba de configurações ainda lê estes dois com o passe da equipe. O
   mesmo caminho das chaves de IA resolve (`/api/staff/config`, campo só de gravação), depois de conferir quem os usa.
3. **`SITE_Products`:** a `anon` ainda lê `average_cost`, `current_stock` e os preços de parceiro e distribuidor.
   Cortar depende de a loja e o app pararem de usar `select('*')` com a chave pública. O código deles não está neste repositório.
4. **Tabela nova nasce aberta:** `pg_default_acl` dá `arwdDxtm` para `anon` em toda tabela criada por `postgres` e
   `supabase_admin`. É a causa de tudo isto, e os `fix_*.sql` soltos na raiz com `GRANT ALL` podem reabrir o que
   está só com `REVOKE`. Corrige com uma linha, depois de avisar quem cria tabela:
   `ALTER DEFAULT PRIVILEGES FOR ROLE postgres, supabase_admin IN SCHEMA public REVOKE ALL ON TABLES FROM anon;`
5. **Log de acesso no Traefik** para `supabase.w-techbrasil.com.br`: sem ele, a pergunta acima não tem resposta.
6. **`SITE_Users`:** tornar `auto_distribute_lead` `SECURITY DEFINER` e tirar as 3 colunas da `anon`.
7. **Spam de formulário:** os formulários simples ainda gravam lead e mecânico direto; só endpoint com limite por IP resolve.
8. **Passe da equipe sem cargo:** qualquer pessoa logada no painel tem o mesmo acesso às tabelas, inclusive `gtm_id`.
9. **Remover `pages/Checkout.tsx`** e a rota, que diz "Pedido Confirmado!" sem cobrar. E `increment_post_view` não existe no banco, então as views de post não contam.

---

## 1. O que está exposto (verificado, não suposto)

Testado com a `VITE_SUPABASE_ANON_KEY` — **a mesma chave que vai no bundle
JavaScript público**. Qualquer visitante de w-techbrasil.com.br a extrai do
DevTools e reproduz tudo abaixo.

### Leitura anônima

| Tabela | Volume | Conteúdo sensível |
|---|---|---|
| `SITE_Users` | 28 | email, telefone, **28 hashes bcrypt de senha** |
| `SITE_Leads` | 2.715 | nome, email, telefone, CPF |
| `SITE_Enrollments` | 212 | email, telefone, CPF de alunos |
| `SITE_Sales` | 451 | dados de cliente |
| `SITE_Transactions` | 68 | lançamentos financeiros |
| `SITE_SystemSettings` | 58 | os segredos listados abaixo |
| `SITE_Roles`, `SITE_Tasks`, `SITE_Courses`, `SITE_WhatsAppAIConfig`, `SITE_WaAtendenteAnalises` | — | legíveis |

Segredos em texto puro dentro de `SITE_SystemSettings`:
`openai_api_key`, `openrouter_api_key`, `gemini_api_key`, `email_smtp_pass`,
`meli_secret`, `webhook_lead`.

### Escrita anônima

Sonda com `WHERE` que não casa nenhuma linha (não alterou nada):

```
SITE_Users          PERMITIDA
SITE_Leads          PERMITIDA
SITE_Roles          PERMITIDA
SITE_Enrollments    PERMITIDA
SITE_Transactions   PERMITIDA
SITE_SystemSettings PERMITIDA  (INSERT confirmado e revertido)
SITE_Config         bloqueada  ✅
```

Três caminhos de estrago imediatos:

1. **Tomada de conta** — sobrescrever `password_hash` de um Super Admin.
2. **Execução de JavaScript no site** — `gtm_id` é gravável e o site carrega
   esse container do Google Tag Manager. Trocado, roda script arbitrário em
   todas as páginas, inclusive nos checkouts.
3. **Desvio de leads** — `webhook_lead` gravável redireciona o tráfego pago.

`SITE_Config` estar bloqueada mostra que as migrations recentes
(`2026-07-30`, `2026-08-14`) fizeram certo. As tabelas antigas ficaram para trás.

---

## 2. A causa raiz — e por que a correção óbvia quebra o site

**A autenticação de staff deste sistema não é Supabase Auth.** É um cookie
httpOnly próprio (`wtech_staff_session`) validado por RPC (`api/_auth.ts`).

Consequência: quando o painel admin fala com o banco pelo navegador
(`lib/supabaseClient.ts`), ele usa a **chave anônima**, e `auth.uid()` é `NULL`.

Do ponto de vista da RLS, **o gerente logado e um visitante aleatório são a
mesma coisa.** Não existe política de RLS capaz de separar os dois.

E o painel depende disso: só `pages/Admin.tsx` faz **36 operações de escrita**
(`.insert` ×11, `.update` ×18, `.delete` ×6, `.upsert` ×1) direto do navegador,
além de 57 leituras.

> **Por isso um `REVOKE ALL FROM anon` derruba o painel inteiro.**
> Não existe atalho de uma migration só. Quem tentar isso vai reverter em 5 minutos.

---

## 3. O que dá para corrigir JÁ, sem quebrar nada

Os segredos não precisam esperar o refactor.

### 3.1 Rotacionar (ação do dono, fora do código)

Tratar como **já comprometidos** — estiveram publicamente legíveis por tempo
indeterminado (não é possível saber desde quando pelo repositório; só os logs
do Supabase respondem):

- `openai_api_key`
- `openrouter_api_key`
- `gemini_api_key`
- `email_smtp_pass`
- `meli_secret`

### 3.2 Tirar as chaves de IA do navegador

Hoje `lib/ai.ts` lê a chave do banco e monta `Authorization: Bearer` **dentro do
navegador** — a chave aparece na aba Network de qualquer usuário do admin.
Consumidores: `BlogManagerView.tsx`, `AITrainingView.tsx`, `AIAnalyticsView.tsx`,
`pages/Admin.tsx`.

Correção: um endpoint `api/ai-generate.ts` protegido por `requireStaffPermission`,
lendo a chave de `process.env`. `lib/ai.ts` passa a chamar esse endpoint.
Depois disso as linhas de chave saem de `SITE_SystemSettings`.

**O Chat de IA da Gerência já nasce assim** (`ANTHROPIC_API_KEY` em variável de
ambiente do servidor) — use `api/manager-chat.ts` como modelo.

### 3.3 Forçar troca de senha dos 28 usuários

Bcrypt é caro de quebrar, mas senha fraca cai. Os hashes circularam.

### 3.4 Fechar `SITE_SystemSettings` por chave

O site público só precisa das chaves de aparência e SEO (`logo_url`,
`primary_color`, `hero_headline`, `seo_*`, `gtm_id`, `pixel_id`…). Uma policy
RESTRICTIVE que exclua a lista de segredos do `SELECT` anônimo é segura **desde
que a etapa 3.2 já tenha sido feita** — senão o próprio admin para de funcionar.

Modelo pronto no repo: `migrations/2026-07-30_protect_stripe_webhook_secret.sql`
(policy RESTRICTIVE + lista de chaves protegidas) e `lib/siteConfig.ts`
(`SECRET_CONFIG_KEYS`).

---

## 4. O refactor de verdade — dois caminhos

Para fechar leitura e escrita anônima nas tabelas de dados, é preciso que o banco
saiba quem está falando. Duas opções:

### Caminho A — migrar staff para Supabase Auth
Cada usuário do painel vira um usuário do Supabase Auth. `auth.uid()` passa a
existir e as policies de RLS voltam a funcionar como projetadas (inclusive a
`migrations/secure_leads_rls.sql`, que hoje é letra morta porque `auth.uid()` é
sempre NULL).
- **A favor:** resolve na origem; RLS vira defesa real.
- **Contra:** mexe no login, nas 28 contas e no sistema de cargos/permissões
  próprio, que é sofisticado e funciona.

### Caminho B — rotear o admin por endpoints do servidor
Toda leitura/escrita do painel passa a ir por `api/*`, com
`requireStaffPermission` + `service_role`. O navegador perde acesso direto ao
banco e a RLS pode fechar para `anon`.
- **A favor:** aproveita o sistema de permissões que já existe e já é usado nos
  endpoints; a permissão passa a ser aplicada de verdade, não só escondendo botão.
- **Contra:** volume. São ~57 leituras e ~36 escritas só em `Admin.tsx`,
  mais os outros componentes.

**Recomendação:** Caminho B, feito por módulo, começando pelos que expõem mais
(`SITE_Users` → `SITE_Leads` → `SITE_Enrollments`/`SITE_Sales` → resto). Cada
módulo migrado permite fechar a RLS daquela tabela imediatamente, então a
exposição diminui a cada passo em vez de tudo-ou-nada no fim.

---

## 5. Ordem sugerida

1. Rotacionar os 5 segredos (§3.1) — **independente de tudo, faça primeiro**
2. Endpoint de IA + `lib/ai.ts` server-side (§3.2)
3. Fechar `SITE_SystemSettings` por chave (§3.4)
4. Troca de senha dos 28 usuários (§3.3)
5. Caminho B por módulo (§4), fechando a RLS de cada tabela ao migrá-la

---

## 6. Como reproduzir o diagnóstico

```js
// Node, na raiz do projeto
require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
sb.from("SITE_SystemSettings").select("key,value").then(r => console.log(r.data.length));
```

Se um dia isso responder com erro de permissão em vez de 58 linhas, a etapa 3.4
está feita.
