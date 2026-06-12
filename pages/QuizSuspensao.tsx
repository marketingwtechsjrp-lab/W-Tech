import React, { useState, useEffect, useMemo, useRef, Suspense, lazy } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
    ArrowRight,
    ArrowLeft,
    CheckCircle,
    CheckCircle2,
    ShieldCheck,
    Zap,
    Bike,
    Mountain,
    Wrench,
    Settings,
    Play,
    Target,
    Crosshair,
    Gauge,
    Activity,
    DollarSign,
    TrendingUp,
    AlertTriangle,
    Star,
    Quote,
    ChevronRight,
    Trophy,
    Flame,
} from 'lucide-react';
import { handleLeadUpsert } from '../lib/leadDistribution';
import { sendWhatsAppMessage } from '../lib/whatsapp';
import { trackEvent } from '../components/AnalyticsTracker';
import { Marquee } from '../components/ui/marquee';
import SEO from '../components/SEO';
import ErrorBoundary from '../components/ErrorBoundary';

// Shader pesado: só monta na tela de resultado (sob demanda)
const AnimatedShaderBackground = lazy(() => import('../components/ui/animated-shader-background'));

/* ─────────────────────────────────────────────────────────────
 *  CONSTANTES DE NEGÓCIO
 * ──────────────────────────────────────────────────────────── */
const CHECKOUT_URL = 'https://pay.kiwify.com.br/19v4nIa';
const VSL_URL = 'https://niesvylxwfaffgnmdoql.supabase.co/storage/v1/object/public/site-assets/vsl-suspensao.mp4';
const VSL_POSTER = '/images/vsl-thumbnail.webp';
// Instância Evolution dedicada ao suporte do curso (não-UUID → usada direto pela lib)
const SUPPORT_INSTANCE = 'wtech-suporte-curso';
// Dono do lead no CRM (mesmo usado na fila de espera) — evita crash de FK
const CRM_OWNER_ID = '407d09b8-8205-4697-a726-1738cf7e20ef';

/* Captura parâmetros de atribuição (UTM/ads) da URL — pra rastrear a origem
   da venda no Kiwify e no CRM. Lê tanto query string quanto hash (SPA). */
const getAttributionParams = (): Record<string, string> => {
    if (typeof window === 'undefined') return {};
    const hashQuery = window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '';
    const sp = new URLSearchParams(window.location.search || hashQuery);
    const out: Record<string, string> = {};
    sp.forEach((val, k) => {
        if (val) out[k] = val;
    });
    return out;
};

/* Monta a URL do checkout preservando a atribuição + marcando a origem do quiz. */
const buildCheckoutUrl = (attribution: Record<string, string>, track: Track): string => {
    const p = new URLSearchParams(attribution);
    if (!p.has('utm_source')) p.set('utm_source', 'quiz');
    if (!p.has('utm_medium')) p.set('utm_medium', 'site');
    p.set('utm_content', `quiz_${track}`);
    return `${CHECKOUT_URL}?${p.toString()}`;
};

type Track = 'piloto' | 'mecanico';

interface QuizOption {
    id: string;
    label: string;
    desc?: string;
    icon: React.ReactNode;
    /* Define a trilha do funil — só usado na pergunta de segmentação */
    track?: Track;
}

interface QuizStep {
    id: string;
    /* Etiqueta curta exibida no topo */
    eyebrow: string;
    question: string;
    hint?: string;
    options: QuizOption[];
}

/* ─────────────────────────────────────────────────────────────
 *  CONTEÚDO DO QUIZ (ramificado por trilha)
 * ──────────────────────────────────────────────────────────── */

// Passo 1 — Segmentação (comum). Define a trilha.
const STEP_SEGMENT: QuizStep = {
    id: 'segmento',
    eyebrow: 'Vamos começar',
    question: 'Como você se identifica hoje?',
    hint: 'Isso personaliza todo o seu diagnóstico.',
    options: [
        { id: 'piloto_amador', label: 'Piloto Amador', desc: 'Ando por hobby/fim de semana e quero evoluir', icon: <Bike size={26} />, track: 'piloto' },
        { id: 'trilha_enduro', label: 'Trilheiro / Enduro', desc: 'Encaro terreno pesado, subidas e saltos', icon: <Mountain size={26} />, track: 'piloto' },
        { id: 'mecanico', label: 'Mecânico / Preparador', desc: 'Trabalho com motos e quero agregar suspensão', icon: <Wrench size={26} />, track: 'mecanico' },
        { id: 'dono_oficina', label: 'Dono de Oficina', desc: 'Tenho equipe e quero um diferencial competitivo', icon: <Settings size={26} />, track: 'mecanico' },
    ],
};

// Passos ramificados por trilha
const STEPS_BY_TRACK: Record<Track, QuizStep[]> = {
    piloto: [
        {
            id: 'dor',
            eyebrow: 'Sua realidade',
            question: 'O que MAIS te incomoda na moto hoje?',
            hint: 'Escolha o que pesa mais.',
            options: [
                { id: 'bracos', label: 'Meus braços cansam rápido', desc: 'Fadiga e dor antes da hora', icon: <Activity size={24} /> },
                { id: 'quica', label: 'A moto "quica" e espalha', desc: 'Sem aderência, insegura', icon: <Zap size={24} /> },
                { id: 'tracao', label: 'Perco tração nas subidas', desc: 'A traseira escapa, a frente sobe', icon: <Mountain size={24} /> },
                { id: 'comecar', label: 'Não sei nem por onde começar', desc: 'Quantos cliques? Que SAG?', icon: <Target size={24} /> },
            ],
        },
        {
            id: 'terreno',
            eyebrow: 'Seu terreno',
            question: 'Onde você mais pilota?',
            options: [
                { id: 'trilha', label: 'Trilha / Enduro', icon: <Mountain size={24} /> },
                { id: 'motocross', label: 'Motocross / Pista', icon: <Flame size={24} /> },
                { id: 'hard', label: 'Hard Enduro', icon: <Trophy size={24} /> },
                { id: 'variado', label: 'Um pouco de tudo', icon: <Bike size={24} /> },
            ],
        },
        {
            id: 'nivel',
            eyebrow: 'Seu nível técnico',
            question: 'Quanto você entende de SAG, cliques e hidráulica?',
            hint: 'Seja honesto — o curso te atende em qualquer nível.',
            options: [
                { id: 'zero', label: 'Praticamente nada', desc: 'Nunca regulei sozinho', icon: <AlertTriangle size={24} /> },
                { id: 'basico', label: 'O básico', desc: 'Já ouvi falar, mexo no escuro', icon: <Gauge size={24} /> },
                { id: 'intermediario', label: 'Intermediário', desc: 'Mexo, mas sem método', icon: <Settings size={24} /> },
                { id: 'avancado', label: 'Já mexo bastante', desc: 'Quero refinar e ter precisão', icon: <Crosshair size={24} /> },
            ],
        },
        {
            id: 'custo',
            eyebrow: 'O que isso já te custou',
            question: 'Qual dessas situações você já viveu?',
            options: [
                { id: 'exausto', label: 'Terminei a trilha exausto', desc: 'Antes mesmo do percurso acabar', icon: <Activity size={24} /> },
                { id: 'susto', label: 'Quase caí por insegurança', desc: 'A moto não respondeu', icon: <AlertTriangle size={24} /> },
                { id: 'peca', label: 'Gastei com peça errada', desc: 'Sem resolver o problema real', icon: <DollarSign size={24} /> },
                { id: 'nunca', label: 'Nunca acertei de verdade', desc: 'Vivo no "tentativa e erro"', icon: <Target size={24} /> },
            ],
        },
        {
            id: 'objetivo',
            eyebrow: 'Onde você quer chegar',
            question: 'Qual o seu maior objetivo?',
            options: [
                { id: 'autonomia', label: 'Regular sozinho qualquer terreno', desc: 'Independência total', icon: <Crosshair size={24} /> },
                { id: 'conforto', label: 'Acabar com a dor e a fadiga', desc: 'Pilotar com prazer de novo', icon: <ShieldCheck size={24} /> },
                { id: 'confianca', label: 'Mais controle e confiança', desc: 'Atacar sem medo', icon: <Zap size={24} /> },
                { id: 'performance', label: 'Performance de verdade', desc: 'Extrair o máximo da moto', icon: <Trophy size={24} /> },
            ],
        },
    ],
    mecanico: [
        {
            id: 'dor',
            eyebrow: 'Sua realidade',
            question: 'O que MAIS limita seu faturamento hoje?',
            hint: 'Escolha o que mais te trava.',
            options: [
                { id: 'so_revisao', label: 'Só faço revisão básica', desc: 'Serviço de baixo valor agregado', icon: <Wrench size={24} /> },
                { id: 'perde_cliente', label: 'Perco serviço de suspensão', desc: 'Cliente vai pra concorrência', icon: <TrendingUp size={24} /> },
                { id: 'cobrar', label: 'Não sei precificar acerto', desc: 'Cobro pouco ou nem ofereço', icon: <DollarSign size={24} /> },
                { id: 'tecnica', label: 'Falta domínio técnico', desc: 'Insegurança no SAG e nos cliques', icon: <Target size={24} /> },
            ],
        },
        {
            id: 'terreno',
            eyebrow: 'Seu foco',
            question: 'Que tipo de serviço você quer DOMINAR?',
            options: [
                { id: 'regulagem', label: 'Regulagem (SAG e cliques)', icon: <Gauge size={24} /> },
                { id: 'revalvulacao', label: 'Revalvulação', icon: <Settings size={24} /> },
                { id: 'preparacao', label: 'Preparação completa', icon: <Wrench size={24} /> },
                { id: 'competicao', label: 'Atender pilotos de competição', icon: <Trophy size={24} /> },
            ],
        },
        {
            id: 'nivel',
            eyebrow: 'Seu nível técnico',
            question: 'Hoje, quanto você domina de suspensão Off-Road?',
            hint: 'Seja honesto — o curso te leva do zero ao profissional.',
            options: [
                { id: 'zero', label: 'Praticamente nada', desc: 'Nunca fiz acerto de suspensão', icon: <AlertTriangle size={24} /> },
                { id: 'basico', label: 'O básico', desc: 'Faço troca de óleo/retentor', icon: <Gauge size={24} /> },
                { id: 'intermediario', label: 'Intermediário', desc: 'Faço regulagem, mas sem método', icon: <Settings size={24} /> },
                { id: 'avancado', label: 'Já mexo bastante', desc: 'Quero virar referência', icon: <Crosshair size={24} /> },
            ],
        },
        {
            id: 'custo',
            eyebrow: 'O que isso já te custou',
            question: 'Qual dessas situações você já viveu?',
            options: [
                { id: 'mandou', label: 'Mandei cliente pra concorrente', desc: 'Por não fazer o serviço', icon: <TrendingUp size={24} /> },
                { id: 'deixou', label: 'Deixei dinheiro na mesa', desc: 'Serviço premium que não ofereci', icon: <DollarSign size={24} /> },
                { id: 'retrabalho', label: 'Tive retrabalho / reclamação', desc: 'Acerto que não ficou bom', icon: <AlertTriangle size={24} /> },
                { id: 'estagnado', label: 'Faturamento estagnado', desc: 'Só serviço de baixo valor', icon: <Activity size={24} /> },
            ],
        },
        {
            id: 'objetivo',
            eyebrow: 'Onde você quer chegar',
            question: 'Qual o seu maior objetivo?',
            options: [
                { id: 'referencia', label: 'Ser referência na região', desc: 'A oficina que todo piloto indica', icon: <Trophy size={24} /> },
                { id: 'faturar', label: 'Faturar mais por serviço', desc: 'Cobrar acerto premium', icon: <DollarSign size={24} /> },
                { id: 'fila', label: 'Ter fila de clientes', desc: 'Demanda constante e fiel', icon: <TrendingUp size={24} /> },
                { id: 'entrega', label: 'Entregar acerto personalizado', desc: 'Resultado que o cliente sente', icon: <Crosshair size={24} /> },
            ],
        },
    ],
};

/* ─────────────────────────────────────────────────────────────
 *  PROVA SOCIAL (reaproveitada da LP, segmentada)
 * ──────────────────────────────────────────────────────────── */
const TESTIMONIALS: Record<Track, { name: string; role: string; text: string }[]> = {
    piloto: [
        { name: 'Ricardo F.', role: 'Piloto Amador — SP', text: 'Depois do curso, finalmente ajustei os cliques e o SAG pro meu peso. Chega de tomar solavanco e ceder nas trilhas. Moto grudada no chão!' },
        { name: 'Tiago L.', role: 'Piloto de Enduro — PR', text: 'As ladeiras com cavas não são mais problema. A dianteira me dá confiança nas curvas e a tração é constante.' },
        { name: 'Juliana M.', role: 'Pilota Hard Enduro — RJ', text: 'Eu achava minhas molas macias demais, mas a hidráulica estava zerada. Entender esse casamento virou a chave da minha tocada.' },
    ],
    mecanico: [
        { name: 'Marcos S.', role: 'Mecânico — MG', text: 'Comecei a oferecer regulagem e setup de suspensão na oficina. Ganhei novos clientes que antes buscavam fora. O retorno foi imenso.' },
        { name: 'Anderson P.', role: 'Dono de Oficina — GO', text: 'Hoje cobro acerto de suspensão como serviço premium. Virou a parte mais lucrativa da minha oficina.' },
        { name: 'Fábio J.', role: 'Mecânico Preparador — SP', text: 'Saí da revisão básica e entrei no mundo das bengalas e revalvulação. Outro patamar de faturamento.' },
    ],
};

/* ─────────────────────────────────────────────────────────────
 *  RESULTADO PERSONALIZADO
 * ──────────────────────────────────────────────────────────── */
const RESULT_COPY: Record<Track, {
    badge: string;
    title: React.ReactNode;
    diagnosis: string;
    solves: { icon: React.ReactNode; text: string }[];
}> = {
    piloto: {
        badge: 'Diagnóstico do Piloto',
        title: <>Você está deixando <span className="text-wtech-gold">performance e segurança</span> na mesa</>,
        diagnosis: 'O que você sente na moto não é falta de preparo físico — é suspensão fora do ponto. SAG, molas, cliques e hidráulica desajustados pro SEU peso e terreno cobram o preço em fadiga, insegurança e tração perdida. A boa notícia: tudo isso é regulável, e você pode aprender a fazer sozinho.',
        solves: [
            { icon: <Crosshair size={20} />, text: 'Regular SAG, molas e cliques pro seu peso e terreno — do zero' },
            { icon: <ShieldCheck size={20} />, text: 'Acabar com a fadiga e a dor: a moto trabalha, não você' },
            { icon: <Zap size={20} />, text: 'Mais controle, tração e confiança em qualquer chão' },
            { icon: <Trophy size={20} />, text: 'Replicar o acerto em qualquer moto, em qualquer lugar' },
        ],
    },
    mecanico: {
        badge: 'Diagnóstico do Profissional',
        title: <>Tem <span className="text-wtech-gold">faturamento parado</span> na sua bancada</>,
        diagnosis: 'O acerto de suspensão é o serviço mais lucrativo da oficina — e é exatamente o que escapa pra concorrência quando falta método. Dominar SAG, cliques, hidráulica e revalvulação te coloca em outro patamar: você entrega um acerto que o piloto SENTE, cobra premium por isso e cria uma base de clientes fiel.',
        solves: [
            { icon: <DollarSign size={20} />, text: 'Agregar o serviço mais lucrativo: acerto e preparação de suspensão' },
            { icon: <Crosshair size={20} />, text: 'Entregar acerto personalizado que o cliente sente na hora' },
            { icon: <TrendingUp size={20} />, text: 'Cobrar premium e parar de mandar serviço pra concorrência' },
            { icon: <Trophy size={20} />, text: 'Virar a referência de suspensão Off-Road na sua região' },
        ],
    },
};

/* ─────────────────────────────────────────────────────────────
 *  COMPONENTE PRINCIPAL
 * ──────────────────────────────────────────────────────────── */
const QuizSuspensao: React.FC = () => {
    const prefersReduced = useReducedMotion();
    const animate = !prefersReduced;

    /* Estado da máquina de etapas
       index 0          → tela de boas-vindas
       1 .. totalQ      → perguntas (1ª é segmentação)
       'vsl'            → vídeo antes do resultado
       'form'           → captura de lead
       'analyzing'      → barra de progresso "gerando diagnóstico"
       'result'         → resultado + oferta */
    const [phase, setPhase] = useState<'welcome' | 'questions' | 'vsl' | 'form' | 'analyzing' | 'result'>('welcome');
    const [qIndex, setQIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, { value: string; label: string }>>({});
    const [track, setTrack] = useState<Track | null>(null);

    // Sequência de perguntas montada dinamicamente após escolher a trilha
    const steps: QuizStep[] = useMemo(() => {
        if (!track) return [STEP_SEGMENT];
        return [STEP_SEGMENT, ...STEPS_BY_TRACK[track]];
    }, [track]);

    const currentStep = steps[qIndex];
    const progress = Math.round(((qIndex + 1) / (1 + 5)) * 100); // 1 segmentação + 5 perguntas

    // Chave única da tela atual — muda a cada pergunta p/ disparar a transição
    const screenKey = phase === 'questions' && currentStep ? `q-${currentStep.id}-${qIndex}` : phase;

    // Atribuição de marketing (UTM/ads) capturada uma vez na montagem
    const attribution = useMemo(getAttributionParams, []);

    const topRef = useRef<HTMLDivElement>(null);
    const scrollTop = () => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    const selectOption = (opt: QuizOption) => {
        const step = currentStep;
        setAnswers(prev => ({ ...prev, [step.id]: { value: opt.id, label: opt.label } }));

        // Telemetria de funil (fire-and-forget): mostra onde o lead abandona
        if (step.id === 'segmento') trackEvent('Quiz', 'segment', opt.label);
        else trackEvent('Quiz', `answer_${step.id}`, opt.label);

        // Pergunta de segmentação define a trilha
        if (step.id === 'segmento' && opt.track) {
            setTrack(opt.track);
        }

        // Avança após um respiro pra dar feedback visual da seleção
        window.setTimeout(() => {
            const lastQuestionIndex = (opt.track ? 1 + STEPS_BY_TRACK[opt.track].length : steps.length) - 1;
            if (qIndex >= lastQuestionIndex) {
                setPhase('vsl');
            } else {
                setQIndex(i => i + 1);
            }
            scrollTop();
        }, animate ? 280 : 0);
    };

    const goBack = () => {
        if (phase === 'form') { setPhase('vsl'); scrollTop(); return; }
        if (phase === 'vsl') { setPhase('questions'); scrollTop(); return; }
        if (qIndex > 0) { setQIndex(i => i - 1); scrollTop(); }
        else { setPhase('welcome'); }
    };

    const startQuiz = () => { trackEvent('Quiz', 'start'); setPhase('questions'); scrollTop(); };

    return (
        <div ref={topRef} className="min-h-screen bg-[#050505] text-white selection:bg-wtech-gold selection:text-black font-sans overflow-x-hidden">
            <SEO
                title="Quiz: Descubra o Acerto Ideal da Sua Suspensão | W-Tech"
                description="Responda 6 perguntas rápidas e receba um diagnóstico personalizado de suspensão Off-Road — pra piloto ou mecânico. Curso W-Tech com prática real."
            />

            {/* Barra de progresso fixa (some na análise, no resultado e na welcome) */}
            {phase !== 'result' && phase !== 'welcome' && phase !== 'analyzing' && (
                <div className="sticky top-0 z-50 bg-[#050505]/90 backdrop-blur-md border-b border-white/5">
                    <div className="container mx-auto px-6 py-3 max-w-3xl">
                        <div className="flex items-center gap-4">
                            <button onClick={goBack} className="text-gray-500 hover:text-white transition-colors shrink-0" aria-label="Voltar">
                                <ArrowLeft size={20} />
                            </button>
                            <div
                                className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden"
                                role="progressbar"
                                aria-label="Progresso do quiz"
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={phase === 'questions' ? progress : phase === 'vsl' ? 90 : 100}
                            >
                                <motion.div
                                    className="h-full bg-gradient-to-r from-wtech-gold to-yellow-500"
                                    initial={false}
                                    animate={{ width: `${phase === 'questions' ? progress : phase === 'vsl' ? 90 : 100}%` }}
                                    transition={{ duration: animate ? 0.4 : 0, ease: 'easeOut' }}
                                />
                            </div>
                            <span className="text-[11px] font-black text-wtech-gold tabular-nums shrink-0">
                                {phase === 'questions' ? `${qIndex + 1}/6` : phase === 'vsl' ? '6/6' : '✓'}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Transição entre telas SEM AnimatePresence/mode="wait".
                O motion.div é keyed por tela: ao mudar a key o React desmonta a
                anterior e monta a nova IMEDIATAMENTE (no DOM), tocando só a
                animação de entrada. Não há exit a "esperar", então nada trava
                caso o rAF seja throttled (aba em background) — o que evitaria
                perder o lead no meio do funil.

                ErrorBoundary externo: se QUALQUER tela quebrar, em vez de tela
                branca o usuário vê um fallback que ainda leva ao checkout. */}
            <ErrorBoundary fallback={<QuizCrashFallback checkoutUrl={buildCheckoutUrl(attribution, track ?? 'piloto')} />}>
                <motion.div
                    key={screenKey}
                    initial={{ opacity: 0, y: animate ? 12 : 0 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: animate ? 0.25 : 0, ease: 'easeOut' }}
                >
                    {phase === 'welcome' && (
                        <WelcomeScreen animate={animate} onStart={startQuiz} />
                    )}
                    {phase === 'questions' && currentStep && (
                        <QuestionScreen
                            step={currentStep}
                            selected={answers[currentStep.id]?.value}
                            onSelect={selectOption}
                            animate={animate}
                        />
                    )}
                    {phase === 'vsl' && (
                        <VslScreen
                            animate={animate}
                            track={track}
                            onContinue={() => { setPhase('form'); scrollTop(); }}
                        />
                    )}
                    {phase === 'form' && track && (
                        <LeadFormScreen
                            animate={animate}
                            track={track}
                            answers={answers}
                            attribution={attribution}
                            onDone={() => { setPhase('analyzing'); scrollTop(); }}
                        />
                    )}
                    {phase === 'analyzing' && track && (
                        <AnalyzingScreen
                            animate={animate}
                            track={track}
                            onComplete={() => { setPhase('result'); scrollTop(); }}
                        />
                    )}
                    {phase === 'result' && track && (
                        <ResultScreen animate={animate} track={track} answers={answers} attribution={attribution} />
                    )}
                </motion.div>
            </ErrorBoundary>
        </div>
    );
};

/* ─────────────────────────────────────────────────────────────
 *  FALLBACK DE CRASH — nunca deixa o usuário sem o caminho de compra
 * ──────────────────────────────────────────────────────────── */
const QuizCrashFallback: React.FC<{ checkoutUrl: string }> = ({ checkoutUrl }) => (
    <section className="min-h-[80vh] flex items-center justify-center px-6 py-16 text-center">
        <div className="max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-wtech-gold/10 border border-wtech-gold/30 text-wtech-gold flex items-center justify-center mx-auto mb-6">
                <ShieldCheck size={32} />
            </div>
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight mb-3">
                Seu diagnóstico está <span className="text-wtech-gold">pronto</span>
            </h2>
            <p className="text-gray-400 text-sm md:text-base mb-8">
                Tivemos um probleminha ao montar a tela, mas a sua condição de lançamento do
                <strong className="text-white"> Curso de Regulagem de Suspensão</strong> está garantida.
            </p>
            <a
                href={checkoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                id="quiz-fallback-checkout-btn"
                onClick={() => trackEvent('Quiz', 'checkout_click', 'fallback')}
                className="inline-flex items-center justify-center gap-2 w-full bg-gradient-to-r from-[#ba1d18] to-[#E6241D] text-white px-8 py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:brightness-110 transition-all shadow-xl"
            >
                Garantir Minha Vaga — 12x R$ 34,70 <ArrowRight strokeWidth={3} size={18} />
            </a>
            <p className="text-gray-600 text-xs mt-4">ou R$ 347,00 à vista · Garantia de 7 dias</p>
        </div>
    </section>
);

/* ─────────────────────────────────────────────────────────────
 *  TELA: BOAS-VINDAS
 * ──────────────────────────────────────────────────────────── */
const WelcomeScreen: React.FC<{ animate: boolean; onStart: () => void }> = ({ animate, onStart }) => (
    <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: animate ? 0.4 : 0 }}
        className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
        {/* BG hero */}
        <div className="absolute inset-0 z-0">
            <picture>
                <source media="(min-width: 768px)" srcSet="/hero-desktop-alex.webp" type="image/webp" />
                <img src="/hero-mobile-alex.webp" alt="" className="absolute inset-0 w-full h-full object-cover object-top" />
            </picture>
            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-black/85 to-black/70 z-10" />
            <div className="absolute inset-0 bg-black/40 z-10" />
        </div>

        <div className="container mx-auto px-6 relative z-20 py-20 text-center max-w-2xl">
            <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="inline-flex items-center gap-2 border border-wtech-gold/30 bg-wtech-gold/10 backdrop-blur-md px-4 py-1.5 rounded-full mb-7"
            >
                <Zap size={14} className="text-wtech-gold animate-pulse" />
                <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-wtech-gold">Diagnóstico Gratuito — 60 segundos</span>
            </motion.div>

            <motion.h1
                initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
                className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-[0.92] mb-6 drop-shadow-2xl"
            >
                Descubra o <span className="text-transparent bg-clip-text bg-gradient-to-r from-wtech-gold via-yellow-400 to-amber-600">Acerto Ideal</span> da Sua Suspensão
            </motion.h1>

            <motion.p
                initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }}
                className="text-base md:text-lg text-gray-300 leading-relaxed mb-9 max-w-xl mx-auto"
            >
                Responda <strong className="text-white">6 perguntas rápidas</strong> e receba um diagnóstico personalizado — seja você <strong className="text-wtech-gold">piloto</strong> querendo dominar o acerto, ou <strong className="text-wtech-gold">mecânico</strong> querendo faturar mais com suspensão.
            </motion.p>

            <motion.button
                initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.34 }}
                onClick={onStart}
                whileHover={animate ? { scale: 1.03, boxShadow: '0 0 40px rgba(212,175,55,0.4)' } : undefined}
                whileTap={animate ? { scale: 0.97 } : undefined}
                className="group bg-gradient-to-r from-wtech-gold to-yellow-600 text-black px-10 py-5 rounded-2xl font-black text-sm md:text-base uppercase tracking-[0.12em] inline-flex items-center justify-center gap-3 shadow-[0_0_40px_rgba(212,175,55,0.2)] hover:brightness-110 transition-all"
            >
                Começar Meu Diagnóstico
                <ArrowRight strokeWidth={3} size={20} className="group-hover:translate-x-1 transition-transform" />
            </motion.button>

            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-8 text-[11px] font-bold uppercase tracking-widest text-gray-500"
            >
                <span className="flex items-center gap-2"><CheckCircle size={14} className="text-wtech-gold" /> 100% Gratuito</span>
                <span className="flex items-center gap-2"><CheckCircle size={14} className="text-wtech-gold" /> +3.000 Alunos</span>
                <span className="flex items-center gap-2"><CheckCircle size={14} className="text-wtech-gold" /> Resultado Imediato</span>
            </motion.div>
        </div>
    </motion.section>
);

/* ─────────────────────────────────────────────────────────────
 *  TELA: PERGUNTA
 * ──────────────────────────────────────────────────────────── */
const QuestionScreen: React.FC<{
    step: QuizStep;
    selected?: string;
    onSelect: (opt: QuizOption) => void;
    animate: boolean;
}> = ({ step, selected, onSelect, animate }) => (
    <motion.section
        initial={{ opacity: 0, x: animate ? 40 : 0 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: animate ? -40 : 0 }}
        transition={{ duration: animate ? 0.3 : 0, ease: 'easeOut' }}
        className="container mx-auto px-6 py-10 md:py-16 max-w-3xl"
    >
        <span className="text-wtech-gold font-black uppercase tracking-[0.3em] text-[10px] md:text-xs">{step.eyebrow}</span>
        <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tight mt-3 mb-2 leading-tight">{step.question}</h2>
        {step.hint && <p className="text-gray-500 text-sm mb-8">{step.hint}</p>}
        {!step.hint && <div className="mb-8" />}

        <div className="grid gap-3 md:gap-4">
            {step.options.map((opt, i) => {
                const isSelected = selected === opt.id;
                return (
                    <motion.button
                        key={opt.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: animate ? i * 0.06 : 0 }}
                        onClick={() => onSelect(opt)}
                        whileHover={animate ? { scale: 1.015 } : undefined}
                        whileTap={animate ? { scale: 0.99 } : undefined}
                        className={`group flex items-center gap-4 md:gap-5 p-5 md:p-6 rounded-2xl border text-left transition-all ${
                            isSelected
                                ? 'border-wtech-gold bg-wtech-gold/10 shadow-[0_0_30px_rgba(212,175,55,0.2)]'
                                : 'border-white/10 bg-zinc-900/50 hover:border-wtech-gold/40 hover:bg-zinc-900/80'
                        }`}
                    >
                        <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                            isSelected ? 'bg-wtech-gold text-black' : 'bg-wtech-gold/10 text-wtech-gold group-hover:bg-wtech-gold/20'
                        }`}>
                            {opt.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-black text-white text-base md:text-lg leading-tight">{opt.label}</h3>
                            {opt.desc && <p className="text-gray-400 text-xs md:text-sm mt-0.5 leading-snug">{opt.desc}</p>}
                        </div>
                        <ChevronRight
                            size={22}
                            className={`shrink-0 transition-all ${isSelected ? 'text-wtech-gold translate-x-1' : 'text-gray-600 group-hover:text-wtech-gold group-hover:translate-x-1'}`}
                        />
                    </motion.button>
                );
            })}
        </div>
    </motion.section>
);

/* ─────────────────────────────────────────────────────────────
 *  TELA: VSL
 * ──────────────────────────────────────────────────────────── */
const VslScreen: React.FC<{
    animate: boolean;
    track: Track | null;
    onContinue: () => void;
}> = ({ animate, track, onContinue }) => {
    const [playing, setPlaying] = useState(false);
    const [activated, setActivated] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    // Telemetria: a VSL foi exibida
    useEffect(() => { trackEvent('Quiz', 'vsl_view', track ?? 'desconhecido'); }, [track]);

    const play = () => {
        setActivated(true);
        trackEvent('Quiz', 'vsl_play', track ?? 'desconhecido');
        requestAnimationFrame(() => {
            if (videoRef.current) {
                videoRef.current.load();
                videoRef.current.play().catch(() => {});
                setPlaying(true);
            }
        });
    };

    return (
        <motion.section
            initial={{ opacity: 0, y: animate ? 30 : 0 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: animate ? 0.35 : 0 }}
            className="container mx-auto px-6 py-10 md:py-16 max-w-3xl text-center"
        >
            <span className="text-wtech-gold font-black uppercase tracking-[0.3em] text-[10px] md:text-xs">Quase lá — assista antes do resultado</span>
            <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tight mt-3 mb-3 leading-tight">
                Veja Como o Acerto <span className="text-wtech-gold">Muda Tudo</span>
            </h2>
            <p className="text-gray-400 text-sm md:text-base mb-8 max-w-xl mx-auto">
                {track === 'mecanico'
                    ? 'Em 2 minutos você entende por que o acerto de suspensão é o serviço mais lucrativo — e o mais procurado — de uma oficina Off-Road.'
                    : 'Em 2 minutos você entende por que a sua suspensão muda da água pro vinho quando o acerto é feito do jeito certo.'}
            </p>

            <div
                className="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.6)] bg-black group cursor-pointer mb-8"
                onClick={!playing ? play : undefined}
            >
                <video
                    ref={videoRef}
                    poster={VSL_POSTER}
                    controls={playing}
                    playsInline
                    preload="none"
                    className="w-full h-full object-cover"
                    onPlay={() => setPlaying(true)}
                    onPause={() => setPlaying(false)}
                >
                    {activated && <source src={VSL_URL} type="video/mp4" />}
                    Seu navegador não suporta vídeos.
                </video>
                {!playing && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition-colors z-20">
                        <div className="relative">
                            <div className="absolute inset-0 bg-wtech-gold/40 rounded-full animate-ping scale-150 opacity-20" />
                            <div className="relative w-20 h-20 bg-wtech-gold rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(212,175,55,0.6)] group-hover:scale-110 transition-transform">
                                <Play fill="black" size={32} className="text-black ml-1" />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <motion.button
                onClick={onContinue}
                whileHover={animate ? { scale: 1.02, boxShadow: '0 0 30px rgba(212,175,55,0.35)' } : undefined}
                whileTap={animate ? { scale: 0.98 } : undefined}
                className="group bg-gradient-to-r from-wtech-gold to-yellow-600 text-black px-9 py-5 rounded-2xl font-black text-sm md:text-base uppercase tracking-[0.12em] inline-flex items-center justify-center gap-3 hover:brightness-110 transition-all w-full sm:w-auto"
            >
                Ver Meu Diagnóstico
                <ArrowRight strokeWidth={3} size={20} className="group-hover:translate-x-1 transition-transform" />
            </motion.button>
        </motion.section>
    );
};

/* ─────────────────────────────────────────────────────────────
 *  TELA: CAPTURA DE LEAD
 * ──────────────────────────────────────────────────────────── */
const maskPhone = (value: string): string => {
    const d = value.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 2) return d.length ? `(${d}` : '';
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

const buildWhatsAppMessage = (
    name: string,
    track: Track,
    answers: Record<string, { value: string; label: string }>,
): string => {
    const firstName = name.trim().split(' ')[0] || name;
    const dor = answers['dor']?.label?.toLowerCase() ?? '';
    const objetivo = answers['objetivo']?.label?.toLowerCase() ?? '';
    const terreno = answers['terreno']?.label ?? '';

    if (track === 'mecanico') {
        return `Olá, ${firstName}! Tudo bem? 🛠️\n\n` +
            `Aqui é o *Suporte oficial da W-Tech*. Recebemos o seu diagnóstico de suspensão aqui no nosso sistema.\n\n` +
            `Pelo seu perfil, vi que hoje *${dor}* e que o seu objetivo é *${objetivo}*.\n\n` +
            `O acerto de suspensão é o serviço mais lucrativo da oficina — e é exatamente o que você domina no *Curso de Regulagem de Suspensão* (foco: ${terreno}). Você passa a entregar acerto premium, cobrar mais e fidelizar o cliente que hoje vai pra concorrência.\n\n` +
            `➡️ Sua condição de lançamento (de R$997 por *12x R$34,70* ou *R$347 à vista*) está liberada aqui:\n${CHECKOUT_URL}\n\n` +
            `Qualquer dúvida, é só me chamar por aqui. Bora faturar mais com suspensão! 🚀`;
    }

    return `Olá, ${firstName}! Tudo bem? 🏁\n\n` +
        `Aqui é o *Suporte oficial da W-Tech*. Recebemos o seu diagnóstico de suspensão aqui no nosso sistema.\n\n` +
        `Pelo seu perfil (${terreno}), vi que o que mais te incomoda hoje é *${dor}* e que você quer *${objetivo}*.\n\n` +
        `A boa notícia: isso tem solução — e é exatamente o que você aprende no *Curso de Regulagem de Suspensão Para Piloto* (do SAG aos cliques, com prática real na moto).\n\n` +
        `➡️ Sua condição de lançamento (de R$997 por *12x R$34,70* ou *R$347 à vista*) está liberada aqui:\n${CHECKOUT_URL}\n\n` +
        `Qualquer dúvida, é só me chamar por aqui. Bora acertar essa moto! 🛠️`;
};

const LeadFormScreen: React.FC<{
    animate: boolean;
    track: Track;
    answers: Record<string, { value: string; label: string }>;
    attribution: Record<string, string>;
    onDone: () => void;
}> = ({ animate, track, answers, attribution, onDone }) => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Telemetria: o lead chegou na etapa de captura
    useEffect(() => { trackEvent('Quiz', 'form_view', track); }, [track]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const digits = phone.replace(/\D/g, '');
        if (name.trim().length < 2) { setError('Digite seu nome.'); return; }
        if (digits.length < 10) { setError('Digite um WhatsApp válido com DDD.'); return; }

        setError('');
        setLoading(true);

        // Conversão de lead — evento-chave do funil (GA4 + Supabase)
        trackEvent('Quiz', 'lead', track);

        // quiz_data: snapshot completo das respostas + atribuição (coluna jsonb já existe)
        const quizData = {
            track,
            respostas: Object.fromEntries(Object.entries(answers).map(([k, v]) => [k, v.label])),
            atribuicao: attribution,
            concluido_em: new Date().toISOString(),
        };

        // Persistência em BACKGROUND: a tela de análise (barra de %) cobre o
        // tempo de UX, então não bloqueamos a transição. Falhas apenas logam.
        handleLeadUpsert({
            name: name.trim(),
            phone,
            type: 'Quiz_Suspension',
            status: 'New',
            context_id: 'Quiz_Suspensao_Piloto',
            origin: attribution.utm_source || 'quiz-suspensao',
            tags: ['Quiz_Suspensao', track === 'piloto' ? 'Perfil_Piloto' : 'Perfil_Mecanico'],
            assigned_to: CRM_OWNER_ID,
            quiz_data: quizData,
        }).catch(err => console.error('[Quiz] Falha ao salvar lead:', err));

        sendWhatsAppMessage(phone, buildWhatsAppMessage(name, track, answers), SUPPORT_INSTANCE)
            .catch(err => console.error('[Quiz] Falha no disparo WhatsApp:', err));

        // Vai imediatamente pra tela de análise (barra de progresso em tempo real)
        onDone();
    };

    return (
        <motion.section
            initial={{ opacity: 0, y: animate ? 30 : 0 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: animate ? 0.35 : 0 }}
            className="container mx-auto px-6 py-10 md:py-16 max-w-xl"
        >
            <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-wtech-gold to-amber-600 text-black flex items-center justify-center mx-auto mb-5 shadow-[0_0_30px_rgba(212,175,55,0.3)]">
                    <CheckCircle2 size={32} />
                </div>
                <span className="text-wtech-gold font-black uppercase tracking-[0.3em] text-[10px] md:text-xs">Seu diagnóstico está pronto</span>
                <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tight mt-3 mb-3 leading-tight">
                    Pra Onde Enviamos o Seu <span className="text-wtech-gold">Resultado</span>?
                </h2>
                <p className="text-gray-400 text-sm md:text-base max-w-md mx-auto">
                    Liberamos o diagnóstico + a sua <strong className="text-white">condição de lançamento</strong> no WhatsApp. Sem spam — só o que importa.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Seu Nome</label>
                    <input
                        type="text"
                        required
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-wtech-gold/50 focus:border-wtech-gold transition-all"
                        placeholder="Ex: João da Silva"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">WhatsApp (com DDD)</label>
                    <input
                        type="tel"
                        required
                        value={phone}
                        onChange={e => setPhone(maskPhone(e.target.value))}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-wtech-gold/50 focus:border-wtech-gold transition-all"
                        placeholder="(00) 00000-0000"
                    />
                </div>

                {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <p className="text-red-400 text-xs text-center font-bold">{error}</p>
                    </div>
                )}

                <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={animate && !loading ? { scale: 1.02 } : undefined}
                    whileTap={animate && !loading ? { scale: 0.98 } : undefined}
                    className="group w-full bg-gradient-to-r from-wtech-gold to-yellow-600 text-black font-black py-5 px-6 rounded-2xl flex items-center justify-center gap-3 uppercase tracking-[0.1em] text-sm transition-all hover:brightness-110 disabled:opacity-60 shadow-[0_0_30px_rgba(212,175,55,0.25)]"
                >
                    {loading ? 'Gerando diagnóstico...' : 'Ver Meu Resultado Agora'}
                    {!loading && <ArrowRight strokeWidth={3} size={18} className="group-hover:translate-x-1 transition-transform" />}
                </motion.button>

                <p className="text-center text-[10px] text-gray-500 uppercase font-black tracking-widest flex items-center justify-center gap-2">
                    <ShieldCheck size={12} /> Seus dados estão seguros e criptografados
                </p>
            </form>
        </motion.section>
    );
};

/* ─────────────────────────────────────────────────────────────
 *  TELA: ANÁLISE (barra de progresso em tempo real)
 * ──────────────────────────────────────────────────────────── */
const AnalyzingScreen: React.FC<{
    animate: boolean;
    track: Track;
    onComplete: () => void;
}> = ({ animate, track, onComplete }) => {
    const [pct, setPct] = useState(0);
    const onCompleteRef = useRef(onComplete);
    onCompleteRef.current = onComplete;

    // Progresso baseado em tempo real (Date.now): mesmo que o setInterval seja
    // throttled em aba de fundo, a % salta pro valor correto e SEMPRE conclui —
    // nunca trava o funil.
    useEffect(() => {
        const DURATION = 3800; // ms até 100%
        const start = Date.now();
        const id = window.setInterval(() => {
            const elapsed = Date.now() - start;
            const p = Math.min(100, Math.round((elapsed / DURATION) * 100));
            setPct(p);
            if (p >= 100) {
                window.clearInterval(id);
                window.setTimeout(() => onCompleteRef.current(), 550); // respiro no 100%
            }
        }, 40);
        return () => window.clearInterval(id);
    }, []);

    // Rótulo da etapa conforme a % avança (um deles é específico da trilha)
    const stages = [
        { at: 0, label: 'Analisando as suas respostas...' },
        { at: 28, label: 'Calculando o SAG e os cliques ideais...' },
        { at: 55, label: track === 'mecanico' ? 'Montando seu plano de faturamento...' : 'Cruzando com o seu terreno e nível...' },
        { at: 82, label: 'Finalizando seu diagnóstico personalizado...' },
    ];
    const currentLabel = [...stages].reverse().find(s => pct >= s.at)?.label ?? stages[0].label;

    // Checklist que vai marcando conforme processa
    const checks = [
        { at: 25, label: 'Respostas analisadas' },
        { at: 55, label: 'Acerto ideal calculado' },
        { at: 85, label: 'Diagnóstico montado' },
    ];

    return (
        <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: animate ? 0.3 : 0 }}
            className="min-h-[80vh] flex items-center justify-center px-6 py-16"
        >
            <div className="w-full max-w-md text-center">
                {/* Engrenagem girando (tema mecânica) */}
                <div className="relative w-20 h-20 mx-auto mb-8">
                    <div className="absolute inset-0 rounded-full bg-wtech-gold/15 blur-xl" />
                    <div className="relative w-20 h-20 rounded-2xl bg-wtech-gold/10 border border-wtech-gold/30 flex items-center justify-center text-wtech-gold">
                        <Settings size={36} className={animate ? 'animate-spin' : ''} style={{ animationDuration: '2.4s' }} />
                    </div>
                </div>

                <span className="text-wtech-gold font-black uppercase tracking-[0.3em] text-[10px] md:text-xs">Gerando seu diagnóstico</span>

                {/* Porcentagem em tempo real */}
                <div className="text-6xl md:text-7xl font-black tracking-tighter my-4 tabular-nums">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-wtech-gold via-yellow-400 to-amber-600">{pct}%</span>
                </div>

                {/* Barra */}
                <div className="h-3 bg-zinc-800 rounded-full overflow-hidden mb-6" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Gerando diagnóstico">
                    <div
                        className="h-full bg-gradient-to-r from-wtech-gold to-yellow-500 transition-[width] duration-100 ease-linear"
                        style={{ width: `${pct}%` }}
                    />
                </div>

                {/* Rótulo dinâmico da etapa */}
                <p className="text-gray-300 text-sm md:text-base font-medium mb-8 h-6 transition-all">{currentLabel}</p>

                {/* Checklist progressivo */}
                <div className="space-y-3 text-left max-w-xs mx-auto">
                    {checks.map((c) => {
                        const done = pct >= c.at;
                        return (
                            <div key={c.label} className={`flex items-center gap-3 transition-all duration-300 ${done ? 'opacity-100' : 'opacity-35'}`}>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${done ? 'bg-wtech-gold text-black' : 'bg-zinc-800 text-gray-600'}`}>
                                    {done
                                        ? <CheckCircle size={14} strokeWidth={3} />
                                        : <div className="w-2 h-2 rounded-full bg-gray-600" />}
                                </div>
                                <span className={`text-sm font-semibold ${done ? 'text-white' : 'text-gray-500'}`}>{c.label}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </motion.section>
    );
};

/* ─────────────────────────────────────────────────────────────
 *  TELA: RESULTADO + OFERTA
 * ──────────────────────────────────────────────────────────── */
const ResultScreen: React.FC<{
    animate: boolean;
    track: Track;
    answers: Record<string, { value: string; label: string }>;
    attribution: Record<string, string>;
}> = ({ animate, track, answers, attribution }) => {
    const copy = RESULT_COPY[track];
    const testimonials = TESTIMONIALS[track];
    const checkoutUrl = buildCheckoutUrl(attribution, track);

    // Telemetria: o resultado foi exibido (topo do funil de compra)
    useEffect(() => { trackEvent('Quiz', 'result_view', track); }, [track]);

    // Timer de escassez (7 min), igual à LP
    const [timeLeft, setTimeLeft] = useState(7 * 60);
    useEffect(() => {
        if (timeLeft <= 0) return;
        const t = setInterval(() => setTimeLeft(p => (p > 0 ? p - 1 : 0)), 1000);
        return () => clearInterval(t);
    }, [timeLeft]);
    const mm = String(Math.floor(timeLeft / 60)).padStart(2, '0');
    const ss = String(timeLeft % 60).padStart(2, '0');

    const goCheckout = () => {
        trackEvent('Quiz', 'checkout_click', track);
        window.open(checkoutUrl, '_blank');
    };
    const objetivo = answers['objetivo']?.label ?? '';

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: animate ? 0.4 : 0 }}
        >
            {/* ── Diagnóstico ── */}
            <section className="container mx-auto px-6 pt-12 pb-16 md:pt-16 max-w-3xl text-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
                    className="inline-flex items-center gap-2 border border-wtech-gold/30 bg-wtech-gold/10 px-4 py-1.5 rounded-full mb-6"
                >
                    <Trophy size={14} className="text-wtech-gold" />
                    <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-wtech-gold">{copy.badge}</span>
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
                    className="text-3xl md:text-5xl font-black uppercase tracking-tighter leading-[0.95] mb-6"
                >
                    {copy.title}
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }}
                    className="text-gray-300 text-base md:text-lg leading-relaxed mb-10 max-w-2xl mx-auto"
                >
                    {copy.diagnosis}
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}
                    className="grid sm:grid-cols-2 gap-3 text-left max-w-2xl mx-auto"
                >
                    {copy.solves.map((s, i) => (
                        <div key={i} className="flex items-start gap-3 p-4 bg-zinc-900/60 border border-white/5 rounded-xl">
                            <div className="w-9 h-9 rounded-lg bg-wtech-gold/10 text-wtech-gold flex items-center justify-center shrink-0">{s.icon}</div>
                            <span className="text-gray-300 text-sm font-medium leading-snug pt-1">{s.text}</span>
                        </div>
                    ))}
                </motion.div>

                {objetivo && (
                    <p className="text-gray-500 text-sm mt-8">
                        Seu objetivo declarado: <strong className="text-wtech-gold">{objetivo}</strong>. O curso foi desenhado exatamente pra isso. 👇
                    </p>
                )}
            </section>

            {/* ── Prova social ── */}
            <section className="py-10 bg-black border-y border-white/5">
                <div className="text-center mb-8">
                    <span className="text-wtech-gold font-black uppercase tracking-[0.3em] text-[10px] md:text-xs">Quem já fez, recomenda</span>
                </div>
                <div className="w-full max-w-5xl mx-auto">
                    <Marquee speed={40} className="py-2">
                        {testimonials.map((t, i) => (
                            <div key={i} className="bg-zinc-900/40 backdrop-blur-sm border border-white/5 rounded-2xl p-7 relative w-[300px] md:w-[380px] shrink-0">
                                <Quote size={28} className="text-wtech-gold/10 absolute top-5 right-5" />
                                <div className="flex items-center gap-1 mb-3">
                                    {[...Array(5)].map((_, j) => <Star key={j} size={13} className="text-wtech-gold fill-wtech-gold" />)}
                                </div>
                                <p className="text-gray-300 text-sm leading-relaxed mb-5 italic whitespace-normal">"{t.text}"</p>
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-wtech-gold/10 flex items-center justify-center text-wtech-gold font-black text-sm shrink-0">{t.name[0]}</div>
                                    <div className="whitespace-normal">
                                        <p className="font-bold text-white text-sm">{t.name}</p>
                                        <p className="text-gray-400 text-xs">{t.role}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </Marquee>
                </div>
            </section>

            {/* ── Oferta + CTA ── */}
            <section className="relative overflow-hidden bg-black py-16 md:py-24 flex items-center justify-center min-h-[80vh]">
                {/* Fundo animado é enfeite: se o WebGL falhar, cai pra null SEM
                    derrubar a oferta (que é o que importa nesta tela). */}
                <ErrorBoundary fallback={null}>
                    <Suspense fallback={null}>
                        <AnimatedShaderBackground />
                    </Suspense>
                </ErrorBoundary>

                <div className="container mx-auto px-6 relative z-10 flex justify-center">
                    <div className="w-full max-w-3xl bg-[#0a0a0a]/90 backdrop-blur-xl border border-[#E6241D]/20 rounded-2xl relative shadow-[0_0_120px_rgba(230,36,29,0.15)] overflow-hidden p-8 md:p-12 text-center">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#E6241D]/15 blur-[100px] rounded-full pointer-events-none" />
                        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-red-600 via-[#E6241D] to-orange-500 z-10" />

                        <div className="flex justify-center mb-7">
                            <img src="/images/modulos/logo-branca.webp" alt="W-Tech" loading="lazy" className="h-10 object-contain" />
                        </div>

                        <span className="text-wtech-gold font-bold uppercase tracking-[0.2em] text-[10px] md:text-xs block mb-4">
                            Condição de Lançamento — Liberada Pra Você
                        </span>
                        <h2 className="text-2xl md:text-4xl font-black text-white mb-3 tracking-tight">
                            {track === 'mecanico' ? 'Domine o Serviço Mais Lucrativo' : 'Regule Sua Suspensão Do Zero'}
                        </h2>
                        <p className="text-gray-400 text-sm mb-7 max-w-lg mx-auto">
                            11 módulos técnicos + Módulo Bônus com Paschoalin + Planilhas de Regulagem. Acesso por 1 ano.
                        </p>

                        <div className="text-gray-400 font-bold uppercase text-xs md:text-sm tracking-[0.15em] mb-2 line-through decoration-red-500/70 decoration-2">
                            De R$ 997,00 por
                        </div>
                        <div className="mb-1">
                            <span className="text-4xl md:text-6xl font-black text-white tracking-tighter drop-shadow-lg">12x R$ 34,70</span>
                        </div>
                        <div className="text-wtech-red/90 font-bold text-xs md:text-sm mb-8">ou R$ 347,00 à vista no Pix/Cartão</div>

                        {/* Timer */}
                        <div className="flex items-center justify-center gap-3 mb-8">
                            {[{ v: mm, l: 'Minutos' }, { v: ss, l: 'Segundos' }].map((t, i) => (
                                <React.Fragment key={t.l}>
                                    {i === 1 && <span className="text-2xl font-black text-[#E6241D]/50 -mt-6 animate-pulse">:</span>}
                                    <div className="flex flex-col items-center">
                                        <div className="bg-[#111] border border-[#E6241D]/30 rounded-xl w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center text-3xl font-black text-[#E6241D] shadow-[inset_0_0_15px_rgba(230,36,29,0.2)]">{t.v}</div>
                                        <span className="text-[9px] sm:text-[10px] text-gray-500 uppercase tracking-widest mt-2 font-bold">{t.l}</span>
                                    </div>
                                </React.Fragment>
                            ))}
                        </div>

                        <div className="grid sm:grid-cols-2 gap-y-4 gap-x-2 max-w-xl mx-auto mb-9 text-left">
                            {[
                                '1 Ano de Acesso ao Curso',
                                'Conteúdo 100% em Vídeo',
                                'Certificado de Conclusão W-Tech',
                                'Suporte Técnico na Plataforma',
                                'BÔNUS: Planilha de Regulagem de SAG',
                                'BÔNUS: Planilha de Regulagem de PSI',
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <CheckCircle size={16} className={i >= 4 ? 'text-wtech-gold shrink-0' : 'text-[#E6241D] shrink-0'} />
                                    <span className={`text-xs sm:text-sm ${i >= 4 ? 'text-gray-300 font-bold' : 'text-gray-300 font-medium'}`}>{item}</span>
                                </div>
                            ))}
                        </div>

                        <div className="inline-flex items-center gap-2.5 bg-wtech-gold/10 border border-wtech-gold/40 rounded-full px-5 py-2.5 mb-6">
                            <ShieldCheck size={18} className="text-wtech-gold shrink-0" />
                            <span className="text-wtech-gold font-black uppercase text-[11px] sm:text-xs tracking-widest">Garantia Incondicional de 7 Dias</span>
                        </div>

                        <motion.a
                            href={checkoutUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            id="quiz-checkout-btn"
                            onClick={() => trackEvent('Quiz', 'checkout_click', track)}
                            whileHover={animate ? { scale: 1.02, boxShadow: '0 0 40px rgba(230,36,29,0.5)' } : undefined}
                            whileTap={animate ? { scale: 0.98 } : undefined}
                            className="group w-full max-w-xl mx-auto bg-gradient-to-r from-[#ba1d18] to-[#E6241D] hover:from-[#d1221c] hover:to-[#ff2820] text-white px-8 py-5 sm:py-6 rounded-2xl font-black text-sm md:text-[15px] uppercase tracking-widest transition-all mb-3 shadow-xl relative overflow-hidden flex justify-center items-center"
                        >
                            <div className="absolute inset-0 w-full h-full bg-white/10 -translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
                            <span className="relative z-10">
                                {track === 'mecanico' ? 'Quero Faturar Mais Com Suspensão' : 'Quero Regular Minha Suspensão Agora'}
                            </span>
                        </motion.a>
                        <p className="text-gray-600 text-xs">Acesso imediato após a confirmação do pagamento</p>
                    </div>
                </div>
            </section>

            {/* pb extra no mobile p/ não ficar atrás do CTA sticky */}
            <footer className="py-10 pb-28 md:pb-10 bg-[#050505] text-center border-t border-white/5">
                <img src="/logo-wtech-branca.webp" alt="W-Tech" className="h-8 mx-auto mb-5 opacity-50" />
                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.4em]">W-Tech Brasil | Diagnóstico de Suspensão Off-Road</p>
            </footer>

            {/* CTA sticky no mobile: a oferta fica longe da dobra inicial,
                então mantemos o botão de compra sempre ao alcance do polegar. */}
            <div className="md:hidden fixed bottom-0 inset-x-0 z-50 p-3 bg-[#050505]/95 backdrop-blur-md border-t border-[#E6241D]/30">
                <a
                    href={checkoutUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    id="quiz-sticky-checkout-btn"
                    onClick={() => trackEvent('Quiz', 'checkout_click', track)}
                    className="w-full bg-gradient-to-r from-[#ba1d18] to-[#E6241D] text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-transform flex justify-center items-center"
                >
                    {track === 'mecanico' ? 'Quero Faturar Mais' : 'Quero Regular Agora'} · 12x R$ 34,70
                    <ArrowRight strokeWidth={3} size={16} />
                </a>
            </div>
        </motion.div>
    );
};

export default QuizSuspensao;
