-- ============================================================================
-- whatsapp_ai_tables.sql  (Fase 3 — Cérebro da IA de atendimento)
-- ----------------------------------------------------------------------------
-- Config geral do robô + base de conhecimento (o que PODE dizer) + regras
-- (o que NÃO pode / deve escalar). Lidas pelo webhook (service role) e
-- gerenciadas pela tela "IA de Atendimento" (anon + RLS).
-- Rode no Supabase: SQL Editor > New query > cole tudo > Run. Idempotente.
-- ============================================================================

-- ─── Config geral (linha única) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "SITE_WhatsAppAIConfig" (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled                  boolean NOT NULL DEFAULT false,   -- liga/desliga global
  persona                  text,                             -- tom/personalidade
  business_info            text,                             -- dados do negócio
  fallback_message         text DEFAULT 'Um momento, vou te transferir para um atendente.',
  handoff_keywords         text[] DEFAULT ARRAY['falar com humano','atendente','reclamação','cancelar'],
  working_hours            jsonb,                            -- {start,end,days} (null = 24/7)
  max_msgs_before_handoff  integer NOT NULL DEFAULT 6,
  autopilot_intents        text[] DEFAULT ARRAY['support','general'], -- intenções que respondem sozinhas
  provider                 text,                             -- override: openai|gemini|openrouter
  model                    text,
  updated_at               timestamptz NOT NULL DEFAULT now()
);

-- Garante exatamente uma linha de config.
INSERT INTO "SITE_WhatsAppAIConfig" (enabled, persona, business_info)
SELECT false,
       'Você é o atendente virtual da W-Tech, especialista em suspensão e cursos presenciais de mecânica de motos. Seja cordial, objetivo e use português do Brasil.',
       'A W-Tech vende cursos presenciais, peças de suspensão e dá suporte técnico. Horário comercial seg-sex 9h-18h.'
WHERE NOT EXISTS (SELECT 1 FROM "SITE_WhatsAppAIConfig");

-- ─── Base de conhecimento: o que a IA PODE dizer (por intenção) ──────────────
CREATE TABLE IF NOT EXISTS "SITE_WhatsAppAIKnowledge" (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intent      text NOT NULL DEFAULT 'general',  -- course | sales | support | general
  title       text NOT NULL,
  content     text NOT NULL,
  enabled     boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wa_ai_knowledge_intent
  ON "SITE_WhatsAppAIKnowledge" (intent, enabled);

-- ─── Regras: o que a IA NÃO pode / deve escalar ─────────────────────────────
CREATE TABLE IF NOT EXISTS "SITE_WhatsAppAIRules" (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type        text NOT NULL DEFAULT 'forbidden', -- forbidden | required | escalate
  value       text NOT NULL,
  enabled     boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO "SITE_WhatsAppAIRules" (type, value)
SELECT * FROM (VALUES
  ('forbidden', 'Nunca prometa descontos, valores ou condições de pagamento que não estejam confirmados.'),
  ('forbidden', 'Nunca invente datas de curso, disponibilidade de vagas ou prazos de entrega.'),
  ('escalate',  'Pedidos de cancelamento, reembolso ou reclamação devem ser transferidos para um atendente humano.'),
  ('required',  'Sempre confirme o nome e a cidade do cliente antes de recomendar um curso presencial.')
) AS seed(type, value)
WHERE NOT EXISTS (SELECT 1 FROM "SITE_WhatsAppAIRules");

-- ─── RLS (painel lê/gerencia via anon; webhook usa service role) ────────────
ALTER TABLE "SITE_WhatsAppAIConfig"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SITE_WhatsAppAIKnowledge" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SITE_WhatsAppAIRules"     ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wa_ai_config_all    ON "SITE_WhatsAppAIConfig";
CREATE POLICY wa_ai_config_all    ON "SITE_WhatsAppAIConfig"    FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS wa_ai_knowledge_all ON "SITE_WhatsAppAIKnowledge";
CREATE POLICY wa_ai_knowledge_all ON "SITE_WhatsAppAIKnowledge" FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS wa_ai_rules_all     ON "SITE_WhatsAppAIRules";
CREATE POLICY wa_ai_rules_all     ON "SITE_WhatsAppAIRules"     FOR ALL USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload config';
