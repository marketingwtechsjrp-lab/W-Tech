
import { supabase } from './lib/supabaseClient';

async function debugQueue() {
    console.log("--- DEBUGGING CAMPAIGN QUEUE ---");
    const { data: failedItems, error: queueError } = await supabase
        .from('SITE_CampaignQueue')
        .select('*')
        .eq('status', 'Failed')
        .limit(5);

    if (queueError) {
        console.error("Error fetching queue:", queueError);
    } else {
        console.log("Failed Items Examples:", JSON.stringify(failedItems, null, 2));
    }

    console.log("--- DEBUGGING WHATSAPP CONFIG ---");
    const { data: config, error: configError } = await supabase
        .from('SITE_Config')
        .select('*')
        .like('key', '%evolution%');
    
    if (configError) {
        console.error("Error fetching config:", configError);
    } else {
        console.log("Config Keys:", config?.map(c => c.key));
    }

    const { data: integrations, error: intError } = await supabase
        .from('SITE_UserIntegrations')
        .select('*');

    if (intError) {
        console.error("Error fetching integrations:", intError);
    } else {
        console.log("User Integrations Count:", integrations?.length);
    }
}

debugQueue();
