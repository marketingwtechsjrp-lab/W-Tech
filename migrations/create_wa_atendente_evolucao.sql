-- ============================================================================
-- Evolução do atendente — comparação histórica dos relatórios de IA
-- ----------------------------------------------------------------------------
-- A aba "Evolução" (Atendentes WhatsApp) lê TODOS os relatórios já gerados em
-- SITE_WaAtendenteAnalises para um atendente, pede à IA que extraia as notas de
-- cada período (cordialidade, agilidade, clareza, comercial, resolução) e grava
-- aqui o resultado consolidado: série de pontuações para o gráfico + veredito
-- (evoluiu / piorou / estável) + relatório comparativo.
--
-- Depende de migrations/create_wa_atendentes.sql.
-- ============================================================================

CREATE TABLE IF NOT EXISTS "SITE_WaAtendenteEvolucao" (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    atendente_id          uuid REFERENCES "SITE_WaAtendentes"(id) ON DELETE CASCADE,
    atendente_nome        text,                    -- snapshot do nome na geração
    relatorios_analisados integer NOT NULL DEFAULT 0,
    periodo_inicio        timestamptz,             -- início do relatório mais antigo comparado
    periodo_fim           timestamptz,             -- fim do relatório mais recente comparado
    pontuacoes            jsonb,                   -- série temporal p/ o gráfico (1 ponto por relatório)
    resumo                jsonb,                   -- veredito + deltas calculados pelo sistema
    relatorio             text NOT NULL,           -- relatório comparativo (texto)
    created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_atd_evolucao_atendente
    ON "SITE_WaAtendenteEvolucao" (atendente_id, created_at DESC);

-- ─── RLS (mesmo padrão de SITE_WaAtendenteAnalises) ─────────────────────────
ALTER TABLE "SITE_WaAtendenteEvolucao" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wa_atd_evolucao_read ON "SITE_WaAtendenteEvolucao";
CREATE POLICY wa_atd_evolucao_read ON "SITE_WaAtendenteEvolucao"
    FOR SELECT USING (true);

DROP POLICY IF EXISTS wa_atd_evolucao_insert ON "SITE_WaAtendenteEvolucao";
CREATE POLICY wa_atd_evolucao_insert ON "SITE_WaAtendenteEvolucao"
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS wa_atd_evolucao_delete ON "SITE_WaAtendenteEvolucao";
CREATE POLICY wa_atd_evolucao_delete ON "SITE_WaAtendenteEvolucao"
    FOR DELETE USING (true);

-- ─── Recarrega o cache de schema do PostgREST ───────────────────────────────
-- Sem isso a API continua respondendo "Could not find the table ... in the
-- schema cache" mesmo com a tabela já criada.
NOTIFY pgrst, 'reload schema';
