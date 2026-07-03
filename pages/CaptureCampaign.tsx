/**
 * Página pública das Campanhas de Captura — /captura/:slug
 *
 * Renderiza a campanha conforme o template. A mecânica principal (template
 * "ferramenta" + gamification "race") é a enquete gamificada: cada opção é
 * uma motinha numa pista; a posição de cada moto acompanha a porcentagem de
 * votos da enquete rumo à linha de chegada.
 *
 * Fluxo: voto → formulário (nome, e-mail, WhatsApp + consentimento LGPD)
 * → lead salvo em SITE_CaptureLeads (isolado da campanha) → corrida ao vivo.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Flag, MapPin, CheckCircle2, Loader2, Share2, Lock } from 'lucide-react';
import SEO from '../components/SEO';
import { captureTrackingParams } from '../lib/tracking';
import {
    CaptureCampaign, PollResult,
    fetchCampaignBySlug, fetchPollResults, submitCaptureLead,
} from '../lib/captureCampaigns';

const VOTED_KEY_PREFIX = 'wtech_captura_voted_';

// ─── Pista de corrida (gamificação) ──────────────────────────────────────────

const RaceTrack = ({ results }: { results: PollResult[] }) => {
    const maxVotes = Math.max(1, ...results.map(r => r.votes));
    const sorted = [...results].sort((a, b) => b.votes - a.votes);
    const leader = sorted[0];

    return (
        <div className="space-y-4">
            {results.map(result => {
                // Progresso relativo ao líder: o 1º lugar encosta na bandeirada.
                const progress = result.votes > 0 ? (result.votes / maxVotes) * 100 : 0;
                const isLeader = result.votes > 0 && result.option === leader.option;
                return (
                    <div key={result.option} className="relative">
                        <div className="flex items-center justify-between mb-1 px-1">
                            <span className={`font-display font-bold uppercase tracking-wider text-sm ${isLeader ? 'text-wtech-gold' : 'text-gray-300'}`}>
                                {result.option}
                                {isLeader && <span className="ml-2 text-[10px] bg-wtech-gold text-black px-2 py-0.5 rounded-full align-middle">LIDERANDO</span>}
                            </span>
                            <span className="text-xs text-gray-400 font-mono">
                                {result.percentage}% · {result.votes} {result.votes === 1 ? 'voto' : 'votos'}
                            </span>
                        </div>

                        {/* Pista */}
                        <div className="relative h-12 rounded-xl bg-[#161616] border border-white/10 overflow-hidden">
                            {/* Faixa central tracejada */}
                            <div
                                className="absolute inset-x-3 top-1/2 h-0.5 -translate-y-1/2 opacity-30"
                                style={{ backgroundImage: 'repeating-linear-gradient(90deg, #999 0 14px, transparent 14px 26px)' }}
                            />
                            {/* Rastro de progresso */}
                            <motion.div
                                className={`absolute inset-y-0 left-0 ${isLeader ? 'bg-wtech-gold/15' : 'bg-white/5'}`}
                                initial={{ width: 0 }}
                                animate={{ width: `calc(${Math.max(progress, 2)}% )` }}
                                transition={{ duration: 1.2, ease: 'easeOut' }}
                            />
                            {/* Motinha */}
                            <motion.div
                                className="absolute top-1/2 -translate-y-1/2 text-2xl z-10"
                                style={{ filter: isLeader ? 'drop-shadow(0 0 6px rgba(212,175,55,0.8))' : 'none' }}
                                initial={{ left: '2%' }}
                                animate={{ left: `calc(${2 + Math.max(progress, 0) * 0.78}% )` }}
                                transition={{ duration: 1.4, ease: 'easeOut' }}
                            >
                                🏍️
                            </motion.div>
                            {/* Linha de chegada */}
                            <div className="absolute right-0 inset-y-0 w-8 flex items-center justify-center border-l-2 border-dashed border-white/25 bg-[repeating-conic-gradient(#222_0_25%,#444_0_50%)] bg-[length:8px_8px]">
                                <Flag size={14} className="text-white/70" />
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// ─── Formulário de captura ───────────────────────────────────────────────────

interface CaptureFormProps {
    campaign: CaptureCampaign;
    vote?: string;
    onDone: () => void;
}

const CaptureForm = ({ campaign, vote, onDone }: CaptureFormProps) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [consent, setConsent] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!name.trim() || !phone.trim()) { setError('Preencha nome e WhatsApp.'); return; }
        if (!consent) { setError('É preciso autorizar o contato para participar.'); return; }
        setSubmitting(true);
        try {
            await submitCaptureLead({
                campaignId: campaign.id,
                name, email, phone, vote,
                consent,
            });
            try { localStorage.setItem(`${VOTED_KEY_PREFIX}${campaign.id}`, vote || 'ok'); } catch { /* modo privado */ }
            onDone();
        } catch (err) {
            console.error('[Captura] Falha ao registrar:', err);
            setError('Não foi possível registrar. Tente novamente.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {vote && (
                <div className="flex items-center gap-2 bg-wtech-gold/10 border border-wtech-gold/40 rounded-xl px-4 py-3 text-wtech-gold text-sm font-bold">
                    <MapPin size={16} /> Seu voto: {vote}
                </div>
            )}
            <input
                type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="Seu nome" required
                className="w-full bg-[#161616] border border-white/15 rounded-xl px-4 py-3.5 text-white placeholder-gray-500 focus:border-wtech-gold focus:outline-none transition-colors"
            />
            <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="Seu melhor e-mail"
                className="w-full bg-[#161616] border border-white/15 rounded-xl px-4 py-3.5 text-white placeholder-gray-500 focus:border-wtech-gold focus:outline-none transition-colors"
            />
            <input
                type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="WhatsApp com DDD" required
                className="w-full bg-[#161616] border border-white/15 rounded-xl px-4 py-3.5 text-white placeholder-gray-500 focus:border-wtech-gold focus:outline-none transition-colors"
            />
            <label className="flex items-start gap-3 text-xs text-gray-400 cursor-pointer select-none">
                <input
                    type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}
                    className="mt-0.5 accent-[#D4AF37]"
                />
                <span>
                    Autorizo a W-Tech Brasil a entrar em contato por WhatsApp e e-mail com novidades
                    sobre esta campanha e os cursos. (LGPD)
                </span>
            </label>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
                type="submit" disabled={submitting}
                id={`captura-submit-${campaign.slug}`}
                className="w-full bg-wtech-gold text-black font-display font-bold uppercase tracking-wider py-4 rounded-xl hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
                {submitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                {submitting ? 'Registrando...' : (campaign.config.cta || 'Confirmar')}
            </button>
            <p className="flex items-center justify-center gap-1.5 text-[11px] text-gray-500">
                <Lock size={11} /> Seus dados ficam seguros e não são compartilhados.
            </p>
        </form>
    );
};

// ─── Página ──────────────────────────────────────────────────────────────────

const CaptureCampaignPage = () => {
    const { slug } = useParams<{ slug: string }>();
    const [campaign, setCampaign] = useState<CaptureCampaign | null>(null);
    const [loading, setLoading] = useState(true);
    const [results, setResults] = useState<PollResult[]>([]);
    const [step, setStep] = useState<'vote' | 'form' | 'result'>('vote');
    const [selectedOption, setSelectedOption] = useState<string>('');

    const options = useMemo(() => campaign?.config.options || [], [campaign]);
    const isPoll = campaign?.type === 'quiz' || campaign?.type === 'enquete';
    const isEnded = campaign?.status === 'ended' ||
        (!!campaign?.ends_at && new Date(campaign.ends_at).getTime() < Date.now());

    useEffect(() => {
        // LEI 10: persiste UTMs/atribuição na sessão logo ao carregar a página.
        captureTrackingParams();

        if (!slug) return;
        let cancelled = false;
        (async () => {
            try {
                const found = await fetchCampaignBySlug(slug);
                if (cancelled) return;
                setCampaign(found);
                if (found && (found.type === 'quiz' || found.type === 'enquete')) {
                    const opts = found.config.options || [];
                    const poll = await fetchPollResults(found.id, opts);
                    if (!cancelled) setResults(poll);
                    // Já votou nesta campanha? Vai direto para a corrida.
                    let voted = false;
                    try { voted = !!localStorage.getItem(`${VOTED_KEY_PREFIX}${found.id}`); } catch { /* ignore */ }
                    const ended = found.status === 'ended' ||
                        (!!found.ends_at && new Date(found.ends_at).getTime() < Date.now());
                    if (!cancelled && (voted || ended)) setStep('result');
                }
            } catch (err) {
                console.error('[Captura] Falha ao carregar campanha:', err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [slug]);

    const refreshResults = async () => {
        if (!campaign) return;
        try {
            setResults(await fetchPollResults(campaign.id, options));
        } catch (err) {
            console.error('[Captura] Falha ao atualizar resultados:', err);
        }
    };

    const handleShare = async () => {
        const url = window.location.href.split('?')[0];
        const text = `Vote comigo: ${campaign?.config.headline || campaign?.name} 🏍️ ${url}`;
        try {
            if (navigator.share) { await navigator.share({ title: campaign?.name, text, url }); return; }
        } catch { /* usuário cancelou */ }
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-wtech-black flex items-center justify-center">
                <Loader2 size={36} className="text-wtech-gold animate-spin" />
            </div>
        );
    }

    if (!campaign || campaign.status === 'draft') {
        return (
            <div className="min-h-screen bg-wtech-black flex flex-col items-center justify-center text-center px-6">
                <Flag size={48} className="text-gray-600 mb-4" />
                <h1 className="text-2xl font-display font-bold text-white uppercase">Campanha não encontrada</h1>
                <p className="text-gray-500 mt-2">Este link não está mais ativo ou a campanha ainda não foi publicada.</p>
            </div>
        );
    }

    const headline = campaign.config.headline || campaign.name;

    return (
        <div className="min-h-screen bg-wtech-black text-white">
            <SEO title={campaign.name} description={campaign.description || headline} />

            {/* Topo */}
            <header className="border-b border-white/10">
                <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
                    <span className="font-display font-black text-xl tracking-wider">
                        W-TECH <span className="text-wtech-gold">BRASIL</span>
                    </span>
                    <span className="text-[10px] uppercase tracking-widest text-gray-500 border border-white/15 rounded-full px-3 py-1">
                        {isEnded ? 'Campanha encerrada' : 'Campanha ao vivo'}
                    </span>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-6 py-10 md:py-16 space-y-10">
                {/* Hero */}
                <div className="text-center space-y-4">
                    <motion.h1
                        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                        className="text-3xl md:text-5xl font-display font-black uppercase leading-tight"
                    >
                        {headline}
                    </motion.h1>
                    {campaign.config.subheadline && (
                        <p className="text-gray-400 max-w-xl mx-auto">{campaign.config.subheadline}</p>
                    )}
                </div>

                {/* Transição entre passos SEM AnimatePresence/mode="wait" (trava o exit
                    com rAF throttled — mesmo bug já documentado no QuizSuspensao).
                    Cada passo é um motion.section keyed: só animação de entrada. */}
                <div>
                    {/* Passo 1 — voto */}
                    {isPoll && step === 'vote' && !isEnded && (
                        <motion.section
                            key="vote"
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        >
                            <h2 className="text-center font-display font-bold uppercase tracking-wider text-wtech-gold mb-6">
                                {campaign.config.question || 'Escolha sua opção'}
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {options.map(option => (
                                    <button
                                        key={option}
                                        onClick={() => { setSelectedOption(option); setStep('form'); }}
                                        className="group relative bg-[#141414] border border-white/10 hover:border-wtech-gold rounded-2xl p-6 text-left transition-all hover:-translate-y-0.5"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-3xl group-hover:animate-pulse">🏍️</span>
                                            <div>
                                                <p className="font-display font-bold text-lg uppercase">{option}</p>
                                                <p className="text-xs text-gray-500 group-hover:text-wtech-gold transition-colors">Votar nesta cidade →</p>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </motion.section>
                    )}

                    {/* Passo 2 — formulário */}
                    {isPoll && step === 'form' && (
                        <motion.section
                            key="form"
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                            className="max-w-md mx-auto bg-[#101010] border border-white/10 rounded-2xl p-6 md:p-8"
                        >
                            <button onClick={() => setStep('vote')} className="text-xs text-gray-500 hover:text-white mb-4 transition-colors">
                                ← Trocar cidade
                            </button>
                            <h2 className="font-display font-bold text-xl uppercase mb-5">Confirme seu voto</h2>
                            <CaptureForm
                                campaign={campaign}
                                vote={selectedOption}
                                onDone={async () => { await refreshResults(); setStep('result'); }}
                            />
                        </motion.section>
                    )}

                    {/* Passo 3 — corrida / resultados */}
                    {isPoll && step === 'result' && (
                        <motion.section
                            key="result"
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                            className="space-y-8"
                        >
                            {!isEnded && (
                                <div className="text-center bg-wtech-gold/10 border border-wtech-gold/30 rounded-2xl px-6 py-4">
                                    <p className="text-wtech-gold font-bold">
                                        {campaign.config.success_message || 'Voto registrado! Acompanhe a corrida.'}
                                    </p>
                                </div>
                            )}
                            <div className="bg-[#101010] border border-white/10 rounded-2xl p-5 md:p-8">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="font-display font-bold uppercase tracking-wider flex items-center gap-2">
                                        <Flag size={18} className="text-wtech-gold" /> Corrida das cidades
                                    </h2>
                                    <span className="text-xs text-gray-500 font-mono">
                                        {results.reduce((sum, r) => sum + r.votes, 0)} votos
                                    </span>
                                </div>
                                <RaceTrack results={results} />
                            </div>
                            {!isEnded && (
                                <button
                                    onClick={handleShare}
                                    id={`captura-share-${campaign.slug}`}
                                    className="w-full max-w-md mx-auto flex items-center justify-center gap-2 border border-wtech-gold text-wtech-gold font-display font-bold uppercase tracking-wider py-3.5 rounded-xl hover:bg-wtech-gold hover:text-black transition-all"
                                >
                                    <Share2 size={16} /> Convocar a galera da sua cidade
                                </button>
                            )}
                        </motion.section>
                    )}

                    {/* Template formulário simples (sem enquete) */}
                    {!isPoll && step !== 'result' && !isEnded && (
                        <motion.section
                            key="simple-form"
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                            className="max-w-md mx-auto bg-[#101010] border border-white/10 rounded-2xl p-6 md:p-8"
                        >
                            <CaptureForm campaign={campaign} onDone={() => setStep('result')} />
                        </motion.section>
                    )}
                    {!isPoll && step === 'result' && (
                        <motion.section
                            key="simple-done"
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                            className="text-center bg-wtech-gold/10 border border-wtech-gold/30 rounded-2xl px-6 py-8 max-w-md mx-auto"
                        >
                            <CheckCircle2 size={40} className="text-wtech-gold mx-auto mb-3" />
                            <p className="text-wtech-gold font-bold">
                                {campaign.config.success_message || 'Cadastro confirmado! Em breve entraremos em contato.'}
                            </p>
                        </motion.section>
                    )}
                </div>
            </main>

            <footer className="border-t border-white/10 py-6 text-center text-xs text-gray-600">
                © {new Date().getFullYear()} W-Tech Brasil · Todos os direitos reservados
            </footer>
        </div>
    );
};

export default CaptureCampaignPage;
