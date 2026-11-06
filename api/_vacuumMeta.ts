import { createHash } from 'node:crypto';
import { VACUUM_ITEM_NAME, VACUUM_META_CONTENT_ID, VACUUM_META_PIXEL_ID, normalizeBrPhone, vacuumPurchaseEventId } from '../lib/vacuumOffer.js';

/**
 * Compra da Vacuum Pump no pixel da loja, pela API de Conversões do Meta.
 *
 * É o que garante o retorno da venda: quem paga o Pix no app do banco muitas vezes não volta para
 * a página de obrigado, e aí o navegador nunca avisa. Usa o mesmo id do evento do navegador, e o
 * Meta conta uma vez só. A chave fica em `SITE_Config.meta_config.capiToken`; sem ela, nada é enviado.
 */

const GRAPH_URL = 'https://graph.facebook.com/v21.0';
const PAGE_URL = 'https://w-techbrasil.com.br/maquina-de-vacuo';

export interface VacuumBrowserContext {
    fbp?: string | null;
    fbc?: string | null;
    ip?: string | null;
    ua?: string | null;
}

export interface VacuumMetaPurchase {
    orderNumber: string;
    total: number;
    contentIds: string[];
    name?: string | null;
    phone?: unknown;
    email?: string | null;
    city?: string | null;
    state?: string | null;
    cep?: string | null;
    /** Venda fechada pelo vendedor não passou pelo site. */
    actionSource: 'website' | 'phone_call';
    browser?: VacuumBrowserContext | null;
}

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

/** O Meta só aceita dado pessoal em hash; campo vazio não vai. */
const hashed = (value: string | null | undefined): string[] | undefined => {
    const clean = String(value ?? '').trim().toLowerCase();
    return clean ? [sha256(clean)] : undefined;
};

function buildUserData(order: VacuumMetaPurchase): Record<string, unknown> {
    const [first, ...rest] = String(order.name || '').trim().toLowerCase().split(/\s+/);
    const phone = normalizeBrPhone(order.phone);
    const data: Record<string, unknown> = {
        em: hashed(order.email),
        ph: hashed(phone ? `55${phone}` : null),
        external_id: hashed(phone ? `55${phone}` : null),
        fn: hashed(first),
        ln: hashed(rest.join(' ')),
        ct: hashed(String(order.city || '').replace(/\s+/g, '')),
        st: hashed(order.state),
        zp: hashed(String(order.cep || '').replace(/\D/g, '')),
        country: hashed('br'),
        client_ip_address: order.browser?.ip || undefined,
        client_user_agent: order.browser?.ua || undefined,
        fbp: order.browser?.fbp || undefined,
        fbc: order.browser?.fbc || undefined,
    };
    return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
}

/** A venda já está gravada quando isto roda: nada aqui pode derrubá-la. */
export async function sendVacuumPurchaseToMeta(supabase: any, order: VacuumMetaPurchase): Promise<void> {
    try {
        const { data: row } = await supabase.from('SITE_Config').select('value').eq('key', 'meta_config').maybeSingle();
        let config: { capiToken?: string; testEventCode?: string } = {};
        try {
            config = JSON.parse(row?.value || '{}');
        } catch {
            /* configuração inválida: trata como sem chave */
        }
        const token = String(config.capiToken || '').trim();
        if (!token) {
            console.warn(`[Vacuum] Pedido ${order.orderNumber} não foi ao Meta pelo servidor: falta a chave em meta_config.capiToken.`);
            return;
        }

        const ids = order.contentIds.length ? order.contentIds : [VACUUM_META_CONTENT_ID];
        const testCode = String(config.testEventCode || '').trim();
        const response = await fetch(`${GRAPH_URL}/${VACUUM_META_PIXEL_ID}/events`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                data: [
                    {
                        event_name: 'Purchase',
                        event_time: Math.floor(Date.now() / 1000),
                        event_id: vacuumPurchaseEventId(order.orderNumber),
                        action_source: order.actionSource,
                        ...(order.actionSource === 'website' ? { event_source_url: PAGE_URL } : {}),
                        user_data: buildUserData(order),
                        custom_data: {
                            currency: 'BRL',
                            value: order.total,
                            content_name: VACUUM_ITEM_NAME,
                            content_type: 'product',
                            content_ids: ids,
                            num_items: ids.length,
                            order_id: order.orderNumber,
                        },
                    },
                ],
                ...(testCode ? { test_event_code: testCode } : {}),
            }),
            signal: AbortSignal.timeout(15_000),
        });
        if (response.ok) {
            console.log(`[Vacuum] Pedido ${order.orderNumber} enviado ao Meta pelo servidor ✓`);
            return;
        }
        const result = await response.json().catch(() => ({}));
        console.error(`[Vacuum] Meta recusou o pedido ${order.orderNumber}:`, result?.error?.error_user_msg || result?.error?.message || `HTTP ${response.status}`);
    } catch (err: any) {
        console.error(`[Vacuum] Falha ao enviar o pedido ${order.orderNumber} ao Meta:`, err?.message);
    }
}
