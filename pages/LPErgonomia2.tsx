import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Navigate, useLocation } from 'react-router-dom';
import {
    Activity,
    ArrowDown,
    ArrowRight,
    Award,
    Bike,
    BookOpen,
    Check,
    CheckCircle2,
    ChevronDown,
    CircleDot,
    Gauge,
    LockKeyhole,
    MessageCircle,
    MonitorPlay,
    MoveRight,
    Play,
    RotateCcw,
    Settings2,
    ShieldCheck,
    Sparkles,
    Target,
    TimerReset,
    Trophy,
    Wrench,
} from 'lucide-react';
import { buildCheckoutUrl, captureTrackingParams } from '../lib/tracking';
import { useLanguage } from '../context/LanguageContext';
import { WhatsAppLeadCapture } from '../components/WhatsAppLeadCapture';
import { getCheckoutUrl, getCoursePrice } from '../lib/coursePricing';
import { useBillingRegion } from '../hooks/useBillingRegion';
import { useHotmartCheckoutUrl } from '../hooks/useHotmartCheckoutUrl';
import { VSL_VIDEO_URL as VSL_URL } from '../lib/vslVideo';


const COURSE_URL = 'https://w-techbrasil.com.br/curso-suspensao-piloto-v2';
const OG_IMAGE = 'https://w-techbrasil.com.br/hero-desktop-alex.webp';

const TESTIMONIALS = [
    { id: 'mYoN-gxpnq0', label: 'Relato de aluno W-Tech 1' },
    { id: 'rY3M9H6qE4M', label: 'Relato de aluno W-Tech 2' },
    { id: '8TaJ_e8o14Q', label: 'Relato de aluno W-Tech 3' },
];

const MODULE_GROUPS = [
    {
        number: '01',
        eyebrow: 'Comece pela base',
        title: 'Piloto, ergonomia e equilíbrio',
        description:
            'Entenda como corpo e moto se conectam antes de alterar qualquer regulagem.',
        modules: [
            'Boas-vindas e método W-Tech',
            'Ergonomia do cockpit',
            'Equilíbrio da moto',
        ],
    },
    {
        number: '02',
        eyebrow: 'Construa o acerto',
        title: 'Molas, SAG, óleo e cliques',
        description:
            'Aprenda o que sustenta a moto e como compressão e retorno mudam o comportamento na pista.',
        modules: [
            'Molas e suas particularidades',
            'SAG estático e dinâmico',
            'Óleo e viscosidades',
            'Compressão e retorno',
        ],
    },
    {
        number: '03',
        eyebrow: 'Leve para o chão',
        title: 'Dianteira, pneus e tração',
        description:
            'Conecte suspensão, montagem e contato com o terreno para ganhar previsibilidade.',
        modules: [
            'Suspensão do eixo dianteiro',
            'Pneus, calibragem e tração',
            'Relação e corrente',
        ],
    },
    {
        number: '04',
        eyebrow: 'Aplique com segurança',
        title: 'Ferramentas e rotina prática',
        description:
            'Monte uma referência de trabalho para medir, testar e repetir o acerto sem improviso.',
        modules: ['Kits e ferramentas'],
    },
];

const FAQS = [
    {
        question: 'Preciso ter experiência para fazer o curso?',
        answer:
            'Não. O conteúdo começa pelos fundamentos e avança até o acerto de SAG, molas, óleo, cliques e ergonomia. Você pode acompanhar mesmo que nunca tenha regulado uma suspensão.',
    },
    {
        question: 'O curso serve para a minha moto?',
        answer:
            'Os fundamentos apresentados se aplicam às motos Off-Road de Motocross, Enduro, Trilha, Hard Enduro e Big Trail. O curso ensina a interpretar a moto e adaptar o acerto ao piloto e ao uso.',
    },
    {
        question: 'Como recebo o acesso?',
        answer:
            'Depois da aprovação do pagamento, os dados de acesso são enviados para o e-mail usado na compra. A plataforma funciona no celular, tablet e computador.',
    },
    {
        question: 'Por quanto tempo posso assistir?',
        answer:
            'O acesso ao curso é válido por 12 meses. Nesse período, você pode rever as aulas e consultar o material sempre que precisar.',
    },
    {
        question: 'Recebo certificado?',
        answer:
            'Sim. Ao concluir o conteúdo, você recebe o certificado digital de conclusão da W-Tech Brasil.',
    },
    {
        question: 'E se o curso não fizer sentido para mim?',
        answer:
            'Você conta com garantia incondicional de 7 dias. Dentro desse período, pode solicitar o reembolso conforme as regras informadas na compra.',
    },
];

type TrackingLabel =
    | 'Hero'
    | 'Header'
    | 'Método'
    | 'Conteúdo'
    | 'Oferta'
    | 'Mobile';

const CheckoutButton: React.FC<{
    checkoutUrl: string;
    label: string;
    trackingLabel: TrackingLabel;
    compact?: boolean;
    className?: string;
    scrollToOffer?: boolean;
}> = ({ checkoutUrl, label, trackingLabel, compact = false, className = '', scrollToOffer = false }) => (
    <a
        href={scrollToOffer ? '#oferta' : checkoutUrl}
        data-track={scrollToOffer ? 'offer_scroll' : 'checkout_click'}
        data-track-label={`${trackingLabel} - Curso Suspensão Piloto V2`}
        data-track-category="LP Curso Suspensão V2"
        className={`group inline-flex min-h-12 items-center justify-center gap-2.5 rounded-xl bg-[#e52421] font-extrabold text-white shadow-[0_12px_30px_rgba(229,36,33,0.22)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#c91d1a] hover:shadow-[0_16px_36px_rgba(229,36,33,0.30)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-200 ${
            compact
                ? 'px-5 py-3 text-xs uppercase tracking-[0.14em]'
                : 'w-full px-6 py-4 text-sm sm:w-auto sm:px-8 sm:text-base'
        } ${className}`}
    >
        <span>{label}</span>
        <ArrowRight
            size={compact ? 17 : 19}
            aria-hidden="true"
            className="transition-transform duration-200 group-hover:translate-x-1"
        />
    </a>
);

const Reveal: React.FC<{
    children: React.ReactNode;
    className?: string;
    delay?: number;
}> = ({ children, className = '', delay = 0 }) => {
    const reducedMotion = useReducedMotion();

    return (
        <motion.div
            initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-70px' }}
            transition={{ duration: reducedMotion ? 0 : 0.42, delay, ease: 'easeOut' }}
            className={className}
        >
            {children}
        </motion.div>
    );
};

const SectionHeading: React.FC<{
    eyebrow: string;
    title: React.ReactNode;
    description?: string;
    align?: 'left' | 'center';
}> = ({ eyebrow, title, description, align = 'center' }) => (
    <div className={align === 'center' ? 'mx-auto max-w-3xl text-center' : 'max-w-2xl'}>
        <div
            className={`mb-4 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#c51f1c] ${
                align === 'center' ? 'justify-center' : ''
            }`}
        >
            <span className="h-2 w-2 rounded-full bg-[#e52421]" />
            {eyebrow}
        </div>
        <h2 className="font-display text-4xl font-bold leading-[0.98] tracking-[-0.035em] text-[#151515] sm:text-5xl lg:text-6xl">
            {title}
        </h2>
        {description && (
            <p className="mt-5 text-base leading-7 text-[#64615d] sm:text-lg">
                {description}
            </p>
        )}
    </div>
);

const CourseVideo: React.FC = () => {
    const [activated, setActivated] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    const play = () => {
        setActivated(true);
        requestAnimationFrame(() => {
            if (!videoRef.current) return;
            videoRef.current.load();
            videoRef.current.play().catch(() => undefined);
        });
    };

    return (
        <div className="relative aspect-video overflow-hidden rounded-[1.75rem] border border-black/10 bg-black shadow-[0_24px_70px_rgba(25,21,18,0.18)]">
            <video
                ref={videoRef}
                controls={activated}
                playsInline
                preload="none"
                poster="/images/vsl-thumbnail.webp"
                className="h-full w-full object-cover"
            >
                {activated && <source src={VSL_URL} type="video/mp4" />}
                Seu navegador não suporta vídeos.
            </video>

            {!activated && (
                <button
                    type="button"
                    onClick={play}
                    data-track="video_play"
                    data-track-label="VSL - Curso Suspensão Piloto V2"
                    data-track-category="LP Curso Suspensão V2"
                    aria-label="Assistir à apresentação do curso"
                    className="absolute inset-0 flex items-center justify-center bg-black/18 transition hover:bg-black/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-red-300"
                >
                    <span className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-[#e52421] text-white shadow-[0_14px_35px_rgba(0,0,0,0.28)] transition duration-200 hover:scale-105">
                        <Play size={30} fill="currentColor" className="ml-1" aria-hidden="true" />
                    </span>
                </button>
            )}
        </div>
    );
};

const TestimonialVideo: React.FC<{ id: string; label: string }> = ({ id, label }) => {
    const [playing, setPlaying] = useState(false);

    return (
        <div className="relative aspect-[9/16] min-w-0 overflow-hidden rounded-3xl border border-black/10 bg-[#171717] shadow-[0_14px_35px_rgba(24,20,17,0.10)]">
            {playing ? (
                <iframe
                    src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1&rel=0`}
                    title={label}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 h-full w-full"
                />
            ) : (
                <button
                    type="button"
                    onClick={() => setPlaying(true)}
                    data-track="testimonial_play"
                    data-track-label={label}
                    data-track-category="LP Curso Suspensão V2"
                    aria-label={`Assistir ${label.toLowerCase()}`}
                    className="group absolute inset-0 h-full w-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-red-300"
                >
                    <img
                        src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
                        alt=""
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                    <span className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-transparent" />
                    <span className="absolute inset-0 flex items-center justify-center">
                        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-[#e52421] shadow-xl transition duration-200 group-hover:scale-110">
                            <Play size={22} fill="currentColor" className="ml-0.5" aria-hidden="true" />
                        </span>
                    </span>
                    <span className="absolute inset-x-4 bottom-4 text-left text-xs font-extrabold uppercase tracking-[0.14em] text-white">
                        Aluno W-Tech · relato real
                    </span>
                </button>
            )}
        </div>
    );
};

const FAQItem: React.FC<{ question: string; answer: string; index: number }> = ({
    question,
    answer,
    index,
}) => {
    const [open, setOpen] = useState(false);
    const contentId = `lp-v2-faq-${index}`;

    return (
        <div className="overflow-hidden rounded-2xl border border-[#dedbd5] bg-white shadow-[0_8px_24px_rgba(27,23,20,0.04)]">
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
                aria-controls={contentId}
                className="flex min-h-16 w-full items-center justify-between gap-5 px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-red-100 sm:px-6"
            >
                <span className="font-bold text-[#22201e]">{question}</span>
                <ChevronDown
                    size={20}
                    aria-hidden="true"
                    className={`shrink-0 text-[#e52421] transition-transform duration-200 ${
                        open ? 'rotate-180' : ''
                    }`}
                />
            </button>
            <div
                id={contentId}
                hidden={!open}
                className="border-t border-[#ebe8e3] px-5 py-5 text-sm leading-6 text-[#66615d] sm:px-6"
            >
                {answer}
            </div>
        </div>
    );
};

const LPErgonomia2: React.FC = () => {
    const { currentLang } = useLanguage();
    const billingRegion = useBillingRegion();
    const hotmartCheckoutUrl = useHotmartCheckoutUrl(billingRegion === 'intl');
    const price = getCoursePrice(billingRegion, currentLang, hotmartCheckoutUrl);
    const checkoutBaseUrl = getCheckoutUrl(billingRegion, hotmartCheckoutUrl);
    const checkoutProvider = billingRegion === 'intl' ? 'Hotmart' : 'Kiwify';
    const checkoutUrl = useMemo(
        () => buildCheckoutUrl(checkoutBaseUrl),
        [checkoutBaseUrl],
    );
    const location = useLocation();

    useEffect(() => {
        captureTrackingParams();
    }, []);

    useEffect(() => {
        const previousTitle = document.title;
        document.title = 'Curso de Suspensão para Pilotos | Método W-Tech';

        const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
        const previousCanonical = canonical?.getAttribute('href') ?? null;
        const canonicalElement = canonical ?? document.createElement('link');
        canonicalElement.rel = 'canonical';
        canonicalElement.href = COURSE_URL;
        if (!canonical) document.head.appendChild(canonicalElement);

        const metaUpdates = [
            {
                selector: 'meta[name="description"]',
                attribute: 'name',
                key: 'description',
                content:
                    'Aprenda a regular SAG, molas, óleo, cliques e ergonomia da sua moto Off-Road com o método W-Tech. Curso online para pilotos, com 12 meses de acesso.',
            },
            {
                selector: 'meta[property="og:title"]',
                attribute: 'property',
                key: 'og:title',
                content: 'Mais controle na moto. Menos esforço no braço. | W-Tech',
            },
            {
                selector: 'meta[property="og:description"]',
                attribute: 'property',
                key: 'og:description',
                content:
                    'Curso online de regulagem de suspensão para pilotos: SAG, molas, cliques, óleo e ergonomia, do fundamento ao teste na moto.',
            },
            {
                selector: 'meta[property="og:url"]',
                attribute: 'property',
                key: 'og:url',
                content: COURSE_URL,
            },
            {
                selector: 'meta[property="og:image"]',
                attribute: 'property',
                key: 'og:image',
                content: OG_IMAGE,
            },
            {
                selector: 'meta[property="twitter:title"]',
                attribute: 'property',
                key: 'twitter:title',
                content: 'Curso de Suspensão para Pilotos | W-Tech',
            },
            {
                selector: 'meta[property="twitter:description"]',
                attribute: 'property',
                key: 'twitter:description',
                content:
                    'Aprenda a interpretar e regular a suspensão da sua moto Off-Road com método.',
            },
            {
                selector: 'meta[property="twitter:url"]',
                attribute: 'property',
                key: 'twitter:url',
                content: COURSE_URL,
            },
            {
                selector: 'meta[property="twitter:image"]',
                attribute: 'property',
                key: 'twitter:image',
                content: OG_IMAGE,
            },
        ];

        const previousMeta = metaUpdates.map((update) => {
            const existing = document.head.querySelector<HTMLMetaElement>(update.selector);
            const element = existing ?? document.createElement('meta');
            const previousContent = existing?.getAttribute('content') ?? null;
            element.setAttribute(update.attribute, update.key);
            element.setAttribute('content', update.content);
            if (!existing) document.head.appendChild(element);
            return { element, previousContent, created: !existing };
        });

        const schema = document.createElement('script');
        schema.id = 'lp-v2-course-schema';
        schema.type = 'application/ld+json';
        schema.text = JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Course',
            name: 'Regulagem de Suspensão para Pilotos',
            description:
                'Curso online W-Tech sobre SAG, molas, óleo, cliques, ergonomia, pneus e tração para motos Off-Road.',
            provider: {
                '@type': 'Organization',
                name: 'W-Tech Brasil',
                sameAs: 'https://w-techbrasil.com.br/',
            },
            offers: {
                '@type': 'Offer',
                price: price.schemaPrice,
                priceCurrency: price.schemaCurrency,
                url: checkoutBaseUrl,
                availability: 'https://schema.org/InStock',
            },
        });
        document.head.querySelector('#lp-v2-course-schema')?.remove();
        document.head.appendChild(schema);

        return () => {
            document.title = previousTitle;
            if (previousCanonical) canonicalElement.href = previousCanonical;
            else if (!canonical) canonicalElement.remove();

            previousMeta.forEach(({ element, previousContent, created }) => {
                if (created) element.remove();
                else if (previousContent !== null) element.setAttribute('content', previousContent);
            });
            schema.remove();
        };
    }, [checkoutBaseUrl, price.schemaCurrency, price.schemaPrice]);

    if (currentLang !== 'pt-BR') {
        const params = new URLSearchParams(location.search);
        params.set('lang', currentLang);
        if (!params.has('src')) params.set('src', 'v2_geo_redirect');
        return <Navigate to={`/curso-suspensao-piloto-completa?${params.toString()}`} replace />;
    }

    return (
        <main
            data-testid="lp-ergonomia-v2"
            className="min-h-screen overflow-x-clip bg-[#f7f5f1] pb-24 text-[#25221f] selection:bg-red-200 selection:text-black lg:pb-0"
        >
            <header className="sticky top-0 z-50 border-b border-black/8 bg-[#f7f5f1]/94 backdrop-blur-xl">
                <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
                    <a href="#topo" aria-label="Voltar ao início" className="shrink-0">
                        <img
                            src="/logo-wtech-branca.webp"
                            alt="W-Tech Work Suspension"
                            width={150}
                            height={48}
                            className="h-8 w-auto brightness-0"
                        />
                    </a>

                    <div className="hidden items-center gap-6 lg:flex">
                        <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#6d6863]">
                            Curso online · 12 meses de acesso
                        </span>
                        <CheckoutButton
                            checkoutUrl={checkoutUrl}
                            label="Quero começar"
                            trackingLabel="Header"
                            compact
                            scrollToOffer
                        />
                    </div>

                    <a
                        href="#oferta"
                        className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-black/10 bg-white px-4 text-xs font-extrabold uppercase tracking-[0.12em] text-[#22201e] shadow-sm lg:hidden"
                    >
                        Ver oferta
                        <ArrowDown size={16} aria-hidden="true" />
                    </a>
                </div>
            </header>

            <section id="topo" className="relative">
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="absolute -right-20 top-16 h-72 w-72 rounded-full bg-red-200/40 blur-3xl" />
                    <div className="absolute left-[-8rem] top-[34rem] h-64 w-64 rounded-full bg-orange-100 blur-3xl" />
                </div>

                <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-12 sm:px-8 sm:pt-16 lg:grid-cols-[0.92fr_1.08fr] lg:gap-16 lg:pb-24 lg:pt-20">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                    >
                        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-red-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#b91f1c] shadow-sm sm:text-xs">
                            <Sparkles size={14} aria-hidden="true" />
                            Regulagem de suspensão para pilotos
                        </div>

                        <h1 className="font-display text-[3.15rem] font-bold leading-[0.88] tracking-[-0.055em] text-[#171513] sm:text-6xl lg:text-[5rem]">
                            Mais controle na moto.
                            <span className="mt-2 block text-[#e52421]">Menos esforço no braço.</span>
                        </h1>

                        <p className="mt-7 max-w-xl text-lg leading-8 text-[#5d5955] sm:text-xl">
                            Aprenda a regular <strong className="text-[#24211f]">SAG, molas, óleo e cliques</strong>{' '}
                            com um método claro — para entender a reação da moto e ajustar sem
                            depender de tentativa e erro.
                        </p>

                        <div className="mt-7 grid gap-3 text-sm text-[#3d3935] sm:grid-cols-2">
                            {[
                                'Do fundamento ao teste na moto',
                                'Aplicável a diferentes níveis de piloto',
                                'Aulas gravadas para rever quando precisar',
                                'Certificado digital W-Tech',
                            ].map((item) => (
                                <div key={item} className="flex items-start gap-2.5">
                                    <CheckCircle2
                                        size={18}
                                        className="mt-0.5 shrink-0 text-[#e52421]"
                                        aria-hidden="true"
                                    />
                                    <span className="font-semibold leading-5">{item}</span>
                                </div>
                            ))}
                        </div>

                        <div className="mt-9 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
                            <CheckoutButton
                                checkoutUrl={checkoutUrl}
                                label="Quero acertar minha moto"
                                trackingLabel="Hero"
                                scrollToOffer
                            />
                            <a
                                href="#metodo"
                                className="inline-flex min-h-12 items-center justify-center gap-2 px-3 font-bold text-[#393531] underline decoration-black/20 underline-offset-4 transition hover:decoration-[#e52421]"
                            >
                                Ver o método
                                <ArrowDown size={18} aria-hidden="true" />
                            </a>
                        </div>

                        <p className="mt-5 text-sm font-semibold text-[#6d6863]">
                            {billingRegion === 'intl'
                                ? `${price.full} · ${price.installments} · garantia de 7 dias`
                                : `${price.full} à vista ou ${price.installmentsShort} · garantia de 7 dias`}
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.55, delay: 0.1, ease: 'easeOut' }}
                        className="relative mx-auto w-full max-w-2xl"
                    >
                        <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-[#171513] shadow-[0_30px_90px_rgba(29,24,20,0.20)] sm:aspect-[5/4] lg:aspect-[4/5]">
                            <img
                                src="/images/lp-curso/1.webp"
                                alt="Piloto fazendo uma curva com controle em uma pista Off-Road"
                                fetchPriority="high"
                                decoding="async"
                                width={925}
                                height={744}
                                className="h-full w-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                            <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8">
                                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-300">
                                    O resultado que importa
                                </p>
                                <p className="mt-2 font-display text-3xl font-bold leading-none sm:text-4xl">
                                    Uma moto previsível embaixo de você.
                                </p>
                            </div>
                        </div>

                        <div className="absolute -bottom-7 left-4 right-4 rounded-2xl border border-black/10 bg-white p-4 shadow-[0_16px_45px_rgba(30,25,20,0.16)] sm:left-auto sm:right-6 sm:w-[330px]">
                            <div className="flex items-center gap-3">
                                <img
                                    src="/images/alex-webp.webp"
                                    alt="Alex Crepaldi"
                                    loading="eager"
                                    width={56}
                                    height={56}
                                    className="h-14 w-14 rounded-xl object-cover object-top"
                                />
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[#e52421]">
                                        Método W-Tech
                                    </p>
                                    <p className="mt-1 text-sm font-bold text-[#25221f]">
                                        Técnica explicada por Alex Crepaldi
                                    </p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            <section className="border-y border-black/8 bg-white">
                <div className="mx-auto grid max-w-7xl grid-cols-2 px-5 sm:px-8 lg:grid-cols-4">
                    {[
                        { icon: BookOpen, value: '11 módulos', label: 'sequência completa' },
                        { icon: MonitorPlay, value: '100% online', label: 'aulas gravadas' },
                        { icon: TimerReset, value: '12 meses', label: 'para acessar' },
                        { icon: ShieldCheck, value: '7 dias', label: 'de garantia' },
                    ].map(({ icon: Icon, value, label }, index) => (
                        <div
                            key={value}
                            className={`flex items-center gap-3 px-3 py-7 sm:px-6 ${
                                index % 2 === 0 ? 'border-r border-black/8' : ''
                            } ${index === 1 ? 'lg:border-r' : ''}`}
                        >
                            <Icon size={22} className="shrink-0 text-[#e52421]" aria-hidden="true" />
                            <div>
                                <p className="font-display text-xl font-bold leading-none text-[#211e1c]">
                                    {value}
                                </p>
                                <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#817a74]">
                                    {label}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="bg-white py-20 sm:py-24">
                <div className="mx-auto max-w-6xl px-5 sm:px-8">
                    <Reveal>
                        <SectionHeading
                            eyebrow="Veja antes de decidir"
                            title={
                                <>
                                    Entenda por que alguns ajustes ajudam — e outros{' '}
                                    <span className="text-[#e52421]">pioram a moto.</span>
                                </>
                            }
                            description="Nesta apresentação, você conhece a proposta do curso e o tipo de raciocínio que vai aprender a aplicar na sua própria regulagem."
                        />
                    </Reveal>
                    <Reveal delay={0.08} className="mt-10">
                        <CourseVideo />
                    </Reveal>
                    <p className="mx-auto mt-5 max-w-2xl text-center text-sm text-[#77716b]">
                        Aperte o play para assistir. O vídeo só é carregado depois do seu clique.
                    </p>
                </div>
            </section>

            <section className="border-y border-black/8 bg-[#f7f5f1] py-20 sm:py-24">
                <div className="mx-auto max-w-7xl px-5 sm:px-8">
                    <Reveal>
                        <SectionHeading
                            eyebrow="A moto dá sinais"
                            title={
                                <>
                                    Você não precisa se acostumar com uma moto{' '}
                                    <span className="text-[#e52421]">difícil de pilotar.</span>
                                </>
                            }
                            description="Quando o acerto está fora do ponto, o piloto tenta compensar no corpo. O curso ajuda você a reconhecer esses sinais e encontrar uma direção técnica."
                        />
                    </Reveal>

                    <div className="mt-12 grid gap-5 lg:grid-cols-3">
                        {[
                            {
                                icon: MoveRight,
                                title: 'A frente espalha',
                                description:
                                    'Você entra na curva sem confiança e precisa corrigir a linha o tempo todo.',
                            },
                            {
                                icon: Activity,
                                title: 'A traseira quica',
                                description:
                                    'A moto perde contato e tração justamente quando o terreno exige resposta.',
                            },
                            {
                                icon: Gauge,
                                title: 'O braço termina primeiro',
                                description:
                                    'Impactos e reações imprevisíveis aumentam a fadiga antes de a trilha acabar.',
                            },
                        ].map(({ icon: Icon, title, description }, index) => (
                            <Reveal
                                key={title}
                                delay={index * 0.06}
                                className="rounded-3xl border border-black/8 bg-white p-7 shadow-[0_12px_35px_rgba(28,24,21,0.05)]"
                            >
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-[#e52421]">
                                    <Icon size={24} aria-hidden="true" />
                                </div>
                                <h3 className="mt-6 font-display text-3xl font-bold leading-none text-[#211f1c]">
                                    {title}
                                </h3>
                                <p className="mt-3 leading-7 text-[#69635e]">{description}</p>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            <section id="metodo" className="bg-[#171513] py-20 text-white sm:py-28">
                <div className="mx-auto max-w-7xl px-5 sm:px-8">
                    <div className="grid items-start gap-14 lg:grid-cols-[0.82fr_1.18fr] lg:gap-20">
                        <Reveal>
                            <div className="lg:sticky lg:top-28">
                                <div className="mb-4 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-red-300">
                                    <span className="h-2 w-2 rounded-full bg-[#e52421]" />
                                    Um modelo claro de regulagem
                                </div>
                                <h2 className="font-display text-4xl font-bold leading-[0.95] tracking-[-0.035em] sm:text-5xl lg:text-6xl">
                                    Pare de contar cliques no escuro.
                                </h2>
                                <p className="mt-6 max-w-lg text-lg leading-8 text-white/65">
                                    O método organiza a regulagem em uma sequência simples: criar
                                    referência, medir, alterar uma variável e validar na moto.
                                </p>

                                <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5">
                                    <div className="flex gap-3">
                                        <Target
                                            size={22}
                                            className="mt-0.5 shrink-0 text-red-300"
                                            aria-hidden="true"
                                        />
                                        <p className="text-sm leading-6 text-white/75">
                                            O objetivo não é decorar uma regulagem pronta. É entender
                                            <strong className="text-white"> por que a moto reage</strong>{' '}
                                            e saber qual ajuste testar.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </Reveal>

                        <div className="space-y-4">
                            {[
                                {
                                    number: '01',
                                    icon: Bike,
                                    title: 'Leia o conjunto',
                                    description:
                                        'Considere piloto, modalidade, terreno, ergonomia e estado da moto antes de mexer.',
                                },
                                {
                                    number: '02',
                                    icon: CircleDot,
                                    title: 'Crie uma base mensurável',
                                    description:
                                        'Use SAG, mola e referências de montagem para sair do achismo.',
                                },
                                {
                                    number: '03',
                                    icon: Settings2,
                                    title: 'Ajuste uma variável',
                                    description:
                                        'Entenda compressão e retorno para fazer mudanças pequenas e intencionais.',
                                },
                                {
                                    number: '04',
                                    icon: RotateCcw,
                                    title: 'Teste, registre e refine',
                                    description:
                                        'Observe a resposta na moto, compare com a referência e avance com segurança.',
                                },
                            ].map(({ number, icon: Icon, title, description }, index) => (
                                <Reveal
                                    key={number}
                                    delay={index * 0.05}
                                    className="group grid grid-cols-[auto_1fr] gap-5 rounded-3xl border border-white/10 bg-white/[0.055] p-6 transition duration-200 hover:border-red-300/40 hover:bg-white/[0.08] sm:p-7"
                                >
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e52421] text-white">
                                        <Icon size={23} aria-hidden="true" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-300">
                                            Passo {number}
                                        </p>
                                        <h3 className="mt-2 font-display text-3xl font-bold leading-none">
                                            {title}
                                        </h3>
                                        <p className="mt-3 leading-7 text-white/62">{description}</p>
                                    </div>
                                </Reveal>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section className="bg-white py-20 sm:py-24">
                <div className="mx-auto max-w-7xl px-5 sm:px-8">
                    <Reveal>
                        <SectionHeading
                            eyebrow="Transformação prática"
                            title={
                                <>
                                    Troque o improviso por uma{' '}
                                    <span className="text-[#e52421]">rotina de acerto.</span>
                                </>
                            }
                        />
                    </Reveal>

                    <div className="mt-12 grid overflow-hidden rounded-[2rem] border border-black/10 lg:grid-cols-2">
                        <Reveal className="bg-[#f2efea] p-7 sm:p-10">
                            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#8a837c]">
                                Antes
                            </p>
                            <h3 className="mt-3 font-display text-4xl font-bold text-[#2c2926]">
                                Regular por tentativa
                            </h3>
                            <ul className="mt-7 space-y-4">
                                {[
                                    'Copiar a regulagem de outro piloto',
                                    'Girar vários cliques de uma vez',
                                    'Confundir fadiga com falta de preparo',
                                    'Não saber como voltar ao ponto inicial',
                                ].map((item) => (
                                    <li key={item} className="flex gap-3 text-[#6f6963]">
                                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#aaa39d]" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </Reveal>

                        <Reveal className="bg-[#e52421] p-7 text-white sm:p-10" delay={0.06}>
                            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/70">
                                Depois
                            </p>
                            <h3 className="mt-3 font-display text-4xl font-bold">
                                Ajustar com referência
                            </h3>
                            <ul className="mt-7 space-y-4">
                                {[
                                    'Começar por peso, uso, SAG e mola',
                                    'Alterar uma variável e sentir a resposta',
                                    'Relacionar sintoma com direção de ajuste',
                                    'Registrar o acerto para repetir e evoluir',
                                ].map((item) => (
                                    <li key={item} className="flex gap-3 text-white/90">
                                        <Check
                                            size={19}
                                            className="mt-0.5 shrink-0"
                                            strokeWidth={3}
                                            aria-hidden="true"
                                        />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </Reveal>
                    </div>

                    <Reveal className="mt-9 flex justify-center">
                        <CheckoutButton
                            checkoutUrl={checkoutUrl}
                            label="Quero aprender esse método"
                            trackingLabel="Método"
                            scrollToOffer
                        />
                    </Reveal>
                </div>
            </section>

            <section className="border-y border-black/8 bg-[#f7f5f1] py-20 sm:py-24">
                <div className="mx-auto max-w-7xl px-5 sm:px-8">
                    <Reveal>
                        <SectionHeading
                            eyebrow="Prova em primeira pessoa"
                            title={
                                <>
                                    Ouça quem já viveu a{' '}
                                    <span className="text-[#e52421]">experiência W-Tech.</span>
                                </>
                            }
                            description="Relatos em vídeo para você ouvir diretamente a experiência de quem já passou pelos treinamentos W-Tech."
                        />
                    </Reveal>

                    <div className="mt-12 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
                        {TESTIMONIALS.map((testimonial, index) => (
                            <Reveal key={testimonial.id} delay={index * 0.05}>
                                <TestimonialVideo {...testimonial} />
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            <section id="conteudo" className="bg-white py-20 sm:py-28">
                <div className="mx-auto max-w-7xl px-5 sm:px-8">
                    <Reveal>
                        <SectionHeading
                            eyebrow="O caminho completo"
                            title={
                                <>
                                    11 módulos organizados para você{' '}
                                    <span className="text-[#e52421]">entender e aplicar.</span>
                                </>
                            }
                            description="O conteúdo avança da relação piloto–moto até a rotina de ferramentas, sem jogar termos soltos na sua frente."
                        />
                    </Reveal>

                    <div className="mt-12 grid gap-5 lg:grid-cols-2">
                        {MODULE_GROUPS.map((group, index) => (
                            <Reveal
                                key={group.number}
                                delay={index * 0.05}
                                className="rounded-3xl border border-black/8 bg-[#faf9f7] p-7 shadow-[0_12px_32px_rgba(29,25,22,0.04)] sm:p-8"
                            >
                                <div className="flex items-start justify-between gap-6">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#e52421]">
                                            {group.eyebrow}
                                        </p>
                                        <h3 className="mt-3 font-display text-3xl font-bold leading-none text-[#23201e] sm:text-4xl">
                                            {group.title}
                                        </h3>
                                    </div>
                                    <span className="font-display text-5xl font-bold leading-none text-[#ded9d3]">
                                        {group.number}
                                    </span>
                                </div>
                                <p className="mt-5 leading-7 text-[#6c6660]">{group.description}</p>
                                <ul className="mt-6 space-y-3 border-t border-black/8 pt-6">
                                    {group.modules.map((module) => (
                                        <li
                                            key={module}
                                            className="flex items-center gap-3 text-sm font-semibold text-[#3d3935]"
                                        >
                                            <CheckCircle2
                                                size={17}
                                                className="shrink-0 text-[#e52421]"
                                                aria-hidden="true"
                                            />
                                            {module}
                                        </li>
                                    ))}
                                </ul>
                            </Reveal>
                        ))}
                    </div>

                    <Reveal className="mt-9 flex justify-center">
                        <CheckoutButton
                            checkoutUrl={checkoutUrl}
                            label="Quero acesso aos 11 módulos"
                            trackingLabel="Conteúdo"
                            scrollToOffer
                        />
                    </Reveal>
                </div>
            </section>

            <section className="overflow-hidden border-y border-black/8 bg-[#f0ede8] py-20 sm:py-24">
                <div className="mx-auto max-w-7xl px-5 sm:px-8">
                    <Reveal>
                        <SectionHeading
                            eyebrow="Quem ensina"
                            title={
                                <>
                                    Técnica de oficina e validação{' '}
                                    <span className="text-[#e52421]">na pilotagem.</span>
                                </>
                            }
                        />
                    </Reveal>

                    <div className="mt-12 grid gap-6 lg:grid-cols-2">
                        {[
                            {
                                image: '/images/alex-webp.webp',
                                name: 'Alex Crepaldi',
                                role: 'Especialista W-Tech',
                                icon: Wrench,
                                description:
                                    'Especialista em acerto, preparação e revalvulação de suspensões Off-Road. Conduz a parte técnica e transforma o funcionamento da suspensão em uma sequência aplicável.',
                            },
                            {
                                image: '/paschoalin.webp',
                                name: 'Rafael Paschoalin',
                                role: 'Piloto de alta performance',
                                icon: Trophy,
                                description:
                                    'Leva a visão prática de quem sente as mudanças na moto em condições reais de pilotagem e ajuda a conectar regulagem, comportamento e confiança.',
                            },
                        ].map(({ image, name, role, icon: Icon, description }, index) => (
                            <Reveal
                                key={name}
                                delay={index * 0.06}
                                className="grid overflow-hidden rounded-3xl border border-black/10 bg-white shadow-[0_16px_45px_rgba(31,27,23,0.06)] sm:grid-cols-[0.82fr_1.18fr]"
                            >
                                <div className="min-h-64 bg-[#dcd8d2]">
                                    <img
                                        src={image}
                                        alt={name}
                                        loading="lazy"
                                        className="h-full w-full object-cover object-top"
                                    />
                                </div>
                                <div className="p-7 sm:p-8">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-[#e52421]">
                                        <Icon size={22} aria-hidden="true" />
                                    </div>
                                    <p className="mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-[#e52421]">
                                        {role}
                                    </p>
                                    <h3 className="mt-2 font-display text-4xl font-bold leading-none text-[#211f1c]">
                                        {name}
                                    </h3>
                                    <p className="mt-4 text-sm leading-6 text-[#69635e]">
                                        {description}
                                    </p>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            <section id="oferta" className="bg-white py-20 sm:py-28">
                <div className="mx-auto max-w-6xl px-5 sm:px-8">
                    <div className="grid overflow-hidden rounded-[2rem] border border-black/10 bg-[#171513] shadow-[0_30px_80px_rgba(29,24,20,0.17)] lg:grid-cols-[1.02fr_0.98fr]">
                        <div className="p-7 text-white sm:p-10 lg:p-12">
                            <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-red-200">
                                <Award size={15} aria-hidden="true" />
                                Curso completo W-Tech
                            </div>

                            <h2 className="mt-7 font-display text-4xl font-bold leading-[0.95] sm:text-5xl">
                                Comece pela base. Evolua a cada teste.
                            </h2>
                            <p className="mt-5 max-w-xl leading-7 text-white/65">
                                Tenha o conteúdo organizado para consultar antes da regulagem, rever
                                depois do teste e construir seu próprio histórico de acerto.
                            </p>

                            <div className="mt-8 grid gap-3 sm:grid-cols-2">
                                {[
                                    '11 módulos em vídeo',
                                    '12 meses de acesso',
                                    'Certificado digital',
                                    'Suporte na plataforma',
                                    'Planilha de regulagem de SAG',
                                    'Planilha de regulagem de PSI',
                                ].map((item) => (
                                    <div key={item} className="flex items-center gap-2.5 text-sm text-white/82">
                                        <CheckCircle2
                                            size={17}
                                            className="shrink-0 text-red-300"
                                            aria-hidden="true"
                                        />
                                        {item}
                                    </div>
                                ))}
                            </div>

                            <div className="mt-9 flex items-start gap-3 border-t border-white/10 pt-7">
                                <ShieldCheck
                                    size={24}
                                    className="mt-0.5 shrink-0 text-red-300"
                                    aria-hidden="true"
                                />
                                <div>
                                    <p className="font-bold">Garantia incondicional de 7 dias</p>
                                    <p className="mt-1 text-sm leading-6 text-white/55">
                                        Você tem tempo para entrar, assistir e avaliar o método.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col justify-center bg-[#f7f5f1] p-7 sm:p-10 lg:p-12">
                            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#b9201d]">
                                Plano Premium · inscrição online
                            </p>
                            <p className="mt-5 text-sm font-bold uppercase tracking-[0.12em] text-[#7b746e]">
                                À vista
                            </p>
                            <div className="mt-1 flex items-start gap-1 text-[#1f1c1a]">
                                <span className="mt-3 font-display text-2xl font-bold">{price.symbol}</span>
                                <span className="font-display text-7xl font-bold leading-none tracking-[-0.06em] sm:text-8xl">
                                    {price.integer}
                                </span>
                                <span className="mt-3 font-display text-2xl font-bold">{price.cents}</span>
                            </div>
                            <p className="mt-3 text-sm font-semibold text-[#69635e]">
                                {billingRegion === 'intl' ? price.installments : `ou ${price.installments}`}
                            </p>
                            {price.chargedNotice && (
                                <p className="mt-2 text-xs font-medium text-[#7b746e]">
                                    {price.chargedNotice}
                                </p>
                            )}

                            <CheckoutButton
                                checkoutUrl={checkoutUrl}
                                label="Quero começar agora"
                                trackingLabel="Oferta"
                                className="mt-8 sm:w-full"
                            />

                            <div className="mt-5 flex items-center justify-center gap-2 text-xs font-semibold text-[#77716a]">
                                <LockKeyhole size={15} aria-hidden="true" />
                                Pagamento processado com segurança pela {checkoutProvider}
                            </div>

                            <WhatsAppLeadCapture
                                pageLabel="Oferta · Landing V2 · Curso Online de Suspensão"
                                className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-black/12 bg-white px-5 text-sm font-bold text-[#272320] transition hover:border-[#25D366] hover:text-[#14883f]"
                            >
                                <MessageCircle size={18} aria-hidden="true" />
                                Ainda tenho uma dúvida
                            </WhatsAppLeadCapture>
                        </div>
                    </div>
                </div>
            </section>

            <section className="border-t border-black/8 bg-[#f7f5f1] py-20 sm:py-24">
                <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
                    <Reveal>
                        <div>
                            <div className="mb-4 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#c51f1c]">
                                <span className="h-2 w-2 rounded-full bg-[#e52421]" />
                                Dúvidas frequentes
                            </div>
                            <h2 className="font-display text-4xl font-bold leading-[0.95] tracking-[-0.035em] text-[#181614] sm:text-5xl">
                                Tire a última dúvida antes de começar.
                            </h2>
                            <p className="mt-5 leading-7 text-[#6d6761]">
                                Se a sua pergunta não estiver aqui, fale com a equipe pelo WhatsApp.
                            </p>
                            <WhatsAppLeadCapture
                                pageLabel="FAQ · Landing V2 · Curso Online de Suspensão"
                                className="mt-6 inline-flex min-h-12 items-center gap-2 font-bold text-[#178b43] underline decoration-green-300 underline-offset-4"
                            >
                                <MessageCircle size={18} aria-hidden="true" />
                                Falar com a equipe
                            </WhatsAppLeadCapture>
                        </div>
                    </Reveal>

                    <Reveal className="space-y-3" delay={0.06}>
                        {FAQS.map((faq, index) => (
                            <FAQItem
                                key={faq.question}
                                question={faq.question}
                                answer={faq.answer}
                                index={index}
                            />
                        ))}
                    </Reveal>
                </div>
            </section>

            <footer className="border-t border-white/8 bg-[#171513] py-12 text-white">
                <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-7 px-5 text-center sm:px-8 md:flex-row md:text-left">
                    <div>
                        <img
                            src="/logo-wtech-branca.webp"
                            alt="W-Tech Work Suspension"
                            loading="lazy"
                            width={150}
                            height={48}
                            className="mx-auto h-8 w-auto opacity-90 md:mx-0"
                        />
                        <p className="mt-4 text-xs text-white/45">
                            Curso online de regulagem de suspensão para pilotos Off-Road.
                        </p>
                    </div>
                    <div className="text-xs leading-6 text-white/42">
                        <p>© {new Date().getFullYear()} W-Tech Brasil. Todos os direitos reservados.</p>
                        <div className="mt-1 flex justify-center gap-4 md:justify-end">
                            <a href="/termos" className="hover:text-white">
                                Termos
                            </a>
                            <a href="/privacidade" className="hover:text-white">
                                Privacidade
                            </a>
                        </div>
                    </div>
                </div>
            </footer>

            <WhatsAppLeadCapture pageLabel="Botão flutuante · Landing V2 · Curso Online de Suspensão" floating />

            <div className="fixed inset-x-0 bottom-0 z-50 border-t border-black/10 bg-white/96 px-4 py-3 shadow-[0_-12px_35px_rgba(25,21,18,0.10)] backdrop-blur-xl lg:hidden">
                <div className="mx-auto flex max-w-xl items-center gap-3">
                    <div className="shrink-0">
                        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#7c756f]">
                            Curso completo
                        </p>
                        <p className="font-display text-xl font-bold leading-none text-[#201d1b]">
                            {price.installmentsShort}
                        </p>
                    </div>
                    <CheckoutButton
                        checkoutUrl={checkoutUrl}
                        label="Quero começar"
                        trackingLabel="Mobile"
                        compact
                        className="flex-1"
                        scrollToOffer
                    />
                </div>
            </div>
        </main>
    );
};

export default LPErgonomia2;
