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
    'mercadopago_access_token',
    'whatsapp_cloud_app_secret',
    'whatsapp_cloud_access_token',
    'whatsapp_cloud_webhook_verify_token',
    'brevo_smtp_key',
    'brevo_smtp_login',
    'evolution_api_key',
    'kiwify_client_secret',
    'kiwify_client_id',
    'ai_group_webhook_token',
]);

export interface ConfigEntry {
    key: string;
    value: string;
}

/**
 * Grava chaves na SITE_Config via RPC `upsert_site_config` (SECURITY DEFINER).
 *
 * Por que não upsert direto na tabela: o INSERT ... ON CONFLICT DO UPDATE do
 * supabase-js lê colunas (EXCLUDED.*), o que faz o Postgres aplicar as policies
 * de SELECT à linha atualizada — e as chaves secretas são invisíveis para anon,
 * então o upsert delas falha com 42501 (migração 2026-07-15). A função roda
 * como owner e ignora o RLS apenas na escrita; a leitura continua bloqueada.
 *
 * Lança erro em falha (o chamador decide como exibir).
 */
export async function upsertSiteConfig(entries: ConfigEntry[] | ConfigEntry): Promise<void> {
    const list = (Array.isArray(entries) ? entries : [entries])
        .filter(e => e.key && !(SECRET_CONFIG_KEYS.has(e.key) && !String(e.value ?? '').trim()));
    if (list.length === 0) return;
    const { error } = await supabase.rpc('upsert_site_config', { entries: list });
    if (error) throw error;
}
