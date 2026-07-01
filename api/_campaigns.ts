import { createClient } from '@supabase/supabase-js';
import { sendEmail } from './_email.js';
import { renderRawEmail } from '../lib/emailTemplates.js';
import { sendWhatsAppText } from './_whatsapp.js';

/**
 * Processador server-side de campanhas de marketing (e-mail + WhatsApp).
 * Arquivo com prefixo "_" — helper compartilhado (não vira rota).
 *
 * Diferente do QueueProcessor do navegador (que exige a aba aberta e só faz
 * WhatsApp pela instância pessoal), este roda no cron e "fica disparando"
 * sozinho: pega campanhas em andamento, processa um lote da fila por execução
 * e marca como concluída quando esvazia.
 *
 * Anti-bloqueio do WhatsApp:
 *   - teto de envios por execução (resto fica para a próxima)
 *   - intervalo aleatório entre envios
 *   - spintax {a|b|c} no conteúdo → cada lead recebe variação diferente
 *
 * Respeita scheduled_for (campanha agendada só dispara na hora marcada) e o
 * kill switch SITE_Config.campaigns_autosend_enabled = 'false'.
 */

const MAX_EMAILS_PER_RUN = 80;
const MAX_WA_PER_RUN = 6;
const WA_DELAY_MIN_MS = 8_000;
const WA_DELAY_MAX_MS = 20_000;

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const randomBetween = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));

/** Resolve spintax {opção1|opção2|...} sorteando uma opção por chamada. */
function resolveSpintax(text: string): string {
    return text.replace(/\{([^{}|]+(?:\|[^{}|]+)+)\}/g, (_, group: string) => {
        const options = group.split('|');
        return options[Math.floor(Math.random() * options.length)];
    });
}

/** Interpola {{nome}}, {{email}}, {{telefone}} e demais campos de recipient_data. */
function interpolateVars(text: string, item: any): string {
    if (!text) return '';
    let result = text
        .replace(/\{\{name\}\}/g, item.recipient_name || 'Cliente')
        .replace(/\{\{nome\}\}/g, item.recipient_name || 'Cliente')
        .replace(/\{\{phone\}\}/g, item.recipient_phone || '')
        .replace(/\{\{telefone\}\}/g, item.recipient_phone || '')
        .replace(/\{\{email\}\}/g, item.recipient_email || '');
    if (item.recipient_data && typeof item.recipient_data === 'object') {
        for (const key of Object.keys(item.recipient_data)) {
            const val = item.recipient_data[key];
            if (val !== undefined && val !== null) {
                result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(val));
            }
        }
    }
    return result;
}

export interface CampaignRunResult {
    campaignsProcessed: number;
    emailsSent: number;
    whatsappSent: number;
    failed: number;
    skipped?: string;
    details: Array<{ campaign: string; channel: string; sent: number; failed: number; remaining: number }>;
}

function getServiceClient() {
    const url = process.env.VITE_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) throw new Error('Supabase env vars ausentes');
    return createClient(url, serviceKey);
}

/**
 * Processa campanhas em andamento. Cada execução envia um lote por canal,
 * com os tetos anti-bloqueio. Campanhas grandes terminam ao longo de várias
 * execuções do cron.
 */
export async function processActiveCampaigns(): Promise<CampaignRunResult> {
    const supabase = getServiceClient();
    const result: CampaignRunResult = { campaignsProcessed: 0, emailsSent: 0, whatsappSent: 0, failed: 0, details: [] };

    // Kill switch + instância Evolution dedicada de campanhas (vazio = padrão)
    const { data: cfgRows } = await supabase
        .from('SITE_Config')
        .select('key, value')
        .in('key', ['campaigns_autosend_enabled', 'wa_instance_campaign']);
    const cfg: Record<string, string> = {};
    (cfgRows || []).forEach((c: any) => (cfg[c.key] = c.value));
    if (cfg['campaigns_autosend_enabled'] === 'false') {
        return { ...result, skipped: 'campaigns autosend disabled' };
    }
    const campaignInstance = (cfg['wa_instance_campaign'] || '').trim() || undefined;

    const nowIso = new Date().toISOString();

    // Campanhas prontas para disparar: em processamento e (sem agendamento OU já na hora)
    const { data: campaigns } = await supabase
        .from('SITE_MarketingCampaigns')
        .select('*')
        .eq('status', 'Processing')
        .or(`scheduled_for.is.null,scheduled_for.lte.${nowIso}`)
        .order('created_at', { ascending: true })
        .limit(5);

    if (!campaigns || campaigns.length === 0) return result;

    let emailBudget = MAX_EMAILS_PER_RUN;
    let waBudget = MAX_WA_PER_RUN;

    for (const campaign of campaigns as any[]) {
        if (emailBudget <= 0 && waBudget <= 0) break;

        const isEmail = campaign.channel === 'Email';
        const batchLimit = isEmail ? Math.min(emailBudget, 25) : Math.min(waBudget, MAX_WA_PER_RUN);
        if (batchLimit <= 0) continue;

        const { data: items } = await supabase
            .from('SITE_CampaignQueue')
            .select('*')
            .eq('campaign_id', campaign.id)
            .eq('status', 'Pending')
            .limit(batchLimit);

        if (!items || items.length === 0) {
            // Nada pendente → conclui a campanha
            await supabase.from('SITE_MarketingCampaigns').update({ status: 'Completed' }).eq('id', campaign.id);
            continue;
        }

        result.campaignsProcessed++;
        let sent = 0;
        let failed = 0;

        for (const item of items as any[]) {
            // Garante posse do item (evita corrida com o processador do navegador)
            const { data: claimed } = await supabase
                .from('SITE_CampaignQueue')
                .update({ status: 'Sending' })
                .eq('id', item.id)
                .eq('status', 'Pending')
                .select();
            if (!claimed || !claimed[0]) continue;

            let ok = false;
            let errMsg = '';

            try {
                if (isEmail) {
                    if (emailBudget <= 0) { // devolve para a fila
                        await supabase.from('SITE_CampaignQueue').update({ status: 'Pending' }).eq('id', item.id);
                        break;
                    }
                    if (!item.recipient_email) {
                        errMsg = 'sem e-mail';
                    } else {
                        const subject = interpolateVars(campaign.subject || campaign.name || 'W-Tech Brasil', item);
                        const bodyHtml = interpolateVars(resolveSpintax(campaign.content || ''), item).replace(/\n/g, '<br/>');
                        const { subject: subj, html } = renderRawEmail(subject, bodyHtml, {});
                        const r = await sendEmail({ to: item.recipient_email, subject: subj, html, type: `campaign_${campaign.id}` });
                        ok = r.sent;
                        if (!ok) errMsg = r.skipped || r.error || 'falhou';
                    }
                    if (ok) { emailBudget--; result.emailsSent++; }
                } else {
                    if (waBudget <= 0) {
                        await supabase.from('SITE_CampaignQueue').update({ status: 'Pending' }).eq('id', item.id);
                        break;
                    }
                    if (!item.recipient_phone) {
                        errMsg = 'sem telefone';
                    } else {
                        // Ritmo humano entre envios de WhatsApp
                        if (result.whatsappSent > 0) await sleep(randomBetween(WA_DELAY_MIN_MS, WA_DELAY_MAX_MS));
                        const message = interpolateVars(resolveSpintax(campaign.content || ''), item);
                        const r = await sendWhatsAppText(item.recipient_phone, message, campaignInstance);
                        ok = r.sent;
                        if (!ok) errMsg = r.skipped || r.error || 'falhou';
                    }
                    if (ok) { waBudget--; result.whatsappSent++; }
                }
            } catch (e: any) {
                errMsg = e?.message || 'erro';
            }

            await supabase.from('SITE_CampaignQueue').update({
                status: ok ? 'Sent' : 'Failed',
                sent_at: new Date().toISOString(),
                error_message: errMsg || null
            }).eq('id', item.id);

            if (ok) sent++; else { failed++; result.failed++; }
        }

        // Atualiza estatísticas e verifica conclusão
        const { count: remaining } = await supabase
            .from('SITE_CampaignQueue')
            .select('*', { count: 'exact', head: true })
            .eq('campaign_id', campaign.id)
            .eq('status', 'Pending');

        const { count: totalSent } = await supabase
            .from('SITE_CampaignQueue')
            .select('*', { count: 'exact', head: true })
            .eq('campaign_id', campaign.id)
            .eq('status', 'Sent');
        const { count: totalFailed } = await supabase
            .from('SITE_CampaignQueue')
            .select('*', { count: 'exact', head: true })
            .eq('campaign_id', campaign.id)
            .eq('status', 'Failed');

        await supabase.from('SITE_MarketingCampaigns').update({
            stats: { sent: totalSent || 0, failed: totalFailed || 0, total: (totalSent || 0) + (totalFailed || 0) + (remaining || 0) },
            ...((remaining || 0) === 0 ? { status: 'Completed' } : {})
        }).eq('id', campaign.id);

        result.details.push({
            campaign: campaign.name,
            channel: campaign.channel,
            sent,
            failed,
            remaining: remaining || 0
        });
    }

    return result;
}
