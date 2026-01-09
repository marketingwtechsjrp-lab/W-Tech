import { supabase } from './supabaseClient';

interface WhatsAppConfig {
    serverUrl: string;
    apiKey: string;
    instanceName: string;
}

// Global Config (Server URL & Global Key) - Admin Only
export const getGlobalWhatsAppConfig = async (): Promise<Omit<WhatsAppConfig, 'instanceName'> | null> => {
     try {
        const { data } = await supabase.from('SITE_Config').select('*');
        if (!data) return null;

        const map: Record<string, string> = {};
        data.forEach((c: any) => map[c.key] = c.value);

        if (!map['evolution_api_url'] || !map['evolution_api_key']) return null;

        return {
            serverUrl: map['evolution_api_url'],
            apiKey: map['evolution_api_key'],
        };
    } catch (error) {
        console.error('Error fetching Global WhatsApp config:', error);
        return null;
    }
};

// User Specific Config (Combines Global URL/Key with User's Instance)
export const getUserWhatsAppConfig = async (userId: string): Promise<WhatsAppConfig | null> => {
    try {
        // 1. Get Global Settings
        const globalConfig = await getGlobalWhatsAppConfig();
        if (!globalConfig) return null;

        // 2. Get User Instance
        const { data: userInt } = await supabase
            .from('SITE_UserIntegrations')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (!userInt || !userInt.instance_name) return null;

        return {
            serverUrl: globalConfig.serverUrl,
            apiKey: globalConfig.apiKey,
            instanceName: userInt.instance_name
        };
    } catch (error) {
        // console.error('Error fetching User WhatsApp config:', error);
        return null;
    }
};

export const sendWhatsAppMessage = async (to: string, message: string, userId?: string) => {
    // If userId provided, use User Config. If not, try Global (Admin fallback) or fail.
    // For now, let's assume automation ALWAYS provides a userId.
    
    let config: WhatsAppConfig | null = null;

    if (userId) {
        config = await getUserWhatsAppConfig(userId);
    } 
    
    // Fallback logic could go here if we want a "System Instance", but let's stick to user instances as requested.
    if (!config) {
        // Try fallback to old "Admin Default" if no user specific logic found (Legacy support)
        const globalC = await getGlobalWhatsAppConfig();
        const { data: fallbackInstance } = await supabase.from('SITE_Config').select('*').eq('key', 'evolution_instance_name').single();
        if (globalC && fallbackInstance) {
            config = { ...globalC, instanceName: fallbackInstance.value };
        }
    }

    if (!config) {
        console.warn('WhatsApp not configured for user.');
        return { success: false, error: 'WhatsApp não configurado.' };
    }

    // Format phone
    let phone = to.replace(/\D/g, '');
    if (phone.length <= 11) phone = '55' + phone;

    const payload = {
        number: phone,
        text: message
    };

    try {
        const response = await fetch(`${config.serverUrl}/message/sendText/${config.instanceName}`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'apikey': config.apiKey 
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        if (response.ok) {
            return { success: true, data };
        } else {
            console.error('Evolution API Error:', data);
            return { success: false, error: data };
        }
    } catch (error: any) {
        console.error('Network Error Sending WhatsApp:', error);
        return { success: false, error: error.message };
    }
};

export const sendWhatsAppMedia = async (to: string, mediaUrl: string, caption: string = '', userId?: string, mediaType: 'image' | 'video' | 'document' = 'image') => {
    let config: WhatsAppConfig | null = null;

    if (userId) {
        config = await getUserWhatsAppConfig(userId);
    } 
    
    if (!config) {
        const globalC = await getGlobalWhatsAppConfig();
        const { data: fallbackInstance } = await supabase.from('SITE_Config').select('*').eq('key', 'evolution_instance_name').single();
        if (globalC && fallbackInstance) {
            config = { ...globalC, instanceName: fallbackInstance.value };
        }
    }

    if (!config) {
        return { success: false, error: 'WhatsApp não configurado.' };
    }

    let phone = to.replace(/\D/g, '');
    if (phone.length <= 11) phone = '55' + phone;

    const payload: any = {
        number: phone,
        mediatype: mediaType,
        media: mediaUrl,
        fileName: mediaUrl.split('/').pop() || 'file',
        caption: caption,
        delay: 0
    };

    // Evolution API v1 media message endpoint
    const endpoint = `${config.serverUrl}/message/sendMedia/${config.instanceName}`;

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'apikey': config.apiKey 
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        if (response.ok) {
            return { success: true, data };
        } else {
            return { success: false, error: data };
        }
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};
