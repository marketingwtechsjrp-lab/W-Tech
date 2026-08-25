/**
 * Tradução dos erros dos endpoints de link de cobrança
 * (/api/create-stripe-checkout, /api/asaas-payment-link,
 * /api/mercadopago-balance-link) para uma frase que o atendente entende.
 *
 * Antes o admin fazia `alert('Erro ao gerar link: ' + result.error)` e o
 * atendente sem permissão via literalmente "forbidden" na tela — sem nenhuma
 * pista de que era permissão, e não a chave da API do Stripe.
 */

const MESSAGES: Record<string, string> = {
    forbidden:
        'Seu perfil não tem permissão para gerar links de pagamento.\n\n' +
        'Peça a um administrador para habilitar "Gerar Link de Pagamento" no seu cargo (Equipe & Acesso).',
    unauthorized: 'Sua sessão expirou. Entre no sistema novamente e tente de novo.',
    invalid_currency: 'Moeda não aceita para cobrança. Use BRL, EUR ou USD.',
    invalid_email: 'O e-mail do aluno/cliente é inválido. Corrija o cadastro e tente de novo.',
    enrollment_not_found: 'Matrícula não encontrada. Recarregue a página e tente de novo.',
    supabase_unavailable: 'O banco de dados não respondeu. Tente novamente em instantes.',
    course_unavailable: 'Este curso está sem preço configurado. Avise um administrador.',
    checkout_offer_not_recognized: 'Esta cobrança não pôde ser validada pelo servidor. Avise um administrador.',
    checkout_offer_not_available: 'Esta matrícula não está mais disponível para cobrança (já paga ou cancelada).',
};

/** Frase pronta para exibir ao usuário a partir do `error` devolvido pela API. */
export function describePaymentLinkError(error?: unknown): string {
    const code = typeof error === 'string' ? error.trim() : '';
    if (code && MESSAGES[code]) return MESSAGES[code];
    if (code) return `Não foi possível gerar o link de pagamento: ${code}`;
    return 'Não foi possível gerar o link de pagamento. Tente novamente ou avise um administrador.';
}
