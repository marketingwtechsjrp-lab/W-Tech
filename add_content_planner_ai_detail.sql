-- ═══════════════════════════════════════════════════════════════════════════
-- Planejador de Conteúdo — detalhamento de post gerado por IA
--
-- Adiciona a coluna ai_detail (JSONB) em SITE_ContentPosts: o "post detalhado"
-- gerado pela IA para cada card — roteiro de Reels cena a cena, carrossel
-- slide a slide ou direção de foto, com notas de engajamento/conversão,
-- gancho, CTA, legenda final, trilha e checklist de produção.
--
-- Rodar no Postgres da VPS (container wtechdb_supadb) e depois reiniciar o
-- PostgREST (wtechdb_suparest) para recarregar o schema cache.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE "SITE_ContentPosts"
    ADD COLUMN IF NOT EXISTS ai_detail JSONB;
