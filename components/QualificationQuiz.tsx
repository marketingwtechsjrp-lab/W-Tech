import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, ShieldCheck, Thermometer } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { triggerWebhook } from '../lib/webhooks';
import { distributeLead, handleLeadUpsert } from '../lib/leadDistribution';

interface QuizProps {
    lp: any;
    onComplete: (data: any) => void;
    whatsappGlobalNumber?: string;
}

const QUESTIONS = [
    {
        id: 1,
        question: "Hoje, qual é a sua relação com manutenção ou preparação de suspensões?",
        options: [
            { text: "Apenas piloto / entusiasta", points: 5 },
            { text: "Mecânico iniciante, faço o básico", points: 10 },
            { text: "Já trabalho com suspensão, mas sinto insegurança nos ajustes", points: 20 },
            { text: "Sou mecânico experiente e quero elevar meu nível técnico", points: 25 }
        ]
    },
    {
        id: 2,
        question: "Você já perdeu dinheiro ou cliente por problema relacionado à suspensão?",
        options: [
            { text: "Nunca", points: 5 },
            { text: "Já tive retrabalho", points: 15 },
            { text: "Já perdi cliente por falta de resultado", points: 20 },
            { text: "Já perdi cliente E reputação", points: 25 }
        ]
    },
    {
        id: 3,
        question: "Como você faz os ajustes de suspensão hoje?",
        options: [
            { text: "No “feeling” / tentativa e erro", points: 10 },
            { text: "Sigo padrões genéricos", points: 15 },
            { text: "Faço medições básicas", points: 20 },
            { text: "Trabalho com método técnico e dados", points: 25 }
        ]
    },
    {
        id: 4,
        question: "Qual dessas frases mais te incomoda?",
        options: [
            { text: "“Suspensão é tudo igual”", points: 10 },
            { text: "“Meu cliente não percebe a diferença”", points: 15 },
            { text: "“Faço o serviço, mas sei que poderia entregar mais”", points: 20 },
            { text: "“Se eu dominasse suspensão, minha oficina estaria em outro nível”", points: 25 }
        ]
    },
    {
        id: 5,
        question: "Se você dominasse suspensão de verdade, o que mudaria na sua vida?",
        options: [
            { text: "Seria um diferencial", points: 10 },
            { text: "Aumentaria meu faturamento", points: 20 },
            { text: "Atrairia clientes melhores", points: 20 },
            { text: "Mudaria totalmente meu posicionamento profissional", points: 25 }
        ]
    }
];

export const QualificationQuiz: React.FC<QuizProps> = ({ lp, onComplete, whatsappGlobalNumber }) => {
    const navigate = useNavigate();
    const [step, setStep] = useState<'lead_capture' | 'quiz' | 'result'>('lead_capture');
    const [quizIndex, setQuizIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
    const [answers, setAnswers] = useState<any[]>([]);
    const [leadId, setLeadId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- STEP 1: LEAD CAPTURE ---
    const handleLeadSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const initialPayload = {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                type: 'Quiz_Started', // Initial status
                status: 'New',
                context_id: `Quiz Started: ${lp.title}`,
                tags: ['quiz_started', lp.slug],
                origin: window.location.href,
                assigned_to: null // handleLeadUpsert handles logic
            };

            const result = await handleLeadUpsert(initialPayload);
            
            if (result && result.id) setLeadId(result.id);
            
            setStep('quiz');
        } catch (err: any) {
            console.error(err);
            alert("Erro ao salvar contato: " + (err.message || JSON.stringify(err)));
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- STEP 2: QUIZ LOGIC ---
    const handleAnswer = (points: number, answerText: string) => {
        const newScore = score + points;
        const newAnswers = [...answers, { question: QUESTIONS[quizIndex].question, answer: answerText, points }];
        
        setAnswers(newAnswers);
        setScore(newScore);

        if (quizIndex < QUESTIONS.length - 1) {
            setQuizIndex(quizIndex + 1);
        } else {
            submitQuizResults(newScore, newAnswers);
        }
    };

    // --- STEP 3: SUBMISSION & RESULTS ---
    const submitQuizResults = async (finalScore: number, finalAnswers: any[]) => {
        setIsSubmitting(true);
        try {
            let temperature = 'FRIO';
            if (finalScore > 30) temperature = 'MORNO';
            if (finalScore > 60) temperature = 'QUENTE';
            if (finalScore > 80) temperature = 'ALTA PERFORMANCE';

            const quizData = {
                score: finalScore,
                temperature,
                answers: finalAnswers
            };

            const resultPayload = {
                type: 'Quiz_Completed',
                context_id: `Quiz Completed: ${lp.title} [${temperature}]`,
                quiz_data: quizData,
                // Append only if we can, otherwise just set logic or use arrays in backend. For now overwrite is fine as we only care about the latest state.
                tags: ['quiz_qualified', temperature.toLowerCase().replace(' ', '_'), lp.slug] 
            };

            let effectiveLeadId = leadId;
            if (leadId) {
                // UPDATE existing lead
                // Note: RLS must allow UPDATE for anon or we need a secure RPC.
                // Using update logic from upsert is tricky here because we have ID.
                // Simple update is fine if we have ID.
                await supabase.from('SITE_Leads').update(resultPayload).eq('id', leadId);
                await triggerWebhook('webhook_lead_completed', { ...resultPayload, id: leadId });
            } else {
                 // FALLBACK INSERT
                 const fallbackPayload = {
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    status: 'New',
                    origin: window.location.href,
                    ...resultPayload
                 };
                 const fb = await handleLeadUpsert(fallbackPayload);
                 if (fb && fb.id) effectiveLeadId = fb.id;
            }

            // Checkout automatizado: após qualificar, leva o lead direto para a
            // pré-inscrição/pagamento (mesma regra dos formulários das LPs).
            const courseIdForCheckout = lp.courseId || lp.course?.id;
            const isInternational = lp.course?.isInternational || lp.course?.is_international;
            const isFullOrDone = lp.course?.status === 'Full' || lp.course?.status === 'Completed';
            const checkoutAtivo = lp.course?.checkoutType === 'automated' && !isInternational && !isFullOrDone;
            if (checkoutAtivo && courseIdForCheckout && effectiveLeadId) {
                const sp = new URLSearchParams(window.location.search);
                sp.set('lid', effectiveLeadId);
                navigate(`/checkout-curso/${courseIdForCheckout}?${sp.toString()}`);
                return;
            }

            setStep('result');
            if (onComplete) onComplete(resultPayload);

        } catch (error) {
            console.error(error);
            // Don't alert here to avoid ruining UX if only the update fails but user sees result
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- RENDER HELPERS ---
    const getResultContent = () => {
        if (score <= 30) return {
            temp: 'CURIOSO ❄️',
            color: 'text-blue-400',
            bg: 'bg-blue-500/10 border-blue-500/30',
            cta: "Você ainda está conhecendo esse universo. Comece pelo conteúdo base gratuito da W-Tech.",
            button: "Começar Grátis"
        };
        if (score <= 60) return {
            temp: 'EM EVOLUÇÃO 🌡️',
            color: 'text-yellow-400',
            bg: 'bg-yellow-500/10 border-yellow-500/30',
            cta: "Você já sente a dor. O curso introdutório da W-Tech é o próximo passo lógico.",
            button: "Ver Curso Introdutório"
        };
        if (score <= 80) return {
            temp: 'PROFISSIONAL 🔥',
            color: 'text-orange-500',
            bg: 'bg-orange-500/10 border-orange-500/30',
            cta: "Você já atua, mas falta método. O curso profissional W-Tech vai te levar para outro nível.",
            button: "Profissionalizar Agora"
        };
        return {
            temp: 'ALTA PERFORMANCE 🚀',
            color: 'text-red-500',
            bg: 'bg-red-500/10 border-red-500/30',
            cta: "Você não precisa de mais conteúdo. Você precisa de formação avançada, método e certificação W-Tech.",
            button: "Quero me Tornar Referência"
        };
    };

    const result = getResultContent();
    
    // Choose which phone to use: global prop > lp override > fallback
    // If whatsappGlobalNumber is present (passed from viewer), prefer it if that matches user intent.
    // User said: "use o numero ue esta em configuracoes whatsapp button".
    const targetPhone = whatsappGlobalNumber || lp.whatsapp_number || '5511999999999';

    // --- VIEW: LEAD CAPTURE ---
    if (step === 'lead_capture') {
        return (
            <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Thermometer size={100} /></div>
                <h3 className="text-2xl font-black text-white uppercase mb-2">Descubra seu Nível</h3>
                <p className="text-gray-400 mb-8">Responda 5 perguntas rápidas e receba uma análise personalizada do seu perfil profissional.</p>
                
                <form onSubmit={handleLeadSubmit} className="space-y-4">
                    <input required className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white" placeholder="Seu Nome" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    <input required className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white" placeholder="Seu WhatsApp (com DDD)" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                    <input required type="email" className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white" placeholder="Seu Melhor E-mail" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                    <button className="w-full bg-wtech-gold text-black font-black text-lg py-4 rounded-xl hover:bg-white transition-all uppercase flex items-center justify-center gap-2">
                        Próximo <ArrowRight size={20} />
                    </button>
                    <p className="text-center text-xs text-gray-500 flex items-center justify-center gap-1"><ShieldCheck size={12}/> Seus dados estão seguros</p>
                </form>
            </div>
        );
    }

    // --- VIEW: QUIZ ---
    if (step === 'quiz') {
        const q = QUESTIONS[quizIndex];
        const progress = ((quizIndex + 1) / QUESTIONS.length) * 100;

        return (
            <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl">
                 <div className="w-full bg-gray-800 h-1.5 rounded-full mb-8 overflow-hidden">
                    <div className="bg-wtech-gold h-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                </div>

                <div className="min-h-[300px] flex flex-col justify-center animate-fade-in">
                    <span className="text-wtech-gold text-xs font-bold uppercase tracking-widest mb-2">Pergunta {quizIndex + 1} de {QUESTIONS.length}</span>
                    <h3 className="text-2xl md:text-3xl font-bold text-white mb-8 leading-tight">{q.question}</h3>
                    
                    <div className="space-y-3">
                        {q.options.map((opt, idx) => (
                            <button 
                                key={idx}
                                onClick={() => handleAnswer(opt.points, opt.text)}
                                className="w-full text-left p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-wtech-gold hover:text-black hover:border-wtech-gold transition-all text-gray-300 font-medium group"
                            >
                                <span className="mr-3 text-wtech-gold group-hover:text-black font-bold">{String.fromCharCode(65 + idx)}.</span> {opt.text}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // --- VIEW: RESULT ---
    if (step === 'result') {
        return (
            <div className={`rounded-3xl p-8 md:p-12 shadow-2xl text-center border ${result.bg} animate-scale-in`}>
                <div className="inline-block text-xs font-bold bg-black/20 px-3 py-1 rounded-full mb-4 text-white">ANÁLISE CONCLUÍDA</div>
                <h3 className={`text-4xl font-black uppercase mb-2 ${result.color}`}>{result.temp}</h3>
                <p className="text-white text-5xl font-bold mb-6">{score}<span className="text-xl text-gray-500 font-normal">/100 pts</span></p>
                
                <div className="bg-black/20 p-6 rounded-xl mb-8">
                    <p className="text-gray-300 italic mb-4">
                        "Com base nas suas respostas, você está acima de {Math.min(90, Math.floor((score/100)*100))}% dos profissionais do mercado — mas ainda está longe do nível W-Tech."
                    </p>
                    <p className="text-white text-lg font-bold">
                        {result.cta}
                    </p>
                </div>

                <a 
                    href={`https://wa.me/${targetPhone}?text=Olá, fiz o quiz W-Tech e meu resultado foi ${result.temp} (${score} pts). Gostaria de saber mais sobre: ${result.button}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full block bg-green-600 text-white font-black text-xl py-5 rounded-xl hover:bg-green-500 transition-all uppercase shadow-lg shadow-green-900/20"
                >
                    {result.button} (WhatsApp)
                </a>
            </div>
        );
    }

    return null;
};
