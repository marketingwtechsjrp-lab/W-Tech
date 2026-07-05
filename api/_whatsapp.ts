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

/** JID da Evolution (grupo `…@g.us` ou contato `…@s.whatsapp.net`) — vai intacto. */
function isJid(raw: string): boolean {
    return (raw || '').includes('@');
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

    // Grupo/JID (…@g.us) vai intacto; telefone comum é normalizado (55DDD…)
    const phone = isJid(to) ? to.trim() : normalizePhone(to);
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

/**
 * Envia mídia (imagem/vídeo/documento) via Evolution API. Espelha o antigo
 * lib/whatsapp.ts (browser), mas com a chave lida server-side. Best-effort.
 */
export async function sendWhatsAppMedia(
    to: string,
    mediaUrl: string,
    caption: string = '',
    instanceName?: string,
    mediaType: 'image' | 'video' | 'document' = 'image'
): Promise<SendWhatsAppResult> {
    const config = await loadEvolutionConfig();
    if (!config) {
        return { sent: false, skipped: 'whatsapp not configured' };
    }

    const phone = isJid(to) ? to.trim() : normalizePhone(to);
    if (!phone) {
        return { sent: false, skipped: 'invalid phone' };
    }

    const instance = (instanceName || '').trim() || config.instanceName;

    const payload = {
        number: phone,
        mediatype: mediaType,
        media: mediaUrl,
        fileName: mediaUrl.split('/').pop() || 'file',
        caption,
        delay: 0,
    };

    try {
        const response = await withTimeout(
            fetch(`${config.serverUrl}/message/sendMedia/${instance}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', apikey: config.apiKey },
                body: JSON.stringify(payload)
            }),
            15000,
            'Evolution sendMedia'
        );

        if (!response.ok) {
            const body = await response.text().catch(() => '');
            console.error(`[WhatsApp] Evolution API (media) ${response.status}:`, body.slice(0, 200));
            return { sent: false, error: `Evolution API ${response.status}` };
        }

        console.log(`[WhatsApp] Mídia enviada para ${phone} ✓`);
        return { sent: true };
    } catch (e: any) {
        console.error('[WhatsApp] Falha no envio de mídia:', e?.message);
        return { sent: false, error: e?.message };
    }
}

/**
 * Resolve o nome da instância a partir do 3º argumento usado pelo cliente:
 *   - UUID  → instância do usuário (SITE_UserIntegrations.instance_name)
 *   - texto → nome de instância direto
 *   - vazio → instância padrão do sistema (evolution_instance_name), preservando
 *             o comportamento anterior do lib/whatsapp.ts (browser).
 */
export async function resolveInstanceFromArg(instanceArg?: string): Promise<string | undefined> {
    const v = (instanceArg || '').trim();
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    try {
        const supabase = getServiceClient();
        if (v && UUID_RE.test(v)) {
            const { data } = await supabase
                .from('SITE_UserIntegrations')
                .select('instance_name')
                .eq('user_id', v)
                .maybeSingle();
            return (data?.instance_name || '').trim() || undefined;
        }
        if (v) return v;
        // Sem instância explícita → default histórico do cliente.
        const { data } = await supabase
            .from('SITE_Config')
            .select('value')
            .eq('key', 'evolution_instance_name')
            .maybeSingle();
        return (data?.value || '').trim() || undefined;
    } catch {
        return v || undefined;
    }
}
