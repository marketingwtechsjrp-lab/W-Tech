import { supabase } from './supabaseClient';

export const getAsaasConfig = async () => {
    const { data } = await supabase.from('SITE_Config').select('value').eq('key', 'asaas_api_key').single();
    return data?.value || null;
};

// Base URL - Change to 'https://www.asaas.com/api/v3' for production
// Using sandbox for safety by default? Or production? 
// User implied "selling", so likely Production. I should create a way to switch or assume Prod.
// Usually users want Prod. I'll use Prod but comment Sandbox.
const ASAAS_URL = 'https://www.asaas.com/api/v3';
// const ASAAS_URL = 'https://sandbox.asaas.com/api/v3';

export const createAsaasCustomer = async (lead: any) => {
    const apiKey = await getAsaasConfig();
    if (!apiKey) throw new Error('Asaas API Key não configurada.');

    // 1. Search if exists
    const searchRes = await fetch(`${ASAAS_URL}/customers?email=${lead.email}`, {
        method: 'GET',
        headers: {
            'access_token': apiKey
        }
    });

    const searchData = await searchRes.json();
    if (searchData.data && searchData.data.length > 0) {
        return searchData.data[0].id;
    }

    // 2. Create if not exists
    const createRes = await fetch(`${ASAAS_URL}/customers`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'access_token': apiKey
        },
        body: JSON.stringify({
            name: lead.name,
            email: lead.email,
            mobilePhone: lead.phone,
            cpfCnpj: lead.cpf || lead.cnpj || undefined // Optional if not in Lead yet
        })
    });

    const createData = await createRes.json();
    if (createData.errors) throw new Error(createData.errors[0].description);
    return createData.id;
};

export const createPaymentLink = async ({
    lead,
    value,
    description,
    dueDate
}: {
    lead: any,
    value: number,
    description: string,
    dueDate?: string
}) => {
    const apiKey = await getAsaasConfig();
    if (!apiKey) throw new Error('Asaas API Key não configurada.');

    try {
        const customerId = await createAsaasCustomer(lead);

        // Calculate due date (default +3 days)
        const due = new Date();
        due.setDate(due.getDate() + 3);
        const dueDateStr = dueDate || due.toISOString().split('T')[0];

        const payload = {
            customer: customerId,
            billingType: 'UNDEFINED', // Allows user to choose (Pix, card, boleto)
            value: value,
            dueDate: dueDateStr,
            description: description,
            postalService: false
        };

        const res = await fetch(`${ASAAS_URL}/payments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'access_token': apiKey
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.errors) throw new Error(data.errors[0].description);

        return {
            success: true,
            invoiceUrl: data.invoiceUrl,
            id: data.id
        };

    } catch (error: any) {
        console.error("Asaas Error:", error);
        return { success: false, error: error.message };
    }
};
