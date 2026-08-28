import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import {
  AI_GROUP_SITE_CONFIG_KEYS,
  GLOBAL_SITE_CONFIG_KEYS,
} from '../server/staffConfig.js';

const migrationUrl = new URL(
  '../migrations/2026-08-28_secure_hotmart_automation.sql',
  import.meta.url,
);
const sql = readFileSync(migrationUrl, 'utf8');

test.describe('Migration segura da automação Hotmart', () => {
  test('persiste apenas referências pseudonimizadas e o recibo do provedor', () => {
    expect(sql).toContain('transaction_ref_hash text');
    expect(sql).toContain('provider_message_id text');
    expect(sql).toContain("'submitted'");
    expect(sql).toContain("'delivery_unknown'");
    expect(sql).toContain('DROP COLUMN IF EXISTS transaction_id');
    expect(sql).not.toMatch(/\btransaction_id\s+text\b/i);
  });

  test('bloqueia RPC e tabelas sensíveis para clientes', () => {
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.upsert_site_config\(jsonb\)[\s\S]*FROM PUBLIC, anon, authenticated;/);
    expect(sql).toMatch(/SITE_Hotmart_Webhook_Events[\s\S]*FORCE ROW LEVEL SECURITY/);
    expect(sql).toMatch(/SITE_UserIntegrations[\s\S]*FORCE ROW LEVEL SECURITY/);
    expect(sql).toContain("'wa_atendentes_webhook_token'");
  });

  test('protege todas as chaves gerenciadas pelas rotas staff', () => {
    expect(sql).toContain('site_config_key_is_server_managed');
    for (const key of [...GLOBAL_SITE_CONFIG_KEYS, ...AI_GROUP_SITE_CONFIG_KEYS]) {
      expect(sql, `chave sem proteção direta: ${key}`).toContain(`'${key}'`);
    }
    for (const key of [
      'ai_group_webhook_token',
      'evolution_api_url',
      'evolution_api_key',
      'wa_instance_curso_online',
      'hotmart_webhook_token',
    ]) {
      expect(sql, `segredo operacional sem proteção: ${key}`).toContain(`'${key}'`);
    }
  });
});
