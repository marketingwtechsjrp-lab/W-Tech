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

## VACUUM PUMP (Black Friday) — checkout transparente

Página `/maquina-de-vacuo`, API `/api/vacuum-pump`, regras em `lib/vacuumOffer.ts`, núcleo em `api/_vacuumPump.ts`.

- **Trocar datas, lote, preço, vídeo, frete ou CNPJ sem deploy:** editar o JSON de `SITE_Config.vacuum_pump_offer` (só as chaves que mudam: `starts_at`, `ends_at`, `lot_size`, `sold_offset`, `presale_price`, `regular_price`, `video_url`, `shipping_note`, `legal_line`, `whatsapp`, `bumps`). A página lê em até 15 s. Venda feita fora do site desconta do lote por `sold_offset`.
- **Credenciais:** `SITE_Config.mercadopago_access_token` (servidor) e `SITE_Config.mercadopago_public_key` (vai para o navegador, é pública). Sem a chave pública o checkout mostra "chamar um vendedor".
- **Identificação no webhook:** `external_reference = vacuum:<id do checkout>`. O `api/mercadopago-webhook.ts` desvia esses pagamentos antes do fluxo de matrícula.
- **Venda:** vai para `SITE_Sales` (`campaign`, `mp_payment_id`, canal `Site`). O índice único de `mp_payment_id` impede venda duplicada. Os itens ficam no JSON `items` porque não existem em `SITE_Products`.
- **Venda manual e relatório:** quando o vendedor fecha fora do site, lança em Admin > Pedidos da promoção (`components/admin/Campaign/VacuumOrdersView.tsx`, API `sales`, `sale_create`, `sale_update`, `sale_status` em `api/_vacuumSales.ts`). Entra em `SITE_Sales` com `channel = 'Admin'`, a mesma `campaign` e `manual_sale` preenchido: conta no placar e no lote, mas fica fora do funil do site. Cada lançamento é uma máquina. Não gera lançamento no Financeiro nem e-mail ao cliente. Venda do site não se altera por lá. Equipe em `VACUUM_SELLERS` (`lib/vacuumSales.ts`), permissões `campaign_sales_view` e `campaign_sales_manage`, PDF em `lib/vacuumSalesPdf.ts`. Com venda manual lançada, não use `sold_offset` para a mesma venda: ela contaria duas vezes.
- **Quem não comprou:** cada pessoa que começa o checkout fica em `SITE_CampaignCheckouts`. A varredura `GET /api/vacuum-pump?action=sweep` (Bearer `CRON_SECRET`, crontab da VPS a cada 10 min) entrega ao vendedor depois de 30 min (10 min se o cartão foi recusado): responsável no lead + tarefa em `SITE_Tasks` com a tag `vacuum_bf`. Quem compra depois tem a tarefa fechada automaticamente.
- **Pix:** fica fora do Brick, que mostra só o cartão. Escolher Pix chama `pay` na hora e o QR Code aparece na própria etapa de pagamento. O mesmo valor reaproveita o código; valor novo ou troca para o cartão cancela o código anterior no Mercado Pago (`cancelPendingPix`). Ao gerar um código novo, sai o e-mail `vacuum_pump_pix` com o pedido e o copia e cola; a confirmação só sai com o pagamento aprovado.
- **Parcelas no cartão:** a escolha é do nosso seletor, em `VacuumCheckout.tsx`, porque o do Brick só aparece depois do número do cartão. O Brick fica com `maxInstallments: 1` e o `onSubmit` troca `installments` pelo valor escolhido; o servidor limita ao máximo da oferta. As opções respeitam a parcela mínima de R$ 5 do Mercado Pago, então R$ 5 só mostra 1x e R$ 50 já chega a 10x.
- **Vendedor na venda:** compra direta fica sem `seller_id`, sem comissão e com `seller_name` "Compra direta online". A varredura de quem não comprou só cria a tarefa e não dá crédito. O crédito vai para o vendedor apenas com mensagem humana (`SITE_WhatsAppCloudMessages.sent_by = human`) para o número do cliente nos 15 dias antes da compra: primeiro o responsável da conversa, depois quem assumiu, depois quem recebeu o carrinho. Conversa por WhatsApp pessoal não aparece aqui, então o gestor corrige no pedido.
- **Frete:** grátis no estado de SP (pelo CEP, 01000-000 a 19999-999). Fora de SP, cota na API do SGP (`POST sgpweb.com.br/novo/api/consulta-precos-prazos`, chave em `SITE_Config.sgp_api_key`, protegida pelo padrão `api_key`). Ligado desde 05/11/2026 com `shipping.enabled` + peso e medidas em `vacuum_pump_offer` (caixa estimada de 52 x 45 x 40 cm, 18 kg e valor declarado de R$ 4.600, porque o PAC recusa acima de R$ 4.668); sem isso, SGP fora do ar ou acima de 30 kg, o frete fica "a combinar" e a venda não trava. O servidor recalcula o frete no pagamento. Serviços do cartão 70255768: PAC 03298 e SEDEX 03220.
- **Liberar venda antes da data:** `soft_open: true` em `vacuum_pump_offer`; o texto da campanha continua usando `starts_at`.
- **Dados pessoais:** CPF e endereço do comprador ficam em `SITE_CampaignCheckouts` e no pedido em `SITE_Sales`, as duas fechadas para a chave pública; a ficha em `SITE_Leads` não os recebe. O pedido guarda o CPF nas notas porque a nota fiscal precisa dele e o painel só mostra esse campo.
- **Carrinho:** tela cheia em `components/vacuum-pump/VacuumCheckout.tsx`, na ordem Carrinho → Seus dados → Entrega → Pagamento → Concluir. O contato é gravado antes do endereço para o vendedor poder chamar quem desiste na entrega. Não há etapa de revisão porque o Brick cobra ao clicar em Pagar: os dados ficam acima do pagamento, com "Alterar".
- **3D e imagens:** `public/models/vacuum-pump/` tem `maquina.glb` (web, meshopt) e `maquina-ar.glb` e `maquina.usdz` (realidade aumentada, só o exterior). Nenhum tem nome de peça ou fornecedor: mantenha assim ao trocar o modelo, porque são públicos. A galeria usa fotos reais tratadas em `public/images/vacuum-pump/fotos/`, com os PNG mestres fora do Git, em `entregas/vacuum-pump-fotos/`; só a vista interna (`machine-inside`) e o pôster do 3D (`machine-front`) saem do modelo. Ao trocar uma foto mantendo o nome, ponha `?v=` no caminho em `components/vacuum-pump/vacuumMedia.tsx`.
- **Realidade aumentada:** o botão vermelho (`components/vacuum-pump/VacuumARButton.tsx`) abre `maquina.usdz` no iPhone e `maquina-ar.glb` no Android, só com a máquina, direto na câmera. No navegador interno de Instagram e Facebook a RA não abre, então o botão orienta a abrir no navegador; no computador mostra um QR. Uma versão com comandos e tutorial foi testada em 05/11/2026 e reprovada pelo dono (tela branca antes da câmera e placas confusas): o código ficou fora do Git, em `entregas/vacuum-pump-ra/`.
- **Vídeo:** `public/videos/vacuum-pump/` (`vacuum-pump-bf.mp4` e, no celular, `vacuum-pump-bf-720.mp4`; a fonte editável está fora do Git, em `entregas/vacuum-pump-video/fonte/`). O player em `components/vacuum-pump/VacuumVideo.tsx` só baixa o arquivo perto da hora de tocar, começa mudo ao chegar na tela (menos com movimento reduzido ou economia de dados) e vira mini player quando a pessoa sai dele. Um link em `video_url` substitui o arquivo por um iframe. Ao trocar o MP4, mude o `?v=` em `components/vacuum-pump/vacuumMedia.tsx`.
- **Preço na tela:** a parcela é sempre o número em destaque (pedido do Vinícius, 05/11/2026), com preço cheio e valor à vista em letra pequena. O total à vista nunca sai da tela: o Decreto 5.903/2006 proíbe informar o preço só em parcelas.
- **Acessórios:** preços no código, em `VACUUM_DEFAULT_CONFIG.bumps` de `lib/vacuumOffer.ts`, ou em `bumps` de `vacuum_pump_offer`, que tem prioridade. Em 05/11/2026 a config não tem `bumps`: valem os do código (borbulhador R$ 699 sem desconto).
- **Painel ao vivo:** view `vacuum_live` do Admin (`components/admin/Campaign/`), com a permissão `campaign_live_view`; metas em `SITE_Config.vacuum_pump_goals`, editadas no painel com `campaign_live_manage`. Os números vêm da função `site_vacuum_dashboard` (`migrations/2026-11-05_vacuum_dashboard.sql`), que só o `service_role` executa, pelo `GET /api/vacuum-pump?action=dashboard`, com 3 s de cache. Visitas e cliques saem de `SITE_Analytics_PageViews` e `SITE_Analytics_Events`, e as visitas da própria equipe também contam. Para cada botão novo aparecer em Cliques, use `data-track` com `data-track-category="Vacuum Pump"`.
- **Parcelas:** "10x sem juros" depende da configuração da conta no Mercado Pago. Conferir antes de anunciar: `GET /v1/payment_methods/installments?amount=7990&payment_method_id=visa` deve mostrar `installment_rate: 0` na parcela 10.

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
