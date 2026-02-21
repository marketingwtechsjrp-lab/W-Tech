import { supabase } from './supabaseClient';

export const triggerWebhook = async (triggerKey: 'webhook_lead' | 'webhook_order' | 'webhook_mechanic' | 'webhook_lead_started' | 'webhook_lead_completed', payload: any) => {
  try {
    // 1. Get the URL from Settings
    const { data } = await supabase
      .from('SITE_SystemSettings')
      .select('value')
      .eq('key', triggerKey)
      .single();

    if (data && data.value && data.value.startsWith('http')) {
      // 2. Fire and Forget (don't await response to not block UI)
      fetch(data.value, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            timestamp: new Date().toISOString(),
            event: triggerKey,
            data: payload
        }),
      }).catch(err => console.error("Webhook trigger failed silently:", err));
      
      console.log(`Webhook ${triggerKey} triggered.`);
    } else {
        console.log(`Webhook ${triggerKey} not configured or invalid.`);
    }
  } catch (err) {
    console.error("Error checking webhook settings:", err);
  }
};