import React, { useState } from 'react';
import { ArrowRight, Calendar, Clock, MapPin, Users, Play, X, Star, Quote, Wrench, Award, AlertTriangle, Navigation, ShieldCheck } from 'lucide-react';
import { useLandingPage } from '../hooks/useLandingPage';
import { ScheduleTimeline } from '../components/ScheduleTimeline';
import { resolveScheduleModules } from '../lib/schedule';
import LPEnrollForm from '../components/lp/LPEnrollForm';
import { LPInstructorPhoto } from '../components/lp/LPInstructorPhoto';
import { FakeSignupAlert } from '../components/FakeSignupAlert';
import { useSettings } from '../context/SettingsContext';
import { formatDateLocal, sanitizeHtml } from '../lib/utils';

/**
 * V5 — "Gold Brutal" (DARK · neo-brutalista)
 * Bordas grossas douradas, sombras duras deslocadas, tipografia condensada
 * gigante, faixa de urgência em marquee. Persuasão por impacto e escassez.
 * Preço NUNCA aparece fora do checkout automático (regra no LPEnrollForm).
 */
const GOLD = '#D4AF37';

const LandingPageViewerV5: React.FC = () => {
    const { get } = useSettings();
    const systemLogo = get('logo_url');
    const whatsappGlobal = get('whatsapp_phone');
    const {
        lp, loading, spotsLeft, form, setForm, paymentType, setPaymentType,
        submitted, setSubmitted, showFloatingCTA, isFullOrDone, checkoutAtivo,
        handleSubmit, scrollToForm
    } = useLandingPage('v5');
    const [activeVideo, setActiveVideo] = useState<string | null>(null);

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-[#0A0A0A]">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-wtech-gold" />
            </div>
        );
    }
    if (!lp) {
        return <div className="h-screen flex items-center justify-center bg-[#0A0A0A] text-white font-bold">Página não encontrada.</div>;
    }

    const mapQuery = lp.course?.address ? `${lp.course.address}, ${lp.course.city}` : lp.course?.location || 'São Paulo';
    const whatsappNumber = lp.whatsappNumber || whatsappGlobal;
    const waLink = whatsappNumber ? `https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! Tenho interesse no curso ${lp.title}`)}` : '#';

    const brutalBox = 'border-2 border-wtech-gold shadow-[6px_6px_0_#D4AF37]';
    const marqueeText = isFullOrDone
        ? '● INSCRIÇÕES ENCERRADAS — ENTRE NA LISTA DE ESPERA '
        : `● VAGAS LIMITADAS — RESTAM ${spotsLeft} ● TURMA PRESENCIAL ● CERTIFICADO OFICIAL W-TECH `;

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-wtech-gold selection:text-black overflow-x-hidden">
            {lp.fakeAlertsEnabled && <FakeSignupAlert courseName={lp.title} />}

            {/* Marquee de urgência */}
            <div className="bg-wtech-gold text-black overflow-hidden whitespace-nowrap py-2 font-black text-xs uppercase tracking-widest border-b-4 border-black">
                <div className="inline-block animate-[marquee_22s_linear_infinite]">
                    {marqueeText.repeat(4)}
                </div>
            </div>
            <style>{`@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>

            {/* Navbar */}
            <header className="sticky top-0 z-50 bg-[#0A0A0A]/95 backdrop-blur border-b-2 border-wtech-gold">
                <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                    {systemLogo
                        ? <img src={systemLogo} alt="W-Tech" className="h-9 object-contain" />
                        : <span className="font-black text-xl tracking-tighter">W-TECH<span className="text-wtech-gold">/</span>BRASIL</span>}
                    <button onClick={scrollToForm} className="bg-wtech-gold text-black px-5 py-2 font-black text-xs uppercase tracking-widest border-2 border-black shadow-[3px_3px_0_#000] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all">
                        {isFullOrDone ? 'Lista de Espera' : 'Garantir Vaga'}
                    </button>
                </div>
            </header>

            {/* HERO */}
            <section className="relative py-20 md:py-28 overflow-hidden">
                <div className="absolute inset-0 z-0">
                    {lp.heroImage && <img src={lp.heroImage} alt="" className="w-full h-full object-cover opacity-20" />}
                    <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A]/60 via-[#0A0A0A]/90 to-[#0A0A0A]" />
                </div>
                <div className="container mx-auto px-6 relative z-10">
                    <div className="max-w-4xl">
                        <div className="inline-flex items-center gap-2 bg-black border-2 border-wtech-gold text-wtech-gold px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] mb-8 shadow-[4px_4px_0_#D4AF37]">
                            <Award size={13} /> Certificação Oficial W-Tech · {lp.course?.city || 'Brasil'}
                        </div>
                        <h1 className="text-5xl md:text-8xl font-black uppercase leading-[0.92] tracking-tighter mb-8">
                            {lp.title}
                        </h1>
                        <p className="text-lg md:text-2xl text-white/70 max-w-2xl border-l-4 border-wtech-gold pl-6 mb-10 leading-relaxed">
                            {lp.subtitle}
                        </p>

                        <div className="flex flex-col sm:flex-row gap-5 items-start">
                            <button onClick={scrollToForm} className={`${isFullOrDone ? 'bg-orange-500' : 'bg-red-600'} text-white px-10 py-5 font-black text-lg uppercase tracking-wider border-2 border-white shadow-[6px_6px_0_#D4AF37] hover:shadow-none hover:translate-x-[6px] hover:translate-y-[6px] transition-all flex items-center gap-3`}>
                                {isFullOrDone ? 'Entrar na Lista de Espera' : 'Quero Minha Vaga Agora'} <ArrowRight strokeWidth={3} />
                            </button>
                            <div className={`bg-black px-5 py-4 ${brutalBox}`}>
                                <div className="text-[10px] font-black uppercase tracking-widest text-white/50">{isFullOrDone ? 'Status' : 'Vagas restantes'}</div>
                                <div className="text-2xl font-black text-wtech-gold">{isFullOrDone ? 'ESGOTADO' : `${spotsLeft} VAGAS`}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* INFO BAR */}
            <div className="border-y-2 border-wtech-gold bg-black">
                <div className="container mx-auto px-6 py-6 grid grid-cols-2 md:grid-cols-4 gap-6">
                    {[
                        { icon: Calendar, label: 'Data', value: lp.course?.date ? (lp.course.dateEnd ? `${formatDateLocal(lp.course.date)} – ${formatDateLocal(lp.course.dateEnd)}` : formatDateLocal(lp.course.date)) : 'A definir' },
                        { icon: Clock, label: 'Horário', value: `${lp.course?.startTime || '08:00'} – ${lp.course?.endTime || '18:00'}` },
                        { icon: MapPin, label: 'Local', value: lp.course?.city || 'A definir' },
                        { icon: Users, label: 'Vagas', value: isFullOrDone ? 'Lista de espera' : `Restam ${spotsLeft}` }
                    ].map((it, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <div className="w-11 h-11 bg-wtech-gold text-black flex items-center justify-center border-2 border-black shadow-[3px_3px_0_rgba(212,175,55,0.4)] shrink-0">
                                <it.icon size={20} strokeWidth={2.5} />
                            </div>
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-white/40">{it.label}</div>
                                <div className="text-sm font-black uppercase">{it.value}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* SOBRE + VÍDEO */}
            <section className="py-24">
                <div className="container mx-auto px-6 grid lg:grid-cols-2 gap-14 items-start">
                    <div>
                        <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-6">
                            Sobre o <span className="text-wtech-gold">Treinamento</span>
                        </h2>
                        <p className="text-white/60 text-lg leading-relaxed mb-8">
                            Pare de perder serviço por não dominar suspensão. Este é o treinamento presencial que transforma
                            mecânicos comuns em especialistas procurados — técnica de pista aplicada na bancada da sua oficina.
                        </p>
                        {lp.handsOnEnabled !== false && (
                            <div className={`bg-black p-6 ${brutalBox}`}>
                                <div className="flex items-center gap-3 mb-3">
                                    <Wrench className="text-wtech-gold" size={22} />
                                    <span className="font-black uppercase tracking-wide">100% mão na massa</span>
                                </div>
                                <p className="text-white/50 text-sm leading-relaxed">
                                    Você desmonta, ajusta e revalva com acompanhamento direto do instrutor. Sai do curso aplicando no dia seguinte.
                                </p>
                            </div>
                        )}
                    </div>
                    <div className={`bg-black overflow-hidden ${brutalBox}`}>
                        {lp.videoUrl ? (
                            <div className="aspect-video">
                                <iframe src={lp.videoUrl.replace('watch?v=', 'embed/')} className="w-full h-full" title="Vídeo do curso" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                            </div>
                        ) : (
                            <div className="aspect-video flex items-center justify-center bg-white/5">
                                <Play size={48} className="text-wtech-gold/40" />
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* BENEFÍCIOS */}
            {lp.benefits && lp.benefits.length > 0 && (
                <section className="py-24 bg-black border-y-2 border-wtech-gold/40">
                    <div className="container mx-auto px-6">
                        <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-14 text-center">
                            O Que Você <span className="text-wtech-gold">Leva</span>
                        </h2>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-7">
                            {lp.benefits.map((b, i) => (
                                <div key={i} className="bg-[#0A0A0A] border-2 border-white/15 p-7 hover:border-wtech-gold hover:shadow-[6px_6px_0_#D4AF37] hover:-translate-x-1 hover:-translate-y-1 transition-all">
                                    <div className="text-5xl font-black text-wtech-gold/25 mb-4">{String(i + 1).padStart(2, '0')}</div>
                                    <h3 className="font-black text-lg uppercase mb-2">{b.title}</h3>
                                    <p className="text-white/50 text-sm leading-relaxed">{b.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* CRONOGRAMA */}
            <section id="cronograma" className="py-24">
                <div className="container mx-auto px-6 max-w-4xl">
                    <h2 className="text-4xl font-black uppercase tracking-tighter mb-10 text-center">Programação do <span className="text-wtech-gold">Curso</span></h2>
                    <ScheduleTimeline modules={resolveScheduleModules(lp.scheduleModules)} variant="dark" />
                </div>
            </section>

            {/* MÓDULOS */}
            {lp.modules && lp.modules.length > 0 && (
                <section id="modules" className="py-24 bg-black border-t-2 border-wtech-gold/40">
                    <div className="container mx-auto px-6">
                        <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-14 text-center">
                            Conteúdo <span className="text-wtech-gold">Programático</span>
                        </h2>
                        <div className="space-y-5 max-w-4xl mx-auto">
                            {lp.modules.map((mod, i) => (
                                <div key={i} className="flex gap-0 border-2 border-white/15 hover:border-wtech-gold transition-colors group bg-[#0A0A0A]">
                                    <div className="w-20 md:w-28 shrink-0 bg-wtech-gold text-black flex items-center justify-center text-3xl md:text-5xl font-black border-r-2 border-black">
                                        {i + 1}
                                    </div>
                                    <div className="p-6 flex-1">
                                        <h3 className="font-black text-lg md:text-xl uppercase mb-1 group-hover:text-wtech-gold transition-colors">{mod.title}</h3>
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
                <div className="container mx-auto px-6 max-w-5xl">
                    <div className={`bg-black p-8 md:p-12 flex flex-col md:flex-row gap-10 items-center ${brutalBox}`}>
                        <div className="w-52 h-52 shrink-0 border-2 border-wtech-gold shadow-[6px_6px_0_#D4AF37] overflow-hidden">
                            <LPInstructorPhoto src={lp.instructorImage} name={lp.instructorName} theme="dark" />
                        </div>
                        <div className="text-center md:text-left">
                            <div className="text-wtech-gold font-black uppercase tracking-[0.25em] text-xs mb-2">Seu Instrutor</div>
                            <h3 className="text-3xl md:text-4xl font-black uppercase tracking-tighter mb-4">{lp.instructorName}</h3>
                            <div className="text-white/60 leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHtml(lp.instructorBio?.replace(/\n/g, '<br/>') || '') }} />
                        </div>
                    </div>
                </div>
            </section>

            {/* DEPOIMENTOS */}
            {lp.testimonials && lp.testimonials.length > 0 && (
                <section className="py-24 bg-black border-y-2 border-wtech-gold/40">
                    <div className="container mx-auto px-6">
                        <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-14 text-center">
                            Quem Fez, <span className="text-wtech-gold">Recomenda</span>
                        </h2>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-7">
                            {lp.testimonials.map((t, i) => {
                                const v = (t as any).videoUrl as string | undefined;
                                const yt = v ? (() => { const m = v.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/); return m && m[2].length === 11 ? m[2] : ''; })() : '';
                                return (
                                    <div key={i} className="bg-[#0A0A0A] border-2 border-white/15 p-6 flex flex-col justify-between hover:border-wtech-gold transition-colors">
                                        {yt ? (
                                            <div className="relative aspect-video mb-4 border-2 border-white/15 overflow-hidden cursor-pointer group" onClick={() => setActiveVideo(yt)}>
                                                <img src={`https://img.youtube.com/vi/${yt}/mqdefault.jpg`} className="w-full h-full object-cover" alt={t.name} />
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                    <div className="w-12 h-12 bg-wtech-gold text-black flex items-center justify-center group-hover:scale-110 transition-transform">
                                                        <Play size={18} className="fill-black ml-0.5" />
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <Quote size={28} className="text-wtech-gold/30 mb-3" />
                                        )}
                                        <p className="text-white/70 text-sm leading-relaxed flex-1">{t.text && `"${t.text}"`}</p>
                                        <div className="flex items-center gap-3 mt-5 pt-5 border-t-2 border-white/10">
                                            <div className="w-10 h-10 border-2 border-wtech-gold overflow-hidden bg-black flex items-center justify-center shrink-0">
                                                {t.image ? <img src={t.image} className="w-full h-full object-cover" alt={t.name} /> : <span className="font-black text-wtech-gold">{t.name[0]}</span>}
                                            </div>
                                            <div>
                                                <div className="font-black text-sm uppercase">{t.name}</div>
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
                        <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">Local do <span className="text-wtech-gold">Evento</span></h2>
                        <div className="flex items-start gap-4">
                            <div className="w-11 h-11 bg-wtech-gold text-black flex items-center justify-center shrink-0 border-2 border-black"><MapPin size={20} /></div>
                            <div>
                                <p className="text-lg font-bold">{lp.course?.address || 'Endereço a confirmar'}</p>
                                <p className="text-white/50">{lp.course?.addressNeighborhood ? `${lp.course.addressNeighborhood}, ` : ''}{lp.course?.city} - {lp.course?.state}</p>
                            </div>
                        </div>
                        <a target="_blank" id="lp-v5-map-link" rel="noreferrer" href={lp.course?.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`} className="inline-flex items-center gap-2 text-wtech-gold font-black uppercase text-sm tracking-wider hover:underline">
                            <Navigation size={16} /> Abrir no Google Maps
                        </a>
                        <div className="bg-red-600/15 border-2 border-red-600 p-5 flex items-center gap-4">
                            <AlertTriangle className="text-red-500 shrink-0" />
                            <p className="text-sm text-white/80"><strong className="block uppercase font-black text-red-400">Turma presencial limitada</strong> A capacidade do local define as vagas. Quando fecha, fecha.</p>
                        </div>
                    </div>
                    <div className={`h-[380px] overflow-hidden ${brutalBox}`}>
                        <iframe width="100%" height="100%" src={`https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&t=&z=15&ie=UTF8&iwloc=&output=embed`} className="w-full h-full border-0 grayscale invert-[0.9] contrast-90" title="Mapa do local" />
                    </div>
                </div>
            </section>

            {/* FORM FINAL */}
            <section id="enroll-form" className="py-24 bg-black border-t-2 border-wtech-gold">
                <div className="container mx-auto px-6">
                    <div className="max-w-2xl mx-auto text-center mb-12">
                        <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-4">
                            {isFullOrDone ? 'Lista de Espera' : <>Garanta Sua <span className="text-wtech-gold">Vaga</span></>}
                        </h2>
                        <p className="text-white/60 text-lg">
                            {isFullOrDone
                                ? 'Turma esgotada — deixe seus dados e seja o primeiro a saber da próxima.'
                                : 'Preencha abaixo e dê o primeiro passo para virar referência em suspensão na sua região.'}
                        </p>
                    </div>
                    <div className={`max-w-xl mx-auto bg-[#0A0A0A] p-8 md:p-10 ${brutalBox}`}>
                        <LPEnrollForm
                            lp={lp} theme="dark" checkoutAtivo={checkoutAtivo} isFullOrDone={isFullOrDone}
                            form={form} setForm={setForm} paymentType={paymentType} setPaymentType={setPaymentType}
                            submitted={submitted} setSubmitted={setSubmitted} handleSubmit={handleSubmit}
                            whatsappGlobal={whatsappGlobal}
                        />
                    </div>
                    <div className="text-center mt-8">
                        <a href={waLink} target="_blank" id="lp-v5-whatsapp-footer-link" rel="noopener noreferrer" className="text-white/40 text-sm font-bold hover:text-wtech-gold transition-colors">
                            Prefere falar com a gente? Chama no WhatsApp →
                        </a>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-10 text-center text-white/30 text-xs font-bold uppercase tracking-wider border-t border-white/10">
                <p>© {new Date().getFullYear()} W-Tech Brasil. Todos os direitos reservados.</p>
                <div className="flex justify-center gap-5 mt-3">
                    <a href="/termos" className="hover:text-white transition-colors">Termos</a>
                    <a href="/privacidade" className="hover:text-white transition-colors">Privacidade</a>
                </div>
            </footer>

            {/* Floating CTA mobile */}
            {showFloatingCTA && (
                <div className="fixed bottom-0 left-0 w-full z-40 bg-black border-t-2 border-wtech-gold py-3.5 px-5 md:hidden flex items-center justify-between">
                    <div className="text-sm font-black uppercase truncate max-w-[150px]">{lp.title}</div>
                    <button onClick={scrollToForm} className="bg-wtech-gold text-black px-5 py-2.5 font-black text-xs uppercase tracking-widest border-2 border-black shadow-[3px_3px_0_#000]">
                        {isFullOrDone ? 'Lista' : 'Garantir Vaga'}
                    </button>
                </div>
            )}

            {/* Modal de vídeo */}
            {activeVideo && (
                <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
                    <div className="absolute inset-0" onClick={() => setActiveVideo(null)} />
                    <div className={`bg-black w-full max-w-4xl aspect-video relative z-10 ${brutalBox}`}>
                        <button onClick={() => setActiveVideo(null)} className="absolute -top-12 right-0 text-white hover:text-wtech-gold w-10 h-10 flex items-center justify-center"><X size={24} /></button>
                        <iframe src={`https://www.youtube.com/embed/${activeVideo}?autoplay=1`} className="w-full h-full" title="Depoimento em vídeo" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                    </div>
                </div>
            )}
        </div>
    );
};

export default LandingPageViewerV5;
