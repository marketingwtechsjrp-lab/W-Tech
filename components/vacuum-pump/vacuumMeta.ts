import { setMetaUserData, trackMetaStandardEvent } from '../../lib/metaPixel';
import {
    VACUUM_ITEM_NAME,
    VACUUM_META_CONTENT_ID,
    VACUUM_META_PIXEL_ID,
    normalizeBrPhone,
    vacuumPurchaseEventId,
} from '../../lib/vacuumOffer';

/**
 * Funil da Vacuum Pump no pixel da loja. O contêiner do GTM só conhece o pixel do curso online,
 * então estes eventos saem direto daqui, com `trackSingle`, para não cair em outro pixel.
 * A compra também vai pelo servidor (`api/_vacuumMeta.ts`), com o mesmo id, e o Meta conta uma vez só.
 */
const pixelId = VACUUM_META_PIXEL_ID;

const product = (value: number, ids?: string[]) => ({
    content_name: VACUUM_ITEM_NAME,
    content_type: 'product',
    content_ids: ids?.length ? ids : [VACUUM_META_CONTENT_ID],
    currency: 'BRL',
    value,
});

export function trackVacuumViewContent(price: number): void {
    trackMetaStandardEvent('ViewContent', product(price), { pixelId, onceKey: 'vacuum-view-content' });
}

export function trackVacuumInitiateCheckout(total: number, bumpIds: string[]): void {
    trackMetaStandardEvent('InitiateCheckout', product(total, [VACUUM_META_CONTENT_ID, ...bumpIds]), { pixelId, onceKey: 'vacuum-initiate-checkout' });
}

export function trackVacuumAddPaymentInfo(total: number, bumpIds: string[]): void {
    trackMetaStandardEvent('AddPaymentInfo', product(total, [VACUUM_META_CONTENT_ID, ...bumpIds]), { pixelId, onceKey: 'vacuum-add-payment-info' });
}

export function trackVacuumLead(value: number): void {
    trackMetaStandardEvent('Lead', product(value), { pixelId, onceKey: 'vacuum-lead' });
}

export function trackVacuumPurchase(order: { orderNumber: string; total: number; ids: string[] }): void {
    trackMetaStandardEvent(
        'Purchase',
        { ...product(order.total, order.ids), num_items: order.ids.length || 1, order_id: order.orderNumber },
        { pixelId, eventId: vacuumPurchaseEventId(order.orderNumber), onceKey: `vacuum-purchase:${order.orderNumber}` }
    );
}

/** Ajuda o Meta a reconhecer quem comprou. O próprio script do Meta aplica o hash antes de enviar. */
export function identifyVacuumBuyer(buyer: { name?: string; email?: string; phone?: string; city?: string; state?: string; cep?: string }): void {
    const [first, ...rest] = String(buyer.name || '').trim().toLowerCase().split(/\s+/);
    const phone = normalizeBrPhone(buyer.phone);
    setMetaUserData(pixelId, {
        em: buyer.email?.trim().toLowerCase() || undefined,
        ph: phone ? `55${phone}` : undefined,
        fn: first || undefined,
        ln: rest.join(' ') || undefined,
        ct: buyer.city?.trim().toLowerCase().replace(/\s+/g, '') || undefined,
        st: buyer.state?.trim().toLowerCase() || undefined,
        zp: buyer.cep?.replace(/\D/g, '') || undefined,
        country: 'br',
    });
}
