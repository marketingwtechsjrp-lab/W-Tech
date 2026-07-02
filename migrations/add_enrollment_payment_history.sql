-- ============================================================================
-- Histórico de Pagamentos por Inscrição (botão "Histórico" na lista de alunos)
-- ============================================================================
-- Vincula cada transação financeira à inscrição do aluno, permitindo montar a
-- linha do tempo de pagamentos (entrada → quitação) com data e forma de
-- pagamento de cada parcela.
--
-- CONTEXTO: o painel (Quitar Saldo / Conciliação Stripe) e a edge function do
-- Stripe já tentavam gravar enrollment_id — mas a coluna nunca existiu, então
-- esses inserts falhavam em silêncio. Esta migração cria a coluna; o código
-- (v3.14.0) grava com fallback, funcionando antes e depois dela.
--
-- Rodar no Supabase: SQL Editor → colar → Run.

ALTER TABLE "SITE_Transactions"
    ADD COLUMN IF NOT EXISTS "enrollment_id" UUID;

COMMENT ON COLUMN "SITE_Transactions"."enrollment_id"
    IS 'Inscrição (SITE_Enrollments.id) que originou o pagamento — usado pelo histórico de pagamentos do aluno';

CREATE INDEX IF NOT EXISTS "idx_site_transactions_enrollment"
    ON "SITE_Transactions" ("enrollment_id");
