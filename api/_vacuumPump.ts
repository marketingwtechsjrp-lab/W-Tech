/**
 * Núcleo da venda da Vacuum Pump na Black Friday: estado da oferta, confirmação
 * do pagamento e entrega de quem não comprou para os vendedores.
 *
 * Fica separado de vacuum-pump.ts porque o webhook do Mercado Pago usa as mesmas
 * funções. Arquivos com prefixo "_" não viram rota.
 */

import { findExistingLead, isWonStatus } from '../lib/leadMatch.js';
import {
    VACUUM_CAMPAIGN,
    VACUUM_CONFIG_KEY,
    formatBRL,
    getVacuumOfferState,
    isSaoPauloCep,
    onlyDigits,
    resolveVacuumConfig,
    vacuumDeliveryDeadline,
    type VacuumCartItem,
    type VacuumOfferConfig,
    type VacuumOfferState,
} from '../lib/vacuumOffer.js';
import { pickNextAttendant } from './_roleta.js';
import { sendEmail } from './_email.js';

const EXTERNAL_REFERENCE_PREFIX = 'vacuum:';
const PAID_SALE_STATUSES = ['paid', 'approved', 'producing', 'shipped', 'delivered'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CHECKOUTS = 'SITE_CampaignCheckouts';

/** Etapas em que a pessoa desistiu e o vendedor pode chamar. */
const ABANDONED_STAGES = ['lead', 'address', 'payment', 'pix_pending', 'rejected', 'expired'];
const ABANDON_AFTER_MS = 30 * 60 * 1000;
/** Cartão recusado é o lead mais quente: o vendedor entra antes. */
const REJECTED_ABANDON_AFTER_MS = 10 * 60 * 1000;

export function isUuid(value: unknown): value is string {
    return typeof value === 'string' && UUID_RE.test(value);
}

export function vacuumExternalReference(checkoutId: string): string {
    return `${EXTERNAL_REFERENCE_PREFIX}${checkoutId}`;
}

/** O webhook é um só para toda a conta: é a referência que diz que o pagamento é daqui. */
export function isVacuumPayment(payment: any): boolean {
    return String(payment?.external_reference || '').startsWith(EXTERNAL_REFERENCE_PREFIX);
}

function checkoutIdFromPayment(payment: any): string | null {
    const id = String(payment?.external_reference || '').slice(EXTERNAL_REFERENCE_PREFIX.length);
    return isUuid(id) ? id : null;
}

interface OfferCache {
    config: VacuumOfferConfig;
    paidCount: number;
    publicKey: string | null;
    expiresAt: number;
}

let offerCache: OfferCache | null = null;
const OFFER_CACHE_MS = 15_000;

async function readConfigValue(supabase: any, key: string): Promise<string | null> {
    const { data, error } = await supabase.from('SITE_Config').select('value').eq('key', key).maybeSingle();
    if (error) {
        console.error(`[Vacuum] Falha ao ler ${key}:`, error.message);
        return null;
    }
    return (data?.value as string) || null;
}

async function countPaidSales(supabase: any): Promise<number> {
    const { count, error } = await supabase
        .from('SITE_Sales')
        .select('id', { count: 'exact', head: true })
        .eq('campaign', VACUUM_CAMPAIGN)
        .in('status', PAID_SALE_STATUSES);
    if (error) {
        console.error('[Vacuum] Falha ao contar vendas:', error.message);
        return 0;
    }
    return count ?? 0;
}

/**
 * Estado da oferta. A página pública pode bater muito aqui (tráfego pago), então
 * config e contagem ficam 15 s em memória. A fase é sempre recalculada com o
 * relógio atual, e o pagamento pede `fresh` para validar o lote de verdade.
 */
export async function loadVacuumOffer(
    supabase: any,
    options: { fresh?: boolean; now?: number } = {}
): Promise<{ config: VacuumOfferConfig; state: VacuumOfferState; publicKey: string | null }> {
    const now = options.now ?? Date.now();
    if (options.fresh || !offerCache || offerCache.expiresAt < now) {
        const [rawConfig, paidCount, publicKey] = await Promise.all([
            readConfigValue(supabase, VACUUM_CONFIG_KEY),
            countPaidSales(supabase),
            readConfigValue(supabase, 'mercadopago_public_key'),
        ]);
        offerCache = {
            config: resolveVacuumConfig(rawConfig),
            paidCount,
            publicKey: publicKey?.trim() || null,
            expiresAt: now + OFFER_CACHE_MS,
        };
    }
    return {
        config: offerCache.config,
        state: getVacuumOfferState(offerCache.config, offerCache.paidCount, now),
        publicKey: offerCache.publicKey,
    };
}

export function clearVacuumOfferCache(): void {
    offerCache = null;
}

export async function readMercadoPagoToken(supabase: any): Promise<string | null> {
    return readConfigValue(supabase, 'mercadopago_access_token');
}

export interface VacuumShippingOption {
    code: string;
    name: string;
    price: number;
    days: number;
}

export interface VacuumShippingQuote {
    /** free: SP. quoted: escolher uma opção. combine: sem cotação, a equipe combina depois. */
    mode: 'free' | 'quoted' | 'combine';
    options: VacuumShippingOption[];
}

const SGP_QUOTE_URL = 'https://www.sgpweb.com.br/novo/api/consulta-precos-prazos';
const QUOTE_CACHE_MS = 10 * 60 * 1000;
const quoteCache = new Map<string, { expiresAt: number; quote: VacuumShippingQuote }>();

function decimalBR(value: number): string {
    return String(value).replace('.', ',');
}

function parseDecimalBR(value: unknown): number {
    return Number(String(value ?? '').replace(/\./g, '').replace(',', '.'));
}

/**
 * Frete da compra. Grátis em SP pelo CEP; fora de SP cota no SGP (conta W-Tech nos
 * Correios). Falha ou pacote fora do limite nunca trava a venda: vira "a combinar".
 * Fica 10 min em memória, para o valor mostrado ser o mesmo cobrado no pagamento.
 */
export async function quoteVacuumShipping(supabase: any, config: VacuumOfferConfig, cep: unknown, bumpIds: unknown): Promise<VacuumShippingQuote> {
    if (isSaoPauloCep(cep)) return { mode: 'free', options: [] };

    const digits = onlyDigits(cep);
    const shipping = config.shipping;
    if (!shipping.enabled || shipping.weight_kg <= 0 || digits.length !== 8) return { mode: 'combine', options: [] };

    const wanted = new Set(Array.isArray(bumpIds) ? bumpIds.map(String) : []);
    const weight = shipping.weight_kg + config.bumps.filter((bump) => wanted.has(bump.id)).reduce((sum, bump) => sum + bump.weight_kg, 0);
    const cacheKey = `${digits}|${weight}|${shipping.length_cm}x${shipping.height_cm}x${shipping.width_cm}|${shipping.declared_value}|${shipping.origin_cep}`;
    const cached = quoteCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.quote;

    const apiKey = await readConfigValue(supabase, 'sgp_api_key');
    if (!apiKey) {
        console.error('[Vacuum] sgp_api_key ausente em SITE_Config');
        return { mode: 'combine', options: [] };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
        const res = await fetch(`${SGP_QUOTE_URL}?chave_integracao=${encodeURIComponent(apiKey)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cep_origem: shipping.origin_cep,
                cep_destino: digits,
                formato: '1',
                peso: decimalBR(weight),
                comprimento: decimalBR(shipping.length_cm),
                altura: decimalBR(shipping.height_cm),
                largura: decimalBR(shipping.width_cm),
                mao_propria: 'N',
                aviso_recebimento: 'N',
                // Com ponto, ao contrário dos outros campos: com vírgula o SGP recusa (PRC-101).
                // O PAC só aceita até cerca de R$ 4.668; acima disso ele some das opções.
                ...(shipping.declared_value > 0 ? { valor_declarado: shipping.declared_value.toFixed(2) } : {}),
                servicos: shipping.services.map((service) => service.code),
            }),
            signal: controller.signal,
        });
        const data = await res.json();
        if (!res.ok || !data?.servicos || typeof data.servicos !== 'object') {
            console.error('[Vacuum] SGP não cotou:', String(data?.MsgErro || res.status).slice(0, 160));
            return { mode: 'combine', options: [] };
        }

        // A resposta traz o código sem o zero à esquerda: 3298 para o 03298.
        const entries: any[] = Object.values(data.servicos);
        const options: VacuumShippingOption[] = [];
        for (const service of shipping.services) {
            const found = entries.find((entry) => Number(entry?.Codigo) === Number(service.code));
            const price = parseDecimalBR(found?.Valor);
            if (!found || String(found.Erro) !== '0' || !(price > 0)) {
                if (found) console.warn(`[Vacuum] SGP sem ${service.name}: ${String(found.MsgErro || '').slice(0, 120)}`);
                continue;
            }
            options.push({ code: service.code, name: service.name, price, days: Number(found.PrazoEntrega) || 0 });
        }
        options.sort((a, b) => a.price - b.price);

        const quote: VacuumShippingQuote = options.length ? { mode: 'quoted', options } : { mode: 'combine', options: [] };
        if (quoteCache.size > 2000) quoteCache.clear();
        if (options.length) quoteCache.set(cacheKey, { expiresAt: Date.now() + QUOTE_CACHE_MS, quote });
        return quote;
    } catch (err: any) {
        console.error('[Vacuum] Falha na cotação do SGP:', err?.message);
        return { mode: 'combine', options: [] };
    } finally {
        clearTimeout(timer);
    }
}

function firstName(name?: string | null): string {
    return String(name || '').trim().split(/\s+/)[0] || 'Cliente';
}

function escapeHtml(value: unknown): string {
    return String(value ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function appendNote(existing: string | null | undefined, note: string): string {
    return existing ? `${existing}\n${note}` : note;
}

function paymentMethodLabel(payment: any): string {
    if (payment?.payment_method_id === 'pix') return 'Mercado Pago - Pix';
    const installments = Number(payment?.installments) || 1;
    return `Mercado Pago - Cartão ${installments}x`;
}

function dateSP(date: Date): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(date);
}

/** Confirmação ao comprador. Best-effort: quem manda na venda é o registro no banco. */
async function sendConfirmationEmail(checkout: any, orderNumber: string, deadline: Date, shippingNote: string): Promise<void> {
    if (!checkout.email) return;
    const items: VacuumCartItem[] = checkout.items || [];
    const rows = items
        .map(
            (item) =>
                `<tr><td style="padding:8px 0;border-bottom:1px solid #eee">${escapeHtml(item.name)}</td>` +
                `<td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">${formatBRL(item.price)}</td></tr>`
        )
        .join('');
    const shipping = checkout.shipping;
    const shippingRow = shipping
        ? `<tr><td style="padding:8px 0;border-bottom:1px solid #eee">${escapeHtml(shipping.name)}</td>` +
          `<td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">${shipping.cost > 0 ? formatBRL(shipping.cost) : escapeHtml(shipping.method === 'gratis_sp' ? 'Grátis' : 'A combinar')}</td></tr>`
        : '';
    const prazo = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(deadline);
    const html = `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#111">
          <h2 style="margin:0 0 8px">Pedido confirmado, ${escapeHtml(firstName(checkout.name))}!</h2>
          <p style="margin:0 0 16px">Sua Vacuum Pump Standard está garantida. Número do pedido: <b>${escapeHtml(orderNumber)}</b>.</p>
          <table style="width:100%;border-collapse:collapse;font-size:14px">${rows}${shippingRow}
            <tr><td style="padding:10px 0"><b>Total</b></td><td style="padding:10px 0;text-align:right"><b>${formatBRL(Number(checkout.amount) || 0)}</b></td></tr>
          </table>
          <p style="margin:16px 0 4px"><b>Entrega até ${prazo}.</b> ${escapeHtml(shippingNote)}</p>
          <p style="margin:0">Dúvidas? Responda este e-mail ou fale com o suporte W-Tech pelo WhatsApp.</p>
        </div>`;
    await sendEmail({
        to: checkout.email,
        subject: `Pedido ${orderNumber} confirmado: Vacuum Pump Standard W-Tech`,
        html,
        type: 'vacuum_pump_confirmacao',
    });
}

async function convertLead(supabase: any, checkout: any, sale: { id: string; total: number; orderNumber: string }): Promise<void> {
    const lead = checkout.lead_id
        ? (await supabase.from('SITE_Leads').select('*').eq('id', checkout.lead_id).maybeSingle()).data
        : await findExistingLead<any>(supabase, { email: checkout.email, phone: checkout.phone });

    const fromSeller = !!checkout.followup_assigned_to;
    const tags = Array.from(
        new Set([
            ...(lead?.tags || []),
            'vacuum_bf',
            'vacuum_bf_comprou',
            'venda_mp',
            'checkout_direto',
            fromSeller ? 'recuperado_por_vendedor' : 'checkout_automatico',
        ])
    );
    // CPF e endereço ficam fora da ficha de propósito: SITE_Leads tem leitura pública
    // (política "Public Select"). Os dados da entrega vivem no pedido e no checkout.
    const payload: Record<string, unknown> = {
        status: 'Converted',
        tags,
        conversion_value: sale.total,
        conversion_type: 'Product_Purchase',
        conversion_summary: `Vacuum Pump Black Friday, pedido ${sale.orderNumber}, via checkout do site.`,
        updated_at: new Date().toISOString(),
    };

    if (lead) {
        const { error } = await supabase.from('SITE_Leads').update(payload).eq('id', lead.id);
        if (error) console.error('[Vacuum] Falha ao converter lead (não-fatal):', error.message);
        // Quem comprou não pode continuar na fila de ligação do vendedor.
        const { error: taskError } = await supabase
            .from('SITE_Tasks')
            .update({ status: 'DONE' })
            .eq('lead_id', lead.id)
            .eq('status', 'TODO')
            .contains('tags', ['vacuum_bf']);
        if (taskError) console.error('[Vacuum] Falha ao concluir tarefas (não-fatal):', taskError.message);
    }
}

/**
 * Pagamento aprovado vira venda. Idempotente: a resposta do Mercado Pago e o
 * webhook podem chegar juntos, e o índice único de mp_payment_id deixa só um
 * gravar. Falha ao gravar a venda lança erro, e o webhook responde 500 para o
 * Mercado Pago reenviar.
 */
export async function finalizeVacuumPayment(supabase: any, checkout: any, payment: any): Promise<{ saleId: string; orderNumber: string }> {
    const paymentId = String(payment.id);

    const { data: existing, error: existingError } = await supabase
        .from('SITE_Sales')
        .select('id, order_number')
        .eq('mp_payment_id', paymentId)
        .maybeSingle();
    if (existingError) throw new Error(`Consulta de venda falhou: ${existingError.message}`);
    if (existing) {
        await markCheckoutPaid(supabase, checkout.id, existing.id, payment);
        return { saleId: existing.id, orderNumber: existing.order_number };
    }

    const now = Date.now();
    const { config, state } = await loadVacuumOffer(supabase);
    const items: VacuumCartItem[] = checkout.items || [];
    const total = Number(checkout.amount) || Number(payment.transaction_amount) || 0;
    const address = checkout.address || {};
    const deadline = vacuumDeliveryDeadline(config, state.phase, now);
    const orderNumber = `WT-VP${String(now).slice(-6)}${Math.floor(Math.random() * 100)}`;
    const summary = items.map((item) => item.name).join(' + ') || 'Vacuum Pump Standard W-Tech';

    let sellerName = 'Checkout Automático';
    if (checkout.followup_assigned_to) {
        const { data: seller } = await supabase.from('SITE_Users').select('name').eq('id', checkout.followup_assigned_to).maybeSingle();
        if (seller?.name) sellerName = seller.name;
    }

    const { data: sale, error: saleError } = await supabase
        .from('SITE_Sales')
        .insert([
            {
                channel: 'Site',
                status: 'paid',
                payment_status: 'paid',
                shipping_status: 'pending',
                payment_method: paymentMethodLabel(payment),
                total_value: total,
                client_id: checkout.lead_id || null,
                client_name: checkout.name,
                client_email: checkout.email,
                client_phone: checkout.phone,
                customer_name: checkout.name,
                customer_email: checkout.email,
                customer_phone: checkout.phone,
                lead_id: checkout.lead_id || null,
                seller_id: checkout.followup_assigned_to || null,
                seller_name: sellerName,
                sale_date: dateSP(new Date(now)),
                sale_summary: summary,
                // Sem linhas em SITE_SaleItems: estes itens ainda não existem no catálogo
                // (SITE_Products), e o editor de pedidos lê este JSON quando não há linhas.
                items: items.map((item) => ({ id: item.id, name: item.name, price: item.price, quantity: 1 })),
                order_number: orderNumber,
                shipping_method: checkout.shipping?.method || null,
                shipping_cost: Number(checkout.shipping?.cost) || 0,
                estimated_delivery_date: dateSP(deadline),
                delivery_cep: address.cep || null,
                delivery_street: address.street || null,
                delivery_number: address.number || null,
                delivery_neighborhood: address.neighborhood || null,
                delivery_city: address.city || null,
                delivery_state: address.state || null,
                delivery_address: [address.street, address.number, address.complement, address.neighborhood, address.city, address.state]
                    .filter(Boolean)
                    .join(', ') || null,
                notes: `Black Friday Vacuum Pump. CPF/CNPJ: ${checkout.document || 'não informado'}. Pagamento MP ${paymentId}.`,
                campaign: VACUUM_CAMPAIGN,
                mp_payment_id: paymentId,
            },
        ])
        .select('id, order_number')
        .single();

    if (saleError) {
        // 23505: o outro caminho (webhook ou resposta síncrona) gravou primeiro.
        if (saleError.code === '23505') {
            const { data: winner } = await supabase.from('SITE_Sales').select('id, order_number').eq('mp_payment_id', paymentId).maybeSingle();
            if (winner) {
                await markCheckoutPaid(supabase, checkout.id, winner.id, payment);
                return { saleId: winner.id, orderNumber: winner.order_number };
            }
        }
        throw new Error(`Falha ao gravar venda: ${saleError.message}`);
    }

    await markCheckoutPaid(supabase, checkout.id, sale.id, payment);
    clearVacuumOfferCache();
    console.log(`[Vacuum] Venda ${sale.order_number} confirmada (pagamento ${paymentId}) ✓`);

    // A venda já está segura. Daqui em diante nada pode derrubar a confirmação.
    try {
        const { error: txError } = await supabase.from('SITE_Transactions').insert([
            {
                description: `Vacuum Pump Black Friday ${sale.order_number} (MP ${paymentId})`,
                amount: total,
                type: 'Income',
                category: 'Sales',
                status: 'Completed',
                payment_method: 'Mercado Pago',
                lead_id: checkout.lead_id || null,
                currency: 'BRL',
                date: new Date(now).toISOString(),
            },
        ]);
        if (txError) console.error('[Vacuum] Falha no financeiro (não-fatal):', txError.message);

        await convertLead(supabase, checkout, { id: sale.id, total, orderNumber: sale.order_number });
    } catch (err: any) {
        console.error('[Vacuum] Erro em tarefa secundária (não-fatal):', err?.message);
    }

    const shippingNote = checkout.shipping?.method === 'gratis_sp'
        ? 'Frete grátis para o estado de São Paulo.'
        : checkout.shipping?.method === 'a_combinar'
            ? 'Nossa equipe combina o frete com você no WhatsApp.'
            : '';
    void sendConfirmationEmail({ ...checkout, items, amount: total }, sale.order_number, deadline, shippingNote).catch((err) =>
        console.error('[Vacuum] Falha no e-mail (não-fatal):', err?.message)
    );

    return { saleId: sale.id, orderNumber: sale.order_number };
}

async function markCheckoutPaid(supabase: any, checkoutId: string, saleId: string, payment: any): Promise<void> {
    const { error } = await supabase
        .from(CHECKOUTS)
        .update({
            stage: 'paid',
            sale_id: saleId,
            mp_payment_id: String(payment.id),
            payment_status: payment.status,
            payment_status_detail: payment.status_detail || null,
            installments: Number(payment.installments) || 1,
            paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq('id', checkoutId);
    if (error) console.error('[Vacuum] Falha ao marcar checkout pago (não-fatal):', error.message);
}

/** Notificação do Mercado Pago para um pagamento desta campanha. */
export async function handleVacuumPaymentEvent(supabase: any, payment: any): Promise<Record<string, unknown>> {
    const checkoutId = checkoutIdFromPayment(payment);
    if (!checkoutId) return { skipped: 'referência inválida' };

    const { data: checkout, error } = await supabase.from(CHECKOUTS).select('*').eq('id', checkoutId).maybeSingle();
    if (error) throw new Error(`Consulta de checkout falhou: ${error.message}`);
    if (!checkout) {
        console.error(`[Vacuum] Checkout ${checkoutId} não encontrado para o pagamento ${payment.id}`);
        return { skipped: 'checkout não encontrado' };
    }

    const status = payment.status as string;
    if (status === 'approved') {
        const { orderNumber } = await finalizeVacuumPayment(supabase, checkout, payment);
        return { status, order_number: orderNumber };
    }

    // Estorno e chargeback devolvem a unidade ao lote: a contagem só olha venda paga.
    if (status === 'refunded' || status === 'charged_back' || (status === 'cancelled' && checkout.stage === 'paid')) {
        const { error: cancelError } = await supabase
            .from('SITE_Sales')
            .update({ status: 'cancelled', payment_status: status, updated_at: new Date().toISOString() })
            .eq('mp_payment_id', String(payment.id));
        if (cancelError) throw new Error(`Falha ao cancelar venda: ${cancelError.message}`);
        clearVacuumOfferCache();
        return { status, cancelled: true };
    }

    // Notificação atrasada de uma tentativa antiga não pode mexer na tentativa atual.
    if (checkout.stage === 'paid' || (checkout.mp_payment_id && checkout.mp_payment_id !== String(payment.id))) {
        return { status, skipped: 'tentativa antiga' };
    }

    const stage = status === 'rejected' ? 'rejected' : status === 'cancelled' ? 'expired' : checkout.stage;
    const { error: updateError } = await supabase
        .from(CHECKOUTS)
        .update({
            stage,
            payment_status: status,
            payment_status_detail: payment.status_detail || null,
            updated_at: new Date().toISOString(),
        })
        .eq('id', checkout.id);
    if (updateError) throw new Error(`Falha ao atualizar checkout: ${updateError.message}`);
    return { status, stage };
}

function followUpReason(checkout: any): string {
    switch (checkout.stage) {
        case 'contact':
            return 'Pediu para ser chamado na página da Vacuum Pump.';
        case 'lead':
            return 'Preencheu nome e WhatsApp no checkout e parou antes do endereço.';
        case 'address':
            return 'Preencheu o endereço e parou antes do pagamento.';
        case 'payment':
            return 'Chegou na tela de pagamento e não finalizou.';
        case 'pix_pending':
            return 'Gerou o Pix e não pagou.';
        case 'expired':
            return 'O Pix venceu sem pagamento.';
        case 'rejected':
            return `Cartão recusado (${checkout.payment_status_detail || 'sem detalhe'}). O vendedor pode ajudar a dividir em mais de um cartão.`;
        default:
            return `Parou na etapa ${checkout.stage}.`;
    }
}

/**
 * Entrega a pessoa ao vendedor: lead no CRM com responsável e tarefa de ligação.
 * A tarefa existe porque cliente antigo fica na coluna de ganhos (status nunca é
 * rebaixado) e o vendedor não o veria entre os novos.
 */
export async function assignFollowUp(supabase: any, checkout: any): Promise<{ assigned: boolean; assigned_to?: string | null; detail?: string }> {
    // Só um processo consegue reservar: varredura simultânea não gera tarefa em dobro.
    const nowIso = new Date().toISOString();
    const { data: claimed, error: claimError } = await supabase
        .from(CHECKOUTS)
        .update({ followup_at: nowIso })
        .eq('id', checkout.id)
        .is('followup_at', null)
        .select('id');
    if (claimError) throw new Error(`Falha ao reservar follow-up: ${claimError.message}`);
    if (!claimed?.length) return { assigned: false, detail: 'já encaminhado' };

    const lead = checkout.lead_id
        ? (await supabase.from('SITE_Leads').select('*').eq('id', checkout.lead_id).maybeSingle()).data
        : await findExistingLead<any>(supabase, { email: checkout.email, phone: checkout.phone });

    // O dono atual continua com o cliente dele, se ainda estiver ativo na roleta.
    let attendantId: string | null = null;
    if (isUuid(lead?.assigned_to)) {
        const { data: owner } = await supabase
            .from('SITE_Users')
            .select('id')
            .eq('id', lead.assigned_to)
            .eq('status', 'Active')
            .eq('receives_leads', true)
            .maybeSingle();
        if (owner) attendantId = owner.id;
    }
    if (!attendantId) attendantId = (await pickNextAttendant(supabase))?.id ?? null;

    const reason = followUpReason(checkout);
    const itemsText = (checkout.items || []).map((item: VacuumCartItem) => item.name).join(' + ');
    const amountText = checkout.amount ? ` Carrinho: ${itemsText} (${formatBRL(Number(checkout.amount))}).` : '';
    const note = `[Vacuum Pump BF ${nowIso.slice(0, 16).replace('T', ' ')}] ${reason}${amountText}`;

    if (lead) {
        const reopen = !isWonStatus(lead.status) && ['Rejected', 'Cold', '', null, undefined].includes(lead.status);
        const { error } = await supabase
            .from('SITE_Leads')
            .update({
                assigned_to: attendantId,
                ...(reopen ? { status: 'New' } : {}),
                tags: Array.from(new Set([...(lead.tags || []), 'vacuum_bf', 'vacuum_bf_chamar'])),
                internal_notes: appendNote(lead.internal_notes, note),
                updated_at: nowIso,
            })
            .eq('id', lead.id);
        if (error) console.error('[Vacuum] Falha ao atualizar lead do follow-up:', error.message);
    }

    const { error: taskError } = await supabase.from('SITE_Tasks').insert([
        {
            title: `Chamar no WhatsApp: ${checkout.name} (Vacuum Pump)`,
            description: `${reason}${amountText}\nWhatsApp: ${checkout.phone}${checkout.email ? `\nE-mail: ${checkout.email}` : ''}`,
            due_date: nowIso,
            status: 'TODO',
            priority: checkout.stage === 'rejected' || checkout.stage === 'contact' ? 'URGENT' : 'HIGH',
            assigned_to: attendantId,
            lead_id: lead?.id || null,
            tags: ['vacuum_bf'],
        },
    ]);
    if (taskError) console.error('[Vacuum] Falha ao criar tarefa do follow-up:', taskError.message);

    const { error: assignError } = await supabase.from(CHECKOUTS).update({ followup_assigned_to: attendantId }).eq('id', checkout.id);
    if (assignError) console.error('[Vacuum] Falha ao gravar responsável:', assignError.message);

    return { assigned: true, assigned_to: attendantId };
}

/** Varredura do cron: quem parou há um tempo vai para o vendedor. Uma vez só por checkout. */
export async function sweepVacuumAbandoned(supabase: any, now = Date.now()): Promise<{ analyzed: number; assigned: number }> {
    const { data, error } = await supabase
        .from(CHECKOUTS)
        .select('*')
        .eq('campaign', VACUUM_CAMPAIGN)
        .in('stage', ABANDONED_STAGES)
        .is('followup_at', null)
        .lt('updated_at', new Date(now - REJECTED_ABANDON_AFTER_MS).toISOString())
        .order('updated_at', { ascending: true })
        .limit(100);
    if (error) throw new Error(`Varredura falhou: ${error.message}`);

    let assigned = 0;
    for (const checkout of data || []) {
        const age = now - Date.parse(checkout.updated_at);
        const limit = checkout.stage === 'rejected' ? REJECTED_ABANDON_AFTER_MS : ABANDON_AFTER_MS;
        if (age < limit) continue;
        const result = await assignFollowUp(supabase, checkout);
        if (result.assigned) assigned += 1;
    }
    return { analyzed: data?.length ?? 0, assigned };
}
