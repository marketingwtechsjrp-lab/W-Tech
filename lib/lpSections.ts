/**
 * Registro central das seções reordenáveis da Landing Page (template V9+).
 * A ordem/visibilidade é salva em SITE_LandingPages.section_order (jsonb).
 * Hero, trust bar, formulário e footer são fixos (não entram na lista).
 */

export interface LPSectionConfig {
    id: string;
    enabled: boolean;
}

export const LP_SECTIONS: { id: string; label: string; hint: string }[] = [
    { id: 'narrative', label: 'Metodologia', hint: 'Seção narrativa "Um Novo Padrão" com foto e citação' },
    { id: 'benefits', label: 'Benefícios', hint: 'Bento grid "O que você vai dominar"' },
    { id: 'modules', label: 'Conteúdo Programático', hint: 'Módulos numerados M01, M02...' },
    { id: 'schedule', label: 'Cronograma', hint: 'Cards por etapa + rotina com horários' },
    { id: 'instructor', label: 'Instrutor', hint: 'Card gigante com foto e bio' },
    { id: 'testimonials', label: 'Depoimentos', hint: 'Vídeos e avaliações de alunos' },
    { id: 'location', label: 'Local & Mapa', hint: 'Endereço + Google Maps (oculto se online)' },
    { id: 'faq', label: 'FAQ', hint: 'Perguntas frequentes' },
];

export const DEFAULT_SECTION_ORDER: LPSectionConfig[] = LP_SECTIONS.map(s => ({ id: s.id, enabled: true }));

/**
 * Normaliza o valor salvo no banco: mantém a ordem do usuário, descarta ids
 * desconhecidos e acrescenta no fim seções novas que ainda não existiam
 * quando a LP foi salva (habilitadas por padrão).
 */
export function resolveSectionOrder(raw: unknown): LPSectionConfig[] {
    if (!Array.isArray(raw) || raw.length === 0) return DEFAULT_SECTION_ORDER.map(s => ({ ...s }));
    const known = new Set(LP_SECTIONS.map(s => s.id));
    const seen = new Set<string>();
    const result: LPSectionConfig[] = [];
    for (const item of raw) {
        const id = typeof item === 'string' ? item : item?.id;
        if (!id || !known.has(id) || seen.has(id)) continue;
        seen.add(id);
        result.push({ id, enabled: typeof item === 'object' && item !== null ? item.enabled !== false : true });
    }
    for (const s of LP_SECTIONS) {
        if (!seen.has(s.id)) result.push({ id: s.id, enabled: true });
    }
    return result;
}
