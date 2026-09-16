# Google Ads / GTM / GA4 — rastreamento e campanhas (16/09/2026)

Conta usada em tudo: **marketingwtechsjrp@gmail.com**.

## IDs

| Produto | ID |
|---|---|
| Google Ads | conta 446-932-5713 · Conversion ID `AW-16893688628` |
| Conversão **Lead - Site (formulario, quiz, WhatsApp)** | label `sy9qCJmRkPocELT2xPc-` · primária · valor fixo R$ 50 · contagem "Uma" · Enhanced Conversions ligado |
| Conversão **Compra - Site (Kiwify, Stripe, Mercado Pago)** | label `dYFQCJyRkPocELT2xPc-` · primária · valor do evento (padrão R$ 347) · contagem "Todas" · dedupe por `transaction_id` |
| Conversão **Inicio de checkout - Site** | label `-q3_CJ-RkPocELT2xPc-` · secundária (observação) |
| GTM web | conta Site-Wtech `6360554222` · contêiner `[WEB] - Track` **GTM-56HND3GQ** (id 255316368) · server-side `GTM-TL39QFMG` (Stape, `api.w-techbrasil.com.br`) |
| GA4 | propriedade `473382622` · stream `G-T4WSVZ57J0` · Google tag `GT-KFN48CRR` |
| Search Console | `https://w-techbrasil.com.br/` (dono: danielsjcampos; marketing tem acesso Total) |

As conversões antigas `manual_event_PURCHASE` (import GA4), `[574b] WooCommerce` e `Whatsapp Botão` foram rebaixadas para **secundárias** para não contar em dobro.

## O que o site publica no dataLayer (`lib/dataLayer.ts`)

| Evento | Quando | Onde no código |
|---|---|---|
| `generate_lead` | lead gravado em `SITE_Leads` (formulário LP, quiz, captura antes do WhatsApp, checkout Lisboa sem `lid`) | `lib/leadDistribution.ts` (todas as LPs dinâmicas), `components/WhatsAppLeadCapture.tsx`, `pages/QuizSuspensao.tsx`, `pages/LPWTechLisboaNov2026.tsx`, `pages/WTechLisboaNov2026.tsx`, `pages/CheckoutLisboa.tsx` |
| `begin_checkout` | saída para Kiwify/Hotmart (`trackCourseCheckoutStart` em `lib/coursePricing.ts`), Stripe (`CheckoutLisboa`), Mercado Pago (`CourseCheckout`) | idem |
| `purchase` | `/obrigado-suspensao` (Kiwify/Hotmart, só se a sessão saiu pelo nosso checkout), `/obrigado-lisboa` e `/inscricao-confirmada` (só com `Confirmed` no banco) — idempotente por `transaction_id` | `pages/Obrigado*.tsx`, `pages/InscricaoConfirmada.tsx` |
| `spa_page_view` | mudança de rota (pathname) na SPA | `components/AnalyticsTracker.tsx` |

Todos levam `funnel` (`curso_online_piloto` · `presencial_brasil` · `presencial_lisboa`), `value`/`currency`, `ecommerce.items`, `event_id` e `user_data` (e-mail, telefone E.164, nome) para Enhanced Conversions.

Leads gravam agora `gclid`, `gbraid`, `wbraid`, `fbclid`, `gad_source`, `landing_page` e `referrer` (`add_lead_click_ids.sql`, aplicada em produção). Compra aprovada na Kiwify marca o lead como **Converted** no CRM (`server/edge/kiwify-webhook.ts`).

## GTM (workspace "Default Workspace", versão preparada "v9")

Importado de `docs/google-ads/gtm-import-GTM-56HND3GQ.json` + ajustes na UI:

- `0 | Vinculador de conversões (Google Ads)` — Initialization
- `0 | Tag de Configuração` — agora com `user_data = {{Dados do usuario (Enhanced Conversions)}}` (variável Dados fornecidos pelo usuário, modo Code, fonte `DL - user_data`)
- `03 | ADS | Lead` / `03 | ADS | Compra` / `03 | ADS | Inicio de checkout`
- `03 | API | generate_lead`, `04 | API | purchase` (ecommerce do dataLayer), `01 | API | page_view (SPA)`, `03 | API | contact (WhatsApp)` (clique em wa.me)
- `02 | API | begin_checkout` e `02 | FB | InitiateCheckout` passaram do clique em link kiwify.com para o evento `begin_checkout` (cobre Hotmart, Stripe e Mercado Pago)
- `03 | FB | Lead (Lisboa)` (só `funnel = presencial_lisboa`, para não duplicar o `fbq('Lead')` que o código já envia nos outros funis) e `04 | FB | Purchase`
- Acionadores `CE - generate_lead`, `CE - begin_checkout`, `CE - purchase`, `CE - spa_page_view`, `CE - generate_lead (Lisboa)`, `Click - WhatsApp (wa.me)`; variáveis `DL - *`

## Campanhas (Search) — `docs/google-ads/wtech-google-ads-campanhas.csv`

Upload em massa: Ferramentas → Ações em massa → Uploads → Fazer upload de um arquivo → **Visualizar** → **Aplicar**. As três campanhas sobem **pausadas**.

| Campanha | Geo | Orçamento/dia | URL final | Meta de otimização |
|---|---|---|---|---|
| `[Search] Curso Online Piloto | BR` | Brasil (presença) | R$ 60 | /curso-suspensao-piloto | Compra (Lead enquanto < 30 compras/mês) |
| `[Search] Curso Presencial Lisboa | PT` | Portugal (presença) | R$ 150 (≈ €25) | /lp-wtech-lisboa-nov | Lead |
| `[Search] Cursos Presenciais | BR` | Brasil (presença) | R$ 60 | /cursos | Lead |

Comum: só Rede de Pesquisa (sem parceiros/Display), idioma português, Maximizar conversões sem CPA-alvo (migrar para CPA-alvo após 30 conversões/30 dias), 4 grupos de anúncios por campanha, palavras em "frase" + [exata], ~55 negativas por campanha, 1 RSA por grupo (15 títulos ≤30, 4 descrições ≤90), sufixo de URL:

```
utm_source=google&utm_medium=cpc&utm_campaign={campaignid}&utm_content={adgroupid}&utm_term={keyword}
```

Depois do upload, ajustar na UI (não vai por planilha): opção de local **"Presença"** (não "presença ou interesse"), sitelinks/frases de destaque/snippets (texto no relatório da sessão), e em Lisboa adicionar idioma "Português (Brasil)".

## Pendências que dependem do dono da conta

1. **Verificação do anunciante** (Google Ads → Adm → Conta): a conta está **pausada** até enviar os documentos ("Anúncios financiados por ALEX PITER PENA CREPALDI"). Sem isso nenhuma campanha veicula.
2. Clicar **Publicar** na versão v9 do GTM (tela já preenchida).
3. Aplicar o upload das campanhas (arquivo acima) e depois **ativar** as campanhas quando quiser começar a gastar.
4. GA4 → Admin → Eventos: marcar `generate_lead` como **evento principal** assim que o primeiro lead chegar (o evento só aparece na lista depois de recebido).
5. Data do curso de Lisboa: a LP diz **23–25 de outubro**, mas a rota se chama `lp-wtech-lisboa-nov`. Os anúncios usam outubro (o que a página mostra). Se for novembro, corrigir a LP antes de ativar.
6. Extensão de chamada: confirmar o número de voz da W-Tech (o da LP de Lisboa, +351 917 340 016, é da Art on Wheels Garage — não usar).
