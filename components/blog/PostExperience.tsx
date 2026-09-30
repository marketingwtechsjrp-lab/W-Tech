import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import { useNavigate } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowDown, ArrowLeft, Calendar, Clock, Moon, Pause, Play, ShieldCheck, Sun, User, X } from 'lucide-react';
import { CourseLink } from './PostConversion';
import { CourseBonusMaterials } from '../lp/CourseBonusMaterials';
import { CourseTestimonials } from '../lp/CourseTestimonials';
import { useBillingRegion } from '../../hooks/useBillingRegion';
import { getCoursePrice } from '../../lib/coursePricing';
import { lpTranslations } from '../../lib/lpErgonomiaTranslations';
import { VSL_VIDEO_URL } from '../../lib/vslVideo';
import { formatDateLocal } from '../../lib/utils';
import { trackGoogleEvent } from '../../lib/googleTracking';
import './post-experience.css';

export function CoursePresentation({ placement, className = 'post-film-button' }: { placement: string; className?: string }) {
  const [open, setOpen] = useState(false);
  return <Dialog.Root open={open} onOpenChange={setOpen}>
    <Dialog.Trigger asChild><button className={className} onClick={() => trackGoogleEvent('blog_course_video_open', { placement })}><Play size={17} />Ver o método na prática</button></Dialog.Trigger>
    <Dialog.Portal><Dialog.Overlay className="post-modal-overlay" /><Dialog.Content className="post-video-dialog">
      <Dialog.Close className="post-modal-close" aria-label="Fechar apresentação"><X size={20} /></Dialog.Close>
      <Dialog.Title>O método W-Tech, na prática.</Dialog.Title>
      <Dialog.Description>Apresentação do curso online de regulagem de suspensão para pilotos.</Dialog.Description>
      <video src={VSL_VIDEO_URL} poster="/images/vsl-thumbnail.webp" controls playsInline preload="none" aria-label="Apresentação do curso online" onPlay={() => trackGoogleEvent('blog_course_video_play', { placement })} />
      <CourseLink placement={`video_${placement}`}>Quero aprender com a W-Tech</CourseLink>
    </Dialog.Content></Dialog.Portal>
  </Dialog.Root>;
}

export function PostHero({ title, excerpt, category, author, date, readTime, audio }: { title: string; excerpt: string; category: string; author: string; date: string; readTime: number; audio: React.ReactNode }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [source, setSource] = useState<string>();
  const [paused, setPaused] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const hero = useRef<HTMLElement>(null);
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const sync = () => {
      if (reduce.matches || connection?.saveData) setSource(undefined);
      else setSource(`/videos/hero-piloto/acerto-${innerWidth < 768 ? 'mobile' : 'desktop'}.mp4`);
    };
    sync(); reduce.addEventListener('change', sync);
    return () => reduce.removeEventListener('change', sync);
  }, []);
  useEffect(() => {
    let visible = true;
    const sync = () => { if (!visible || document.hidden || paused) video.current?.pause(); else video.current?.play().catch(() => undefined); };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
    if (hero.current) observer.observe(hero.current);
    document.addEventListener('visibilitychange', sync); sync();
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', sync); };
  }, [source, paused]);
  return <header className="post-cinema" ref={hero}>
    <div className="post-cinema-media" aria-hidden="true"><img src="/images/hero-piloto/poster.webp" alt="" width="1440" height="630" fetchPriority="high" />{source && <video ref={video} src={source} muted loop playsInline preload="none" tabIndex={-1} onError={() => setSource(undefined)} />}</div>
    <div className="post-cinema-shade" />
    <div className="post-cinema-inner">
      <div className="post-cinema-toolbar"><a href="/blog" className="post-cinema-back"><ArrowLeft size={15} /> W-Tech Journal</a><div className="post-cinema-controls"><button onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')} aria-label={resolvedTheme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}>{resolvedTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}<span>{resolvedTheme === 'dark' ? 'Modo claro' : 'Modo escuro'}</span></button>{source && <button onClick={() => setPaused(!paused)} aria-label={paused ? 'Ativar movimento' : 'Pausar movimento'} aria-pressed={paused}>{paused ? <Play size={15} /> : <Pause size={15} />}</button>}</div></div>
      <div className="post-cinema-grid"><div className="post-cinema-copy">
        <span className="post-cinema-kicker"><i /> CONHECIMENTO QUE VIRA ACERTO · {category === 'WordPress' ? 'GUIA W-TECH' : category}</span>
        <h1>{title}</h1><p>{excerpt}</p>
        <div className="post-cinema-meta"><span><User size={14} />{author}</span><span><Clock size={14} />{readTime} min</span><span><Calendar size={14} />{formatDateLocal(date)}</span></div>
        <div className="post-cinema-actions"><a href="#post-reading" className="post-read-button">Explorar o artigo<ArrowDown size={17} /></a>{audio}</div>
      </div><aside className="post-hero-offer"><div className="post-hero-offer-portrait"><img src="/images/hero-piloto/entender.webp" alt="Alex Crepaldi com uma moto na oficina W-Tech" width="960" height="420" /><span><Play size={13} /> CURSO ONLINE · W-TECH</span></div><div className="post-hero-offer-body"><span className="post-cinema-kicker">PARA VOCÊ. PARA O TERRENO.</span><h2>Sua moto.<br /><em>Acertada.</em></h2><p>Entenda o que sua moto está dizendo e aprenda a regular a suspensão para a sua pilotagem.</p><CourseLink placement="hero_card">Quero dominar o acerto</CourseLink><CoursePresentation placement="hero" /><div className="post-hero-offer-trust"><ShieldCheck size={14} />12 meses de acesso · Garantia de 7 dias</div></div></aside></div>
      <div className="post-cinema-bottom"><span>ENTENDER <b>01</b></span><span>AJUSTAR <b>02</b></span><span>SENTIR A DIFERENÇA <b>03</b></span><a href="#post-reading">COMECE PELO CONHECIMENTO<ArrowDown size={14} /></a></div>
    </div>
  </header>;
}

export function PostCourseExperience() {
  const navigate = useNavigate();
  const region = useBillingRegion();
  const go = () => { trackGoogleEvent('blog_course_click', { placement: 'landing_resources' }); navigate('/curso-suspensao-piloto'); };
  return <div className="post-lp-resources">
    <section className="post-method-section"><div className="post-resource-shell"><div className="post-section-heading"><span className="post-cinema-kicker">O PRÓXIMO PASSO É NA SUA MOTO</span><h2>Você sente o problema.<br /><em>Aprenda a encontrar o acerto.</em></h2><p>O artigo explica. O curso mostra como colocar em prática, com uma sequência de ajustes que você consegue acompanhar.</p></div><div className="post-method-grid">{[
      { image: 'entender', label: '01 · ENTENDER', title: 'Leia o comportamento.', text: 'Peso, postura e terreno. Entenda o que influencia a resposta da moto.' },
      { image: 'ajustar', label: '02 · AJUSTAR', title: 'Regule com critério.', text: 'SAG, cliques e ergonomia. Saiba o que mudar e como avaliar cada ajuste.' },
      { image: 'testar', label: '03 · TESTAR', title: 'Sinta no seu terreno.', text: 'Teste uma alteração por vez e refine o acerto para sua pilotagem.' },
    ].map(step => <div className="post-method-card" key={step.image}><img src={`/images/hero-piloto/${step.image}.webp`} alt={step.title} loading="lazy" width="960" height="420" /><div><span>{step.label}</span><h3>{step.title}</h3><p>{step.text}</p></div></div>)}</div></div></section>
    <section className="post-teachers-section"><div className="post-resource-shell post-teachers-grid"><div className="post-teacher-photos"><img src="/images/alex-webp.webp" alt="Alex Crepaldi, instrutor do curso" loading="lazy" width="600" height="800" /><img src="/paschoalin.webp" alt="Rafa Paschoalin, piloto da demonstração prática" loading="lazy" width="600" height="800" /><span>TÉCNICA + PILOTAGEM REAL</span></div><div><span className="post-cinema-kicker">APRENDA COM QUEM ENSINA E PILOTA</span><h2>Conhecimento técnico.<br /><em>Aplicação na pista.</em></h2><p><strong>Alex Crepaldi</strong> ensina os fundamentos do acerto. <strong>Rafa Paschoalin</strong> demonstra, na prática, como a moto responde aos ajustes.</p><p>Uma sequência que conecta o que você estuda ao que sente pilotando: entender, ajustar e testar.</p><CoursePresentation placement="instructors" /><CourseLink placement="instructors">Conhecer o curso completo</CourseLink></div></div></section>
    <section className="post-modules-section"><div className="post-resource-shell"><div className="post-section-heading"><span className="post-cinema-kicker">SEU CAMINHO PARA DOMINAR A REGULAGEM</span><h2>11 módulos.<br /><em>Um método completo.</em></h2><p>Do primeiro ajuste ao teste na pista. O programa do curso online, organizado para você aprender no seu ritmo.</p></div><div className="post-module-art"><img src="/images/modulos/CARDS-KWIFY-CURSO-AVANCADO.webp" alt="Material visual do curso W-Tech" loading="lazy" width="600" height="800" /><img src="/images/modulos/CARDS-KWIFY-CURSO-AVANCADO-3.webp" alt="Material visual das aulas W-Tech" loading="lazy" width="600" height="800" /><img src="/images/modulos/CARDS-KWIFY-CURSO-AVANCADO-4.webp" alt="Material visual do programa W-Tech" loading="lazy" width="600" height="800" /></div><div className="post-module-list">{lpTranslations['pt-BR'].modules.items.map(item => <div key={item.num}><span>{item.num}</span><div><h3>{item.title}</h3><p>{item.desc}</p></div></div>)}</div><CourseLink placement="modules">Quero seguir esse método</CourseLink></div></section>
    <CourseBonusMaterials language="pt-BR" price={getCoursePrice(region)} onOfferClick={go} />
    <CourseTestimonials language="pt-BR" onOfferClick={go} />
    <section className="post-final-offer"><img src="/images/hero-piloto/testar.webp" alt="" loading="lazy" width="960" height="420" /><div><span className="post-cinema-kicker">SUA PRÓXIMA PILOTAGEM PODE SER DIFERENTE</span><h2>Conheça sua moto.<br /><em>Assuma o acerto.</em></h2><p>Curso online com 11 módulos, materiais de apoio e 12 meses de acesso. Veja o programa e as condições na página oficial.</p><CourseLink placement="final_offer">Quero acertar minha suspensão</CourseLink><span className="post-final-trust"><ShieldCheck size={16} />Garantia de 7 dias para conhecer o curso.</span></div></section>
  </div>;
}
