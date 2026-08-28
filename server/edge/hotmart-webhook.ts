import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import { normalizeHotmartCheckoutUrl } from '../../lib/hotmartCheckout.js';
import {
    evolutionReady,
    formatPhone,
    instanciaConectada,
    resolveEvolutionConfig,
    sendWhatsAppText,
} from './_whatsappAutomacao.js';
import {
    matchesHotmartProduct,
    normalizeHotmartPayload,
    type HotmartLocale,
    type NormalizedHotmartPayload,
} from './hotmartPayload.js';

/**
 * Webhook Hotmart — POST /api/hotmart-webhook
 *
 * O endpoint autentica o Hottok antes de interpretar ou registrar o evento,
 * filtra o produto configurado e usa uma tabela sem PII para idempotência.
 * Assim, retries da Hotmart não enviam a mesma mensagem duas vezes.
 */

let cachedClient: SupabaseClient | null = null;
function getSupabase(): SupabaseClient | null {
    if (cachedClient) return cachedClient;
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!url || !key) return null;
    cachedClient = createClient(url, key);
    return cachedClient;
}

const EVENT_TABLE = 'SITE_Hotmart_Webhook_Events';
const PROCESSING_STALE_MS = 10 * 60 * 1000;
const SENDING_STALE_MS = 2 * 60 * 1000;
const TRANSITION_RETRY_DELAYS_MS = [0, 80, 250] as const;
const EVENT_RETENTION_MS = 180 * 24 * 60 * 60 * 1000;
const RETENTION_SWEEP_INTERVAL_MS = 24 * 60 * 60 * 1000;
let lastRetentionSweepAt = 0;
const CHECKOUT_FALLBACK = 'https://w-techbrasil.com.br/curso-suspensao-piloto-vsl?regiao=intl';

const HOTMART_CONFIG_KEYS = [
    'hotmart_webhook_token',
    'hotmart_product_id',
    'hotmart_checkout_url',
    'wa_automation_enabled',
    'wa_enabled_course_sales',
] as const;

type HotmartConfig = Record<(typeof HOTMART_CONFIG_KEYS)[number], string>;
type MessageSet = {
    approved: (name: string) => string;
    cart: (name: string, link: string) => string;
    pending: (name: string, link: string) => string;
};

const MESSAGES = {
    pt: {
        approved: (name: string) => `🏁 *${name}, aqui é o Alex Crepaldi da W-Tech!*\n\nA sua inscrição no treinamento de *Regulagem de Suspensão* está confirmada. ✅\n\nOs dados de acesso foram enviados para o e-mail da compra — confira também a pasta de spam. 📧\n\nSe tiver qualquer dúvida técnica, responda aqui mesmo. Bons treinos! 🏍️`,
        cart: (name: string, link: string) => `🏁 *${name}, aqui é o Alex Crepaldi da W-Tech!*\n\nVi que você abriu a inscrição do treinamento de *Regulagem de Suspensão*, mas não concluiu. ⚠️\n\nFicou alguma dúvida técnica ou o pagamento travou? Responda aqui que eu ajudo você.\n\nO link continua disponível: 🔗 ${link}`,
        pending: (name: string, link: string) => `⏳ *${name}, o seu pagamento ainda não foi confirmado.*\n\nA vaga fica reservada enquanto o pagamento estiver em aberto. Assim que for aprovado, o acesso é liberado. 🏍️\n\n🔗 ${link}`,
    },
    es: {
        approved: (name: string) => `🏁 *¡${name}, soy Alex Crepaldi de W-Tech!*\n\nTu inscripción en el entrenamiento de *Reglaje de Suspensión* está confirmada. ✅\n\nLos datos de acceso fueron enviados al correo de la compra; revisa también la carpeta de spam. 📧\n\nSi tienes alguna duda técnica, responde aquí. ¡Buenos entrenamientos! 🏍️`,
        cart: (name: string, link: string) => `🏁 *¡${name}, soy Alex Crepaldi de W-Tech!*\n\nVi que comenzaste la inscripción al entrenamiento de *Reglaje de Suspensión*, pero no la terminaste. ⚠️\n\n¿Tienes alguna duda técnica o hubo un problema con el pago? Respóndeme y te ayudo.\n\nTu enlace sigue disponible: 🔗 ${link}`,
        pending: (name: string, link: string) => `⏳ *${name}, tu pago todavía no ha sido confirmado.*\n\nTu plaza queda reservada mientras el pago esté pendiente. Cuando sea aprobado, recibirás el acceso. 🏍️\n\n🔗 ${link}`,
    },
    en: {
        approved: (name: string) => `🏁 *${name}, Alex Crepaldi here from W-Tech!*\n\nYour enrollment in the *Suspension Setup* training is confirmed. ✅\n\nAccess details were sent to the email used at checkout — please check your inbox and spam folder. 📧\n\nIf you have any technical questions, just reply here. Enjoy the ride! 🏍️`,
        cart: (name: string, link: string) => `🏁 *${name}, Alex Crepaldi here from W-Tech!*\n\nI saw you started enrolling in the *Suspension Setup* training but did not finish. ⚠️\n\nWas it a technical question, or did the payment get stuck? Reply here and I will help you.\n\nYour link is still available: 🔗 ${link}`,
        pending: (name: string, link: string) => `⏳ *${name}, your payment has not been confirmed yet.*\n\nYour place stays reserved while payment is pending. Access will be released as soon as it is approved. 🏍️\n\n🔗 ${link}`,
    },
} satisfies Record<HotmartLocale, MessageSet>;

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

function safeTokenEqual(received: string, expected: string): boolean {
    const receivedBuffer = Buffer.from(received, 'utf8');
    const expectedBuffer = Buffer.from(expected, 'utf8');
    return receivedBuffer.length === expectedBuffer.length
        && timingSafeEqual(receivedBuffer, expectedBuffer);
}

function safeCheckoutUrl(value: string): string {
    return normalizeHotmartCheckoutUrl(value) || '';
}

async function loadHotmartConfig(supabase: SupabaseClient): Promise<HotmartConfig | null> {
    const { data, error } = await supabase
        .from('SITE_Config')
        .select('key, value')
        .in('key', [...HOTMART_CONFIG_KEYS]);

    if (error) {
        console.error('[Hotmart Webhook] Não foi possível carregar a configuração.');
        return null;
    }

    const config = Object.fromEntries(HOTMART_CONFIG_KEYS.map((key) => [key, ''])) as HotmartConfig;
    for (const row of data || []) {
        if (HOTMART_CONFIG_KEYS.includes(row.key as (typeof HOTMART_CONFIG_KEYS)[number])) {
            config[row.key as (typeof HOTMART_CONFIG_KEYS)[number]] = text(row.value);
        }
    }
    return config;
}

type EventStatus = 'processing' | 'sending' | 'submitted' | 'failed' | 'delivery_unknown' | 'ignored';
type ClaimResult = {
    state: 'claimed' | 'terminal' | 'processing' | 'unavailable';
    leaseId?: string;
    reconciliationRequired?: boolean;
};

/**
 * A Hotmart pode emitir PURCHASE_APPROVED e PURCHASE_COMPLETE para a mesma
 * transação. Ambos significam "approved" para esta automação e devem produzir
 * uma única boas-vindas, mesmo que os IDs de entrega sejam diferentes.
 */
export function automationEventKey(
    info: NormalizedHotmartPayload,
    idempotencySecret: string,
): string {
    if (!idempotencySecret) throw new Error('idempotency_secret_required');
    const fingerprint = [
        info.action,
        info.transaction || info.eventId,
        info.productId || info.productUcode,
    ].join('\u001f');
    return `hotmart_${createHmac('sha256', idempotencySecret)
        .update(fingerprint)
        .digest('hex')
        .slice(0, 40)}`;
}

/**
 * A deduplicação não pode depender do Hottok: essa credencial é rotacionável
 * pela Hotmart. SITE_API_SECRET já é obrigatório no servidor de produção e
 * funciona como fallback estável quando não há segredo dedicado.
 */
export function resolveHotmartIdempotencySecret(
    dedicatedSecret: string | undefined,
    siteApiSecret: string | undefined,
): string {
    return text(dedicatedSecret) || text(siteApiSecret);
}

function transactionReferenceHash(transaction: string, idempotencySecret: string): string | null {
    if (!transaction) return null;
    return createHmac('sha256', idempotencySecret)
        .update(`transaction\u001f${transaction}`)
        .digest('hex');
}

async function pruneExpiredEvents(supabase: SupabaseClient): Promise<void> {
    if (Date.now() - lastRetentionSweepAt < RETENTION_SWEEP_INTERVAL_MS) return;
    lastRetentionSweepAt = Date.now();
    const cutoff = new Date(Date.now() - EVENT_RETENTION_MS).toISOString();
    const { error } = await supabase.from(EVENT_TABLE).delete().lt('created_at', cutoff);
    if (error) console.error('[Hotmart Webhook] Falha na limpeza de retenção dos eventos.');
}

/** Reserva o evento de maneira concorrente; somente um request pode enviar. */
async function claimEvent(
    supabase: SupabaseClient,
    info: NormalizedHotmartPayload,
    eventKey: string,
    idempotencySecret: string,
): Promise<ClaimResult> {
    const now = new Date().toISOString();
    const leaseId = randomUUID();
    const { error: insertError } = await supabase.from(EVENT_TABLE).insert({
        event_id: eventKey,
        event_type: info.event,
        transaction_ref_hash: transactionReferenceHash(info.transaction, idempotencySecret),
        product_id: info.productId || info.productUcode || null,
        lease_id: leaseId,
        status: 'processing',
        updated_at: now,
    });

    if (!insertError) return { state: 'claimed', leaseId };
    if (insertError.code !== '23505') {
        console.error('[Hotmart Webhook] Registro de idempotência indisponível.');
        return { state: 'unavailable' };
    }

    const { data: existing, error: readError } = await supabase
        .from(EVENT_TABLE)
        .select('status, attempt_count, updated_at, lease_id')
        .eq('event_id', eventKey)
        .maybeSingle();

    if (readError || !existing) return { state: 'unavailable' };

    const updatedAt = new Date(existing.updated_at).getTime();
    const ageMs = Number.isFinite(updatedAt) ? Date.now() - updatedAt : Number.POSITIVE_INFINITY;
    if (existing.status === 'sending') {
        // Nunca reivindique novamente uma entrega que chegou a `sending`:
        // o processo pode ter caído depois de a Evolution aceitar a mensagem.
        // Enquanto o envio ainda pode estar em curso, devolvemos 503 para que
        // a Hotmart tente consultar de novo; depois, reconciliamos como incerto.
        if (ageMs < SENDING_STALE_MS) return { state: 'processing' };

        const reconciled = await transitionEvent(
            supabase,
            eventKey,
            existing.lease_id,
            'sending',
            'delivery_unknown',
            'orphaned_sending_state',
        );
        console.error(
            `[Hotmart Webhook] ALERTA_RECONCILIACAO: envio órfão ${eventKey} `
            + (reconciled ? 'marcado como indeterminado.' : 'não pôde ser persistido.'),
        );
        return reconciled
            ? { state: 'terminal', reconciliationRequired: true }
            : { state: 'unavailable' };
    }
    if (['submitted', 'delivery_unknown', 'ignored'].includes(existing.status)) {
        return { state: 'terminal' };
    }

    const stale = ageMs >= PROCESSING_STALE_MS;
    if (existing.status === 'processing' && !stale) return { state: 'processing' };

    const { data: claimed, error: updateError } = await supabase
        .from(EVENT_TABLE)
        .update({
            status: 'processing',
            lease_id: leaseId,
            attempt_count: Math.max(1, Number(existing.attempt_count) || 1) + 1,
            last_error: null,
            processed_at: null,
            updated_at: now,
        })
        .eq('event_id', eventKey)
        .eq('status', existing.status)
        .eq('lease_id', existing.lease_id)
        .eq('updated_at', existing.updated_at)
        .select('event_id')
        .maybeSingle();

    if (updateError) return { state: 'unavailable' };
    return claimed ? { state: 'claimed', leaseId } : { state: 'processing' };
}

/** Mudança de estado com compare-and-set: só o dono atual da lease finaliza. */
async function transitionEvent(
    supabase: SupabaseClient,
    eventId: string,
    leaseId: string,
    fromStatus: EventStatus,
    toStatus: EventStatus,
    errorCode: string | null = null,
    providerMessageId?: string,
): Promise<boolean> {
    for (const retryDelay of TRANSITION_RETRY_DELAYS_MS) {
        if (retryDelay) {
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }

        const now = new Date().toISOString();
        const update: Record<string, string | null> = {
            status: toStatus,
            last_error: errorCode,
            updated_at: now,
            processed_at: ['submitted', 'delivery_unknown', 'ignored'].includes(toStatus) ? now : null,
        };
        if (providerMessageId !== undefined) {
            update.provider_message_id = providerMessageId || null;
        }

        const { data, error } = await supabase
            .from(EVENT_TABLE)
            .update(update)
            .eq('event_id', eventId)
            .eq('lease_id', leaseId)
            .eq('status', fromStatus)
            .select('event_id')
            .maybeSingle();

        if (data && !error) return true;

        // A escrita pode ter sido aplicada mesmo quando a resposta se perdeu.
        // Confirme o estado antes de tentar novamente ou reportar falha.
        const { data: current, error: verifyError } = await supabase
            .from(EVENT_TABLE)
            .select('status, lease_id')
            .eq('event_id', eventId)
            .maybeSingle();
        if (!verifyError && current?.lease_id === leaseId && current.status === toStatus) {
            return true;
        }
        if (
            !verifyError
            && current
            && (current.lease_id !== leaseId || current.status !== fromStatus)
        ) {
            console.error('[Hotmart Webhook] Lease mudou durante a atualização da idempotência.');
            return false;
        }
    }

    console.error('[Hotmart Webhook] Não foi possível persistir a transição da idempotência após retries.');
    return false;
}

async function finalizeSendingState(
    supabase: SupabaseClient,
    eventId: string,
    leaseId: string,
    toStatus: Extract<EventStatus, 'submitted' | 'failed' | 'delivery_unknown'>,
    errorCode: string | null = null,
    providerMessageId?: string,
): Promise<boolean> {
    const persisted = await transitionEvent(
        supabase,
        eventId,
        leaseId,
        'sending',
        toStatus,
        errorCode,
        providerMessageId,
    );
    if (!persisted) {
        // O eventId é um identificador técnico/hash e não contém telefone ou
        // nome. Este alerta permite reconciliação sem registrar PII.
        console.error(
            `[Hotmart Webhook] ALERTA_RECONCILIACAO: resultado ${toStatus} `
            + `do evento ${eventId} não foi persistido; não reenviar automaticamente.`,
        );
    }
    return persisted;
}

function messageFor(info: NormalizedHotmartPayload, checkoutUrl: string): string | null {
    if (info.action === 'ignored') return null;
    const copy = MESSAGES[info.locale];
    const fallbackName = info.locale === 'en' ? 'Rider' : 'Piloto';
    const name = info.firstName || fallbackName;
    if (info.action === 'approved') return copy.approved(name);
    if (info.action === 'cart') return copy.cart(name, checkoutUrl);
    return copy.pending(name, checkoutUrl);
}

export default async function hotmartWebhookHandler(req: Request, res: Response) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'metodo_nao_permitido' });
    }

    const supabase = getSupabase();
    if (!supabase) return res.status(503).json({ error: 'supabase_indisponivel' });

    const config = await loadHotmartConfig(supabase);
    if (!config) return res.status(503).json({ error: 'configuracao_indisponivel' });

    // Autentique antes de normalizar ou registrar qualquer parte do payload.
    const payload = (req.body as unknown) || {};
    const payloadRecord = payload && typeof payload === 'object'
        ? payload as Record<string, unknown>
        : {};
    const expectedToken = config.hotmart_webhook_token;
    const receivedToken = text(req.get('x-hotmart-hottok')) || text(payloadRecord.hottok);
    if (!expectedToken) {
        console.error('[Hotmart Webhook] Hottok ainda não configurado.');
        return res.status(401).json({ error: 'webhook_nao_configurado' });
    }
    if (!receivedToken || !safeTokenEqual(receivedToken, expectedToken)) {
        console.warn('[Hotmart Webhook] Hottok inválido.');
        return res.status(401).json({ error: 'hottok_invalido' });
    }

    const idempotencySecret = resolveHotmartIdempotencySecret(
        process.env.HOTMART_IDEMPOTENCY_SECRET,
        process.env.SITE_API_SECRET,
    );
    if (!idempotencySecret) {
        console.error('[Hotmart Webhook] Segredo estável de idempotência não configurado.');
        return res.status(503).json({ error: 'idempotencia_nao_configurada' });
    }

    await pruneExpiredEvents(supabase);

    const info = normalizeHotmartPayload(payload);
    console.log(`[Hotmart Webhook] evento autenticado: ${info.event || '(vazio)'}.`);

    if (config.wa_automation_enabled === 'false' || config.wa_enabled_course_sales === 'false') {
        return res.status(200).json({ ok: true, ignorado: 'automacao_desativada' });
    }

    if (!config.hotmart_product_id) {
        console.error('[Hotmart Webhook] Produto Hotmart não configurado.');
        return res.status(503).json({ error: 'produto_nao_configurado' });
    }
    if (!matchesHotmartProduct(info, config.hotmart_product_id)) {
        return res.status(200).json({ ok: true, ignorado: 'outro_produto' });
    }

    const checkoutUrl = safeCheckoutUrl(config.hotmart_checkout_url)
        || safeCheckoutUrl(process.env.HOTMART_CHECKOUT_URL || '')
        || CHECKOUT_FALLBACK;
    const message = messageFor(info, checkoutUrl);
    if (!message) {
        return res.status(200).json({ ok: true, ignorado: info.event || null });
    }

    const normalizedPhone = formatPhone(info.phone, info.country);
    if (!normalizedPhone) {
        console.warn(`[Hotmart Webhook] ${info.event || 'evento'} sem telefone utilizável.`);
        return res.status(200).json({ ok: true, sem_telefone: true });
    }

    const eventKey = automationEventKey(info, idempotencySecret);
    const claim = await claimEvent(supabase, info, eventKey, idempotencySecret);
    if (claim.state === 'terminal') {
        return res.status(200).json({
            ok: true,
            duplicado: true,
            ...(claim.reconciliationRequired ? { reconciliacao_manual: true } : {}),
        });
    }
    if (claim.state === 'processing') {
        return res.status(503).json({ error: 'evento_em_processamento' });
    }
    if (claim.state === 'unavailable' || !claim.leaseId) {
        return res.status(503).json({ error: 'idempotencia_indisponivel' });
    }
    const leaseId = claim.leaseId;

    // Instância dedicada obrigatória: vendas do curso nunca usam o número
    // mestre/genericamente configurado como fallback.
    const evolutionConfig = await resolveEvolutionConfig(supabase, 'wa_instance_curso_online', false);
    if (!evolutionReady(evolutionConfig)) {
        await transitionEvent(supabase, eventKey, leaseId, 'processing', 'failed', 'evolution_not_configured');
        return res.status(503).json({ error: 'whatsapp_nao_configurado' });
    }
    if (!(await instanciaConectada(evolutionConfig))) {
        await transitionEvent(supabase, eventKey, leaseId, 'processing', 'failed', 'evolution_not_connected');
        return res.status(503).json({ error: 'whatsapp_desconectado' });
    }

    // `sending` é terminal para retries automáticos. Se o processo cair daqui
    // em diante, não há como saber com certeza se a Evolution recebeu; é mais
    // seguro exigir reconciliação manual do que mandar WhatsApp duplicado.
    const ownsSendingLease = await transitionEvent(
        supabase,
        eventKey,
        leaseId,
        'processing',
        'sending',
    );
    if (!ownsSendingLease) {
        return res.status(503).json({ error: 'lease_perdida' });
    }

    const sendOutcome = await sendWhatsAppText(
        normalizedPhone,
        message,
        evolutionConfig,
        1200,
        info.country,
    );
    if (sendOutcome.result === 'rejected') {
        const persisted = await finalizeSendingState(
            supabase,
            eventKey,
            leaseId,
            'failed',
            'delivery_rejected',
        );
        if (!persisted) {
            return res.status(503).json({ error: 'reconciliacao_pendente' });
        }
        return res.status(503).json({ error: 'falha_no_envio' });
    }
    if (sendOutcome.result === 'unknown') {
        const persisted = await finalizeSendingState(
            supabase,
            eventKey,
            leaseId,
            'delivery_unknown',
            'delivery_unknown',
        );
        if (!persisted) {
            return res.status(503).json({ error: 'reconciliacao_pendente' });
        }
        return res.status(200).json({ ok: true, evento: info.event, enviado: 'indeterminado' });
    }

    // O histórico legado SITE_Automacao_Fila não é usado aqui: ele contém PII
    // e ainda tem consumidores antigos pelo browser. A tabela idempotente acima
    // registra apenas metadados não pessoais da entrega.
    const persisted = await finalizeSendingState(
        supabase,
        eventKey,
        leaseId,
        'submitted',
        null,
        sendOutcome.providerMessageId,
    );
    if (!persisted) {
        return res.status(503).json({ error: 'reconciliacao_pendente' });
    }

    return res.status(200).json({ ok: true, evento: info.event, enviado: true });
}
