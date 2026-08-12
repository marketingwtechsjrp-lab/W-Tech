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

/**
 * Cria a sessão de checkout do Stripe.
 *
 * SEGURANÇA: a criação agora acontece 100% no servidor (/api/create-stripe-checkout).
 * A chave secreta do Stripe NUNCA é lida nem trafega pelo navegador. A assinatura e o
 * retorno ({ success, url, sessionId }) foram preservados — nenhum caller precisou mudar.
 */
export const createStripePaymentLink = async ({
    title,
    price, // Amount in normal currency unit (e.g. 100.00)
    currency = 'brl',
    email,
    enrollmentId,
    orderId,
    leadId,
    courseId,
    paymentType,
    successUrl
}: {
    title: string,
    price: number,
    currency?: string,
    email?: string,
    enrollmentId?: string,
    orderId?: string,
    /**
     * Fluxo "inscrição só depois do pagamento" (ex.: /checkout-lisboa): não existe
     * inscrição na hora do checkout, então mandamos o lead. O webhook cria/confirma
     * a inscrição a partir dele — sem isso a sessão chega ao webhook sem metadata
     * nenhuma e o pagamento nunca é registrado.
     */
    leadId?: string,
    courseId?: string,
    paymentType?: 'deposit' | 'full',
    successUrl?: string
}): Promise<{ success: boolean; url?: string; sessionId?: string; error?: string }> => {
    try {
        const res = await fetch('/api/create-stripe-checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title,
                price,
                currency,
                email,
                enrollmentId,
                orderId,
                leadId,
                courseId,
                paymentType,
                successUrl,
                origin: typeof window !== 'undefined' ? window.location.origin : undefined
            })
        });

        const data = await res.json().catch(() => ({ success: false, error: 'Resposta inválida do servidor.' }));

        if (!res.ok || !data?.success) {
            return { success: false, error: data?.error || 'Falha ao gerar o pagamento.' };
        }

        return { success: true, url: data.url, sessionId: data.sessionId };
    } catch (error: any) {
        console.error('Stripe checkout error:', error?.message);
        return { success: false, error: 'Falha de conexão ao gerar o pagamento.' };
    }
};
