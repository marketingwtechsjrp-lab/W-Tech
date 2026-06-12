# Plano de Marketing W-Tech — Automação e Cadências

> Documento vivo. Atualizado em 2026-06-12 (v3.2.0). Lê junto: `BREVO_PLANO.md` (infra de e-mail) e `PAGAMENTOS_MEMORIA.md` (checkout).

---

## 1. O funil completo (como está montado hoje)

```
TRÁFEGO (anúncios/orgânico/indicação)
   │  UTMs encaminhadas dinamicamente até o checkout (v3.1.5) + GTM/GA4/Pixel
   ▼
LANDING PAGES dinâmicas por curso — 8 templates (V1–V8)
   │  Preço só aparece com Checkout Automático ativo no curso
   ▼
LEAD entra no CRM (handleLeadUpsert)────────► 📧 FLUXO "Boas-vindas — Novo Lead"
   │                                            (imediato → +2d valor → +3d agenda)
   ├─► CHECKOUT AUTOMÁTICO (Mercado Pago)
   │      │ aprovado → webhook confirma inscrição
   │      │            ├─ 📧 e-mail transacional de confirmação (imediato)
   │      │            └─ 📧 FLUXO "Pós-compra — Onboarding do Aluno"
   │      │               (+1d preparação → +4d portal → +10d indicação)
   │      └ recusado/abandonado → lead volta à ROLETA de atendentes
   │                              + cron diário de recuperação de checkout
   ├─► ATENDIMENTO HUMANO (roleta round-robin)
   │      └ GANHO → Converted (e-mails de pós-compra via webhook quando MP)
   │      └ PERDIDO ──────────────────────────► 📧 FLUXO "Recuperação de Perda — CRM"
   │                                             (imediato → +3d especialista → +7d última)
   ▼
LANÇAMENTO DE CURSO POR CIDADE 📣
   Botão "Lançar p/ Base da Região" no editor da LP
   → segmenta SITE_Leads por cidade (alta propensão) e estado (média)
   → inclui leads perdidos (reaquecimento) · trava de 500 contatos
   → cria fluxo "Lançamento — {curso} ({cidade})" com 3 e-mails
     (anúncio com data/LP → +3d prova social → +4d última chamada)
```

## 2. Cadências ativas (SITE_EmailFlows)

| Fluxo | Gatilho | Quando dispara | Sequência |
|---|---|---|---|
| **Boas-vindas — Novo Lead** | `NovoCadastro` | Lead NOVO criado em qualquer LP/formulário (recadastro não repete) | E-mail imediato → 2d → conteúdo de valor → 3d → convite agenda |
| **Pós-compra — Onboarding do Aluno** | `CompraRecente` | Webhook MP confirma pagamento | 1d → preparação p/ curso → 4d → Portal do Aluno → 10d → indicação |
| **Recuperação de Perda — CRM** | `Perda` | Lead marcado como perdido no CRM (com motivo) | Imediato → 3d → autoridade → 7d → última chamada c/ condições |
| **Lançamento — {curso}** | `Segmento` | Botão 📣 no editor da LP do curso | Anúncio c/ data → 3d → prova social → 4d → última chamada |
| Re-engajamento | `Inatividade` | (manual por enquanto — sem auto-enroll) | definido na UI |

**Motor:** cron diário `/api/process-email-flows` (10h Brasília). Com Brevo desligado, a fila fica preservada (nada avança nem se perde).
**Logs:** todo envio em `SITE_EmailLogs`. **Edição dos textos:** Admin → Marketing → E-mail Flows.

## 3. Pré-requisito ÚNICO para tudo funcionar

⚠️ **Ativar o Brevo** (ainda pendente):
1. Rodar `migrations/brevo_email_integration.sql` no SQL Editor do Supabase.
2. Admin → Integrações → card "E-mail (Brevo SMTP)" → login + SMTP key + remetente verificado → Salvar → toggle Ativo → "Testar".

Sem isso, **nenhum e-mail sai** — mas os leads continuam entrando nas filas (nada se perde; ao ativar, o processamento começa do passo 1 de cada inscrição).

## 4. Playbook de lançamento de curso (passo a passo)

1. **Criar o curso** no admin com cidade/estado/data/preço (e `deposit_price` se houver sinal). Ativar **Checkout Automático** se quiser preço na LP.
2. **Criar/editar a LP** (Cursos → editar → Landing Page): escolher template (V1–V8), preencher hero, módulos, instrutor, depoimentos. Salvar.
3. **Testar a LP** no botão Visualizar (conferir preço aparecendo só com checkout ativo).
4. **📣 Lançar p/ Base da Região** (no topo do editor da LP): confere a prévia do público (cidade/estado/perdidos) e confirma. A cadência de 3 e-mails entra na fila.
5. **Tráfego pago** apontando para a LP com UTMs (`?utm_source=...` — são propagadas até o checkout).
6. **Acompanhar**: CRM (leads entrando pela roleta), SITE_EmailLogs (envios), Financeiro (vendas MP).

## 5. Métricas para acompanhar (semanal)

| Métrica | Onde | Meta inicial |
|---|---|---|
| Leads novos / semana | CRM | baseline + 10%/mês |
| Taxa LP → lead | GA4 / GTM | > 8% |
| Lead → venda (checkout automático) | Enrollments vs leads tagueados `checkout_direto` | > 3% |
| Recuperação de perdidos | Leads `Perda` que voltam a `New`/`Converted` após o fluxo | > 5% |
| Abertura de e-mail | Painel do Brevo (estatísticas por remetente) | > 30% |
| Vendas por lançamento regional | Fluxo `Lançamento — {curso}` vs inscrições do curso | mensurar 1º ciclo |

## 6. Roadmap de marketing (próximos passos sugeridos)

**Curto prazo (já dá para fazer):**
- [ ] Ativar Brevo (item 3) — destrava TODAS as cadências.
- [ ] Publicar container GTM `GTM-TL39QFMG` (pendente — site já pronto).
- [ ] Rodar o primeiro lançamento regional com um curso real e medir.
- [ ] Padronizar UTMs por canal (ex.: `utm_source=meta|google|whatsapp`).

**Médio prazo:**
- [ ] Auto-enroll `Inatividade` (cron que detecta leads sem interação > 30d e inscreve no fluxo de re-engajamento).
- [ ] E-mail de confirmação também nas vendas Stripe (hoje só MP) + corrigir bug latente do stripe-webhook (ver PAGAMENTOS_MEMORIA.md).
- [ ] Tracking de abertura/clique nos fluxos (pixels do Brevo) para destravar os passos `Condition`.
- [ ] Segmentação por interesse além de geografia (tags de origem: motocross/trail/street).

**Longo prazo:**
- [ ] Score de propensão (histórico de cursos na cidade + engajamento + quiz) para priorizar a roleta.
- [ ] WhatsApp nas cadências (Evolution API já integrada) — multicanal e-mail + WhatsApp.
- [ ] Programa de indicação formal (cupom/comissão para aluno que indica).

## 7. Referência técnica rápida

| Peça | Arquivo |
|---|---|
| Motor de envio | `api/_email.ts` (Brevo SMTP, logs) |
| Motor de fluxos | `api/_flows.ts` + cron `api/process-email-flows.ts` |
| Auto-enroll boas-vindas | `lib/leadDistribution.ts` (handleLeadUpsert, branch created) |
| Auto-enroll pós-compra | `api/mercadopago-webhook.ts` (passo 8) |
| Auto-enroll perda | `components/admin/CRM/CRMView.tsx` (handleConfirmLost) via `lib/flows.ts` |
| Lançamento por cidade | `api/launch-course-campaign.ts` + botão em `pages/LandingPageEditor.tsx` |
| Templates de LP | `pages/LandingPageViewer*.tsx` (V1–V8) + `hooks/useLandingPage.ts` + `components/lp/` |
