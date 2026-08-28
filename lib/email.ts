import { supabase } from './supabaseClient';

export interface BrevoConfig {
    enabled: boolean;
    host: string;
    port: number;
    login: string;
    key: string;
    senderEmail: string;
    senderName: string;
}

/**
 * Lê a configuração do Brevo de SITE_Config.
 * Pode receber um client Supabase específico (ex.: service role no
 * servidor). Sem argumento, usa o client padrão do projeto.
 */
export const getBrevoConfig = async (client: typeof supabase = supabase): Promise<BrevoConfig | null> => {
    try {
        const { data } = await client.from('SITE_Config').select('*');
        if (!data) return null;

        const map: Record<string, string> = {};
        data.forEach((c: any) => (map[c.key] = c.value));

        return {
            enabled: map['brevo_enabled'] === 'true',
            host: (map['brevo_smtp_host'] || 'smtp-relay.brevo.com').trim(),
            port: parseInt(map['brevo_smtp_port'] || '587', 10),
            login: (map['brevo_smtp_login'] || '').trim(),
            key: (map['brevo_smtp_key'] || '').trim(),
            senderEmail: (map['brevo_sender_email'] || '').trim(),
            senderName: (map['brevo_sender_name'] || 'W-Tech Brasil').trim()
        };
    } catch (error) {
        console.error('Error fetching Brevo config:', error);
        return null;
    }
};
