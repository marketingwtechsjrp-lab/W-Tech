import { PUBLIC_BASE_URL } from '../lib/publicUrl.js';
import { VACUUM_CAMPAIGN, documentType, onlyDigits, type VacuumCart } from '../lib/vacuumOffer.js';
import { vacuumExternalReference } from './_vacuumPump.js';
import { getRequestClientIp } from './_geoip.js';

/** Chamadas ao Mercado Pago da Vacuum Pump: montar, criar, capturar e desfazer pagamentos. */

export const PIX_EXPIRATION_MS = 30 * 60 * 1000;

const REJECTION_MESSAGES: Record<string, string> = {
    cc_rejected_invalid_installments: 'Este cartão não aceita essa quantidade de parcelas. Escolha menos parcelas ou use outro cartão.',
    cc_rejected_insufficient_amount: 'O cartão não tem limite para este valor. Tente outro cartão ou pague no Pix.',
    cc_rejected_bad_filled_card_number: 'Confira o número do cartão.',
    cc_rejected_bad_filled_date: 'Confira a validade do cartão.',
    cc_rejected_bad_filled_security_code: 'Confira o código de segurança do cartão.',
    cc_rejected_bad_filled_other: 'Confira os dados do cartão.',
    cc_rejected_call_for_authorize: 'Seu banco pediu autorização. Ligue para o banco, libere a compra e tente de novo.',
    cc_rejected_blacklist: 'O cartão não foi aceito. Tente outro cartão ou pague no Pix.',
    cc_rejected_card_disabled: 'O cartão está desativado. Ligue para o banco ou use outro cartão.',
    cc_rejected_duplicated_payment: 'Já existe um pagamento igual a este. Confira seu extrato antes de tentar de novo.',
    cc_rejected_high_risk: 'O pagamento foi recusado pela análise de segurança. Tente outro cartão ou pague no Pix.',
    cc_rejected_max_attempts: 'Limite de tentativas do cartão atingido. Use outro cartão ou pague no Pix.',
};
export const REJECTION_FALLBACK = 'O pagamento não foi aprovado. Tente outro cartão, pague no Pix ou chame um vendedor.';

/**
 * Sinais do aparelho que o antifraude do Mercado Pago pesa: sem eles, compra alta parcelada
 * tende a cair em cc_rejected_high_risk. O Device ID nasce no navegador (SDK v2) e vai no
 * header X-meli-session-id; o IP vai em additional_info.ip_address.
 */
export interface MpAntifraud {
    deviceId: string | null;
    ip: string | null;
}

export function readAntifraud(req: any, body: any): MpAntifraud {
    const raw = typeof body?.device_id === 'string' ? body.device_id.trim() : '';
    const deviceId = /^[A-Za-z0-9._:-]{8,400}$/.test(raw) ? raw : null;
    return { deviceId, ip: getRequestClientIp(req) || null };
}

export function rejectionMessage(detail: unknown): string {
    return REJECTION_MESSAGES[String(detail || '')] || REJECTION_FALLBACK;
}

/** Horário de Brasília no formato que o Mercado Pago aceita em date_of_expiration. */
export function isoBrasilia(ms: number): string {
    return new Date(ms - 3 * 3_600_000).toISOString().replace('Z', '-03:00');
}

function splitName(name: string) {
    const [first, ...rest] = String(name || '').trim().split(/\s+/);
    return { first, last: rest.join(' ') || first };
}

export interface VacuumShippingCharge {
    method: string;
    name: string;
    cost: number;
    days?: number;
}

export interface PaymentPayloadInput {
    amount: number;
    installments: number;
    isPix: boolean;
    form: any;
    description?: string;
    /** false reserva o valor no cartão sem cobrar: a cobrança sai na captura. */
    capture?: boolean;
    metadata?: Record<string, unknown>;
    /** IP de quem está pagando; sem ele, cai no IP salvo quando a pessoa abriu o checkout. */
    ip?: string | null;
}

export function buildPaymentPayload(checkout: any, cart: VacuumCart, shipping: VacuumShippingCharge, input: PaymentPayloadInput): Record<string, unknown> {
    const { first, last } = splitName(checkout.name);
    const ip = input.ip || checkout.browser_context?.ip || null;
    const address = checkout.address;
    const form = input.form || {};
    const docType = documentType(checkout.document);
    const formIdentification = form.payer?.identification;
    const identification = formIdentification?.number
        ? { type: String(formIdentification.type || docType), number: onlyDigits(formIdentification.number) }
        : { type: docType, number: checkout.document };

    return {
        transaction_amount: input.amount,
        description: input.description || 'Vacuum Pump Standard W-Tech - Black Friday',
        installments: input.installments,
        payment_method_id: input.isPix ? 'pix' : String(form.payment_method_id || ''),
        ...(input.isPix
            ? { date_of_expiration: isoBrasilia(Date.now() + PIX_EXPIRATION_MS) }
            : { token: String(form.token), ...(form.issuer_id ? { issuer_id: form.issuer_id } : {}) }),
        ...(input.capture === false ? { capture: false } : {}),
        payer: { email: checkout.email, first_name: first, last_name: last, identification },
        external_reference: vacuumExternalReference(checkout.id),
        notification_url: `${PUBLIC_BASE_URL}/api/mercadopago-webhook`,
        statement_descriptor: 'WTECH',
        metadata: { campaign: VACUUM_CAMPAIGN, checkout_id: checkout.id, lead_id: checkout.lead_id, bumps: cart.bump_ids, ...input.metadata },
        additional_info: {
            ...(ip ? { ip_address: ip } : {}),
            items: [
                ...cart.items.map((item) => ({ id: item.id, title: item.name, quantity: 1, unit_price: item.price, category_id: 'others' })),
                ...(shipping.cost > 0 ? [{ id: 'frete', title: shipping.name, quantity: 1, unit_price: shipping.cost, category_id: 'others' }] : []),
            ],
            payer: {
                first_name: first,
                last_name: last,
                phone: { area_code: checkout.phone.slice(0, 2), number: checkout.phone.slice(2) },
                address: { zip_code: address.cep, street_name: address.street, street_number: address.number },
            },
            shipments: {
                receiver_address: {
                    zip_code: address.cep,
                    state_name: address.state,
                    city_name: address.city,
                    street_name: address.street,
                    street_number: address.number,
                },
            },
        },
    };
}

export interface MpResponse {
    ok: boolean;
    status: number;
    data: any;
}

export async function mpRequest(
    token: string,
    method: string,
    path: string,
    body?: unknown,
    idempotencyKey?: string,
    timeoutMs = 25000,
    deviceId?: string | null,
): Promise<MpResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(`https://api.mercadopago.com${path}`, {
            method,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
                ...(idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : {}),
                ...(deviceId ? { 'X-meli-session-id': deviceId } : {}),
            },
            ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
            signal: controller.signal,
        });
        return { ok: res.ok, status: res.status, data: await res.json().catch(() => null) };
    } finally {
        clearTimeout(timer);
    }
}

export function createMpPayment(token: string, payload: Record<string, unknown>, idempotencyKey: string, deviceId?: string | null): Promise<MpResponse> {
    return mpRequest(token, 'POST', '/v1/payments', payload, idempotencyKey, 25000, deviceId);
}

export async function fetchMpPayment(token: string, paymentId: string): Promise<any | null> {
    const res = await mpRequest(token, 'GET', `/v1/payments/${encodeURIComponent(paymentId)}`, undefined, undefined, 10000).catch(() => null);
    return res?.ok ? res.data : null;
}

/**
 * Cobra o valor reservado no cartão. Idempotente: pagamento já capturado conta como sucesso,
 * então webhook e consulta de status podem pedir a mesma captura sem cobrar duas vezes.
 */
export async function captureMpPayment(token: string, paymentId: string): Promise<boolean> {
    const current = await fetchMpPayment(token, paymentId);
    if (current?.status === 'approved') return true;
    if (current && current.status !== 'authorized') return false;
    const res = await mpRequest(token, 'PUT', `/v1/payments/${encodeURIComponent(paymentId)}`, { capture: true }).catch(() => null);
    if (res?.ok && res.data?.status === 'approved') return true;
    // A resposta pode ter se perdido com a captura feita: confere antes de dar como falha.
    return (await fetchMpPayment(token, paymentId))?.status === 'approved';
}

/**
 * Desfaz um pagamento: cancela o que ainda não foi cobrado (reserva no cartão, Pix em aberto)
 * e estorna o que já foi. Devolve false se não conseguiu, para quem chamou registrar o caso.
 */
export async function releaseMpPayment(token: string, paymentId: string): Promise<boolean> {
    const current = await fetchMpPayment(token, paymentId);
    if (!current) return false;
    if (['cancelled', 'rejected', 'refunded', 'charged_back'].includes(current.status)) return true;
    const res =
        current.status === 'approved'
            ? await mpRequest(token, 'POST', `/v1/payments/${encodeURIComponent(paymentId)}/refunds`, {}, `refund-${paymentId}`).catch(() => null)
            : await mpRequest(token, 'PUT', `/v1/payments/${encodeURIComponent(paymentId)}`, { status: 'cancelled' }).catch(() => null);
    if (!res?.ok) console.error(`[Vacuum] Não foi possível desfazer o pagamento ${paymentId} (${current.status} → ${res?.status ?? 'sem resposta'}).`);
    return !!res?.ok;
}
