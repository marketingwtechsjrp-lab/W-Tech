import { createHash } from 'node:crypto';

export type HotmartAction = 'approved' | 'cart' | 'pending' | 'ignored';
export type HotmartLocale = 'pt' | 'es' | 'en';

export interface NormalizedHotmartPayload {
    event: string;
    eventId: string;
    action: HotmartAction;
    transaction: string;
    productId: string;
    productUcode: string;
    productName: string;
    firstName: string;
    phone: string;
    country: string;
    locale: HotmartLocale;
    offerCode: string;
    checkoutUrl: string;
}

export interface HotmartProductExpectation {
    id?: string | number;
    ucode?: string;
}

type UnknownRecord = Record<string, unknown>;

const APPROVED_EVENTS = new Set([
    'PURCHASE_APPROVED',
    'PURCHASE_COMPLETE',
    'APPROVED',
    'COMPLETE',
    'COMPLETED',
]);

const CART_EVENTS = new Set([
    'PURCHASE_OUT_OF_SHOPPING_CART',
    'CART_ABANDONED',
    'OUT_OF_SHOPPING_CART',
]);

const PENDING_EVENTS = new Set([
    'PURCHASE_BILLET_PRINTED',
    'PURCHASE_DELAYED',
    'WAITING_PAYMENT',
    'BILLET_PRINTED',
    'DELAYED',
    'PENDING',
]);

const PORTUGUESE_COUNTRIES = new Set([
    'AO', 'BR', 'CV', 'GW', 'MZ', 'PT', 'ST', 'TL',
]);

const SPANISH_COUNTRIES = new Set([
    'AR', 'BO', 'CL', 'CO', 'CR', 'CU', 'DO', 'EC', 'ES', 'GQ',
    'GT', 'HN', 'MX', 'NI', 'PA', 'PE', 'PR', 'PY', 'SV', 'UY', 'VE',
]);

const COUNTRY_ALIASES: Record<string, string> = {
    ARGENTINA: 'AR',
    AUSTRIA: 'AT',
    BELGIUM: 'BE',
    BELGICA: 'BE',
    BOLIVIA: 'BO',
    BRASIL: 'BR',
    BRAZIL: 'BR',
    BRA: 'BR',
    CHILE: 'CL',
    COLOMBIA: 'CO',
    DEUTSCHLAND: 'DE',
    ESP: 'ES',
    ESPANA: 'ES',
    SPAIN: 'ES',
    FRANCE: 'FR',
    FRANCA: 'FR',
    GERMANY: 'DE',
    ALEMANHA: 'DE',
    ITALIA: 'IT',
    ITALY: 'IT',
    MEXICO: 'MX',
    NETHERLANDS: 'NL',
    PAISESBAIXOS: 'NL',
    PERU: 'PE',
    PORTUGAL: 'PT',
    PRT: 'PT',
    SWITZERLAND: 'CH',
    SUICA: 'CH',
    UNITEDKINGDOM: 'GB',
    UNITEDSTATES: 'US',
    UNITEDSTATESOFAMERICA: 'US',
    USA: 'US',
};

const asRecord = (value: unknown): UnknownRecord => (
    value !== null && typeof value === 'object' && !Array.isArray(value)
        ? value as UnknownRecord
        : {}
);

const firstRecord = (...values: unknown[]): UnknownRecord => {
    for (const value of values) {
        const record = asRecord(value);
        if (Object.keys(record).length > 0) return record;
    }
    return {};
};

const text = (...values: unknown[]): string => {
    for (const value of values) {
        if (typeof value === 'string' && value.trim()) return value.trim();
        if (typeof value === 'number' && Number.isFinite(value)) return String(value);
        if (typeof value === 'bigint') return String(value);
    }
    return '';
};

const digits = (value: unknown): string => text(value).replace(/\D/g, '');

const canonicalEvent = (value: unknown): string => (
    text(value).toUpperCase().replace(/[\s-]+/g, '_')
);

const canonicalCountry = (value: unknown): string => {
    const raw = text(value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z]/gi, '')
        .toUpperCase();

    if (!raw) return '';
    if (raw.length === 2) return raw;
    return COUNTRY_ALIASES[raw] || raw;
};

const firstNameFrom = (...values: unknown[]): string => {
    const fullName = text(...values);
    return fullName.split(/\s+/)[0] || '';
};

const normalizedPhone = (
    rawPhone: unknown,
    rawAreaCode: unknown,
    country: string,
): string => {
    const raw = text(rawPhone);
    const phone = digits(raw);
    if (!phone) return '';

    const areaCode = digits(rawAreaCode);
    if (country !== 'BR') {
        // O v1 internacional separa código local e número, mas não fornece um
        // DDI inequívoco. Não invente um número global nesse formato. Já nos
        // campos v2, preserve +/00 quando vierem explícitos para que o próximo
        // estágio consiga distinguir E.164 de um número local.
        if (areaCode) return '';
        if (raw.startsWith('+')) return `+${phone}`;
        if (raw.startsWith('00')) return `00${phone.slice(2)}`;
        return phone;
    }
    if (!areaCode) return raw.startsWith('+') ? `+${phone}` : phone;

    // No Brasil, a Hotmart v2 separa o DDD em checkout_phone_code. Payloads
    // antigos usam phone_local_code + phone_number. Não duplica o DDD quando
    // uma variação já envia o número completo.
    if (phone.startsWith('55') && phone.length >= 12) return phone;
    if (phone.startsWith(areaCode) && phone.length > 9) return phone;
    return `${areaCode}${phone}`;
};

export function mapHotmartAction(event: string): HotmartAction {
    const canonical = canonicalEvent(event);
    if (APPROVED_EVENTS.has(canonical)) return 'approved';
    if (CART_EVENTS.has(canonical)) return 'cart';
    if (PENDING_EVENTS.has(canonical)) return 'pending';
    return 'ignored';
}

export function localeForHotmartCountry(country: string): HotmartLocale {
    const canonical = canonicalCountry(country);
    if (PORTUGUESE_COUNTRIES.has(canonical)) return 'pt';
    if (SPANISH_COUNTRIES.has(canonical)) return 'es';
    return 'en';
}

/**
 * Compara somente identificadores estáveis. A forma string aceita ID ou ucode;
 * a forma objeto exige igualdade de todos os campos informados. Nome parcial,
 * diferença de caixa e substring nunca são considerados correspondência.
 */
export function matchesHotmartProduct(
    payload: Pick<NormalizedHotmartPayload, 'productId' | 'productUcode'>,
    expected: string | number | HotmartProductExpectation,
): boolean {
    if (typeof expected === 'string' || typeof expected === 'number') {
        const identifier = text(expected);
        return Boolean(identifier)
            && (payload.productId === identifier || payload.productUcode === identifier);
    }

    const expectedId = text(expected?.id);
    const expectedUcode = text(expected?.ucode);
    if (!expectedId && !expectedUcode) return false;
    if (expectedId && payload.productId !== expectedId) return false;
    if (expectedUcode && payload.productUcode !== expectedUcode) return false;
    return true;
}

/**
 * Normaliza webhooks Hotmart v2 de compra/carrinho e mantém compatibilidade
 * defensiva com os campos planos da v1. Não registra nem devolve o payload cru.
 */
export function normalizeHotmartPayload(payload: unknown): NormalizedHotmartPayload {
    const root = asRecord(payload);
    const data = asRecord(root.data);
    const buyer = firstRecord(data.buyer, data.subscriber, root.buyer, root.subscriber);
    const purchase = firstRecord(data.purchase, root.purchase);
    const product = firstRecord(data.product, purchase.product, root.product);
    const buyerAddress = firstRecord(buyer.address, data.address, root.address);
    const dataCheckoutCountry = asRecord(data.checkout_country);
    const purchaseCheckoutCountry = asRecord(purchase.checkout_country);
    const rootCheckoutCountry = asRecord(root.checkout_country);
    const purchaseOffer = asRecord(purchase.offer);
    const dataOffer = asRecord(data.offer);
    const rootOffer = asRecord(root.offer);

    const event = canonicalEvent(text(
        root.event,
        data.event,
        root.status,
        data.status,
        purchase.status,
    ));

    const country = canonicalCountry(text(
        dataCheckoutCountry.iso,
        dataCheckoutCountry.iso_code,
        data.checkout_country,
        purchaseCheckoutCountry.iso,
        purchaseCheckoutCountry.iso_code,
        purchase.checkout_country,
        buyerAddress.country_iso,
        buyerAddress.country_iso_code,
        buyerAddress.country_code,
        buyerAddress.country,
        rootCheckoutCountry.iso,
        rootCheckoutCountry.iso_code,
        root.checkout_country,
        root.address_country_ISO,
        root.address_country_iso,
        data.address_country_ISO,
        data.address_country_iso,
        root.address_country,
        data.address_country,
        root.country,
    ));

    const checkoutPhone = text(
        buyer.checkout_phone,
        buyer.phone,
        buyer.phone_number,
        data.checkout_phone,
        data.phone,
        data.phone_number,
        root.checkout_phone,
        buyer.phone_checkout_number,
        data.phone_checkout_number,
        root.phone_checkout_number,
        root.phone,
        root.phone_number,
    );
    const phoneAreaCode = text(
        buyer.checkout_phone_code,
        buyer.phone_local_code,
        data.checkout_phone_code,
        data.phone_local_code,
        root.checkout_phone_code,
        buyer.phone_checkout_local_code,
        data.phone_checkout_local_code,
        root.phone_checkout_local_code,
        root.phone_local_code,
    );

    const transaction = text(
        purchase.transaction,
        purchase.transaction_id,
        data.transaction,
        data.transaction_id,
        root.transaction,
        root.transaction_id,
    );
    const productId = text(
        product.id,
        data.product_id,
        purchase.product_id,
        root.product_id,
        root.prod,
    );
    const productUcode = text(
        product.ucode,
        data.product_ucode,
        purchase.product_ucode,
        root.product_ucode,
        root.prod_ucode,
        root.ucode,
    );
    const productName = text(
        product.name,
        data.product_name,
        purchase.product_name,
        root.product_name,
        root.prod_name,
    );
    const firstName = firstNameFrom(
        buyer.first_name,
        buyer.firstName,
        data.first_name,
        root.first_name,
        buyer.name,
        data.name,
        root.name,
    );
    const phone = normalizedPhone(checkoutPhone, phoneAreaCode, country);
    const offerCode = text(
        purchaseOffer.code,
        dataOffer.code,
        rootOffer.code,
        purchase.offer_code,
        data.offer_code,
        root.offer_code,
        root.off,
    );
    const checkoutUrl = text(
        purchase.checkout_url,
        data.checkout_url,
        root.checkout_url,
        purchase.checkoutUrl,
        data.checkoutUrl,
        root.checkoutUrl,
        root.link,
    );

    const explicitEventId = text(
        root.id,
        root.event_id,
        root.webhook_id,
        data.event_id,
        data.webhook_id,
    );

    // v1 nem sempre fornece ID de evento. O fallback deliberadamente não usa
    // e-mail, telefone ou nome; o webhook ainda aplica HMAC antes de persistir.
    const fallbackFingerprint = JSON.stringify([
        event,
        transaction,
        productId,
        productUcode,
        offerCode,
        text(root.creation_date, data.creation_date, root.created_at, data.created_at),
        checkoutUrl,
    ]);
    const eventId = explicitEventId || `hotmart_${createHash('sha256')
        .update(fallbackFingerprint)
        .digest('hex')
        .slice(0, 40)}`;

    return {
        event,
        eventId,
        action: mapHotmartAction(event),
        transaction,
        productId,
        productUcode,
        productName,
        firstName,
        phone,
        country,
        locale: localeForHotmartCountry(country),
        offerCode,
        checkoutUrl,
    };
}

export default normalizeHotmartPayload;
