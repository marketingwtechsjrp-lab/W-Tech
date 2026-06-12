import React, { useState } from 'react';
import { ArrowRight, Calendar, Clock, MapPin, Users, Play, X, Star, AlertTriangle, Navigation } from 'lucide-react';
import { useLandingPage } from '../hooks/useLandingPage';
import LPEnrollForm from '../components/lp/LPEnrollForm';
import { LPInstructorPhoto } from '../components/lp/LPInstructorPhoto';
import { FakeSignupAlert } from '../components/FakeSignupAlert';
import { useSettings } from '../context/SettingsContext';
import { formatDateLocal, sanitizeHtml } from '../lib/utils';

/**
 * V7 — "Editorial Light" (CLARO · revista)
 * Fundo creme, serifa nos destaques, números editoriais grandes, linhas
 * finas, pull quotes nos depoimentos e muito respiro. Persuasão por
 * sofisticação + prova social. Preço só com checkout automático.
 */
const LandingPageViewerV7: React.FC = () => {
    const { get } = useSettings();
    const systemLogo = get('logo_url');
    const whatsappGlobal = get('whatsapp_phone');
    const {
        lp, loading, spotsLeft, form, setForm, paymentType, setPaymentType,
        submitted, setSubmitted, showFloatingCTA, isFullOrDone, checkoutAtivo,
        handleSubmit, scrollToForm
    } = useLandingPage('v7');
    const [activeVideo, setActiveVideo] = useState<string | null>(null);

    if (loading) {
        return <div className="h-screen flex items-center justify-center bg-[#FAF7F1]"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-wtech-gold" /></div>;
    }
    if (!lp) {
        return <div className="h-screen flex items-center justify-center bg-[#FAF7F1] text-zinc-900 font-medium">Página não encontrada.</div>;
    }

    const mapQuery = lp.course?.address ? `${lp.course.address}, ${lp.course.city}` : lp.course?.location || 'São Paulo';
    const whatsappNumber = lp.whatsappNumber || whatsappGlobal;
    const waLink = whatsappNumber ? `https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! Tenho interesse no curso ${lp.title}`)}` : '#';
    const dateLabel = lp.course?.date ? (lp.course.dateEnd ? `${formatDateLocal(lp.course.date)} – ${formatDateLocal(lp.course.dateEnd)}` : formatDateLocal(lp.course.date)) : 'A definir';

    return (
        <div className="min-h-screen bg-[#FAF7F1] text-zinc-900 font-sans selection:bg-wtech-gold selection:text-black overflow-x-hidden">
            {lp.fakeAlertsEnabled && <FakeSignupAlert courseName={lp.title} />}

            {/* Navbar */}
            <header className="sticky top-0 z-50 bg-[#FAF7F1]/92 backdrop-blur border-b border-zinc-200">
                <div className="container mx-auto px-6 h-18 py-3 flex items-center justify-between">
                    {systemLogo
                        ? <img src={systemLogo} alt="W-Tech" className="h-9 object-contain" />
                        : <span className="font-serif text-2xl tracking-tight">W-Tech <em className="text-yellow-700">Brasil</em></span>}
                    <button onClick={scrollToForm} className="bg-zinc-950 text-[#FAF7F1] px-6 py-2.5 rounded-full font-bold text-xs uppercase tracking-[0.18em] hover:bg-yellow-700 transition-colors">
                        {isFullOrDone ? 'Lista de Espera' : 'Reservar Vaga'}
                    </button>
                </div>
            </header>

            {/* HERO editorial */}
            <section className="pt-20 pb-16 border-b border-zinc-200">
                <div className="container mx-auto px-6">
                    <div className="max-w-5xl mx-auto text-center space-y-8">
                        <div className="flex items-center justify-center gap-4 text-[11px] font-bold uppercase tracking-[0.35em] text-zinc-400">
                            <span className="h-px w-12 bg-zinc-300" />
                            Edição Presencial · {lp.course?.city || 'Brasil'} · {dateLabel}
                            <span className="h-px w-12 bg-zinc-300" />
                        </div>
                        <h1 className="font-serif text-5xl md:text-8xl leading-[1.02] tracking-tight text-zinc-950">
                            {lp.title}
                        </h1>
                        <p className="text-xl md:text-2xl text-zinc-500 font-light leading-relaxed max-w-3xl mx-auto italic font-serif">
                            “{lp.subtitle}”
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
                            <button onClick={scrollToForm} className="bg-zinc-950 text-[#FAF7F1] px-10 py-4.5 py-4 rounded-full font-bold text-base uppercase tracking-[0.15em] hover:bg-yellow-700 hover:scale-[1.02] transition-all inline-flex items-center justify-center gap-3">
                                {isFullOrDone ? 'Entrar na Lista de Espera' : 'Reservar Minha Vaga'} <ArrowRight size={18} />
                            </button>
                        </div>
                        {!isFullOrDone && (
                            <p className={`text-xs font-bold uppercase tracking-[0.25em] ${spotsLeft <= 5 ? 'text-red-600' : 'text-yellow-700'}`}>
                                {spotsLeft <= 10 ? `Restam apenas ${spotsLeft} lugares` : 'Lugares limitados'}
                            </p>
                        )}
                    </div>

                    {/* Imagem hero em moldura editorial */}
                    {lp.heroImage && (
                        <figure className="max-w-5xl mx-auto mt-14">
                            <div className="aspect-[21/9] overflow-hidden rounded-sm">
                                <img src={lp.heroImage} alt={lp.title} className="w-full h-full object-cover" />
                            </div>
                            <figcaption className="text-center text-[11px] uppercase tracking-[0.3em] text-zinc-400 mt-4">Treinamento técnico presencial — metodologia W-Tech</figcaption>
                        </figure>
                    )}
                </div>
            </section>

            {/* INFO BAR editorial */}
            <div className="border-b border-zinc-200 bg-[#F4EFE6]/60">
                <div className="container mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 divide-x divide-zinc-200 text-center">
                    {[
                        { icon: Calendar, label: 'Data', value: dateLabel },
                        { icon: Clock, label: 'Horário', value: `${lp.course?.startTime || '08:00'} – ${lp.course?.endTime || '18:00'}` },
                        { icon: MapPin, label: 'Local', value: lp.course?.city || 'A definir' },
                        { icon: Users, label: 'Lugares', value: isFullOrDone ? 'Lista de espera' : `${spotsLeft} disponíveis` }
                    ].map((it, i) => (
                        <div key={i} className="px-4">
                            <it.icon size={18} className="mx-auto text-yellow-700 mb-2" />
                            <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-400">{it.label}</div>
                            <div className="text-sm font-bold text-zinc-900 mt-0.5">{it.value}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* SOBRE — duas colunas editoriais */}
            <section className="py-24">
                <div className="container mx-auto px-6 max-w-6xl grid lg:grid-cols-12 gap-14 items-start">
                    <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-28">
                        <div className="text-[11px] font-bold uppercase tracking-[0.35em] text-yellow-700">Capítulo 01 — O Treinamento</div>
                        <h2 className="font-serif text-4xl md:text-5xl leading-tight text-zinc-950">A arte e a engenharia da suspensão, ensinadas de perto.</h2>
                        <p className="text-zinc-500 text-lg leading-relaxed">
                            Dois dias imersivos, turma reduzida e bancada à sua frente. Você aprende o que separa
                            uma oficina comum de uma referência regional — e sai aplicando.
                        </p>
                    </div>
                    <div className="lg:col-span-7">
                        <div className="rounded-sm overflow-hidden border border-zinc-200 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.25)]">
                            {lp.videoUrl ? (
                                <div className="aspect-video bg-black">
                                    <iframe src={lp.videoUrl.replace('watch?v=', 'embed/')} className="w-full h-full" title="Vídeo do curso" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                                </div>
                            ) : (
                                <div className="aspect-video flex items-center justify-center bg-[#F4EFE6]"><Play size={48} className="text-zinc-300" /></div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* BENEFÍCIOS — lista editorial numerada */}
            {lp.benefits && lp.benefits.length > 0 && (
                <section className="py-24 border-y border-zinc-200 bg-white/60">
                    <div className="container mx-auto px-6 max-w-4xl">
                        <div className="text-center mb-14">
                            <div className="text-[11px] font-bold uppercase tracking-[0.35em] text-yellow-700 mb-3">Capítulo 02 — O Que Você Leva</div>
                            <h2 className="font-serif text-4xl md:text-5xl text-zinc-950">Benefícios de quem participa</h2>
                        </div>
                        <div className="divide-y divide-zinc-200">
                            {lp.benefits.map((b, i) => (
                                <div key={i} className="py-8 grid grid-cols-[70px_1fr] md:grid-cols-[110px_1fr] gap-6 items-start group">
                                    <div className="font-serif text-5xl md:text-6xl text-zinc-200 group-hover:text-yellow-700 transition-colors leading-none">{String(i + 1).padStart(2, '0')}</div>
                                    <div>
                                        <h3 className="font-bold text-xl text-zinc-950 mb-1.5">{b.title}</h3>
                                        <p className="text-zinc-500 leading-relaxed">{b.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* CRONOGRAMA */}
            {lp.course?.schedule && (
                <section className="py-24">
                    <div className="container mx-auto px-6 max-w-3xl">
                        <div className="text-center mb-10">
                            <div className="text-[11px] font-bold uppercase tracking-[0.35em] text-yellow-700 mb-3">Programação</div>
                            <h2 className="font-serif text-4xl text-zinc-950">Cronograma do curso</h2>
                        </div>
                        <div className="bg-white border border-zinc-200 rounded-sm p-8 md:p-12 shadow-sm">
                            <div className="prose prose-zinc max-w-none leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHtml(lp.course.schedule.replace(/\n/g, '<br/>')) }} />
                        </div>
                    </div>
                </section>
            )}

            {/* MÓDULOS — cards revista */}
            {lp.modules && lp.modules.length > 0 && (
                <section id="modules" className="py-24 border-y border-zinc-200 bg-[#F4EFE6]/50">
                    <div className="container mx-auto px-6">
                        <div className="text-center mb-14">
                            <div className="text-[11px] font-bold uppercase tracking-[0.35em] text-yellow-700 mb-3">Capítulo 03 — Conteúdo</div>
                            <h2 className="font-serif text-4xl md:text-5xl text-zinc-950">O que você vai dominar</h2>
                        </div>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-9 max-w-6xl mx-auto">
                            {lp.modules.map((mod, i) => (
                                <article key={i} className="bg-white border border-zinc-200 rounded-sm overflow-hidden group hover:shadow-[0_25px_50px_-20px_rgba(0,0,0,0.2)] hover:-translate-y-1 transition-all">
                                    {mod.image && (
                                        <div className="aspect-[4/3] overflow-hidden">
                                            <img src={mod.image} alt={mod.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                        </div>
                                    )}
                                    <div className="p-7">
                                        <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-yellow-700 mb-2">Módulo {String(i + 1).padStart(2, '0')}</div>
                                        <h3 className="font-serif text-2xl text-zinc-950 mb-2 leading-snug">{mod.title}</h3>
                                        <p className="text-zinc-500 text-sm leading-relaxed">{mod.description}</p>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* INSTRUTOR — perfil editorial */}
            <section className="py-24">
                <div className="container mx-auto px-6 max-w-5xl grid md:grid-cols-[320px_1fr] gap-12 items-center">
                    <div className="relative mx-auto">
                        <div className="absolute -bottom-4 -right-4 w-full h-full border border-yellow-700/50 rounded-sm" />
                        <div className="relative w-72 h-80 rounded-sm overflow-hidden">
                            <LPInstructorPhoto src={lp.instructorImage} name={lp.instructorName} theme="light" />
                        </div>
                    </div>
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-[0.35em] text-yellow-700 mb-3">Perfil — Seu Instrutor</div>
                        <h3 className="font-serif text-4xl md:text-5xl text-zinc-950 mb-5">{lp.instructorName}</h3>
                        <div className="text-zinc-500 text-lg leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHtml(lp.instructorBio?.replace(/\n/g, '<br/>') || '') }} />
                    </div>
                </div>
            </section>

            {/* DEPOIMENTOS — pull quotes */}
            {lp.testimonials && lp.testimonials.length > 0 && (
                <section className="py-24 border-y border-zinc-200 bg-white/60">
                    <div className="container mx-auto px-6 max-w-6xl">
                        <div className="text-center mb-14">
                            <div className="text-[11px] font-bold uppercase tracking-[0.35em] text-yellow-700 mb-3">Vozes</div>
                            <h2 className="font-serif text-4xl md:text-5xl text-zinc-950">O que dizem os alunos</h2>
                        </div>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-9">
                            {lp.testimonials.map((t, i) => {
                                const v = (t as any).videoUrl as string | undefined;
                                const yt = v ? (() => { const m = v.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/); return m && m[2].length === 11 ? m[2] : ''; })() : '';
                                return (
                                    <figure key={i} className="flex flex-col">
                                        {yt && (
                                            <div className="relative aspect-video mb-5 rounded-sm overflow-hidden cursor-pointer group border border-zinc-200" onClick={() => setActiveVideo(yt)}>
                                                <img src={`https://img.youtube.com/vi/${yt}/mqdefault.jpg`} className="w-full h-full object-cover" alt={t.name} />
                                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                                    <div className="w-12 h-12 bg-[#FAF7F1] text-zinc-950 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"><Play size={18} className="ml-0.5" /></div>
                                                </div>
                                            </div>
                                        )}
                                        <blockquote className="font-serif text-xl text-zinc-800 leading-relaxed flex-1">
                                            <span className="text-yellow-700 text-4xl leading-none align-top">“</span>{t.text}<span className="text-yellow-700">”</span>
                                        </blockquote>
                                        <figcaption className="flex items-center gap-3 mt-6 pt-5 border-t border-zinc-200">
                                            <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-100 flex items-center justify-center shrink-0">
                                                {t.image ? <img src={t.image} className="w-full h-full object-cover" alt={t.name} /> : <span className="font-bold text-yellow-700">{t.name[0]}</span>}
                                            </div>
                                            <div>
                                                <div className="font-bold text-sm text-zinc-900">{t.name}</div>
                                                <div className="flex gap-0.5">{[...Array(5)].map((_, j) => <Star key={j} size={10} className="fill-yellow-600 text-yellow-600" />)}</div>
                                            </div>
                                        </figcaption>
                                    </figure>
                                );
                            })}
                        </div>
                    </div>
                </section>
            )}

            {/* LOCAL */}
            <section className="py-24">
                <div className="container mx-auto px-6 max-w-6xl grid lg:grid-cols-2 gap-12 items-center">
                    <div className="space-y-6">
                        <div className="text-[11px] font-bold uppercase tracking-[0.35em] text-yellow-700">Endereço</div>
                        <h2 className="font-serif text-4xl md:text-5xl text-zinc-950">Onde acontece</h2>
                        <div>
                            <p className="text-xl font-medium text-zinc-900">{lp.course?.address || 'Endereço a confirmar'}</p>
                            <p className="text-zinc-500">{lp.course?.addressNeighborhood ? `${lp.course.addressNeighborhood}, ` : ''}{lp.course?.city} - {lp.course?.state}</p>
                        </div>
                        <a id="lp-v7-map-link" target="_blank" rel="noreferrer" href={lp.course?.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`} className="inline-flex items-center gap-2 text-yellow-700 font-bold uppercase text-xs tracking-[0.2em] hover:underline">
                            <Navigation size={15} /> Abrir no Google Maps
                        </a>
                        <div className="bg-[#F4EFE6] border border-yellow-700/30 rounded-sm p-5 flex items-center gap-4">
                            <AlertTriangle className="text-yellow-700 shrink-0" size={20} />
                            <p className="text-sm text-zinc-600"><strong className="block font-bold text-zinc-900">Turma intimista, por escolha.</strong> Limitamos os lugares para garantir atenção individual na prática.</p>
                        </div>
                    </div>
                    <div className="h-[380px] rounded-sm overflow-hidden border border-zinc-200">
                        <iframe width="100%" height="100%" src={`https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&t=&z=15&ie=UTF8&iwloc=&output=embed`} className="w-full h-full border-0" title="Mapa do local" />
                    </div>
                </div>
            </section>

            {/* FORM FINAL */}
            <section id="enroll-form" className="py-24 bg-[#F4EFE6]/70 border-t border-zinc-200">
                <div className="container mx-auto px-6">
                    <div className="max-w-2xl mx-auto text-center mb-12">
                        <div className="text-[11px] font-bold uppercase tracking-[0.35em] text-yellow-700 mb-3">Último capítulo</div>
                        <h2 className="font-serif text-4xl md:text-6xl text-zinc-950 mb-4">{isFullOrDone ? 'Lista de espera' : 'Reserve o seu lugar'}</h2>
                        <p className="text-zinc-500 text-lg">
                            {isFullOrDone
                                ? 'Esta edição esgotou. Deixe seus dados para a próxima turma da sua região.'
                                : 'Preencha abaixo — nossa equipe confirma os detalhes com você pelo WhatsApp.'}
                        </p>
                    </div>
                    <div className="max-w-xl mx-auto bg-white border border-zinc-200 rounded-sm p-8 md:p-12 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.25)]">
                        <LPEnrollForm
                            lp={lp} theme="light" checkoutAtivo={checkoutAtivo} isFullOrDone={isFullOrDone}
                            form={form} setForm={setForm} paymentType={paymentType} setPaymentType={setPaymentType}
                            submitted={submitted} setSubmitted={setSubmitted} handleSubmit={handleSubmit}
                            whatsappGlobal={whatsappGlobal}
                        />
                    </div>
                    <div className="text-center mt-8">
                        <a id="lp-v7-whatsapp-footer-link" href={waLink} target="_blank" rel="noopener noreferrer" className="text-zinc-400 text-sm font-medium hover:text-yellow-700 transition-colors">
                            Prefere conversar primeiro? Fale conosco no WhatsApp →
                        </a>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-10 text-center text-zinc-400 text-xs uppercase tracking-[0.25em] border-t border-zinc-200 bg-[#FAF7F1]">
                <p>© {new Date().getFullYear()} W-Tech Brasil</p>
                <div className="flex justify-center gap-6 mt-3">
                    <a href="/termos" className="hover:text-zinc-900 transition-colors">Termos</a>
                    <a href="/privacidade" className="hover:text-zinc-900 transition-colors">Privacidade</a>
                </div>
            </footer>

            {/* Floating CTA mobile */}
            {showFloatingCTA && (
                <div className="fixed bottom-0 left-0 w-full z-40 bg-[#FAF7F1]/95 backdrop-blur border-t border-zinc-200 py-3.5 px-5 md:hidden flex items-center justify-between">
                    <div className="text-sm font-bold truncate max-w-[160px] font-serif">{lp.title}</div>
                    <button onClick={scrollToForm} className="bg-zinc-950 text-[#FAF7F1] px-5 py-2.5 rounded-full font-bold text-xs uppercase tracking-[0.18em]">
                        {isFullOrDone ? 'Lista' : 'Reservar'}
                    </button>
                </div>
            )}

            {/* Modal de vídeo */}
            {activeVideo && (
                <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
                    <div className="absolute inset-0" onClick={() => setActiveVideo(null)} />
                    <div className="bg-black w-full max-w-4xl aspect-video relative z-10 rounded-sm overflow-hidden">
                        <button onClick={() => setActiveVideo(null)} className="absolute top-3 right-3 z-20 text-white hover:text-wtech-gold bg-black/60 w-10 h-10 rounded-full flex items-center justify-center"><X size={20} /></button>
                        <iframe src={`https://www.youtube.com/embed/${activeVideo}?autoplay=1`} className="w-full h-full" title="Depoimento em vídeo" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                    </div>
                </div>
            )}
        </div>
    );
};

export default LandingPageViewerV7;
