/**
 * Tagueamento de origem do lead — curso, região e fonte.
 *
 * Centraliza a interpretação do context_id gravado no SITE_Leads
 * (LPs, Quiz, eventos Europa, WhatsApp, formulários) para que CRM,
 * cards e filtros usem exatamente a mesma classificação.
 */

export interface LeadOriginInfo {
    /** Canal de entrada: LP, Quiz, Evento, WhatsApp, Manual, Site... */
    source: string;
    /** Curso identificado na origem (ex: "Curso de Suspensão"). */
    course: string;
    /** Região/cidade da turma (ex: "Rio Preto", "Lisboa"). */
    region: string;
    /** Rótulo agrupador estável por LP/região (usado no filtro de Origem). */
    group: string;
}

/**
 * Palavras-chave → região canônica. Ordem importa (mais específico primeiro).
 * `[\s-]*` cobre tanto títulos ("São Paulo") quanto slugs ("sao-paulo").
 */
const REGION_KEYWORDS: [RegExp, string][] = [
    [/RIO[\s-]*PRETO|SJRP/i, 'Rio Preto'],
    [/S[ÃA]O[\s-]*JOS[ÉE][\s-]*DOS[\s-]*CAMPOS|SJC/i, 'São José dos Campos'],
    [/S[ÃA]O[\s-]*PAULO/i, 'São Paulo'],
    [/LISBOA/i, 'Lisboa'],
    [/EUROPA/i, 'Europa'],
    [/CURITIBA|CWB/i, 'Curitiba'],
    [/BELO[\s-]*HORIZONTE/i, 'Belo Horizonte'],
    [/GOI[ÂA]NIA/i, 'Goiânia'],
    [/BRAS[ÍI]LIA/i, 'Brasília'],
    [/PORTO[\s-]*ALEGRE/i, 'Porto Alegre'],
    [/CAMPINAS/i, 'Campinas'],
    [/RIBEIR[ÃA]O[\s-]*PRETO/i, 'Ribeirão Preto'],
    [/CHAPEC[ÓO]/i, 'Chapecó'],
];

/** Palavras-chave → curso canônico. */
const COURSE_KEYWORDS: [RegExp, string][] = [
    [/PRORIDERS/i, 'ProRiders'],
    [/PILOTO|ERGONOMIA/i, 'Suspensão p/ Pilotos'],
    [/SUSPENS[ÃA]O|SUSPENSAO/i, 'Curso de Suspensão'],
    [/MOLAS?/i, 'Molas'],
    [/[ÓO]LEO/i, 'Óleo de Suspensão'],
    [/MEC[ÂA]NIC/i, 'Mecânica'],
];

const matchKeyword = (text: string, table: [RegExp, string][]): string => {
    for (const [re, label] of table) {
        if (re.test(text)) return label;
    }
    return '';
};

/**
 * Extrai a cidade do padrão "… em São Paulo" / "…-em-sao-paulo" usado nos
 * títulos e slugs de LP de curso presencial. Retorna em Title Case.
 */
const extractAfterEm = (text: string): string => {
    const m = text.match(/[\s-]em[\s-]+(.{2,40})$/i);
    if (!m) return '';
    return m[1]
        .replace(/[()[\]]/g, '')
        .split(/[\s-]+/)
        .filter(Boolean)
        .map(w => (w.length > 2 ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase()))
        .join(' ')
        .trim();
};

/** Corrige marcadores de cidade truncados vindos de slugs antigos. */
const fixCityMarker = (city: string): string => {
    const upper = city.toUpperCase();
    if (upper === 'TECH' || upper === 'SJRP') return 'Rio Preto';
    if (upper === 'PAULO') return 'São Paulo';
    if (upper === 'CAMPOS') return 'São José dos Campos';
    return city;
};

/**
 * Normaliza a região final: descarta ids/hashes vazados de slugs, mapeia para
 * o nome canônico quando conhecida e corrige caixa (CHAPECÓ → Chapecó) para
 * não duplicar opções no filtro.
 */
const canonicalizeRegion = (raw: string): string => {
    const city = fixCityMarker((raw || '').trim());
    if (!city) return '';
    if (/^[0-9A-F]{6,}$/i.test(city) || /\d/.test(city)) return '';
    const known = matchKeyword(city, REGION_KEYWORDS);
    if (known) return known;
    if (city === city.toUpperCase() || city === city.toLowerCase()) {
        return city
            .split(/\s+/)
            .map(w => (w.length > 2 ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase()))
            .join(' ');
    }
    return city;
};

/**
 * Interpreta o context_id do lead e devolve fonte, curso, região e grupo.
 * `addressCity` (quando preenchido no lead) tem prioridade como região.
 */
export function parseLeadOrigin(contextId?: string | null, addressCity?: string | null): LeadOriginInfo {
    const ctx = (contextId || '').trim();
    let source = 'Site';
    let region = (addressCity || '').trim();
    let course = '';
    let group = ctx || 'Sem origem';

    if (!ctx) {
        return { source: 'Sem origem', course: '', region: canonicalizeRegion(region), group: 'Sem origem' };
    }

    if (['Manual', 'Import', 'Evento', 'Direto', 'Site', 'WhatsApp'].includes(ctx)) {
        source = ctx;
        group = ctx;
    } else if (/^LP\s*V?\d*\s*:/i.test(ctx)) {
        // "LP: Curso de Suspensão W-TECH (curso-suspensao-sjrp)" → região no slug
        source = 'LP';
        const inner = ctx.replace(/^LP\s*V?\d*\s*:\s*/i, '').trim();
        const slugMatch = inner.match(/\(([^)]+)\)\s*$/);
        const slug = slugMatch ? slugMatch[1].trim() : '';
        group = 'LP: ' + (slug || inner.replace(/\s*\([^)]*\)\s*$/, '').trim());
        course = matchKeyword(inner, COURSE_KEYWORDS) || matchKeyword(slug, COURSE_KEYWORDS);
        if (!region) {
            region = matchKeyword(slug, REGION_KEYWORDS)
                || matchKeyword(inner, REGION_KEYWORDS)
                || extractAfterEm(slug)
                || extractAfterEm(inner);
        }
    } else if (/^Quiz\s+(Completed|Started)/i.test(ctx)) {
        // "Quiz Completed: CURSO SUSPENSÃO SJRP [QUENTE]"
        source = 'Quiz';
        const title = ctx.replace(/^Quiz\s+(?:Completed|Started)\s*:\s*/i, '').replace(/\s*\[[^\]]*\]\s*/g, '').trim();
        group = 'Quiz: ' + title;
        course = matchKeyword(title, COURSE_KEYWORDS);
        if (!region) region = matchKeyword(title, REGION_KEYWORDS) || extractAfterEm(title);
    } else if (/^(WTECH EUROPA|PRORIDERS|LP LISBOA|LP EUROPA)/i.test(ctx)) {
        // Eventos Europa/Lisboa — remove sufixos de fluxo ((DIRECT PAY)/(SINAL)/: bike)
        source = 'Evento';
        group = ctx.replace(/\s*\([^)]*\)\s*$/, '').replace(/\s*:.*$/, '').trim();
        course = matchKeyword(ctx, COURSE_KEYWORDS) || (/PRORIDERS/i.test(ctx) ? 'ProRiders' : 'W-Tech Europa');
        if (!region) region = matchKeyword(ctx, REGION_KEYWORDS) || 'Lisboa';
    } else if (/^Assunto:/i.test(ctx) || ctx.length > 60) {
        source = 'Contato';
        group = 'Formulário de Contato';
        course = matchKeyword(ctx, COURSE_KEYWORDS);
        if (!region) region = matchKeyword(ctx, REGION_KEYWORDS);
    } else {
        source = ctx;
        course = matchKeyword(ctx, COURSE_KEYWORDS);
        if (!region) region = matchKeyword(ctx, REGION_KEYWORDS);
    }

    return { source, course, region: canonicalizeRegion(region), group };
}

/** True se a data (ISO) cair no dia de hoje no fuso local. */
export function isToday(dateString?: string | null): boolean {
    if (!dateString) return false;
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return false;
    const now = new Date();
    return d.getDate() === now.getDate()
        && d.getMonth() === now.getMonth()
        && d.getFullYear() === now.getFullYear();
}
