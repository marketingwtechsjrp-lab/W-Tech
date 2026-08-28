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

export type WhatsAppSendResult = 'accepted' | 'rejected' | 'unknown';
export interface WhatsAppSendOutcome {
    result: WhatsAppSendResult;
    providerMessageId: string;
}

// DDIs por país ISO usados para confirmar que um telefone internacional sem
// sinal de "+" já veio completo da Hotmart. Para país desconhecido, +/00
// continua obrigatório; nunca inventamos um DDI.
const COUNTRY_CALLING_CODES: Record<string, readonly string[]> = {
    AD: ['376'], AE: ['971'], AF: ['93'], AG: ['1'], AI: ['1'], AL: ['355'],
    AM: ['374'], AO: ['244'], AQ: ['672'], AR: ['54'], AS: ['1'], AT: ['43'],
    AU: ['61'], AW: ['297'], AX: ['358'], AZ: ['994'], BA: ['387'], BB: ['1'],
    BD: ['880'], BE: ['32'], BF: ['226'], BG: ['359'], BH: ['973'], BI: ['257'],
    BJ: ['229'], BL: ['590'], BM: ['1'], BN: ['673'], BO: ['591'], BQ: ['599'],
    BR: ['55'], BS: ['1'], BT: ['975'], BV: ['47'], BW: ['267'], BY: ['375'],
    BZ: ['501'], CA: ['1'], CC: ['61'], CD: ['243'], CF: ['236'], CG: ['242'],
    CH: ['41'], CI: ['225'], CK: ['682'], CL: ['56'], CM: ['237'], CN: ['86'],
    CO: ['57'], CR: ['506'], CU: ['53'], CV: ['238'], CW: ['599'], CX: ['61'],
    CY: ['357'], CZ: ['420'], DE: ['49'], DJ: ['253'], DK: ['45'], DM: ['1'],
    DO: ['1'], DZ: ['213'], EC: ['593'], EE: ['372'], EG: ['20'], EH: ['212'],
    ER: ['291'], ES: ['34'], ET: ['251'], FI: ['358'], FJ: ['679'], FK: ['500'],
    FM: ['691'], FO: ['298'], FR: ['33'], GA: ['241'], GB: ['44'], GD: ['1'],
    GE: ['995'], GF: ['594'], GG: ['44'], GH: ['233'], GI: ['350'], GL: ['299'],
    GM: ['220'], GN: ['224'], GP: ['590'], GQ: ['240'], GR: ['30'], GS: ['500'],
    GT: ['502'], GU: ['1'], GW: ['245'], GY: ['592'], HK: ['852'], HM: ['672'],
    HN: ['504'], HR: ['385'], HT: ['509'], HU: ['36'], ID: ['62'], IE: ['353'],
    IL: ['972'], IM: ['44'], IN: ['91'], IO: ['246'], IQ: ['964'], IR: ['98'],
    IS: ['354'], IT: ['39'], JE: ['44'], JM: ['1'], JO: ['962'], JP: ['81'],
    KE: ['254'], KG: ['996'], KH: ['855'], KI: ['686'], KM: ['269'], KN: ['1'],
    KP: ['850'], KR: ['82'], KW: ['965'], KY: ['1'], KZ: ['7'], LA: ['856'],
    LB: ['961'], LC: ['1'], LI: ['423'], LK: ['94'], LR: ['231'], LS: ['266'],
    LT: ['370'], LU: ['352'], LV: ['371'], LY: ['218'], MA: ['212'], MC: ['377'],
    MD: ['373'], ME: ['382'], MF: ['590'], MG: ['261'], MH: ['692'], MK: ['389'],
    ML: ['223'], MM: ['95'], MN: ['976'], MO: ['853'], MP: ['1'], MQ: ['596'],
    MR: ['222'], MS: ['1'], MT: ['356'], MU: ['230'], MV: ['960'], MW: ['265'],
    MX: ['52'], MY: ['60'], MZ: ['258'], NA: ['264'], NC: ['687'], NE: ['227'],
    NF: ['672'], NG: ['234'], NI: ['505'], NL: ['31'], NO: ['47'], NP: ['977'],
    NR: ['674'], NU: ['683'], NZ: ['64'], OM: ['968'], PA: ['507'], PE: ['51'],
    PF: ['689'], PG: ['675'], PH: ['63'], PK: ['92'], PL: ['48'], PM: ['508'],
    PN: ['64'], PR: ['1'], PS: ['970'], PT: ['351'], PW: ['680'], PY: ['595'],
    QA: ['974'], RE: ['262'], RO: ['40'], RS: ['381'], RU: ['7'], RW: ['250'],
    SA: ['966'], SB: ['677'], SC: ['248'], SD: ['249'], SE: ['46'], SG: ['65'],
    SH: ['290', '247'], SI: ['386'], SJ: ['47'], SK: ['421'], SL: ['232'],
    SM: ['378'], SN: ['221'], SO: ['252'], SR: ['597'], SS: ['211'], ST: ['239'],
    SV: ['503'], SX: ['1'], SY: ['963'], SZ: ['268'], TC: ['1'], TD: ['235'],
    TF: ['262'], TG: ['228'], TH: ['66'], TJ: ['992'], TK: ['690'], TL: ['670'],
    TM: ['993'], TN: ['216'], TO: ['676'], TR: ['90'], TT: ['1'], TV: ['688'],
    TW: ['886'], TZ: ['255'], UA: ['380'], UG: ['256'], UK: ['44'], UM: ['1'],
    US: ['1'], UY: ['598'], UZ: ['998'], VA: ['39'], VC: ['1'], VE: ['58'],
    VG: ['1'], VI: ['1'], VN: ['84'], VU: ['678'], WF: ['681'], WS: ['685'],
    XK: ['383'], YE: ['967'], YT: ['262'], ZA: ['27'], ZM: ['260'], ZW: ['263'],
};

/**
 * Só considera rejeição quando a Evolution respondeu com um erro de cliente
 * inequívoco. Timeout, rate limit, conflito e erro de servidor podem acontecer
 * depois de a mensagem ter sido aceita e, por isso, têm resultado ambíguo.
 */
export const classifyEvolutionHttpStatus = (status: number): WhatsAppSendResult => {
    if (status >= 200 && status < 300) return 'accepted';
    if (
        status >= 400
        && status < 500
        && ![408, 409, 425, 429].includes(status)
    ) return 'rejected';
    return 'unknown';
};

export const extractEvolutionMessageId = (payload: unknown): string => {
    if (!payload || typeof payload !== 'object') return '';
    const record = payload as Record<string, unknown>;
    const key = record.key && typeof record.key === 'object'
        ? record.key as Record<string, unknown>
        : {};
    const candidate = key.id ?? record.messageId ?? record.id;
    return typeof candidate === 'string' ? candidate.trim().slice(0, 255) : '';
};

/**
 * Normaliza para o formato internacional aceito pela Evolution.
 *
 * O prefixo 55 só é inferido quando o país é explicitamente Brasil. Sem país,
 * o número precisa trazer `+`/`00`; isso evita transformar +1 ou +34 em 55.
 */
export const formatPhone = (phone: string, country = ''): string => {
    const raw = String(phone || '').trim();
    const hasExplicitCountryCode = raw.startsWith('+') || raw.startsWith('00');
    let digits = raw.replace(/\D/g, '');
    if (digits.startsWith('00')) digits = digits.slice(2);
    if (!digits) return '';

    const normalizedCountry = String(country || '').trim().toUpperCase();
    if (normalizedCountry === 'BR') {
        if (digits.length === 10 || digits.length === 11) {
            digits = `55${digits}`;
        } else if (!digits.startsWith('55') || (digits.length !== 12 && digits.length !== 13)) {
            return '';
        }
    } else {
        if (!normalizedCountry && !hasExplicitCountryCode) return '';
        if (!hasExplicitCountryCode) {
            const expectedCodes = COUNTRY_CALLING_CODES[normalizedCountry];
            if (!expectedCodes?.some((code) => digits.startsWith(code))) return '';
        }
        // Para outros países a Hotmart documenta o telefone já com DDI.
        if (digits.length < 7) return '';
    }

    // E.164 admite no máximo 15 dígitos. Números menores que sete dígitos não
    // têm informação suficiente para uma entrega confiável.
    return digits.length >= 7 && digits.length <= 15 ? digits : '';
};

export const evolutionReady = (config: EvolutionConfig): boolean => (
    Boolean(config.url && config.apiKey && config.instance)
);

export const normalizeEvolutionApiUrl = (raw: string): string => {
    try {
        const url = new URL(String(raw || '').trim());
        if (
            url.protocol !== 'https:'
            || url.username
            || url.password
            || url.port
            || url.search
            || url.hash
        ) return '';
        url.pathname = url.pathname.replace(/\/+$/, '');
        return url.toString().replace(/\/$/, '');
    } catch {
        return '';
    }
};

/**
 * Resolve a instância a ser usada. A ordem importa: a chave dedicada do curso
 * vem primeiro para que a automação de venda NUNCA saia pelo número mestre por
 * engano — foi assim que a da Kiwify acabou apontando para uma instância morta
 * sem ninguém perceber.
 */
export async function resolveEvolutionConfig(
    supabase: SupabaseClient,
    chaveDeInstancia = 'wa_instance_curso_online',
    permitirFallbackDeInstancia = false,
): Promise<EvolutionConfig> {
    const config: EvolutionConfig = {
        url: normalizeEvolutionApiUrl(process.env.EVOLUTION_API_URL || ''),
        apiKey: process.env.EVOLUTION_API_KEY || '',
        instance: permitirFallbackDeInstancia ? process.env.EVOLUTION_INSTANCE_NAME || '' : '',
    };

    const { data } = await supabase.from('SITE_Config').select('key, value');
    if (!data) return config;

    const map: Record<string, string> = {};
    data.forEach((linha: any) => { map[linha.key] = linha.value; });

    if (map.evolution_api_url) config.url = normalizeEvolutionApiUrl(map.evolution_api_url);
    if (map.evolution_api_key) config.apiKey = map.evolution_api_key.trim();

    const instancia = map[chaveDeInstancia]
        || (permitirFallbackDeInstancia
            ? map.automation_whatsapp_instance
                || map.evolution_instance_name
                || process.env.EVOLUTION_INSTANCE_NAME
            : '');
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
        const resposta = await fetch(`${config.url}/instance/connectionState/${encodeURIComponent(config.instance)}`, {
            headers: { apikey: config.apiKey },
            redirect: 'error',
            signal: AbortSignal.timeout(4000),
        });
        if (!resposta.ok) return false;
        const dados = await resposta.json() as { state?: string; instance?: { state?: string } };
        return (dados?.instance?.state || dados?.state) === 'open';
    } catch {
        return false;
    }
}

export async function sendWhatsAppText(
    phone: string,
    text: string,
    config: EvolutionConfig,
    delay = 1200,
    country = '',
): Promise<WhatsAppSendOutcome> {
    if (!evolutionReady(config)) {
        console.error('[automacao] Evolution sem credenciais — envio abortado.');
        return { result: 'rejected', providerMessageId: '' };
    }

    try {
        const number = formatPhone(phone, country);
        if (!number) {
            console.error('[automacao] Telefone inválido — envio abortado.');
            return { result: 'rejected', providerMessageId: '' };
        }

        const resposta = await fetch(`${config.url}/message/sendText/${encodeURIComponent(config.instance)}`, {
            method: 'POST',
            redirect: 'error',
            headers: { 'Content-Type': 'application/json', apikey: config.apiKey },
            body: JSON.stringify({ number, text, delay }),
            signal: AbortSignal.timeout(12000),
        });
        const result = classifyEvolutionHttpStatus(resposta.status);
        if (result === 'rejected') {
            console.error(`[automacao] Evolution rejeitou o envio (HTTP ${resposta.status}) na instância ${config.instance}.`);
        } else if (result === 'unknown') {
            console.error(`[automacao] Resposta ambígua da Evolution (HTTP ${resposta.status}) na instância ${config.instance}.`);
        }
        let providerMessageId = '';
        if (result === 'accepted') {
            providerMessageId = extractEvolutionMessageId(await resposta.json().catch(() => null));
        } else {
            await resposta.body?.cancel().catch(() => undefined);
        }
        return { result, providerMessageId };
    } catch {
        // Timeout/queda de rede é ambíguo: a Evolution pode ter aceitado a
        // mensagem antes de a resposta se perder. O chamador não deve reenviar
        // automaticamente esse caso.
        console.error('[automacao] Resultado do envio WhatsApp ficou indeterminado.');
        return { result: 'unknown', providerMessageId: '' };
    }
}
