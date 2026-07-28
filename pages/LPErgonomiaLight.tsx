import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
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
    Quote,
    ShieldCheck,
    Sparkles,
    Star,
    Target,
    Trophy,
    Users,
    Wrench,
    Zap,
} from 'lucide-react';
import { buildCheckoutUrl, captureTrackingParams } from '../lib/tracking';
import { lpTranslations } from '../lib/lpErgonomiaTranslations';

const COURSE_VIDEO = 'https://niesvylxwfaffgnmdoql.supabase.co/storage/v1/object/public/site-assets/vsl-suspensao.mp4';
const KIWIFY_BASE = 'https://pay.kiwify.com.br/19v4nIa';
const t = lpTranslations['pt-BR'];

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
    const [checkoutUrl, setCheckoutUrl] = useState(KIWIFY_BASE);
    const [videoActivated, setVideoActivated] = useState(false);
    const [videoPlaying, setVideoPlaying] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        captureTrackingParams();
        setCheckoutUrl(buildCheckoutUrl(KIWIFY_BASE));

        const previousTitle = document.title;
        document.title = 'Curso de Suspensão para Pilotos — Edição Premium W-Tech';
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
    }, []);

    const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

    const playVideo = () => {
        setVideoActivated(true);
        requestAnimationFrame(() => {
            videoRef.current?.load();
            videoRef.current?.play().catch(() => undefined);
            setVideoPlaying(true);
        });
    };

    const riderProblems = [
        {
            icon: <Gauge size={24} />,
            title: 'Braços pesados cedo demais',
            text: 'A moto devolve impacto para o guidão e você perde rendimento antes do fim da trilha.',
        },
        {
            icon: <Mountain size={24} />,
            title: 'Tração que desaparece',
            text: 'A traseira pula, cava ou patina porque mola, SAG e hidráulica não trabalham juntos.',
        },
        {
            icon: <Target size={24} />,
            title: 'Frente sem confiança',
            text: 'A moto espalha nas curvas e muda de comportamento sem avisar em terrenos diferentes.',
        },
        {
            icon: <Bike size={24} />,
            title: 'Ajustes no escuro',
            text: 'Você gira cliques sem método e nunca sabe qual mudança realmente melhorou a pilotagem.',
        },
    ];

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

    const testimonials = [
        {
            quote: 'Depois do curso, ajustei os cliques e o SAG para o meu peso. A moto parou de me expulsar da linha e ficou muito mais previsível.',
            name: 'Ricardo F.',
            role: 'Piloto amador — SP',
        },
        {
            quote: 'Eu achava que precisava trocar componentes. Na prática, o problema era a hidráulica zerada. O método mudou completamente minha leitura da moto.',
            name: 'Juliana M.',
            role: 'Pilota Hard Enduro — RJ',
        },
        {
            quote: 'A frente agora transmite confiança nas curvas e a tração ficou constante nas subidas. Consigo terminar a trilha muito menos cansado.',
            name: 'Tiago L.',
            role: 'Piloto de Enduro — PR',
        },
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
                        <div className="rounded-lg bg-[#171714] px-2.5 py-2 sm:px-3">
                            <img src="/logo-wtech-branca.webp" alt="W-Tech" className="h-4 w-auto sm:h-5" />
                        </div>
                        <span className="hidden text-[10px] font-black uppercase tracking-[0.2em] text-[#69665e] sm:block">
                            Suspensão para pilotos
                        </span>
                    </div>
                    <nav className="hidden items-center gap-7 text-xs font-black uppercase tracking-[0.12em] text-[#69665e] lg:flex">
                        <button type="button" onClick={() => scrollTo('metodo')} className="cursor-pointer hover:text-[#9a6d13]">Método</button>
                        <button type="button" onClick={() => scrollTo('conteudo')} className="cursor-pointer hover:text-[#9a6d13]">Conteúdo</button>
                        <button type="button" onClick={() => scrollTo('depoimentos')} className="cursor-pointer hover:text-[#9a6d13]">Resultados</button>
                    </nav>
                    <button
                        type="button"
                        onClick={() => scrollTo('oferta')}
                        className="min-h-11 cursor-pointer rounded-xl bg-[#171714] px-4 text-[10px] font-black uppercase tracking-[0.12em] text-white transition-colors hover:bg-[#a97816] sm:px-6 sm:text-xs"
                    >
                        <span className="sm:hidden">Inscrição</span>
                        <span className="hidden sm:inline">Ver inscrição</span>
                    </button>
                </div>
            </header>

            <main>
                <section className="relative isolate overflow-hidden border-b border-[#ddd7c9]">
                    <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_15%_10%,rgba(216,180,88,.22),transparent_30%),linear-gradient(135deg,#fbfaf6_0%,#f1eee5_100%)]" />
                    <div className="absolute inset-0 -z-10 opacity-30 [background-image:linear-gradient(rgba(23,23,20,.045)_1px,transparent_1px),linear-gradient(90deg,rgba(23,23,20,.045)_1px,transparent_1px)] [background-size:52px_52px]" />
                    <div className="mx-auto grid min-h-[calc(100svh-57px)] max-w-7xl items-center gap-7 px-4 py-8 sm:min-h-[calc(100vh-65px)] sm:gap-10 sm:px-8 sm:py-12 lg:grid-cols-[.92fr_1.08fr] lg:py-16">
                        <motion.div initial="hidden" animate="visible" variants={reveal} className="relative z-10">
                            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#c9a445]/35 bg-white/80 px-3 py-2 text-[9px] font-black uppercase tracking-[0.16em] text-[#8b6212] shadow-sm sm:mb-5 sm:px-4 sm:text-xs sm:tracking-[0.2em]">
                                <Sparkles size={15} />
                                Método W-Tech para pilotos Off-Road
                            </div>
                            <h1 className="max-w-2xl text-[2.55rem] font-black uppercase leading-[.94] tracking-[-0.05em] text-[#171714] sm:text-6xl sm:leading-[.98] sm:tracking-[-0.045em] lg:text-7xl">
                                Acerte sua suspensão.{' '}
                                <span className="bg-gradient-to-r from-[#9a6d13] via-[#c79a37] to-[#b5211f] bg-clip-text text-transparent">
                                    Pilote mais longe.
                                </span>
                            </h1>
                            <p className="mt-4 max-w-xl text-[15px] font-medium leading-relaxed text-[#55534d] sm:mt-6 sm:text-xl">
                                Aprenda a regular SAG, molas, cliques e ergonomia para ganhar controle,
                                tração e confiança — sem depender de tentativa e erro.
                            </p>

                            <div className="mt-5 grid grid-cols-[1fr_auto] gap-2 sm:mt-7 sm:flex sm:flex-row sm:gap-3">
                                <button
                                    type="button"
                                    onClick={() => scrollTo('oferta')}
                                    className="flex min-h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#171714] to-[#39352c] px-4 text-[11px] font-black uppercase tracking-[0.1em] text-white shadow-[0_18px_45px_rgba(23,23,20,.18)] transition-transform hover:-translate-y-0.5 sm:w-auto sm:gap-3 sm:px-7 sm:text-sm sm:tracking-[0.12em]"
                                >
                                    <span className="sm:hidden">Quero pilotar melhor</span>
                                    <span className="hidden sm:inline">Quero regular minha moto</span>
                                    <ArrowRight size={19} strokeWidth={3} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => scrollTo('aula')}
                                    className="flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#cac3b3] bg-white/75 px-4 text-[11px] font-black uppercase tracking-[0.1em] text-[#393730] hover:border-[#aa8129] sm:w-auto sm:px-7 sm:text-sm"
                                    aria-label="Assistir à aula"
                                >
                                    <Play size={17} fill="currentColor" />
                                    <span className="hidden sm:inline">Assistir à aula</span>
                                </button>
                            </div>

                            <div className="mt-4 grid grid-cols-3 gap-2 text-[9px] font-bold leading-tight text-[#5e5b54] sm:mt-6 sm:flex sm:flex-wrap sm:gap-x-5 sm:gap-y-3 sm:text-xs">
                                <span className="inline-flex items-center gap-2"><ShieldCheck size={17} className="text-[#a97816]" />Garantia de 7 dias</span>
                                <span className="inline-flex items-center gap-2"><Clock3 size={17} className="text-[#a97816]" />12 meses de acesso</span>
                                <span className="inline-flex items-center gap-2"><GraduationCap size={17} className="text-[#a97816]" />Certificado incluso</span>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.97, y: 18 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.12 }}
                            className="relative mt-1 sm:mt-0"
                        >
                            <div className="absolute -inset-4 -z-10 rounded-[2.2rem] bg-gradient-to-br from-[#d8b458]/25 to-[#b5211f]/10 blur-2xl" />
                            <div className="overflow-hidden rounded-[1.75rem] border border-white bg-white p-2 shadow-[0_30px_90px_rgba(65,54,29,.18)]">
                                <img
                                    src="/images/lp-curso/hero-light-premium.webp"
                                    alt="Alex Crepaldi com amortecedor em oficina premium de suspensões"
                                    width={1672}
                                    height={941}
                                    fetchPriority="high"
                                    className="aspect-[16/9] w-full rounded-[1.3rem] object-cover object-center sm:aspect-[16/10] lg:aspect-[4/3]"
                                />
                            </div>
                            <div className="absolute bottom-3 left-3 right-3 rounded-xl border border-white/60 bg-white/90 p-3 shadow-xl backdrop-blur-xl sm:bottom-5 sm:left-7 sm:right-auto sm:max-w-xs sm:rounded-2xl sm:p-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#171714] text-[#e4c46d] sm:h-11 sm:w-11 sm:rounded-xl">
                                        <Trophy size={21} />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#9a6d13] sm:text-[10px] sm:tracking-[0.18em]">Autoridade técnica</p>
                                        <p className="mt-0.5 text-xs font-black text-[#171714] sm:text-sm">Alex Crepaldi · +3.000 alunos</p>
                                    </div>
                                </div>
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
                            <SectionEyebrow>O problema não é só preparo físico</SectionEyebrow>
                            <h2 className="text-3xl font-black uppercase leading-[1.05] tracking-[-0.035em] sm:text-5xl">
                                Quando a suspensão está errada,{' '}
                                <span className="text-[#a97816]">seu corpo paga a conta.</span>
                            </h2>
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

                <section id="aula" className="relative isolate overflow-hidden bg-[#11110f] px-5 py-20 text-white sm:px-8 lg:py-28">
                    <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_80%_20%,rgba(181,33,31,.23),transparent_35%),radial-gradient(circle_at_15%_80%,rgba(216,180,88,.12),transparent_35%)]" />
                    <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[.8fr_1.2fr]">
                        <div>
                            <SectionEyebrow dark>Aula de acerto na moto real</SectionEyebrow>
                            <h2 className="text-3xl font-black uppercase leading-[1.03] tracking-[-0.035em] sm:text-5xl">
                                Veja o método antes de decidir.
                            </h2>
                            <p className="mt-5 max-w-lg leading-relaxed text-zinc-300">
                                Em poucos minutos, você entende por que ajustes isolados não resolvem e
                                como SAG, molas, hidráulica e ergonomia precisam trabalhar em conjunto.
                            </p>
                            <div className="mt-7 space-y-3">
                                {['Diagnóstico sem achismo', 'Explicação visual e objetiva', 'Aplicação direta na sua moto'].map((item) => (
                                    <div key={item} className="flex items-center gap-3 text-sm font-bold text-zinc-200">
                                        <CheckCircle2 size={19} className="text-[#e4c46d]" />
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div
                            className="group relative aspect-video cursor-pointer overflow-hidden rounded-3xl border border-[#d8b458]/35 bg-black shadow-[0_30px_90px_rgba(0,0,0,.5)]"
                            onClick={playVideo}
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
                                <div className="absolute inset-0 flex items-center justify-center bg-black/35 transition-colors group-hover:bg-black/20">
                                    <span className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#f0ce6f] to-[#c99022] text-black shadow-[0_0_55px_rgba(215,173,79,.5)] transition-transform group-hover:scale-105">
                                        <Play size={32} fill="currentColor" className="ml-1" />
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                <section id="metodo" className="bg-white px-5 py-20 sm:px-8 lg:py-28">
                    <div className="mx-auto max-w-7xl">
                        <div className="mx-auto max-w-3xl text-center">
                            <SectionEyebrow>O método W-Tech</SectionEyebrow>
                            <h2 className="text-3xl font-black uppercase leading-[1.05] tracking-[-0.035em] sm:text-5xl">
                                Quatro fundamentos.{' '}
                                <span className="text-[#a97816]">Uma moto previsível.</span>
                            </h2>
                            <p className="mt-5 text-[#69665e]">
                                Você aprende a analisar o conjunto, mudar uma variável por vez e construir
                                uma regulagem que faz sentido para seu peso, ritmo e terreno.
                            </p>
                        </div>
                        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                            {t.concepts.items.map((item, index) => (
                                <article key={item.title} className="rounded-3xl border border-[#e4dfd3] bg-[#f8f6f0] p-7">
                                    <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#171714] text-[#e4c46d]">
                                        {methodIcons[index]}
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#a97816]">Etapa 0{index + 1}</span>
                                    <h3 className="mt-2 text-xl font-black">{item.title}</h3>
                                    <p className="mt-3 text-sm leading-relaxed text-[#69665e]">{item.desc}</p>
                                </article>
                            ))}
                        </div>
                        <div className="mt-10 grid overflow-hidden rounded-3xl border border-[#d9d2c2] bg-[#171714] text-white lg:grid-cols-2">
                            <div className="p-7 sm:p-10">
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#e4c46d]">Ao concluir, você será capaz de</p>
                                <h3 className="mt-3 text-2xl font-black uppercase sm:text-3xl">Sair da tentativa e erro para um processo técnico.</h3>
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
                                <SectionEyebrow>Conteúdo completo</SectionEyebrow>
                                <h2 className="text-3xl font-black uppercase leading-[1.05] tracking-[-0.035em] sm:text-5xl">
                                    11 módulos para dominar{' '}
                                    <span className="text-[#a97816]">o acerto da sua moto.</span>
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
                                            <p className="mt-3 text-[10px] font-black uppercase tracking-[0.15em] text-[#a97816]">{module.aulas} {module.aulas === 1 ? 'aula' : 'aulas'}</p>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
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
                            <SectionEyebrow dark>Resultados de alunos</SectionEyebrow>
                            <h2 className="text-3xl font-black uppercase leading-[1.05] tracking-[-0.035em] sm:text-5xl">
                                Mais confiança na moto.{' '}
                                <span className="text-[#e4c46d]">Menos desgaste no corpo.</span>
                            </h2>
                        </div>
                        <div className="mt-12 grid gap-5 lg:grid-cols-3">
                            {testimonials.map((item) => (
                                <article key={item.name} className="rounded-3xl border border-white/10 bg-white/[0.055] p-7">
                                    <div className="mb-5 flex items-center justify-between">
                                        <Quote size={26} className="text-[#e4c46d]" />
                                        <div className="flex gap-1 text-[#e4c46d]" aria-label="5 estrelas">
                                            {[0, 1, 2, 3, 4].map((star) => <Star key={star} size={14} fill="currentColor" />)}
                                        </div>
                                    </div>
                                    <p className="leading-relaxed text-zinc-200">“{item.quote}”</p>
                                    <div className="mt-6 border-t border-white/10 pt-5">
                                        <p className="font-black">{item.name}</p>
                                        <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">{item.role}</p>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <section id="oferta" className="relative isolate overflow-hidden px-5 py-20 sm:px-8 lg:py-28">
                    <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_50%_20%,rgba(216,180,88,.2),transparent_32%),#f6f4ee]" />
                    <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.85fr_1.15fr] lg:items-center">
                        <div>
                            <SectionEyebrow>Materiais incluídos</SectionEyebrow>
                            <h2 className="text-3xl font-black uppercase leading-[1.05] tracking-[-0.035em] sm:text-5xl">
                                Curso completo +{' '}
                                <span className="text-[#a97816]">ferramentas de aplicação.</span>
                            </h2>
                            <p className="mt-5 max-w-xl leading-relaxed text-[#646159]">
                                Você não recebe apenas aulas. Leva referências que ajudam a registrar,
                                comparar e repetir sua regulagem com segurança.
                            </p>
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
                                Oferta especial de lançamento
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

                                <p className="text-sm font-bold text-zinc-500 line-through">De R$ 997,00 por</p>
                                <div className="mt-2 flex items-end gap-3">
                                    <span className="text-5xl font-black tracking-[-0.045em] text-white sm:text-6xl">12x R$ 34,70</span>
                                </div>
                                <p className="mt-2 text-sm font-bold text-[#e4c46d]">ou R$ 347,00 à vista</p>

                                <a
                                    href={checkoutUrl}
                                    id="kiwify-checkout-btn-lp-ergonomia-light"
                                    className="mt-8 flex min-h-16 w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-[#f0ce6f] to-[#d39f32] px-6 text-center text-sm font-black uppercase tracking-[0.12em] text-black shadow-[0_18px_45px_rgba(215,173,79,.2)] transition-transform hover:scale-[1.015] sm:text-base"
                                >
                                    Quero regular minha suspensão
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
                            <SectionEyebrow>Dúvidas frequentes</SectionEyebrow>
                            <h2 className="text-3xl font-black uppercase leading-[1.05] tracking-[-0.035em] sm:text-5xl">
                                Decida com{' '}
                                <span className="text-[#a97816]">segurança.</span>
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
                        <span className="block text-[9px] font-black uppercase tracking-[0.15em] text-[#e4c46d]">Curso completo</span>
                        <span className="block text-sm font-black">12x R$ 34,70</span>
                    </span>
                    <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.1em]">
                        Ver inscrição <ArrowRight size={17} />
                    </span>
                </button>
            </div>
        </div>
    );
};

export default LPErgonomiaLight;
