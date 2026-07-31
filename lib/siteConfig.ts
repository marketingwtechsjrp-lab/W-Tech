import { supabase } from './supabaseClient';

/**
 * Chaves de segredo cuja LEITURA anônima é bloqueada por RLS
 * (policy "deny_anon_read_server_secrets" — migração 2026-07-04).
 * Como o admin não consegue lê-las, os campos do formulário carregam vazios;
 * para não sobrescrever um segredo real com string vazia ao "Salvar",
 * entradas dessas chaves com valor vazio são DESCARTADAS na gravação.
 * (Para limpar um segredo de propósito, faça pelo SQL Editor do Supabase.)
 */
export const SECRET_CONFIG_KEYS = new Set([
    'stripe_api_key',
    'stripe_api_key_live',
    'stripe_api_key_test',
    'stripe_webhook_secret',
    'mercadopago_access_token',
    'whatsapp_cloud_app_secret',
    'whatsapp_cloud_access_token',
    'whatsapp_cloud_webhook_verify_token',
    'brevo_smtp_key',
    'brevo_smtp_login',
    // 'evolution_api_key' fica FORA do lock até a Fase 3 (fluxos de QR do admin
    // leem a chave no navegador) — ver migrations/2026-07-15_unlock_evolution_api_key_read.sql
    'kiwify_client_secret',
    'kiwify_client_id',
    'ai_group_webhook_token',
]);

export interface ConfigEntry {
    key: string;
    value: string;
}

/**
 * Recusa do servidor a chaves que só podem ser definidas lá ("Chave protegida
 * não pode ser gravada por aqui: a, b, c."). O grupo captura a lista de chaves.
 */
const PROTECTED_KEYS_ERROR = /chave protegida[^:]*:\s*([^.]+)/i;

/**
 * Grava chaves na SITE_Config via RPC `upsert_site_config` (SECURITY DEFINER).
 *
 * Por que não upsert direto na tabela: o INSERT ... ON CONFLICT DO UPDATE do
 * supabase-js lê colunas (EXCLUDED.*), o que faz o Postgres aplicar as policies
 * de SELECT à linha atualizada — e as chaves secretas são invisíveis para anon,
 * então o upsert delas falha com 42501 (migração 2026-07-15). A função roda
 * como owner e ignora o RLS apenas na escrita; a leitura continua bloqueada.
 *
 * Devolve as chaves que o servidor recusou (ver abaixo); lança em qualquer outra
 * falha (o chamador decide como exibir).
 */
export async function upsertSiteConfig(entries: ConfigEntry[] | ConfigEntry): Promise<string[]> {
    const list = (Array.isArray(entries) ? entries : [entries])
        .filter(e => e.key && !(SECRET_CONFIG_KEYS.has(e.key) && !String(e.value ?? '').trim()));
    if (list.length === 0) return [];

    const { error } = await supabase.rpc('upsert_site_config', { entries: list });
    if (!error) return [];

    // O servidor tem a própria lista de chaves que não aceita do navegador, e
    // aborta o LOTE INTEIRO quando uma delas aparece — uma chave recusada
    // impedia de salvar todo o resto da aba. Aqui lemos as recusadas da própria
    // mensagem do servidor, em vez de manter uma cópia da lista dele (foi essa
    // duplicação que saiu de sincronia), e regravamos o que sobrou.
    const refusedMatch = PROTECTED_KEYS_ERROR.exec(error.message || '');
    if (!refusedMatch) throw error;

    const refused = new Set(
        refusedMatch[1].split(',').map(k => k.trim()).filter(Boolean)
    );
    const allowed = list.filter(e => !refused.has(e.key));
    if (allowed.length > 0) {
        const { error: retryError } = await supabase.rpc('upsert_site_config', { entries: allowed });
        if (retryError) throw retryError;
    }
    return [...refused];
}
