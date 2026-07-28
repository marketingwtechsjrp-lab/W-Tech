import React, { useMemo, useState } from 'react';
import { Play, X } from 'lucide-react';
import { Marquee } from '../ui/marquee';
import { DEFAULT_COURSE_TESTIMONIALS, getYouTubeId } from '../../lib/testimonials';
import type { SiteLanguage } from '../../lib/siteTranslations';

const labels: Record<SiteLanguage, { watch: string; close: string; title: string }> = {
    'pt-BR': { watch: 'Assistir depoimento', close: 'Fechar vídeo', title: 'Depoimentos reais de alunos' },
    'pt-PT': { watch: 'Ver testemunho', close: 'Fechar vídeo', title: 'Testemunhos reais de alunos' },
    es: { watch: 'Ver testimonio', close: 'Cerrar vídeo', title: 'Testimonios reales de alumnos' },
    en: { watch: 'Watch testimonial', close: 'Close video', title: 'Real student testimonials' },
};

export const VideoTestimonialsMarquee: React.FC<{ language: SiteLanguage }> = ({ language }) => {
    const [activeVideo, setActiveVideo] = useState<string | null>(null);
    const copy = labels[language];
    const testimonials = useMemo(() => {
        const seen = new Set<string>();
        return DEFAULT_COURSE_TESTIMONIALS.flatMap((testimonial) => {
            const id = getYouTubeId(testimonial.videoUrl);
            if (!id || seen.has(id)) return [];
            seen.add(id);
            return [{ ...testimonial, id }];
        });
    }, []);

    return (
        <>
            <Marquee pauseOnHover speed={24} className="py-4">
                {testimonials.map((testimonial) => (
                    <button
                        key={testimonial.id}
                        type="button"
                        onClick={() => setActiveVideo(testimonial.id)}
                        className="group relative aspect-[9/16] h-[390px] shrink-0 cursor-pointer overflow-hidden rounded-3xl border border-white/15 bg-black text-left shadow-[0_24px_70px_rgba(0,0,0,.35)] sm:h-[470px]"
                        aria-label={`${copy.watch}: ${testimonial.name}`}
                    >
                        <img
                            src={`https://i.ytimg.com/vi/${testimonial.id}/maxresdefault.jpg`}
                            onError={(event) => {
                                event.currentTarget.src = `https://i.ytimg.com/vi/${testimonial.id}/hqdefault.jpg`;
                            }}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <span className="absolute inset-0 bg-gradient-to-t from-black via-black/5 to-black/10" />
                        <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 text-white">
                            <span>
                                <span className="block text-lg font-black">{testimonial.name}</span>
                                <span className="mt-1 block text-[10px] font-black uppercase tracking-[0.14em] text-[#e4c46d]">
                                    {copy.watch}
                                </span>
                            </span>
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#e4c46d] text-black shadow-lg transition-transform group-hover:scale-110">
                                <Play size={20} fill="currentColor" className="ml-0.5" />
                            </span>
                        </span>
                    </button>
                ))}
            </Marquee>

            {activeVideo && (
                <div
                    className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 p-4 backdrop-blur"
                    role="dialog"
                    aria-modal="true"
                    aria-label={copy.title}
                    onClick={() => setActiveVideo(null)}
                >
                    <button
                        type="button"
                        onClick={() => setActiveVideo(null)}
                        className="absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-black/70 text-white"
                        aria-label={copy.close}
                    >
                        <X size={22} />
                    </button>
                    <div
                        className="aspect-[9/16] h-[min(82vh,760px)] max-w-full overflow-hidden rounded-2xl border border-white/20 bg-black shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <iframe
                            src={`https://www.youtube-nocookie.com/embed/${activeVideo}?autoplay=1&rel=0&modestbranding=1`}
                            title={copy.title}
                            className="h-full w-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    </div>
                </div>
            )}
        </>
    );
};
