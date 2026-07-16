import { createClient } from '@supabase/supabase-js';

// URL e chave SEMPRE vêm das envs de build (VITE_*) — banco PostgreSQL na VPS.
// Sem fallback: build sem env é erro de configuração, não silêncio.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórias no build (.env)');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);