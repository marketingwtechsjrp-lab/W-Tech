import React, { useEffect, useRef, useState } from 'react';
import { useInView, useReducedMotion } from 'framer-motion';
import { ArrowDown, ArrowRight, ChevronDown, Globe, Pause, Play, ShieldCheck } from 'lucide-react';
import { trackEvent } from '../AnalyticsTracker';
import { VSL_VIDEO_URL } from '../../lib/vslVideo';
import { lpTranslations, type LPLanguage } from '../../lib/lpErgonomiaTranslations';
import './immersive-pilot-hero.css';

const copy = {
    'pt-BR': {
        eyebrow: 'Suspensão. SAG. Ergonomia.', title: 'Sua moto.', highlight: 'Acertada.', tagline: 'Para você. Para o terreno.',
        description: 'Domine SAG, cliques e ergonomia para adaptar a regulagem ao seu peso, à sua pilotagem e ao próximo terreno.',
        cta: 'Quero dominar o acerto da minha moto', watch: 'Ver o método na prática', presentation: 'Apresentação do curso',
        access: '12 meses de acesso', guarantee: 'Garantia de 7 dias', explore: 'Sinta o que muda com cada ajuste',
        pause: 'Pausar movimento', resume: 'Ativar movimento', language: 'Idioma da página', close: 'Fechar apresentação',
        methodLabel: 'Conhecimento que você leva para a moto', methodTitle: 'Entender. Ajustar.', methodHighlight: 'Sentir a diferença.',
        methodDescription: 'Um método para conectar o que você sente ao pilotar com o ajuste que a sua moto precisa.',
        steps: [
            { title: 'Entenda o comportamento', description: 'Peso, postura e terreno: aprenda a identificar o que influencia a resposta da moto.' },
            { title: 'Faça o ajuste com critério', description: 'SAG, cliques e ergonomia: entenda o que regular, por quê e como avaliar cada mudança.' },
            { title: 'Leve para o seu terreno', description: 'Teste, perceba a diferença e refine o acerto para a sua maneira de pilotar.' },
        ],
        workshopLabel: 'Para quem entrega a moto na oficina', workshopTitle: 'Cada piloto é diferente. A moto que você entrega também deveria ser.',
        workshopText: 'Transforme peso, postura e tipo de uso em uma entrega personalizada. Uma moto regulada para o cliente que vai pilotar.',
    },
    'pt-PT': {
        eyebrow: 'Suspensão. SAG. Ergonomia.', title: 'A tua mota.', highlight: 'Afinada.', tagline: 'Para ti. Para o terreno.',
        description: 'Domina o SAG, os cliques e a ergonomia para adaptar a afinação ao teu peso, à tua condução e ao próximo terreno.',
        cta: 'Quero dominar a afinação da minha mota', watch: 'Ver o método na prática', presentation: 'Apresentação da formação',
        access: '12 meses de acesso', guarantee: 'Garantia de 7 dias', explore: 'Sente o que muda com cada ajuste',
        pause: 'Pausar movimento', resume: 'Ativar movimento', language: 'Idioma da página', close: 'Fechar apresentação',
        methodLabel: 'Conhecimento que levas para a mota', methodTitle: 'Compreender. Afinar.', methodHighlight: 'Sentir a diferença.',
        methodDescription: 'Um método para relacionar o que sentes ao conduzir com a afinação de que a tua mota precisa.',
        steps: [
            { title: 'Compreende o comportamento', description: 'Peso, postura e terreno: aprende a identificar o que influencia a resposta da mota.' },
            { title: 'Afina com critério', description: 'SAG, cliques e ergonomia: compreende o que afinar, porquê e como avaliar cada alteração.' },
            { title: 'Leva para o teu terreno', description: 'Testa, sente a diferença e aperfeiçoa a afinação para a tua forma de conduzir.' },
        ],
        workshopLabel: 'Para quem entrega a mota na oficina', workshopTitle: 'Cada piloto é diferente. A mota que entregas também deveria ser.',
        workshopText: 'Transforma peso, postura e utilização numa entrega personalizada. Uma mota afinada para o cliente que a vai conduzir.',
    },
    es: {
        eyebrow: 'Suspensión. SAG. Ergonomía.', title: 'Tu moto.', highlight: 'Ajustada.', tagline: 'Para ti. Para el terreno.',
        description: 'Domina SAG, clics y ergonomía para adaptar los ajustes a tu peso, tu pilotaje y el próximo terreno.',
        cta: 'Quiero dominar el ajuste de mi moto', watch: 'Ver el método en acción', presentation: 'Presentación del curso',
        access: '12 meses de acceso', guarantee: 'Garantía de 7 días', explore: 'Siente lo que cambia con cada ajuste',
        pause: 'Pausar movimiento', resume: 'Activar movimiento', language: 'Idioma de la página', close: 'Cerrar presentación',
        methodLabel: 'Conocimiento que llevas a tu moto', methodTitle: 'Entender. Ajustar.', methodHighlight: 'Sentir la diferencia.',
        methodDescription: 'Relaciona lo que sientes al pilotar con el ajuste que necesita tu moto.',
        steps: [
            { title: 'Entiende el comportamiento', description: 'Peso, postura y terreno: identifica qué influye en la respuesta de tu moto.' },
            { title: 'Ajusta con criterio', description: 'SAG, clics y ergonomía: entiende qué ajustar y cómo evaluar cada cambio.' },
            { title: 'Llévalo a tu terreno', description: 'Prueba, siente la diferencia y afina los ajustes para tu forma de pilotar.' },
        ],
        workshopLabel: 'Para quienes trabajan en el taller', workshopTitle: 'Cada piloto es diferente. La moto que entregas también debería serlo.',
        workshopText: 'Ten en cuenta el peso, la postura y el uso para entregar una moto ajustada a cada cliente.',
    },
    en: {
        eyebrow: 'Suspension. SAG. Ergonomics.', title: 'Your bike.', highlight: 'Dialed in.', tagline: 'For you. For the terrain.',
        description: 'Master SAG, clickers and ergonomics to adapt your setup to your weight, riding style and the terrain ahead.',
        cta: 'I want to master my bike’s setup', watch: 'See the method in action', presentation: 'Course presentation',
        access: '12-month access', guarantee: '7-day guarantee', explore: 'Feel what each adjustment changes',
        pause: 'Pause motion', resume: 'Enable motion', language: 'Page language', close: 'Close presentation',
        methodLabel: 'Knowledge you take to your bike', methodTitle: 'Understand. Adjust.', methodHighlight: 'Feel the difference.',
        methodDescription: 'Connect what you feel while riding with the adjustment your bike needs.',
        steps: [
            { title: 'Understand the response', description: 'Weight, posture and terrain: learn what affects how your bike behaves.' },
            { title: 'Adjust with purpose', description: 'SAG, clickers and ergonomics: learn what to adjust and how to evaluate each change.' },
            { title: 'Take it to your terrain', description: 'Test, feel the difference and refine the setup for your riding style.' },
        ],
        workshopLabel: 'For the workshop', workshopTitle: 'Every rider is different. The bike you deliver should be too.',
        workshopText: 'Turn weight, posture and intended use into a personalized setup for the rider who will use it.',
    },
};

const frames = ['entender', 'ajustar', 'testar'];

export const ImmersivePilotHero: React.FC<{
    language: LPLanguage;
    onLanguageChange: (language: LPLanguage) => void;
    onOfferClick: () => void;
    primaryCtaRef: React.RefObject<HTMLButtonElement | null>;
    promise: string;
}> = ({ language, onLanguageChange, onOfferClick, primaryCtaRef, promise }) => {
    const t = copy[language];
    const heroRef = useRef<HTMLElement>(null);
    const loopRef = useRef<HTMLVideoElement>(null);
    const presentationRef = useRef<HTMLVideoElement>(null);
    const milestones = useRef(new Set<number>());
    const inView = useInView(heroRef);
    const reducedMotion = useReducedMotion();
    const [source, setSource] = useState<string>();
    const [paused, setPaused] = useState(false);
    const [presentationPlaying, setPresentationPlaying] = useState(false);
    const [presentationStarted, setPresentationStarted] = useState(false);

    useEffect(() => {
        const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
        if (reducedMotion || connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType || '')) {
            setSource(undefined);
            return;
        }
        // The poster paints first. Only one compact loop is requested for this viewport.
        const timer = window.setTimeout(() => {
            setSource(`/videos/hero-piloto/acerto-${window.innerWidth < 768 ? 'mobile' : 'desktop'}.mp4`);
        }, 300);
        return () => window.clearTimeout(timer);
    }, [reducedMotion]);

    useEffect(() => {
        const video = loopRef.current;
        if (!video) return;
        const sync = () => {
            if (!source || !inView || paused || presentationPlaying || document.hidden) video.pause();
            else video.play().catch(() => undefined);
        };
        sync();
        document.addEventListener('visibilitychange', sync);
        return () => document.removeEventListener('visibilitychange', sync);
    }, [source, inView, paused, presentationPlaying]);

    const playPresentation = () => {
        presentationRef.current?.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'center' });
        presentationRef.current?.play().catch(() => undefined);
    };

    return (
        <>
            <section ref={heroRef} className="pilot-hero" aria-labelledby="pilot-hero-title">
                <div className="pilot-hero-scene" aria-hidden="true">
                    <img src="/images/hero-piloto/poster.webp" alt="" width={1440} height={630} fetchPriority="high" className="pilot-hero-poster" />
                    {source && <video ref={loopRef} data-hero-loop src={source} muted loop playsInline preload="none" className="pilot-hero-film" tabIndex={-1} onError={() => setSource(undefined)} />}
                </div>
                <div className="pilot-hero-shade" />

                <header className="pilot-hero-header">
                    <img src="/logo-wtech-branca.webp" alt="W-Tech" width={112} height={30} />
                    <span className="pilot-header-caption">W-Tech · Off-Road</span>
                    <label className="pilot-language">
                        <Globe size={14} aria-hidden="true" />
                        <span className="sr-only">{t.language}</span>
                        <select value={language} onChange={(event) => onLanguageChange(event.target.value as LPLanguage)}>
                            {(['pt-BR', 'pt-PT', 'es', 'en'] as LPLanguage[]).map((lang) => <option key={lang} value={lang}>{lpTranslations[lang].flag} {lang === 'pt-BR' ? 'BR' : lang === 'pt-PT' ? 'PT' : lang.toUpperCase()}</option>)}
                        </select>
                        <ChevronDown size={12} aria-hidden="true" />
                    </label>
                </header>

                <div className="pilot-hero-content">
                    <p className="pilot-eyebrow"><span />{t.eyebrow}</p>
                    <h1 id="pilot-hero-title">{t.title}<br /><span>{t.highlight}</span></h1>
                    <p className="pilot-hero-tagline">{t.tagline}</p>
                    <p className="pilot-hero-promise" data-course-promise>{promise}</p>
                    <p className="pilot-hero-description">{t.description}</p>
                    <div className="pilot-hero-actions">
                        <button ref={primaryCtaRef} type="button" data-offer-cta="hero" className="pilot-hero-cta" onClick={onOfferClick}>
                            <span>{t.cta}</span><ArrowRight size={20} aria-hidden="true" />
                        </button>
                        <button type="button" data-open-presentation className="pilot-hero-watch" onClick={playPresentation}>
                            <span><Play size={13} fill="currentColor" /></span>{t.watch}
                        </button>
                    </div>
                    <div className="pilot-hero-trust"><span>{t.access}</span><span><ShieldCheck size={14} />{t.guarantee}</span></div>
                </div>

                {source && <button type="button" className="pilot-motion-toggle" onClick={() => setPaused(!paused)} aria-label={paused ? t.resume : t.pause} aria-pressed={paused}>{paused ? <Play size={15} /> : <Pause size={15} />}</button>}
                <a href="#metodo-piloto" className="pilot-hero-explore">{t.explore}<ArrowDown size={15} /></a>
                <div className="pilot-hero-index" aria-hidden="true"><span>01 / W-TECH</span><span>SAG · CLICKS · SETUP</span></div>
            </section>

            <section id="apresentacao-piloto" className="pilot-inline-presentation" aria-labelledby="pilot-presentation-title">
                <div className="pilot-inline-heading"><p className="pilot-eyebrow">{t.presentation}</p><h2 id="pilot-presentation-title">{t.watch}</h2></div>
                <div className="pilot-inline-player">
                    <video ref={presentationRef} data-course-presentation aria-label={t.presentation} src={VSL_VIDEO_URL} poster="/images/vsl-thumbnail.webp" controls={presentationStarted} playsInline preload="none" onPlay={() => { setPresentationStarted(true); setPresentationPlaying(true); trackEvent('VSL', 'vsl_play', 'Curso Piloto'); }} onPause={() => setPresentationPlaying(false)} onEnded={() => setPresentationPlaying(false)} onTimeUpdate={(event) => {
                        const video = event.currentTarget;
                        if (!(video.duration > 0)) return;
                        const percent = video.currentTime / video.duration * 100;
                        for (const milestone of [25, 50, 75, 100]) {
                            if (percent >= milestone && !milestones.current.has(milestone)) { milestones.current.add(milestone); trackEvent('VSL', `vsl_${milestone}`, 'Curso Piloto'); }
                        }
                    }} />
                    {!presentationStarted && <button type="button" className="pilot-inline-play" aria-label={t.watch} onClick={playPresentation}><span><Play size={32} fill="currentColor" /></span><strong>{t.watch}</strong></button>}
                </div>
            </section>

            <section id="metodo-piloto" className="pilot-method" aria-labelledby="pilot-method-title">
                <div className="pilot-method-heading">
                    <p className="pilot-eyebrow">{t.methodLabel}</p>
                    <h2 id="pilot-method-title">{t.methodTitle}<br /><span>{t.methodHighlight}</span></h2>
                    <p>{t.methodDescription}</p>
                </div>
                <div className="pilot-method-grid">
                    {t.steps.map((step, i) => <article className="pilot-method-card" key={frames[i]}>
                        <div className="pilot-method-image"><img src={`/images/hero-piloto/${frames[i]}.webp`} width={960} height={420} alt={step.title} loading="lazy" /><span>0{i + 1}</span></div>
                        <h3>{step.title}</h3><p>{step.description}</p>
                    </article>)}
                </div>
                <div className="pilot-workshop-note"><p className="pilot-eyebrow">{t.workshopLabel}</p><h3>{t.workshopTitle}</h3><p>{t.workshopText}</p></div>
            </section>


        </>
    );
};
