import { supabase } from './supabaseClient';

export type StripeMode = 'live' | 'test';

/**
 * Lê a chave do Stripe ativa conforme o modo selecionado no admin.
 *
 * Config keys em SITE_Config:
 *  - stripe_mode          → 'live' | 'test' (padrão: 'live')
 *  - stripe_api_key_live  → chave de produção (sk_live_...)
 *  - stripe_api_key_test  → chave de teste (sk_test_...)
 *  - stripe_api_key       → legado; usado como fallback quando as novas não existem
 *
 * Assim o Daniel cadastra as duas chaves uma vez e só alterna o modo,
 * sem precisar colar/trocar a chave a cada teste.
 */
export const getStripeConfig = async (): Promise<string | null> => {
    const { data } = await supabase
        .from('SITE_Config')
        .select('key, value')
        .in('key', ['stripe_mode', 'stripe_api_key_live', 'stripe_api_key_test', 'stripe_api_key']);

    const map = (data || []).reduce<Record<string, string>>((acc, row: any) => {
        if (row?.key) acc[row.key] = row.value;
        return acc;
    }, {});

    const mode: StripeMode = map['stripe_mode'] === 'test' ? 'test' : 'live';
    const modeKey = mode === 'test' ? map['stripe_api_key_test'] : map['stripe_api_key_live'];

    // Fallback para a chave legada (instalações que ainda não migraram).
    return modeKey || map['stripe_api_key'] || null;
};

// Stripe API Base URL
const STRIPE_URL = 'https://api.stripe.com/v1';

export const createStripePaymentLink = async ({
    title,
    price, // Amount in normal currency unit (e.g. 100.00)
    currency = 'brl',
    email,
    enrollmentId,
    orderId,
    successUrl
}: {
    title: string,
    price: number,
    currency?: string,
    email?: string,
    enrollmentId?: string,
    orderId?: string,
    successUrl?: string
}) => {
    const apiKey = await getStripeConfig();
    if (!apiKey) throw new Error('Stripe API Key não configurada.');

    // Convert price to cents (Stripe expects integer cents)
    const unitAmount = Math.round(price * 100);

    try {
        const params = new URLSearchParams();
        params.append('payment_method_types[]', 'card');
        params.append('line_items[0][price_data][currency]', currency.toLowerCase());
        params.append('line_items[0][price_data][product_data][name]', title);
        params.append('line_items[0][price_data][unit_amount]', unitAmount.toString());
        params.append('line_items[0][quantity]', '1');
        params.append('mode', 'payment');

        // Determine success URL based on context (order vs enrollment)
        let finalSuccessUrl: string;
        if (successUrl) {
            finalSuccessUrl = successUrl;
        } else if (orderId) {
            finalSuccessUrl = window.location.origin + `/pagamento-sucesso?session_id={CHECKOUT_SESSION_ID}&oid=${orderId}`;
        } else {
            finalSuccessUrl = window.location.origin + `/pagamento-sucesso?session_id={CHECKOUT_SESSION_ID}${enrollmentId ? `&eid=${enrollmentId}` : ''}`;
        }

        params.append('success_url', finalSuccessUrl);
        params.append('cancel_url', window.location.origin + '/admin/dashboard?payment=cancel');
        if (email) params.append('customer_email', email);

        // Attach relevant metadata for webhook processing
        if (enrollmentId) params.append('metadata[enrollmentId]', enrollmentId);
        if (orderId) params.append('metadata[orderId]', orderId);

        const res = await fetch(`${STRIPE_URL}/checkout/sessions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params
        });

        const data = await res.json();

        if (data.error) {
            throw new Error(data.error.message);
        }

        return {
            success: true,
            url: data.url,       // The hosted checkout page URL
            sessionId: data.id   // Stripe session ID for reference
        };

    } catch (error: any) {
        console.error('Stripe Error:', error);
        return { success: false, error: error.message };
    }
};
