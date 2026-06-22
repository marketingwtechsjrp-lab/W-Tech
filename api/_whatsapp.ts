import { createClient } from '@supabase/supabase-js';

/**
 * Envio de WhatsApp server-side via Evolution API.
 * Arquivo com prefixo "_" — NÃO vira rota na Vercel; é helper compartilhado.
 *
 * Espelha lib/whatsapp.ts (browser), mas lê a config de SITE_Config com a
 * Service Role Key e usa a instância padrão (evolution_instance_name).
 * Best-effort: nunca lança — retorna { sent: false } se não configurado.
 */

export interface SendWhatsAppResult {
    sent: boolean;
    skipped?: string;
    error?: string;
}

interface EvolutionConfig {
    serverUrl: string;
    apiKey: string;
    instanceName: string;
}

function getServiceClient() {
    const url = process.env.VITE_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) throw new Error('Supabase env vars ausentes');
    return createClient(url, serviceKey);
}

async function loadEvolutionConfig(): Promise<EvolutionConfig | null> {
    try {
        const supabase = getServiceClient();
        const { data } = await supabase.from('SITE_Config').select('key, value');
        const map: Record<string, string> = {};
        (data || []).forEach((c: any) => (map[c.key] = c.value));

        const serverUrl = (map['evolution_api_url'] || '').trim().replace(/\/$/, '');
        const apiKey = (map['evolution_api_key'] || '').trim();
        // Instância dedicada do robô (alertas/cobranças/remarketing), com
        // fallback para a instância padrão do sistema.
        const instanceName = (map['automation_whatsapp_instance'] || '').trim()
            || (map['evolution_instance_name'] || '').trim();

        if (!serverUrl || !apiKey || !instanceName) return null;
        return { serverUrl, apiKey, instanceName };
    } catch (e: any) {
        console.error('[WhatsApp] Falha ao carregar config:', e?.message);
        return null;
    }
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
    return Promise.race([
        p,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} excedeu ${ms}ms`)), ms))
    ]);
}

/** Normaliza telefone BR para o formato da Evolution (55DDDNÚMERO). */
export function normalizePhone(raw: string): string | null {
    const digits = (raw || '').replace(/\D/g, '');
    if (digits.length < 10) return null;
    return digits.length <= 11 ? `55${digits}` : digits;
}

/**
 * Envia mensagem de texto via Evolution API. Best-effort: se o WhatsApp não
 * estiver configurado em Admin → Integrações, retorna skipped sem erro.
 */
export async function sendWhatsAppText(
    to: string,
    text: string,
    instanceName?: string
): Promise<SendWhatsAppResult> {
    const config = await loadEvolutionConfig();
    if (!config) {
        return { sent: false, skipped: 'whatsapp not configured' };
    }

    const phone = normalizePhone(to);
    if (!phone) {
        return { sent: false, skipped: 'invalid phone' };
    }

    // Instância específica da categoria (ex.: servidor x curso online); cai para a padrão.
    const instance = (instanceName || '').trim() || config.instanceName;

    try {
        const response = await withTimeout(
            fetch(`${config.serverUrl}/message/sendText/${instance}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', apikey: config.apiKey },
                body: JSON.stringify({ number: phone, text })
            }),
            10000,
            'Evolution sendText'
        );

        if (!response.ok) {
            const body = await response.text().catch(() => '');
            console.error(`[WhatsApp] Evolution API ${response.status}:`, body.slice(0, 200));
            return { sent: false, error: `Evolution API ${response.status}` };
        }

        console.log(`[WhatsApp] Mensagem enviada para ${phone} ✓`);
        return { sent: true };
    } catch (e: any) {
        console.error('[WhatsApp] Falha no envio:', e?.message);
        return { sent: false, error: e?.message };
    }
}
