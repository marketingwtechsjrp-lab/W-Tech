import { supabase } from './supabaseClient';

export const getMercadoPagoConfig = async () => {
    const { data } = await supabase.from('SITE_Config').select('value').eq('key', 'mercadopago_access_token').single();
    return data?.value || null;
};

const MP_URL = 'https://api.mercadopago.com';

export const createMercadoPagoPreference = async ({
    course,
    customer,
    enrollmentId,
    leadId
}: {
    course: { id: string; title: string; price: number };
    customer: { name: string; email: string; cpf?: string; phone?: string };
    enrollmentId: string;
    leadId?: string;
}) => {
    const accessToken = await getMercadoPagoConfig();
    if (!accessToken) throw new Error('Token Mercado Pago não configurado.');

    const origin = window.location.origin;

    // HashRouter usa '#' na URL — o MP rejeita back_urls com '#' quando auto_return está ativo.
    // Solução: usar uma página de redirect intermediária sem hash.
    const successUrl  = `${origin}/mp-redirect.html?eid=${enrollmentId}&status=approved`;
    const pendingUrl  = `${origin}/mp-redirect.html?eid=${enrollmentId}&status=pending`;
    const failureUrl  = `${origin}/mp-redirect.html?eid=${enrollmentId}&status=failed&cid=${course.id}`;

    const phoneDigits = (customer.phone || '').replace(/\D/g, '');
    const areaCode    = phoneDigits.slice(0, 2);
    const phoneNumber = phoneDigits.slice(2);
    const cpfDigits   = (customer.cpf || '').replace(/\D/g, '');

    const payload: any = {
        items: [
            {
                id: course.id,
                title: course.title,
                unit_price: course.price, // MP usa float, não centavos
                quantity: 1,
                currency_id: 'BRL'
            }
        ],
        payer: {
            name: customer.name,
            email: customer.email,
            ...(phoneDigits.length >= 10 && { phone: { area_code: areaCode, number: phoneNumber } }),
            ...(cpfDigits.length === 11 && { identification: { type: 'CPF', number: cpfDigits } }),
        },
        back_urls: {
            success: successUrl,
            failure: failureUrl,
            pending: pendingUrl
        },
        // auto_return removido: HashRouter URLs com '#' são rejeitadas pela validação do MP.
        // O webhook cuida da confirmação automaticamente.
        notification_url: 'https://niesvylxwfaffgnmdoql.supabase.co/functions/v1/mercadopago-webhook',
        external_reference: enrollmentId,
        metadata: {
            enrollment_id: enrollmentId,
            lead_id: leadId || null
        },
        statement_descriptor: 'WTECH'
    };

    try {
        const res = await fetch(`${MP_URL}/checkout/preferences`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        // Sucesso → MP retorna um 'id' de preferência
        if (!data.id) {
            const errMsg = data.message || data.error || JSON.stringify(data);
            throw new Error(`MP API: ${errMsg}`);
        }

        return {
            success: true,
            init_point: data.init_point,               // URL produção
            sandbox_init_point: data.sandbox_init_point, // URL sandbox
            id: data.id
        };

    } catch (error: any) {
        console.error('Mercado Pago Error:', error);
        return { success: false, error: error.message };
    }
};
