import { supabase } from './supabaseClient';

/**
 * Instância Evolution configurada para uma rota de saída (Admin → Integrações →
 * Motor de Envio). Vazio/erro = null (o chamador cai no comportamento padrão).
 *   - 'campaign' → campanhas de marketing (QueueProcessor / servidor)
 *   - 'crm'      → mensagens automáticas do CRM (tarefas concluídas etc.)
 *   - 'recovery' → recuperação de vendas (pré-seleção do dropdown)
 * (Lê apenas o NOME da instância — não é segredo.)
 */
export type WaRoute = 'campaign' | 'crm' | 'recovery';

export const getRouteInstance = async (route: WaRoute): Promise<string | null> => {
    try {
        const { data } = await supabase
            .from('SITE_Config')
            .select('value')
            .eq('key', `wa_instance_${route}`)
            .maybeSingle();
        const v = (data?.value || '').trim();
        return v || null;
    } catch {
        return null;
    }
};

/**
 * Envia texto no WhatsApp — agora 100% no servidor (/api/whatsapp-send).
 * SEGURANÇA: a `evolution_api_key` não é mais lida no navegador para enviar.
 * Assinatura preservada — o 3º argumento (UUID de usuário ou nome de instância)
 * é resolvido no servidor, igual ao comportamento anterior.
 */
export const sendWhatsAppMessage = async (to: string, message: string, userId?: string) => {
    try {
        const res = await fetch('/api/whatsapp-send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to, message, instance: userId }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) {
            return { success: false, error: data?.error || `HTTP ${res.status}` };
        }
        return { success: true, data };
    } catch (error: any) {
        console.error('Network Error Sending WhatsApp:', error?.message);
        return { success: false, error: error?.message };
    }
};

/**
 * Envia mídia (imagem/vídeo/documento) no WhatsApp — agora no servidor.
 * Assinatura preservada.
 */
export const sendWhatsAppMedia = async (
    to: string,
    mediaUrl: string,
    caption: string = '',
    userId?: string,
    mediaType: 'image' | 'video' | 'document' = 'image'
) => {
    try {
        const res = await fetch('/api/whatsapp-send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to, mediaUrl, caption, mediaType, instance: userId }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) {
            return { success: false, error: data?.error || `HTTP ${res.status}` };
        }
        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error?.message };
    }
};
