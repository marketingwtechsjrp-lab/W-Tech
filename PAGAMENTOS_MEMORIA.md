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
- **Modelo da RA no Android:** `public/models/vacuum-pump/maquina-ar.glb` é a versão leve (19 mil triângulos, 10 desenhos por quadro, texturas de até 1024 px), feita a partir do modelo anterior. Tira só os triângulos que nunca aparecem de fora, medidos em 500 ângulos, e depois simplifica. O modelo do iPhone e o da página não mudam. Ao trocar o modelo, suba o `?v=` no botão. Textura de modelo se grava com `sharp`, em JPEG comum: o do FFmpeg não abre em aparelho Apple e o progressivo pesa mais.
- **Realidade aumentada no Android:** o botão tenta o Scene Viewer e vigia a página. Se ela não sair da frente, voltar com `#ra-nao-abriu` ou voltar em menos de 8 s, abre `components/vacuum-pump/VacuumARFallback.tsx`: 3D com `@google/model-viewer`, câmera em `vacuumWebAR.ts` (WebXR: a máquina surge em frente à câmera em até 2 s, assenta sozinha na primeira superfície virada para cima e fica presa a uma âncora; só "Mudar de lugar" pede toque; some se o rastreamento cair; decisões de posição em `vacuumArPlacement.ts`) e link dos Serviços do Google Play para RA. Tudo baixado só nessa hora: não importe valor de `vacuumWebAR.ts` estaticamente, porque isso puxa o three para a página. Eventos: `vacuum_ar_android_not_opened`, `_quick_return`, `_no_app` e `_opened_late` (o app abriu depois do aviso: alarme falso); na câmera, `vacuum_ar_webxr_opened`, `_placed`, `_end` (quadros, rastreados, superfície, posição) e `_error`.
- **Venda manual e relatório:** quando o vendedor fecha fora do site, lança em Admin > Pedidos da promoção (`components/admin/Campaign/VacuumOrdersView.tsx`, API `sales`, `sale_create`, `sale_update`, `sale_status` em `api/_vacuumSales.ts`). Entra em `SITE_Sales` com `channel = 'Admin'`, a mesma `campaign` e `manual_sale` preenchido: conta no placar e no lote, mas fica fora do funil do site. Cada lançamento é uma máquina. Não gera lançamento no Financeiro nem e-mail ao cliente. Venda do site não se altera por lá. Equipe em `VACUUM_SELLERS` (`lib/vacuumSales.ts`), permissões `campaign_sales_view`, `campaign_sales_launch` (lançar, sempre como aguardando) e `campaign_sales_manage` (alterar e confirmar pagamento: só gerente e Super Admin; os triggers `site_vacuum_sale_guard_*` em `SITE_Sales` barram o passe da equipe no banco, e o editor geral de Pedidos não salva venda da promoção porque trocaria o vendedor e regravaria os itens), PDF em `lib/vacuumSalesPdf.ts`. Com venda manual lançada, não use `sold_offset` para a mesma venda: ela contaria duas vezes.
- **Quem não comprou:** cada pessoa que começa o checkout fica em `SITE_CampaignCheckouts`. A varredura `GET /api/vacuum-pump?action=sweep` (Bearer `CRON_SECRET`, crontab da VPS a cada 10 min) entrega ao vendedor depois de 30 min (10 min se o cartão foi recusado): responsável no lead + tarefa em `SITE_Tasks` com a tag `vacuum_bf`. Quem compra depois tem a tarefa fechada automaticamente.
- **Pix:** fica fora do Brick, que mostra só o cartão. Escolher Pix chama `pay` na hora e o QR Code aparece na própria etapa de pagamento. O mesmo valor reaproveita o código; valor novo ou troca para o cartão cancela o código anterior no Mercado Pago (`cancelPendingPix`). Ao gerar um código novo, sai o e-mail `vacuum_pump_pix` com o pedido e o copia e cola; a confirmação só sai com o pagamento aprovado.
- **Parcelas no cartão:** a escolha é do nosso seletor, em `VacuumCheckout.tsx`, porque o do Brick só aparece depois do número do cartão. O Brick fica com `maxInstallments: 1` e o `onSubmit` troca `installments` pelo valor escolhido; o servidor limita ao máximo da oferta. As opções respeitam a parcela mínima de R$ 5 do Mercado Pago, então R$ 5 só mostra 1x e R$ 50 já chega a 10x.
- **Pagamento combinado (Pix + cartões, v3.66.0):** opção "Vários cartões ou Pix + cartão" no checkout (`components/vacuum-pump/VacuumComboPayment.tsx`, `POST pay_combo`). A pessoa pode pagar uma parte no Pix e o resto em 1 a 3 cartões, ou dividir em 2 ou 3 cartões sem Pix, cada um com suas parcelas. Cada parte tem no mínimo R$ 100, e a parcela mínima é R$ 5 do Mercado Pago. A regra fica em `lib/vacuumCombo.ts`, a mesma no navegador e no servidor. A parte paga no Pix ganha o desconto do Pix proporcional: cobrir o pedido inteiro no Pix daria exatamente o `pix_total`.
  - **Nada é cobrado pela metade** (`api/_vacuumCombo.ts`). Os cartões são só reservados (`capture: false`, status `authorized`). Sem Pix, a cobrança sai quando todos os cartões são reservados. Com Pix, sai quando o Pix da parte é pago: webhook, consulta de status ou varredura. Cartão recusado, Pix vencido, troca para outra forma de pagamento ou captura que falhe desfazem tudo: as reservas são canceladas, o Pix é cancelado e o que já foi cobrado é estornado.
  - O andamento fica em `SITE_CampaignCheckouts.split_payments` (jsonb, `migrations/2026-11-10_vacuum_combo_payments.sql`), com os estados `authorizing` → `awaiting_pix` → `capturing` → `done`, ou `releasing` → `failed`. Cobrar e desfazer são reservados com update condicional em `split_payments->>attempt` e `->>state`: só um processo mexe por vez, e quem leu uma versão antiga não desfaz uma cobrança em andamento. Enquanto um processo trabalha na combinação, `pay` e `pay_combo` respondem 409 `in_flight`. Passados 3 minutos, a varredura entende que o processo caiu e retoma. Cada pagamento leva `metadata.combo_attempt`, `combo_part` e `checkout_id`, e o webhook passa por `handleVacuumPaymentNotice`, que separa a combinação do fluxo normal.
  - **A venda é uma só**: `SITE_Sales.mp_payment_id` recebe o id do cartão 1, `payment_method` fica como "Mercado Pago - Pix + 2 cartões (10x + 3x)" e as notas listam cada parte com o valor e o id no MP. Estorno ou chargeback de **qualquer** parte cancela a venda, mas as outras partes **precisam ser estornadas à mão** (o log `[Vacuum] Parte … voltou` lista os ids). Se algum pagamento não for desfeito no MP, o registro guarda `release_failed` com os ids e sai uma tarefa URGENTE em `SITE_Tasks`, com a tag `vacuum_bf`, para estornar à mão.
  - A varredura (`sweep`, a cada 10 min) desfaz uma combinação com o Pix vencido há mais de 5 minutos e retoma uma captura que parou no meio. O Pix da combinação não manda o e-mail `vacuum_pump_pix`, porque o e-mail mostra o total do pedido: o QR Code fica na tela, e quem volta ao carrinho cai direto nele (`combo_pix_amount` no status).
- **Condição privada em 12x (v3.66.2, pedido do dono em 11/11/2026):** `/maquina-de-vacuo?condicao=<token>`, token em `SITE_Config.vacuum_condicao_12x_token` (padrão `_token`, só o servidor lê). Máquina + kit adaptador + câmara borbulhadora num item só, por R$ 9.328,80, em até 12x sem juros e sem desconto no Pix (`lib/vacuumPrivateOffer.ts`). O checkout grava `browser_context.private_offer` e o servidor aplica o preço na cobrança, inclusive no pagamento combinado. Vale mesmo depois de 13/11, até a chave ser apagada. Desde a v3.66.3, `pay` e `pay_combo` também recebem o token e marcam o checkout na hora: o carrinho salvo no aparelho pula a chamada `lead`, e um checkout aberto antes na página normal cobrava o preço do site e dava `price_changed`. É venda de verdade, na campanha normal. O site continua em 10x.
- **Link de teste (v3.66.1):** `/maquina-de-vacuo?teste=<token>`, com o token em `SITE_Config.vacuum_test_token` (protegido pelo padrão `_token`, só o servidor lê). Apagar a chave desliga o modo. A máquina sai a R$ 10, sem adicionais e sem frete, com até 2x e parte mínima de R$ 2 no pagamento combinado (`lib/vacuumTest.ts`). O checkout fica na campanha `vacuum_pump_bf_teste`, por isso não conta no placar, no lote nem no painel, não vira lead e não vai para vendedor. A venda sai em `SITE_Sales` com "[TESTE]" e sem financeiro, CRM, WhatsApp, e-mail ou CAPI. No navegador, o modo de teste (`vacuumTestMode.ts`) desliga Pixel, GTM e a telemetria do checkout, e guarda o carrinho numa chave separada. A cobrança é real: estorne pelo Mercado Pago depois de testar.
  - **Antes de anunciar**, teste com credenciais de teste do MP: 2 cartões aprovados, cartão 2 recusado (a reserva do cartão 1 deve sumir) e Pix + cartão (a cobrança do cartão só deve sair depois do Pix).
- **Link do vendedor:** cada um vê o próprio em Vendas ao vivo (`/maquina-de-vacuo?ref=<8 letras>&utm_source=vendedor`). O código sai de `sellerRefCode(id)`, a página guarda no navegador, e `lead` grava o dono em `SITE_CampaignCheckouts.referred_by`; o link mais recente vale. Na venda, a ordem é: link, conversa humana no WhatsApp, compra direta. Desistência volta para o dono do link. Link de quem saiu da equipe não dá crédito.
- **Vendedor na venda:** compra direta fica sem `seller_id`, sem comissão e com `seller_name` "Compra direta online". A varredura de quem não comprou só cria a tarefa e não dá crédito. O crédito vai para o vendedor apenas com mensagem humana (`SITE_WhatsAppCloudMessages.sent_by = human`) para o número do cliente nos 15 dias antes da compra: primeiro o responsável da conversa, depois quem assumiu, depois quem recebeu o carrinho. Conversa por WhatsApp pessoal não aparece aqui, então o gestor corrige no pedido.
- **Disparos em massa = venda direta (decisão do dono, 06/11/2026):** o link dos disparos leva `?ref=direto` (`VACUUM_DIRECT_REF`). `lead` grava `browser_context.direct_sale` e zera `referred_by`, e `findCreditedSeller` não procura vendedor, mesmo com conversa humana nos 15 dias. Voltar sem o link não desfaz; só o link de um vendedor, aberto depois, troca o crédito. A origem aparece no painel como "Disparo WhatsApp" (`utm_source=disparo`).
- **Frete:** grátis no estado de SP (pelo CEP, 01000-000 a 19999-999). Fora de SP, cota na API do SGP (`POST sgpweb.com.br/novo/api/consulta-precos-prazos`, chave em `SITE_Config.sgp_api_key`, protegida pelo padrão `api_key`). Ligado desde 05/11/2026 com `shipping.enabled` + peso e medidas em `vacuum_pump_offer` (caixa estimada de 52 x 45 x 40 cm, 18 kg e valor declarado de R$ 4.600, porque o PAC recusa acima de R$ 4.668); sem isso, SGP fora do ar ou acima de 30 kg, o frete fica "a combinar" e a venda não trava. O servidor recalcula o frete no pagamento. Serviços do cartão 70255768: PAC 03298 e SEDEX 03220.
- **Liberar venda antes da data:** `soft_open: true` em `vacuum_pump_offer`; o texto da campanha continua usando `starts_at`.
- **Dados pessoais:** CPF e endereço do comprador ficam em `SITE_CampaignCheckouts` e no pedido em `SITE_Sales`, as duas fechadas para a chave pública; a ficha em `SITE_Leads` não os recebe. O pedido guarda o CPF nas notas porque a nota fiscal precisa dele e o painel só mostra esse campo.
- **Carrinho:** tela cheia em `components/vacuum-pump/VacuumCheckout.tsx`, na ordem Carrinho → Seus dados → Entrega → Pagamento → Concluir. O contato é gravado antes do endereço para o vendedor poder chamar quem desiste na entrega. Não há etapa de revisão porque o Brick cobra ao clicar em Pagar: os dados ficam acima do pagamento, com "Alterar".
- **Carrinho protegido:** `VacuumCheckoutBoundary.tsx` envolve o carrinho: erro de tela vira aviso com WhatsApp e evento `vacuum_problem_screen_error` em `SITE_Analytics_Events`. Sem ele, o erro apagava o site inteiro e o clique não era registrado, porque o `AnalyticsTracker` era desmontado antes. Quem chama `onBuy` não pode repassar o evento do clique (`onClick={() => onBuy()}`): em 06/11/2026 isso deu tela branca no botão do fim do vídeo, e o TypeScript não acusa.
- **Velocidade da página:** o `index.html` próprio de `/maquina-de-vacuo` é gerado em `vite.config.ts`, com `modulepreload` do código da página e `preload` da oferta. A primeira foto fica de fora de propósito: medido em produção, adiantá-la atrasou o código em 0,5 s sem chegar antes. O SDK do Mercado Pago baixa ao sair do carrinho (`warmUpMercadoPago`), e o 3D fica em pausa com o carrinho aberto (`paused` em `VacuumExperience3D`).
- **Confirmação pelo WhatsApp:** `api/_vacuumWhatsApp.ts` manda o modelo `vp_pedido_confirmado` (Utilidade, WABA 715698567695226) pelo número oficial, ao confirmar a venda do site e ao marcar venda manual como paga. O registro fica em `SITE_WhatsAppCloudMessages` com `sent_by: 'system'`, que não conta no crédito do vendedor, e serve de trava para não repetir por pedido. Falha do Meta não derruba a venda: a linha fica com `status: 'failed'` e o motivo em `error`. O número do Suporte não serve aqui: é só do curso online. A conta oficial está sem método de pagamento, e o Meta aceita o modelo e depois recusa com `131042`: por isso `SITE_Config.wa_instance_vacuum_order` aponta para a instância do André (`w-tech-atendente-3`), por decisão do dono em 06/11/2026. Apagar a chave volta ao oficial. A varredura reenvia, por 72 horas, a confirmação que falhou. Mudar o texto exige submeter outro modelo e trocar `TEMPLATE_BODY`.
- **Saída do carrinho no painel (v3.64.5):** `vacuum_exit_closed` (fechou no X, Voltar ou gesto), `vacuum_exit_hidden` (saiu da página) e `vacuum_exit_back` (voltou), com rótulo `etapa|campos|frete`. Os campos vêm de `vacuumFilledFields`, só nomes, nunca o conteúdo. `site_vacuum_checkout_health` conta como saída só a última ação da pessoa: quem voltou, reabriu ou chegou à página de obrigado fica de fora. Envio comum, sem `keepalive`: aba fechada de repente pode não registrar. Migração: `migrations/2026-11-07_vacuum_checkout_exits.sql`.
- **Saúde do checkout no painel:** `vacuumCheckoutTracking.ts` registra etapas e falhas na categoria `Vacuum Pump Checkout`, fora dos cliques do painel. O painel lê pela função `site_vacuum_checkout_health`, separada para não derrubar o painel de vendas. Evento de clique com `data-track` em botão que muda de etapa se perde, porque o React troca o botão antes de o rastreador ler: por isso `vacuum_cart_continue` quase não conta. Nunca colocar dado pessoal no `label`.
- **Pixel da Vacuum Pump:** o funil vai para `1109519607249858` (`VACUUM_META_PIXEL_ID`) por `components/vacuum-pump/vacuumMeta.ts`, com `trackSingle`, porque o contêiner do GTM só conhece o pixel do curso (`1287422246429098`). Por isso as tags do GTM continuam mandando `begin_checkout`, `generate_lead` e `purchase` da máquina para o pixel do curso: corrigir exige excluir `funnel = vacuum_pump_bf` no GTM web e no de servidor. A compra também sai pelo servidor em `api/_vacuumMeta.ts`, com o id `vp_purchase_<pedido>` igual ao do navegador, e só liga com `SITE_Config.meta_config.capiToken`; `testEventCode` no mesmo JSON manda como teste. `SITE_CampaignCheckouts.browser_context` guarda `_fbp`, `_fbc`, IP e navegador para o Pix confirmado sem a pessoa na página.
- **Carrinho que continua de onde parou:** `vacuumCheckoutDraft.ts` guarda contato, endereço, acessórios, frete e etapa no `localStorage` por um dia, porque o navegador do Instagram abre sessão nova quando a pessoa sai e volta. CPF e cartão nunca entram. O carrinho reabre sozinho se ficou aberto há menos de 2 horas; fechar de propósito não reabre. Cada botão de etapa em `primaryAction` precisa de `key` própria: sem ela, o React transforma o mesmo botão em `submit` no meio do clique, e o formulário da etapa seguinte abre com todos os campos em vermelho.
- **Barra de compra no celular:** fica à vista desde a chegada, porque antes a primeira tela não tinha preço nem botão de comprar. O evento `vacuum_view_price` (categoria `Vacuum Pump Leitura`, só celular) mede quantos chegam ao bloco de preço; a categoria diferente o mantém fora dos cliques do painel ao vivo, que filtra por `Vacuum Pump`.
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
