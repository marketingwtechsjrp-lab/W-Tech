import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Marquee } from '../components/ui/marquee';
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher';
import { VideoTestimonialsMarquee } from '../components/lp/VideoTestimonialsMarquee';
import { useLanguage } from '../context/LanguageContext';
import {
    ArrowRight,
    Award,
    Bike,
    BookOpen,
    Check,
    CheckCircle2,
    ChevronDown,
    CircleGauge,
    Clock3,
    Gauge,
    GraduationCap,
    Headphones,
    Mountain,
    Play,
    ShieldCheck,
    Sparkles,
    Target,
    Wrench,
    Zap,
} from 'lucide-react';
import { buildCheckoutUrl, captureTrackingParams } from '../lib/tracking';
import { getCheckoutUrl, getCoursePrice } from '../lib/coursePricing';
import { useBillingRegion } from '../hooks/useBillingRegion';
import { lpTranslations } from '../lib/lpErgonomiaTranslations';
import { trackEvent } from '../components/AnalyticsTracker';
import { WhatsAppLeadCapture } from '../components/WhatsAppLeadCapture';
import {
    getSuspensionFunnelCopy,
    readSuspensionFunnelContext,
    suspensionFunnelEventLabel,
} from '../lib/suspensionFunnel';

const COURSE_VIDEO = 'https://niesvylxwfaffgnmdoql.supabase.co/storage/v1/object/public/site-assets/vsl-suspensao.mp4';

const lightUi = {
    'pt-BR': {
        nav: ['Método', 'Conteúdo', 'Resultados'],
        enrollment: 'Ver inscrição',
        freeClass: 'Apresentação · Método W-Tech Off-Road',
        watchNow: 'Assistir à apresentação agora',
        testimonialsLabel: 'Resultados de alunos',
        testimonialsTitle: 'Veja e ouça quem já viveu a experiência W-Tech.',
        inside: 'Veja por dentro',
        insideTitle: 'As aulas que formam sua nova regulagem',
        modulesAlt: 'Capa oficial do módulo',
        lessons: ['aula', 'aulas'],
        course: 'Curso completo',
    },
    'pt-PT': {
        nav: ['Método', 'Conteúdo', 'Resultados'],
        enrollment: 'Ver inscrição',
        freeClass: 'Apresentação · Método W-Tech Off-Road',
        watchNow: 'Ver a apresentação agora',
        testimonialsLabel: 'Resultados de alunos',
        testimonialsTitle: 'Vê e ouve quem já viveu a experiência W-Tech.',
        inside: 'Vê por dentro',
        insideTitle: 'As aulas que formam a tua nova afinação',
        modulesAlt: 'Capa oficial do módulo',
        lessons: ['aula', 'aulas'],
        course: 'Curso completo',
    },
    es: {
        nav: ['Método', 'Contenido', 'Resultados'],
        enrollment: 'Ver inscripción',
        freeClass: 'Presentación · Método W-Tech Off-Road',
        watchNow: 'Ver la presentación ahora',
        testimonialsLabel: 'Resultados de alumnos',
        testimonialsTitle: 'Mira y escucha a quienes ya vivieron la experiencia W-Tech.',
        inside: 'Mira por dentro',
        insideTitle: 'Las clases que forman tu nueva puesta a punto',
        modulesAlt: 'Portada oficial del módulo',
        lessons: ['clase', 'clases'],
        course: 'Curso completo',
    },
    en: {
        nav: ['Method', 'Content', 'Results'],
        enrollment: 'View enrollment',
        freeClass: 'Presentation · W-Tech Off-Road Method',
        watchNow: 'Watch the presentation now',
        testimonialsLabel: 'Student results',
        testimonialsTitle: 'See and hear from riders who experienced W-Tech.',
        inside: 'See inside',
        insideTitle: 'The lessons behind your new suspension setup',
        modulesAlt: 'Official module cover',
        lessons: ['lesson', 'lessons'],
        course: 'Full course',
    },
} as const;

const reveal = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } },
};

const SectionEyebrow: React.FC<{ children: React.ReactNode; dark?: boolean }> = ({ children, dark = false }) => (
    <span className={`mb-4 inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] ${dark ? 'text-[#e4c46d]' : 'text-[#a97816]'}`}>
        <span className={`h-px w-8 ${dark ? 'bg-[#e4c46d]' : 'bg-[#a97816]'}`} />
        {children}
    </span>
);

const LightFAQ: React.FC<{ question: string; answer: string }> = ({ question, answer }) => {
    const [open, setOpen] = useState(false);
    return (
        <div className="overflow-hidden rounded-2xl border border-[#ded9cc] bg-white shadow-[0_10px_35px_rgba(24,24,22,.04)]">
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                className="flex min-h-16 w-full cursor-pointer items-center justify-between gap-5 px-5 py-4 text-left text-sm font-black text-[#171714] sm:px-6 sm:text-base"
                aria-expanded={open}
            >
                {question}
                <ChevronDown
                    size={19}
                    className={`shrink-0 text-[#a97816] transition-transform ${open ? 'rotate-180' : ''}`}
                />
            </button>
            {open && (
                <div className="border-t border-[#ece8de] px-5 py-4 text-sm leading-relaxed text-[#615f58] sm:px-6">
                    {answer}
                </div>
            )}
        </div>
    );
};

const LPErgonomiaLight: React.FC = () => {
    const { currentLang } = useLanguage();
    const t = lpTranslations[currentLang];
    const billingRegion = useBillingRegion();
    const price = getCoursePrice(billingRegion, currentLang);
    const ui = lightUi[currentLang];
    const funnel = useMemo(() => readSuspensionFunnelContext('light'), []);
    const funnelCopy = getSuspensionFunnelCopy(currentLang, funnel.angle);
    const funnelEventLabel = suspensionFunnelEventLabel(funnel);
    const [checkoutUrl, setCheckoutUrl] = useState(() => getCheckoutUrl(billingRegion));
    const [videoActivated, setVideoActivated] = useState(false);
    const [videoPlaying, setVideoPlaying] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        captureTrackingParams();
        setCheckoutUrl(buildCheckoutUrl(getCheckoutUrl(billingRegion)));
        trackEvent('Funil Suspensão', 'lp_view', funnelEventLabel);

        const previousTitle = document.title;
        document.title = funnel.personalized
            ? `${funnelCopy.label} — Curso W-Tech`
            : 'Curso de Suspensão para Pilotos — Edição Premium W-Tech';
        let robots = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
        const createdRobots = !robots;
        const previousRobots = robots?.content;
        if (!robots) {
            robots = document.createElement('meta');
            robots.name = 'robots';
            document.head.appendChild(robots);
        }
        robots.content = 'noindex,follow';

        return () => {
            document.title = previousTitle;
            if (createdRobots) {
                robots?.remove();
            } else if (robots && previousRobots) {
                robots.content = previousRobots;
            }
        };
    }, [funnel.personalized, funnelCopy.label, funnelEventLabel, billingRegion]);

    const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

    const playVideo = () => {
        setVideoActivated(true);
        requestAnimationFrame(() => {
            videoRef.current?.load();
            videoRef.current?.play().catch(() => undefined);
            setVideoPlaying(true);
        });
    };

    const problemIcons = [<Gauge size={24} />, <Mountain size={24} />, <Target size={24} />, <Bike size={24} />];
    const riderProblems = t.profiles.items.map((item, index) => ({
        icon: problemIcons[index],
        title: item.title,
        text: item.pain,
    }));

    const methodIcons = [<CircleGauge size={25} />, <Wrench size={25} />, <Zap size={25} />, <Target size={25} />];

    const outcomes = [
        'Regular o SAG para o seu peso e modalidade',
        'Entender compressão e retorno sem “achismo”',
        'Identificar mola, óleo e calibragem adequados',
        'Montar a dianteira livre de torções',
        'Adaptar guidão, manetes e comandos ao seu corpo',
        'Criar uma base de regulagem que você consegue repetir',
    ];

    const bonuses = [
        { title: 'Planilha de Regulagem de SAG', value: 'R$ 397' },
        { title: 'Planilha de Pressão e PSI', value: 'R$ 257' },
        { title: 'Comparativo de Óleos', value: 'R$ 197' },
        { title: 'Comparativo de Molas', value: 'R$ 146' },
    ];

    const conceptImages = [
        '/images/modulos/CARDS-KWIFY-CURSO-AVANCADO-2.webp',
        '/images/modulos/CARDS-KWIFY-CURSO-AVANCADO-4.webp',
        '/images/modulos/CARDS-KWIFY-CURSO-AVANCADO-1.webp',
        '/images/modulos/CARDS-KWIFY-CURSO-AVANCADO-3.webp',
    ];

    const moduleCovers = [
        '/images/modulos/CARDS-KWIFY-CURSO-AVANCADO.webp',
        '/images/modulos/CARDS-KWIFY-CURSO-AVANCADO-1.webp',
        '/images/modulos/CARDS-KWIFY-CURSO-AVANCADO-2.webp',
        '/images/modulos/CARDS-KWIFY-CURSO-AVANCADO-3.webp',
        '/images/modulos/CARDS-KWIFY-CURSO-AVANCADO-4.webp',
        '/images/lp-curso/oleo-e-viscosidades.webp',
        '/images/modulos/CARDS-KWIFY-CURSO-AVANCADO-3-1.webp',
        '/images/modulos/CARDS-KWIFY-CURSO-AVANCADO-4-1.webp',
    ];

    const faq = [
        ...t.faq.items,
        {
            q: 'Por quanto tempo terei acesso?',
            a: 'O acesso ao curso é válido por 12 meses. Durante esse período, você pode rever as aulas quantas vezes precisar.',
        },
        {
            q: 'Posso aplicar o método sem desmontar a suspensão?',
            a: 'Sim. O curso começa pelos ajustes que o próprio piloto consegue medir e aplicar na moto. Quando uma intervenção técnica for necessária, você aprenderá a identificar isso com clareza.',
        },
        {
            q: 'Existe garantia?',
            a: 'Sim. Você tem 7 dias de garantia incondicional para conhecer o treinamento e decidir com segurança.',
        },
    ];

    return (
        <div className="min-h-screen overflow-x-hidden bg-[#f6f4ee] pb-20 text-[#171714] selection:bg-[#d8b458] selection:text-black lg:pb-0">
            <header className="sticky top-0 z-50 border-b border-black/5 bg-[#f9f7f1]/92 backdrop-blur-xl">
                <div className="mx-auto flex min-h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:min-h-16 sm:gap-5 sm:px-8">
                    <div className="flex items-center gap-3">
                        <img src="/logo-wtech-branca.webp" alt="W-Tech" className="h-5 w-auto brightness-0 sm:h-6" />
                        <span className="hidden text-[10px] font-black uppercase tracking-[0.2em] text-[#69665e] sm:block">
                            Suspensão para pilotos
                        </span>
                    </div>
                    <nav className="hidden items-center gap-7 text-xs font-black uppercase tracking-[0.12em] text-[#69665e] xl:flex">
                        <button type="button" onClick={() => scrollTo('metodo')} className="cursor-pointer hover:text-[#9a6d13]">{ui.nav[0]}</button>
                        <button type="button" onClick={() => scrollTo('conteudo')} className="cursor-pointer hover:text-[#9a6d13]">{ui.nav[1]}</button>
                        <button type="button" onClick={() => scrollTo('depoimentos')} className="cursor-pointer hover:text-[#9a6d13]">{ui.nav[2]}</button>
                    </nav>
                    <div className="flex items-center gap-2">
                        <LanguageSwitcher variant="light" compact className="hidden sm:inline-flex" />
                        <button
                            type="button"
                            onClick={() => scrollTo('oferta')}
                            className="min-h-11 cursor-pointer rounded-xl bg-[#171714] px-4 text-[10px] font-black uppercase tracking-[0.12em] text-white transition-colors hover:bg-[#a97816] sm:px-6 sm:text-xs"
                        >
                            {ui.enrollment}
                        </button>
                    </div>
                </div>
            </header>

            <main>
                <section id="apresentacao" className="relative isolate overflow-hidden border-b border-[#d7d0bf]">
                    <img
                        src="/images/lp-curso/hero-light-vsl-rider.webp"
                        alt=""
                        aria-hidden="true"
                        width={1600}
                        height={900}
                        fetchPriority="high"
                        className="absolute inset-0 -z-30 h-full w-full object-cover object-[68%_center]"
                    />
                    <div className="absolute inset-0 -z-20 bg-gradient-to-b from-[#fbfaf6]/92 via-[#f8f4e9]/80 to-[#f6f4ee]/96" />
                    <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_8%,rgba(255,255,255,.92),transparent_33%),linear-gradient(90deg,rgba(255,255,255,.46),transparent_52%,rgba(181,33,31,.08))]" />

                    <div className="mx-auto flex min-h-[calc(100svh-57px)] max-w-6xl flex-col items-center px-4 py-7 text-center sm:min-h-[calc(100vh-65px)] sm:px-8 sm:py-10 lg:py-12">
                        <motion.div initial="hidden" animate="visible" variants={reveal} className="relative z-10 flex w-full flex-col items-center">
                            <div className="inline-flex items-center gap-2 rounded-full border border-[#b88925]/35 bg-white/85 px-3 py-2 text-[9px] font-black uppercase tracking-[0.16em] text-[#80580f] shadow-sm backdrop-blur sm:px-4 sm:text-xs sm:tracking-[0.2em]">
                                <Sparkles size={15} />
                                {funnel.flow === 'vsl_lp'
                                    ? funnelCopy.continuity
                                    : funnel.personalized
                                        ? `${funnelCopy.label} · ${ui.freeClass}`
                                        : ui.freeClass}
                            </div>
                            <h1 className="mt-4 max-w-5xl text-[2.35rem] font-black uppercase leading-[.94] tracking-[-0.05em] text-[#171714] sm:mt-5 sm:text-5xl sm:leading-[.98] lg:text-6xl">
                                {funnel.personalized ? funnelCopy.titlePart1 : t.hero.titlePart1}{' '}
                                <span className="bg-gradient-to-r from-[#8a5d0c] via-[#bd8923] to-[#b5211f] bg-clip-text text-transparent">
                                    {funnel.personalized ? funnelCopy.titleHighlight : t.hero.titleHighlight}
                                </span>
                            </h1>
                            <p className="mt-3 max-w-3xl text-sm font-semibold leading-relaxed text-[#4f4c45] sm:mt-4 sm:text-lg">
                                {funnel.personalized ? funnelCopy.subtitle : t.hero.subtitle}
                            </p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.97, y: 18 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.12 }}
                            className="relative mt-5 w-full max-w-4xl sm:mt-7"
                        >
                            <div className="absolute -inset-3 -z-10 rounded-[2rem] bg-gradient-to-br from-[#d8b458]/35 via-white/40 to-[#b5211f]/20 blur-xl sm:-inset-5 sm:blur-2xl" />
                            <div
                                className="group relative aspect-video cursor-pointer overflow-hidden rounded-[1.35rem] border-[5px] border-white bg-black shadow-[0_28px_90px_rgba(45,34,13,.28)] sm:rounded-[1.8rem] sm:border-[7px]"
                            >
                                <video
                                    ref={videoRef}
                                    poster="/images/vsl-thumbnail.webp"
                                    controls={videoPlaying}
                                    playsInline
                                    preload="none"
                                    onPlay={() => setVideoPlaying(true)}
                                    onPause={() => setVideoPlaying(false)}
                                    className="h-full w-full object-cover"
                                >
                                    {videoActivated && <source src={COURSE_VIDEO} type="video/mp4" />}
                                </video>
                                {!videoPlaying && (
                                    <button
                                        type="button"
                                        onClick={playVideo}
                                        className="absolute inset-0 flex w-full cursor-pointer flex-col items-center justify-center gap-3 bg-gradient-to-t from-black/65 via-black/15 to-black/20 transition-colors group-hover:from-black/50"
                                        aria-label="Assistir à apresentação"
                                    >
                                        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#f0ce6f] to-[#c99022] text-black shadow-[0_0_55px_rgba(215,173,79,.65)] transition-transform group-hover:scale-105 sm:h-20 sm:w-20">
                                            <Play size={30} fill="currentColor" className="ml-1" />
                                        </span>
                                        <span className="rounded-full bg-black/55 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white backdrop-blur sm:text-xs">
                                            {ui.watchNow}
                                        </span>
                                    </button>
                                )}
                            </div>
                            <div className="mt-4 grid grid-cols-3 gap-2 text-[9px] font-bold leading-tight text-[#4f4c45] sm:flex sm:flex-wrap sm:justify-center sm:gap-x-7 sm:text-xs">
                                <span className="inline-flex items-center justify-center gap-1.5"><ShieldCheck size={16} className="text-[#9a6d13]" />7 dias de garantia</span>
                                <span className="inline-flex items-center justify-center gap-1.5"><Clock3 size={16} className="text-[#9a6d13]" />12 meses de acesso</span>
                                <span className="inline-flex items-center justify-center gap-1.5"><GraduationCap size={16} className="text-[#9a6d13]" />Certificado incluso</span>
                            </div>
                        </motion.div>
                    </div>
                </section>

                <section className="border-b border-[#ded9cc] bg-white">
                    <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-y divide-[#e9e5dc] px-5 sm:px-8 lg:grid-cols-4 lg:divide-y-0">
                        {[
                            ['3.000+', 'alunos treinados'],
                            ['15+', 'anos de experiência'],
                            ['4,9/5', 'avaliação dos alunos'],
                            ['100%', 'online e aplicável'],
                        ].map(([value, label]) => (
                            <div key={label} className="px-4 py-7 text-center">
                                <p className="text-2xl font-black text-[#171714] sm:text-3xl">{value}</p>
                                <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#817d73]">{label}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="px-5 py-20 sm:px-8 lg:py-28">
                    <div className="mx-auto max-w-7xl">
                        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={reveal} className="max-w-3xl">
                            <SectionEyebrow>{t.profiles.label}</SectionEyebrow>
                            <h2 className="text-3xl font-black uppercase leading-[1.05] tracking-[-0.035em] sm:text-5xl">
                                {t.profiles.titlePart1}{' '}
                                <span className="text-[#a97816]">{t.profiles.titleHighlight}</span>
                            </h2>
                            <p className="mt-5 max-w-2xl leading-relaxed text-[#69665e]">{t.profiles.desc}</p>
                        </motion.div>
                        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                            {riderProblems.map((item, index) => (
                                <motion.article
                                    key={item.title}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: index * 0.06 }}
                                    className="rounded-3xl border border-[#dfdacd] bg-white p-7 shadow-[0_18px_50px_rgba(42,38,29,.05)]"
                                >
                                    <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f2ead6] text-[#9a6d13]">
                                        {item.icon}
                                    </div>
                                    <h3 className="text-lg font-black">{item.title}</h3>
                                    <p className="mt-3 text-sm leading-relaxed text-[#69665e]">{item.text}</p>
                                </motion.article>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="relative isolate min-h-[560px] overflow-hidden border-y border-[#d8d2c4]">
                    <img
                        src="/images/lp-curso/light-vsl-clicker-adjustment.webp"
                        alt="Ajuste técnico do clicker da suspensão dianteira de uma moto off-road"
                        width={1600}
                        height={900}
                        loading="lazy"
                        className="absolute inset-0 -z-20 h-full w-full object-cover object-[32%_center]"
                    />
                    <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#f7f3e9]/25 via-[#f7f3e9]/10 to-[#f7f3e9]/35 lg:bg-gradient-to-r lg:from-transparent lg:via-[#f7f3e9]/40 lg:to-[#f7f3e9]/98" />
                    <div className="mx-auto flex min-h-[560px] max-w-7xl items-end px-5 py-10 sm:px-8 lg:items-center lg:justify-end lg:py-20">
                        <motion.div
                            initial={{ opacity: 0, x: 24 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="w-full rounded-3xl border border-white/70 bg-white/[.92] p-7 shadow-[0_30px_90px_rgba(37,31,20,.18)] backdrop-blur-xl sm:p-10 lg:max-w-xl"
                        >
                            <SectionEyebrow>Da dúvida ao ajuste consciente</SectionEyebrow>
                            <h2 className="text-3xl font-black uppercase leading-[1.03] tracking-[-0.035em] sm:text-5xl">
                                Cada clique passa a ter{' '}
                                <span className="text-[#a97816]">um motivo.</span>
                            </h2>
                            <p className="mt-5 leading-relaxed text-[#5f5b52]">
                                Você aprende a medir, registrar e interpretar a resposta da moto. Em vez de
                                copiar a regulagem de outro piloto, constrói uma base coerente com seu peso,
                                ritmo e terreno.
                            </p>
                            <div className="mt-7 grid gap-3 sm:grid-cols-3">
                                {['Medir o SAG', 'Regular cliques', 'Validar na pista'].map((item) => (
                                    <div key={item} className="flex items-center gap-2 rounded-xl bg-[#f4efe3] px-3 py-3 text-xs font-black uppercase tracking-[0.08em]">
                                        <CheckCircle2 size={17} className="shrink-0 text-[#a97816]" />
                                        {item}
                                    </div>
                                ))}
                            </div>
                            <button
                                type="button"
                                onClick={() => scrollTo('metodo')}
                                className="mt-7 inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-xl bg-[#171714] px-5 text-xs font-black uppercase tracking-[0.12em] text-white transition-colors hover:bg-[#a97816]"
                            >
                                Conhecer o método <ArrowRight size={17} />
                            </button>
                        </motion.div>
                    </div>
                </section>

                <section id="metodo" className="bg-white px-5 py-20 sm:px-8 lg:py-28">
                    <div className="mx-auto max-w-7xl">
                        <div className="mx-auto max-w-3xl text-center">
                            <SectionEyebrow>{t.concepts.label}</SectionEyebrow>
                            <h2 className="text-3xl font-black uppercase leading-[1.05] tracking-[-0.035em] sm:text-5xl">
                                {t.concepts.titlePart1}{' '}
                                <span className="text-[#a97816]">{t.concepts.titleHighlight}</span>
                            </h2>
                            <p className="mt-5 text-[#69665e]">{t.concepts.desc}</p>
                        </div>
                        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                            {t.concepts.items.map((item, index) => (
                                <article key={item.title} className="group overflow-hidden rounded-3xl border border-[#e4dfd3] bg-[#f8f6f0] shadow-[0_18px_55px_rgba(41,35,24,.07)]">
                                    <div className="relative aspect-[4/3] overflow-hidden bg-[#171714]">
                                        <img
                                            src={conceptImages[index]}
                                            alt={`Módulo sobre ${item.title}`}
                                            width={320}
                                            height={480}
                                            loading="lazy"
                                            className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
                                        <div className="absolute bottom-4 left-4 flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-black/75 text-[#e4c46d] shadow-lg backdrop-blur">
                                            {methodIcons[index]}
                                        </div>
                                    </div>
                                    <div className="p-6">
                                        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#a97816]">Etapa 0{index + 1}</span>
                                        <h3 className="mt-2 text-xl font-black">{item.title}</h3>
                                        <p className="mt-3 text-sm leading-relaxed text-[#69665e]">{item.desc}</p>
                                    </div>
                                </article>
                            ))}
                        </div>
                        <div className="mt-10 grid overflow-hidden rounded-3xl border border-[#d9d2c2] bg-[#171714] text-white lg:grid-cols-2">
                            <div className="p-7 sm:p-10">
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#e4c46d]">{t.concepts.label}</p>
                                <h3 className="mt-3 text-2xl font-black uppercase sm:text-3xl">{t.concepts.boxText}</h3>
                            </div>
                            <div className="grid gap-3 border-t border-white/10 p-7 sm:grid-cols-2 sm:p-10 lg:border-l lg:border-t-0">
                                {outcomes.map((item) => (
                                    <div key={item} className="flex items-start gap-3 text-sm font-semibold text-zinc-200">
                                        <Check size={18} className="mt-0.5 shrink-0 text-[#e4c46d]" strokeWidth={3} />
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                <section id="conteudo" className="border-y border-[#ddd7c9] bg-[#efece4] px-5 py-20 sm:px-8 lg:py-28">
                    <div className="mx-auto max-w-7xl">
                        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
                            <div className="max-w-3xl">
                                <SectionEyebrow>{t.modules.label}</SectionEyebrow>
                                <h2 className="text-3xl font-black uppercase leading-[1.05] tracking-[-0.035em] sm:text-5xl">
                                    {t.modules.titlePart1}{' '}
                                    <span className="text-[#a97816]">{t.modules.titleHighlight}</span>
                                </h2>
                            </div>
                            <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#69665e]">
                                {['+30 aulas', '12 meses', 'Certificado'].map((item) => (
                                    <span key={item} className="rounded-full border border-[#cfc8b9] bg-white px-4 py-2">{item}</span>
                                ))}
                            </div>
                        </div>
                        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {t.modules.items.map((module) => (
                                <article key={module.num} className="group rounded-2xl border border-[#ded8ca] bg-white p-6 transition-all hover:-translate-y-1 hover:border-[#c59b3d] hover:shadow-xl">
                                    <div className="flex items-start gap-4">
                                        <span className="text-3xl font-black text-[#d4c49f] transition-colors group-hover:text-[#a97816]">{module.num}</span>
                                        <div>
                                            <h3 className="font-black text-[#171714]">{module.title}</h3>
                                            <p className="mt-1 text-sm text-[#716e66]">{module.desc}</p>
                                            <p className="mt-3 text-[10px] font-black uppercase tracking-[0.15em] text-[#a97816]">{module.aulas} {module.aulas === 1 ? ui.lessons[0] : ui.lessons[1]}</p>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </div>

                    <div className="relative mt-14 w-full overflow-hidden pb-2">
                        <div className="mx-auto mb-7 max-w-7xl px-5 text-center sm:px-8">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#a97816]">{ui.inside}</p>
                            <h3 className="mt-2 text-2xl font-black uppercase tracking-[-0.025em] text-[#171714] sm:text-3xl">
                                {ui.insideTitle}
                            </h3>
                        </div>
                        <Marquee pauseOnHover speed={18} className="py-3">
                            {moduleCovers.map((source, index) => (
                                <img
                                    key={source}
                                    src={source}
                                    alt={`${ui.modulesAlt} ${index + 1}`}
                                    width={320}
                                    height={480}
                                    loading="lazy"
                                    decoding="async"
                                    className="h-[250px] w-auto rounded-2xl border border-[#d8d0c0] object-contain shadow-[0_18px_50px_rgba(37,31,20,.14)] transition-transform duration-300 hover:-translate-y-1 sm:h-[310px]"
                                />
                            ))}
                        </Marquee>
                        <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#efece4] to-transparent sm:w-32" />
                        <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#efece4] to-transparent sm:w-32" />
                    </div>
                </section>

                <section className="bg-white px-5 py-20 sm:px-8 lg:py-28">
                    <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
                        <div className="relative">
                            <div className="absolute -inset-4 rounded-[2rem] bg-[#d8b458]/15 blur-2xl" />
                            <img
                                src="/paschoalin.webp"
                                alt="Rafa Paschoalin testando a regulagem na prática"
                                loading="lazy"
                                className="relative aspect-[4/3] w-full rounded-3xl object-cover shadow-[0_25px_75px_rgba(36,33,26,.16)]"
                            />
                            <div className="absolute bottom-5 left-5 rounded-2xl bg-[#171714]/92 px-5 py-4 text-white backdrop-blur">
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#e4c46d]">Validação prática</p>
                                <p className="mt-1 font-black">Rafa Paschoalin</p>
                            </div>
                        </div>
                        <div>
                            <SectionEyebrow>Da teoria para a trilha</SectionEyebrow>
                            <h2 className="text-3xl font-black uppercase leading-[1.05] tracking-[-0.035em] sm:text-5xl">
                                Veja cada ajuste{' '}
                                <span className="text-[#a97816]">mudar a moto na prática.</span>
                            </h2>
                            <p className="mt-6 leading-relaxed text-[#646159]">
                                Paschoalin desregula e regula os componentes na moto real para você perceber
                                o efeito de cada mudança. A técnica de Alex encontra a validação de um piloto
                                de alta performance.
                            </p>
                            <div className="mt-7 grid gap-3 sm:grid-cols-2">
                                {[
                                    'Ergonomia na moto real',
                                    'Guidão e manetes',
                                    'Freio e câmbio',
                                    'Teste antes e depois',
                                ].map((item) => (
                                    <div key={item} className="flex items-center gap-3 rounded-xl bg-[#f5f2ea] px-4 py-3 text-sm font-bold">
                                        <CheckCircle2 size={18} className="text-[#a97816]" />
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                <section id="depoimentos" className="bg-[#171714] px-5 py-20 text-white sm:px-8 lg:py-28">
                    <div className="mx-auto max-w-7xl">
                        <div className="mx-auto max-w-3xl text-center">
                            <SectionEyebrow dark>{ui.testimonialsLabel}</SectionEyebrow>
                            <h2 className="text-3xl font-black uppercase leading-[1.05] tracking-[-0.035em] sm:text-5xl">
                                {ui.testimonialsTitle}
                            </h2>
                        </div>
                        <div className="mt-12">
                            <VideoTestimonialsMarquee language={currentLang} />
                        </div>
                    </div>
                </section>

                <section className="relative isolate min-h-[560px] overflow-hidden">
                    <img
                        src="/images/lp-curso/light-vsl-rider-outcome.webp"
                        alt="Piloto de off-road percorrendo terreno técnico com controle e confiança"
                        width={1600}
                        height={900}
                        loading="lazy"
                        className="absolute inset-0 -z-20 h-full w-full object-cover object-[34%_center]"
                    />
                    <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-[#15130e]/10 to-[#15130e]/85 lg:bg-gradient-to-r lg:from-transparent lg:via-[#15130e]/25 lg:to-[#15130e]/92" />
                    <div className="mx-auto flex min-h-[560px] max-w-7xl items-end px-5 py-12 sm:px-8 lg:items-center lg:justify-end lg:py-20">
                        <motion.div
                            initial={{ opacity: 0, y: 25 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="max-w-xl text-white"
                        >
                            <SectionEyebrow dark>O resultado aparece na pilotagem</SectionEyebrow>
                            <h2 className="text-3xl font-black uppercase leading-[1.02] tracking-[-0.04em] sm:text-5xl">
                                Menos luta com a moto.{' '}
                                <span className="text-[#e4c46d]">Mais controle da linha.</span>
                            </h2>
                            <p className="mt-5 max-w-lg leading-relaxed text-zinc-200">
                                Uma suspensão coerente conserva energia, mantém os pneus em contato com o
                                chão e devolve confiança para você evoluir em cada treino.
                            </p>
                            <button
                                type="button"
                                onClick={() => scrollTo('oferta')}
                                className="mt-7 inline-flex min-h-14 cursor-pointer items-center gap-3 rounded-xl bg-gradient-to-r from-[#f0ce6f] to-[#d39f32] px-6 text-sm font-black uppercase tracking-[0.11em] text-black shadow-[0_18px_45px_rgba(215,173,79,.3)] transition-transform hover:-translate-y-0.5"
                            >
                                Quero regular minha moto <ArrowRight size={19} />
                            </button>
                        </motion.div>
                    </div>
                </section>

                <section id="oferta" className="relative isolate overflow-hidden px-5 py-20 sm:px-8 lg:py-28">
                    <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_50%_20%,rgba(216,180,88,.2),transparent_32%),#f6f4ee]" />
                    <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.85fr_1.15fr] lg:items-center">
                        <div>
                            <SectionEyebrow>{t.offer.badge}</SectionEyebrow>
                            <h2 className="text-3xl font-black uppercase leading-[1.05] tracking-[-0.035em] sm:text-5xl">
                                {t.offer.title}
                            </h2>
                            <p className="mt-5 max-w-xl leading-relaxed text-[#646159]">{price.bonusSubLabel}</p>
                            <div className="mt-8 grid gap-3 sm:grid-cols-2">
                                {bonuses.map((bonus) => (
                                    <div key={bonus.title} className="rounded-2xl border border-[#ddd7c8] bg-white p-5">
                                        <BookOpen size={20} className="text-[#a97816]" />
                                        <p className="mt-4 text-sm font-black">{bonus.title}</p>
                                        <div className="mt-2 flex items-center justify-between text-xs">
                                            <span className="text-[#878278] line-through">{bonus.value}</span>
                                            <span className="font-black uppercase tracking-[0.12em] text-emerald-700">Incluso</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <motion.div
                            initial={{ opacity: 0, y: 25 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="overflow-hidden rounded-[2rem] border border-[#c9a445]/45 bg-[#171714] text-white shadow-[0_35px_100px_rgba(32,29,22,.28)]"
                        >
                            <div className="bg-gradient-to-r from-[#a97816] via-[#d1a844] to-[#a97816] px-6 py-3 text-center text-[11px] font-black uppercase tracking-[0.18em] text-black">
                                Plano Premium · {t.offer.badge}
                            </div>
                            <div className="p-7 sm:p-10">
                                <div className="flex items-start justify-between gap-5">
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#e4c46d]">Curso Suspensão para Pilotos</p>
                                        <h3 className="mt-2 text-2xl font-black uppercase">Do zero ao acerto</h3>
                                    </div>
                                    <Award size={32} className="shrink-0 text-[#e4c46d]" />
                                </div>

                                <div className="mt-7 space-y-3">
                                    {[
                                        '11 módulos + bônus prático Paschoalin',
                                        'Mais de 30 aulas em vídeo',
                                        'Planilhas e comparativos técnicos',
                                        'Acesso por 12 meses',
                                        'Certificado oficial W-Tech',
                                        'Garantia incondicional de 7 dias',
                                    ].map((item) => (
                                        <div key={item} className="flex items-start gap-3 text-sm text-zinc-200">
                                            <Check size={18} className="mt-0.5 shrink-0 text-[#e4c46d]" strokeWidth={3} />
                                            {item}
                                        </div>
                                    ))}
                                </div>

                                <div className="my-8 h-px bg-white/10" />

                                <p className="text-sm font-bold text-zinc-500 line-through">{price.strikeLabel}</p>
                                <div className="mt-2 flex items-end gap-3">
                                    <span className="text-5xl font-black tracking-[-0.045em] text-white sm:text-6xl">{price.installmentsShort}</span>
                                </div>
                                <p className="mt-2 text-sm font-bold text-[#e4c46d]">{price.cashLabel}</p>
                                {price.chargedNotice && (
                                    <p className="mt-2 text-xs font-medium text-zinc-400">{price.chargedNotice}</p>
                                )}

                                <a
                                    href={checkoutUrl}
                                    id="kiwify-checkout-btn-lp-ergonomia-light"
                                    onClick={() => trackEvent('Funil Suspensão', 'checkout_click_offer', funnelEventLabel)}
                                    className="mt-8 flex min-h-16 w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-[#f0ce6f] to-[#d39f32] px-6 text-center text-sm font-black uppercase tracking-[0.12em] text-black shadow-[0_18px_45px_rgba(215,173,79,.2)] transition-transform hover:scale-[1.015] sm:text-base"
                                >
                                    {t.offer.cta}
                                    <ArrowRight size={20} strokeWidth={3} />
                                </a>
                                <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-[11px] font-bold text-zinc-400">
                                    <span className="inline-flex items-center gap-1.5"><ShieldCheck size={15} className="text-[#e4c46d]" />Compra protegida</span>
                                    <span className="inline-flex items-center gap-1.5"><Clock3 size={15} className="text-[#e4c46d]" />Acesso imediato</span>
                                    <span className="inline-flex items-center gap-1.5"><Headphones size={15} className="text-[#e4c46d]" />Suporte na plataforma</span>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </section>

                <section className="border-t border-[#ddd7c9] bg-white px-5 py-20 sm:px-8 lg:py-28">
                    <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.7fr_1.3fr]">
                        <div>
                            <SectionEyebrow>{t.faq.label}</SectionEyebrow>
                            <h2 className="text-3xl font-black uppercase leading-[1.05] tracking-[-0.035em] sm:text-5xl">
                                {t.faq.titlePart1}{' '}
                                <span className="text-[#a97816]">{t.faq.titleHighlight}</span>
                            </h2>
                            <p className="mt-5 text-[#69665e]">
                                As respostas mais importantes antes de começar sua formação.
                            </p>
                        </div>
                        <div className="space-y-3">
                            {faq.map((item) => <LightFAQ key={item.q} question={item.q} answer={item.a} />)}
                        </div>
                    </div>
                </section>
            </main>

            <footer className="border-t border-white/10 bg-[#11110f] px-5 py-12 text-center text-white sm:px-8">
                <img src="/logo-wtech-branca.webp" alt="W-Tech Brasil" className="mx-auto h-7 w-auto opacity-80" />
                <p className="mt-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                    Curso Online de Suspensão para Pilotos Off-Road
                </p>
                <p className="mt-2 text-xs text-zinc-600">Todos os direitos reservados © {new Date().getFullYear()}</p>
            </footer>

            <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[#d8d2c4] bg-white/95 px-3 pt-3 shadow-[0_-12px_35px_rgba(26,24,18,.12)] backdrop-blur lg:hidden [padding-bottom:max(12px,env(safe-area-inset-bottom))]">
                <button
                    type="button"
                    onClick={() => scrollTo('oferta')}
                    className="flex min-h-13 w-full cursor-pointer items-center justify-between rounded-xl bg-[#171714] px-5 text-left text-white"
                >
                    <span>
                        <span className="block text-[9px] font-black uppercase tracking-[0.15em] text-[#e4c46d]">{ui.course}</span>
                        <span className="block text-sm font-black">{price.installmentsShort}</span>
                    </span>
                    <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.1em]">
                        {t.offer.cta} <ArrowRight size={17} />
                    </span>
                </button>
            </div>
            <WhatsAppLeadCapture pageLabel="Landing completa clara · Curso Online de Suspensão" floating />
        </div>
    );
};

export default LPErgonomiaLight;
