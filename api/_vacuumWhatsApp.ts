import { formatBRL, normalizeBrPhone } from '../lib/vacuumOffer.js';
import { GRAPH, loadCloudConfig } from './_whatsappCloud.js';

/**
 * Confirmação de compra da Vacuum Pump pelo WhatsApp oficial da loja.
 *
 * Mensagem iniciada pela empresa só sai com modelo aprovado pelo Meta, e o número do Suporte
 * (Evolution) é exclusivo do curso online. Por isso vai pela API oficial, com modelo de utilidade.
 */

export const VACUUM_ORDER_TEMPLATE = 'vp_pedido_confirmado';

/** Igual ao modelo aprovado no Meta: mudar o texto exige submeter outro modelo. */
const TEMPLATE_BODY =
    'Olá, {{1}}! Confirmamos o seu pagamento, e o pedido {{2}} da Vacuum Pump Standard está garantido.\n\n' +
    'Valor total: {{3}}\nEntrega até: {{4}}\n\n' +
    'Se tiver alguma dúvida sobre o pedido, é só responder esta mensagem.';

const MESSAGES = 'SITE_WhatsAppCloudMessages';
const CONVERSATIONS = 'SITE_WhatsAppCloudConversations';

export interface VacuumOrderNotice {
    orderNumber: string;
    firstName: string;
    phone: unknown;
    total: number;
    /** Data no formato dd/mm/aaaa: veja `brDate`. */
    deadline: string;
}

/** Aceita a data do prazo ou a coluna `estimated_delivery_date` (aaaa-mm-dd). */
export function brDate(value: Date | string | null | undefined): string {
    if (value instanceof Date) return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(value);
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? ''));
    return match ? `${match[3]}/${match[2]}/${match[1]}` : 'a confirmar';
}

/**
 * Manda a confirmação uma vez por pedido. A venda já está gravada quando isto roda, então nada
 * aqui pode derrubá-la: qualquer falha fica registrada na conversa e no log. O registro usa
 * `sent_by: 'system'`, que não conta como conversa de vendedor no crédito da venda.
 */
export async function sendVacuumOrderWhatsApp(supabase: any, order: VacuumOrderNotice): Promise<void> {
    try {
        const digits = normalizeBrPhone(order.phone);
        if (!digits) {
            console.warn(`[Vacuum] Pedido ${order.orderNumber} sem WhatsApp brasileiro válido: confirmação não enviada.`);
            return;
        }

        const { data: previous, error: previousError } = await supabase
            .from(MESSAGES)
            .select('id')
            .eq('sent_by', 'system')
            .neq('status', 'failed')
            .ilike('body', `%${order.orderNumber}%`)
            .limit(1);
        if (previousError) throw new Error(previousError.message);
        if (previous?.length) return;

        const config = await loadCloudConfig(supabase);
        if (!config.accessToken || !config.phoneNumberId) throw new Error('WhatsApp oficial sem configuração.');

        // Parâmetro de modelo não aceita quebra de linha nem espaço especial, como o do valor em reais.
        const params = [order.firstName, order.orderNumber, formatBRL(order.total), order.deadline].map((value) =>
            String(value).replace(/\s+/g, ' ').trim()
        );
        const to = `55${digits}`;
        const response = await fetch(`${GRAPH}/${config.apiVersion}/${config.phoneNumberId}/messages`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${config.accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to,
                type: 'template',
                template: {
                    name: VACUUM_ORDER_TEMPLATE,
                    language: { code: 'pt_BR' },
                    components: [{ type: 'body', parameters: params.map((text) => ({ type: 'text', text })) }],
                },
            }),
            signal: AbortSignal.timeout(15_000),
        });
        const result = await response.json().catch(() => ({}));
        const messageId: string | undefined = result?.messages?.[0]?.id;
        const waId: string = result?.contacts?.[0]?.wa_id || to;
        const failure = messageId ? null : result?.error?.error_data?.details || result?.error?.message || `HTTP ${response.status}`;

        // Quem já conversa com a loja vê no histórico; quem não conversa entra na caixa quando responder.
        const { data: conversation } = await supabase.from(CONVERSATIONS).select('id').eq('wa_id', waId).maybeSingle();
        const { error: saveError } = await supabase.from(MESSAGES).insert([{
            conversation_id: conversation?.id ?? null,
            wa_id: waId,
            wa_message_id: messageId ?? null,
            direction: 'out',
            type: 'text',
            body: params.reduce((text, value, index) => text.replace(`{{${index + 1}}}`, () => value), TEMPLATE_BODY),
            status: failure ? 'failed' : 'sent',
            error: failure,
            sent_by: 'system',
            timestamp: new Date().toISOString(),
        }]);
        if (saveError) console.error(`[Vacuum] Confirmação do pedido ${order.orderNumber} não ficou registrada:`, saveError.message);

        if (failure) console.error(`[Vacuum] WhatsApp do pedido ${order.orderNumber} não saiu:`, failure);
        else console.log(`[Vacuum] Confirmação do pedido ${order.orderNumber} enviada pelo WhatsApp ✓`);
    } catch (err: any) {
        console.error(`[Vacuum] Falha na confirmação do pedido ${order.orderNumber} pelo WhatsApp:`, err?.message);
    }
}
