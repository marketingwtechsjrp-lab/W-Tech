import { supabase } from './supabaseClient';
import { fetchStaffDirectory } from './staffDirectory';
import { findExistingLead } from './leadMatch';
import { syncStudentToLeadsWith } from './leadSync';

/** Painel: mesma regra de lib/leadSync.ts, com o cliente do navegador (passe da equipe). */
export const syncStudentToLeads = (enrollment: any) => syncStudentToLeadsWith(supabase, enrollment);

/** Lista de atendentes (usuários do sistema) para atribuição de leads. */
export async function fetchAttendants(): Promise<{ id: string; name: string }[]> {
    const users = await fetchStaffDirectory();
    return [...users].sort((a, b) => a.name.localeCompare(b.name));
}

export interface CreateLeadFromContactInput {
    name: string;
    phone: string;
    /** id do atendente (SITE_Users.id) que receberá o lead no CRM. */
    assignedTo?: string;
    notes?: string;
    /** origem do lead (context_id). Padrão: WhatsApp. */
    source?: string;
}

/**
 * Cria (ou atualiza) um lead no CRM a partir de um contato do WhatsApp.
 * Deduplica pelo telefone (últimos 8 dígitos) para não duplicar contatos.
 */
export async function createLeadFromContact(
    input: CreateLeadFromContactInput
): Promise<{ success: boolean; existed: boolean; leadId?: string; error?: string }> {
    const digits = (input.phone || '').replace(/\D/g, '');
    if (!digits) return { success: false, existed: false, error: 'Telefone inválido.' };
    if (!input.name?.trim()) return { success: false, existed: false, error: 'Nome obrigatório.' };

    try {
        // Procura lead existente (mesma regra usada em todo o sistema).
        const existing = await findExistingLead<any>(supabase, { phone: digits });

        if (existing) {
            const patch: Record<string, any> = {};
            if (input.assignedTo) patch.assigned_to = input.assignedTo;
            if (input.notes) patch.internal_notes = input.notes;
            const { error } = await supabase.from('SITE_Leads').update(patch).eq('id', existing.id);
            if (error) return { success: false, existed: true, error: error.message };
            return { success: true, existed: true, leadId: existing.id as string };
        }

        const { data, error } = await supabase
            .from('SITE_Leads')
            .insert([
                {
                    name: input.name.trim(),
                    phone: digits,
                    type: 'Contact_Form',
                    status: 'New',
                    context_id: input.source || 'WhatsApp',
                    assigned_to: input.assignedTo || null,
                    internal_notes: input.notes || 'Lead criado a partir do WhatsApp (Meta Cloud API).',
                },
            ])
            .select('id')
            .single();

        if (error) return { success: false, existed: false, error: error.message };
        return { success: true, existed: false, leadId: data?.id as string };
    } catch (e: any) {
        return { success: false, existed: false, error: e?.message || 'Falha ao criar lead.' };
    }
}
