import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

/**
 * Prova de aceite do CONTRATO das RPCs da migration 0092
 * (site_email_claim / site_email_claim_concluir), direto contra o Supabase
 * real via service_role — sem passar pelo SMTP nem pelo endpoint HTTP, pra
 * isolar exatamente o comportamento de concorrência/lease que o P0 original
 * cobrava: "SMTP confirmou, persistência falhou" não pode duplicar envio.
 *
 * Requer VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY no ambiente (mesmas
 * envs que api/jobs.ts usa em produção). Se as RPCs ainda não existirem no
 * projeto conectado (schema cache do PostgREST sem elas), os testes falham
 * com um erro claro (PGRST202) em vez de um falso-positivo — isso É a prova
 * de que a migration ainda não chegou neste ambiente.
 */
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

test.describe('migration 0092 — site_email_claim / site_email_claim_concluir (contrato de concorrência)', () => {
  test.skip(!SUPABASE_URL || !SERVICE_KEY, 'VITE_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY ausentes no ambiente de teste.');

  const supabase = SUPABASE_URL && SERVICE_KEY ? createClient(SUPABASE_URL, SERVICE_KEY) : null;

  function testKey(suffix: string): string {
    return `rh:test-e2e-${suffix}-${randomSuffix()}`;
  }
  function randomSuffix(): string {
    return Math.random().toString(36).slice(2, 10);
  }

  test('1ª claim numa chave nova → ganhou; 2ª claim na mesma chave, lease ainda viva (sem concluir) → em_processamento (não reenvia)', async () => {
    const key = testKey('lease-viva');
    const { data: first, error: e1 } = await supabase!.rpc('site_email_claim', { p_chave: key });
    expect(e1).toBeNull();
    const firstRow = Array.isArray(first) ? first[0] : first;
    expect(firstRow?.resultado).toBe('ganhou');

    // Simula "SMTP confirmou, persistência (concluir) falhou/não rodou" —
    // nunca chama site_email_claim_concluir. A PRÓXIMA claim, com o lease
    // ainda dentro do TTL, não pode liberar um novo envio.
    const { data: second, error: e2 } = await supabase!.rpc('site_email_claim', { p_chave: key });
    expect(e2).toBeNull();
    const secondRow = Array.isArray(second) ? second[0] : second;
    expect(secondRow?.resultado).toBe('em_processamento');
  });

  test('claim → concluir(sent) → nova claim na mesma chave → concluido (nunca mais reenvia, mesmo sem TTL vencer)', async () => {
    const key = testKey('concluido');
    const { data: first } = await supabase!.rpc('site_email_claim', { p_chave: key });
    const firstRow = Array.isArray(first) ? first[0] : first;
    expect(firstRow?.resultado).toBe('ganhou');

    const { data: concluded, error: concludeError } = await supabase!.rpc('site_email_claim_concluir', {
      p_claim_id: firstRow.claim_id,
      p_claim_versao: firstRow.claim_versao,
      p_status: 'sent',
    });
    expect(concludeError).toBeNull();
    expect(concluded).toBe(true);

    const { data: second } = await supabase!.rpc('site_email_claim', { p_chave: key });
    const secondRow = Array.isArray(second) ? second[0] : second;
    expect(secondRow?.resultado).toBe('concluido');
  });

  test('claim → concluir(failed) → nova claim na mesma chave → ganhou de novo (retry imediato, sem esperar TTL)', async () => {
    const key = testKey('failed-retry');
    const { data: first } = await supabase!.rpc('site_email_claim', { p_chave: key });
    const firstRow = Array.isArray(first) ? first[0] : first;
    expect(firstRow?.resultado).toBe('ganhou');

    const { data: concluded, error: concludeError } = await supabase!.rpc('site_email_claim_concluir', {
      p_claim_id: firstRow.claim_id,
      p_claim_versao: firstRow.claim_versao,
      p_status: 'failed',
      p_erro: 'falha simulada pelo teste',
    });
    expect(concludeError).toBeNull();
    expect(concluded).toBe(true);

    const { data: second } = await supabase!.rpc('site_email_claim', { p_chave: key });
    const secondRow = Array.isArray(second) ? second[0] : second;
    expect(secondRow?.resultado).toBe('ganhou');
  });

  test('concluir com claim_versao errada (fencing) → false, não erro — outro processo já retomou o lease', async () => {
    const key = testKey('fencing');
    const { data: first } = await supabase!.rpc('site_email_claim', { p_chave: key });
    const firstRow = Array.isArray(first) ? first[0] : first;
    expect(firstRow?.resultado).toBe('ganhou');

    const { data: concluded, error: concludeError } = await supabase!.rpc('site_email_claim_concluir', {
      p_claim_id: firstRow.claim_id,
      p_claim_versao: firstRow.claim_versao + 999, // versão errada — simula fencing perdido
      p_status: 'sent',
    });
    expect(concludeError).toBeNull();
    expect(concluded).toBe(false);
  });

  test('chave vazia → erro WT1D2', async () => {
    const { error } = await supabase!.rpc('site_email_claim', { p_chave: '' });
    expect(error).not.toBeNull();
  });
});
