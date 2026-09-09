import React, { useEffect, useRef, useState } from 'react';
import { useInView } from 'framer-motion';
import { ArrowRight, MessageCircle, Pause, Play, X } from 'lucide-react';
import { DEFAULT_COURSE_TESTIMONIALS, getYouTubeId } from '../../lib/testimonials';
import { COURSE_WHATSAPP_TESTIMONIALS, type CourseWhatsAppTestimonial } from '../../lib/courseSocialProof';
import type { LPLanguage } from '../../lib/lpErgonomiaTranslations';
import './course-testimonials.css';

const copy = {
    'pt-BR': { label: 'Experiências reais · W-Tech', title: 'Quem viveu a formação', highlight: 'conta melhor.', description: 'Depoimentos de alunos das formações presenciais W-Tech, incluindo Lisboa. Conheça a experiência deles com o ensino e a prática da nossa equipe.', watch: 'Assistir depoimento', lisboa: 'Formação presencial · Lisboa', course: 'Formação presencial · W-Tech', video: 'Depoimento em vídeo', whatsapp: 'Conversas da nossa comunidade', whatsappNote: 'Relatos compartilhados por alunos no WhatsApp.', pause: 'Pausar carrosséis', resume: 'Continuar carrosséis', close: 'Fechar depoimento', cta: 'Quero aprender com a W-Tech', open: 'Ampliar relato' },
    'pt-PT': { label: 'Experiências reais · W-Tech', title: 'Quem viveu a formação', highlight: 'conta melhor.', description: 'Testemunhos de alunos das formações presenciais W-Tech, incluindo Lisboa. Conhece a experiência deles com o ensino e a prática da nossa equipa.', watch: 'Ver testemunho', lisboa: 'Formação presencial · Lisboa', course: 'Formação presencial · W-Tech', video: 'Testemunho em vídeo', whatsapp: 'Conversas da nossa comunidade', whatsappNote: 'Relatos partilhados por alunos no WhatsApp.', pause: 'Pausar carrosséis', resume: 'Continuar carrosséis', close: 'Fechar testemunho', cta: 'Quero aprender com a W-Tech', open: 'Ampliar relato' },
    es: { label: 'Experiencias reales · W-Tech', title: 'Quienes vivieron la formación', highlight: 'lo cuentan mejor.', description: 'Testimonios de alumnos de las formaciones presenciales W-Tech, incluida Lisboa. Conoce su experiencia con la enseñanza y la práctica de nuestro equipo.', watch: 'Ver testimonio', lisboa: 'Formación presencial · Lisboa', course: 'Formación presencial · W-Tech', video: 'Testimonio en vídeo', whatsapp: 'Conversaciones de nuestra comunidad', whatsappNote: 'Experiencias compartidas por alumnos en WhatsApp.', pause: 'Pausar carruseles', resume: 'Continuar carruseles', close: 'Cerrar testimonio', cta: 'Quiero aprender con W-Tech', open: 'Ampliar mensaje' },
    en: { label: 'Real experiences · W-Tech', title: 'Hear from those', highlight: 'who were there.', description: 'Testimonials from W-Tech in-person training, including Lisbon. Hear about their experience learning and practicing with our team.', watch: 'Watch testimonial', lisboa: 'In-person training · Lisbon', course: 'In-person training · W-Tech', video: 'Video testimonial', whatsapp: 'Conversations from our community', whatsappNote: 'Experiences shared by students on WhatsApp.', pause: 'Pause carousels', resume: 'Resume carousels', close: 'Close testimonial', cta: 'I want to learn with W-Tech', open: 'Enlarge message' },
};

type VideoStory = { id: string; src: string; poster: string; origin: 'lisboa' | 'course'; youtube?: string };
const seen = new Set<string>();
const videoStories: VideoStory[] = [
    { id: 'lisboa-1', src: '/videos/depoimentos_1.mp4', poster: '/images/testimonials/lisboa-1.webp', origin: 'lisboa' },
    { id: 'lisboa-2', src: '/videos/depoimentos_2.mp4', poster: '/images/testimonials/lisboa-2.webp', origin: 'lisboa' },
    ...DEFAULT_COURSE_TESTIMONIALS.flatMap((item): VideoStory[] => {
        const id = getYouTubeId(item.videoUrl);
        if (!id || seen.has(id)) return [];
        seen.add(id);
        return [{ id, src: item.videoUrl!, poster: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, origin: 'course', youtube: id }];
    }),
];

type ActiveStory = { kind: 'video'; item: VideoStory } | { kind: 'image'; item: CourseWhatsAppTestimonial };

const StoryRail: React.FC<{
    reverse?: boolean;
    paused: boolean;
    label: string;
    children: (duplicate: boolean) => React.ReactNode;
}> = ({ reverse = false, paused, label, children }) => (
    <div className="course-story-rail" role="region" aria-label={label} data-reverse={reverse} data-paused={paused}>
        <div className="course-story-track">
            <div className="course-story-group">{children(false)}</div>
            <div className="course-story-group" aria-hidden="true">{children(true)}</div>
        </div>
    </div>
);

export const CourseTestimonials: React.FC<{
    language: LPLanguage;
    onOfferClick: () => void;
    onMediaOpen?: () => void;
    whatsappTestimonials?: CourseWhatsAppTestimonial[];
}> = ({ language, onOfferClick, onMediaOpen, whatsappTestimonials = COURSE_WHATSAPP_TESTIMONIALS }) => {
    const t = copy[language];
    const sectionRef = useRef<HTMLElement>(null);
    const dialogRef = useRef<HTMLDialogElement>(null);
    const inView = useInView(sectionRef, { margin: '100px' });
    const [paused, setPaused] = useState(false);
    const [active, setActive] = useState<ActiveStory | null>(null);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog || !active) return;
        dialog.showModal();
        const overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            dialog.close();
            document.body.style.overflow = overflow;
        };
    }, [active]);

    const open = (story: ActiveStory) => {
        onMediaOpen?.();
        setActive(story);
    };

    return (
        <section ref={sectionRef} id="depoimentos" className="relative overflow-hidden border-y border-white/5 bg-[#080909] py-20 md:py-28" aria-labelledby="course-testimonials-title">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.08),transparent_70%)]" />
            <div className="relative mx-auto max-w-4xl px-6 text-center">
                <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.28em] text-wtech-gold">{t.label}</p>
                <h2 id="course-testimonials-title" className="mt-5 text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.05]">
                    {t.title}<br /><span className="text-wtech-gold">{t.highlight}</span>
                </h2>
                <p className="mx-auto mt-6 max-w-2xl text-sm sm:text-base leading-relaxed text-gray-400">{t.description}</p>
                <button type="button" onClick={() => setPaused(!paused)} aria-pressed={paused} className="mt-6 mb-6 inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 px-5 text-xs text-gray-300 hover:border-wtech-gold/50 hover:text-white">
                    {paused ? <Play size={13} /> : <Pause size={13} />} {paused ? t.resume : t.pause}
                </button>
            </div>

            <StoryRail paused={paused || !!active || !inView} label={t.video}>
                {(duplicate) => videoStories.map((item, i) => (
                    <button key={item.id} type="button" tabIndex={duplicate ? -1 : 0} onClick={() => open({ kind: 'video', item })} aria-label={`${t.watch}: ${t[item.origin]}, ${i + 1}`} className="course-video-card group">
                        <img src={item.poster} alt="" loading="lazy" width={540} height={960} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                        <span className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/20" />
                        <span className="absolute left-4 top-4 rounded-full border border-white/20 bg-black/60 px-3 py-2 text-[9px] uppercase tracking-[0.16em] text-white">{t[item.origin]}</span>
                        <span className="absolute inset-0 flex items-center justify-center">
                            <span className="flex h-16 w-16 items-center justify-center rounded-full border border-white/40 bg-black/25 text-white backdrop-blur-sm transition group-hover:scale-110 group-hover:bg-wtech-gold group-hover:text-black"><Play size={23} fill="currentColor" className="ml-1" /></span>
                        </span>
                        <span className="absolute inset-x-0 bottom-0 p-5 text-left">
                            <span className="block text-[10px] uppercase tracking-[0.22em] text-wtech-gold">W-Tech · {String(i + 1).padStart(2, '0')}</span>
                            <span className="mt-2 flex items-center justify-between text-base font-bold text-white">{t.watch}<ArrowRight size={18} /></span>
                        </span>
                    </button>
                ))}
            </StoryRail>

            {whatsappTestimonials.length > 0 && (
                <div className="mt-12" data-whatsapp-testimonials>
                    <div className="mb-6 px-6 text-center">
                        <h3 className="flex items-center justify-center gap-2 text-lg font-bold"><MessageCircle size={18} className="text-wtech-gold" />{t.whatsapp}</h3>
                        <p className="mt-2 text-sm text-gray-400">{t.whatsappNote}</p>
                    </div>
                    <StoryRail reverse paused={paused || !!active || !inView} label={t.whatsapp}>
                        {(duplicate) => whatsappTestimonials.map((item) => (
                            <button key={item.id} type="button" tabIndex={duplicate ? -1 : 0} aria-label={`${t.open}: ${item.caption}`} onClick={() => open({ kind: 'image', item })} className="course-whatsapp-card">
                                <img src={item.src} alt={item.alt} loading="lazy" className="h-72 w-full rounded-xl object-contain bg-[#111b21]" />
                                <span className="mt-4 block text-left text-xs leading-relaxed text-gray-300">{item.caption}</span>
                            </button>
                        ))}
                    </StoryRail>
                </div>
            )}

            <div className="mt-10 px-6 text-center">
                <button type="button" onClick={onOfferClick} className="inline-flex min-h-14 items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-wtech-gold to-amber-600 px-7 py-4 text-sm font-black text-black hover:brightness-110 transition">
                    {t.cta}<ArrowRight size={18} />
                </button>
            </div>

            <dialog ref={dialogRef} className="course-story-dialog" aria-label={active?.kind === 'image' ? t.whatsapp : t.video} onCancel={() => setActive(null)} onClose={() => setActive(null)} onClick={(event) => { if (event.target === event.currentTarget) setActive(null); }}>
                {active && (
                    <div className="course-story-modal">
                        <button type="button" autoFocus onClick={() => setActive(null)} aria-label={t.close} className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-black/80 text-white"><X size={22} /></button>
                        {active.kind === 'image' ? (
                            <img src={active.item.src} alt={active.item.alt} className="max-h-[82dvh] max-w-full object-contain" />
                        ) : active.item.youtube ? (
                            <iframe src={`https://www.youtube-nocookie.com/embed/${active.item.youtube}?autoplay=1&rel=0`} title={t.video} className="course-story-player" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
                        ) : (
                            <video src={active.item.src} poster={active.item.poster} className="course-story-player" controls autoPlay playsInline preload="metadata" aria-label={t.video} />
                        )}
                    </div>
                )}
            </dialog>
        </section>
    );
};
