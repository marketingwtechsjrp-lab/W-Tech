import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { renderTemplate } from '../lib/emailTemplates.js';

/**
 * Motor de envio de e-mail (Brevo SMTP via nodemailer).
 * Arquivo com prefixo "_" — NÃO vira rota na Vercel; é helper compartilhado
 * pelo webhook do MP, pela rota de teste e pelo processador de fluxos.
 *
 * Lê as credenciais de SITE_Config usando a Service Role Key (server-only),
 * para o segredo SMTP nunca trafegar pelo cliente.
 */

export interface SendEmailInput {
    to: string;
    subject: string;
    html: string;
    type?: string;          // ex: 'confirmacao_inscricao' | 'flow' | 'test'
    enrollmentId?: string;  // vínculo opcional p/ idempotência
}

export interface SendEmailResult {
    sent: boolean;
    skipped?: string;
    error?: string;
}

interface BrevoServerConfig {
    enabled: boolean;
    host: string;
    port: number;
    login: string;
    key: string;
    senderEmail: string;
    senderName: string;
}

function getServiceClient() {
    const url = process.env.VITE_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) throw new Error('Supabase env vars ausentes (VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)');
    return createClient(url, serviceKey);
}

async function loadBrevoConfig(supabase: ReturnType<typeof getServiceClient>): Promise<BrevoServerConfig> {
    const { data } = await supabase.from('SITE_Config').select('*');
    const map: Record<string, string> = {};
    (data || []).forEach((c: any) => (map[c.key] = c.value));
    return {
        enabled: map['brevo_enabled'] === 'true',
        host: (map['brevo_smtp_host'] || 'smtp-relay.brevo.com').trim(),
        port: parseInt(map['brevo_smtp_port'] || '587', 10),
        login: (map['brevo_smtp_login'] || '').trim(),
        key: (map['brevo_smtp_key'] || '').trim(),
        senderEmail: (map['brevo_sender_email'] || '').trim(),
        senderName: (map['brevo_sender_name'] || 'W-Tech Brasil').trim()
    };
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
    return Promise.race([
        p,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} excedeu ${ms}ms`)), ms))
    ]);
}

/** Registra o envio em SITE_EmailLogs (best-effort, nunca lança). */
async function logEmail(
    supabase: ReturnType<typeof getServiceClient>,
    input: SendEmailInput,
    status: 'Sent' | 'Failed',
    errorMessage?: string
): Promise<void> {
    try {
        await supabase.from('SITE_EmailLogs').insert([{
            recipient_email: input.to,
            status,
            error_message: errorMessage || null,
            type: input.type || null,
            subject: input.subject,
            enrollment_id: input.enrollmentId || null
        }]);
    } catch (e: any) {
        console.error('[Email] Falha ao registrar log (não-fatal):', e?.message);
    }
}

/**
 * Envia um e-mail via Brevo SMTP. Best-effort: retorna { sent: false, error }
 * em vez de lançar, para nunca derrubar o fluxo que o chama (webhook etc.).
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
    let supabase: ReturnType<typeof getServiceClient>;
    try {
        supabase = getServiceClient();
    } catch (e: any) {
        console.error('[Email] Config Supabase ausente:', e?.message);
        return { sent: false, error: e?.message };
    }

    const cfg = await loadBrevoConfig(supabase);

    if (!cfg.enabled) {
        console.log('[Email] brevo_enabled=false — envio ignorado.');
        return { sent: false, skipped: 'brevo disabled' };
    }
    if (!cfg.key || !cfg.login || !cfg.senderEmail) {
        const msg = 'Configuração Brevo incompleta (login/key/remetente).';
        console.error('[Email]', msg);
        await logEmail(supabase, input, 'Failed', msg);
        return { sent: false, error: msg };
    }

    try {
        const transport = nodemailer.createTransport({
            host: cfg.host,
            port: cfg.port,
            secure: cfg.port === 465, // 465 = SSL; 587 = STARTTLS
            auth: { user: cfg.login, pass: cfg.key }
        });

        await withTimeout(
            transport.sendMail({
                from: `"${cfg.senderName}" <${cfg.senderEmail}>`,
                to: input.to,
                subject: input.subject,
                html: input.html
            }),
            12000,
            'Envio SMTP'
        );

        await logEmail(supabase, input, 'Sent');
        console.log(`[Email] Enviado para ${input.to} (${input.type || 'sem tipo'}) ✓`);
        return { sent: true };
    } catch (e: any) {
        const msg = e?.message || 'erro desconhecido no envio SMTP';
        console.error('[Email] Falha no envio:', msg);
        await logEmail(supabase, input, 'Failed', msg);
        return { sent: false, error: msg };
    }
}

/**
 * Verifica se já existe um e-mail de um certo tipo enviado para uma inscrição
 * (idempotência — ex.: não reenviar a confirmação se o webhook repetir).
 */
export async function alreadySent(enrollmentId: string, type: string): Promise<boolean> {
    try {
        const supabase = getServiceClient();
        const { data } = await supabase
            .from('SITE_EmailLogs')
            .select('id')
            .eq('enrollment_id', enrollmentId)
            .eq('type', type)
            .eq('status', 'Sent')
            .limit(1)
            .maybeSingle();
        return !!data;
    } catch {
        return false; // em caso de erro, não bloqueia o envio
    }
}

/** Idempotência para comunicações sem matrícula, como as automações do RH. */
export async function alreadySentForRecipient(to: string, type: string): Promise<boolean> {
    try {
        const supabase = getServiceClient();
        const { data } = await supabase
            .from('SITE_EmailLogs')
            .select('id')
            .eq('recipient_email', to)
            .eq('type', type)
            .eq('status', 'Sent')
            .limit(1)
            .maybeSingle();
        return !!data;
    } catch {
        return false;
    }
}

/** Atalho: renderiza um template e envia. */
export async function sendTemplate(
    to: string,
    templateName: string,
    vars: Record<string, unknown>,
    extra?: { type?: string; enrollmentId?: string }
): Promise<SendEmailResult> {
    const { subject, html } = renderTemplate(templateName, vars);
    return sendEmail({ to, subject, html, type: extra?.type || templateName, enrollmentId: extra?.enrollmentId });
}
