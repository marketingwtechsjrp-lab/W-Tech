import { LandingPage } from '../types';

/** Formato de um depoimento de aluno (mesmo shape do campo testimonials da LandingPage). */
export type Testimonial = NonNullable<LandingPage['testimonials']>[number];

/**
 * Extrai o ID de 11 caracteres de qualquer formato de URL do YouTube,
 * incluindo Shorts (youtube.com/shorts/ID), youtu.be, embed e watch?v=.
 * Retorna '' quando não houver um ID válido.
 */
export function getYouTubeId(url?: string | null): string {
    if (!url) return '';
    const regExp = /(?:youtu\.be\/|shorts\/|live\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?/]{11})/;
    const match = url.match(regExp);
    return match ? match[1] : '';
}

/**
 * Depoimentos em vídeo padrão da W-Tech (Shorts), usados como prova social
 * em TODAS as landing pages de cursos presenciais quando a página não tem
 * depoimentos em vídeo próprios cadastrados.
 */
export const DEFAULT_COURSE_TESTIMONIALS: Testimonial[] = [
    { name: 'Pedro', text: '', image: '', videoUrl: 'https://www.youtube.com/shorts/8TaJ_e8o14Q' },
    { name: 'Thiago', text: '', image: '', videoUrl: 'https://www.youtube.com/shorts/8TaJ_e8o14Q' },
    { name: 'Euler', text: '', image: '', videoUrl: 'https://www.youtube.com/shorts/YDXZQgZmiw0' },
    { name: 'Guilherme', text: '', image: '', videoUrl: 'https://www.youtube.com/shorts/_K7qfx_hC-k' }
];

/** Normaliza qualquer URL de YouTube para o formato canônico watch?v=ID. */
const toCanonicalUrl = (id: string): string => `https://www.youtube.com/watch?v=${id}`;

/**
 * Resolve os depoimentos exibidos numa LP de curso presencial:
 *  - mantém SOMENTE depoimentos com link de vídeo do YouTube válido (Shorts incl.);
 *  - normaliza a URL para watch?v=ID (compatível com todos os players dos viewers);
 *  - se a página não tiver nenhum depoimento em vídeo, usa os padrões da W-Tech.
 *
 * Centralizado aqui para não duplicar a regra entre o editor e os 8 viewers.
 */
export function resolveCourseTestimonials(list?: Testimonial[] | null): Testimonial[] {
    const videoOnly: Testimonial[] = [];
    for (const t of list || []) {
        const id = getYouTubeId(t?.videoUrl);
        if (id) videoOnly.push({ ...t, videoUrl: toCanonicalUrl(id) });
    }

    if (videoOnly.length > 0) return videoOnly;

    return DEFAULT_COURSE_TESTIMONIALS.map(t => ({ ...t, videoUrl: toCanonicalUrl(getYouTubeId(t.videoUrl)) }));
}
