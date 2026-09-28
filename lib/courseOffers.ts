import { KIWIFY_CHECKOUT_URL, schemaPriceFromParts, type BillingRegion } from './coursePricing';

/**
 * Condições especiais do Curso Online de Suspensão para remarketing — preço
 * menor por LINK, nunca por cupom.
 *
 * Cupom não funciona aqui: o comprador não acha o campo no checkout da Kiwify e
 * desiste. Então cada condição especial é um SEGUNDO checkout Kiwify, criado no
 * painel com o preço já reduzido, e a landing page troca o preço exibido E o
 * botão de compra quando a visita chega com `?oferta=<slug>`. Preço e link saem
 * da mesma entrada desta lista, para a página nunca anunciar um valor e o
 * checkout cobrar outro.
 *
 * A lista é publicada VAZIA: sem entrada, ninguém vê preço diferente — nem quem
 * digitar um `?oferta=` qualquer. A condição só vale quando tudo abaixo confere,
 * e qualquer falha devolve o preço normal (`resolveCourseSpecialOffer`):
 *  - o slug existe nesta lista;
 *  - a região de cobrança é o Brasil — o internacional segue a 59 € na Hotmart;
 *  - o checkout é https em pay.kiwify.com.br e NÃO é o checkout normal
 *    (anunciar R$ 197 e cobrar R$ 347 é propaganda enganosa);
 *  - o valor à vista é um número maior que zero;
 *  - o `validUntil`, se houver, ainda não passou — anúncio esquecido no ar não
 *    vende com desconto para sempre.
 *
 * Quem entra pela campanha leva o slug em sessionStorage (`wtech_course_offer`)
 * e continua vendo a condição ao navegar pelo quiz, pela VSL ou por outra
 * variante da LP na mesma aba. A página de obrigado lê o mesmo slug para contar
 * a compra pelo valor da condição, não pelo preço cheio.
 *
 * Como ativar uma condição:
 *  1. Na Kiwify, crie um checkout do mesmo produto e do mesmo plano anual com o
 *     preço novo e copie o link público.
 *  2. Adicione a entrada em COURSE_SPECIAL_OFFERS. A chave é o slug da URL:
 *     minúsculas, números, hífen ou sublinhado.
 *
 *       retorno197: {
 *           checkoutUrl: 'https://pay.kiwify.com.br/SEU_LINK',
 *           integer: '197',
 *           cents: ',00',
 *           full: 'R$ 197,00',
 *           installments: '12x de R$ XX,XX no cartão', // igual ao checkout
 *           installmentsShort: '12x R$ XX,XX',
 *           validUntil: '2026-10-31',                  // opcional
 *           label: 'Condição especial de retorno',     // opcional
 *           billingNote: 'Primeiro ano por R$ 197,00. Depois...', // se a 1ª cobrança for diferente
 *       },
 *
 *  3. Rode `node --test teste/course-offers-unit.test.mjs` (confere slug, link,
 *     valor e data de cada entrada), publique e anuncie o link com o parâmetro:
 *       https://w-techbrasil.com.br/curso-suspensao-piloto?oferta=retorno197
 *
 * O parcelamento é texto: copie exatamente o que o checkout da Kiwify mostra —
 * a página não calcula juros.
 */

/** Parâmetro da URL que ativa a condição: `?oferta=<slug>`. */
export const COURSE_OFFER_QUERY_PARAM = 'oferta';

/** Chave em sessionStorage que mantém a condição na aba durante a navegação. */
export const COURSE_OFFER_STORAGE_KEY = 'wtech_course_offer';

export interface CourseSpecialOffer {
    /** Link público do checkout Kiwify desta condição — https em pay.kiwify.com.br. */
    checkoutUrl: string;
    /** Parte inteira do valor à vista — ex.: '197'. */
    integer: string;
    /** Centavos já com separador — ex.: ',00'. */
    cents: string;
    /** Valor à vista completo — ex.: 'R$ 197,00'. */
    full: string;
    /** Parcelamento por extenso, no formato do preço normal
     *  ('12x de R$ 35,89 no cartão') e com os números do checkout. */
    installments: string;
    /** Parcelamento compacto para destaques e barra fixa — ex.: '12x R$ 35,89'. */
    installmentsShort: string;
    /** Preço riscado. Sem ele continua o de sempre (R$ 997,00). */
    anchor?: string;
    /** Último dia da condição. Só a data ('2026-10-31') vale até 23:59 de
     *  Brasília daquele dia; com hora ('2026-10-31T12:00') corta no minuto, lida
     *  em Brasília salvo fuso explícito ('Z', '-03:00'). Data ilegível desliga a
     *  condição em vez de deixá-la valendo para sempre. */
    validUntil?: string;
    /** Selo curto exibido acima do preço — ex.: 'Condição especial de retorno'. */
    label?: string;
    /** Aviso de cobrança no lugar do texto padrão do plano anual. Obrigatório
     *  na prática quando o plano da Kiwify tem "preço diferente na primeira
     *  cobrança": quem paga R$ 97 hoje precisa ler na página que a renovação
     *  sai pelo preço cheio. Deve citar o `full` desta condição (o teste confere). */
    billingNote?: string;
}

/**
 * Condições ativas, por slug. Sem entrada, ninguém vê preço diferente.
 *
 * `retorno` — remarketing aberto em 28/09/2026: plano "Condição Especial" do
 * produto na Kiwify, com 1ª cobrança de R$ 97 e renovação anual de R$ 347 (o
 * mesmo formato do plano "Alunos-Presencial", R$ 277 → R$ 347). O slug não
 * leva o preço: se o valor mudar, basta trocar esta entrada e os anúncios
 * continuam com o mesmo link.
 */
export const COURSE_SPECIAL_OFFERS: Record<string, CourseSpecialOffer> = {
    retorno: {
        checkoutUrl: 'https://pay.kiwify.com.br/S88gmdK',
        integer: '97',
        cents: ',00',
        full: 'R$ 97,00',
        installments: '12x de R$ 10,03 no cartão',
        installmentsShort: '12x R$ 10,03',
        anchor: 'R$ 347,00',
        validUntil: '2026-10-31',
        label: 'Condição especial de retorno',
        billingNote: 'Primeiro ano por R$ 97,00. Depois o plano renova por R$ 347,00/ano até você cancelar. Pague no cartão em até 12x ou no Pix.',
    },
};

const KIWIFY_CHECKOUT_HOST = 'pay.kiwify.com.br';

/**
 * Link aceito como checkout de uma condição especial, já normalizado, ou `null`.
 * Mesmo rigor do validador da Hotmart: https, host exato, sem credenciais,
 * porta ou fragmento, e com o identificador do checkout no caminho.
 */
export function normalizeKiwifyCheckoutUrl(candidate: unknown): string | null {
    if (typeof candidate !== 'string') return null;

    try {
        const url = new URL(candidate.trim());
        const hasCheckoutId = url.pathname.split('/').some(Boolean);
        if (
            url.protocol !== 'https:'
            || url.hostname.toLowerCase() !== KIWIFY_CHECKOUT_HOST
            || url.port
            || url.username
            || url.password
            || url.hash
            || !hasCheckoutId
        ) return null;
        return url.href;
    } catch {
        return null;
    }
}

/** O link leva ao checkout do preço cheio? Só o caminho conta: query não muda o produto. */
const isRegularCheckout = (href: string): boolean =>
    new URL(href).pathname.replace(/\/+$/, '') === new URL(KIWIFY_CHECKOUT_URL).pathname;

/** Slug de URL: começa com letra ou número; depois hífen e sublinhado; até 64 caracteres. */
const OFFER_SLUG = /^[a-z0-9][a-z0-9_-]{0,63}$/;

/**
 * Slug sem espaços e em minúsculas, ou `null` se não for um slug. Anúncio com
 * `?oferta=Retorno197` ativa a entrada `retorno197`; lixo na URL não chega ao
 * sessionStorage.
 */
export function normalizeCourseOfferSlug(raw: unknown): string | null {
    if (typeof raw !== 'string') return null;
    const slug = raw.trim().toLowerCase();
    return OFFER_SLUG.test(slug) ? slug : null;
}

/** O Brasil não tem horário de verão desde 2019: Brasília é UTC−3 o ano inteiro. */
const BRASILIA_UTC_OFFSET = '-03:00';

/** 'AAAA-MM-DD', com 'THH:mm[:ss[.sss]]' e fuso ('Z' ou '±HH:mm') opcionais. */
const OFFER_DEADLINE = /^(\d{4})-(\d{2})-(\d{2})(T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,3})?)?(Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)?)?$/;

/**
 * Instante (ms) em que a condição deixa de valer, ou `null` se `validUntil` não
 * for legível. Hora sem fuso é lida em Brasília, nunca no fuso do visitante —
 * senão a mesma condição acabaria em horas diferentes para cada pessoa.
 */
function offerDeadline(validUntil: string): number | null {
    const value = validUntil.trim();
    const match = OFFER_DEADLINE.exec(value);
    if (!match) return null;

    const [, year, month, day, time, zone] = match;
    // Date.parse aceita 31/02 e rola para março: a data tem de existir no calendário.
    const calendar = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    if (calendar.getUTCMonth() !== Number(month) - 1 || calendar.getUTCDate() !== Number(day)) return null;

    let iso = value;
    if (!time) iso = `${value}T23:59:59.999${BRASILIA_UTC_OFFSET}`;
    else if (!zone) iso = `${value}${BRASILIA_UTC_OFFSET}`;

    const deadline = Date.parse(iso);
    return Number.isNaN(deadline) ? null : deadline;
}

/**
 * Condição especial válida para esta visita, ou `null` — o caso de quase todo
 * mundo, que vê o preço normal. Função pura: a lista e o relógio entram como
 * parâmetro para o teste controlar os dois. Devolve a própria entrada da lista
 * (uma cópia só quando o link precisou de normalização).
 */
export function resolveCourseSpecialOffer(
    slug: string | null,
    region: BillingRegion,
    offers: Record<string, CourseSpecialOffer>,
    now: Date,
): CourseSpecialOffer | null {
    const key = normalizeCourseOfferSlug(slug);
    // hasOwnProperty: `?oferta=constructor` não pode achar nada no protótipo.
    if (!key || region !== 'br' || !Object.prototype.hasOwnProperty.call(offers, key)) return null;

    const offer = offers[key];
    const checkoutUrl = normalizeKiwifyCheckoutUrl(offer.checkoutUrl);
    if (!checkoutUrl || isRegularCheckout(checkoutUrl)) return null;
    if (!(Number(schemaPriceFromParts(offer.integer, offer.cents)) > 0)) return null;

    if (offer.validUntil !== undefined) {
        const deadline = offerDeadline(offer.validUntil);
        if (deadline === null || now.getTime() > deadline) return null;
    }

    return checkoutUrl === offer.checkoutUrl ? offer : { ...offer, checkoutUrl };
}

/**
 * Slug da condição nesta aba: `?oferta=` na URL vence; sem ele, vale o que já
 * foi guardado em sessionStorage. Só lê — quem grava é `rememberCourseOfferSlug`.
 * Nunca lança: sem storage (modo privado, site bloqueado) a condição vale
 * enquanto o parâmetro estiver na URL.
 */
export function readCourseOfferSlug(): string | null {
    if (typeof window === 'undefined') return null;

    const fromUrl = normalizeCourseOfferSlug(
        new URLSearchParams(window.location.search).get(COURSE_OFFER_QUERY_PARAM),
    );
    if (fromUrl) return fromUrl;

    try {
        return normalizeCourseOfferSlug(window.sessionStorage.getItem(COURSE_OFFER_STORAGE_KEY));
    } catch {
        return null;
    }
}

/** Guarda o slug para a navegação seguinte na mesma aba. Nunca lança. */
export function rememberCourseOfferSlug(slug: string): void {
    if (typeof window === 'undefined') return;

    try {
        window.sessionStorage.setItem(COURSE_OFFER_STORAGE_KEY, slug);
    } catch {
        /* sem storage: a condição segue valendo enquanto `?oferta=` estiver na URL */
    }
}
