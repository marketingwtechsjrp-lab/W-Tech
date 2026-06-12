import { supabase } from './supabaseClient';

/**
 * Inscrição de contatos em fluxos de e-mail a partir do CLIENTE (admin/CRM).
 * Espelha a lógica de api/_flows.ts (enrollContactInFlows), mas usa o client
 * Supabase do browser — as tabelas de fluxo têm RLS aberta ("Allow all").
 *
 * O envio em si continua 100% no servidor (cron /api/process-email-flows).
 */
export async function enrollContactInFlowsClient(input: {
    email?: string | null;
    name?: string | null;
    triggerType: 'NovoCadastro' | 'CompraRecente' | 'Inatividade' | 'Perda' | 'Tag' | 'Segmento';
}): Promise<{ enrolled: number }> {
    const email = (input.email || '').trim().toLowerCase();
    if (!email) return { enrolled: 0 };

    try {
        const { data: flows } = await supabase
            .from('SITE_EmailFlows')
            .select('id')
            .eq('status', 'Active')
            .eq('trigger_type', input.triggerType);

        if (!flows || flows.length === 0) return { enrolled: 0 };

        let enrolled = 0;
        for (const flow of flows as { id: string }[]) {
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
    } catch (err) {
        console.error('[Flows] Falha ao inscrever contato em fluxos (não-fatal):', err);
        return { enrolled: 0 };
    }
}
