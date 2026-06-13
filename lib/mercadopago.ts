/**
 * Mercado Pago Frontend Client Helper
 * Intermedia a comunicação com o endpoint backend seguro /api/mercadopago-checkout.
 */
export const createMercadoPagoPreference = async ({
    courseId,
    customer,
    leadId,
    paymentType = 'full'
}: {
    courseId: string;
    customer: { name: string; email: string; cpf: string; phone: string; birthDate?: string };
    leadId?: string;
    paymentType?: 'full' | 'deposit';
}) => {
    try {
        const res = await fetch('/api/mercadopago-checkout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                courseId,
                customer,
                leadId,
                paymentType
            })
        });

        // A resposta pode vir vazia/HTML (ex.: 404 em "npm run dev", onde as rotas
        // /api não existem — só rodam na Vercel ou via "vercel dev").
        const text = await res.text();
        let data: any = null;
        try { data = text ? JSON.parse(text) : null; } catch { /* não-JSON */ }

        if (!data) {
            throw new Error(
                res.status === 404
                    ? 'Endpoint /api/mercadopago-checkout indisponível neste ambiente. Teste no site publicado ou rode "vercel dev".'
                    : `Resposta inválida do servidor (HTTP ${res.status}).`
            );
        }
        if (!res.ok || !data.success) {
            const errMsg = data.error || 'Erro desconhecido ao processar transação.';
            throw new Error(errMsg);
        }

        return {
            success: true,
            init_point: data.init_point,               // URL produção
            sandbox_init_point: data.sandbox_init_point, // URL sandbox
            id: data.id,                                // ID da preferência do MP
            enrollmentId: data.enrollmentId             // ID da inscrição gerada no banco
        };

    } catch (error: any) {
        console.error('Mercado Pago Checkout Error:', error);
        return { success: false, error: error.message };
    }
};
