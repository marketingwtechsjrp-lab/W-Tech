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

        const leadData: any = {
            name: enrollment.studentName,
            email: enrollment.studentEmail,
            phone: enrollment.studentPhone,
            type: 'Course_Registration',
            status: 'Qualified', // Default status for course students
            zip_code: enrollment.zipCode,
            address_city: enrollment.city,
            address_state: enrollment.state,
            cpf: enrollment.studentCpf,
            t_shirt_size: enrollment.tShirtSize,
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
