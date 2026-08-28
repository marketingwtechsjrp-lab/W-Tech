import { expect, test } from '@playwright/test';
import {
  KIWIFY_CHECKOUT_URL,
  getCheckoutUrl,
  getCoursePrice,
  normalizeHotmartCheckoutUrl,
} from '../lib/coursePricing';

const HOTMART = 'https://pay.hotmart.com/Q107251292B';

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

  test('mantém Kiwify no Brasil e usa Hotmart somente no internacional configurado', () => {
    expect(getCheckoutUrl('br', HOTMART)).toBe(KIWIFY_CHECKOUT_URL);
    expect(getCheckoutUrl('intl')).toBe(KIWIFY_CHECKOUT_URL);
    expect(getCheckoutUrl('intl', HOTMART)).toBe(HOTMART);
  });

  test('preço, moeda estruturada e aviso acompanham o mesmo checkout', () => {
    const br = getCoursePrice('br', 'pt-BR', HOTMART);
    expect(br.currency).toBe('BRL');
    expect(br.chargedNotice).toBeNull();

    const intlFallback = getCoursePrice('intl', 'en');
    expect(intlFallback.schemaCurrency).toBe('BRL');
    expect(intlFallback.chargedNotice).not.toBeNull();

    const intlHotmart = getCoursePrice('intl', 'en', HOTMART);
    expect(intlHotmart.schemaCurrency).toBe('EUR');
    expect(intlHotmart.schemaPrice).toBe('59.00');
    expect(intlHotmart.chargedNotice).toBeNull();
  });
});
