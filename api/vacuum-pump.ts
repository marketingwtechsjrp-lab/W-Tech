import { findExistingLead, isWonStatus } from '../lib/leadMatch.js';
import { PUBLIC_BASE_URL } from '../lib/publicUrl.js';
import {
    VACUUM_CAMPAIGN,
    computeVacuumCart,
    documentType,
    isValidEmail,
    normalizeBrPhone,
    onlyDigits,
} from '../lib/vacuumOffer.js';
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
    handleVacuumPaymentEvent,
    isUuid,
    loadVacuumOffer,
    quoteVacuumShipping,
    readMercadoPagoToken,
    resolveSellerRef,
    sendPixPendingEmail,
    sweepVacuumAbandoned,
    vacuumExternalReference,
} from './_vacuumPump.js';

/**
 * API da página da Vacuum Pump (Black Friday) — checkout transparente do Mercado Pago.
 * URL: /api/vacuum-pump?action=<ação>
 *
 *   GET  offer    → preço, fase, prazo, lote e chave pública (nunca o token)
 *   POST lead     → nome + WhatsApp: já entra no CRM, antes de qualquer pagamento
 *   POST save     → avança a etapa (endereço, pagamento) e os adicionais escolhidos
 *   POST shipping → cotação de frete pelo CEP: grátis em SP, SGP nos outros estados
 *   POST pay      → cria o pagamento. O total é calculado aqui, o navegador não informa preço
 *   GET  status   → situação do pedido (página de Pix e de obrigado)
 *   GET  sweep    → cron: entrega aos vendedores quem não comprou
 *   GET  sales    → equipe: pedidos da promoção, vendedores e oferta atual
 *   POST sale_create / sale_update / sale_status → equipe: venda manual
 */

const CHECKOUTS = 'SITE_CampaignCheckouts';
const MAX_PAYMENT_ATTEMPTS = 8;
const PIX_EXPIRATION_MS = 30 * 60 * 1000;
const TRACKING_FIELDS = [
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
    'gclid', 'gbraid', 'wbraid', 'fbclid', 'gad_source', 'landing_page', 'referrer',
];

const REJECTION_MESSAGES: Record<string, string> = {
    cc_rejected_invalid_installments: 'Este cartão não aceita essa quantidade de parcelas. Escolha menos parcelas ou use outro cartão.',
    cc_rejected_insufficient_amount: 'O cartão não tem limite para este valor. Tente outro cartão ou pague no Pix.',
    cc_rejected_bad_filled_card_number: 'Confira o número do cartão.',
    cc_rejected_bad_filled_date: 'Confira a validade do cartão.',
    cc_rejected_bad_filled_security_code: 'Confira o código de segurança do cartão.',
    cc_rejected_bad_filled_other: 'Confira os dados do cartão.',
    cc_rejected_call_for_authorize: 'Seu banco pediu autorização. Ligue para o banco, libere a compra e tente de novo.',
    cc_rejected_blacklist: 'O cartão não foi aceito. Tente outro cartão ou pague no Pix.',
    cc_rejected_card_disabled: 'O cartão está desativado. Ligue para o banco ou use outro cartão.',
    cc_rejected_duplicated_payment: 'Já existe um pagamento igual a este. Confira seu extrato antes de tentar de novo.',
    cc_rejected_high_risk: 'O pagamento foi recusado pela análise de segurança. Tente outro cartão ou pague no Pix.',
    cc_rejected_max_attempts: 'Limite de tentativas do cartão atingido. Use outro cartão ou pague no Pix.',
};
const REJECTION_FALLBACK = 'O pagamento não foi aprovado. Tente outro cartão, pague no Pix ou chame um vendedor.';

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

function splitName(name: string) {
    const [first, ...rest] = name.trim().split(/\s+/);
    return { first, last: rest.join(' ') || first };
}

/** Horário de Brasília no formato que o Mercado Pago aceita em date_of_expiration. */
function isoBrasilia(ms: number): string {
    return new Date(ms - 3 * 3_600_000).toISOString().replace('Z', '-03:00');
}

async function handleOffer(supabase: any, res: any) {
    const { state, publicKey } = await loadVacuumOffer(supabase);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ ...state, mp_public_key: publicKey, server_now: Date.now() });
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

    const tag = source === 'contact' ? 'vacuum_bf_quer_contato' : source === 'waitlist' ? 'vacuum_bf_lista_espera' : 'vacuum_bf_checkout';
    const leadId = await upsertLead(supabase, { name, phone, email: email || null, tracking, tag });
    const stage = source === 'contact' ? 'contact' : source === 'waitlist' ? 'waitlist' : 'lead';

    // Uma pessoa, um checkout em aberto: voltar à página não gera outra tarefa de ligação.
    const { data: open } = await supabase
        .from(CHECKOUTS)
        .select('*')
        .eq('campaign', VACUUM_CAMPAIGN)
        .eq('phone', phone)
        .neq('stage', 'paid')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    // Entrou pelo link de um vendedor: a venda é dele. O link mais recente é o que vale.
    const referredBy = await resolveSellerRef(supabase, body.seller_ref);
    // A compra pode ser confirmada depois, sem a pessoa na página: é daqui que o Meta a reconhece.
    const browserContext = {
        fbp: typeof body.tracking?.fbp === 'string' ? body.tracking.fbp.slice(0, 200) : null,
        fbc: typeof body.tracking?.fbc === 'string' ? body.tracking.fbc.slice(0, 300) : null,
        ip: getRequestClientIp(req) || null,
        ua: String(req.headers?.['user-agent'] || '').slice(0, 400) || null,
    };
    const fields = { lead_id: leadId, name, phone, email: email || open?.email || null, browser_context: browserContext, ...(referredBy ? { referred_by: referredBy } : {}), updated_at: new Date().toISOString() };
    let checkout: any;
    if (open) {
        // Quem estava na lista de espera e entrou no checkout avança; o contrário não acontece.
        const nextStage = open.stage === 'waitlist' || stage === 'contact' ? stage : open.stage;
        const { data, error } = await supabase.from(CHECKOUTS).update({ ...fields, stage: nextStage }).eq('id', open.id).select('*').single();
        if (error) throw new Error(error.message);
        checkout = data;
    } else {
        const { data, error } = await supabase.from(CHECKOUTS).insert([{ ...fields, campaign: VACUUM_CAMPAIGN, stage }]).select('*').single();
        if (error) throw new Error(error.message);
        checkout = data;
    }

    // Pediu para ser chamado: vai para o vendedor agora, sem esperar a varredura.
    if (stage === 'contact') {
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
        ...extra,
    };
}

async function fetchPayment(token: string, paymentId: string) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
        const res = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
        });
        return res.ok ? await res.json() : null;
    } finally {
        clearTimeout(timer);
    }
}

async function handlePay(supabase: any, req: any, res: any) {
    if (!allow(req, 'pay', 10, 10 * 60 * 1000)) {
        return res.status(429).json({ error: 'Muitas tentativas de pagamento. Aguarde alguns minutos ou chame um vendedor.' });
    }
    const body = req.body || {};
    if (!isUuid(body.checkout_id)) return res.status(400).json({ error: 'Checkout inválido.' });

    const { data: checkout, error: loadError } = await supabase.from(CHECKOUTS).select('*').eq('id', body.checkout_id).maybeSingle();
    if (loadError) throw new Error(loadError.message);
    if (!checkout) return res.status(404).json({ error: 'Checkout não encontrado.' });
    if (checkout.stage === 'paid') return res.status(200).json(publicPaymentResult(checkout));
    if (checkout.payment_attempts >= MAX_PAYMENT_ATTEMPTS) {
        return res.status(429).json({ error: 'Limite de tentativas atingido. Chame um vendedor para concluir sua compra.' });
    }
    if (!checkout.document || !checkout.address) {
        return res.status(400).json({ error: 'Preencha os dados de entrega antes de pagar.' });
    }

    const { config, state } = await loadVacuumOffer(supabase, { fresh: true });
    if (state.phase === 'soon') return res.status(409).json({ error: 'A pré-venda ainda não abriu.', code: 'not_open' });

    // O frete também é decidido aqui, pelo CEP gravado no checkout. O navegador só diz qual opção escolheu.
    const quote = await quoteVacuumShipping(supabase, config, checkout.address.cep, body.bumps);
    let shipping: { method: string; name: string; cost: number; days?: number };
    if (quote.mode === 'free') {
        shipping = { method: 'gratis_sp', name: 'Frete grátis (SP)', cost: 0 };
    } else if (quote.mode === 'combine') {
        shipping = { method: 'a_combinar', name: 'Frete a combinar', cost: 0 };
    } else {
        const option = quote.options.find((item) => item.code === String(body.shipping_service));
        if (!option) return res.status(409).json({ error: 'Escolha a forma de envio.', code: 'price_changed' });
        shipping = { method: option.name.toLowerCase(), name: `Frete ${option.name}`, cost: option.price, days: option.days };
    }

    const cart = computeVacuumCart(state, body.bumps, shipping.cost);
    // O preço pode ter mudado com a página aberta (prazo ou lote acabaram). Nunca
    // cobrar valor diferente do que a pessoa viu: devolve para ela confirmar.
    if (Math.abs(cart.total - Number(body.expected_total)) > 0.009) {
        return res.status(409).json({ error: 'O valor da oferta mudou. Confira o novo total antes de pagar.', code: 'price_changed', total: cart.total });
    }

    const form = body.form_data || {};
    const paymentMethodId = String(form.payment_method_id || '');
    const isPix = paymentMethodId === 'pix';
    if (!paymentMethodId) return res.status(400).json({ error: 'Escolha a forma de pagamento.' });
    if (!isPix && !form.token) return res.status(400).json({ error: 'Dados do cartão incompletos.' });

    const installments = isPix ? 1 : Math.floor(Number(form.installments) || 1);
    if (installments < 1 || installments > state.installments) {
        return res.status(400).json({ error: `Parcelamento em até ${state.installments}x.` });
    }

    // Pix ainda válido do mesmo valor: devolve o mesmo código em vez de gerar outro.
    if (isPix && checkout.stage === 'pix_pending' && Number(checkout.amount) === cart.total && Date.parse(checkout.pix_expires_at) > Date.now()) {
        return res.status(200).json(publicPaymentResult(checkout));
    }

    const token = await readMercadoPagoToken(supabase);
    if (!token) {
        console.error('[Vacuum] mercadopago_access_token ausente em SITE_Config');
        return res.status(500).json({ error: 'Pagamento indisponível. Chame um vendedor.' });
    }

    if (checkout.stage === 'pix_pending' && checkout.mp_payment_id) {
        await cancelPendingPix(token, checkout.mp_payment_id);
    }

    const { first, last } = splitName(checkout.name);
    const address = checkout.address;
    const docType = documentType(checkout.document);
    const formIdentification = form.payer?.identification;
    const identification = formIdentification?.number
        ? { type: String(formIdentification.type || docType), number: onlyDigits(formIdentification.number) }
        : { type: docType, number: checkout.document };

    const payload: Record<string, unknown> = {
        transaction_amount: cart.total,
        description: 'Vacuum Pump Standard W-Tech - Black Friday',
        installments,
        payment_method_id: paymentMethodId,
        ...(isPix
            ? { date_of_expiration: isoBrasilia(Date.now() + PIX_EXPIRATION_MS) }
            : { token: String(form.token), ...(form.issuer_id ? { issuer_id: form.issuer_id } : {}) }),
        payer: { email: checkout.email, first_name: first, last_name: last, identification },
        external_reference: vacuumExternalReference(checkout.id),
        notification_url: `${PUBLIC_BASE_URL}/api/mercadopago-webhook`,
        statement_descriptor: 'WTECH',
        metadata: { campaign: VACUUM_CAMPAIGN, checkout_id: checkout.id, lead_id: checkout.lead_id, bumps: cart.bump_ids },
        additional_info: {
            items: [
                ...cart.items.map((item) => ({ id: item.id, title: item.name, quantity: 1, unit_price: item.price, category_id: 'others' })),
                ...(shipping.cost > 0 ? [{ id: 'frete', title: shipping.name, quantity: 1, unit_price: shipping.cost, category_id: 'others' }] : []),
            ],
            payer: {
                first_name: first,
                last_name: last,
                phone: { area_code: checkout.phone.slice(0, 2), number: checkout.phone.slice(2) },
                address: { zip_code: address.cep, street_name: address.street, street_number: address.number },
            },
            shipments: {
                receiver_address: {
                    zip_code: address.cep,
                    state_name: address.state,
                    city_name: address.city,
                    street_name: address.street,
                    street_number: address.number,
                },
            },
        },
    };

    // A chave vem do navegador a cada envio: clique duplo não vira cobrança dupla.
    const attemptKey = String(body.attempt_key || '').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 60) || String(Date.now());
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);
    let payment: any;
    let httpOk = false;
    try {
        const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
                'X-Idempotency-Key': `${checkout.id}:${attemptKey}`,
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
        });
        httpOk = mpRes.ok;
        payment = await mpRes.json().catch(() => null);
    } finally {
        clearTimeout(timer);
    }

    const baseUpdate = {
        items: cart.items,
        shipping,
        bumps: cart.bump_ids,
        amount: cart.total,
        installments,
        payment_attempts: (checkout.payment_attempts || 0) + 1,
        updated_at: new Date().toISOString(),
    };

    if (!httpOk || !payment?.id) {
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
        return res.status(200).json(publicPaymentResult(current, { message: REJECTION_MESSAGES[payment.status_detail] || REJECTION_FALLBACK }));
    }
    return res.status(200).json(publicPaymentResult(current));
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
        const payment = token ? await fetchPayment(token, checkout.mp_payment_id).catch(() => null) : null;
        if (payment && (payment.status !== checkout.payment_status || payment.status === 'approved')) {
            await handleVacuumPaymentEvent(supabase, payment);
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
            message: checkout.stage === 'rejected' ? REJECTION_MESSAGES[checkout.payment_status_detail] || REJECTION_FALLBACK : undefined,
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
            if (action === 'offer') return await handleOffer(supabase, res);
            if (action === 'status') return await handleStatus(supabase, req, res);
            if (action === 'dashboard') return await handleVacuumDashboard(supabase, req, res);
            if (action === 'sales') return await handleVacuumSalesList(supabase, req, res);
            if (action === 'sweep') {
                if (!isCronAuthorized(req)) return denyCron(res);
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
