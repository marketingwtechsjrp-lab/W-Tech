import { createClient } from '@supabase/supabase-js';
import { createStaffDbTokenSource } from './staffDbToken';

// Sem fallback: um default silencioso aqui já apontou o site para o banco errado e
// dividiu leads e matrículas entre duas instâncias Supabase (14/08/2026). O build
// (vite.config.ts) barra a ausência dessas variáveis; este guarda é a segunda trava.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        'Supabase não configurado: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY ausentes no bundle. ' +
        'Rebuild passando as variáveis — sem elas não há banco para gravar.'
    );
}

// No painel, o banco recebe o passe da equipe (lib/staffDbToken.ts); no resto do
// site, a chave anônima. Com `accessToken`, `supabase.auth.*` deixa de existir —
// e não é usado: a sessão do painel é o cookie httpOnly de /api/staff.
const staffDbToken = createStaffDbTokenSource({
    fetch: (input, init) => fetch(input, init),
    now: () => Date.now(),
    inAdminArea: () => typeof window !== 'undefined' && window.location.pathname.startsWith('/admin'),
});

export const resetStaffDbToken = staffDbToken.reset;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, { accessToken: staffDbToken.getToken });
