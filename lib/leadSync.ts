import { findExistingLead, isWonStatus, preserveWonStatus } from './leadMatch';

/**
 * Sincroniza um aluno (matrícula) com a tabela unificada SITE_Leads.
 *
 * Garante que o aluno apareça na busca unificada e possa ser usado em pedidos.
 * Se já existir ficha da pessoa, ATUALIZA; só cria uma nova quando realmente
 * não há ninguém correspondente (ver lib/leadMatch.ts).
 *
 * `supabase` é injetado como em leadMatch: o painel usa o cliente do navegador
 * (lib/leads.ts) e o questionário público roda no servidor (api/_publicEnrollments.ts).
 *
 * Invariantes:
 *  - nunca rebaixa um lead já ganho (Converted/Matriculated);
 *  - nunca sobrescreve dados de conversão reais já gravados pelos webhooks
 *    de pagamento (Mercado Pago / Stripe);
 *  - nunca grava nome de atendente em assigned_to (a coluna é UUID; gravar
 *    texto ali fazia o INSERT/UPDATE inteiro falhar com erro 22P02).
 */
export async function syncStudentToLeadsWith(supabase: any, enrollment: any) {
    const email = enrollment.studentEmail || enrollment.student_email;
    const phone = enrollment.studentPhone || enrollment.student_phone;

    if (!email && !phone) return null;

    try {
        // 1. Localiza a ficha existente (e-mail sem case-sensitive OU últimos 8
        //    dígitos do telefone). Match exato aqui era a causa das duplicatas.
        const existing = await findExistingLead<any>(supabase, { email, phone });

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
            type: 'Course_Registration',
            // Matrícula nunca rebaixa quem já está ganho no funil.
            status: preserveWonStatus(existing?.status, isPaid ? 'Converted' : 'Qualified'),
            zip_code: zipCode,
            address_street: address,
            address_number: addressNumber,
            address_neighborhood: addressNeighborhood,
            address_city: city,
            address_state: state,
            cpf: cpf,
            t_shirt_size: tShirtSize,
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

        // Contato só é sobrescrito quando temos valor — não apaga o que o lead já tem.
        if (email) leadData.email = email;
        if (phone) leadData.phone = phone;

        // Dados de conversão: preserva o que os webhooks de pagamento gravaram.
        // Só escreve quando a ficha ainda não tem valor real registrado.
        const hasRealConversion = isWonStatus(existing?.status) && Number(existing?.conversion_value) > 0;
        if (!hasRealConversion) {
            if (Number(totalAmount) > 0) leadData.conversion_value = Number(totalAmount);
            leadData.conversion_type = 'Course_Registration';
            leadData.conversion_summary = enrolledByName
                ? `Matrícula registrada por ${enrolledByName}`
                : 'Matrícula Confirmada via Checkout';
        }

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
