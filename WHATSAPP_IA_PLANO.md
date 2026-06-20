# Plano — IA de Autoatendimento + Multiatendimento + Seletor de Motor (WhatsApp)

> Documento de planejamento. Decisões já fechadas com o Daniel:
> **(1)** IA híbrida por intenção — suporte/dúvidas em autopilot; venda e cobrança
> geram rascunho para o atendente aprovar.
> **(2)** Seletor de motor **por categoria** (venda / cobrança / cronograma).
> **(3)** Criação dos templates da Meta **incluída** no plano (Fase 1).

---

## 1. Como funciona hoje (levantado no código)

Dois motores **isolados**:

| Motor | Arquivos | Uso atual |
|---|---|---|
| **Evolution API** | `lib/whatsapp.ts`, `api/_whatsapp.ts` | Tudo: quiz, LPs, CRM, campanhas (`QueueProcessor`), recuperação de vendas, e os disparos automáticos de curso/cobrança via `api/notify-students.ts` → `api/_notify.ts` → `sendWhatsAppText`. |
| **Meta Cloud API (oficial)** | `api/whatsapp-cloud-send.ts`, `api/whatsapp-cloud-webhook.ts`, `api/_whatsappCloud.ts`, `lib/whatsappCloud.ts` | Inbox em tempo real (`SITE_WhatsAppCloudConversations` / `SITE_WhatsAppCloudMessages`). Webhook de entrada já funciona. |

Base de IA já existe: `lib/ai.ts` → `generateContent(prompt, systemPrompt)` (OpenAI / Gemini / OpenRouter), config em `SITE_Config`.

Config global mora toda em `SITE_Config` (key/value), gerenciada em `components/admin/AdminIntegrations.tsx`.
Limite da Vercel (plano Hobby): **máximo 12 funções serverless** — por isso o responder da IA vai **dentro** do webhook existente, sem criar função nova.

### Verdades de arquitetura (não negociáveis)
1. A Meta **não** fornece o robô que responde — nós rodamos a **nossa IA** no webhook. O autoatendimento por IA **só roda na API oficial** (é a única com webhook de entrada + inbox).
2. **Janela de 24h:** resposta livre só é permitida até 24h após a última mensagem do cliente. Respostas da IA a quem chega vivem dentro disso (ok). **Disparo proativo fora das 24h exige template aprovado** (venda/cobrança/cronograma).

---

## 2. Fase 1 — Seletor de motor + disparos de curso na API oficial

### 2.1 Configuração (Configurações → novo card "Motor de Envio")
Chaves novas em `SITE_Config`:

| Chave | Valores | Padrão |
|---|---|---|
| `wa_engine_course_sales` | `cloud` \| `evolution` | `cloud` |
| `wa_engine_billing` | `cloud` \| `evolution` | `cloud` |
| `wa_engine_schedule` | `cloud` \| `evolution` | `cloud` |
| `wa_engine_report` | `cloud` \| `evolution` | `evolution` |

### 2.2 Dispatcher unificado — `api/_waDispatch.ts` (helper, prefixo `_`)
```
sendTransactional({
  to, category,            // 'course_sales' | 'billing' | 'schedule' | 'report'
  text,                    // usado quando motor = evolution (texto livre)
  templateName, vars       // usado quando motor = cloud (template + variáveis)
}): Promise<{ sent: boolean; engine: 'cloud'|'evolution'; error?: string }>
```
- Lê a chave de motor da categoria em `SITE_Config`.
- `cloud` → envia template aprovado via Graph API (reusa `_whatsappCloud.ts`).
- `evolution` → envia texto livre via `_whatsapp.ts` (`sendWhatsAppText`).
- Best-effort: nunca lança; loga e devolve `{ sent:false }`.

### 2.3 Refatorar os chamadores
- `api/_notify.ts` (`processNotify`: `balance` e `course-info`) passa a chamar `sendTransactional` em vez de `sendWhatsAppText`.
- `api/notify-students.ts` e `api/balance-reminders.ts` herdam o roteamento automaticamente.

### 2.4 Templates da Meta a criar (WhatsApp Manager → Message Templates)
Categoria **UTILITY** (transacional, mais barato), idioma **pt_BR**. Mapear `templateName` + ordem das variáveis no dispatcher.

| Template (nome) | Categoria | Corpo (variáveis) |
|---|---|---|
| `venda_curso_confirmacao` | UTILITY | "Olá {{1}}! Sua inscrição no curso {{2}} foi confirmada. Data: {{3}}. Valor: {{4}}. Estamos à disposição." |
| `cobranca_saldo_curso` | UTILITY | "Olá {{1}}, há um saldo de {{2}} do curso {{3}}, vencimento {{4}}. Pague aqui: {{5}}" |
| `cronograma_lembrete_curso` | UTILITY | "Olá {{1}}! Lembrete do curso {{2}}: {{3}} em {{4}} às {{5}}, local {{6}}." |
| `relatorio_curso_interno` | UTILITY | "Relatório {{1}}: {{2}} inscritos, {{3}} confirmados, saldo {{4}}." (opcional, interno) |

Passo a passo de submissão: Meta Business → WhatsApp Manager → Templates → Criar → categoria UTILITY → pt_BR → colar corpo com variáveis → enviar → aguardar aprovação (horas a ~1 dia) → registrar o nome no dispatcher.

> Enquanto os templates não aprovarem: manter a categoria em `evolution` (o seletor já fica pronto para virar p/ `cloud` num clique).

---

## 3. Fase 2 — Multiatendimento + "Assumir" (handoff)

### 3.1 Estado por conversa — colunas novas em `SITE_WhatsAppCloudConversations`
```sql
ALTER TABLE "SITE_WhatsAppCloudConversations"
  ADD COLUMN IF NOT EXISTS bot_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES "SITE_Users"(id),
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'bot', -- bot | pendente | humano | encerrado
  ADD COLUMN IF NOT EXISTS handoff_at timestamptz,
  ADD COLUMN IF NOT EXISTS handoff_by uuid;
```

### 3.2 Inbox (`components/admin/WhatsApp/CloudInbox/`)
- Lista de conversas: badge de status (🤖 IA / 👤 nome do atendente / ⏳ aguardando humano) + filtros "minhas / sem dono / todas".
- Topo do chat: botões **Assumir**, **Devolver à IA**, **Encerrar** + indicador de quem está atendendo.
- "Assumir" → `assigned_to = eu`, `bot_enabled = false`, `status = 'humano'`. O webhook só deixa a IA responder se `bot_enabled = true`.

---

## 4. Fase 3 — Cérebro da IA + tela de treino

### 4.1 Tabelas novas
```sql
-- Config geral do robô (linha única)
CREATE TABLE "SITE_WhatsAppAIConfig" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled boolean DEFAULT false,         -- liga/desliga global
  persona text,                          -- tom/personalidade
  business_info text,                    -- dados do negócio injetados no prompt
  fallback_message text,                 -- resposta quando não souber
  handoff_keywords text[],               -- ex: {'falar com humano','atendente'}
  working_hours jsonb,                   -- horários de atuação
  max_msgs_before_handoff int DEFAULT 6,
  provider text, model text,             -- override do provedor de IA
  updated_at timestamptz DEFAULT now()
);

-- O que a IA PODE dizer (base de conhecimento por intenção)
CREATE TABLE "SITE_WhatsAppAIKnowledge" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intent text,        -- 'course' | 'sales' | 'support' | 'general'
  title text, content text, enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- O que a IA NÃO pode / deve escalar
CREATE TABLE "SITE_WhatsAppAIRules" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text,          -- 'forbidden' | 'required' | 'escalate'
  value text, enabled boolean DEFAULT true
);
```

### 4.2 Responder da IA — dentro de `api/whatsapp-cloud-webhook.ts`
Após gravar a mensagem de entrada, se `bot_enabled = true` E `SITE_WhatsAppAIConfig.enabled` E dentro do horário:
1. **Classifica a intenção** (course / sales / support / general) via `generateContent` (prompt curto de classificação).
2. Monta o prompt: persona + business_info + entradas de `Knowledge` da intenção + `Rules` (forbidden/required) + últimas N mensagens.
3. **Decisão híbrida por intenção (decisão #1):**
   - `support` / `general` → **autopilot**: gera e **envia** a resposta pela API oficial; loga com `sent_by = 'ai'`.
   - `sales` / `billing` → **rascunho**: salva a mensagem como `status='draft'`, `sent_by='ai_draft'`, marca conversa `pendente`, **não envia**; o atendente aprova no inbox.
4. **Handoff:** keyword de `handoff_keywords`, regra `escalate`, baixa confiança, ou `max_msgs_before_handoff` → `status='pendente'`, IA para de responder, notifica atendentes.

### 4.3 Tela "IA de Atendimento" (nova aba do módulo WhatsApp)
- Editar persona, business_info, fallback, horários, keywords de handoff.
- CRUD de **Knowledge** (por intenção) e **Rules** (forbidden/required/escalate).
- **Sandbox "Simular conversa"**: testar o robô (sem enviar nada real) antes de ligar.
- Botão mestre liga/desliga global.

---

## 5. Fase 4 — Autopilot avançado + analytics
- Ajuste fino de autopilot por intenção; confiança mínima por intenção.
- Métricas: % resolvidas pela IA, nº de handoffs, tempo médio de resposta, custo de IA/mês.

---

## 6. Fase 5 — Permissões (liga/desliga por usuário)

Novo módulo "Atendimento WhatsApp" em `lib/permissions.ts` (a fonte única criada na revisão de permissões):

| Chave | O que controla |
|---|---|
| `whatsapp_inbox_view` | Ver o inbox/multiatendimento |
| `whatsapp_send` | Enviar mensagens manualmente |
| `whatsapp_assume` | Botão "Assumir" (handoff) |
| `whatsapp_ai_manage` | Ligar/desligar o robô (global e por conversa) |
| `whatsapp_ai_train` | Editar conhecimento / regras / persona |
| `whatsapp_engine_config` | Mexer no seletor de motor |

> É aqui que você define **para quais usuários** o autoatendimento liga e quem pode treinar a IA.

---

## 7. Custo, risco e rollout
- **Custo de IA:** recomendar **Gemini Flash** para o atendimento (barato) vs GPT-4o (qualidade) — já configurável em `lib/ai.ts`.
- **Custo Meta:** templates UTILITY custam por conversa; respostas dentro de 24h da janela de serviço são mais baratas.
- **Segurança:** regras (forbidden/required) + handoff sempre disponível + log de tudo (`sent_by`). Venda/cobrança nunca enviam sozinhas (decisão híbrida).
- **Rollout sugerido:** Fase 1 (seletor) → Fase 2 (assumir) → Fase 3 em **modo rascunho para tudo** por ~1 semana → liberar autopilot de suporte → ajustar.

---

## 8. Ordem de execução
1. **Fase 1** — seletor + dispatcher + templates (depende da aprovação dos templates na Meta).
2. **Fase 2** — colunas de handoff + botão "Assumir" no inbox.
3. **Fase 3** — tabelas da IA + responder no webhook + tela de treino + sandbox.
4. **Fase 5** — permissões (pode entrar junto da Fase 2).
5. **Fase 4** — autopilot avançado + analytics.
