import React, { useState } from 'react';
import { ArrowRight, Calendar, Clock, MapPin, Users, Play, X, Star, AlertTriangle, Navigation, Plus } from 'lucide-react';
import { useLandingPage } from '../hooks/useLandingPage';
import LPEnrollForm from '../components/lp/LPEnrollForm';
import { LPInstructorPhoto } from '../components/lp/LPInstructorPhoto';
import { FakeSignupAlert } from '../components/FakeSignupAlert';
import { useSettings } from '../context/SettingsContext';
import { formatDateLocal, sanitizeHtml } from '../lib/utils';

/**
 * V8 — "Swiss Tech" (CLARO · grid suíço)
 * Branco puro, grid com bordas pretas finas visíveis, labels monoespaçados,
 * seções numeradas 01/02/03, accent dourado cirúrgico. Persuasão por
 * clareza + precisão técnica. Preço só com checkout automático.
 */
const mono = 'font-mono text-[10px] font-bold uppercase tracking-[0.25em]';

const LandingPageViewerV8: React.FC = () => {
    const { get } = useSettings();
    const systemLogo = get('logo_url');
    const whatsappGlobal = get('whatsapp_phone');
    const {
        lp, loading, spotsLeft, form, setForm, paymentType, setPaymentType,
        submitted, setSubmitted, showFloatingCTA, isFullOrDone, checkoutAtivo,
        handleSubmit, scrollToForm
    } = useLandingPage('v8');
    const [activeVideo, setActiveVideo] = useState<string | null>(null);

    if (loading) {
        return <div className="h-screen flex items-center justify-center bg-white"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-wtech-gold" /></div>;
    }
    if (!lp) {
        return <div className="h-screen flex items-center justify-center bg-white text-zinc-900 font-medium">Página não encontrada.</div>;
    }

    const mapQuery = lp.course?.address ? `${lp.course.address}, ${lp.course.city}` : lp.course?.location || 'São Paulo';
    const whatsappNumber = lp.whatsappNumber || whatsappGlobal;
    const waLink = whatsappNumber ? `https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! Tenho interesse no curso ${lp.title}`)}` : '#';
    const dateLabel = lp.course?.date ? (lp.course.dateEnd ? `${formatDateLocal(lp.course.date)} – ${formatDateLocal(lp.course.dateEnd)}` : formatDateLocal(lp.course.date)) : 'A definir';

    const SectionHead = ({ n, title }: { n: string; title: string }) => (
        <div className="border-b-2 border-zinc-950 pb-4 mb-12 flex items-end justify-between">
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-zinc-950">{title}</h2>
            <span className={`${mono} text-zinc-400`}>/{n}</span>
        </div>
    );

    return (
        <div className="min-h-screen bg-white text-zinc-900 font-sans selection:bg-wtech-gold selection:text-black overflow-x-hidden">
            {lp.fakeAlertsEnabled && <FakeSignupAlert courseName={lp.title} />}

            {/* Navbar */}
            <header className="sticky top-0 z-50 bg-white border-b-2 border-zinc-950">
                <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {systemLogo
                            ? <img src={systemLogo} alt="W-Tech" className="h-9 object-contain" />
                            : <span className="font-black text-lg tracking-tighter uppercase">W-Tech<span className="text-wtech-gold">®</span></span>}
                        <span className={`${mono} text-zinc-400 hidden md:inline`}>Treinamento Técnico Presencial</span>
                    </div>
                    <button onClick={scrollToForm} className="bg-zinc-950 text-white px-6 py-2.5 font-bold text-xs uppercase tracking-[0.18em] hover:bg-wtech-gold hover:text-black transition-colors">
                        {isFullOrDone ? 'Lista de Espera' : 'Inscrever-se'}
                    </button>
                </div>
            </header>

            {/* HERO — grid suíço */}
            <section className="border-b-2 border-zinc-950">
                <div className="container mx-auto px-6 grid lg:grid-cols-12 min-h-[78vh]">
                    <div className="lg:col-span-7 py-20 lg:pr-14 flex flex-col justify-center lg:border-r-2 border-zinc-950">
                        <div className={`${mono} text-wtech-gold mb-6 flex items-center gap-3`}>
                            <span className="w-2 h-2 bg-wtech-gold inline-block" /> {isFullOrDone ? 'Inscrições encerradas' : 'Inscrições abertas'} — {lp.course?.city || 'Brasil'}
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-[0.95] text-zinc-950 mb-8">
                            {lp.title}
                        </h1>
                        <p className="text-lg md:text-xl text-zinc-500 leading-relaxed max-w-xl mb-10">
                            {lp.subtitle}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <button onClick={scrollToForm} className="bg-zinc-950 text-white px-10 py-5 font-black text-base uppercase tracking-[0.12em] hover:bg-wtech-gold hover:text-black transition-colors inline-flex items-center justify-center gap-3">
                                {isFullOrDone ? 'Entrar na Lista de Espera' : 'Garantir Minha Vaga'} <ArrowRight size={18} strokeWidth={3} />
                            </button>
                            <a href="#modules" className="px-8 py-5 border-2 border-zinc-950 font-bold text-zinc-950 uppercase tracking-[0.12em] text-center hover:bg-zinc-950 hover:text-white transition-colors">
                                Ver Conteúdo
                            </a>
                        </div>
                    </div>
                    <div className="lg:col-span-5 relative min-h-[320px]">
                        {lp.heroImage && <img src={lp.heroImage} alt={lp.title} className="absolute inset-0 w-full h-full object-cover" />}
                        <div className="absolute bottom-0 left-0 bg-white border-t-2 border-r-2 border-zinc-950 px-5 py-3">
                            <span className={`${mono} text-zinc-950`}>{isFullOrDone ? 'Turma esgotada' : `Vagas restantes: ${spotsLeft}`}</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* INFO GRID */}
            <div className="border-b-2 border-zinc-950">
                <div className="container mx-auto px-6 grid grid-cols-2 md:grid-cols-4 divide-x-2 divide-zinc-950">
                    {[
                        { icon: Calendar, label: 'Data', value: dateLabel },
                        { icon: Clock, label: 'Horário', value: `${lp.course?.startTime || '08:00'} – ${lp.course?.endTime || '18:00'}` },
                        { icon: MapPin, label: 'Local', value: lp.course?.city || 'A definir' },
                        { icon: Users, label: 'Vagas', value: isFullOrDone ? 'Lista de espera' : `${spotsLeft} restantes` }
                    ].map((it, i) => (
                        <div key={i} className="py-7 px-5">
                            <it.icon size={18} className="text-wtech-gold mb-3" />
                            <div className={`${mono} text-zinc-400`}>{it.label}</div>
                            <div className="text-sm font-black text-zinc-950 mt-1 uppercase">{it.value}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* SOBRE + VÍDEO */}
            <section className="py-24">
                <div className="container mx-auto px-6">
                    <SectionHead n="01" title="O Treinamento" />
                    <div className="grid lg:grid-cols-2 gap-14 items-start">
                        <div className="border-2 border-zinc-950">
                            {lp.videoUrl ? (
                                <div className="aspect-video bg-black">
                                    <iframe src={lp.videoUrl.replace('watch?v=', 'embed/')} className="w-full h-full" title="Vídeo do curso" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                                </div>
                            ) : (
                                <div className="aspect-video flex items-center justify-center bg-zinc-50"><Play size={48} className="text-zinc-300" /></div>
                            )}
                        </div>
                        <div className="space-y-6">
                            <p className="text-xl text-zinc-700 leading-relaxed font-medium">
                                Método direto: teoria mínima necessária, prática máxima possível. Você desmonta,
                                diagnostica, revalva e ajusta — com o instrutor do lado.
                            </p>
                            <p className="text-zinc-500 leading-relaxed">
                                Ao final, você sai com o certificado oficial W-Tech e o caminho aberto para a rede
                                credenciada — o selo técnico que faz o cliente escolher a sua oficina, não a do vizinho.
                            </p>
                            <div className="grid grid-cols-2 divide-x-2 divide-zinc-950 border-2 border-zinc-950">
                                <div className="p-5 text-center">
                                    <div className="text-3xl font-black text-zinc-950">100%</div>
                                    <div className={`${mono} text-zinc-400 mt-1`}>Presencial e prático</div>
                                </div>
                                <div className="p-5 text-center">
                                    <div className="text-3xl font-black text-wtech-gold">Oficial</div>
                                    <div className={`${mono} text-zinc-400 mt-1`}>Certificado W-Tech</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* BENEFÍCIOS */}
            {lp.benefits && lp.benefits.length > 0 && (
                <section className="py-24 border-t-2 border-zinc-950 bg-zinc-50">
                    <div className="container mx-auto px-6">
                        <SectionHead n="02" title="O Que Você Leva" />
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 border-t-2 border-l-2 border-zinc-950">
                            {lp.benefits.map((b, i) => (
                                <div key={i} className="border-b-2 border-r-2 border-zinc-950 p-8 bg-white hover:bg-wtech-gold/10 transition-colors group">
                                    <div className="flex items-center justify-between mb-5">
                                        <span className={`${mono} text-zinc-400`}>{String(i + 1).padStart(2, '0')}</span>
                                        <Plus size={16} className="text-wtech-gold group-hover:rotate-90 transition-transform" />
                                    </div>
                                    <h3 className="font-black text-lg uppercase tracking-tight text-zinc-950 mb-2">{b.title}</h3>
                                    <p className="text-zinc-500 text-sm leading-relaxed">{b.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* CRONOGRAMA */}
            {lp.course?.schedule && (
                <section className="py-24 border-t-2 border-zinc-950">
                    <div className="container mx-auto px-6">
                        <SectionHead n="03" title="Programação" />
                        <div className="max-w-4xl border-2 border-zinc-950 p-8 md:p-12 bg-white">
                            <div className="prose prose-zinc max-w-none leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHtml(lp.course.schedule.replace(/\n/g, '<br/>')) }} />
                        </div>
                    </div>
                </section>
            )}

            {/* MÓDULOS */}
            {lp.modules && lp.modules.length > 0 && (
                <section id="modules" className="py-24 border-t-2 border-zinc-950 bg-zinc-50">
                    <div className="container mx-auto px-6">
                        <SectionHead n={lp.course?.schedule ? '04' : '03'} title="Conteúdo Programático" />
                        <div className="divide-y-2 divide-zinc-950 border-2 border-zinc-950 bg-white">
                            {lp.modules.map((mod, i) => (
                                <div key={i} className="grid md:grid-cols-[90px_1fr] hover:bg-wtech-gold/5 transition-colors">
                                    <div className="hidden md:flex items-center justify-center border-r-2 border-zinc-950 text-2xl font-black text-zinc-950">
                                        {String(i + 1).padStart(2, '0')}
                                    </div>
                                    <div className="p-7">
                                        <h3 className="font-black text-lg uppercase tracking-tight text-zinc-950 mb-1.5">
                                            <span className="md:hidden text-zinc-300 mr-2">{String(i + 1).padStart(2, '0')}</span>{mod.title}
                                        </h3>
                                        <p className="text-zinc-500 text-sm leading-relaxed max-w-3xl">{mod.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* INSTRUTOR */}
            <section className="py-24 border-t-2 border-zinc-950">
                <div className="container mx-auto px-6">
                    <SectionHead n="05" title="Instrutor" />
                    <div className="grid md:grid-cols-[280px_1fr] border-2 border-zinc-950">
                        <div className="border-b-2 md:border-b-0 md:border-r-2 border-zinc-950">
                            <div className="w-full h-full min-h-[280px] overflow-hidden">
                                <LPInstructorPhoto src={lp.instructorImage} name={lp.instructorName} theme="light" />
                            </div>
                        </div>
                        <div className="p-8 md:p-12 flex flex-col justify-center">
                            <span className={`${mono} text-wtech-gold mb-2`}>Responsável técnico</span>
                            <h3 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-zinc-950 mb-4">{lp.instructorName}</h3>
                            <div className="text-zinc-500 leading-relaxed text-lg" dangerouslySetInnerHTML={{ __html: sanitizeHtml(lp.instructorBio?.replace(/\n/g, '<br/>') || '') }} />
                        </div>
                    </div>
                </div>
            </section>

            {/* DEPOIMENTOS */}
            {lp.testimonials && lp.testimonials.length > 0 && (
                <section className="py-24 border-t-2 border-zinc-950 bg-zinc-50">
                    <div className="container mx-auto px-6">
                        <SectionHead n="06" title="Resultados Reais" />
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-0 border-t-2 border-l-2 border-zinc-950">
                            {lp.testimonials.map((t, i) => {
                                const v = (t as any).videoUrl as string | undefined;
                                const yt = v ? (() => { const m = v.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/); return m && m[2].length === 11 ? m[2] : ''; })() : '';
                                return (
                                    <div key={i} className="border-b-2 border-r-2 border-zinc-950 bg-white p-7 flex flex-col">
                                        {yt && (
                                            <div className="relative aspect-video mb-5 border-2 border-zinc-950 overflow-hidden cursor-pointer group" onClick={() => setActiveVideo(yt)}>
                                                <img src={`https://img.youtube.com/vi/${yt}/mqdefault.jpg`} className="w-full h-full object-cover" alt={t.name} />
                                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                                    <div className="w-12 h-12 bg-wtech-gold text-black flex items-center justify-center group-hover:scale-110 transition-transform"><Play size={18} className="fill-black ml-0.5" /></div>
                                                </div>
                                            </div>
                                        )}
                                        <p className="text-zinc-700 text-sm leading-relaxed flex-1">"{t.text}"</p>
                                        <div className="flex items-center gap-3 mt-6 pt-5 border-t-2 border-zinc-100">
                                            <div className="w-10 h-10 border-2 border-zinc-950 overflow-hidden bg-zinc-50 flex items-center justify-center shrink-0">
                                                {t.image ? <img src={t.image} className="w-full h-full object-cover" alt={t.name} /> : <span className="font-black text-zinc-950">{t.name[0]}</span>}
                                            </div>
                                            <div>
                                                <div className="font-black text-sm text-zinc-950 uppercase">{t.name}</div>
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
            <section className="py-24 border-t-2 border-zinc-950">
                <div className="container mx-auto px-6">
                    <SectionHead n="07" title="Local" />
                    <div className="grid lg:grid-cols-2 border-2 border-zinc-950">
                        <div className="p-8 md:p-12 space-y-6 lg:border-r-2 border-zinc-950">
                            <div>
                                <span className={`${mono} text-zinc-400 block mb-2`}>Endereço</span>
                                <p className="text-xl font-bold text-zinc-950">{lp.course?.address || 'Endereço a confirmar'}</p>
                                <p className="text-zinc-500">{lp.course?.addressNeighborhood ? `${lp.course.addressNeighborhood}, ` : ''}{lp.course?.city} - {lp.course?.state}</p>
                            </div>
                            <a target="_blank" rel="noreferrer" href={lp.course?.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`} className="inline-flex items-center gap-2 text-zinc-950 font-black uppercase text-xs tracking-[0.2em] border-b-2 border-wtech-gold pb-1 hover:gap-3 transition-all">
                                <Navigation size={14} /> Abrir no Google Maps
                            </a>
                            <div className="border-2 border-zinc-950 bg-wtech-gold/10 p-5 flex items-center gap-4">
                                <AlertTriangle className="text-zinc-950 shrink-0" size={20} />
                                <p className="text-sm text-zinc-700"><strong className="block font-black uppercase text-zinc-950">Capacidade fechada.</strong> A estrutura do local define o número exato de vagas.</p>
                            </div>
                        </div>
                        <div className="min-h-[320px] border-t-2 lg:border-t-0 border-zinc-950">
                            <iframe width="100%" height="100%" src={`https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&t=&z=15&ie=UTF8&iwloc=&output=embed`} className="w-full h-full border-0 min-h-[320px]" title="Mapa do local" />
                        </div>
                    </div>
                </div>
            </section>

            {/* FORM FINAL */}
            <section id="enroll-form" className="py-24 border-t-2 border-zinc-950 bg-zinc-50">
                <div className="container mx-auto px-6">
                    <div className="max-w-2xl mx-auto text-center mb-12">
                        <span className={`${mono} text-wtech-gold block mb-3`}>/08 — Inscrição</span>
                        <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-zinc-950 mb-4">
                            {isFullOrDone ? 'Lista de Espera' : 'Garanta Sua Vaga'}
                        </h2>
                        <p className="text-zinc-500 text-lg">
                            {isFullOrDone
                                ? 'Turma esgotada — cadastre-se e seja avisado primeiro sobre a próxima.'
                                : 'Dados confirmados em minutos pelo nosso time via WhatsApp.'}
                        </p>
                    </div>
                    <div className="max-w-xl mx-auto bg-white border-2 border-zinc-950 p-8 md:p-12">
                        <LPEnrollForm
                            lp={lp} theme="light" checkoutAtivo={checkoutAtivo} isFullOrDone={isFullOrDone}
                            form={form} setForm={setForm} paymentType={paymentType} setPaymentType={setPaymentType}
                            submitted={submitted} setSubmitted={setSubmitted} handleSubmit={handleSubmit}
                            whatsappGlobal={whatsappGlobal}
                        />
                    </div>
                    <div className="text-center mt-8">
                        <a href={waLink} target="_blank" rel="noopener noreferrer" className="text-zinc-400 text-sm font-bold hover:text-zinc-950 transition-colors">
                            Dúvidas? Fale com a equipe no WhatsApp →
                        </a>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-10 text-center border-t-2 border-zinc-950 bg-white">
                <p className={`${mono} text-zinc-400`}>© {new Date().getFullYear()} W-Tech Brasil — Todos os direitos reservados</p>
                <div className="flex justify-center gap-6 mt-3">
                    <a href="/termos" className={`${mono} text-zinc-400 hover:text-zinc-950 transition-colors`}>Termos</a>
                    <a href="/privacidade" className={`${mono} text-zinc-400 hover:text-zinc-950 transition-colors`}>Privacidade</a>
                </div>
            </footer>

            {/* Floating CTA mobile */}
            {showFloatingCTA && (
                <div className="fixed bottom-0 left-0 w-full z-40 bg-white border-t-2 border-zinc-950 py-3.5 px-5 md:hidden flex items-center justify-between">
                    <div className="text-sm font-black uppercase truncate max-w-[160px]">{lp.title}</div>
                    <button onClick={scrollToForm} className="bg-zinc-950 text-white px-5 py-2.5 font-black text-xs uppercase tracking-[0.18em]">
                        {isFullOrDone ? 'Lista' : 'Inscrever'}
                    </button>
                </div>
            )}

            {/* Modal de vídeo */}
            {activeVideo && (
                <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
                    <div className="absolute inset-0" onClick={() => setActiveVideo(null)} />
                    <div className="bg-black w-full max-w-4xl aspect-video relative z-10 border-2 border-white">
                        <button onClick={() => setActiveVideo(null)} className="absolute -top-12 right-0 text-white hover:text-wtech-gold w-10 h-10 flex items-center justify-center"><X size={24} /></button>
                        <iframe src={`https://www.youtube.com/embed/${activeVideo}?autoplay=1`} className="w-full h-full" title="Depoimento em vídeo" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                    </div>
                </div>
            )}
        </div>
    );
};

export default LandingPageViewerV8;
