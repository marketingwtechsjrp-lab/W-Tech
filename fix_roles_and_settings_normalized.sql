-- DIAGAGNÓSTICO FINAL: Desabilitar RLS Temporariamente
-- Se isso funcionar, CONFIRMAMOS que é 100% RLS.
-- Se falhar, é erro de cliente (Unique constraint, tipo de dado, etc)

ALTER TABLE "public"."SITE_SystemSettings" DISABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload config';
