import { findExistingLead, isWonStatus } from '../lib/leadMatch.js';
import { PUBLIC_BASE_URL } from '../lib/publicUrl.js';
import {
    VACUUM_CAMPAIGN,
    VACUUM_DIRECT_REF,
    computeVacuumCart,
    documentType,
    isValidEmail,
    normalizeBrPhone,
    onlyDigits,
} from '../lib/vacuumOffer.js';
import { VACUUM_TEST_CAMPAIGN, VACUUM_TEST_MIN_PART, isVacuumTestCampaign, vacuumTestOfferState } from '../lib/vacuumTest.js';
import { COMBO_MIN_PART } from '../lib/vacuumCombo.js';
import { checkoutPrivateOffer, vacuumPrivateOfferState } from '../lib/vacuumPrivateOffer.js';
import { getServiceClient } from './_auth.js';
import { denyCron, isCronAuthorized } from './_cron.js';
import { handleVacuumDashboard, handleVacuumGoals } from './_vacuumDashboard.js';
import { handleVacuumSaleCreate, handleVacuumSaleStatus, handleVacuumSaleUpdate, handleVacuumSalesList } from './_vacuumSales.js';
import { getRequestClientIp } from './_geoip.js';
import { retryVacuumOrderWhatsApp } from './_vacuumWhatsApp.js';
import {
    assignFollowUp,
    cancelPendingPix,
    finalizeVacuumPayment,
    isUuid,
    resolveVacuumPrivateOffer,
    isVacuumTestToken,
    loadVacuumOffer,
    quoteVacuumShipping,
    readMercadoPagoToken,
    resolveSellerRef,
    sendPixPendingEmail,
    sweepVacuumAbandoned,
} from './_vacuumPump.js';
import {
    PIX_EXPIRATION_MS,
    REJECTION_FALLBACK,
    buildPaymentPayload,
    createMpPayment,
    fetchMpPayment,
    rejectionMessage,
    type VacuumShippingCharge,
} from './_vacuumMp.js';
import { comboInFlight, handleVacuumPaymentNotice, hasOpenCombo, openComboState, payVacuumCombo, releaseVacuumCombo, sweepVacuumCombos, type PreparedCharge } from './_vacuumCombo.js';

/**
 * API da página da Vacuum Pump (Black Friday) — checkout transparente do Mercado Pago.
 * URL: /api/vacuum-pump?action=<ação>
 *
 *   GET  offer    → preço, fase, prazo, lote e chave pública (nunca o token)
 *   POST lead     → nome + WhatsApp: já entra no CRM, antes de qualquer pagamento
 *   POST save     → avança a etapa (endereço, pagamento) e os adicionais escolhidos
 *   POST shipping → cotação de frete pelo CEP: grátis em SP, SGP nos outros estados
 *   POST pay      → cria o pagamento. O total é calculado aqui, o navegador não informa preço
 *   POST pay_combo → pagamento combinado: parte no Pix e/ou de 1 a 3 cartões (ver _vacuumCombo.ts)
 *   GET  status   → situação do pedido (página de Pix e de obrigado)
 *   GET  sweep    → cron: entrega aos vendedores quem não comprou
 *   GET  sales    → equipe: pedidos da promoção, vendedores e oferta atual
 *   POST sale_create / sale_update / sale_status → equipe: venda manual
 */

const CHECKOUTS = 'SITE_CampaignCheckouts';
const MAX_PAYMENT_ATTEMPTS = 8;
const TRACKING_FIELDS = [
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
    'gclid', 'gbraid', 'wbraid', 'fbclid', 'gad_source', 'landing_page', 'referrer',
];

// Barreira contra teste de cartão roubado: o endpoint de pagamento é público.
// Em memória porque há um processo só na VPS; reiniciar zera, o que não atrapalha.
const buckets = new Map<string, { count: number; resetAt: number }>();
function allow(req: any, action: string, max: number, windowMs: number): boolean {
    // Sem IP identificado não há como separar clientes: travar aqui bloquearia todo mundo junto.
    const ip = getRequestClientIp(req);
    if (!ip) return true;
    const key = `${action}:${ip}`;
    const now = Date.now();
    if (buckets.size > 5000) buckets.clear();
    const bucket = buckets.get(key);
    if (!bucket || bucket.resetAt < now) {
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        return true;
    }
    bucket.count += 1;
    return bucket.count <= max;
}

function sanitizeAddress(raw: any) {
    const text = (value: unknown, max = 120) => String(value ?? '').trim().slice(0, max);
    return {
        cep: onlyDigits(raw?.cep).slice(0, 8),
        street: text(raw?.street),
        number: text(raw?.number, 20),
        complement: text(raw?.complement, 80),
        neighborhood: text(raw?.neighborhood, 80),
        city: text(raw?.city, 80),
        state: text(raw?.state, 2).toUpperCase(),
    };
}

function isCompleteAddress(address: ReturnType<typeof sanitizeAddress>): boolean {
    return address.cep.length === 8 && !!address.street && !!address.number && !!address.city && address.state.length === 2;
}

async function handleOffer(supabase: any, req: any, res: any) {
    const { state, publicKey } = await loadVacuumOffer(supabase);
    res.setHeader('Cache-Control', 'no-store');
    // Link de teste: mesma oferta a R$ 10, sem adicionais (lib/vacuumTest.ts).
    if (req.query?.teste && (await isVacuumTestToken(supabase, req.query.teste))) {
        return res.status(200).json({ ...vacuumTestOfferState(state), mp_public_key: publicKey, server_now: Date.now(), test: true, combo_min_part: VACUUM_TEST_MIN_PART });
    }
    // Condição privada: conjunto completo a preço fechado (lib/vacuumPrivateOffer.ts).
    const privateOffer = req.query?.condicao ? await resolveVacuumPrivateOffer(supabase, req.query.condicao) : null;
    if (privateOffer) {
        return res.status(200).json({ ...vacuumPrivateOfferState(state, privateOffer), mp_public_key: publicKey, server_now: Date.now(), combo_min_part: COMBO_MIN_PART });
    }
    return res.status(200).json({ ...state, mp_public_key: publicKey, server_now: Date.now(), combo_min_part: COMBO_MIN_PART });
}

/** Cria ou atualiza a ficha no CRM sem rebaixar status e sem apagar o que já existe. */
async function upsertLead(supabase: any, input: { name: string; phone: string; email: string | null; tracking: Record<string, string>; tag: string }) {
    const existing = await findExistingLead<any>(supabase, { email: input.email, phone: input.phone });
    const nowIso = new Date().toISOString();
    const tags = Array.from(new Set([...(existing?.tags || []), 'vacuum_bf', input.tag]));

    if (existing) {
        const { error } = await supabase
            .from('SITE_Leads')
            .update({
                tags,
                name: existing.name || input.name,
                email: existing.email || input.email,
                phone: existing.phone || input.phone,
                // Perdido ou frio volta para o funil. Ganho e em andamento continuam onde estão.
                ...(['Rejected', 'Cold'].includes(existing.status) ? { status: 'New' } : {}),
                updated_at: nowIso,
            })
            .eq('id', existing.id);
        if (error) console.error('[Vacuum] Falha ao atualizar lead:', error.message);
        return existing.id as string;
    }

    const { data, error } = await supabase
        .from('SITE_Leads')
        .insert([
            {
                name: input.name,
                email: input.email,
                phone: input.phone,
                type: 'Contact_Form',
                status: 'New',
                context_id: 'Vacuum Pump Black Friday',
                origin: `${PUBLIC_BASE_URL}/maquina-de-vacuo`,
                tags,
                ...input.tracking,
                created_at: nowIso,
                updated_at: nowIso,
            },
        ])
        .select('id')
        .single();
    if (error) {
        console.error('[Vacuum] Falha ao criar lead:', error.message);
        return null;
    }
    return data.id as string;
}

async function handleLead(supabase: any, req: any, res: any) {
    if (!allow(req, 'lead', 30, 10 * 60 * 1000)) {
        return res.status(429).json({ error: 'Muitas tentativas. Aguarde alguns minutos.' });
    }
    const body = req.body || {};
    const name = String(body.name || '').trim().slice(0, 120);
    const phone = normalizeBrPhone(body.phone);
    const email = String(body.email || '').trim().toLowerCase().slice(0, 160);
    const source = ['checkout', 'contact', 'waitlist'].includes(body.source) ? body.source : 'checkout';

    if (name.length < 2) return res.status(400).json({ error: 'Informe seu nome.' });
    if (!phone) return res.status(400).json({ error: 'Informe um WhatsApp válido, com DDD.' });
    if (email && !isValidEmail(email)) return res.status(400).json({ error: 'Confira o e-mail.' });
    if (source === 'checkout' && !email) return res.status(400).json({ error: 'Informe seu e-mail.' });

    const tracking: Record<string, string> = {};
    for (const field of TRACKING_FIELDS) {
        const value = body.tracking?.[field];
        if (typeof value === 'string' && value) tracking[field] = value.slice(0, 500);
    }

    // Teste: checkout em outra campanha e nada no CRM, para não virar lead nem tarefa de vendedor.
    const isTest = !!body.test_token && (await isVacuumTestToken(supabase, body.test_token));
    const campaign = isTest ? VACUUM_TEST_CAMPAIGN : VACUUM_CAMPAIGN;
    // Condição privada: fica marcada no checkout, e é o servidor que aplica o preço na hora de cobrar.
    const privateOffer = isTest ? null : await resolveVacuumPrivateOffer(supabase, body.private_token);
    const tag = source === 'contact' ? 'vacuum_bf_quer_contato' : source === 'waitlist' ? 'vacuum_bf_lista_espera' : 'vacuum_bf_checkout';
    const leadId = isTest ? null : await upsertLead(supabase, { name, phone, email: email || null, tracking, tag });
    const stage = source === 'contact' ? 'contact' : source === 'waitlist' ? 'waitlist' : 'lead';

    // Uma pessoa, um checkout em aberto: voltar à página não gera outra tarefa de ligação.
    const { data: open } = await supabase
        .from(CHECKOUTS)
        .select('*')
        .eq('campaign', campaign)
        .eq('phone', phone)
        .neq('stage', 'paid')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    // Entrou pelo link de um vendedor: a venda é dele. O link mais recente é o que vale.
    // O link dos disparos não é de ninguém: a venda é direta, mesmo que alguém já tenha falado com a pessoa.
    const fromDispatch = isTest || body.seller_ref === VACUUM_DIRECT_REF;
    const referredBy = fromDispatch ? null : await resolveSellerRef(supabase, body.seller_ref);
    // Voltar sem o link, em outro aparelho, não desfaz: só o link de um vendedor troca o crédito.
    const directSale = fromDispatch || (!referredBy && open?.browser_context?.direct_sale === true);
    // A compra pode ser confirmada depois, sem a pessoa na página: é daqui que o Meta a reconhece.
    const browserContext = {
        fbp: typeof body.tracking?.fbp === 'string' ? body.tracking.fbp.slice(0, 200) : null,
        fbc: typeof body.tracking?.fbc === 'string' ? body.tracking.fbc.slice(0, 300) : null,
        ip: getRequestClientIp(req) || null,
        ua: String(req.headers?.['user-agent'] || '').slice(0, 400) || null,
        direct_sale: directSale,
        ...(privateOffer ? { private_offer: privateOffer.id } : {}),
    };
    const fields = { lead_id: leadId, name, phone, email: email || open?.email || null, browser_context: browserContext, ...(fromDispatch ? { referred_by: null } : referredBy ? { referred_by: referredBy } : {}), updated_at: new Date().toISOString() };
    let checkout: any;
    if (open) {
        // Quem estava na lista de espera e entrou no checkout avança; o contrário não acontece.
        const nextStage = open.stage === 'waitlist' || stage === 'contact' ? stage : open.stage;
        const { data, error } = await supabase.from(CHECKOUTS).update({ ...fields, stage: nextStage }).eq('id', open.id).select('*').single();
        if (error) throw new Error(error.message);
        checkout = data;
    } else {
        const { data, error } = await supabase.from(CHECKOUTS).insert([{ ...fields, campaign, stage }]).select('*').single();
        if (error) throw new Error(error.message);
        checkout = data;
    }

    // Pediu para ser chamado: vai para o vendedor agora, sem esperar a varredura.
    if (stage === 'contact' && !isTest) {
        await assignFollowUp(supabase, checkout).catch((err) => console.error('[Vacuum] Follow-up imediato falhou:', err?.message));
    }

    return res.status(200).json({ ok: true, checkout_id: checkout.id, lead_id: leadId });
}

async function handleSave(supabase: any, req: any, res: any) {
    const body = req.body || {};
    if (!isUuid(body.checkout_id)) return res.status(400).json({ error: 'Checkout inválido.' });

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (['address', 'payment'].includes(body.stage)) update.stage = body.stage;
    if (Array.isArray(body.bumps)) update.bumps = body.bumps.map(String).slice(0, 10);
    if (body.document !== undefined) {
        if (!documentType(body.document)) return res.status(400).json({ error: 'Confira o CPF ou CNPJ.' });
        update.document = onlyDigits(body.document);
    }
    if (body.address !== undefined) {
        const address = sanitizeAddress(body.address);
        if (!isCompleteAddress(address)) return res.status(400).json({ error: 'Confira o endereço de entrega.' });
        update.address = address;
    }

    // Etapa de quem já pagou ou está com pagamento em andamento não volta atrás.
    const { data, error } = await supabase
        .from(CHECKOUTS)
        .update(update)
        .eq('id', body.checkout_id)
        .in('stage', ['lead', 'address', 'payment', 'rejected', 'expired', 'pix_pending', 'waitlist', 'contact'])
        .select('id');
    if (error) throw new Error(error.message);
    return res.status(200).json({ ok: true, updated: data?.length ?? 0 });
}

async function handleShipping(supabase: any, req: any, res: any) {
    if (!allow(req, 'shipping', 60, 10 * 60 * 1000)) {
        return res.status(429).json({ error: 'Muitas consultas de frete. Aguarde alguns minutos.' });
    }
    const body = req.body || {};
    if (onlyDigits(body.cep).length !== 8) return res.status(400).json({ error: 'CEP inválido.' });
    const { config } = await loadVacuumOffer(supabase);
    const quote = await quoteVacuumShipping(supabase, config, body.cep, body.bumps);
    return res.status(200).json(quote);
}

function publicPaymentResult(checkout: any, extra: Record<string, unknown> = {}) {
    const pending = checkout.stage === 'pix_pending';
    return {
        stage: checkout.stage,
        shipping: checkout.shipping || null,
        payment_status: checkout.payment_status,
        amount: checkout.amount != null ? Number(checkout.amount) : null,
        installments: checkout.installments,
        items: checkout.items || [],
        first_name: String(checkout.name || '').trim().split(/\s+/)[0] || '',
        ...(pending
            ? { pix: { qr_code: checkout.pix_qr_code, qr_code_base64: checkout.pix_qr_code_base64, expires_at: checkout.pix_expires_at } }
            : {}),
        ...(pending && hasOpenCombo(checkout) && checkout.split_payments?.pix ? { combo_pix_amount: Number(checkout.split_payments.pix.amount) } : {}),
        ...extra,
    };
}

/**
 * Tudo que o pagamento simples e o combinado conferem antes de cobrar: checkout, oferta,
 * frete e carrinho, sempre calculados aqui. Quando não dá para seguir, já respondeu e devolve null.
 */
async function prepareCharge(supabase: any, req: any, res: any): Promise<PreparedCharge | null> {
    if (!allow(req, 'pay', 10, 10 * 60 * 1000)) {
        res.status(429).json({ error: 'Muitas tentativas de pagamento. Aguarde alguns minutos ou chame um vendedor.' });
        return null;
    }
    const body = req.body || {};
    if (!isUuid(body.checkout_id)) {
        res.status(400).json({ error: 'Checkout inválido.' });
        return null;
    }

    const { data: checkout, error: loadError } = await supabase.from(CHECKOUTS).select('*').eq('id', body.checkout_id).maybeSingle();
    if (loadError) throw new Error(loadError.message);
    if (!checkout) {
        res.status(404).json({ error: 'Checkout não encontrado.' });
        return null;
    }
    if (checkout.stage === 'paid') {
        res.status(200).json(publicPaymentResult(checkout));
        return null;
    }
    if (comboInFlight(checkout)) {
        res.status(409).json(IN_FLIGHT_REPLY);
        return null;
    }
    if (checkout.payment_attempts >= MAX_PAYMENT_ATTEMPTS) {
        res.status(429).json({ error: 'Limite de tentativas atingido. Chame um vendedor para concluir sua compra.' });
        return null;
    }
    if (!checkout.document || !checkout.address) {
        res.status(400).json({ error: 'Preencha os dados de entrega antes de pagar.' });
        return null;
    }

    const isTest = isVacuumTestCampaign(checkout.campaign);
    // Condição em 12x também pelo link na hora de pagar: o carrinho salvo no aparelho pode ter sido
    // aberto antes na página normal, e aí o checkout ainda não tem a marca (caso do Emerson, 12/11).
    const linkOffer = isTest ? null : await resolveVacuumPrivateOffer(supabase, body.private_token);
    if (linkOffer && checkoutPrivateOffer(checkout)?.id !== linkOffer.id) {
        checkout.browser_context = { ...(checkout.browser_context || {}), private_offer: linkOffer.id };
        const { error: markError } = await supabase.from(CHECKOUTS).update({ browser_context: checkout.browser_context }).eq('id', checkout.id);
        if (markError) throw new Error(markError.message);
    }
    const loaded = await loadVacuumOffer(supabase, { fresh: true });
    const config = loaded.config;
    const privateOffer = isTest ? null : checkoutPrivateOffer(checkout);
    const state = isTest ? vacuumTestOfferState(loaded.state) : privateOffer ? vacuumPrivateOfferState(loaded.state, privateOffer) : loaded.state;
    if (state.phase === 'soon') {
        res.status(409).json({ error: 'A pré-venda ainda não abriu.', code: 'not_open' });
        return null;
    }

    // O frete também é decidido aqui, pelo CEP gravado no checkout. O navegador só diz qual opção escolheu.
    const quote = isTest ? { mode: 'free' as const, options: [] } : await quoteVacuumShipping(supabase, config, checkout.address.cep, body.bumps);
    let shipping: VacuumShippingCharge;
    if (isTest) {
        shipping = { method: 'teste', name: 'Sem frete (teste)', cost: 0 };
    } else if (quote.mode === 'free') {
        shipping = { method: 'gratis_sp', name: 'Frete grátis (SP)', cost: 0 };
    } else if (quote.mode === 'combine') {
        shipping = { method: 'a_combinar', name: 'Frete a combinar', cost: 0 };
    } else {
        const option = quote.options.find((item) => item.code === String(body.shipping_service));
        if (!option) {
            res.status(409).json({ error: 'Escolha a forma de envio.', code: 'price_changed' });
            return null;
        }
        shipping = { method: option.name.toLowerCase(), name: `Frete ${option.name}`, cost: option.price, days: option.days };
    }

    const cart = computeVacuumCart(state, body.bumps, shipping.cost);
    const token = await readMercadoPagoToken(supabase);
    if (!token) {
        console.error('[Vacuum] mercadopago_access_token ausente em SITE_Config');
        res.status(500).json({ error: 'Pagamento indisponível. Chame um vendedor.' });
        return null;
    }
    return { checkout, state, cart, shipping, token, minPart: isTest ? VACUUM_TEST_MIN_PART : COMBO_MIN_PART };
}

/**
 * Pagamento antes de outro: Pix em aberto ou combinação com cartões reservados não podem continuar
 * valendo. Devolve false se outro processo tomou a combinação primeiro (o Pix caiu e os cartões
 * estão sendo cobrados): aí um pagamento novo cobraria duas vezes.
 */
async function releaseOpenPayment(supabase: any, token: string, checkout: any): Promise<boolean> {
    const comboState = openComboState(checkout);
    if (comboState) {
        return (await releaseVacuumCombo(supabase, token, checkout, 'expired', null, { from: [comboState] })) !== null;
    }
    if (checkout.stage === 'pix_pending' && checkout.mp_payment_id) {
        await cancelPendingPix(token, checkout.mp_payment_id);
    }
    return true;
}

const IN_FLIGHT_REPLY = { error: 'Seu pagamento está sendo confirmado. Aguarde alguns segundos.', code: 'in_flight' };

async function handlePay(supabase: any, req: any, res: any) {
    const prepared = await prepareCharge(supabase, req, res);
    if (!prepared) return;
    const { checkout, state, cart, shipping, token } = prepared;
    const body = req.body || {};
    const form = body.form_data || {};
    const paymentMethodId = String(form.payment_method_id || '');
    const isPix = paymentMethodId === 'pix';
    // Condição só no cartão (ex.: saldo depois da entrada no Pix): o servidor não aceita Pix.
    if (isPix && checkoutPrivateOffer(checkout)?.card_only) {
        return res.status(400).json({ error: 'Esta condição é paga só no cartão de crédito.' });
    }
    // Pix tem desconto: o valor cobrado depende da forma de pagamento.
    const chargeTotal = isPix ? cart.pix_total : cart.total;
    // O preço pode ter mudado com a página aberta (prazo ou lote acabaram). Nunca
    // cobrar valor diferente do que a pessoa viu: devolve para ela confirmar.
    if (Math.abs(chargeTotal - Number(body.expected_total)) > 0.009) {
        return res.status(409).json({ error: 'O valor da oferta mudou. Confira o novo total antes de pagar.', code: 'price_changed', total: chargeTotal });
    }

    if (!paymentMethodId) return res.status(400).json({ error: 'Escolha a forma de pagamento.' });
    if (!isPix && !form.token) return res.status(400).json({ error: 'Dados do cartão incompletos.' });

    const installments = isPix ? 1 : Math.floor(Number(form.installments) || 1);
    if (installments < 1 || installments > state.installments) {
        return res.status(400).json({ error: `Parcelamento em até ${state.installments}x.` });
    }

    // Pix ainda válido do mesmo valor: devolve o mesmo código em vez de gerar outro.
    if (
        isPix &&
        !hasOpenCombo(checkout) &&
        checkout.stage === 'pix_pending' &&
        Number(checkout.amount) === chargeTotal &&
        Date.parse(checkout.pix_expires_at) > Date.now()
    ) {
        return res.status(200).json(publicPaymentResult(checkout));
    }

    if (!(await releaseOpenPayment(supabase, token, checkout))) return res.status(409).json(IN_FLIGHT_REPLY);

    const payload = buildPaymentPayload(checkout, cart, shipping, {
        amount: chargeTotal,
        installments,
        isPix,
        form,
        metadata: { pix_discount: isPix ? cart.pix_discount : 0 },
    });

    // A chave vem do navegador a cada envio: clique duplo não vira cobrança dupla.
    const attemptKey = String(body.attempt_key || '').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 60) || String(Date.now());
    const created = await createMpPayment(token, payload, `${checkout.id}:${attemptKey}`);
    const payment = created.data;

    const baseUpdate = {
        items: cart.items,
        shipping,
        bumps: cart.bump_ids,
        amount: chargeTotal,
        installments,
        split_payments: null,
        payment_attempts: (checkout.payment_attempts || 0) + 1,
        updated_at: new Date().toISOString(),
    };

    if (!created.ok || !payment?.id) {
        console.error('[Vacuum] Mercado Pago recusou a criação:', payment?.message || payment?.error || 'sem detalhe');
        await supabase.from(CHECKOUTS).update({ ...baseUpdate, stage: 'rejected', payment_status: 'error', payment_status_detail: String(payment?.message || '').slice(0, 200) }).eq('id', checkout.id);
        return res.status(402).json({ stage: 'rejected', message: REJECTION_FALLBACK });
    }

    const status = payment.status as string;
    const pixData = payment.point_of_interaction?.transaction_data;
    // "review" também cobre o intervalo entre a aprovação e a gravação da venda: se a
    // gravação falhar, o cliente foi cobrado e ninguém pode ligar oferecendo a compra.
    const stage = status === 'approved' ? 'review' : status === 'rejected' || status === 'cancelled' ? 'rejected' : isPix ? 'pix_pending' : 'review';

    const { data: updated, error: updateError } = await supabase
        .from(CHECKOUTS)
        .update({
            ...baseUpdate,
            stage,
            mp_payment_id: String(payment.id),
            payment_status: status,
            payment_status_detail: payment.status_detail || null,
            ...(isPix
                ? {
                      pix_qr_code: pixData?.qr_code || null,
                      pix_qr_code_base64: pixData?.qr_code_base64 || null,
                      pix_expires_at: payment.date_of_expiration || new Date(Date.now() + PIX_EXPIRATION_MS).toISOString(),
                  }
                : {}),
        })
        .eq('id', checkout.id)
        .select('*')
        .single();
    if (updateError) console.error('[Vacuum] Falha ao gravar pagamento (o webhook confirma):', updateError.message);
    const current = updated || { ...checkout, ...baseUpdate, stage };

    if (stage === 'pix_pending') {
        void sendPixPendingEmail(current).catch((err) => console.error('[Vacuum] Falha no e-mail do Pix (não-fatal):', err?.message));
    }

    if (status === 'approved') {
        try {
            const { orderNumber } = await finalizeVacuumPayment(supabase, current, payment);
            return res.status(200).json(publicPaymentResult({ ...current, stage: 'paid', payment_status: status }, { order_number: orderNumber }));
        } catch (err: any) {
            // O dinheiro já entrou. O webhook e a consulta de status tentam gravar de novo.
            console.error(`[Vacuum] Pagamento ${payment.id} aprovado, venda não gravada:`, err?.message);
            return res.status(200).json(publicPaymentResult({ ...current, stage: 'review', payment_status: status }));
        }
    }
    if (stage === 'rejected') {
        return res.status(200).json(publicPaymentResult(current, { message: rejectionMessage(payment.status_detail) }));
    }
    return res.status(200).json(publicPaymentResult(current));
}

async function handlePayCombo(supabase: any, req: any, res: any) {
    const prepared = await prepareCharge(supabase, req, res);
    if (!prepared) return;
    if (checkoutPrivateOffer(prepared.checkout)?.card_only) {
        return res.status(400).json({ error: 'Esta condição é paga só no cartão de crédito, em uma vez ou parcelado.' });
    }
    if (!(await releaseOpenPayment(supabase, prepared.token, prepared.checkout))) return res.status(409).json(IN_FLIGHT_REPLY);
    const result = await payVacuumCombo(supabase, prepared, req.body || {});
    if (result.httpStatus !== 200) return res.status(result.httpStatus).json(result.body);
    const checkout = result.checkout;
    let orderNumber: string | undefined;
    if (checkout.stage === 'paid' && checkout.sale_id) {
        const { data: sale } = await supabase.from('SITE_Sales').select('order_number').eq('id', checkout.sale_id).maybeSingle();
        orderNumber = sale?.order_number;
    }
    return res.status(200).json(publicPaymentResult(checkout, { ...(orderNumber ? { order_number: orderNumber } : {}), ...(result.message ? { message: result.message } : {}) }));
}

async function handleStatus(supabase: any, req: any, res: any) {
    const id = req.query?.id;
    if (!isUuid(id)) return res.status(400).json({ error: 'Checkout inválido.' });

    const { data, error } = await supabase.from(CHECKOUTS).select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return res.status(404).json({ error: 'Checkout não encontrado.' });
    let checkout = data;

    // Webhook pode atrasar: quem está olhando a tela do Pix consulta direto no Mercado Pago.
    if (['pix_pending', 'review'].includes(checkout.stage) && checkout.mp_payment_id) {
        const token = await readMercadoPagoToken(supabase);
        const payment = token ? await fetchMpPayment(token, checkout.mp_payment_id) : null;
        if (payment && (payment.status !== checkout.payment_status || payment.status === 'approved')) {
            await handleVacuumPaymentNotice(supabase, payment);
            const { data: fresh } = await supabase.from(CHECKOUTS).select('*').eq('id', id).maybeSingle();
            if (fresh) checkout = fresh;
        }
    }

    let orderNumber: string | null = null;
    if (checkout.sale_id) {
        const { data: sale } = await supabase.from('SITE_Sales').select('order_number').eq('id', checkout.sale_id).maybeSingle();
        orderNumber = sale?.order_number || null;
    }

    const { state } = await loadVacuumOffer(supabase);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(
        publicPaymentResult(checkout, {
            order_number: orderNumber,
            delivery_text: state.delivery_text,
            shipping_note: state.shipping_note,
            whatsapp: state.whatsapp,
            message: checkout.stage === 'rejected' ? rejectionMessage(checkout.payment_status_detail) : undefined,
        })
    );
}

export default async function handler(req: any, res: any) {
    const supabase = getServiceClient();
    if (!supabase) {
        console.error('[Vacuum] Service client indisponível');
        return res.status(500).json({ error: 'System configuration error' });
    }

    const action = String(req.query?.action || '');
    try {
        if (req.method === 'GET') {
            if (action === 'offer') return await handleOffer(supabase, req, res);
            if (action === 'status') return await handleStatus(supabase, req, res);
            if (action === 'dashboard') return await handleVacuumDashboard(supabase, req, res);
            if (action === 'sales') return await handleVacuumSalesList(supabase, req, res);
            if (action === 'sweep') {
                if (!isCronAuthorized(req)) return denyCron(res);
                const combos = await sweepVacuumCombos(supabase).catch((err) => {
                    console.error('[Vacuum] Varredura de combinações falhou:', err?.message);
                    return null;
                });
                if (combos && (combos.released || combos.completed)) console.log(`[Vacuum] Combinações: ${combos.released} desfeitas, ${combos.completed} concluídas.`);
                const result = await sweepVacuumAbandoned(supabase);
                await retryVacuumOrderWhatsApp(supabase).catch((err) => console.error('[Vacuum] Reenvio de confirmações falhou:', err?.message));
                console.log(`[Vacuum] Varredura: ${result.analyzed} analisados, ${result.assigned} entregues aos vendedores.`);
                return res.status(200).json({ ok: true, ...result });
            }
        }
        if (req.method === 'POST') {
            if (action === 'lead') return await handleLead(supabase, req, res);
            if (action === 'save') return await handleSave(supabase, req, res);
            if (action === 'shipping') return await handleShipping(supabase, req, res);
            if (action === 'pay') return await handlePay(supabase, req, res);
            if (action === 'pay_combo') return await handlePayCombo(supabase, req, res);
            if (action === 'dashboard_goals') return await handleVacuumGoals(supabase, req, res);
            if (action === 'sale_create') return await handleVacuumSaleCreate(supabase, req, res);
            if (action === 'sale_update') return await handleVacuumSaleUpdate(supabase, req, res);
            if (action === 'sale_status') return await handleVacuumSaleStatus(supabase, req, res);
        }
        return res.status(404).json({ error: 'Ação desconhecida' });
    } catch (err: any) {
        console.error(`[Vacuum] Erro em ${action}:`, err?.message);
        return res.status(500).json({ error: 'Não foi possível concluir agora. Tente de novo ou chame um vendedor.' });
    }
}
