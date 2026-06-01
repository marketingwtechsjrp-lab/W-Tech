-- Tabela de tracking da recuperação de carrinho via Pix (Kiwify -> WhatsApp)
-- Isolada do fluxo da fila (SITE_Automacao_Fila) para não interferir no que já roda.
-- Alimentada pela edge function kiwify-webhook:
--   - insere ao enviar o Pix de recuperação (com a variante A/B do copy)
--   - marca recovered=true quando o pagamento é aprovado (status paid)

CREATE TABLE IF NOT EXISTS "SITE_Pix_Recovery_Stats" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT NOT NULL UNIQUE,
    phone TEXT,
    name TEXT,
    variant TEXT,                       -- 'A' | 'B' (teste de copy)
    pix_sent BOOLEAN DEFAULT TRUE,
    followup_scheduled BOOLEAN DEFAULT FALSE,
    recovered BOOLEAN DEFAULT FALSE,    -- virou venda?
    sent_at TIMESTAMPTZ DEFAULT now(),
    recovered_at TIMESTAMPTZ
);

ALTER TABLE "SITE_Pix_Recovery_Stats" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access PixStats" ON "SITE_Pix_Recovery_Stats";
CREATE POLICY "Public Access PixStats" ON "SITE_Pix_Recovery_Stats" FOR ALL USING (true) WITH CHECK (true);

-- Consulta de performance (taxa de recuperação por variante A/B):
-- SELECT variant,
--        count(*)                                   AS pix_enviados,
--        count(*) FILTER (WHERE recovered)          AS recuperados,
--        round(100.0 * count(*) FILTER (WHERE recovered) / NULLIF(count(*),0), 1) AS taxa_pct
-- FROM "SITE_Pix_Recovery_Stats"
-- GROUP BY variant
-- ORDER BY variant;
