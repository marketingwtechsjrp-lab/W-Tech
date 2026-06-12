# Plano de Ação — Integração Brevo (E-mails) · W-Tech

> Documento de continuidade. Se o contexto/token acabar, retome a partir do "Status atual" e da checklist abaixo. Tudo que um sessão nova precisa saber está aqui.

## Decisões (confirmadas pelo Daniel)
- **Envio:** SMTP via `nodemailer` (já instalado) usando o relay do Brevo.
- **Conteúdo:** templates HTML versionados no repo + interpolação de variáveis (`{{nome}}` etc.).
- **Remetente:** já verificado no Brevo (Daniel cola login/SMTP key/remetente no admin).

## Arquitetura / convenções do projeto (importante)
- **Segredos de integração** ficam em `SITE_Config` (key/value), lidos **só no servidor** (service role). Ex.: `mercadopago_access_token`, `evolution_api_url`. **NÃO usar `SITE_SystemSettings`** para a SMTP key — essa tabela é lida no cliente (`SettingsProvider` busca tudo) e vazaria o segredo no bundle.
- Funções serverless ficam em `/api/*.ts`. Arquivos com prefixo `_` (ex.: `api/_email.ts`) **não viram rota** — usar para helpers compartilhados.
- ESM: o projeto tem `"type": "module"` → **imports relativos entre arquivos `/api` precisam de extensão `.js`** (ex.: `import { sendEmail } from './_email.js'`). (Foi a causa de um bug 500 no webhook.)
- **Schema-first:** o PostgREST rejeita o write inteiro se mencionar coluna inexistente (causou o bug do `updated_at` em `SITE_Enrollments`). Só escrever colunas que existem de fato. Rodar as migrations antes de usar.
- Padrão de lib de integração: `lib/<nome>.ts` com getter lendo `SITE_Config` (ver `lib/whatsapp.ts` → `getGlobalWhatsAppConfig`).
- Cron da Vercel já é usado (`vercel.json` → `/api/checkout-recovery` `0 12 * * *`).
- Supabase: `https://niesvylxwfaffgnmdoql.supabase.co`.

## Chaves novas em `SITE_Config`
| key | exemplo | uso |
|-----|---------|-----|
| `brevo_enabled` | `true` | liga/desliga envio |
| `brevo_smtp_host` | `smtp-relay.brevo.com` | host SMTP |
| `brevo_smtp_port` | `587` | porta |
| `brevo_smtp_login` | `xxxx@smtp-brevo.com` | login SMTP do Brevo |
| `brevo_smtp_key` | (SMTP key) | senha SMTP — **segredo** |
| `brevo_sender_email` | `contato@w-techbrasil.com.br` | remetente (verificado) |
| `brevo_sender_name` | `W-Tech Brasil` | nome do remetente |

## Tabelas de e-mail que JÁ existem
- `SITE_EmailLogs` (id, created_at, campaign_id, recipient_email, status, error_message) — **vamos estender** com: `type`, `subject`, `enrollment_id` (migration).
- `SITE_EmailFlows` / `SITE_FlowSteps` / `SITE_FlowEnrollments` — UI pronta em `components/admin/Marketing/EmailFlowsView.tsx`, **sem motor de envio**.
- `SITE_EmailCampaigns`, `SITE_EmailSequences`/`SITE_SequenceSteps`/`SITE_SequenceEnrollments` (legado).
- Gatilhos da UI de fluxos: `NovoCadastro`, `CompraRecente`, `Inatividade`.

## Variáveis disponíveis para o e-mail de confirmação
Do `SITE_Enrollments` + join `SITE_Courses` (ver `pages/InscricaoConfirmada.tsx`):
`student_name`, `student_email`, `status`, `amount_paid`, `total_amount`, `currency`,
curso: `title`, `date`, `date_end`, `city`, `state`, `start_time`, `what_to_bring`, `whatsapp_group_link`.
Código de acesso do aluno: `SITE_Leads.client_code` (por email).

---

## FASES E CHECKLIST

### FASE 1 — Config Brevo no admin ✅ FEITO
- [x] Migration: `migrations/brevo_email_integration.sql` (7 keys em SITE_Config + extensão EmailLogs). **Daniel precisa rodar no Supabase.**
- [x] `lib/email.ts`: `getBrevoConfig()`.
- [x] `components/admin/AdminIntegrations.tsx`: card "E-mail (Brevo SMTP)" + toggle + botão testar. (Salvar cria as keys via upsert mesmo sem migration.)

### FASE 2 — Motor de envio (serverless) ✅ FEITO
- [x] `api/_email.ts`: `sendEmail()`, `alreadySent()`, `sendTemplate()` — nodemailer + Brevo SMTP, timeout 12s, log em SITE_EmailLogs, respeita `brevo_enabled`.
- [x] `api/send-test-email.ts`: rota POST `{to}`.
- [x] `lib/emailTemplates.ts`: `renderTemplate()` + base HTML W-Tech + templates `confirmacao_inscricao` e `teste`.
- [x] Migration de extensão dos logs incluída no mesmo arquivo da Fase 1.
- ⚠️ Pendência p/ funcionar 100%: Daniel rodar `migrations/brevo_email_integration.sql` e preencher/ativar Brevo no admin.

### FASE 3 — E-mail de confirmação de inscrição (transacional) ✅ FEITO
- [x] Template `confirmacao_inscricao` em `lib/emailTemplates.ts` (usa `showBalance` boolean p/ saldo).
- [x] Disparo em `api/mercadopago-webhook.ts` passo 7 (dentro do bloco de tarefas secundárias, `withTimeout` 14s, não-fatal). Busca curso + `client_code`, monta portalUrl `/meus-pedidos?code=`.
- [x] Idempotência via `alreadySent(enrollmentId, 'confirmacao_inscricao')`.
- [ ] ⏳ Testar ponta a ponta (depende de Daniel rodar migration + configurar/ativar Brevo).

### FASE 4 — Follow-up (flowup) de clientes ✅ FEITO (core)
- [x] `api/_flows.ts`: `enrollContactInFlows()` (idempotente) + `processDueFlowEnrollments()` (walker: Email envia, Delay agenda next_run_at, Exit/Completed encerram, Condition passa adiante v1).
- [x] `api/process-email-flows.ts`: rota do cron.
- [x] `lib/emailTemplates.ts`: `renderRawEmail()` envelopa o corpo custom do fluxo na identidade W-Tech.
- [x] Gatilho `CompraRecente` no webhook (passo 8, após confirmação).
- [x] Cron em `vercel.json`: `/api/process-email-flows` a cada 4h.
- [x] `EmailFlowsView` já grava em SITE_EmailFlows/Steps → motor lê fluxos `status='Active'`. Para ativar um fluxo, mudar status para `Active` na UI.
- [ ] ⏳ Melhoria futura: auto-enroll `NovoCadastro` na criação de lead (leads nascem em vários pontos do cliente — fazer via trigger no banco ou ponto único). Documentado, não bloqueia o follow-up de compra.
- Condition steps: v1 passa adiante (sem tracking de abertura/clique ainda).

### FASE 5 — Testes e validação
- [ ] Botão de teste no admin → caixa de entrada.
- [ ] Inscrição ponta a ponta → e-mail de confirmação chega.
- [ ] Conferir `SITE_EmailLogs`.
- [ ] Validar cron do flowup.

---

## Como testar o webhook/pagamento (referência)
- Buscar pagamento real por external_reference (token em `SITE_Config.mercadopago_access_token`):
  `GET https://api.mercadopago.com/v1/payments/search?external_reference=<enrollmentId>`
- Disparar webhook prod: `POST https://site.w-techbrasil.com.br/api/mercadopago-webhook` body `{"action":"payment.updated","data":{"id":"<payment_id>"},"type":"payment"}`
- Pagamento de teste já confirmado: enrollment `e929a4f8-5180-46fa-86cc-455ca17c6990` (daniel2), payment_id `162886722381`.

## Versionamento
Seguir o padrão: bump `package.json` + entradas em `CHANGELOG.json` e `CHANGELOG.md`, commit `vX.Y.Z: <título>`, push `origin main`. Última versão: **3.0.19**. Próxima: 3.1.0 (feature de e-mail).

## Status atual
- 2026-06-11: plano criado. Webhook MP corrigido e validado (v3.0.19).
- 2026-06-11: **FASE 1 e 2 concluídas e commitadas.** Config Brevo no admin + motor de envio + templates + rota de teste.
- **Próximo passo: FASE 3** (e-mail de confirmação no webhook). Depois Fase 4 (flowup) e Fase 5 (release/bump 3.1.0).
- **Ação do Daniel:** rodar `migrations/brevo_email_integration.sql` no Supabase; no admin → Integrações, preencher SMTP do Brevo, ativar e testar.
