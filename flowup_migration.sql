-- ═══════════════════════════════════════════════════
-- FLOWUP MIGRATION — Retrabalho de Leads Perdidos
-- Execute no Supabase SQL Editor
-- ═══════════════════════════════════════════════════

-- 1. SITE_FlowUpLeads
-- Espelha leads Cold/Rejected com contexto enriquecido
CREATE TABLE IF NOT EXISTS public."SITE_FlowUpLeads" (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id         UUID UNIQUE REFERENCES public."SITE_Leads"(id) ON DELETE CASCADE,
    -- Dados herdados do lead
    name            TEXT NOT NULL,
    email           TEXT,
    phone           TEXT,
    -- Contexto de interesse
    course_interest TEXT,          -- Ex: "Suspensão W-Tech"
    region_city     TEXT,          -- Cidade do lead
    region_state    TEXT,          -- Estado
    lead_source_type TEXT,         -- 'Quiz' | 'LP' | 'Evento' | 'Manual' | 'WhatsApp'
    -- Motivo da perda (campo obrigatório no CRM ao perder lead)
    lost_reason     TEXT CHECK (lost_reason IN (
        'price',          -- Preço
        'date',           -- Data incompatível
        'location',       -- Local distante
        'not_now',        -- Ainda não é o momento
        'comparing',      -- Comparando opções
        'no_response',    -- Não respondeu
        'other'           -- Outro
    )),
    lost_reason_notes TEXT,        -- Observação livre
    -- Controle de fase
    phase           TEXT NOT NULL DEFAULT 'accommodation' CHECK (phase IN (
        'accommodation', -- Fase 1: D0 — pausa comercial, mensagem leve
        'nurturing',     -- Fase 2: D+7 a D+30 — conteúdo educacional
        'reactivation',  -- Fase 3: Evento-driven — nova turma/cidade
        'reactivated',   -- Reativado com sucesso
        'archived'       -- Arquivado definitivamente
    )),
    -- Status operacional
    flowup_status   TEXT NOT NULL DEFAULT 'active' CHECK (flowup_status IN (
        'active',    -- Em andamento
        'paused',    -- Pausado manualmente
        'converted', -- Voltou ao CRM
        'archived'   -- Sem perspectiva
    )),
    -- Datas de controle
    entered_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    phase_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_contacted_at TIMESTAMPTZ,
    reactivated_at  TIMESTAMPTZ,
    -- Métricas
    contact_count   INT NOT NULL DEFAULT 0,
    email_open_count INT NOT NULL DEFAULT 0,
    link_click_count INT NOT NULL DEFAULT 0,
    -- Tags e notas
    tags            TEXT[] DEFAULT '{}',
    notes           TEXT,
    -- Meta
    created_by      UUID REFERENCES auth.users(id),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- 2. SITE_FlowUpActivities
-- Log de todas as atividades por lead no FlowUp
CREATE TABLE IF NOT EXISTS public."SITE_FlowUpActivities" (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flowup_lead_id  UUID NOT NULL REFERENCES public."SITE_FlowUpLeads"(id) ON DELETE CASCADE,
    -- Tipo de atividade
    type            TEXT NOT NULL CHECK (type IN (
        'whatsapp_sent',    -- WhatsApp enviado
        'email_sent',       -- Email enviado
        'email_opened',     -- Email aberto
        'link_clicked',     -- Link clicado
        'phase_changed',    -- Mudança de fase
        'manual_note',      -- Nota manual do operador
        'reactivated',      -- Lead reativado
        'responded'         -- Lead respondeu
    )),
    channel         TEXT CHECK (channel IN ('whatsapp', 'email', 'system', 'manual')),
    subject         TEXT,           -- Assunto do email ou título da mensagem
    body            TEXT,           -- Conteúdo enviado
    metadata        JSONB,          -- Dados extras (ex: link clicado, template usado)
    performed_by    UUID REFERENCES auth.users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. SITE_FlowUpSegments
-- Segmentos dinâmicos automáticos para disparo de campanhas
CREATE TABLE IF NOT EXISTS public."SITE_FlowUpSegments" (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    description     TEXT,
    -- Regras de filtro (JSONB para flexibilidade)
    rules           JSONB NOT NULL DEFAULT '{}',
    -- Exemplo de rules:
    -- {"region_city": "São Paulo", "course_interest": "Suspensão", "lost_reason": "date"}
    -- Contagem cacheada (atualizada por trigger/job)
    cached_count    INT DEFAULT 0,
    last_synced_at  TIMESTAMPTZ,
    -- Campos de controle
    is_active       BOOLEAN DEFAULT true,
    created_by      UUID REFERENCES auth.users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ─── Índices ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_flowup_leads_lead_id   ON public."SITE_FlowUpLeads"(lead_id);
CREATE INDEX IF NOT EXISTS idx_flowup_leads_status    ON public."SITE_FlowUpLeads"(flowup_status);
CREATE INDEX IF NOT EXISTS idx_flowup_leads_phase     ON public."SITE_FlowUpLeads"(phase);
CREATE INDEX IF NOT EXISTS idx_flowup_leads_region    ON public."SITE_FlowUpLeads"(region_city, region_state);
CREATE INDEX IF NOT EXISTS idx_flowup_leads_course    ON public."SITE_FlowUpLeads"(course_interest);
CREATE INDEX IF NOT EXISTS idx_flowup_leads_reason    ON public."SITE_FlowUpLeads"(lost_reason);
CREATE INDEX IF NOT EXISTS idx_flowup_activities_lead ON public."SITE_FlowUpActivities"(flowup_lead_id);
CREATE INDEX IF NOT EXISTS idx_flowup_activities_type ON public."SITE_FlowUpActivities"(type);

-- ─── updated_at auto-trigger ─────────────────────────
CREATE OR REPLACE FUNCTION update_flowup_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_flowup_leads_updated_at
    BEFORE UPDATE ON public."SITE_FlowUpLeads"
    FOR EACH ROW EXECUTE FUNCTION update_flowup_updated_at();

CREATE TRIGGER trg_flowup_segments_updated_at
    BEFORE UPDATE ON public."SITE_FlowUpSegments"
    FOR EACH ROW EXECUTE FUNCTION update_flowup_updated_at();

-- ─── RLS ─────────────────────────────────────────────
ALTER TABLE public."SITE_FlowUpLeads"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SITE_FlowUpActivities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SITE_FlowUpSegments"  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can manage FlowUp Leads"
    ON public."SITE_FlowUpLeads" FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Auth users can manage FlowUp Activities"
    ON public."SITE_FlowUpActivities" FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Auth users can manage FlowUp Segments"
    ON public."SITE_FlowUpSegments" FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── Segmentos padrão ────────────────────────────────
INSERT INTO public."SITE_FlowUpSegments" (name, description, rules) VALUES
    ('Leads SP – Suspensão', 'Leads de São Paulo interessados em Suspensão', '{"region_state": "SP", "course_interest": "Suspensão"}'),
    ('Perdidos por Data', 'Leads que desistiram por incompatibilidade de data', '{"lost_reason": "date"}'),
    ('Perdidos por Preço', 'Leads sensíveis a preço', '{"lost_reason": "price"}'),
    ('Leads Quiz – Quente', 'Leads de quiz com alta performance', '{"lead_source_type": "Quiz", "temperature": "Quente"}'),
    ('Leads de Eventos', 'Leads captados em eventos presenciais', '{"lead_source_type": "Evento"}'),
    ('Local Distante', 'Leads que desistiram por distância', '{"lost_reason": "location"}'),
    ('Sem Resposta – Reengajamento', 'Leads que nunca responderam', '{"lost_reason": "no_response"}')
ON CONFLICT DO NOTHING;

-- ─── Migração Incremental ─────────────────────────────
-- Se a tabela já existe sem o UNIQUE em lead_id, execute:
-- ALTER TABLE public."SITE_FlowUpLeads" ADD CONSTRAINT flowup_leads_lead_id_unique UNIQUE (lead_id);
