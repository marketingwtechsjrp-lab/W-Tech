-- Atribuição de tráfego pago no lead (Google Ads / Meta).
-- gclid/gbraid/wbraid: IDs de clique do Google — permitem importar conversões offline
-- (lead ganho no CRM → Google Ads) e auditar a origem paga sem depender só de UTM.
-- fbclid/gad_source: mesmo papel para Meta e para o "gad_source" do Google.
-- landing_page/referrer: por onde o lead entrou, mesmo sem UTM nenhuma.
ALTER TABLE public."SITE_Leads" ADD COLUMN IF NOT EXISTS gclid text;
ALTER TABLE public."SITE_Leads" ADD COLUMN IF NOT EXISTS gbraid text;
ALTER TABLE public."SITE_Leads" ADD COLUMN IF NOT EXISTS wbraid text;
ALTER TABLE public."SITE_Leads" ADD COLUMN IF NOT EXISTS fbclid text;
ALTER TABLE public."SITE_Leads" ADD COLUMN IF NOT EXISTS gad_source text;
ALTER TABLE public."SITE_Leads" ADD COLUMN IF NOT EXISTS landing_page text;
ALTER TABLE public."SITE_Leads" ADD COLUMN IF NOT EXISTS referrer text;

COMMENT ON COLUMN public."SITE_Leads".gclid IS 'Google Click ID (Google Ads) capturado na URL de entrada';
COMMENT ON COLUMN public."SITE_Leads".landing_page IS 'Primeira página vista na sessão que gerou o lead';
COMMENT ON COLUMN public."SITE_Leads".referrer IS 'Referrer externo da sessão que gerou o lead';

-- Índice parcial: só leads com gclid (poucos) — barato e útil para o export de conversões offline.
CREATE INDEX IF NOT EXISTS site_leads_gclid_idx ON public."SITE_Leads" (gclid) WHERE gclid IS NOT NULL;
