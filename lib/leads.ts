import { supabase } from './supabaseClient';
import { Enrollment } from '../types';

/**
 * Syncs a student (enrollment) to the unified SITE_Leads table.
 * This ensures students appear in unified search and can be used in orders.
 */
export async function syncStudentToLeads(enrollment: Partial<Enrollment>) {
    if (!enrollment.studentEmail && !enrollment.studentPhone) return null;

    try {
        // 1. Try to find existing lead by email or phone
        let query = supabase.from('SITE_Leads').select('*');
        if (enrollment.studentEmail) {
            query = query.eq('email', enrollment.studentEmail);
        } else {
            query = query.eq('phone', enrollment.studentPhone);
        }

        const { data: existingLeads } = await query;
        const existing = existingLeads?.[0];

        // Support both camelCase and snake_case properties
        const name = enrollment.studentName || enrollment.student_name;
        const email = enrollment.studentEmail || enrollment.student_email;
        const phone = enrollment.studentPhone || enrollment.student_phone;
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

        const hasWorkshop = enrollment.hasWorkshop !== undefined ? enrollment.hasWorkshop : enrollment.has_workshop;
        const workshopName = enrollment.workshopName || enrollment.workshop_name;
        const worksWithSuspensions = enrollment.worksWithSuspensions !== undefined ? enrollment.worksWithSuspensions : enrollment.works_with_suspensions;
        const tookSuspensionCourse = enrollment.tookSuspensionCourse !== undefined ? enrollment.tookSuspensionCourse : enrollment.took_suspension_course;
        const experienceYears = enrollment.experienceYears || enrollment.experience_years;

        const isPaid = enrollment.status === 'Confirmed' || enrollment.status === 'CheckedIn' || (amountPaid && amountPaid > 0);

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
            conversion_summary: 'Matrícula Confirmada: Lisboa Nov 2026',
            conversion_type: 'Course_Registration',
            workshop_details: {
                name: workshopName || '',
                has_workshop: hasWorkshop || false,
                works_with_suspensions: worksWithSuspensions || false,
                took_suspension_course: tookSuspensionCourse || false,
                experience_years: experienceYears || ''
            },
            notes: `Questionário preenchido no checkout:
- Tem oficina: ${hasWorkshop ? 'Sim (' + workshopName + ')' : 'Não'}
- Trabalha com suspensão: ${worksWithSuspensions ? 'Sim' : 'Não'}
- Fez outro curso de suspensão: ${tookSuspensionCourse ? 'Sim' : 'Não'}
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
