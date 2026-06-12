# MEMÓRIA — Sistema de Pagamentos (Mercado Pago + Stripe) · W-Tech

> Documento de referência para quando algo parar de funcionar. Escrito em 2026-06-12,
> logo após o conserto definitivo do webhook do MP (v3.0.17–v3.0.19).
> Leia junto com `BREVO_PLANO.md` (e-mails disparados pelo mesmo webhook).

---

## Visão geral

| | Mercado Pago (nacional, BRL) | Stripe (internacional, USD/EUR) |
|---|---|---|
| Checkout | `/api/mercadopago-checkout` (Vercel) cria preference | `lib/stripe.ts` cria Payment Link **direto do browser** |
| Webhook | `/api/mercadopago-webhook` (Vercel serverless) | `stripe-webhook` (Supabase Edge Function, Deno) |
| Credencial | `SITE_Config.mercadopago_access_token` (`APP_USR-...`) | `SITE_Config.stripe_api_key` (`sk_live_...`) + env `STRIPE_API_KEY`/`STRIPE_WEBHOOK_SECRET` na Edge Function |
| Confirmação | `SITE_Enrollments.status = 'Confirmed'` | idem (e `SITE_Sales.status='paid'` p/ pedidos) |
| Página pós-pagamento | `/mp-redirect.html` → `/inscricao-confirmada?eid=...` | `/pagamento-sucesso?session_id=...&eid=...` |

---

## MERCADO PAGO — fluxo completo

1. **LP/Checkout** (`CourseCheckout` / LP viewers) → `lib/mercadopago.ts` → `POST /api/mercadopago-checkout` com `{courseId, customer, leadId, paymentType: 'full'|'deposit'}`.
2. **`api/mercadopago-checkout.ts`**: valida, cria/acha enrollment `Pending` em `SITE_Enrollments`, monta preference com:
   - `external_reference = enrollmentId` ← **chave de tudo**
   - `metadata = { enrollment_id, lead_id, payment_type }`
   - `notification_url = {origin}/api/mercadopago-webhook`
   - `back_urls` → `/mp-redirect.html?eid=...&status=approved|pending|failed`
3. Aluno paga no MP → MP chama o **webhook** (e também anexa `payment_id`/`collection_id` na back_url).
4. **`api/mercadopago-webhook.ts`** (ordem interna):
   1. Lê `paymentId` do body novo (`data.id`) ou IPN antigo (`?id=&topic=payment`).
   2. Valida assinatura HMAC (`MERCADOPAGO_WEBHOOK_SECRET` env; falha **não bloqueia** — segue e valida na API).
   3. Busca token em `SITE_Config` → `GET api.mercadopago.com/v1/payments/{id}` (**timeout 10s**).
   4. 404 = simulação do painel → responde 200 e ignora.
   5. `rejected/cancelled` → devolve lead à roleta (`api/_roleta.ts`).
   6. `approved` → UPDATE `SITE_Enrollments`: `status='Confirmed', amount_paid, payment_id, payment_method='Mercado Pago', enrolled_by_name='Automático'` (**fatal se falhar — retorna 500 p/ MP reenviar**).
   7. Tarefas secundárias **não-fatais com timeout 5s cada** (`withTimeout`): lead → `Converted`; insert em `SITE_Transactions` (usa `course_id`/`lead_id`); **e-mail de confirmação via Brevo** (`api/_email.ts`, idempotente); auto-enroll em fluxos `CompraRecente` (`api/_flows.ts`).
5. **Fallback no frontend**: `pages/InscricaoConfirmada.tsx` — se enrollment `Pending` e há `payment_id` na URL, chama `POST /api/mercadopago-webhook?id={payment_id}&topic=payment` ("Direct Verification") + polling 3s/20x.

### Configuração no painel MP (developers)
- App 470035789682510 → Webhooks → URL `https://site.w-techbrasil.com.br/api/mercadopago-webhook`, evento Pagamentos, assinatura secreta = env `MERCADOPAGO_WEBHOOK_SECRET` na Vercel (aceita múltiplos segredos separados por vírgula).

---

## STRIPE — fluxo completo

1. **Frontend** (`lib/stripe.ts` → `createStripePaymentLink`): cria Checkout Session **direto na API do Stripe a partir do browser** com a `stripe_api_key` lida de `SITE_Config` ⚠️ (a secret key trafega no cliente — risco conhecido, ver "Dívidas").
   - `metadata[enrollmentId]` ou `metadata[orderId]`
   - `success_url` → `/pagamento-sucesso?session_id={CHECKOUT_SESSION_ID}&eid=|oid=`
   - Chamado por: LPs Lisboa (`WTechLisboa*`, `LPWTechLisboaNov2026`), Admin (CRM, pedidos do catálogo).
2. **Webhook**: Supabase Edge Function `stripe-webhook` (`supabase/functions/stripe-webhook/index.ts`, Deno):
   - URL: `https://niesvylxwfaffgnmdoql.supabase.co/functions/v1/stripe-webhook` (configurada no dashboard do Stripe).
   - Envs na função: `STRIPE_API_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
   - Valida assinatura (`constructEventAsync`) — **aqui é obrigatória**, sem ela 400.
   - Eventos: `checkout.session.completed` e `payment_intent.succeeded`.
   - `enrollmentId` → **soma** `amount_paid` (`amount_paid + amount_total/100`), `status='Confirmed'`, lead → `Converted` (tags `venda_stripe`), insert `SITE_Transactions`.
   - `orderId` → `SITE_Sales.status='paid'` + `stripe_session_id` + transaction.
3. **Página de sucesso**: `pages/PaymentSuccess.tsx` (`/pagamento-sucesso`) — só lê o enrollment/pedido e exibe; quem confirma é o webhook.

### ⚠️ Bug latente conhecido (Stripe webhook)
- O insert em `SITE_Transactions` usa `enrollment_id` — **coluna que NÃO existe** (tabela tem `course_id`, `lead_id`, `event_id`...). O registro financeiro do Stripe falha silenciosamente (non-fatal). Mesmo bug foi corrigido no MP em v3.0.18. Corrigir trocando por `course_id`/`lead_id` e fazer redeploy da Edge Function (`supabase functions deploy stripe-webhook`).

---

## SCHEMA — verdades que já causaram bugs (NÃO esquecer)

1. **`SITE_Enrollments` NÃO tem `updated_at`.** Incluir essa coluna num UPDATE faz o PostgREST rejeitar o write INTEIRO → inscrição nunca confirma (causa raiz do bug histórico do MP, v3.0.18).
2. **`SITE_Transactions` NÃO tem `enrollment_id`.** Colunas reais: `id, description, amount, type, category, status, date, course_id, event_id, payment_method, created_at, lead_id, attendant_id, attendant_name, title, currency`.
3. **`SITE_Leads.assigned_to` é UUID.** Gravar string (`'Automático'`) falha. Em enrollment, o equivalente texto é `enrolled_by_name`.
4. **`"type": "module"` no package.json** → imports relativos entre arquivos `/api` exigem extensão `.js` (`./_roleta.js`, `./_email.js`, `./_flows.js`). Sem isso: `FUNCTION_INVOCATION_FAILED` 500 em TODA a função (v3.0.17).
5. **Cron Vercel (plano Hobby) só aceita frequência diária.** Cron tipo `*/4h` **derruba o deploy inteiro silenciosamente** — a versão antiga continua no ar e mudanças novas "não aparecem" (404 em rotas novas).
6. Colunas novas no Supabase → rodar `NOTIFY pgrst, 'reload schema';` senão o PostgREST não as enxerga.

---

## PLAYBOOK DE DIAGNÓSTICO (quando "o pagamento não confirma")

```bash
# 1. Webhook MP está vivo? (GET = health check)
curl -s https://site.w-techbrasil.com.br/api/mercadopago-webhook
# esperado: {"status":"Webhook endpoint online", ...}
# FUNCTION_INVOCATION_FAILED → erro de carga do módulo (import sem .js? deploy quebrado?)

# 2. Achar o pagamento real do aluno no MP (token está em SITE_Config.mercadopago_access_token)
curl -s "https://api.mercadopago.com/v1/payments/search?external_reference=<ENROLLMENT_ID>" \
  -H "Authorization: Bearer <TOKEN>"
# → pega payment_id, status (approved?), transaction_amount

# 3. Reprocessar manualmente (re-dispara o webhook com o pagamento real — é idempotente)
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"action":"payment.updated","data":{"id":"<PAYMENT_ID>"},"type":"payment"}' \
  https://site.w-techbrasil.com.br/api/mercadopago-webhook
# esperado: {"received":true,...,"status":"Confirmed"} ou {"already_confirmed":true}

# 4. Conferir no banco (anon key serve p/ leitura)
#    SITE_Enrollments: status, amount_paid, payment_id devem estar preenchidos.
#    payment_id=null em registros "Confirmed" = foi confirmação manual, webhook não rodou.
```

- **Simulação do painel MP dá 200 mas pagamento real não confirma** → o caminho `approved` está quebrando (a simulação retorna cedo no 404). Testar com payment_id REAL (passo 3).
- **Pendurou/timeout no passo 3** → olhar tarefas dentro do caminho approved (todas devem ter `withTimeout`); checar se o deploy atual é o esperado (ver pegadinha do cron).
- **Stripe não confirma** → ver logs da Edge Function no dashboard do Supabase (Functions → stripe-webhook → Logs); conferir `STRIPE_WEBHOOK_SECRET` e se o endpoint está apontado no dashboard do Stripe.
- Pagamento de referência para teste (já confirmado, idempotente): enrollment `e929a4f8-5180-46fa-86cc-455ca17c6990`, payment `162886722381` (R$400 depósito, daniel2).

## Histórico de incidentes
- **2026-06-11/12**: webhook MP nunca tinha funcionado de fato. 3 causas empilhadas: (a) import `./_roleta` sem `.js` → 500 na carga; (b) `updated_at` inexistente no UPDATE → confirmação rejeitada; (c) colunas erradas em Transactions/Leads. Corrigido em v3.0.17–v3.0.19. Depois, deploy preso por cron `*/4h` no plano Hobby (corrigido para diário).

## Dívidas técnicas conhecidas
- [ ] Stripe: secret key usada no browser (`lib/stripe.ts`) — migrar criação da session para uma rota `/api` (como o MP faz).
- [ ] Stripe webhook: corrigir `enrollment_id` → `course_id`/`lead_id` no insert de `SITE_Transactions` + redeploy da Edge Function.
- [ ] Stripe webhook não envia e-mail de confirmação (só o MP envia, via Brevo).
