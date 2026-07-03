-- ═══════════════════════════════════════════════════════════════════════════
-- Campanhas de Captura (Marketing Hub → aba "Captura")
--
-- Campanhas de captação de leads com páginas próprias (/captura/:slug):
-- quiz gamificado, enquetes, formulários e templates de LP. Os leads capturados
-- ficam ISOLADOS na campanha (SITE_CaptureLeads) e só entram no CRM
-- (SITE_Leads) quando enviados manualmente pelo painel, em lote.
--
-- Rodar no SQL Editor do Supabase (projeto niesvylxwfaffgnmdoql).
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Tabela de campanhas ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "SITE_CaptureCampaigns" (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    slug            TEXT NOT NULL UNIQUE,
    description     TEXT,
    -- Mecânica da campanha: quiz | enquete | formulario
    type            TEXT NOT NULL DEFAULT 'quiz',
    -- Template visual da página pública:
    -- lp_captura | simples | venda_produto | lancamento_curso | lancamento_produto | ferramenta
    template        TEXT NOT NULL DEFAULT 'ferramenta',
    -- draft (não acessível) | active (capturando) | ended (encerrada, só resultados)
    status          TEXT NOT NULL DEFAULT 'draft',
    -- Configuração flexível por template. Para quiz/enquete:
    -- { "question": "...", "options": ["A","B"], "gamification": "race",
    --   "cta": "...", "success_message": "...", "headline": "...", "subheadline": "..." }
    config          JSONB NOT NULL DEFAULT '{}'::jsonb,
    ends_at         TIMESTAMPTZ,
    sent_to_crm_at  TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Leads capturados (lista interna da campanha) ────────────────────────────
CREATE TABLE IF NOT EXISTS "SITE_CaptureLeads" (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id     UUID NOT NULL REFERENCES "SITE_CaptureCampaigns"(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    email           TEXT,
    phone           TEXT NOT NULL,
    -- Resposta da mecânica. Quiz/enquete: { "vote": "Curitiba" }
    answer          JSONB NOT NULL DEFAULT '{}'::jsonb,
    consent         BOOLEAN NOT NULL DEFAULT false,
    -- Atribuição de tráfego (LEI 10) — capturada no navegador do lead
    utm_source      TEXT,
    utm_medium      TEXT,
    utm_campaign    TEXT,
    utm_content     TEXT,
    utm_term        TEXT,
    -- Controle do envio manual para o CRM
    sent_to_crm     BOOLEAN NOT NULL DEFAULT false,
    crm_lead_id     UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_capture_leads_campaign ON "SITE_CaptureLeads"(campaign_id);
-- 1 voto por telefone por campanha (revotar atualiza a resposta via upsert)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_capture_lead_phone ON "SITE_CaptureLeads"(campaign_id, phone);

-- ─── RLS (padrão permissivo do projeto — painel usa anon key) ────────────────
ALTER TABLE "SITE_CaptureCampaigns" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SITE_CaptureLeads"     ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS capture_campaigns_all ON "SITE_CaptureCampaigns";
CREATE POLICY capture_campaigns_all ON "SITE_CaptureCampaigns"
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS capture_leads_all ON "SITE_CaptureLeads";
CREATE POLICY capture_leads_all ON "SITE_CaptureLeads"
    FOR ALL USING (true) WITH CHECK (true);

-- ─── Seed: 1ª campanha — enquete gamificada da cidade de setembro ───────────
INSERT INTO "SITE_CaptureCampaigns" (name, slug, description, type, template, status, config)
VALUES (
    'Próxima Cidade — Curso de Setembro',
    'proxima-cidade-setembro',
    'Enquete gamificada: o público vota na próxima cidade do curso W-Tech de setembro. Cada voto avança a motinha da cidade rumo à chegada.',
    'quiz',
    'ferramenta',
    'active',
    '{
        "headline": "Qual cidade recebe o curso W-Tech de setembro?",
        "subheadline": "Seu voto decide. A cidade que cruzar a linha de chegada primeiro recebe a próxima turma presencial.",
        "question": "Vote na sua cidade",
        "options": ["Vitória", "Curitiba", "Cuiabá", "Campo Grande"],
        "gamification": "race",
        "cta": "Quero o curso na minha cidade",
        "success_message": "Voto confirmado! Acompanhe a corrida — compartilhe com a galera da sua cidade para acelerar a sua motinha."
    }'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

-- ─── Verificação ─────────────────────────────────────────────────────────────
SELECT id, name, slug, type, template, status FROM "SITE_CaptureCampaigns";
