-- ═══════════════════════════════════════════════════════════════════════════
-- Caixinha de Pautas — Planejador de Conteúdo (Marketing Hub → "Planejador")
--
-- Tabela SITE_ContentInbox: entrada rápida de pautas por QUALQUER pessoa da
-- equipe, direto do painel:
--   kind='duvida'       → pergunta ouvida no balcão/empresa (vira quadro
--                         "Dúvidas dos Seguidores")
--   kind='ideia'        → sugestão de post (André: "tem tal peça, precisa
--                         de vídeo")
--   kind='conhecimento' → conhecimento técnico do Serginho ("Fixador 60mm +
--                         Chave Y atendem a mesma Showa 47") — vira matéria-
--                         prima de compilados, o formato nº 1 do perfil
--
-- A IA (geração semanal e rotina de sexta) lê os itens pendentes e os
-- transforma em cards; ao aproveitar, marca processed=true.
--
-- Rodar no Postgres da VPS (wtechdb_supadb) e reiniciar o PostgREST.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "SITE_ContentInbox" (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kind        TEXT NOT NULL DEFAULT 'ideia',   -- duvida | ideia | conhecimento
    text        TEXT NOT NULL,                   -- a pauta em si
    author      TEXT,                            -- quem registrou (Serginho, André, Kaká…)
    product_ref TEXT,                            -- produto/peça relacionada, quando houver
    processed   BOOLEAN NOT NULL DEFAULT false,  -- já virou card / foi arquivada
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT site_content_inbox_kind_check
        CHECK (kind IN ('duvida', 'ideia', 'conhecimento'))
);

CREATE INDEX IF NOT EXISTS idx_content_inbox_pending ON "SITE_ContentInbox"(processed, created_at);

ALTER TABLE "SITE_ContentInbox" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS content_inbox_all ON "SITE_ContentInbox";
DROP POLICY IF EXISTS content_inbox_service_only ON "SITE_ContentInbox";
REVOKE ALL ON TABLE "SITE_ContentInbox" FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "SITE_ContentInbox" TO service_role;
CREATE POLICY content_inbox_service_only ON "SITE_ContentInbox"
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─── Seed: conhecimentos e dúvidas citados na reunião de 17/07/2026 ─────────
INSERT INTO "SITE_ContentInbox" (kind, text, author, product_ref)
SELECT * FROM (VALUES
    ('conhecimento', 'Existem ferramentas do catálogo que atendem a MESMA suspensão — foi assim que nasceu o "5 essenciais pra Showa" (post nº 1 do perfil). Mapear os kits por modelo de suspensão (Showa, KYB, WP, Beta) para gerar novos compilados.', 'Serginho (via reunião 17/07)', NULL),
    ('duvida', 'Qual a diferença entre um emulador e uma válvula? (pergunta recorrente na empresa)', 'André (via reunião 17/07)', 'Emulador W-Tech'),
    ('ideia', 'Carrossel/vídeo "A sua moto é premium — e a sua suspensão, está regulada à altura?" análise de moto famosa vs a do seguidor', 'Noemi (via reunião 17/07)', NULL)
) AS seed(kind, text, author, product_ref)
WHERE NOT EXISTS (SELECT 1 FROM "SITE_ContentInbox");
