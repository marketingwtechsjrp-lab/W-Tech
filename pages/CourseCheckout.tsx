import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Lock, ShieldCheck, User, Mail, Phone, Calendar, MapPin,
    AlertCircle, Loader2, CheckCircle, ChevronRight, CreditCard,
    Users, Award, BadgeCheck, RotateCcw, Sparkles, MessageCircle, RefreshCw
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { createMercadoPagoPreference } from '../lib/mercadopago';
import { formatDateLocal } from '../lib/utils';
import { trackEvent } from '../components/AnalyticsTracker';
import { useSettings } from '../context/SettingsContext';

interface CourseData {
    id: string;
    title: string;
    date: string;
    date_end?: string;
    city?: string;
    state?: string;
    location_type: string;
    price: number;
    currency?: string;
    image?: string;
    capacity?: number;
    start_time?: string;
    deposit_price?: number;
    SITE_Enrollments?: { count: number }[];
}

interface FormData {
    name: string;
    email: string;
    cpf: string;
    phone: string;
    birthDate: string;
}

const formatCPF = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const CourseCheckout: React.FC = () => {
    const { get } = useSettings();
    const { courseId } = useParams<{ courseId: string }>();
    const [searchParams] = useSearchParams();
    const lid = searchParams.get('lid');
    const errorParam = searchParams.get('error');
    const failedEid = searchParams.get('eid');

    const [course, setCourse] = useState<CourseData | null>(null);
    const [pageLoading, setPageLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [redirecting, setRedirecting] = useState(false);
    
    const initialType = searchParams.get('type') === 'deposit' ? 'deposit' : 'full';
    const [paymentType, setPaymentType] = useState<'full' | 'deposit'>(initialType);
    const [error, setError] = useState<string | null>(
        errorParam === 'payment_failed' ? 'Houve um problema com o pagamento. Por favor, tente novamente.' : null
    );

    const [form, setForm] = useState<FormData>({
        name: '',
        email: '',
        cpf: '',
        phone: '',
        birthDate: ''
    });

    // Pagamento falhou no MP → devolve o lead para a roleta de atendentes no CRM
    useEffect(() => {
        if (errorParam === 'payment_failed' && failedEid) {
            fetch('/api/checkout-recovery', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enrollmentId: failedEid })
            }).catch(err => console.error('Checkout recovery error (non-fatal):', err));
        }
    }, [errorParam, failedEid]);

    // Busca dados do curso e prefill do lead
    useEffect(() => {
        if (!courseId) return;

        const fetchData = async () => {
            setPageLoading(true);

            const { data: courseData, error: courseError } = await supabase
                .from('SITE_Courses')
                .select('id, title, date, date_end, city, state, location_type, price, currency, image, capacity, start_time, deposit_price, SITE_Enrollments(count)')
                .eq('id', courseId)
                .single();

            if (courseError || !courseData) {
                setError('Curso não encontrado. Verifique o link e tente novamente.');
                setPageLoading(false);
                return;
            }

            setCourse(courseData as CourseData);

            // Prefill do formulário com dados do lead (se tiver lid)
            if (lid) {
                const { data: leadData } = await supabase
                    .from('SITE_Leads')
                    .select('name, email, phone')
                    .eq('id', lid)
                    .single();

                if (leadData) {
                    setForm(prev => ({
                        ...prev,
                        name: leadData.name || '',
                        email: leadData.email || '',
                        phone: leadData.phone ? formatPhone(leadData.phone) : ''
                    }));
                }
            }

            setPageLoading(false);
        };

        fetchData();
    }, [courseId, lid]);

    const validate = () => {
        if (!form.name.trim()) return 'Nome completo é obrigatório.';
        if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'E-mail inválido.';
        const cpfDigits = form.cpf.replace(/\D/g, '');
        if (cpfDigits.length !== 11) return 'CPF deve ter 11 dígitos.';
        if (!form.phone.trim() || form.phone.replace(/\D/g, '').length < 10) return 'WhatsApp inválido.';
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const validationError = validate();
        if (validationError) {
            setError(validationError);
            return;
        }

        if (!course) return;
        setSubmitting(true);
        trackEvent('Checkout', 'submit_attempt', course.title);

        try {
            // 1. Cria preferência no Mercado Pago (o backend cuidará de criar a inscrição, atualizar o lead e gerar a preferência)
            const mpResult = await createMercadoPagoPreference({
                courseId: course.id,
                customer: {
                    name: form.name.trim(),
                    email: form.email.trim().toLowerCase(),
                    cpf: form.cpf,
                    phone: form.phone,
                    birthDate: form.birthDate || undefined
                },
                leadId: lid || undefined,
                paymentType
            });

            if (!mpResult.success || !mpResult.init_point) {
                throw new Error(mpResult.error || 'Erro ao conectar com Mercado Pago.');
            }

            trackEvent('Checkout', 'redirected_to_mp', course.title);
            setRedirecting(true);

            // Breve delay para mostrar o estado de redirect antes de sair
            setTimeout(() => {
                window.location.href = mpResult.init_point!;
            }, 800);
        } catch (err: any) {
            console.error('Checkout error:', err);
            setError(err.message || 'Erro inesperado. Tente novamente.');
            setSubmitting(false);
        }
    };

    const spotsLeft = course
        ? Math.max(0, (course.capacity || 0) - (course.SITE_Enrollments?.[0]?.count || 0))
        : 0;

    const depositPrice = course?.deposit_price != null && Number(course.deposit_price) > 0
        ? Number(course.deposit_price)
        : 400.00;

    const selectedPrice = paymentType === 'deposit' ? depositPrice : (course?.price || 0);

    const currencySymbol = course?.currency === 'EUR' ? '€' : course?.currency === 'USD' ? '$' : 'R$';

    // WhatsApp de reciclagem — aluno que já fez o curso e quer refazer com condição especial
    const whatsappDigits = (get('whatsapp_phone', '551732312858') || '551732312858').replace(/\D/g, '');
    const reciclagemMsg = `Olá! Já fiz o curso de suspensão da W-Tech e gostaria de fazer a reciclagem${course?.title ? ` (${course.title})` : ''}. Pode me passar as condições?`;
    const reciclagemUrl = `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(reciclagemMsg)}`;

    // Estado: carregando página
    if (pageLoading) {
        return (
            <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center">
                <Loader2 className="animate-spin text-wtech-gold" size={48} />
            </div>
        );
    }

    // Estado: curso não encontrado
    if (!course && !pageLoading) {
        return (
            <div className="min-h-screen bg-[#FDFCFB] flex flex-col items-center justify-center p-6 text-center">
                <AlertCircle size={48} className="text-red-400 mb-4" />
                <h1 className="text-2xl font-black mb-2">Curso não encontrado</h1>
                <p className="text-gray-500 mb-6">{error || 'O link pode estar incorreto ou o curso não está disponível.'}</p>
                <Link to="/cursos" className="bg-wtech-gold text-black font-black px-6 py-3 rounded-xl">
                    Ver todos os cursos
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FDFCFB] relative">
            {/* Barra dourada topo */}
            <div className="h-1.5 bg-gradient-to-r from-wtech-gold via-yellow-400 to-wtech-gold" />

            {/* Overlay de redirecionamento */}
            <AnimatePresence>
                {redirecting && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-6"
                    >
                        <Loader2 className="animate-spin text-wtech-gold" size={56} />
                        <div className="text-center">
                            <p className="text-white font-black text-xl mb-1">Redirecionando para o Mercado Pago...</p>
                            <p className="text-gray-400 text-sm">Você será levado ao ambiente seguro de pagamento</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between">
                    <Link to="/" className="text-gray-400 hover:text-gray-600 text-sm font-bold transition-colors">
                        ← Voltar
                    </Link>
                    <div className="flex items-center gap-2 text-xs text-gray-400 font-bold uppercase tracking-widest">
                        <Lock size={12} />
                        Ambiente Seguro
                    </div>
                </div>

                {/* Progress */}
                <div className="flex items-center gap-2 mb-8 max-w-xs mx-auto md:mx-0">
                    <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-wtech-gold text-black text-xs font-black flex items-center justify-center">1</div>
                        <span className="text-xs font-black text-gray-800 uppercase tracking-wide">Seus Dados</span>
                    </div>
                    <ChevronRight size={14} className="text-gray-300" />
                    <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-400 text-xs font-black flex items-center justify-center">2</div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Pagamento</span>
                    </div>
                </div>

                {/* Intro explicativa — suaviza a chegada direto no pagamento e reforça a garantia */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="mb-8 rounded-2xl border border-wtech-gold/30 bg-gradient-to-br from-amber-50 via-white to-white p-6 md:p-7 shadow-sm"
                >
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className="inline-flex items-center gap-1.5 bg-wtech-gold/15 text-amber-700 text-[11px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
                            <Sparkles size={12} /> Pré-inscrição
                        </span>
                        {spotsLeft > 0 && (
                            <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-600 text-[11px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
                                ⚡ {spotsLeft} {spotsLeft === 1 ? 'vaga restante' : 'vagas restantes'}
                            </span>
                        )}
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black text-gray-900 leading-tight">
                        Garanta sua vaga agora — com <span className="text-wtech-gold">segurança total</span>
                    </h1>
                    <p className="text-sm text-gray-600 mt-2 max-w-2xl leading-relaxed">
                        Faça sua <strong>pré-inscrição</strong> pagando apenas o sinal e sua vaga fica
                        <strong> 100% reservada no seu nome</strong>. Mudou de ideia? Você tem
                        <strong> reembolso garantido</strong>. Tudo com a estrutura e o suporte oficiais da W-Tech Brasil.
                    </p>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
                        {[
                            { icon: BadgeCheck, title: 'Vaga 100% garantida', desc: 'Reservada no seu nome na hora' },
                            { icon: Users, title: 'Pré-inscrição pelo sinal', desc: 'Garanta hoje, pague o restante depois' },
                            { icon: RotateCcw, title: 'Reembolso garantido', desc: 'Desistiu? Devolvemos seu dinheiro' },
                            { icon: Award, title: 'Estrutura oficial W-Tech', desc: 'Certificação e suporte de verdade' }
                        ].map((b, i) => (
                            <div key={i} className="flex items-start gap-2.5 bg-white/70 border border-gray-100 rounded-xl p-3">
                                <b.icon size={18} className="text-wtech-gold shrink-0 mt-0.5" strokeWidth={2.5} />
                                <div>
                                    <p className="text-xs font-black text-gray-900 leading-tight">{b.title}</p>
                                    <p className="text-[11px] text-gray-500 leading-tight mt-0.5">{b.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>

                <div className="grid lg:grid-cols-5 gap-6 lg:gap-10 items-start">
                    {/* Coluna esquerda: Resumo do curso */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4 }}
                        className="lg:col-span-2 space-y-4"
                    >
                        {/* Vídeo de apresentação do curso — só aparece no checkout automático (automação ligada) */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="px-5 pt-4 pb-3">
                                <p className="text-[10px] font-black text-wtech-gold uppercase tracking-widest mb-0.5">Conheça por dentro</p>
                                <h3 className="text-sm font-black text-gray-900 leading-tight">Veja como é o curso W-Tech</h3>
                            </div>
                            <div className="bg-black flex justify-center">
                                <video
                                    src="/videos/curso-wtech.mp4"
                                    controls
                                    playsInline
                                    preload="metadata"
                                    className="w-auto max-h-[460px] aspect-[9/16] object-contain"
                                >
                                    Seu navegador não suporta vídeo HTML5.
                                </video>
                            </div>
                        </div>

                        {/* Card do curso */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            {course!.image && (
                                <div className="aspect-video bg-gray-100 overflow-hidden">
                                    <img
                                        src={course!.image}
                                        alt={course!.title}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            )}
                            <div className="p-5">
                                <p className="text-[10px] font-black text-wtech-gold uppercase tracking-widest mb-1">Você está se inscrevendo em</p>
                                <h2 className="text-lg font-black text-gray-900 leading-tight mb-4">{course!.title}</h2>

                                <div className="space-y-2.5">
                                    <div className="flex items-center gap-2.5 text-sm text-gray-600">
                                        <Calendar size={15} className="text-wtech-gold shrink-0" />
                                        <span className="font-bold">
                                            {formatDateLocal(course!.date)}
                                            {course!.date_end && course!.date_end !== course!.date
                                                ? ` a ${formatDateLocal(course!.date_end)}`
                                                : ''}
                                            {course!.start_time ? ` · ${course!.start_time}` : ''}
                                        </span>
                                    </div>

                                    {(course!.city || course!.location_type) && (
                                        <div className="flex items-center gap-2.5 text-sm text-gray-600">
                                            <MapPin size={15} className="text-wtech-gold shrink-0" />
                                            <span className="font-bold">
                                                {course!.location_type === 'Online'
                                                    ? 'Online (ao vivo)'
                                                    : [course!.city, course!.state].filter(Boolean).join(', ')}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-5 pt-4 border-t border-gray-100 space-y-2">
                                    <div className="flex items-baseline justify-between">
                                        <span className="text-xs font-bold text-gray-400 uppercase">Total do Curso</span>
                                        <span className="text-lg font-bold text-gray-600">
                                            {currencySymbol} {course!.price.toFixed(2).replace('.', ',')}
                                        </span>
                                    </div>
                                    {paymentType === 'deposit' && (
                                        <div className="flex items-baseline justify-between border-t border-dashed border-gray-100 pt-2 animate-in fade-in">
                                            <span className="text-xs font-black text-wtech-gold uppercase">Sinal da Reserva</span>
                                            <span className="text-3xl font-black text-gray-900">
                                                {currencySymbol} {depositPrice.toFixed(2).replace('.', ',')}
                                            </span>
                                        </div>
                                    )}
                                    {spotsLeft > 0 && spotsLeft <= 10 && (
                                        <p className="text-xs text-red-500 font-black mt-1 text-right animate-pulse">
                                            ⚡ Apenas {spotsLeft} {spotsLeft === 1 ? 'vaga' : 'vagas'} restante{spotsLeft === 1 ? '' : 's'}!
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Badges de segurança */}
                        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
                            <div className="flex items-center gap-2.5 text-sm text-gray-600">
                                <ShieldCheck size={16} className="text-green-500 shrink-0" />
                                <span className="font-bold">Pagamento 100% seguro via Mercado Pago</span>
                            </div>
                            <div className="flex items-center gap-2.5 text-sm text-gray-600">
                                <Lock size={16} className="text-blue-500 shrink-0" />
                                <span className="font-bold">Seus dados são protegidos com SSL</span>
                            </div>
                            <div className="flex items-center gap-2.5 text-sm text-gray-600">
                                <CreditCard size={16} className="text-purple-500 shrink-0" />
                                <span className="font-bold">Pix, boleto ou cartão em até <span className="text-green-600">10x</span></span>
                            </div>
                            <div className="flex items-center gap-2.5 text-sm text-gray-600">
                                <CheckCircle size={16} className="text-wtech-gold shrink-0" />
                                <span className="font-bold">Inscrição confirmada imediatamente</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Coluna direita: Formulário */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                        className="lg:col-span-3"
                    >
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
                            <h1 className="text-xl font-black text-gray-900 mb-1">Complete seus dados</h1>
                            <p className="text-sm text-gray-500 mb-6">Preencha abaixo para prosseguir com o pagamento</p>

                            {/* Alerta de erro */}
                            <AnimatePresence>
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6"
                                    >
                                        <AlertCircle size={18} className="shrink-0 mt-0.5" />
                                        <p className="text-sm font-bold">{error}</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* Opção de Pagamento */}
                                <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 mb-6">
                                    <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-3">
                                        Opção de Pagamento
                                    </label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {/* Card: Integral */}
                                        <div
                                            onClick={() => setPaymentType('full')}
                                            className={`cursor-pointer rounded-xl p-4 border-2 transition-all flex flex-col justify-between ${
                                                paymentType === 'full'
                                                    ? 'border-wtech-gold bg-yellow-50/20 shadow-sm'
                                                    : 'border-gray-200 bg-white hover:border-gray-300'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-black text-gray-950 uppercase tracking-tight">Valor Integral</span>
                                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                                    paymentType === 'full' ? 'border-wtech-gold' : 'border-gray-300'
                                                }`}>
                                                    {paymentType === 'full' && <div className="w-2 h-2 rounded-full bg-wtech-gold" />}
                                                </div>
                                            </div>
                                            <span className="text-lg font-black text-gray-900">
                                                {currencySymbol} {course!.price.toFixed(2).replace('.', ',')}
                                            </span>
                                            <span className="text-[11px] text-green-600 mt-1 font-black leading-tight">
                                                ou em até 10x de {currencySymbol} {(course!.price / 10).toFixed(2).replace('.', ',')} no cartão
                                            </span>
                                            <span className="text-[10px] text-gray-400 mt-1 font-bold leading-tight">Quitação integral e acesso garantido</span>
                                        </div>

                                        {/* Card: Sinal */}
                                        <div
                                            onClick={() => setPaymentType('deposit')}
                                            className={`cursor-pointer rounded-xl p-4 border-2 transition-all flex flex-col justify-between ${
                                                paymentType === 'deposit'
                                                    ? 'border-wtech-gold bg-yellow-50/20 shadow-sm'
                                                    : 'border-gray-200 bg-white hover:border-gray-300'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-black text-gray-950 uppercase tracking-tight">Reservar Vaga (Sinal)</span>
                                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                                    paymentType === 'deposit' ? 'border-wtech-gold' : 'border-gray-300'
                                                }`}>
                                                    {paymentType === 'deposit' && <div className="w-2 h-2 rounded-full bg-wtech-gold" />}
                                                </div>
                                            </div>
                                            <span className="text-lg font-black text-gray-900">
                                                {currencySymbol} {depositPrice.toFixed(2).replace('.', ',')}
                                            </span>
                                            <span className="text-[10px] text-gray-400 mt-2 font-bold leading-tight">Garanta sua vaga hoje. Pague o restante depois</span>
                                        </div>
                                    </div>

                                    {/* Reciclagem — quem já fez o curso fala direto com a equipe */}
                                    <a
                                        href={reciclagemUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        id="checkout-reciclagem-whatsapp"
                                        onClick={() => trackEvent('Checkout', 'reciclagem_whatsapp', course?.title || '')}
                                        className="mt-4 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50/60 p-3.5 hover:bg-green-50 hover:border-green-300 transition-all group"
                                    >
                                        <div className="w-9 h-9 rounded-full bg-green-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-green-200">
                                            <RefreshCw size={17} strokeWidth={2.5} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-black text-gray-900 leading-tight">Já fez o curso? Faça a reciclagem</p>
                                            <p className="text-[11px] text-gray-500 leading-tight mt-0.5">Alunos W-Tech têm condição especial — fale com a gente</p>
                                        </div>
                                        <span className="inline-flex items-center gap-1 text-[11px] font-black text-green-700 shrink-0 group-hover:gap-1.5 transition-all">
                                            <MessageCircle size={14} /> WhatsApp
                                        </span>
                                    </a>
                                </div>

                                {/* Nome */}
                                <div>
                                    <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">
                                        Nome Completo *
                                    </label>
                                    <div className="relative">
                                        <User size={16} className="absolute left-3.5 top-3.5 text-gray-400" />
                                        <input
                                            type="text"
                                            value={form.name}
                                            onChange={e => setForm({ ...form, name: e.target.value })}
                                            placeholder="Seu nome completo"
                                            className="w-full border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-sm font-bold text-gray-800 focus:outline-none focus:border-wtech-gold focus:ring-2 focus:ring-wtech-gold/20 transition-all"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* CPF */}
                                <div>
                                    <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">
                                        CPF *
                                    </label>
                                    <input
                                        type="text"
                                        value={form.cpf}
                                        onChange={e => setForm({ ...form, cpf: formatCPF(e.target.value) })}
                                        placeholder="000.000.000-00"
                                        inputMode="numeric"
                                        className="w-full border border-gray-200 rounded-xl py-3 px-4 text-sm font-bold text-gray-800 focus:outline-none focus:border-wtech-gold focus:ring-2 focus:ring-wtech-gold/20 transition-all"
                                        required
                                    />
                                </div>

                                <div className="grid sm:grid-cols-2 gap-4">
                                    {/* E-mail */}
                                    <div>
                                        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">
                                            E-mail *
                                        </label>
                                        <div className="relative">
                                            <Mail size={16} className="absolute left-3.5 top-3.5 text-gray-400" />
                                            <input
                                                type="email"
                                                value={form.email}
                                                onChange={e => setForm({ ...form, email: e.target.value })}
                                                placeholder="seu@email.com"
                                                className="w-full border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-sm font-bold text-gray-800 focus:outline-none focus:border-wtech-gold focus:ring-2 focus:ring-wtech-gold/20 transition-all"
                                                required
                                            />
                                        </div>
                                    </div>

                                    {/* WhatsApp */}
                                    <div>
                                        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">
                                            WhatsApp *
                                        </label>
                                        <div className="relative">
                                            <Phone size={16} className="absolute left-3.5 top-3.5 text-gray-400" />
                                            <input
                                                type="tel"
                                                value={form.phone}
                                                onChange={e => setForm({ ...form, phone: formatPhone(e.target.value) })}
                                                placeholder="(11) 99999-9999"
                                                inputMode="tel"
                                                className="w-full border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-sm font-bold text-gray-800 focus:outline-none focus:border-wtech-gold focus:ring-2 focus:ring-wtech-gold/20 transition-all"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Data de Nascimento (opcional) */}
                                <div>
                                    <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">
                                        Data de Nascimento <span className="text-gray-300 normal-case font-bold">(opcional)</span>
                                    </label>
                                    <div className="relative">
                                        <Calendar size={16} className="absolute left-3.5 top-3.5 text-gray-400" />
                                        <input
                                            type="date"
                                            value={form.birthDate}
                                            onChange={e => setForm({ ...form, birthDate: e.target.value })}
                                            className="w-full border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-sm font-bold text-gray-800 focus:outline-none focus:border-wtech-gold focus:ring-2 focus:ring-wtech-gold/20 transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Resumo e CTA */}
                                <div className="pt-2">
                                    <div className="flex justify-between items-center text-sm mb-2 bg-gray-50 rounded-xl p-4">
                                        <span className="font-bold text-gray-500">Total a pagar agora</span>
                                        <span className="text-xl font-black text-gray-950">
                                            {currencySymbol} {selectedPrice.toFixed(2).replace('.', ',')}
                                        </span>
                                    </div>

                                    {paymentType === 'full' && (
                                        <p className="flex items-center justify-center gap-1.5 text-xs font-black text-green-600 mb-4">
                                            <CreditCard size={13} className="shrink-0" />
                                            Parcele em até 10x de {currencySymbol} {(course!.price / 10).toFixed(2).replace('.', ',')} no cartão
                                        </p>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={submitting || redirecting}
                                        className="w-full bg-wtech-gold text-black font-black py-4 rounded-xl text-base uppercase tracking-wide hover:bg-yellow-500 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-yellow-200"
                                    >
                                        {submitting ? (
                                            <>
                                                <Loader2 size={20} className="animate-spin" />
                                                Processando...
                                            </>
                                        ) : (
                                            <>
                                                <Lock size={18} />
                                                Pagar com Mercado Pago
                                            </>
                                        )}
                                    </button>

                                    <p className="text-center text-xs text-gray-400 mt-3 font-bold">
                                        Ao continuar, você será redirecionado para o ambiente seguro do Mercado Pago
                                    </p>
                                </div>
                            </form>
                        </div>

                        <p className="text-center text-xs text-gray-400 mt-4 font-bold uppercase tracking-widest">
                            W-Tech Experience · Suporte: suporte@w-tech.com
                        </p>
                    </motion.div>
                </div>

                {/* Garantia W-Tech — reforço final antes de pagar */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4 }}
                    className="mt-10 rounded-2xl border-2 border-green-200 bg-green-50/50 p-6 md:p-8"
                >
                    <div className="flex flex-col md:flex-row items-start gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-green-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-green-200">
                            <ShieldCheck size={28} strokeWidth={2.5} />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg md:text-xl font-black text-gray-900">Compra 100% garantida pela W-Tech</h3>
                            <p className="text-sm text-gray-600 mt-2 leading-relaxed max-w-3xl">
                                Assim que o pagamento é confirmado, sua <strong>vaga fica reservada no seu nome</strong> imediatamente.
                                Se por algum motivo você desistir, <strong>devolvemos o seu dinheiro</strong> — sem burocracia.
                                Você conta com toda a estrutura, a metodologia e o suporte oficiais da <strong>W-Tech Brasil</strong>.
                            </p>
                            <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4">
                                {[
                                    { icon: RotateCcw, text: 'Reembolso garantido' },
                                    { icon: BadgeCheck, text: 'Vaga reservada no seu nome' },
                                    { icon: Lock, text: 'Pagamento seguro via Mercado Pago' },
                                    { icon: Award, text: 'Certificação oficial W-Tech' }
                                ].map((b, i) => (
                                    <span key={i} className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-700">
                                        <b.icon size={14} className="text-green-600 shrink-0" /> {b.text}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default CourseCheckout;
