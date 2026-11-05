-- Matriz de acesso por papel: quem lê e grava cada tabela de public, com o efeito real.
-- Só devolve contagens, nunca valores. Não grava: leitura com count(*), UPDATE e DELETE
-- com WHERE false, e INSERT pela combinação de privilégio e policy (um INSERT de verdade
-- dispararia gatilhos com efeito fora da transação).
--
-- Legenda:
--   número     SELECT funcionou, com esse tanto de linhas
--   NEGADO     sem privilégio na tabela (o PostgREST responde 401)
--   ok         a gravação passaria
--   BLOQ_RLS   tem privilégio, mas nenhuma policy deixa (0 linhas, sem erro)
--   ERRO:xxx   a consulta quebra com esse SQLSTATE. Em policy velha que lê auth.users
--              aparece como 42501 em quem tem privilégio: é o caso a procurar antes de
--              ligar RLS numa tabela
--
-- Rodar no estado atual:
--   docker exec -i $(docker ps -qf name=wtechdb_supadb) psql -U supabase_admin -d postgres -At -F '|' < scripts/rls-matriz.sql
--
-- Rodar com uma migração sem gravar: tire BEGIN/COMMIT dela, envolva em BEGIN; ... ROLLBACK;
-- e inclua este arquivo antes do ROLLBACK.

CREATE TEMP TABLE IF NOT EXISTS _matriz (papel text, tabela text, sel text, ins text, upd text, del text);
TRUNCATE _matriz;

DO $matriz$
DECLARE
    papel text;
    t record;
    coluna text;
    v_sel text;
    v_ins text;
    v_upd text;
    v_del text;
    codigo text;
    ignora_rls boolean;
BEGIN
    FOREACH papel IN ARRAY ARRAY['anon', 'authenticated', 'hermes_ro', 'service_role', 'gestao_app'] LOOP
        SELECT rolbypassrls INTO ignora_rls FROM pg_roles WHERE rolname = papel;

        FOR t IN
            SELECT c.oid, c.relname, c.relkind, c.relrowsecurity AS rls
            FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'v', 'm')
            ORDER BY c.relname
        LOOP
            -- Leitura: count(*) precisa de SELECT em pelo menos uma coluna.
            BEGIN
                EXECUTE format('SET LOCAL ROLE %I', papel);
                EXECUTE format('SELECT count(*)::text FROM public.%I', t.relname) INTO v_sel;
                RESET ROLE;
            EXCEPTION WHEN insufficient_privilege THEN
                RESET ROLE;
                v_sel := CASE WHEN has_any_column_privilege(papel, t.oid, 'SELECT') THEN 'ERRO:42501' ELSE 'NEGADO' END;
            WHEN OTHERS THEN
                GET STACKED DIAGNOSTICS codigo = RETURNED_SQLSTATE;
                RESET ROLE;
                v_sel := 'ERRO:' || codigo;
            END;

            -- INSERT: só pelo catálogo.
            IF NOT has_any_column_privilege(papel, t.oid, 'INSERT') THEN
                v_ins := 'NEGADO';
            ELSIF t.relkind IN ('v', 'm') OR NOT t.rls OR ignora_rls OR EXISTS (
                SELECT 1 FROM pg_policy p
                WHERE p.polrelid = t.oid AND p.polpermissive AND p.polcmd IN ('a', '*')
                  AND (p.polroles = '{0}' OR papel::regrole::oid = ANY (p.polroles))
            ) THEN
                v_ins := 'ok';
            ELSE
                v_ins := 'BLOQ_RLS';
            END IF;

            -- UPDATE e DELETE: privilégio + policy, e a consulta real com WHERE false para
            -- pegar policy que quebra ao ser avaliada.
            SELECT a.attname INTO coluna FROM pg_attribute a
            WHERE a.attrelid = t.oid AND a.attnum > 0 AND NOT a.attisdropped AND a.attgenerated = ''
            ORDER BY a.attnum LIMIT 1;

            IF t.relkind IN ('v', 'm') THEN
                v_upd := CASE WHEN has_table_privilege(papel, t.oid, 'UPDATE') THEN 'visao' ELSE 'NEGADO' END;
                v_del := CASE WHEN has_table_privilege(papel, t.oid, 'DELETE') THEN 'visao' ELSE 'NEGADO' END;
            ELSE
                IF NOT has_any_column_privilege(papel, t.oid, 'UPDATE') THEN
                    v_upd := 'NEGADO';
                ELSIF t.rls AND NOT ignora_rls AND NOT EXISTS (
                    SELECT 1 FROM pg_policy p
                    WHERE p.polrelid = t.oid AND p.polpermissive AND p.polcmd IN ('w', '*')
                      AND (p.polroles = '{0}' OR papel::regrole::oid = ANY (p.polroles))
                ) THEN
                    v_upd := 'BLOQ_RLS';
                ELSE
                    BEGIN
                        EXECUTE format('SET LOCAL ROLE %I', papel);
                        EXECUTE format('UPDATE public.%I SET %I = %I WHERE false', t.relname, coluna, coluna);
                        RESET ROLE;
                        v_upd := 'ok';
                    EXCEPTION WHEN OTHERS THEN
                        GET STACKED DIAGNOSTICS codigo = RETURNED_SQLSTATE;
                        RESET ROLE;
                        v_upd := 'ERRO:' || codigo;
                    END;
                END IF;

                IF NOT has_table_privilege(papel, t.oid, 'DELETE') THEN
                    v_del := 'NEGADO';
                ELSIF t.rls AND NOT ignora_rls AND NOT EXISTS (
                    SELECT 1 FROM pg_policy p
                    WHERE p.polrelid = t.oid AND p.polpermissive AND p.polcmd IN ('d', '*')
                      AND (p.polroles = '{0}' OR papel::regrole::oid = ANY (p.polroles))
                ) THEN
                    v_del := 'BLOQ_RLS';
                ELSE
                    BEGIN
                        EXECUTE format('SET LOCAL ROLE %I', papel);
                        EXECUTE format('DELETE FROM public.%I WHERE false', t.relname);
                        RESET ROLE;
                        v_del := 'ok';
                    EXCEPTION WHEN OTHERS THEN
                        GET STACKED DIAGNOSTICS codigo = RETURNED_SQLSTATE;
                        RESET ROLE;
                        v_del := 'ERRO:' || codigo;
                    END;
                END IF;
            END IF;

            INSERT INTO _matriz VALUES (papel, t.relname, v_sel, v_ins, v_upd, v_del);
        END LOOP;
    END LOOP;
END
$matriz$;

SELECT papel, tabela, sel, ins, upd, del FROM _matriz ORDER BY tabela, papel;
