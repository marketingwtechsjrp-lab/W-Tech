-- ============================================================================
-- Chat de IA da Gerência — passa a usar o OpenRouter (chave já configurada em
-- Configurações → GPT & Gemini) em vez de exigir uma conta nova na Anthropic.
--
-- MOTIVO
-- A W-Tech já paga OpenRouter e a chave já está em SITE_SystemSettings. Pelo
-- OpenRouter o Claude sai pelo mesmo preço do acesso direto — e o Sonnet 5 sai
-- MAIS BARATO (US$ 2/US$ 10 por milhão, contra US$ 3/US$ 15 na Anthropic).
-- Verificado ao vivo em 26/08/2026 na API do OpenRouter, filtrando modelos com
-- suporte a `tools` (sem tool calling o chat não consulta o banco e inventa).
--
-- DUAS MUDANÇAS
--   1. Coluna de custo REAL. O OpenRouter devolve `usage.cost` em dólar a cada
--      chamada. Guardar esse número é melhor que estimar por tabela de preço:
--      a tabela envelhece, este valor vem da fatura.
--   2. O ID do modelo muda de formato: 'claude-opus-5' (API direta) passa a ser
--      'anthropic/claude-opus-5' (OpenRouter). Sem isto o OpenRouter responde
--      404 de modelo e o chat quebra na primeira pergunta.
-- ============================================================================

BEGIN;

-- ── 1. Custo real por resposta ──────────────────────────────────────────────
ALTER TABLE "SITE_ManagerChatMessages"
    ADD COLUMN IF NOT EXISTS cost_usd numeric(12, 6);

COMMENT ON COLUMN "SITE_ManagerChatMessages".cost_usd IS
    'Custo real desta resposta em USD, vindo de usage.cost do OpenRouter. NULL quando o provedor não informa (ex.: chamada direta à Anthropic).';

-- ── 2. Prefixo do provedor no ID do modelo ──────────────────────────────────
-- Idempotente: só toca as linhas que ainda estão no formato da API direta.
UPDATE "SITE_ManagerChatConfig"
SET model = 'anthropic/' || model
WHERE model IS NOT NULL
  AND model <> ''
  AND model NOT LIKE '%/%';

COMMIT;

NOTIFY pgrst, 'reload schema';

-- Conferência:
-- SELECT model, effort, max_tokens, enabled FROM "SITE_ManagerChatConfig";
-- SELECT column_name FROM information_schema.columns
--  WHERE table_name = 'SITE_ManagerChatMessages' AND column_name = 'cost_usd';
