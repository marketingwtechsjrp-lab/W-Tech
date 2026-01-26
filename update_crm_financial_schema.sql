-- UPDATE CRM & FINANCIAL SCHEMA (SIMPLIFICADO)
-- Execute este script completo no Editor SQL do Supabase.

-- 1. Cria a coluna created_at se não existir (necessária para Fluxo de Caixa)
ALTER TABLE "SITE_Transactions" 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Garante que as colunas antigas (como 'date') sejam migradas se necessário
-- Se 'created_at' estiver nulo após a criação, preenche com 'date' ou NOW()
UPDATE "SITE_Transactions" 
SET created_at = COALESCE(date::timestamp with time zone, NOW()) 
WHERE created_at IS NULL;

-- 3. Adiciona campo de Valor aos Leads
ALTER TABLE "SITE_Leads" 
ADD COLUMN IF NOT EXISTS value DECIMAL(10,2) DEFAULT 0;

-- 4. Adiciona colunas de relacionamento na tabela de Transações
ALTER TABLE "SITE_Transactions" 
ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES "SITE_Leads"(id) ON DELETE SET NULL;

ALTER TABLE "SITE_Transactions" 
ADD COLUMN IF NOT EXISTS attendant_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE "SITE_Transactions" 
ADD COLUMN IF NOT EXISTS attendant_name TEXT;

-- 5. Recria Índices (DROP antes para evitar erro de 'já existe')
DROP INDEX IF EXISTS idx_transactions_attendant;
CREATE INDEX idx_transactions_attendant ON "SITE_Transactions" (attendant_id);

DROP INDEX IF EXISTS idx_transactions_created_at;
CREATE INDEX idx_transactions_created_at ON "SITE_Transactions" (created_at);

DROP INDEX IF EXISTS idx_leads_status_updated;
CREATE INDEX idx_leads_status_updated ON "SITE_Leads" (status, updated_at);

-- 6. Cria View de Relatórios (DROP para garantir atualização)
DROP VIEW IF EXISTS view_sales_by_attendant;
CREATE OR REPLACE VIEW view_sales_by_attendant AS
SELECT 
    attendant_name,
    COUNT(*) as total_sales,
    SUM(amount) as total_revenue,
    DATE_TRUNC('month', created_at) as month
FROM "SITE_Transactions"
WHERE type = 'income' OR type = 'Income'
GROUP BY attendant_name, DATE_TRUNC('month', created_at);
