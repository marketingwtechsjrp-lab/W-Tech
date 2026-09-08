import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import {
    Instagram, Facebook, Linkedin, MessageCircle, GraduationCap, ArrowRight,
    Loader2, MapPin, CalendarDays, Globe2, PlayCircle, ShoppingBag, ExternalLink,
    BadgeCheck,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import SEO from '../components/SEO';

interface BioLink {
    id: string;
    title: string;
    url: string;
    type: 'normal' | 'prominent' | 'highlight';
}

interface BioConfig {
    logo_url: string;
    title: string;
    description: string;
    links: BioLink[];
    show_latest_courses: boolean;
    whatsapp: string;
    instagram: string;
    facebook: string;
    linkedin: string;
    custom_html: string;
    background_type?: 'color' | 'image' | 'preset' | 'video';
    background_value?: string;
    background_opacity?: number;
    background_color: string;
    button_color: string;
    text_color: string;
}

interface BioCourse {
    id: string;
    title: string;
    slug?: string | null;
    date: string;
    date_end?: string | null;
    location?: string | null;
    image?: string | null;
    custom_link?: string | null;
}

const courseDateFormatter = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    timeZone: 'UTC',
});

const formatCourseDate = (date: string) => courseDateFormatter.format(new Date(date));

const formatCourseDateRange = (course: BioCourse) => {
    const start = formatCourseDate(course.date);
    if (!course.date_end || course.date_end.split('T')[0] === course.date.split('T')[0]) return start;

    const startDate = new Date(course.date);
    const endDate = new Date(course.date_end);
    const sameMonth = startDate.getUTCMonth() === endDate.getUTCMonth()
        && startDate.getUTCFullYear() === endDate.getUTCFullYear();

    return sameMonth
        ? `${String(startDate.getUTCDate()).padStart(2, '0')} a ${formatCourseDate(course.date_end)}`
        : `${start} a ${formatCourseDate(course.date_end)}`;
};

const getCourseHref = (course: BioCourse) => course.custom_link || `/lp/${course.slug || course.id}`;

const normalizeBioTitle = (title: string) => title.replace(/\bFeramentas\b/gi, 'Ferramentas');

const BIO_BACKGROUNDS = [
    '/images/blog/motocross-action.webp',
    '/images/blog/rally-offroad.webp',
    '/moto-enduro.jpg',
];

const getLinkIcon = (title: string) => {
    const normalized = title.toLocaleLowerCase('pt-BR');
    if (normalized.includes('agenda') || normalized.includes('curso')) return normalized.includes('online') ? PlayCircle : CalendarDays;
    if (normalized.includes('loja') || normalized.includes('produto')) return ShoppingBag;
    if (normalized.includes('site')) return Globe2;
    return ExternalLink;
};

const BioPage = () => {
    // Helper to extract YouTube ID
    const getYouTubeId = (url: string) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const [config, setConfig] = useState<BioConfig | null>(null);
    const [courses, setCourses] = useState<BioCourse[]>([]);
    const [loading, setLoading] = useState(true);
    const [backgroundIndex, setBackgroundIndex] = useState(0);

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduceMotion) return;
        const interval = window.setInterval(() => {
            setBackgroundIndex(current => (current + 1) % BIO_BACKGROUNDS.length);
        }, 7000);
        return () => window.clearInterval(interval);
    }, []);

    const fetchData = async () => {
        // 1. Fetch Config
        const { data: configData } = await supabase.from('SITE_SystemSettings').select('*').eq('key', 'bio_config').maybeSingle();
        
        let parsedConfig: BioConfig | null = null;
        if (configData) {
            try {
                parsedConfig = typeof configData.value === 'string' ? JSON.parse(configData.value) : configData.value;
                setConfig(parsedConfig);
            } catch (e) {
                console.error("Failed to parse bio_config", e);
            }
        }

        // 2. Fetch Courses if needed
        if (parsedConfig?.show_latest_courses) {
            const today = new Date();
            const localDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            const { data: coursesData } = await supabase
                .from('SITE_Courses')
                .select('id, title, slug, date, date_end, location, image, custom_link')
                .eq('status', 'Published')
                .gte('date', localDate)
                .order('date', { ascending: true })
                .limit(3);
            if (coursesData) setCourses(coursesData);
        }

        setLoading(false);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="animate-spin text-wtech-gold" size={40} />
            </div>
        );
    }

    if (!config) {
        return (
            <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
                <h1 className="text-2xl font-bold mb-4">Página de BIO não configurada</h1>
                <p className="text-gray-400">Entre no painel administrativo para configurar sua página de links.</p>
                <a href="/admin" className="mt-8 bg-wtech-gold text-black px-6 py-2 rounded-lg font-bold">Ir para Admin</a>
            </div>
        );
    }

    // `config.title` vem do painel e hoje está vazio em produção: o <h1> da página
    // saía sem texto nenhum no HTML prerenderizado. Título é obrigatório na página,
    // então cai no nome da marca quando o painel não define um.
    const tituloBio = (config.title || '').trim() || 'W-TECH Brasil';

    // Helper to get background style
    const getBackgroundStyle = () => {
        if (config.background_type === 'image') {
            return { backgroundImage: `url(${config.background_value})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: '#000' };
        }
        if (config.background_type === 'video') {
            return { backgroundColor: '#000' };
        }
        if (config.background_type === 'preset') {
            switch (config.background_value) {
                case 'aurora': return { background: 'linear-gradient(45deg, #00cdac 0%, #009688 100%)' };
                case 'ocean': return { background: 'linear-gradient(to top, #1e3c72 0%, #2a5298 100%)' };
                case 'sunset': return { background: 'linear-gradient(to top, #ff0844 0%, #ffb199 100%)' };
                case 'matrix': return { backgroundColor: '#000' }; // Needs custom elements
                case 'neon_pulse': return { backgroundColor: '#050505' };
                case 'particles': return { backgroundColor: '#1a1a2e' };
                default: return { backgroundColor: '#000' };
            }
        }
        // Default color
        return { backgroundColor: config.background_type === 'color' ? config.background_value : config.background_color || '#111' };
    };

    return (
        <div
            className="min-h-screen flex flex-col items-center px-4 pb-8 overflow-hidden relative bg-[#050505] selection:bg-wtech-red selection:text-white"
            style={{ color: config.text_color }}
        >
            <SEO
                title={tituloBio}
                description="Canais oficiais da W-Tech Brasil em um só lugar: cursos de suspensão, loja de peças, rede de oficinas credenciadas e atendimento."
            />

            <div className="fixed inset-x-0 top-0 z-30 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />

            <div className="absolute inset-0 z-0 overflow-hidden bg-[#050505] pointer-events-none" aria-hidden="true">
                <AnimatePresence mode="sync">
                    <motion.img
                        key={BIO_BACKGROUNDS[backgroundIndex]}
                        src={BIO_BACKGROUNDS[backgroundIndex]}
                        alt=""
                        initial={{ opacity: 0, scale: 1.035 }}
                        animate={{ opacity: 1, scale: 1.085 }}
                        exit={{ opacity: 0 }}
                        transition={{ opacity: { duration: 1.6 }, scale: { duration: 8, ease: 'linear' } }}
                        className="absolute inset-0 h-full w-full object-cover object-center"
                    />
                </AnimatePresence>
            </div>

            {/* Overlay for Image/Video Opacity */}
            <div
                className="absolute inset-0 pointer-events-none z-0 bg-black/75"
            />
            <motion.img
                aria-hidden="true"
                src="/logo-wtech-branca.webp"
                alt=""
                animate={{ y: [0, -12, 0], opacity: [0.025, 0.045, 0.025] }}
                transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute left-1/2 top-[42%] z-0 w-[520px] max-w-[135vw] -translate-x-1/2 pointer-events-none"
            />

            {/* Video Background Element */}
            {config.background_type === 'video' && (
                <div className="absolute inset-0 overflow-hidden -z-10">
                    {getYouTubeId(config.background_value || '') ? (
                        <div className="absolute inset-0 pointer-events-none overflow-hidden h-[300%] w-[300%] -left-[100%] -top-[100%]">
                            <iframe
                                className="absolute top-0 left-0 w-full h-full pointer-events-none"
                                src={`https://www.youtube.com/embed/${getYouTubeId(config.background_value || '')}?autoplay=1&mute=1&controls=0&loop=1&playlist=${getYouTubeId(config.background_value || '')}&playsinline=1&showinfo=0&rel=0&iv_load_policy=3&disablekb=1&fs=0`}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                style={{ filter: 'brightness(1.2)' }}
                                title="bg"
                            />
                        </div>
                    ) : (
                        <video 
                            className="absolute inset-0 w-full h-full object-cover"
                            src={config.background_value}
                            autoPlay 
                            loop 
                            muted 
                            playsInline
                        />
                    )}
                </div>
            )}

            {/* Animated Background Layers */}
            {config.background_type === 'preset' && config.background_value === 'matrix' && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20 z-0">
                     <div className="absolute inset-0 bg-[url('https://media.giphy.com/media/oEI9uBYSzLpBK/giphy.gif')] bg-repeat opacity-30 mix-blend-screen"></div>
                </div>
            )}
            
            {config.background_type === 'preset' && config.background_value === 'neon_pulse' && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/20 blur-[100px] rounded-full animate-pulse"></div>
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-wtech-gold to-transparent opacity-50"></div>
                </div>
            )}

            {config.background_type === 'preset' && config.background_value === 'particles' && (
                 <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                     <div className="absolute w-2 h-2 bg-white rounded-full top-10 left-10 animate-bounce opacity-20"></div>
                     <div className="absolute w-1 h-1 bg-white rounded-full top-40 left-80 animate-ping opacity-20"></div>
                     <div className="absolute w-3 h-3 bg-blue-300 rounded-full bottom-20 right-20 animate-pulse opacity-20"></div>
                 </div>
            )}

            <main className="w-full max-w-[480px] flex flex-col items-center relative z-10">
                
                {/* Logo & Profile */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8 mt-14 flex flex-col items-center text-center"
                >
                    <div className="w-28 h-24 flex items-center justify-center mb-4">
                        {config.logo_url ? (
                            <img src={config.logo_url} alt="W-Tech Brasil" className="w-full h-full object-contain drop-shadow-[0_12px_30px_rgba(0,0,0,.65)]" />
                        ) : (
                            <div className="w-24 h-24 bg-gray-800 flex items-center justify-center rounded-xl">
                                <span className="text-4xl font-black text-wtech-gold">{config.title.substring(0, 1)}</span>
                            </div>
                        )}
                    </div>
                    <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5">
                        <BadgeCheck size={12} className="text-white/45" />
                        <span className="text-[9px] font-bold uppercase tracking-[0.26em] text-white/50">W-Tech Brasil · Oficial</span>
                    </div>
                    <h1 className="max-w-sm font-display text-xl font-bold leading-tight tracking-[-0.02em] text-white/90">{normalizeBioTitle(tituloBio)}</h1>
                    {config.description && <p className="mt-3 max-w-xs text-sm font-medium leading-relaxed text-white/60">{config.description}</p>}
                </motion.div>

                {/* Main Links */}
                <div className="w-full space-y-3 mb-10">
                    {config.links.map((link, idx) => {
                        const LinkIcon = getLinkIcon(link.title);
                        return (
                            <motion.a
                                key={link.id}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                initial={{ opacity: 0, y: 14 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.07 }}
                                whileHover={{ y: -2 }}
                                whileTap={{ scale: 0.985 }}
                                className="group relative flex min-h-[60px] w-full items-center gap-3 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-r from-[#9d0a0a]/95 via-[#bd1010]/95 to-[#8c0808]/95 px-4 text-left shadow-[0_12px_36px_rgba(0,0,0,.22)] backdrop-blur-xl transition-all hover:brightness-110 hover:border-white/20"
                            >
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center text-white/70 transition-colors group-hover:text-white">
                                    <LinkIcon size={18} strokeWidth={1.6} />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-semibold tracking-[0.01em] text-white/90">{link.title}</span>
                                </span>
                                <ArrowRight size={15} className="shrink-0 text-white/45 transition-transform group-hover:translate-x-1 group-hover:text-white/80" />
                            </motion.a>
                        );
                    })}
                </div>

                {/* Dynamic Courses */}
                {config.show_latest_courses && courses.length > 0 && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="w-full space-y-3 mb-10"
                    >
                        <div className="mb-4 flex items-end justify-between border-b border-white/10 pb-3">
                            <div>
                                <span className="text-[9px] font-bold uppercase tracking-[0.24em] text-white/35">Agenda técnica</span>
                                <h2 className="mt-1 font-display text-lg font-bold tracking-tight text-white/90">Próximos treinamentos</h2>
                            </div>
                            <span className="mb-1 h-px w-10 bg-gradient-to-r from-white/30 to-transparent" />
                        </div>
                        {courses.map((course, idx) => (
                            <motion.a
                                key={course.id}
                                href={getCourseHref(course)}
                                className="block w-full overflow-hidden bg-black/50 backdrop-blur-xl border border-white/[.09] rounded-xl hover:bg-black/65 hover:border-white/20 transition-all group shadow-[0_14px_38px_rgba(0,0,0,.2)]"
                            >
                                <div className="flex min-h-[92px] items-stretch">
                                    <div className="relative w-24 shrink-0 bg-wtech-gold/15 flex items-center justify-center text-wtech-gold overflow-hidden">
                                        <GraduationCap size={24} />
                                        {course.image && (
                                            <img
                                                src={course.image}
                                                alt={`Imagem do ${course.title}`}
                                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                loading={idx === 0 ? 'eager' : 'lazy'}
                                                onError={(event) => { event.currentTarget.style.display = 'none'; }}
                                            />
                                        )}
                                    </div>
                                    <div className="flex min-w-0 flex-grow items-center gap-3 p-4">
                                        <div className="min-w-0 flex-grow">
                                            <h4 className="text-sm font-bold leading-tight mb-2">{course.title}</h4>
                                            <p className="text-[11px] text-white/65 font-semibold">
                                                {formatCourseDateRange(course)}
                                            </p>
                                            <p className="mt-1 flex items-center gap-1 text-[10px] opacity-65 font-medium">
                                                <MapPin size={10} className="shrink-0" />
                                                <span className="truncate">{course.location || 'Local a definir'}</span>
                                            </p>
                                        </div>
                                        <ArrowRight size={15} className="shrink-0 text-white/20 transition-all group-hover:translate-x-1 group-hover:text-white/55" />
                                    </div>
                                </div>
                            </motion.a>
                        ))}
                    </motion.div>
                )}

                {/* Custom HTML */}
                {config.custom_html && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="w-full mb-10 text-sm font-medium"
                        dangerouslySetInnerHTML={{ __html: config.custom_html }}
                    />
                )}

                {/* Social Footer */}
                <footer className="mt-auto flex flex-col items-center pb-6">
                    <div className="mb-7 flex gap-3">
                        {config.whatsapp && (
                            <a aria-label="WhatsApp" href={`https://wa.me/${config.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[.04] text-white/55 hover:border-wtech-red/50 hover:text-white hover:scale-105 transition-all">
                                <MessageCircle size={19} />
                            </a>
                        )}
                        {config.instagram && (
                            <a aria-label="Instagram" href={config.instagram} target="_blank" rel="noopener noreferrer" className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[.04] text-white/55 hover:border-wtech-red/50 hover:text-white hover:scale-105 transition-all">
                                <Instagram size={19} />
                            </a>
                        )}
                        {config.facebook && (
                            <a aria-label="Facebook" href={config.facebook} target="_blank" rel="noopener noreferrer" className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[.04] text-white/55 hover:border-wtech-red/50 hover:text-white hover:scale-105 transition-all">
                                <Facebook size={19} />
                            </a>
                        )}
                        {config.linkedin && (
                            <a aria-label="LinkedIn" href={config.linkedin} target="_blank" rel="noopener noreferrer" className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[.04] text-white/55 hover:border-wtech-red/50 hover:text-white hover:scale-105 transition-all">
                                <Linkedin size={19} />
                            </a>
                        )}
                    </div>
                    <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-[0.22em] text-white/25">
                        <span className="h-px w-8 bg-white/10" /> W-Tech Performance <span className="h-px w-8 bg-white/10" />
                    </div>
                </footer>

            </main>
        </div>
    );
};

export default BioPage;
