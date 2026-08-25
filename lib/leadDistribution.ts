import { supabase } from './supabaseClient';
import { triggerWebhook } from './webhooks';
import { getLeadTrackingFields } from './tracking';

/**
 * Atendentes que recebem leads no rodizio automatico.
 *
 * Os IDs ficam fixos aqui porque as landing pages sao publicas (chave anon) e
 * SITE_Users nao e legivel pelo browser — a leitura da tabela exige sessao de
 * staff (ver lib/staffDirectory.ts). Espelha a flag receives_leads = true no
 * admin; ao ligar/desligar a flag de alguem, atualize esta lista tambem.
 */
export const LEAD_ATTENDANTS = [
    { id: '30c76614-3df4-47c5-89e7-6987b8328d8f', name: 'Christopher' },
    { id: '95cfe965-58f8-4f11-9449-464fabac15d9', name: 'Michael' },
    { id: '1a370d9a-8bd1-447e-85c0-82694770b089', name: 'Emerson' },
];

/**
 * Sorteia (aleatorio) um atendente para um lead novo.
 * Se a lista estiver vazia devolve null e o lead entra sem dono — nesse caso a
 * trigger auto_distribute_lead do banco assume a distribuicao.
 */
export const distributeLead = async (): Promise<string | null> => {
    if (LEAD_ATTENDANTS.length === 0) return null;
    const pick = LEAD_ATTENDANTS[Math.floor(Math.random() * LEAD_ATTENDANTS.length)];
    return pick.id;
};

interface LeadPayload {
    name: string;
    email?: string;
    phone: string;
    type?: string;
    status?: string;
    context_id?: string;
    tags?: string[];
    origin?: string;
    assigned_to?: string | null;
    [key: string]: any;
}

/**
 * Handles Lead Creation or Update (Upsert Logic)
 * - If phone exists: Updates status to 'New', updates context/tags, BUT KEEPS 'assigned_to'.
 * - If new: Inserts with provided or distributed 'assigned_to'.
 */
export const handleLeadUpsert = async (payload: LeadPayload) => {
    try {
        // 0. Atribuição de tráfego (LEI 10): UTMs capturadas no navegador.
        const tracking = getLeadTrackingFields();

        // 1. Sanitize Phone (digits only for search)
        const phoneDigits = payload.phone.replace(/\D/g, '');
        
        // 2. Search for existing lead by phone directly in DB
        // Note: This relies on phone being stored reasonably consistent.
        // For better accuracy, we search using a "contains" or exact match on cleaned version if possible, 
        // but typically leads are stored as they come. Let's try exact match on phone column first.
        
        let { data: existingLead } = await supabase
            .from('SITE_Leads')
            .select('*')
            .eq('phone', payload.phone) // Try exact match first
            .single();

        if (!existingLead) {
             // Try searching by email if phone failed
             const { data: existingLeadEmail } = await supabase
                .from('SITE_Leads')
                .select('*')
                .eq('email', payload.email)
                .single();
             existingLead = existingLeadEmail;
        }

        if (existingLead) {
            console.log(`[LeadUpsert] Found existing lead ${existingLead.id}. Updating...`);
            
            // UTMs: preserva o first-touch — só grava as chaves que ainda não existem
            // no lead. Recadastro não sobrescreve a atribuição original.
            const trackingToFill: Record<string, string> = {};
            for (const [k, v] of Object.entries(tracking)) {
                if (v && !existingLead[k]) trackingToFill[k] = v;
            }

            // MERGE Logic
            const updatePayload = {
                ...payload,
                ...trackingToFill,
                status: 'New', // FORCE RESET STATUS TO NEW
                // params to PRESERVE from existing:
                assigned_to: existingLead.assigned_to, // KEEP ORIGINAL OWNER
                id: existingLead.id,
                updated_at: new Date().toISOString()
            };

            // Merge tags
            if (payload.tags && existingLead.tags) {
                const mergedTags = Array.from(new Set([...existingLead.tags, ...payload.tags]));
                updatePayload.tags = mergedTags;
            }

            // Update in DB
            const { error: updateError } = await supabase
                .from('SITE_Leads')
                .update(updatePayload)
                .eq('id', existingLead.id);

            if (updateError) throw updateError;
            
            // Trigger Webhook for "Re-conversion"
            await triggerWebhook('webhook_lead', updatePayload);
            
            return { action: 'updated', id: existingLead.id, assigned_to: existingLead.assigned_to };

        } else {
            console.log(`[LeadUpsert] New Lead. Inserting...`);
            
            // Distribute if not assigned
            if (!payload.assigned_to) {
                payload.assigned_to = await distributeLead();
            }

            // UTMs do toque atual (last-touch) no lead novo.
            const insertPayload = { ...tracking, ...payload };

            const { data: newLead, error: insertError } = await supabase
                .from('SITE_Leads')
                .insert([insertPayload])
                .select()
                .single();

            if (insertError) throw insertError;

            await triggerWebhook('webhook_lead', insertPayload);

            // Automação: inscreve o lead NOVO nos fluxos de boas-vindas
            // (gatilho NovoCadastro). Não-fatal e fire-and-forget — nunca
            // atrapalha a criação do lead. Recadastros não entram de novo.
            import('./flows')
                .then(({ enrollContactInFlowsClient }) =>
                    enrollContactInFlowsClient({ email: payload.email, name: payload.name, triggerType: 'NovoCadastro' })
                )
                .catch(err => console.error('[LeadUpsert] Enroll NovoCadastro falhou (não-fatal):', err));

            return { action: 'created', id: newLead.id, assigned_to: payload.assigned_to };
        }

    } catch (error) {
        console.error("[LeadUpsert] Error:", error);
        throw error;
    }
};

