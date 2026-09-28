import { useEffect, useMemo, useState } from 'react';
import type { BillingRegion } from '../lib/coursePricing';
import {
    COURSE_SPECIAL_OFFERS,
    type CourseSpecialOffer,
    readCourseOfferSlug,
    rememberCourseOfferSlug,
    resolveCourseSpecialOffer,
} from '../lib/courseOffers';

/**
 * Condição especial de remarketing (`?oferta=<slug>`) válida para este
 * visitante, ou `null` — o caso de quase todo mundo, que vê o preço normal.
 *
 * O slug é lido uma vez na montagem (URL primeiro, depois sessionStorage) e
 * guardado para a próxima página da aba. A região entra na resolução porque a
 * condição é só do Kiwify: se o IP disser que o visitante está fora do Brasil,
 * preço e checkout voltam para euro e Hotmart.
 *
 * Passe o resultado a `getCoursePrice`, `getCheckoutUrl` e
 * `trackCourseCheckoutStart` — os três juntos, ou a página anuncia um valor e o
 * botão leva a outro.
 */
export const useCourseSpecialOffer = (region: BillingRegion): CourseSpecialOffer | null => {
    const [slug] = useState(readCourseOfferSlug);

    useEffect(() => {
        if (slug) rememberCourseOfferSlug(slug);
    }, [slug]);

    return useMemo(
        () => resolveCourseSpecialOffer(slug, region, COURSE_SPECIAL_OFFERS, new Date()),
        [slug, region],
    );
};
