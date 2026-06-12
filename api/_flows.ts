import { createClient } from '@supabase/supabase-js';
import { sendEmail } from './_email.js';
import { renderRawEmail } from '../lib/emailTemplates.js';

/**
 * Motor de fluxos de e-mail (follow-up).
 * Arquivo com prefixo "_" — NÃO vira rota. Usado pelo cron e pelo webhook.
 *
 * Modelo (ver email_flows_migration.sql):
 *  - SITE_EmailFlows: trigger_type, status('Active'|'Paused'|'Draft')
 *  - SITE_FlowSteps: step_order, type('Email'|'Delay'|'Condition'|'Exit'), config
 *  - SITE_FlowEnrollments: contact_email, current_step_order, status, next_run_at
 */

// Client sem schema tipado — usamos `any` para evitar que .insert/.update
// sejam inferidos como `never` (o projeto não gera tipos do banco).
type SB = any;

function getServiceClient(): SB {
    const url = process.env.VITE_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) throw new Error('Supabase env vars ausentes');
    return createClient(url, serviceKey);
}

const MS = { hours: 3600_000, days: 86_400_000 };

/**
 * Inscreve um contato em todos os fluxos Ativos de um certo gatilho.
 * Idempotente: não duplica enquanto houver inscrição Active no mesmo fluxo.
 */
export async function enrollContactInFlows(input: {
    email: string;
    name?: string;
    triggerType: 'NovoCadastro' | 'CompraRecente' | 'Inatividade' | 'Tag' | 'Segmento';
    client?: SB;
}): Promise<{ enrolled: number }> {
    const supabase = input.client || getServiceClient();
    const email = (input.email || '').trim().toLowerCase();
    if (!email) return { enrolled: 0 };

    const { data: flows } = await supabase
        .from('SITE_EmailFlows')
        .select('id')
        .eq('status', 'Active')
        .eq('trigger_type', input.triggerType);

    if (!flows || flows.length === 0) return { enrolled: 0 };

    let enrolled = 0;
    for (const flow of flows as any[]) {
        // evita duplicar inscrição ativa
        const { data: existing } = await supabase
            .from('SITE_FlowEnrollments')
            .select('id')
            .eq('flow_id', flow.id)
            .eq('contact_email', email)
            .eq('status', 'Active')
            .limit(1)
            .maybeSingle();
        if (existing) continue;

        const { error } = await supabase.from('SITE_FlowEnrollments').insert([{
            flow_id: flow.id,
            contact_email: email,
            contact_name: input.name || null,
            current_step_order: 0,
            status: 'Active',
            next_run_at: new Date().toISOString()
        }]);
        if (!error) enrolled++;
    }
    return { enrolled };
}

/** Processa um lote de inscrições devidas (chamado pelo cron). */
export async function processDueFlowEnrollments(limit = 50): Promise<{ processed: number; sent: number; errors: number }> {
    const supabase = getServiceClient();
    const nowIso = new Date().toISOString();

    const { data: due } = await supabase
        .from('SITE_FlowEnrollments')
        .select('*')
        .eq('status', 'Active')
        .or(`next_run_at.is.null,next_run_at.lte.${nowIso}`)
        .order('next_run_at', { ascending: true })
        .limit(limit);

    if (!due || due.length === 0) return { processed: 0, sent: 0, errors: 0 };

    let sent = 0;
    let errors = 0;

    for (const enr of due as any[]) {
        try {
            const { data: steps } = await supabase
                .from('SITE_FlowSteps')
                .select('*')
                .eq('flow_id', enr.flow_id)
                .order('step_order', { ascending: true });

            const ordered = (steps || []) as any[];
            let currentOrder: number = enr.current_step_order || 0;
            let idx = ordered.findIndex((s) => s.step_order > currentOrder);
            let nextRunAt: string | null = null;
            let newStatus = 'Active';
            let emailsThisRun = 0;

            while (idx >= 0 && idx < ordered.length) {
                const step = ordered[idx];
                if (step.type === 'Email') {
                    if (emailsThisRun >= 5) { nextRunAt = nowIso; break; } // guard anti-burst
                    const cfg = step.config || {};
                    const { subject, html } = renderRawEmail(cfg.subject || 'Mensagem W-Tech', cfg.body || '', {
                        nome: (enr.contact_name || '').split(' ')[0] || '',
                        name: enr.contact_name || '',
                        email: enr.contact_email
                    });
                    const r = await sendEmail({ to: enr.contact_email, subject, html, type: 'flow' });
                    if (r.sent) sent++; else errors++;
                    emailsThisRun++;
                    currentOrder = step.step_order;
                    idx++;
                } else if (step.type === 'Delay') {
                    const cfg = step.config || {};
                    const unit: 'hours' | 'days' = cfg.unit === 'hours' ? 'hours' : 'days';
                    const value = Number(cfg.value || 1);
                    nextRunAt = new Date(Date.now() + value * MS[unit]).toISOString();
                    currentOrder = step.step_order;
                    break; // agenda e para
                } else if (step.type === 'Exit') {
                    currentOrder = step.step_order;
                    newStatus = 'Exited';
                    break;
                } else {
                    // Condition (sem tracking de open/click ainda) → passa adiante
                    currentOrder = step.step_order;
                    idx++;
                }
            }

            // Se não há mais passos à frente, completa
            if (idx >= ordered.length && newStatus === 'Active') {
                newStatus = 'Completed';
            }

            const update: any = {
                current_step_order: currentOrder,
                status: newStatus,
                updated_at: new Date().toISOString()
            };
            if (newStatus === 'Active') update.next_run_at = nextRunAt;
            if (newStatus === 'Completed') update.completed_at = new Date().toISOString();

            await supabase.from('SITE_FlowEnrollments').update(update).eq('id', enr.id);
        } catch (e: any) {
            errors++;
            console.error(`[Flows] Erro na inscrição ${enr.id}:`, e?.message);
            await supabase.from('SITE_FlowEnrollments').update({ status: 'Failed' }).eq('id', enr.id);
        }
    }

    return { processed: due.length, sent, errors };
}
