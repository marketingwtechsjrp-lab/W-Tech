import { expect, test } from '@playwright/test';
import {
    localeForHotmartCountry,
    mapHotmartAction,
    matchesHotmartProduct,
    normalizeHotmartPayload,
} from '../server/edge/hotmartPayload';

test.describe('normalização de payloads Hotmart', () => {
    test('normaliza compra aprovada v2 e combina DDD + telefone brasileiro', () => {
        const result = normalizeHotmartPayload({
            id: 'evt-purchase-001',
            event: 'PURCHASE_APPROVED',
            version: '2.0.0',
            data: {
                product: {
                    id: 1234567,
                    ucode: 'ucode-suspensao',
                    name: 'Regulagem de Suspensão',
                },
                buyer: {
                    name: 'Ana Maria da Silva',
                    first_name: 'Ana',
                    checkout_phone_code: '11',
                    checkout_phone: '98765-4321',
                },
                purchase: {
                    transaction: 'HP123456789',
                    status: 'APPROVED',
                    offer: { code: 'oferta-europa' },
                    checkout_country: { iso: 'BR' },
                    checkout_url: 'https://pay.hotmart.com/checkout-001',
                },
            },
        });

        expect(result).toEqual({
            event: 'PURCHASE_APPROVED',
            eventId: 'evt-purchase-001',
            action: 'approved',
            transaction: 'HP123456789',
            productId: '1234567',
            productUcode: 'ucode-suspensao',
            productName: 'Regulagem de Suspensão',
            firstName: 'Ana',
            phone: '11987654321',
            country: 'BR',
            locale: 'pt',
            offerCode: 'oferta-europa',
            checkoutUrl: 'https://pay.hotmart.com/checkout-001',
        });
    });

    test('normaliza carrinho abandonado v2 nos caminhos próprios desse evento', () => {
        const result = normalizeHotmartPayload({
            id: 'evt-cart-001',
            event: 'PURCHASE_OUT_OF_SHOPPING_CART',
            version: '2.0.0',
            data: {
                product: {
                    id: 7654321,
                    ucode: 'suspension-setup',
                    name: 'Suspension Setup',
                },
                buyer: {
                    name: 'María López',
                    phone: '+34 612 345 678',
                },
                offer: { code: 'ES-59' },
                checkout_country: { iso: 'ES' },
                checkout_url: 'https://pay.hotmart.com/cart-001',
            },
        });

        expect(result.event).toBe('PURCHASE_OUT_OF_SHOPPING_CART');
        expect(result.action).toBe('cart');
        expect(result.eventId).toBe('evt-cart-001');
        expect(result.transaction).toBe('');
        expect(result.productId).toBe('7654321');
        expect(result.productUcode).toBe('suspension-setup');
        expect(result.firstName).toBe('María');
        expect(result.phone).toBe('+34612345678');
        expect(result.country).toBe('ES');
        expect(result.locale).toBe('es');
        expect(result.offerCode).toBe('ES-59');
        expect(result.checkoutUrl).toBe('https://pay.hotmart.com/cart-001');
    });

    test('mantém compatibilidade defensiva com payload plano v1', () => {
        const payload = {
            status: 'approved',
            transaction: 'legacy-transaction-1',
            prod: '321',
            prod_ucode: 'legacy-ucode',
            prod_name: 'Curso legado',
            name: 'João Pedro',
            phone_local_code: '21',
            phone_number: '99876-5432',
            checkout_country: 'BR',
            off: 'LEGACY-OFFER',
            checkout_url: 'https://pay.hotmart.com/legacy',
            email: 'comprador@example.com',
            creation_date: '2026-08-28T10:00:00Z',
        };

        const first = normalizeHotmartPayload(payload);
        const retry = normalizeHotmartPayload(structuredClone(payload));

        expect(first.event).toBe('APPROVED');
        expect(first.action).toBe('approved');
        expect(first.transaction).toBe('legacy-transaction-1');
        expect(first.productId).toBe('321');
        expect(first.productUcode).toBe('legacy-ucode');
        expect(first.productName).toBe('Curso legado');
        expect(first.firstName).toBe('João');
        expect(first.phone).toBe('21998765432');
        expect(first.country).toBe('BR');
        expect(first.locale).toBe('pt');
        expect(first.offerCode).toBe('LEGACY-OFFER');
        expect(first.checkoutUrl).toBe('https://pay.hotmart.com/legacy');
        expect(first.eventId).toBe(retry.eventId);
        expect(first.eventId).toMatch(/^hotmart_[a-f0-9]{40}$/);
        expect(first.eventId).not.toContain('comprador');
        expect(first.eventId).not.toContain('21998765432');
    });

    test('aceita os nomes oficiais de telefone e país do purchase webhook v1', () => {
        const result = normalizeHotmartPayload({
            hottok: 'valor-nao-usado-pelo-normalizador',
            status: 'approved',
            transaction: 'legacy-official-1',
            prod: 8355309,
            name: 'Carlos Silva',
            phone_checkout_local_code: '31',
            phone_checkout_number: '99876-5432',
            address_country_ISO: 'BR',
        });

        expect(result.phone).toBe('31998765432');
        expect(result.country).toBe('BR');
        expect(result.locale).toBe('pt');
        expect(result.productId).toBe('8355309');
    });

    test('preserva DDI explícito sem país e recusa v1 internacional local ambíguo', () => {
        const explicit = normalizeHotmartPayload({
            status: 'approved',
            prod: 8355309,
            phone_checkout_number: '+351 912 345 678',
        });
        expect(explicit.phone).toBe('+351912345678');

        const ambiguous = normalizeHotmartPayload({
            status: 'approved',
            prod: 8355309,
            phone_checkout_local_code: '21',
            phone_checkout_number: '912 345 678',
            address_country_ISO: 'PT',
        });
        expect(ambiguous.phone).toBe('');
    });

    test('normaliza nomes comuns de países europeus para o ISO usado no DDI', () => {
        const result = normalizeHotmartPayload({
            event: 'PURCHASE_APPROVED',
            data: {
                buyer: { checkout_phone: '4915123456789', address: { country: 'Germany' } },
                product: { id: 8355309 },
            },
        });
        expect(result.country).toBe('DE');
        expect(result.phone).toBe('4915123456789');
    });

    test('classifica pendência e ignora eventos sem automação', () => {
        expect(mapHotmartAction('PURCHASE_BILLET_PRINTED')).toBe('pending');
        expect(mapHotmartAction('purchase delayed')).toBe('pending');
        expect(mapHotmartAction('WAITING_PAYMENT')).toBe('pending');
        expect(mapHotmartAction('PURCHASE_COMPLETE')).toBe('approved');
        expect(mapHotmartAction('CART-ABANDONED')).toBe('cart');
        expect(mapHotmartAction('PURCHASE_REFUNDED')).toBe('ignored');
        expect(mapHotmartAction('')).toBe('ignored');
    });

    test('resolve locale PT/ES/EN pelo país', () => {
        expect(localeForHotmartCountry('Portugal')).toBe('pt');
        expect(localeForHotmartCountry('MX')).toBe('es');
        expect(localeForHotmartCountry('US')).toBe('en');
        expect(localeForHotmartCountry('')).toBe('en');
    });

    test('product matching é exato por ID ou ucode, nunca por substring/nome', () => {
        const product = normalizeHotmartPayload({
            event: 'PURCHASE_APPROVED',
            data: {
                product: {
                    id: 1234567,
                    ucode: 'Suspension-UCode',
                    name: 'Regulagem de Suspensão',
                },
            },
        });

        expect(matchesHotmartProduct(product, '1234567')).toBe(true);
        expect(matchesHotmartProduct(product, 'Suspension-UCode')).toBe(true);
        expect(matchesHotmartProduct(product, { id: 1234567 })).toBe(true);
        expect(matchesHotmartProduct(product, {
            id: 1234567,
            ucode: 'Suspension-UCode',
        })).toBe(true);
        expect(matchesHotmartProduct(product, '123')).toBe(false);
        expect(matchesHotmartProduct(product, 'suspension-ucode')).toBe(false);
        expect(matchesHotmartProduct(product, 'Regulagem de Suspensão')).toBe(false);
        expect(matchesHotmartProduct(product, {
            id: 1234567,
            ucode: 'outro-ucode',
        })).toBe(false);
        expect(matchesHotmartProduct(product, {})).toBe(false);
    });
});
