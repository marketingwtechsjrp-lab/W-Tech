import { supabase } from './supabaseClient';

interface WhatsAppConfig {
    serverUrl: string;
    apiKey: string;
    instanceName: string;
}

/**
 * Config global do Evolution (URL + chave) lida de SITE_Config.
 *
 * ATENÇÃO (segurança): esta função ainda lê `evolution_api_key` no navegador.
 * O ENVIO de mensagens já foi movido para o servidor (/api/whatsapp-send); o que
 * resta aqui é o uso pelas telas de ADMIN de gestão de instância/QR
 * (AdminIntegrations, UserWhatsAppConnection, GroupBotPanel). Enquanto esses
 * fluxos não forem movidos ao servidor, NÃO aplicar o lock de RLS sobre
 * `evolution_api_key` (senão a conexão/QR do admin quebra). Ver plano, Fase 3.
 */
export const getGlobalWhatsAppConfig = async (): Promise<Omit<WhatsAppConfig, 'instanceName'> | null> => {
     try {
        const { data } = await supabase.from('SITE_Config').select('*');
        if (!data) return null;

        const map: Record<string, string> = {};
        data.forEach((c: any) => map[c.key] = c.value);

        // Chave/URL ausentes (ex.: leitura bloqueada por RLS) → null, sem TypeError.
        if (!map['evolution_api_url'] || !map['evolution_api_key']) return null;

        return {
            serverUrl: map['evolution_api_url'].replace(/\/$/, ''),
            apiKey: map['evolution_api_key'].trim(),
        };
    } catch (error) {
        console.error('Error fetching Global WhatsApp config:', error);
        return null;
    }
};

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
