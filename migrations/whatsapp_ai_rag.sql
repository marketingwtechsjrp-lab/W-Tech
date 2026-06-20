-- ============================================================================
-- whatsapp_ai_rag.sql  (RAG + análise de bastidor)
-- ----------------------------------------------------------------------------
-- Memória que aprende com as conversas (pgvector) + colunas de análise por
-- conversa + função de busca por similaridade. Embeddings: Gemini
-- text-embedding-004 (768 dimensões).
-- Rode no Supabase: SQL Editor > New query > cole tudo > Run. Idempotente.
-- ============================================================================

-- ─── Extensão de vetores ────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS vector;

-- ─── Memória RAG: pares pergunta→resposta aprendidos das conversas ───────────
CREATE TABLE IF NOT EXISTS "SITE_WhatsAppAIMemory" (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid,
  intent          text DEFAULT 'general',     -- course | sales | support | general
  question        text,                        -- pergunta/contexto do cliente
  answer          text,                        -- resposta que resolveu
  content         text NOT NULL,               -- texto combinado (usado no embedding/exibição)
  embedding       vector(768),                 -- Gemini text-embedding-004
  source          text DEFAULT 'conversation', -- conversation | knowledge | manual
  enabled         boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Índice ANN (cosine). lists=100 é ok para milhares de linhas.
CREATE INDEX IF NOT EXISTS idx_wa_ai_memory_embedding
  ON "SITE_WhatsAppAIMemory" USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

ALTER TABLE "SITE_WhatsAppAIMemory" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wa_ai_memory_all ON "SITE_WhatsAppAIMemory";
CREATE POLICY wa_ai_memory_all ON "SITE_WhatsAppAIMemory" FOR ALL USING (true) WITH CHECK (true);

-- ─── Colunas de análise por conversa (a IA "por trás") ──────────────────────
ALTER TABLE "SITE_WhatsAppCloudConversations"
  ADD COLUMN IF NOT EXISTS ai_summary          text,
  ADD COLUMN IF NOT EXISTS ai_sentiment        text,   -- positivo | neutro | negativo
  ADD COLUMN IF NOT EXISTS ai_topics           text[],
  ADD COLUMN IF NOT EXISTS ai_priority         text,   -- baixa | media | alta
  ADD COLUMN IF NOT EXISTS ai_suggested_action text,
  ADD COLUMN IF NOT EXISTS ai_last_analyzed_at timestamptz;

-- ─── Busca por similaridade (RAG retrieval) ─────────────────────────────────
CREATE OR REPLACE FUNCTION match_wa_memory(
  query_embedding vector(768),
  match_count int DEFAULT 4,
  min_similarity float DEFAULT 0.72
)
RETURNS TABLE (id uuid, content text, question text, answer text, intent text, similarity float)
LANGUAGE sql STABLE AS $$
  SELECT m.id, m.content, m.question, m.answer, m.intent,
         1 - (m.embedding <=> query_embedding) AS similarity
  FROM "SITE_WhatsAppAIMemory" m
  WHERE m.enabled
    AND m.embedding IS NOT NULL
    AND 1 - (m.embedding <=> query_embedding) > min_similarity
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_count;
$$;

NOTIFY pgrst, 'reload config';
