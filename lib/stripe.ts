import { supabase } from './supabaseClient';

export const getStripeConfig = async () => {
    const { data } = await supabase.from('SITE_Config').select('value').eq('key', 'stripe_api_key').single();
    return data?.value || null;
};

// Stripe API Base URL
const STRIPE_URL = 'https://api.stripe.com/v1';

export const createStripePaymentLink = async ({
    title,
    price, // Amount in normal currency unit (e.g. 100.00)
    currency = 'usd',
    email,
    enrollmentId
}: {
    title: string,
    price: number,
    currency?: string,
    email?: string,
    enrollmentId?: string
}) => {
    const apiKey = await getStripeConfig();
    if (!apiKey) throw new Error('Stripe API Key não configurada.');

    // Convert price to cents (Stripe expects integer cents)
    const unitAmount = Math.round(price * 100);

    try {
        // Create Checkout Session using URL Encoded Form Data (standard for Stripe API)
        const params = new URLSearchParams();
        params.append('payment_method_types[]', 'card');
        params.append('line_items[0][price_data][currency]', currency.toLowerCase());
        params.append('line_items[0][price_data][product_data][name]', title);
        params.append('line_items[0][price_data][unit_amount]', unitAmount.toString());
        params.append('line_items[0][quantity]', '1');
        params.append('mode', 'payment');
        params.append('success_url', window.location.origin + `/#/pagamento-sucesso?session_id={CHECKOUT_SESSION_ID}${enrollmentId ? `&eid=${enrollmentId}` : ''}`);
        params.append('cancel_url', window.location.origin + '/admin/dashboard?payment=cancel');
        if (email) params.append('customer_email', email);
        if (enrollmentId) params.append('metadata[enrollmentId]', enrollmentId);

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
            url: data.url // The hosted checkout page
        };

    } catch (error: any) {
        console.error("Stripe Error:", error);
        return { success: false, error: error.message };
    }
};
