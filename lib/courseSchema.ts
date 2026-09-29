import { ORGANIZATION_ID, PUBLIC_BASE_URL } from './publicUrl';
import { KIWIFY_CHECKOUT_URL } from './coursePricing';

/**
 * Dados estruturados do curso online, montados num lugar só.
 *
 * Antes o `Course` existia apenas na variante `-v2` (que competia com a página
 * oficial) e a página oficial não tinha schema nenhum além do herdado da home.
 * Todos os fatos daqui aparecem na própria página: 11 módulos, 12 meses de
 * acesso, certificado e garantia de 7 dias. Nada de carga horária inventada.
 */

/** Nome único do produto. Usar o mesmo no site, no schema e no llms.txt. */
export const COURSE_NAME = 'Curso Online de Regulagem de Suspensão para Pilotos';
export const COURSE_PAGE_URL = `${PUBLIC_BASE_URL}/curso-suspensao-piloto`;
export const COURSE_ID = `${COURSE_PAGE_URL}#curso`;
/** Mesmo @id do nó Person do grafo estático do index.html. */
export const ALEX_PERSON_ID = `${PUBLIC_BASE_URL}/#/schema/person/alex-crepaldi`;

export const COURSE_DESCRIPTION =
    'Curso online da W-Tech para o piloto regular, do zero, a suspensão da própria moto off-road: ' +
    'SAG, molas, óleo e viscosidade, cliques de compressão e retorno, ergonomia, pneus e tração. ' +
    '11 módulos com Alex Crepaldi, 12 meses de acesso, certificado de conclusão e garantia de 7 dias.';

export interface CourseFaqItem {
    q: string;
    a: string;
}

/**
 * Grafo JSON-LD da página oficial do curso: Course + FAQPage + BreadcrumbList.
 * O preço é sempre o do plano anual padrão (R$ 347): condições especiais por
 * link (`?oferta=`) não são o preço público do produto.
 */
export function buildCourseSchema(faq: CourseFaqItem[]): Record<string, unknown> {
    const graph: Record<string, unknown>[] = [
        {
            '@type': 'Course',
            '@id': COURSE_ID,
            name: COURSE_NAME,
            description: COURSE_DESCRIPTION,
            url: COURSE_PAGE_URL,
            inLanguage: 'pt-BR',
            provider: { '@id': ORGANIZATION_ID },
            instructor: [{ '@id': ALEX_PERSON_ID }],
            image: `${PUBLIC_BASE_URL}/hero-desktop-alex.webp`,
            teaches: [
                'Medição e ajuste do SAG',
                'Escolha e taxa de molas',
                'Óleo e viscosidade da suspensão',
                'Cliques de compressão e retorno',
                'Ergonomia: guidão, manetes, pedal e câmbio',
                'Pressão dos pneus e tração',
            ],
            hasCourseInstance: {
                '@type': 'CourseInstance',
                courseMode: 'Online',
                inLanguage: 'pt-BR',
                instructor: [{ '@id': ALEX_PERSON_ID }],
            },
            offers: {
                '@type': 'Offer',
                category: 'Subscription',
                price: '347.00',
                priceCurrency: 'BRL',
                url: KIWIFY_CHECKOUT_URL,
                availability: 'https://schema.org/InStock',
            },
        },
        {
            '@type': 'BreadcrumbList',
            '@id': `${COURSE_PAGE_URL}#breadcrumb`,
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Início', item: `${PUBLIC_BASE_URL}/` },
                { '@type': 'ListItem', position: 2, name: 'Cursos', item: `${PUBLIC_BASE_URL}/cursos` },
                { '@type': 'ListItem', position: 3, name: COURSE_NAME, item: COURSE_PAGE_URL },
            ],
        },
    ];

    // Só as perguntas que estão visíveis na página: FAQ que o visitante não vê é spam.
    const perguntas = faq.filter((item) => item.q.trim() && item.a.trim());
    if (perguntas.length) {
        graph.push({
            '@type': 'FAQPage',
            '@id': `${COURSE_PAGE_URL}#perguntas`,
            mainEntity: perguntas.map((item) => ({
                '@type': 'Question',
                name: item.q.trim(),
                acceptedAnswer: { '@type': 'Answer', text: item.a.trim() },
            })),
        });
    }

    return { '@context': 'https://schema.org', '@graph': graph };
}
