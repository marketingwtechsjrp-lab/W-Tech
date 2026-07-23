import React, { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Marquee } from '../components/ui/marquee';
import { captureTrackingParams, buildCheckoutUrl } from '../lib/tracking';
import {
    CheckCircle, ArrowRight, ChevronDown, ShieldCheck, Settings, Zap,
    Users, Bike, Wrench, Mountain, Star, Activity, Move, CircleDot, Disc,
    Flame, Globe,
} from 'lucide-react';
import { lpTranslations, detectUserLanguage, LPLanguage } from '../lib/lpErgonomiaTranslations';

/* ─── Google Fonts Injection ─── */
if (typeof document !== 'undefined') {
    const existing = document.querySelector('#lp4-fonts');
    if (!existing) {
        const link = document.createElement('link');
        link.id = 'lp4-fonts';
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700&display=swap';
        document.head.appendChild(link);
    }
}

/* ─── Inline styles for V4 ─── */
const v4Styles = `
    .lp4 { font-family: 'Inter', sans-serif; }
    .lp4 h1, .lp4 h2, .lp4 h3, .lp4 .display { font-family: 'Outfit', sans-serif; letter-spacing: -0.02em; }
    
    /* Core Backgrounds */
    .lp4-dark { background-color: #0a0a0a; color: #ffffff; }
    .lp4-light { background-color: #ffffff; color: #171717; }
    .lp4-gray { background-color: #f8f9fa; color: #171717; }
    .lp4-gray-darker { background-color: #f1f3f5; color: #171717; }

    /* Cards */
    .lp4-card-light {
        background: #ffffff;
        border: 1px solid #e5e7eb;
        box-shadow: 0 4px 20px rgba(0,0,0,0.03);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .lp4-card-light:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 30px rgba(0,0,0,0.08);
        border-color: #f59e0b;
    }

    .lp4-card-dark {
        background: #121212;
        border: 1px solid #262626;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .lp4-card-dark:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 40px rgba(0,0,0,0.4);
        border-color: #f59e0b;
    }

    /* Primary Button */
    .lp4-btn-primary {
        background: linear-gradient(135deg, #f59e0b, #ea580c);
        box-shadow: 0 8px 25px rgba(245,158,11,0.25), inset 0 1px 0 rgba(255,255,255,0.2);
        color: #ffffff !important;
        text-shadow: 0 1px 2px rgba(0,0,0,0.2);
    }
    .lp4-btn-primary:hover {
        box-shadow: 0 12px 30px rgba(245,158,11,0.35), inset 0 1px 0 rgba(255,255,255,0.25);
    }

    /* Gradients and Glows */
    .lp4-hero-glow {
        background: radial-gradient(ellipse 60% 50% at 50% -20%, rgba(245,158,11,0.15) 0%, transparent 70%);
    }
    .lp4-text-gradient {
        background: linear-gradient(to right, #f59e0b, #ea580c);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
    }
    .lp4-divider-light { border-top: 1px solid #e5e7eb; }
    .lp4-divider-dark { border-top: 1px solid #262626; }
`;

/* ─── Animated Hero Glow ─── */
const HeroGlow: React.FC = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 2 }}
            className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[500px] lp4-hero-glow"
        />
    </div>
);

/* ─── Section Label (Theme Aware) ─── */
const SectionLabel: React.FC<{ children: React.ReactNode; isDark?: boolean }> = ({ children, isDark = false }) => (
    <div className="inline-flex items-center justify-center gap-2 mb-4 w-full">
        <div className={`w-8 h-px ${isDark ? 'bg-amber-500/50' : 'bg-amber-500/50'}`} />
        <span className={`font-bold uppercase tracking-[0.25em] text-[10px] sm:text-xs ${isDark ? 'text-amber-400' : 'text-orange-600'}`}>
            {children}
        </span>
        <div className={`w-8 h-px ${isDark ? 'bg-amber-500/50' : 'bg-amber-500/50'}`} />
    </div>
);

/* ─── FAQ Item (Theme Aware) ─── */
const FAQItem: React.FC<{ q: string; a: string; isDark?: boolean }> = ({ q, a, isDark = false }) => {
    const [open, setOpen] = useState(false);
    return (
        <div
            className={`rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer ${isDark ? 'lp4-card-dark' : 'lp4-card-light'}`}
            onClick={() => setOpen(!open)}
        >
            <div className="flex items-center justify-between gap-4 p-6">
                <span className={`font-bold text-sm md:text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>{q}</span>
                <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} className="shrink-0">
                    <ChevronDown size={20} className={isDark ? (open ? 'text-amber-400' : 'text-gray-500') : (open ? 'text-orange-600' : 'text-gray-400')} />
                </motion.div>
            </div>
            <motion.div initial={false} animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                <div className={`px-6 pb-6 text-sm leading-relaxed border-t pt-4 ${isDark ? 'text-gray-400 border-white/5' : 'text-gray-600 border-gray-100'}`}>
                    {a}
                </div>
            </motion.div>
        </div>
    );
};

/* ─── Main Component ─── */
const LPErgonomia4: React.FC = () => {
    const prefersReduced = useReducedMotion();

    // ── Language State & Auto Detection ──
    const [currentLang, setCurrentLang] = useState<LPLanguage>('pt-PT');
    useEffect(() => {
        const detected = detectUserLanguage();
        setCurrentLang(detected);
    }, []);

    const handleLanguageChange = (lang: LPLanguage) => {
        setCurrentLang(lang);
        try {
            localStorage.setItem('wtech_lp4_lang', lang);
        } catch (e) {
            // Ignore storage errors
        }
    };

    const t = lpTranslations[currentLang] || lpTranslations['pt-PT'];

    // ── Checkout & Tracking ──
    const KIWIFY_BASE = "https://pay.kiwify.com.br/19v4nIa";
    const [checkoutUrl, setCheckoutUrl] = useState(KIWIFY_BASE);

    useEffect(() => {
        captureTrackingParams();
        setCheckoutUrl(buildCheckoutUrl(KIWIFY_BASE));
    }, []);

    // ── Social Proof Buyer Toast ──
    const [showBuyer, setShowBuyer] = useState(false);
    const [currentBuyer, setCurrentBuyer] = useState<{ name: string; role: string; city: string } | null>(null);

    useEffect(() => {
        const buyersList = t.buyers;
        const i = setInterval(() => {
            const randomBuyer = buyersList[Math.floor(Math.random() * buyersList.length)];
            setCurrentBuyer(randomBuyer);
            setShowBuyer(true);
            setTimeout(() => setShowBuyer(false), 5000);
        }, 22000);
        return () => clearInterval(i);
    }, [currentLang, t]);

    const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

    // Icons map for profiles and concepts
    const profileIcons = [<Bike size={24} key={0} />, <Mountain size={24} key={1} />, <Wrench size={24} key={2} />, <Settings size={24} key={3} />];
    const conceptIcons = [<CircleDot size={22} key={0} />, <Activity size={22} key={1} />, <Move size={22} key={2} />, <Disc size={22} key={3} />];

    /* ── Shared CTA Component ── */
    const CTAButton: React.FC<{ label?: string; className?: string }> = ({
        label = t.hero.ctaPrimary, className = ''
    }) => (
        <motion.button
            onClick={() => scrollTo('cta-final')}
            whileHover={!prefersReduced ? { scale: 1.02 } : undefined}
            whileTap={!prefersReduced ? { scale: 0.98 } : undefined}
            className={`lp4-btn-primary font-bold text-[13px] md:text-[15px] uppercase tracking-widest px-8 md:px-10 py-4 md:py-5 rounded-full flex items-center justify-center gap-3 transition-transform ${className}`}
        >
            {label} <ArrowRight strokeWidth={2.5} size={18} />
        </motion.button>
    );

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: v4Styles }} />

            <div className="lp4 min-h-screen text-gray-900 bg-white overflow-x-hidden selection:bg-amber-400 selection:text-black">

                {/* ══════════════════════════════════════════ */}
                {/* STICKY TOP BANNER & LANGUAGE SWITCHER      */}
                {/* ══════════════════════════════════════════ */}
                <div className="sticky top-0 z-[100] bg-zinc-950/95 backdrop-blur-md py-2 px-4 border-b border-white/10">
                    <div className="container mx-auto flex flex-wrap items-center justify-between gap-2 text-[10px] md:text-xs font-bold uppercase tracking-widest text-amber-500">
                        <div className="flex items-center gap-2">
                            <Flame size={14} className="text-orange-500 animate-pulse" />
                            <span>{t.topBanner.badge}</span>
                            <span className="hidden md:inline text-white/30">•</span>
                            <span className="text-gray-300 hidden sm:inline">{t.topBanner.text}</span>
                        </div>

                        {/* Interactive Language Selector */}
                        <div className="flex items-center gap-1.5 bg-black/60 p-1 rounded-full border border-white/15">
                            <Globe size={13} className="text-amber-400 ml-1.5 shrink-0" />
                            {(['pt-PT', 'es', 'en', 'pt-BR'] as LPLanguage[]).map((langKey) => {
                                const item = lpTranslations[langKey];
                                const active = currentLang === langKey;
                                return (
                                    <button
                                        key={langKey}
                                        onClick={() => handleLanguageChange(langKey)}
                                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                                            active
                                                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-black shadow-sm font-extrabold'
                                                : 'text-gray-400 hover:text-white hover:bg-white/10'
                                        }`}
                                        title={item.langName}
                                    >
                                        <span>{item.flag}</span>
                                        <span>{langKey === 'pt-PT' ? 'PT' : langKey === 'pt-BR' ? 'BR' : langKey.toUpperCase()}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* HERO */}
                <section className="relative lp4-dark min-h-[90vh] flex items-center pt-10 pb-20">
                    <HeroGlow />
                    <div className="absolute inset-0 bg-[url('/hero-desktop-alex.jpg')] bg-cover bg-center opacity-30 mix-blend-luminosity" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent" />
                    
                    <div className="container mx-auto px-6 relative z-10 flex flex-col items-center text-center max-w-4xl pt-10 mt-10">
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-6">
                            <span className="inline-block border border-amber-500/30 bg-amber-500/10 text-amber-400 text-[10px] sm:text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full">
                                {t.hero.badge}
                            </span>
                        </motion.div>

                        <motion.h1 
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
                            className="text-4xl md:text-6xl lg:text-[4.5rem] font-black uppercase leading-[1.05] tracking-tight mb-6"
                        >
                            {t.hero.titlePart1}<br />
                            <span className="lp4-text-gradient">{t.hero.titleHighlight}</span>
                        </motion.h1>

                        <motion.p 
                            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
                            className="text-gray-300 text-lg md:text-xl leading-relaxed mb-6 max-w-2xl font-light"
                        >
                            {t.hero.subtitle}
                        </motion.p>

                        <motion.div 
                            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
                            className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
                        >
                            <CTAButton label={t.hero.ctaPrimary} className="w-full sm:w-auto" />
                            <button onClick={() => scrollTo('quem-somos')} className="w-full sm:w-auto border border-white/20 text-white font-semibold text-sm tracking-widest uppercase px-8 py-4 sm:py-5 rounded-full hover:bg-white/5 transition-colors flex items-center justify-center gap-2 cursor-pointer">
                                {t.hero.ctaSecondary} <ChevronDown size={18} />
                            </button>
                        </motion.div>

                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
                            className="mt-12 flex flex-wrap items-center justify-center gap-6 sm:gap-12 text-sm text-gray-500 font-medium"
                        >
                            <div className="flex items-center gap-2">
                                <Users size={18} className="text-amber-500" />
                                <span>{t.hero.badges.students}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Star size={18} className="text-amber-500" />
                                <span>{t.hero.badges.rating}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <ShieldCheck size={18} className="text-amber-500" />
                                <span>{t.hero.badges.online}</span>
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* VSL VIDEO */}
                <section id="quem-somos" className="py-20 lp4-light relative z-20 -mt-8 rounded-t-[3rem] shadow-[0_-15px_40px_rgba(0,0,0,0.1)] border-t border-gray-100">
                    <div className="container mx-auto px-6 max-w-5xl">
                        <div className="text-center mb-10">
                            <SectionLabel isDark={false}>{t.vsl.label}</SectionLabel>
                            <h2 className="text-3xl md:text-5xl font-black uppercase text-gray-900 tracking-tight">
                                {t.vsl.titlePart1}<span className="text-orange-600">{t.vsl.titleHighlight}</span>
                            </h2>
                        </div>
                        
                        <motion.div 
                            initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                            className="relative w-full aspect-video rounded-3xl overflow-hidden bg-gray-900 shadow-2xl border border-gray-200"
                        >
                            <iframe
                                width="100%" height="100%"
                                src="https://www.youtube.com/embed/rbslvR27uT0?autoplay=0&mute=0&controls=1&rel=0"
                                title="W-Tech Suspensão" frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen className="absolute inset-0 w-full h-full"
                            />
                        </motion.div>
                    </div>
                </section>

                {/* PROFILES */}
                <section className="py-24 lp4-gray border-y border-gray-200">
                    <div className="container mx-auto px-6">
                        <div className="text-center mb-16 max-w-2xl mx-auto">
                            <SectionLabel isDark={false}>{t.profiles.label}</SectionLabel>
                            <h2 className="text-3xl md:text-5xl font-black uppercase text-gray-900 tracking-tight mb-4">
                                {t.profiles.titlePart1}<span className="text-orange-600">{t.profiles.titleHighlight}</span>
                            </h2>
                            <p className="text-gray-600 text-lg">
                                {t.profiles.desc}
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
                            {t.profiles.items.map((p, i) => (
                                <motion.div 
                                    key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                                    className="lp4-card-light p-8 rounded-3xl relative overflow-hidden group"
                                >
                                    <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mb-6 group-hover:bg-orange-600 group-hover:text-white transition-colors duration-300">
                                        {profileIcons[i % profileIcons.length]}
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-orange-600 mb-1 block">{p.tag}</span>
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">{p.title}</h3>
                                    <p className="text-gray-600 text-sm leading-relaxed">{p.pain}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* OFFER & FAQ CTA */}
                <section id="cta-final" className="py-24 lp4-dark relative overflow-hidden">
                    <HeroGlow />
                    <div className="container mx-auto px-6 relative z-10">
                        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 max-w-7xl mx-auto">
                            
                            <div>
                                <SectionLabel isDark={true}>{t.faq.label}</SectionLabel>
                                <h2 className="text-3xl md:text-5xl font-black uppercase text-white tracking-tight mb-8">
                                    {t.faq.titlePart1}<br /><span className="lp4-text-gradient">{t.faq.titleHighlight}</span>
                                </h2>
                                <div className="space-y-4">
                                    {t.faq.items.map((faq, i) => (
                                        <FAQItem key={i} q={faq.q} a={faq.a} isDark={true} />
                                    ))}
                                </div>
                            </div>

                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
                                className="lp4-card-dark rounded-3xl p-8 md:p-12 relative overflow-hidden border border-amber-500/30"
                            >
                                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-600" />

                                <div className="text-center">
                                    <div className="inline-block bg-amber-500/10 text-amber-500 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-6">
                                        {t.offer.badge}
                                    </div>
                                    <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">{t.offer.title}</h3>
                                    <p className="text-gray-400 text-sm mb-8">{t.offer.sub}</p>

                                    <div className="text-gray-500 font-medium text-sm line-through mb-2">{t.offer.strike}</div>
                                    <div className="text-5xl md:text-6xl font-black text-white mb-2 tracking-tight">
                                        <span className="lp4-text-gradient">{t.offer.priceMain}</span>
                                    </div>
                                    <p className="text-amber-500 text-sm font-semibold mb-10">{t.offer.priceAlt}</p>

                                    <a 
                                        href={checkoutUrl}
                                        id="kiwify-checkout-btn-lp-ergonomia4"
                                        className="lp4-btn-primary w-full py-5 rounded-2xl font-black text-[15px] uppercase tracking-widest flex items-center justify-center gap-3 transition-transform hover:scale-[1.02]"
                                    >
                                        {t.offer.cta} <ArrowRight size={20} />
                                    </a>
                                    <p className="text-gray-500 text-xs mt-4">{t.offer.footnote}</p>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </section>

                <footer className="py-12 lp4-gray border-t border-gray-200 text-center">
                    <div className="container mx-auto px-6">
                        <img 
                            src="https://w-techstore.com.br/wp-content/uploads/2025/11/logo-w-tech-branca.png" 
                            alt="W-Tech" 
                            className="h-8 mx-auto mb-6 invert opacity-50 contrast-200" 
                        />
                        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.3em] mb-2">
                            W-Tech Suspensões Europa | Curso Online
                        </p>
                        <p className="text-gray-400 text-[10px] tracking-widest">
                            Todos os direitos reservados © {new Date().getFullYear()}
                        </p>
                    </div>
                </footer>

                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: showBuyer ? 1 : 0, y: showBuyer ? 0 : 50, scale: showBuyer ? 1 : 0.9 }}
                    className="fixed bottom-6 left-6 z-[100] lp4-card-light p-4 rounded-2xl flex items-center gap-4 max-w-sm pointer-events-none"
                >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0 bg-gradient-to-br from-amber-500 to-orange-600">
                        <CheckCircle size={20} strokeWidth={2.5} />
                    </div>
                    <div>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Inscrição Efetuada</p>
                        <p className="text-sm font-bold text-gray-900 leading-tight">
                            {currentBuyer?.name} <span className="font-normal text-orange-600">({currentBuyer?.role})</span>
                        </p>
                        <p className="text-[10px] text-gray-500 mt-1">de {currentBuyer?.city}</p>
                    </div>
                </motion.div>

            </div>
        </>
    );
};

export default LPErgonomia4;
