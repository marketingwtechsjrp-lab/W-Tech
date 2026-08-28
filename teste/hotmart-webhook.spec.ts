import { expect, test } from '@playwright/test';
import {
  automationEventKey,
  resolveHotmartIdempotencySecret,
} from '../server/edge/hotmart-webhook';
import { normalizeHotmartPayload } from '../server/edge/hotmartPayload';

const purchase = (event: string, id: string) => normalizeHotmartPayload({
  id,
  event,
  data: {
    product: { id: 8355309 },
    purchase: { transaction: 'HP1000000001' },
  },
});

const idempotencySecret = 'hottok-de-teste-com-entropia';

test.describe('Webhook Hotmart — chave idempotente da automação', () => {
  test('approved e complete da mesma transação geram uma única boas-vindas', () => {
    const approved = purchase('PURCHASE_APPROVED', 'delivery-approved');
    const complete = purchase('PURCHASE_COMPLETE', 'delivery-complete');
    expect(automationEventKey(approved, idempotencySecret)).toBe(
      automationEventKey(complete, idempotencySecret),
    );
  });

  test('ações diferentes da mesma transação continuam independentes', () => {
    const pending = purchase('PURCHASE_BILLET_PRINTED', 'delivery-pending');
    const approved = purchase('PURCHASE_APPROVED', 'delivery-approved');
    expect(automationEventKey(pending, idempotencySecret)).not.toBe(
      automationEventKey(approved, idempotencySecret),
    );
  });

  test('sem transação usa o ID estável da entrega', () => {
    const info = normalizeHotmartPayload({
      id: 'delivery-without-transaction',
      event: 'PURCHASE_APPROVED',
      data: { product: { id: 8355309 } },
    });
    const key = automationEventKey(info, idempotencySecret);
    expect(key).toMatch(/^hotmart_[a-f0-9]{40}$/);
    expect(key).not.toContain('delivery-without-transaction');
  });

  test('segredos diferentes produzem referências não correlacionáveis', () => {
    const info = purchase('PURCHASE_APPROVED', 'delivery-approved');
    expect(automationEventKey(info, 'segredo-a')).not.toBe(
      automationEventKey(info, 'segredo-b'),
    );
  });

  test('usa segredo estável independente do Hottok rotacionável', () => {
    expect(resolveHotmartIdempotencySecret('dedicado', 'site')).toBe('dedicado');
    expect(resolveHotmartIdempotencySecret('', 'site-estavel')).toBe('site-estavel');
    expect(resolveHotmartIdempotencySecret(undefined, undefined)).toBe('');

    const info = purchase('PURCHASE_APPROVED', 'delivery-approved');
    const stable = resolveHotmartIdempotencySecret('', 'site-estavel');
    expect(automationEventKey(info, stable)).toBe(automationEventKey(info, stable));
  });
});
