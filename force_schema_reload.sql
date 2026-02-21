
-- Dummy migration to force schema cache reload
CREATE OR REPLACE VIEW view_force_reload AS SELECT 1 as id;
DROP VIEW view_force_reload;

NOTIFY pgrst, 'reload config';
