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

## GTM web (v9 publicada · v10 preparada)

Importado de `docs/google-ads/gtm-import-GTM-56HND3GQ.json` + ajustes na UI:

- `0 | Vinculador de conversões (Google Ads)` — Initialization
- `0 | Tag de Configuração` — agora com `user_data = {{Dados do usuario (Enhanced Conversions)}}` (variável Dados fornecidos pelo usuário, modo Code, fonte `DL - user_data`)
- `03 | ADS | Lead` / `03 | ADS | Compra` / `03 | ADS | Inicio de checkout`
- `03 | API | generate_lead`, `04 | API | purchase` (ecommerce do dataLayer), `01 | API | page_view (SPA)`, `03 | API | contact (WhatsApp)` (clique em wa.me)
- `02 | API | begin_checkout` e `02 | FB | InitiateCheckout` passaram do clique em link kiwify.com para o evento `begin_checkout` (cobre Hotmart, Stripe e Mercado Pago)
- `03 | FB | Lead (Lisboa)` (só `funnel = presencial_lisboa`, para não duplicar o `fbq('Lead')` que o código já envia nos outros funis) e `04 | FB | Purchase`
- Acionadores `CE - generate_lead`, `CE - begin_checkout`, `CE - purchase`, `CE - spa_page_view`, `CE - generate_lead (Lisboa)`, `Click - WhatsApp (wa.me)`; variáveis `DL - *`
- **v10 (preparada, aguardando "Publicar")**: `04 | FB | Purchase` passou para o acionador `CE - purchase (nao Kiwify)` (`provider ≠ kiwify`) — a compra Kiwify já vai ao Meta pela CAPI do webhook; o pixel disparando junto contava em dobro.

## GTM servidor GTM-TL39QFMG (v9 preparada, aguardando "Publicar")

Já existia: cliente GA4 encaminhando tudo, `Data Client` do webhook Kiwify → FB Purchase, FB PageView/InitiateCheckout via CAPI. Adicionado nesta rodada:

- variáveis `ed - funnel` e `ed - provider` (event data do GA4)
- `05 | FB | Lead (Lisboa)` — acionador `generate_lead (Lisboa)` (Client Name contém GA4 **e** `ed - funnel = presencial_lisboa`)
- `06 | FB | Purchase (Stripe/MP/Hotmart)` — acionador `purchase (nao Kiwify)` (`ed - provider ≠ kiwify`)
- Dedupe pixel × CAPI pelo `event_id` que o site gera (`{{event_id}}` no web, `x-fb-event_id` no servidor).

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

Ajustes feitos na UI depois do upload (não vão por planilha): opção de local **"Presença"** nas 3 campanhas; 4 sitelinks + 8 frases de destaque por campanha (snippet estruturado já existia no nível da conta).

| Campanha | Sitelinks | Frases de destaque |
|---|---|---|
| Curso Online Piloto | Módulos do Curso (#modulos) · Preço e Garantia (#cta-final) · Fale com a Equipe (/contato) · Ver Todos os Cursos (/cursos) | Garantia de 7 Dias · Acesso por 12 Meses · Certificado Digital · +30 Aulas em Vídeo · 11 Módulos Completos · Bônus SAG e PSI · Referência Nacional · Direto do Celular |
| Curso Presencial Lisboa | Programa Completo · Reservar Vaga (#registration-form) · Local: Sintra, Portugal (?secao=local) · Cursos no Brasil (/cursos) | 3 Dias de Imersão · Certificação W-Tech · Vagas Limitadas · Prática em Bancada Real · Sinal de Apenas €150 · Art on Wheels Garage · Alex Crepaldi ao Vivo · 23 a 25 de Outubro |
| Cursos Presenciais BR | Ver Turmas Abertas (/cursos) · Curso Online (Já) (/curso-suspensao-piloto) · Fale com a Equipe (/contato) · Oficinas Credenciadas (/mapa) | Turmas em Todo o Brasil · Prática 100% Presencial · Pagamento no Pix · Referência Nacional · +3 Mil Alunos Formados · Vagas Limitadas por Turma · Alex Crepaldi, Fundador · Certificado W-Tech |

Data de Lisboa confirmada pelo cliente: **23–25 de outubro** (a rota `lp-wtech-lisboa-nov` é só o nome; anúncios e sitelinks seguem a LP).

## Status (16/09/2026, 19h30)

- GTM **v9 publicado** (16 tags, 9 acionadores). Teste em produção: clique no checkout da LP → conversão Google Ads `Inicio de checkout` (label `-q3_CJ-RkPocELT2xPc-`, R$ 347, `gclaw` com o gclid) + evento GA4 `begin_checkout` no tempo real. Cookie `_gcl_aw` gravado pelo Vinculador.
- Campanhas **importadas**: 3 campanhas (pausadas), 12 grupos, 208 palavras (104 frase + 104 exata), 12 RSAs ativos (aprovação pendente), 176 negativas de campanha. Rede só Pesquisa, idioma Português, sufixo UTM aplicado, correspondência ampla desativada, AI Max desligado.
- Opção de local ajustada para **"Presença"** nas 3 campanhas (Lisboa: Portugal; BR: Brasil).
- Sitelinks e frases de destaque salvos nas 3 campanhas (tabela acima).
- Meta: `04 | FB | Purchase` sem Kiwify (web v10) + CAPI Lead (Lisboa) e Purchase (Stripe/MP/Hotmart) (servidor v9) preparados — dependem do clique em "Publicar".
- GA4: `generate_lead` de teste disparado às 18h40; ainda não apareceu em Admin → Eventos → "Eventos recentes" (a lista demora até 24 h). A UI atual só permite marcar como principal o que já está na lista.
- Relatório para o cliente: `docs/google-ads/Relatorio-Google-WTech-2026-09-16.pdf` (12 páginas; fonte HTML gerada com Playwright/Chrome).

## Pendências que dependem do dono da conta

1. **Verificação do anunciante** (Google Ads → Adm → Conta): a conta está **pausada** até enviar os documentos ("Anúncios financiados por ALEX PITER PENA CREPALDI"). Sem isso nenhuma campanha veicula.
2. **Ativar** as campanhas (estão pausadas de propósito) quando quiser começar a gastar. Sugestão: começar pela do curso online e pela de Lisboa.
3. Clicar **Publicar** nas duas telas já preenchidas do GTM: web **v10** e servidor **v9**.
4. GA4 → Admin → Eventos → "Eventos recentes": marcar `generate_lead` como **evento principal** (estrela) quando aparecer na lista (até 24 h após o primeiro envio).
5. Extensão de chamada: confirmar o número de voz da W-Tech (o da LP de Lisboa, +351 917 340 016, é da Art on Wheels Garage — não usar).
6. Tráfego de robô no GA4: ~125 "novos usuários" a cada 30 min batendo na home (EUA). Não afeta conversões, mas polui relatórios — vale filtrar (Admin → Fluxos de dados → lista de tráfego interno/IP, ou regra por país + sessão engajada).
7. Há 1 conversão **Lead** de teste (não atribuída) na conta do Ads, gerada pelo `generate_lead` de validação — ignorar nos relatórios do primeiro dia.
