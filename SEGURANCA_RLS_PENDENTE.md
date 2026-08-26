# ⚠️ Exposição do banco — diagnóstico e plano de correção

**Levantado em:** 25/08/2026
**Status:** NÃO corrigido. O dono optou por priorizar o Chat de IA da Gerência e
tratar isto depois. Este documento existe para que a correção não dependa de
refazer a investigação.

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
