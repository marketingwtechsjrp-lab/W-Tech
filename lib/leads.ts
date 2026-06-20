import { supabase } from './supabaseClient';
import { Enrollment } from '../types';

/**
 * Syncs a student (enrollment) to the unified SITE_Leads table.
 * This ensures students appear in unified search and can be used in orders.
 */
export async function syncStudentToLeads(enrollment: any) {
    const email = enrollment.studentEmail || enrollment.student_email;
    const phone = enrollment.studentPhone || enrollment.student_phone;

    if (!email && !phone) return null;

    try {
        // 1. Try to find existing lead by email or phone
        let query = supabase.from('SITE_Leads').select('*');
        if (email) {
            query = query.eq('email', email);
        } else {
            query = query.eq('phone', phone);
        }

        const { data: existingLeads } = await query;
        const existing = existingLeads?.[0];

        // Support both camelCase and snake_case properties
        const name = enrollment.studentName || enrollment.student_name;
        const zipCode = enrollment.zipCode || enrollment.zip_code;
        const city = enrollment.city;
        const state = enrollment.state;
        const address = enrollment.address;
        const addressNumber = enrollment.addressNumber || enrollment.address_number;
        const addressNeighborhood = enrollment.addressNeighborhood || enrollment.address_neighborhood;
        const cpf = enrollment.studentCpf || enrollment.student_cpf;
        const tShirtSize = enrollment.tShirtSize || enrollment.t_shirt_size;
        const totalAmount = enrollment.totalAmount || enrollment.total_amount;
        const amountPaid = enrollment.amountPaid || enrollment.amount_paid;

        const isMechanic = enrollment.isMechanic !== undefined ? enrollment.isMechanic : enrollment.is_mechanic;
        const hasWorkshop = enrollment.hasWorkshop !== undefined ? enrollment.hasWorkshop : enrollment.has_workshop;
        const workshopName = enrollment.workshopName || enrollment.workshop_name;
        const workshopAddress = enrollment.workshopAddress || enrollment.workshop_address;
        const worksWithSuspensions = enrollment.worksWithSuspensions !== undefined ? enrollment.worksWithSuspensions : enrollment.works_with_suspensions;
        const tookWtechCourse = enrollment.tookWtechCourse !== undefined ? enrollment.tookWtechCourse : enrollment.took_wtech_course;
        const tookSuspensionCourse = enrollment.tookSuspensionCourse !== undefined ? enrollment.tookSuspensionCourse : enrollment.took_suspension_course;
        const experienceYears = enrollment.experienceYears || enrollment.experience_years;

        const isPaid = enrollment.status === 'Confirmed' || enrollment.status === 'CheckedIn' || (amountPaid && amountPaid > 0);
        const enrolledByName = enrollment.enrolledByName || enrollment.enrolled_by_name;

        const leadData: any = {
            name: name,
            email: email,
            phone: phone,
            type: 'Course_Registration',
            status: isPaid ? 'Converted' : 'Qualified',
            zip_code: zipCode,
            address_street: address,
            address_number: addressNumber,
            address_neighborhood: addressNeighborhood,
            address_city: city,
            address_state: state,
            cpf: cpf,
            t_shirt_size: tShirtSize,
            conversion_value: totalAmount || 380,
            conversion_summary: 'Matrícula Confirmada via Checkout',
            conversion_type: 'Course_Registration',
            ...(enrolledByName && { assigned_to: enrolledByName }),
            workshop_details: {
                name: workshopName || '',
                address: workshopAddress || '',
                is_mechanic: isMechanic || false,
                has_workshop: hasWorkshop || false,
                works_with_suspensions: worksWithSuspensions || false,
                took_wtech_course: tookWtechCourse || false,
                took_suspension_course: tookSuspensionCourse || false,
                experience_years: experienceYears || ''
            },
            notes: `Questionário preenchido no checkout:
- Já é mecânico: ${isMechanic ? 'Sim' : 'Não'}
- Trabalha em mecânica: ${hasWorkshop ? 'Sim (' + workshopName + (workshopAddress ? ' — ' + workshopAddress : '') + ')' : 'Não'}
- Trabalha com suspensão: ${worksWithSuspensions ? 'Sim' : 'Não'}
- Já fez curso da W-Tech: ${tookWtechCourse ? 'Sim' : 'Não'}
- Curso de suspensão fora da W-Tech: ${tookSuspensionCourse ? 'Sim' : 'Não'}
- Tempo na área: ${experienceYears || 'N/A'}`
        };

        if (existing) {
            // Update
            const { data, error } = await supabase
                .from('SITE_Leads')
                .update(leadData)
                .eq('id', existing.id)
                .select()
                .single();
            
            if (error) console.error('Error updating lead from student:', error);
            return data;
        } else {
            // Insert
            const { data, error } = await supabase
                .from('SITE_Leads')
                .insert([leadData])
                .select()
                .single();

            if (error) console.error('Error inserting lead from student:', error);
            return data;
        }
    } catch (err) {
        console.error('Critical error in syncStudentToLeads:', err);
        return null;
    }
}

/** Lista de atendentes (usuários do sistema) para atribuição de leads. */
export async function fetchAttendants(): Promise<{ id: string; name: string }[]> {
    const { data, error } = await supabase
        .from('SITE_Users')
        .select('id, name')
        .order('name', { ascending: true });
    if (error) {
        console.error('Error fetching attendants:', error.message);
        return [];
    }
    return (data || []) as { id: string; name: string }[];
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

    const last8 = digits.slice(-8);

    try {
        // Procura lead existente pelo final do telefone (tolera formatos diferentes).
        const { data: matches } = await supabase
            .from('SITE_Leads')
            .select('id, name, assigned_to')
            .ilike('phone', `%${last8}%`)
            .limit(1);

        const existing = matches?.[0];

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
