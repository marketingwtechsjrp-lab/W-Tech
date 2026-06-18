-- Rastreio de tráfego no lead (LEI 10): persiste a atribuição de campanha no próprio
-- lead, para permitir filtrar no CRM por tráfego pago x orgânico e por origem de campanha.
--
-- Decisão (2026-06-18): "estrutura agora, regra depois". Aqui só criamos o armazenamento
-- e passamos a capturar a UTM crua em cada formulário. A classificação pago/orgânico
-- (a partir de utm_medium/utm_source) é definida depois, sobre dados reais.
--
-- Leads antigos não têm UTM (NULL) — no CRM aparecem como "Não informado".

ALTER TABLE "SITE_Leads" ADD COLUMN IF NOT EXISTS utm_source   TEXT;
ALTER TABLE "SITE_Leads" ADD COLUMN IF NOT EXISTS utm_medium   TEXT;
ALTER TABLE "SITE_Leads" ADD COLUMN IF NOT EXISTS utm_campaign TEXT;
ALTER TABLE "SITE_Leads" ADD COLUMN IF NOT EXISTS utm_content  TEXT;
ALTER TABLE "SITE_Leads" ADD COLUMN IF NOT EXISTS utm_term     TEXT;

-- Índices para o filtro do CRM (source/medium são os mais consultados).
CREATE INDEX IF NOT EXISTS idx_site_leads_utm_source ON "SITE_Leads" (utm_source);
CREATE INDEX IF NOT EXISTS idx_site_leads_utm_medium ON "SITE_Leads" (utm_medium);

-- Verificação
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'SITE_Leads' AND column_name LIKE 'utm_%';
