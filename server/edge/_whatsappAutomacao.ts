import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Envio de WhatsApp pela Evolution API para as automações de venda.
 *
 * Nasceu para o webhook da Hotmart, mas a lógica é a mesma que o webhook da
 * Kiwify carrega inline. Quando houver como exercitar o fluxo da Kiwify de
 * ponta a ponta, vale migrar aquele handler para cá — hoje ele é caminho de
 * dinheiro em produção e eu não teria como validar a troca.
 */

export interface EvolutionConfig {
    url: string;
    apiKey: string;
    instance: string;
}

/** Números sem DDI recebem 55: o público brasileiro digita só DDD + número. */
export const formatPhone = (phone: string): string => {
    const digits = String(phone || '').replace(/\D/g, '');
    if (!digits) return '';
    return digits.length <= 11 ? `55${digits}` : digits;
};

export const evolutionReady = (config: EvolutionConfig): boolean => (
    Boolean(config.url && config.apiKey && config.instance)
);

/**
 * Resolve a instância a ser usada. A ordem importa: a chave dedicada do curso
 * vem primeiro para que a automação de venda NUNCA saia pelo número mestre por
 * engano — foi assim que a da Kiwify acabou apontando para uma instância morta
 * sem ninguém perceber.
 */
export async function resolveEvolutionConfig(
    supabase: SupabaseClient,
    chaveDeInstancia = 'wa_instance_curso_online',
): Promise<EvolutionConfig> {
    const config: EvolutionConfig = {
        url: (process.env.EVOLUTION_API_URL || '').replace(/\/$/, ''),
        apiKey: process.env.EVOLUTION_API_KEY || '',
        instance: process.env.EVOLUTION_INSTANCE_NAME || '',
    };

    const { data } = await supabase.from('SITE_Config').select('key, value');
    if (!data) return config;

    const map: Record<string, string> = {};
    data.forEach((linha: any) => { map[linha.key] = linha.value; });

    if (map.evolution_api_url) config.url = map.evolution_api_url.replace(/\/$/, '');
    if (map.evolution_api_key) config.apiKey = map.evolution_api_key.trim();

    const instancia = map[chaveDeInstancia]
        || map.automation_whatsapp_instance
        || map.evolution_instance_name;
    if (instancia) config.instance = instancia.trim();

    return config;
}

/**
 * Confere se a instância está de fato conectada antes de tentar enviar.
 * Sem isso, um número desconectado falha silenciosamente — exatamente o que
 * aconteceu com a automação da Kiwify por semanas.
 */
export async function instanciaConectada(config: EvolutionConfig): Promise<boolean> {
    if (!evolutionReady(config)) return false;
    try {
        const resposta = await fetch(`${config.url}/instance/connectionState/${config.instance}`, {
            headers: { apikey: config.apiKey },
            signal: AbortSignal.timeout(4000),
        });
        if (!resposta.ok) return false;
        const dados = await resposta.json() as { instance?: { state?: string } };
        return dados?.instance?.state === 'open';
    } catch {
        return false;
    }
}

export async function sendWhatsAppText(
    phone: string,
    text: string,
    config: EvolutionConfig,
    delay = 1200,
): Promise<boolean> {
    if (!evolutionReady(config)) {
        console.error('[automacao] Evolution sem credenciais — envio abortado.');
        return false;
    }

    try {
        const resposta = await fetch(`${config.url}/message/sendText/${config.instance}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', apikey: config.apiKey },
            body: JSON.stringify({ number: formatPhone(phone), text, delay }),
        });
        if (!resposta.ok) {
            console.error(`[automacao] Evolution recusou o envio (HTTP ${resposta.status}) na instância ${config.instance}.`);
            return false;
        }
        return true;
    } catch (erro) {
        console.error('[automacao] Falha ao enviar WhatsApp:', erro);
        return false;
    }
}

/** Registra o envio na fila, que é o histórico auditável das automações. */
export async function registrarNaFila(
    supabase: SupabaseClient,
    linha: { order_id: string; phone: string; caption: string; video_url?: string | null },
): Promise<void> {
    try {
        await supabase.from('SITE_Automacao_Fila').insert({
            order_id: linha.order_id,
            phone: linha.phone,
            caption: linha.caption,
            video_url: linha.video_url ?? null,
            send_at: new Date().toISOString(),
            processed: true,
        });
    } catch (erro) {
        console.error('[automacao] Não foi possível registrar na fila:', erro);
    }
}
