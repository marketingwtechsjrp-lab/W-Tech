import React, { useState } from 'react';
import { ArrowRight, Calendar, Clock, MapPin, Users, Play, X, Star, Quote, Gauge, Flag, Trophy, AlertTriangle, Navigation } from 'lucide-react';
import { useLandingPage } from '../hooks/useLandingPage';
import LPEnrollForm from '../components/lp/LPEnrollForm';
import { LPInstructorPhoto } from '../components/lp/LPInstructorPhoto';
import { FakeSignupAlert } from '../components/FakeSignupAlert';
import { useSettings } from '../context/SettingsContext';
import { formatDateLocal, sanitizeHtml } from '../lib/utils';

/**
 * V6 — "Carbon Racing" (DARK · cinematográfico de pista)
 * Textura fibra de carbono, faixa racing dourada diagonal, stats de
 * autoridade, módulos em pit-lane (timeline vertical). Persuasão por
 * autoridade + performance. Preço só com checkout automático.
 */
const CARBON = "https://www.transparenttextures.com/patterns/carbon-fibre.png";

const LandingPageViewerV6: React.FC = () => {
    const { get } = useSettings();
    const systemLogo = get('logo_url');
    const whatsappGlobal = get('whatsapp_phone');
    const {
        lp, loading, spotsLeft, form, setForm, paymentType, setPaymentType,
        submitted, setSubmitted, showFloatingCTA, isFullOrDone, checkoutAtivo,
        handleSubmit, scrollToForm
    } = useLandingPage('v6');
    const [activeVideo, setActiveVideo] = useState<string | null>(null);

    if (loading) {
        return <div className="h-screen flex items-center justify-center bg-[#08090B]"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-wtech-gold" /></div>;
    }
    if (!lp) {
        return <div className="h-screen flex items-center justify-center bg-[#08090B] text-white font-bold">Página não encontrada.</div>;
    }

    const mapQuery = lp.course?.address ? `${lp.course.address}, ${lp.course.city}` : lp.course?.location || 'São Paulo';
    const whatsappNumber = lp.whatsappNumber || whatsappGlobal;
    const waLink = whatsappNumber ? `https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! Tenho interesse no curso ${lp.title}`)}` : '#';

    const racingStripe = (
        <div className="h-2 w-full bg-[repeating-linear-gradient(45deg,#D4AF37_0,#D4AF37_18px,#08090B_18px,#08090B_36px)]" />
    );

    return (
        <div className="min-h-screen bg-[#08090B] text-white font-sans selection:bg-wtech-gold selection:text-black overflow-x-hidden" style={{ backgroundImage: `url('${CARBON}')` }}>
            {lp.fakeAlertsEnabled && <FakeSignupAlert courseName={lp.title} />}

            {/* Navbar */}
            <header className="fixed top-0 left-0 w-full z-50 bg-[#08090B]/90 backdrop-blur-md border-b border-wtech-gold/30">
                <div className="container mx-auto px-6 h-18 py-3 flex items-center justify-between">
                    {systemLogo
                        ? <img src={systemLogo} alt="W-Tech" className="h-10 object-contain" />
                        : <span className="font-black text-xl italic tracking-tight">W-TECH <span className="text-wtech-gold">RACING TECH</span></span>}
                    <button onClick={scrollToForm} className="bg-wtech-gold text-black px-6 py-2.5 rounded-sm font-black text-xs uppercase tracking-[0.18em] skew-x-[-8deg] hover:bg-yellow-400 transition-colors shadow-[0_0_24px_rgba(212,175,55,0.35)]">
                        <span className="inline-block skew-x-[8deg]">{isFullOrDone ? 'Lista de Espera' : 'Acelerar Inscrição'}</span>
                    </button>
                </div>
            </header>

            {/* HERO */}
            <section className="relative min-h-[92vh] flex items-center pt-28 pb-16 overflow-hidden">
                <div className="absolute inset-0 z-0">
                    {lp.heroImage && <img src={lp.heroImage} alt="" className="w-full h-full object-cover opacity-30" />}
                    <div className="absolute inset-0 bg-gradient-to-r from-[#08090B] via-[#08090B]/85 to-[#08090B]/40" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#08090B] to-transparent" />
                </div>
                <div className="container mx-auto px-6 relative z-10">
                    <div className="max-w-3xl space-y-7">
                        <div className="inline-flex items-center gap-2 border border-wtech-gold/60 bg-black/60 text-wtech-gold px-4 py-1.5 rounded-sm text-[11px] font-black uppercase tracking-[0.25em]">
                            <Flag size={13} /> Grid aberto · {lp.course?.city || 'Brasil'}
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black uppercase italic leading-[0.95] tracking-tight">
                            {lp.title}
                        </h1>
                        <p className="text-lg md:text-xl text-white/65 leading-relaxed max-w-xl">
                            {lp.subtitle}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 pt-2">
                            <button onClick={scrollToForm} className="bg-wtech-gold text-black px-10 py-5 rounded-sm font-black text-lg uppercase tracking-wider skew-x-[-8deg] hover:bg-yellow-400 hover:shadow-[0_0_40px_rgba(212,175,55,0.5)] transition-all">
                                <span className="inline-flex items-center gap-3 skew-x-[8deg]">{isFullOrDone ? 'Entrar na Lista' : 'Garantir Meu Grid'} <ArrowRight strokeWidth={3} /></span>
                            </button>
                            <a href={waLink} target="_blank" rel="noopener noreferrer" className="px-8 py-5 border border-white/25 rounded-sm font-bold text-white/80 uppercase tracking-widest hover:border-wtech-gold hover:text-wtech-gold transition-colors text-center">
                                Falar no WhatsApp
                            </a>
                        </div>
                        {!isFullOrDone && (
                            <div className="flex items-center gap-3 text-sm font-bold text-white/60">
                                <Gauge size={18} className="text-wtech-gold" />
                                <span className={spotsLeft <= 5 ? 'text-red-500 animate-pulse' : ''}>
                                    {spotsLeft <= 10 ? `Últimas ${spotsLeft} posições no grid` : 'Posições limitadas nesta turma'}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {racingStripe}

            {/* STATS DE AUTORIDADE */}
            <section className="bg-black/70 backdrop-blur border-b border-white/10">
                <div className="container mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                    {[
                        { n: '+15', l: 'Anos de Pista' },
                        { n: '+5.000', l: 'Alunos Formados' },
                        { n: '+200', l: 'Oficinas Credenciadas' },
                        { n: '#1', l: 'Referência em Suspensão' }
                    ].map((s, i) => (
                        <div key={i}>
                            <div className="text-4xl md:text-5xl font-black italic text-wtech-gold">{s.n}</div>
                            <div className="text-[11px] font-black uppercase tracking-[0.2em] text-white/45 mt-1">{s.l}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* INFO BAR */}
            <div className="container mx-auto px-6 -mb-8 relative z-20 mt-12">
                <div className="bg-[#0E1013] border border-wtech-gold/40 rounded-xl py-6 px-8 grid grid-cols-2 md:grid-cols-4 gap-6 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
                    {[
                        { icon: Calendar, label: 'Data', value: lp.course?.date ? (lp.course.dateEnd ? `${formatDateLocal(lp.course.date)} – ${formatDateLocal(lp.course.dateEnd)}` : formatDateLocal(lp.course.date)) : 'A definir' },
                        { icon: Clock, label: 'Horário', value: `${lp.course?.startTime || '08:00'} – ${lp.course?.endTime || '18:00'}` },
                        { icon: MapPin, label: 'Box / Local', value: lp.course?.city || 'A definir' },
                        { icon: Users, label: 'Grid', value: isFullOrDone ? 'Lista de espera' : `${spotsLeft} posições` }
                    ].map((it, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <it.icon size={20} className="text-wtech-gold shrink-0" />
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">{it.label}</div>
                                <div className="text-sm font-bold">{it.value}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* SOBRE + VÍDEO */}
            <section className="pt-28 pb-24">
                <div className="container mx-auto px-6 grid lg:grid-cols-2 gap-14 items-center">
                    <div className="relative rounded-xl overflow-hidden border border-white/10 shadow-2xl">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-wtech-gold z-10" />
                        {lp.videoUrl ? (
                            <div className="aspect-video bg-black">
                                <iframe src={lp.videoUrl.replace('watch?v=', 'embed/')} className="w-full h-full" title="Vídeo do curso" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                            </div>
                        ) : (
                            <div className="aspect-video flex items-center justify-center bg-black/60"><Play size={48} className="text-wtech-gold/40" /></div>
                        )}
                    </div>
                    <div className="space-y-6">
                        <div className="text-wtech-gold font-black uppercase tracking-[0.3em] text-xs">Briefing</div>
                        <h2 className="text-4xl md:text-5xl font-black uppercase italic tracking-tight">Engenharia de pista, <span className="text-wtech-gold">na sua bancada</span></h2>
                        <p className="text-white/60 text-lg leading-relaxed">
                            A mesma técnica que ajusta suspensão de competição, ensinada passo a passo para você aplicar
                            na oficina. Quem domina suspensão não disputa preço — define o preço.
                        </p>
                        <div className="flex items-center gap-4 bg-black/60 border border-white/10 rounded-lg p-5">
                            <Trophy className="text-wtech-gold shrink-0" size={26} />
                            <p className="text-sm text-white/70">Certificado oficial W-Tech + acesso à rede credenciada: o selo que faz o cliente escolher a sua oficina.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* BENEFÍCIOS */}
            {lp.benefits && lp.benefits.length > 0 && (
                <section className="py-24 bg-black/55 border-y border-white/10">
                    <div className="container mx-auto px-6">
                        <div className="text-center mb-14">
                            <div className="text-wtech-gold font-black uppercase tracking-[0.3em] text-xs mb-2">Vantagem competitiva</div>
                            <h2 className="text-4xl md:text-5xl font-black uppercase italic tracking-tight">O que você ganha</h2>
                        </div>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-7">
                            {lp.benefits.map((b, i) => (
                                <div key={i} className="relative bg-[#0E1013] border border-white/10 rounded-xl p-7 overflow-hidden group hover:border-wtech-gold/60 transition-colors">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-wtech-gold scale-y-0 group-hover:scale-y-100 origin-top transition-transform duration-300" />
                                    <h3 className="font-black text-lg uppercase mb-2 group-hover:text-wtech-gold transition-colors">{b.title}</h3>
                                    <p className="text-white/50 text-sm leading-relaxed">{b.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* CRONOGRAMA */}
            {lp.course?.schedule && (
                <section className="py-24">
                    <div className="container mx-auto px-6 max-w-4xl">
                        <div className="text-center mb-10">
                            <div className="text-wtech-gold font-black uppercase tracking-[0.3em] text-xs mb-2">Plano de prova</div>
                            <h2 className="text-4xl font-black uppercase italic tracking-tight">Programação</h2>
                        </div>
                        <div className="bg-[#0E1013] border border-white/10 rounded-xl p-8 md:p-12">
                            <div className="prose prose-invert max-w-none text-white/70 leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHtml(lp.course.schedule.replace(/\n/g, '<br/>')) }} />
                        </div>
                    </div>
                </section>
            )}

            {/* MÓDULOS — PIT LANE TIMELINE */}
            {lp.modules && lp.modules.length > 0 && (
                <section id="modules" className="py-24 bg-black/55 border-y border-white/10">
                    <div className="container mx-auto px-6 max-w-4xl">
                        <div className="text-center mb-14">
                            <div className="text-wtech-gold font-black uppercase tracking-[0.3em] text-xs mb-2">Pit lane</div>
                            <h2 className="text-4xl md:text-5xl font-black uppercase italic tracking-tight">Conteúdo do treinamento</h2>
                        </div>
                        <div className="relative pl-10 space-y-10">
                            <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gradient-to-b from-wtech-gold via-wtech-gold/40 to-transparent" />
                            {lp.modules.map((mod, i) => (
                                <div key={i} className="relative">
                                    <div className="absolute -left-10 top-0 w-7 h-7 rounded-full bg-[#08090B] border-2 border-wtech-gold flex items-center justify-center text-[11px] font-black text-wtech-gold">{i + 1}</div>
                                    <div className="bg-[#0E1013] border border-white/10 rounded-xl p-6 hover:border-wtech-gold/50 transition-colors">
                                        <h3 className="font-black text-lg uppercase mb-1.5">{mod.title}</h3>
                                        <p className="text-white/50 text-sm leading-relaxed">{mod.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* INSTRUTOR */}
            <section className="py-24">
                <div className="container mx-auto px-6 max-w-5xl grid md:grid-cols-[280px_1fr] gap-10 items-center">
                    <div className="relative mx-auto">
                        <div className="absolute -inset-2 bg-wtech-gold/20 rounded-xl blur-xl" />
                        <div className="relative w-64 h-64 rounded-xl border border-wtech-gold/50 overflow-hidden">
                            <LPInstructorPhoto src={lp.instructorImage} name={lp.instructorName} theme="dark" />
                        </div>
                    </div>
                    <div>
                        <div className="text-wtech-gold font-black uppercase tracking-[0.3em] text-xs mb-2">Chefe de equipe</div>
                        <h3 className="text-3xl md:text-4xl font-black uppercase italic tracking-tight mb-4">{lp.instructorName}</h3>
                        <div className="text-white/60 leading-relaxed text-lg" dangerouslySetInnerHTML={{ __html: sanitizeHtml(lp.instructorBio?.replace(/\n/g, '<br/>') || '') }} />
                    </div>
                </div>
            </section>

            {/* DEPOIMENTOS */}
            {lp.testimonials && lp.testimonials.length > 0 && (
                <section className="py-24 bg-black/55 border-y border-white/10">
                    <div className="container mx-auto px-6">
                        <div className="text-center mb-14">
                            <div className="text-wtech-gold font-black uppercase tracking-[0.3em] text-xs mb-2">Pódio</div>
                            <h2 className="text-4xl md:text-5xl font-black uppercase italic tracking-tight">Quem já correu com a gente</h2>
                        </div>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-7">
                            {lp.testimonials.map((t, i) => {
                                const v = (t as any).videoUrl as string | undefined;
                                const yt = v ? (() => { const m = v.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/); return m && m[2].length === 11 ? m[2] : ''; })() : '';
                                return (
                                    <div key={i} className="bg-[#0E1013] border border-white/10 rounded-xl p-6 flex flex-col hover:border-wtech-gold/50 transition-colors">
                                        {yt ? (
                                            <div className="relative aspect-video mb-4 rounded-lg overflow-hidden cursor-pointer group border border-white/10" onClick={() => setActiveVideo(yt)}>
                                                <img src={`https://img.youtube.com/vi/${yt}/mqdefault.jpg`} className="w-full h-full object-cover" alt={t.name} />
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                    <div className="w-12 h-12 bg-wtech-gold text-black rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"><Play size={18} className="fill-black ml-0.5" /></div>
                                                </div>
                                            </div>
                                        ) : (
                                            <Quote size={28} className="text-wtech-gold/30 mb-3" />
                                        )}
                                        <p className="text-white/70 text-sm leading-relaxed flex-1 italic">"{t.text}"</p>
                                        <div className="flex items-center gap-3 mt-5 pt-5 border-t border-white/10">
                                            <div className="w-10 h-10 rounded-full border border-wtech-gold/50 overflow-hidden bg-black flex items-center justify-center shrink-0">
                                                {t.image ? <img src={t.image} className="w-full h-full object-cover" alt={t.name} /> : <span className="font-black text-wtech-gold">{t.name[0]}</span>}
                                            </div>
                                            <div>
                                                <div className="font-bold text-sm">{t.name}</div>
                                                <div className="flex gap-0.5">{[...Array(5)].map((_, j) => <Star key={j} size={10} className="fill-wtech-gold text-wtech-gold" />)}</div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>
            )}

            {/* LOCAL */}
            <section className="py-24">
                <div className="container mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
                    <div className="space-y-6">
                        <div className="text-wtech-gold font-black uppercase tracking-[0.3em] text-xs">Autódromo do conhecimento</div>
                        <h2 className="text-4xl md:text-5xl font-black uppercase italic tracking-tight">Local do evento</h2>
                        <div className="flex items-start gap-4">
                            <MapPin size={22} className="text-wtech-gold shrink-0 mt-1" />
                            <div>
                                <p className="text-lg font-bold">{lp.course?.address || 'Endereço a confirmar'}</p>
                                <p className="text-white/50">{lp.course?.addressNeighborhood ? `${lp.course.addressNeighborhood}, ` : ''}{lp.course?.city} - {lp.course?.state}</p>
                            </div>
                        </div>
                        <a target="_blank" rel="noreferrer" href={lp.course?.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`} className="inline-flex items-center gap-2 text-wtech-gold font-black uppercase text-sm tracking-wider hover:underline">
                            <Navigation size={16} /> Traçar rota no Google Maps
                        </a>
                        <div className="bg-red-500/10 border border-red-500/40 rounded-lg p-5 flex items-center gap-4">
                            <AlertTriangle className="text-red-500 shrink-0" />
                            <p className="text-sm text-white/75"><strong className="block uppercase font-black text-red-400">Grid limitado</strong> Turma presencial com capacidade fechada — sem segunda chamada.</p>
                        </div>
                    </div>
                    <div className="h-[380px] rounded-xl overflow-hidden border border-white/10">
                        <iframe width="100%" height="100%" src={`https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&t=&z=15&ie=UTF8&iwloc=&output=embed`} className="w-full h-full border-0 grayscale invert-[0.9] contrast-90" title="Mapa do local" />
                    </div>
                </div>
            </section>

            {racingStripe}

            {/* FORM FINAL */}
            <section id="enroll-form" className="py-24 bg-black/70">
                <div className="container mx-auto px-6">
                    <div className="max-w-2xl mx-auto text-center mb-12">
                        <div className="text-wtech-gold font-black uppercase tracking-[0.3em] text-xs mb-3">Largada</div>
                        <h2 className="text-4xl md:text-6xl font-black uppercase italic tracking-tight mb-4">
                            {isFullOrDone ? 'Lista de espera' : 'Assuma sua posição'}
                        </h2>
                        <p className="text-white/60 text-lg">
                            {isFullOrDone
                                ? 'Esta turma fechou o grid. Cadastre-se para largar na próxima.'
                                : 'O grid fecha quando a última posição for tomada. Preencha e garanta a sua.'}
                        </p>
                    </div>
                    <div className="max-w-xl mx-auto bg-[#0E1013] border border-wtech-gold/40 rounded-2xl p-8 md:p-10 shadow-[0_0_60px_rgba(212,175,55,0.12)]">
                        <LPEnrollForm
                            lp={lp} theme="dark" checkoutAtivo={checkoutAtivo} isFullOrDone={isFullOrDone}
                            form={form} setForm={setForm} paymentType={paymentType} setPaymentType={setPaymentType}
                            submitted={submitted} setSubmitted={setSubmitted} handleSubmit={handleSubmit}
                            whatsappGlobal={whatsappGlobal}
                        />
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-10 text-center text-white/30 text-xs font-bold uppercase tracking-wider border-t border-white/10 bg-black/60">
                <p>© {new Date().getFullYear()} W-Tech Brasil. Todos os direitos reservados.</p>
                <div className="flex justify-center gap-5 mt-3">
                    <a href="/termos" className="hover:text-white transition-colors">Termos</a>
                    <a href="/privacidade" className="hover:text-white transition-colors">Privacidade</a>
                </div>
            </footer>

            {/* Floating CTA mobile */}
            {showFloatingCTA && (
                <div className="fixed bottom-0 left-0 w-full z-40 bg-[#0E1013]/95 backdrop-blur border-t border-wtech-gold/40 py-3.5 px-5 md:hidden flex items-center justify-between">
                    <div className="text-sm font-black uppercase italic truncate max-w-[150px]">{lp.title}</div>
                    <button onClick={scrollToForm} className="bg-wtech-gold text-black px-5 py-2.5 rounded-sm font-black text-xs uppercase tracking-widest">
                        {isFullOrDone ? 'Lista' : 'Garantir'}
                    </button>
                </div>
            )}

            {/* Modal de vídeo */}
            {activeVideo && (
                <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
                    <div className="absolute inset-0" onClick={() => setActiveVideo(null)} />
                    <div className="bg-black w-full max-w-4xl aspect-video relative z-10 rounded-xl overflow-hidden border border-wtech-gold/40">
                        <button onClick={() => setActiveVideo(null)} className="absolute top-3 right-3 z-20 text-white hover:text-wtech-gold bg-black/60 w-10 h-10 rounded-full flex items-center justify-center"><X size={20} /></button>
                        <iframe src={`https://www.youtube.com/embed/${activeVideo}?autoplay=1`} className="w-full h-full" title="Depoimento em vídeo" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                    </div>
                </div>
            )}
        </div>
    );
};

export default LandingPageViewerV6;
