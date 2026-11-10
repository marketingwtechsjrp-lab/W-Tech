import { checkComboPlan, describeComboParts, type ComboPlan } from '../lib/vacuumCombo.js';
import type { VacuumCart, VacuumOfferState } from '../lib/vacuumOffer.js';
import {
    PIX_EXPIRATION_MS,
    buildPaymentPayload,
    captureMpPayment,
    createMpPayment,
    fetchMpPayment,
    rejectionMessage,
    releaseMpPayment,
    type VacuumShippingCharge,
} from './_vacuumMp.js';
import { clearVacuumOfferCache, finalizeVacuumPayment, handleVacuumPaymentEvent, isUuid, readMercadoPagoToken } from './_vacuumPump.js';

/**
 * Pagamento combinado da Vacuum Pump: parte no Pix (opcional) e de 1 a 3 cartões.
 *
 * Nada é cobrado pela metade. Os cartões são só reservados (`capture: false`); a cobrança sai
 * quando todas as partes estão garantidas:
 *   - sem Pix: reservou todos os cartões → captura todos → venda.
 *   - com Pix: reservou os cartões → gera o Pix da parte → Pix pago → captura os cartões → venda.
 * Qualquer cartão recusado, Pix vencido ou captura que falhe desfaz o resto: reserva cancelada,
 * Pix cancelado e o que já tiver sido cobrado volta em estorno.
 *
 * O andamento fica em `SITE_CampaignCheckouts.split_payments` (ComboRecord). Cada pagamento leva
 * `metadata.combo_attempt` e `metadata.combo_part`, e é assim que o webhook o reconhece.
 */

const CHECKOUTS = 'SITE_CampaignCheckouts';
/** Pagamento em andamento trava outro envio; passado isso, entende-se que o processo caiu. */
const IN_FLIGHT_MS = 3 * 60 * 1000;
/** Pix da combinação vencido há mais que isso: a varredura desfaz as reservas. */
const PIX_GRACE_MS = 5 * 60 * 1000;

type ComboState = 'authorizing' | 'awaiting_pix' | 'capturing' | 'done' | 'releasing' | 'failed';

interface ComboPart {
    id: string | null;
    amount: number;
    status: string;
    detail?: string | null;
}

interface ComboCardPart extends ComboPart {
    installments: number;
}

interface ComboPixPart extends ComboPart {
    /** Quanto do pedido o Pix cobre, em preço de cartão. `amount` é o que se paga, já com desconto. */
    value: number;
    discount: number;
}

export interface ComboRecord {
    attempt: string;
    state: ComboState;
    total: number;
    pix: ComboPixPart | null;
    cards: ComboCardPart[];
    started_at: string;
    /** Algum pagamento não foi desfeito no Mercado Pago: a equipe precisa estornar à mão. */
    release_failed?: string[];
}

export interface PreparedCharge {
    checkout: any;
    state: VacuumOfferState;
    cart: VacuumCart;
    shipping: VacuumShippingCharge;
    token: string;
    /** Parte mínima de cada forma de pagamento (menor no link de teste). */
    minPart: number;
}

export interface ComboResult {
    httpStatus: number;
    body?: Record<string, unknown>;
    checkout?: any;
    message?: string;
}

function recordOf(checkout: any): ComboRecord | null {
    const record = checkout?.split_payments;
    return record && typeof record === 'object' && typeof record.attempt === 'string' ? (record as ComboRecord) : null;
}

function isStale(checkout: any): boolean {
    return Date.now() - Date.parse(checkout?.updated_at) > IN_FLIGHT_MS;
}

/**
 * Combinação parada esperando a pessoa, que pode ser desfeita para outro pagamento: o Pix da parte
 * em aberto, ou uma reserva de cartões cujo processo caiu.
 */
export function hasOpenCombo(checkout: any): boolean {
    const record = recordOf(checkout);
    if (!record || checkout.stage === 'paid') return false;
    return record.state === 'awaiting_pix' || (['authorizing', 'releasing'].includes(record.state) && isStale(checkout));
}

/** Estado de onde `releaseVacuumCombo` deve tomar uma combinação aberta (ver hasOpenCombo). */
export function openComboState(checkout: any): ComboState | null {
    return hasOpenCombo(checkout) ? (recordOf(checkout) as ComboRecord).state : null;
}

/**
 * Combinação com um processo trabalhando nela agora (reservando, cobrando, desfazendo) ou cobrada
 * sem a venda gravada: outro pagamento neste momento cobraria duas vezes ou desfaria uma cobrança.
 */
export function comboInFlight(checkout: any): boolean {
    const record = recordOf(checkout);
    if (!record || checkout.stage === 'paid') return false;
    if (['authorizing', 'releasing'].includes(record.state)) return !isStale(checkout);
    return ['capturing', 'done'].includes(record.state);
}

function partIds(record: ComboRecord): string[] {
    return [record.pix?.id, ...record.cards.map((card) => card.id)].filter((id): id is string => !!id);
}

/**
 * Grava a combinação só se ela ainda é a mesma tentativa e está no estado esperado: outro processo
 * que já a desfez ou cobrou não é sobrescrito. Devolve null quando não gravou.
 */
async function saveRecord(supabase: any, checkoutId: string, record: ComboRecord, whileState: ComboState, fields: Record<string, unknown> = {}): Promise<any | null> {
    const { data, error } = await supabase
        .from(CHECKOUTS)
        .update({ split_payments: record, updated_at: new Date().toISOString(), ...fields })
        .eq('id', checkoutId)
        .eq('split_payments->>attempt', record.attempt)
        .eq('split_payments->>state', whileState)
        .select('*')
        .maybeSingle();
    if (error) console.error('[Vacuum] Falha ao gravar a combinação:', error.message);
    return data ?? null;
}

/** Tenta de novo uma vez: perder o id de um pagamento criado deixaria dinheiro sem dono. */
async function saveRecordOrRetry(supabase: any, checkoutId: string, record: ComboRecord, whileState: ComboState, fields: Record<string, unknown> = {}): Promise<any | null> {
    return (await saveRecord(supabase, checkoutId, record, whileState, fields)) ?? saveRecord(supabase, checkoutId, record, whileState, fields);
}

/** Pagamento que o Mercado Pago não deixou desfazer: vira tarefa urgente, além do log. */
async function flagManualRefund(supabase: any, checkout: any, record: ComboRecord, ids: string[]): Promise<void> {
    console.error(`[Vacuum] Combinação ${record.attempt} do checkout ${checkout.id}: pagamentos não desfeitos, estornar à mão: ${ids.join(', ')}`);
    const { error } = await supabase.from('SITE_Tasks').insert([
        {
            title: `Estornar no Mercado Pago: ${checkout.name || 'cliente'} (Vacuum Pump, pagamento combinado)`,
            description: `O pagamento combinado não foi concluído e estes pagamentos não foram desfeitos sozinhos: ${ids.join(', ')}. Confira no Mercado Pago e estorne ou cancele.\nPartes: ${describeComboParts(record)}\nWhatsApp: ${checkout.phone || '-'}`,
            due_date: new Date().toISOString(),
            status: 'TODO',
            priority: 'URGENT',
            lead_id: checkout.lead_id || null,
            tags: ['vacuum_bf'],
        },
    ]);
    if (error) console.error('[Vacuum] Falha ao criar a tarefa de estorno:', error.message);
}

/**
 * Desfaz tudo o que a combinação reservou ou cobrou: cartão recusado, Pix vencido, troca de forma de
 * pagamento ou captura que falhou. Antes de mexer no Mercado Pago, toma a combinação para si
 * (estado `releasing`): quem chega atrasado, com uma leitura antiga, não desfaz uma combinação que
 * outro processo já está cobrando. Devolve null se não foi este processo que desfez.
 */
export async function releaseVacuumCombo(
    supabase: any,
    token: string,
    checkout: any,
    stage: 'expired' | 'rejected',
    detail?: string | null,
    options: { record?: ComboRecord; from?: ComboState[] } = {}
): Promise<any | null> {
    const record = options.record || recordOf(checkout);
    if (!record) return null;
    const from = options.from || ['authorizing', 'awaiting_pix'];
    const { data: claimed, error: claimError } = await supabase
        .from(CHECKOUTS)
        .update({ split_payments: { ...record, state: 'releasing' }, updated_at: new Date().toISOString() })
        .eq('id', checkout.id)
        .eq('split_payments->>attempt', record.attempt)
        .in('split_payments->>state', from)
        .neq('stage', 'paid')
        .select('id');
    if (claimError) throw new Error(`Falha ao reservar o desfazimento: ${claimError.message}`);
    if (!claimed?.length) return null;

    // Pix pago no último segundo também volta: releaseMpPayment estorna o que já foi aprovado.
    const ids = partIds(record);
    const results = await Promise.all(ids.map(async (id) => ({ id, ok: await releaseMpPayment(token, id) })));
    const failed = results.filter((item) => !item.ok).map((item) => item.id);
    if (failed.length) await flagManualRefund(supabase, checkout, record, failed);

    return saveRecordOrRetry(supabase, checkout.id, { ...record, state: 'failed', ...(failed.length ? { release_failed: failed } : {}) }, 'releasing', {
        stage,
        payment_status: stage === 'expired' ? 'cancelled' : 'rejected',
        payment_status_detail: detail ?? null,
    });
}

/** Pagamento que a venda grava: um registro só, com as partes descritas. */
function comboPayment(record: ComboRecord) {
    const primary = record.cards[0];
    return {
        id: primary.id,
        status: 'approved',
        status_detail: 'accredited',
        installments: primary.installments,
        payment_method_id: 'combo',
        transaction_amount: record.total,
        combo: record,
    };
}

/**
 * Reserva o direito de capturar: webhook, consulta de status e varredura podem chegar juntos,
 * e só um cobra os cartões.
 */
async function claimCapture(supabase: any, checkout: any, record: ComboRecord, from: ComboState[]): Promise<boolean> {
    const staleCapture = record.state === 'capturing' && isStale(checkout);
    if (!from.includes(record.state) && !staleCapture) return false;
    let query = supabase
        .from(CHECKOUTS)
        .update({ split_payments: { ...record, state: 'capturing' }, updated_at: new Date().toISOString() })
        .eq('id', checkout.id)
        .eq('split_payments->>attempt', record.attempt)
        .eq('split_payments->>state', record.state);
    // Retomar uma captura parada: só um retoma, quem leu a mesma versão da linha.
    if (staleCapture) query = query.eq('updated_at', checkout.updated_at);
    const { data, error } = await query.select('id');
    if (error) throw new Error(`Falha ao reservar a captura: ${error.message}`);
    return !!data?.length;
}

/** Cobra os cartões reservados e grava a venda. Se um cartão não cobrar, desfaz a combinação inteira. */
async function completeCombo(supabase: any, token: string, checkout: any, record: ComboRecord, from: ComboState[]): Promise<{ checkout: any; message?: string }> {
    if (!(await claimCapture(supabase, checkout, record, from))) return { checkout };

    const captured = await Promise.all(record.cards.map((card) => (card.id ? captureMpPayment(token, card.id) : Promise.resolve(false))));
    if (captured.some((ok) => !ok)) {
        const failedIndex = captured.findIndex((ok) => !ok);
        console.error(`[Vacuum] Captura do cartão ${failedIndex + 1} falhou no checkout ${checkout.id}: desfazendo a combinação.`);
        const released = await releaseVacuumCombo(supabase, token, checkout, 'rejected', 'combo_capture_failed', { record, from: ['capturing'] });
        return {
            checkout: released || checkout,
            message: `O cartão ${failedIndex + 1} não confirmou a cobrança. Nada ficou cobrado: o que foi pago volta em estorno. Tente de novo ou chame um vendedor.`,
        };
    }

    const done: ComboRecord = {
        ...record,
        state: 'done',
        cards: record.cards.map((card) => ({ ...card, status: 'approved' })),
        ...(record.pix ? { pix: { ...record.pix, status: 'approved' } } : {}),
    };
    const saved = (await saveRecordOrRetry(supabase, checkout.id, done, 'capturing', { stage: 'review', payment_status: 'approved' })) || { ...checkout, split_payments: done };
    try {
        await finalizeVacuumPayment(supabase, { ...saved, amount: done.total }, comboPayment(done));
    } catch (err: any) {
        // O dinheiro já entrou. O webhook e a consulta de status tentam gravar de novo.
        console.error(`[Vacuum] Combinação ${done.attempt} cobrada, venda não gravada:`, err?.message);
        return { checkout: saved };
    }
    const { data: fresh } = await supabase.from(CHECKOUTS).select('*').eq('id', checkout.id).maybeSingle();
    return { checkout: fresh || { ...saved, stage: 'paid' } };
}

function sanitizeKey(value: unknown): string {
    return String(value || '').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 40) || String(Date.now());
}

/** POST pay_combo: valida o plano, reserva os cartões e, se houver, gera o Pix da parte. */
export async function payVacuumCombo(supabase: any, prepared: PreparedCharge, body: any): Promise<ComboResult> {
    const { checkout, state, cart, shipping, token } = prepared;
    const check = checkComboPlan(cart, state.installments, body.pix_value, body.cards, prepared.minPart);
    if (!check.plan) return { httpStatus: 400, body: { error: check.error } };
    const plan: ComboPlan = check.plan;
    if (Math.abs(plan.total - Number(body.expected_total)) > 0.009) {
        return { httpStatus: 409, body: { error: 'O valor da oferta mudou. Confira o novo total antes de pagar.', code: 'price_changed', total: plan.total } };
    }
    const forms: any[] = body.cards.map((card: any) => card?.form_data || {});
    if (forms.some((form) => !form.token || !form.payment_method_id)) {
        return { httpStatus: 400, body: { error: 'Dados de um dos cartões incompletos. Digite os cartões de novo.' } };
    }

    const attempt = sanitizeKey(body.attempt_key);
    let record: ComboRecord = {
        attempt,
        state: 'authorizing',
        total: plan.total,
        pix: plan.pixValue > 0 ? { id: null, value: plan.pixValue, amount: plan.pixCharge, discount: plan.pixDiscount, status: 'new' } : null,
        cards: plan.cards.map((card) => ({ id: null, amount: card.amount, installments: card.installments, status: 'new' })),
        started_at: new Date().toISOString(),
    };

    // Um pagamento por vez: outro envio no meio deste reservaria os cartões duas vezes.
    const staleBefore = new Date(Date.now() - IN_FLIGHT_MS).toISOString();
    const { data: claimed, error: claimError } = await supabase
        .from(CHECKOUTS)
        .update({
            stage: 'review',
            split_payments: record,
            items: cart.items,
            shipping,
            bumps: cart.bump_ids,
            amount: plan.total,
            installments: plan.cards[0].installments,
            payment_status: 'authorizing',
            payment_status_detail: null,
            // Sem resto de tentativa anterior: a consulta de status não pode olhar um pagamento antigo.
            mp_payment_id: null,
            pix_qr_code: null,
            pix_qr_code_base64: null,
            pix_expires_at: null,
            payment_attempts: (checkout.payment_attempts || 0) + 1,
            updated_at: new Date().toISOString(),
        })
        .eq('id', checkout.id)
        .neq('stage', 'paid')
        .or(`stage.neq.review,updated_at.lt."${staleBefore}"`)
        .select('*');
    if (claimError) throw new Error(claimError.message);
    if (!claimed?.length) {
        return { httpStatus: 409, body: { error: 'Já existe um pagamento em andamento. Aguarde alguns segundos.', code: 'in_flight' } };
    }
    let current = claimed[0];

    const fail = async (stage: 'expired' | 'rejected', detail: string | null, message: string): Promise<ComboResult> => {
        const released = await releaseVacuumCombo(supabase, token, current, stage, detail, { record });
        // Outro processo já desfez com a versão gravada, que pode não ter o último pagamento criado aqui.
        if (!released) {
            const ids = partIds(record);
            const results = await Promise.all(ids.map((id) => releaseMpPayment(token, id)));
            const failed = ids.filter((_, index) => !results[index]);
            if (failed.length) await flagManualRefund(supabase, current, record, failed);
        }
        return { httpStatus: 200, checkout: released || { ...current, stage }, message };
    };

    const total = plan.cards.length;
    for (const [index, card] of plan.cards.entries()) {
        const payload = buildPaymentPayload(current, cart, shipping, {
            amount: card.amount,
            installments: card.installments,
            isPix: false,
            form: forms[index],
            capture: false,
            description: `Vacuum Pump Standard W-Tech - Black Friday (cartão ${index + 1} de ${total})`,
            metadata: { combo_attempt: attempt, combo_part: `card${index + 1}` },
        });
        const created = await createMpPayment(token, payload, `${checkout.id}:${attempt}:c${index + 1}`).catch((err) => {
            console.error(`[Vacuum] Cartão ${index + 1} da combinação sem resposta:`, err?.message);
            return null;
        });
        const payment = created?.data;
        const part: ComboCardPart = { ...record.cards[index], id: payment?.id ? String(payment.id) : null, status: payment?.status || 'error', detail: payment?.status_detail || null };
        record = { ...record, cards: record.cards.map((item, position) => (position === index ? part : item)) };
        // "approved" não deveria vir com capture=false, mas se vier o valor já está garantido.
        if (!created?.ok || !['authorized', 'approved'].includes(payment?.status)) {
            console.warn(`[Vacuum] Cartão ${index + 1} da combinação recusado: ${payment?.status_detail || payment?.message || 'sem detalhe'}`);
            const reason = payment?.status_detail ? rejectionMessage(payment.status_detail) : 'O pagamento não foi aprovado.';
            return fail('rejected', payment?.status_detail || 'combo_card_rejected', `Cartão ${index + 1}: ${reason} Nenhum valor foi cobrado.`);
        }
        const savedCard = await saveRecordOrRetry(supabase, checkout.id, record, 'authorizing');
        if (!savedCard) return fail('rejected', 'combo_save_failed', 'Não foi possível concluir agora. Nenhum valor foi cobrado. Tente de novo ou chame um vendedor.');
        current = savedCard;
    }

    if (!record.pix) {
        const done = await completeCombo(supabase, token, current, record, ['authorizing']);
        return { httpStatus: 200, checkout: done.checkout, message: done.message };
    }

    const pixPart = record.pix;
    const pixPayload = buildPaymentPayload(current, cart, shipping, {
        amount: pixPart.amount,
        installments: 1,
        isPix: true,
        form: {},
        description: 'Vacuum Pump Standard W-Tech - Black Friday (parte no Pix)',
        metadata: { combo_attempt: attempt, combo_part: 'pix', pix_discount: pixPart.discount },
    });
    const createdPix = await createMpPayment(token, pixPayload, `${checkout.id}:${attempt}:pix`).catch(() => null);
    const pix = createdPix?.data;
    if (!createdPix?.ok || !pix?.id) {
        console.error('[Vacuum] Pix da combinação não foi gerado:', pix?.message || 'sem detalhe');
        return fail('rejected', 'combo_pix_failed', 'Não foi possível gerar o Pix. Nenhum valor foi cobrado. Tente de novo ou chame um vendedor.');
    }
    record = { ...record, state: 'awaiting_pix', pix: { ...pixPart, id: String(pix.id), status: pix.status } };
    const pixData = pix.point_of_interaction?.transaction_data;
    const saved = await saveRecordOrRetry(supabase, checkout.id, record, 'authorizing', {
        stage: 'pix_pending',
        mp_payment_id: String(pix.id),
        payment_status: pix.status,
        pix_qr_code: pixData?.qr_code || null,
        pix_qr_code_base64: pixData?.qr_code_base64 || null,
        pix_expires_at: pix.date_of_expiration || new Date(Date.now() + PIX_EXPIRATION_MS).toISOString(),
    });
    // Sem o id do Pix gravado, um Pix pago não teria dono: desfaz tudo agora.
    if (!saved) return fail('rejected', 'combo_save_failed', 'Não foi possível concluir agora. Nenhum valor foi cobrado. Tente de novo ou chame um vendedor.');
    return { httpStatus: 200, checkout: saved };
}

/** Notificação de um pagamento da campanha: o da combinação tem fluxo próprio. */
export async function handleVacuumPaymentNotice(supabase: any, payment: any): Promise<Record<string, unknown>> {
    const attempt = payment?.metadata?.combo_attempt;
    if (!attempt) return handleVacuumPaymentEvent(supabase, payment);

    const checkoutId = payment?.metadata?.checkout_id;
    if (!isUuid(checkoutId)) return { skipped: 'combinação sem checkout' };
    const { data: checkout, error } = await supabase.from(CHECKOUTS).select('*').eq('id', checkoutId).maybeSingle();
    if (error) throw new Error(`Consulta de checkout falhou: ${error.message}`);
    if (!checkout) return { skipped: 'checkout não encontrado' };

    const record = recordOf(checkout);
    const paymentId = String(payment.id);
    const status = String(payment.status);
    const current = !!record && record.attempt === String(attempt) && partIds(record).includes(paymentId);

    // Estorno ou chargeback de qualquer parte cancela a venda; as outras partes voltam à mão.
    if (['refunded', 'charged_back'].includes(status) || (status === 'cancelled' && checkout.stage === 'paid')) {
        if (!current || checkout.stage !== 'paid' || !checkout.sale_id) return { status, skipped: 'parte fora da venda' };
        const { error: cancelError } = await supabase
            .from('SITE_Sales')
            .update({ status: 'cancelled', payment_status: status, updated_at: new Date().toISOString() })
            .eq('id', checkout.sale_id);
        if (cancelError) throw new Error(`Falha ao cancelar venda: ${cancelError.message}`);
        clearVacuumOfferCache();
        console.error(`[Vacuum] Parte ${paymentId} da venda combinada ${checkout.sale_id} voltou (${status}). Estornar as outras partes à mão: ${describeComboParts(record as ComboRecord)}`);
        return { status, cancelled: true };
    }
    if (!current || !record) return { status, skipped: 'tentativa antiga' };

    const token = await readMercadoPagoToken(supabase);
    if (!token) throw new Error('mercadopago_access_token ausente');
    const isPixPart = payment?.metadata?.combo_part === 'pix';

    if (isPixPart && record.state === 'awaiting_pix') {
        if (status === 'approved') {
            const done = await completeCombo(supabase, token, checkout, record, ['awaiting_pix']);
            return { status, stage: done.checkout?.stage };
        }
        if (['cancelled', 'rejected'].includes(status)) {
            await releaseVacuumCombo(supabase, token, checkout, 'expired', payment.status_detail || 'expired', { from: ['awaiting_pix'] });
            return { status, stage: 'expired' };
        }
    }
    // Cobrado e sem venda gravada (falha no meio): grava agora. A venda é idempotente.
    if (record.state === 'done' && checkout.stage !== 'paid') {
        await finalizeVacuumPayment(supabase, { ...checkout, amount: record.total }, comboPayment(record));
        return { status, stage: 'paid' };
    }
    // Captura interrompida no meio: retoma depois do prazo de quem estava capturando.
    if (record.state === 'capturing') {
        const done = await completeCombo(supabase, token, checkout, record, []);
        return { status, stage: done.checkout?.stage };
    }
    return { status, skipped: `combinação em ${record.state}` };
}

/**
 * Cron: combinação esquecida. Pix vencido sem pagamento desfaz as reservas dos cartões; reserva
 * presa no meio (processo caiu) também.
 */
export async function sweepVacuumCombos(supabase: any, now = Date.now()): Promise<{ released: number; completed: number }> {
    const { data, error } = await supabase
        .from(CHECKOUTS)
        .select('*')
        .in('split_payments->>state', ['authorizing', 'awaiting_pix', 'capturing', 'done', 'releasing'])
        .neq('stage', 'paid')
        .lt('updated_at', new Date(now - IN_FLIGHT_MS).toISOString())
        .limit(50);
    if (error) throw new Error(`Varredura de combinações falhou: ${error.message}`);
    const token = (data || []).length ? await readMercadoPagoToken(supabase) : null;
    if (!token) return { released: 0, completed: 0 };

    let released = 0;
    let completed = 0;
    for (const checkout of data || []) {
        // Uma linha com problema não pode travar as outras: registra e segue.
        try {
            const record = recordOf(checkout);
            if (!record || checkout.stage === 'paid') continue;
            if (record.state === 'awaiting_pix' && record.pix?.id) {
                const pix = await fetchMpPayment(token, record.pix.id);
                // Sem resposta do Mercado Pago não dá para saber se o Pix caiu: tenta na próxima varredura.
                if (!pix) continue;
                if (pix.status === 'approved') {
                    const done = await completeCombo(supabase, token, checkout, record, ['awaiting_pix']);
                    if (done.checkout?.stage === 'paid') completed += 1;
                    continue;
                }
                const expired = Date.parse(checkout.pix_expires_at) + PIX_GRACE_MS < now;
                if (!expired && !['cancelled', 'rejected'].includes(pix.status)) continue;
                if (await releaseVacuumCombo(supabase, token, checkout, 'expired', 'expired', { from: ['awaiting_pix'] })) released += 1;
            } else if (record.state === 'done') {
                // Cobrado e sem venda gravada, e o webhook não veio: grava agora. A venda é idempotente.
                await finalizeVacuumPayment(supabase, { ...checkout, amount: record.total }, comboPayment(record));
                completed += 1;
            } else if (record.state === 'capturing') {
                const done = await completeCombo(supabase, token, checkout, record, []);
                if (done.checkout?.stage === 'paid') completed += 1;
            } else if (record.state === 'authorizing' || record.state === 'releasing') {
                // Reserva ou desfazimento interrompido: desfazer de novo é seguro, o Mercado Pago ignora o que já voltou.
                if (await releaseVacuumCombo(supabase, token, checkout, 'rejected', 'combo_interrupted', { from: [record.state] })) released += 1;
            }
        } catch (err: any) {
            console.error(`[Vacuum] Varredura da combinação do checkout ${checkout.id} falhou:`, err?.message);
        }
    }
    return { released, completed };
}
