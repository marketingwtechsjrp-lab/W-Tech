import { expect, test } from '@playwright/test';
import {
  HOTMART_CHECKOUT_FALLBACK_URL,
  KIWIFY_CHECKOUT_URL,
  getCheckoutUrl,
  getCoursePrice,
  normalizeHotmartCheckoutUrl,
} from '../lib/coursePricing';

const HOTMART = 'https://pay.hotmart.com/Q107251292B?off=l2pjqk7m';
const LEGACY_ANNUAL_HOTMART = 'https://pay.hotmart.com/Q107251292B';

test.describe('Checkout internacional do curso', () => {
  test('aceita apenas links oficiais e seguros da Hotmart', () => {
    expect(normalizeHotmartCheckoutUrl(HOTMART)).toBe(HOTMART);
    expect(normalizeHotmartCheckoutUrl('https://go.hotmart.com/Q107251292B?dp=1'))
      .toBe('https://go.hotmart.com/Q107251292B?dp=1');

    expect(normalizeHotmartCheckoutUrl('http://pay.hotmart.com/Q107251292B')).toBeNull();
    expect(normalizeHotmartCheckoutUrl('https://pay.hotmart.com.evil.test/Q107251292B')).toBeNull();
    expect(normalizeHotmartCheckoutUrl('https://user:secret@pay.hotmart.com/Q107251292B')).toBeNull();
    expect(normalizeHotmartCheckoutUrl('https://pay.hotmart.com:8443/Q107251292B')).toBeNull();
    expect(normalizeHotmartCheckoutUrl('https://pay.hotmart.com/#Q107251292B')).toBeNull();
    expect(normalizeHotmartCheckoutUrl('')).toBeNull();
  });

  test('mantém Kiwify no Brasil e nunca desvia o internacional da Hotmart', () => {
    expect(getCheckoutUrl('br', HOTMART)).toBe(KIWIFY_CHECKOUT_URL);
    expect(getCheckoutUrl('intl')).toBe(HOTMART_CHECKOUT_FALLBACK_URL);
    expect(getCheckoutUrl('intl', 'https://checkout.example.com/oferta'))
      .toBe(HOTMART_CHECKOUT_FALLBACK_URL);
    expect(getCheckoutUrl('intl', LEGACY_ANNUAL_HOTMART))
      .toBe(HOTMART_CHECKOUT_FALLBACK_URL);
    expect(getCheckoutUrl('intl', HOTMART)).toBe(HOTMART);
  });

  test('mostra 59 euros como pagamento único em todos os idiomas internacionais', () => {
    const br = getCoursePrice('br', 'pt-BR', HOTMART);
    expect(br.currency).toBe('BRL');
    expect(br.chargedNotice).toBeNull();

    for (const language of ['pt-BR', 'pt-PT', 'es', 'en'] as const) {
      const international = getCoursePrice('intl', language);
      expect(international.currency).toBe('EUR');
      expect(international.full).toBe('59 €');
      expect(international.installmentsShort).toBe('59 €');
      expect(international.installments).not.toMatch(/12x|parcela/i);
      expect(international.cashLabel).toMatch(/único|one-time/i);
      expect(international.schemaCurrency).toBe('EUR');
      expect(international.schemaPrice).toBe('59.00');
      expect(international.chargedNotice).toBeNull();
    }
  });
});
