import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Lock, ShieldCheck, User, Mail, Phone, Calendar, MapPin,
    AlertCircle, Loader2, CheckCircle, ChevronRight, CreditCard,
    Users, Award, BadgeCheck, RotateCcw, Sparkles, FileText
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { createStripePaymentLink } from '../lib/stripe';
import { getLeadTrackingFields } from '../lib/tracking';
import { triggerWebhook } from '../lib/webhooks';
import { formatDateLocal } from '../lib/utils';

// Curso Lisboa II — Outubro 2026 (23, 24 e 25/10 · 3 dias)
const COURSE_ID = 'b88e8979-520a-4c37-8cb8-1128e7e5dffc';
const ASSIGNED_TO = '407d09b8-8205-4697-a726-1738cf7e20ef'; // Andre (Exclusivo para Lisboa)

// Valores oficiais em EUR (fallback caso o registro do curso ainda não esteja atualizado no admin)
const FULL_PRICE = 480;
const DEPOSIT_PRICE = 150;

interface CourseData {
    id: string;
    title: string;
    date: string;
    date_end?: string;
    city?: string;
    state?: string;
    location_type?: string;
    price?: number;
    image?: string;
    capacity?: number;
    start_time?: string;
    deposit_price?: number;
    SITE_Enrollments?: { count: number }[];
}

interface FormData {
    name: string;
    email: string;
    phone: string;
    document: string;
}

const CheckoutLisboa: React.FC = () => {
    const [searchParams] = useSearchParams();
    const lid = searchParams.get('lid');

    const [course, setCourse] = useState<CourseData | null>(null);
    const [pageLoading, setPageLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [redirecting, setRedirecting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const initialType = searchParams.get('type') === 'full' ? 'full' : 'deposit';
    const [paymentType, setPaymentType] = useState<'full' | 'deposit'>(initialType);

    const [form, setForm] = useState<FormData>({ name: '', email: '', phone: '', document: '' });

    // Busca dados do curso (título, data, vagas) e faz prefill com o lead (se veio da LP com ?lid=)
    useEffect(() => {
        const fetchData = async () => {
            setPageLoading(true);

            const { data: courseData } = await supabase
                .from('SITE_Courses')
                .select('id, title, date, date_end, city, state, location_type, price, image, capacity, start_time, deposit_price, SITE_Enrollments(count)')
                .eq('id', COURSE_ID)
                .single();

            if (courseData) setCourse(courseData as CourseData);

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
                        phone: leadData.phone || ''
                    }));
                }
            }

            setPageLoading(false);
        };

        fetchData();
    }, [lid]);

    // Valores fixos da 2ª edição (EUR). Não dependem do preço do banco para evitar cobrança errada.
    const fullPrice = FULL_PRICE;
    const depositPrice = DEPOSIT_PRICE;
    const selectedPrice = paymentType === 'deposit' ? depositPrice : fullPrice;
    const remaining = Math.max(0, fullPrice - depositPrice);

    const spotsLeft = course
        ? Math.max(0, (course.capacity || 0) - (course.SITE_Enrollments?.[0]?.count || 0))
        : 0;

    const fmtEur = (v: number) => `€ ${v.toFixed(2).replace('.', ',')}`;

    const validate = (): string | null => {
        if (!form.name.trim()) return 'Nome completo é obrigatório.';
        if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'E-mail inválido.';
        if (!form.phone.trim() || form.phone.replace(/\D/g, '').length < 8) return 'Telemóvel / WhatsApp inválido.';
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

        setSubmitting(true);

        try {
            const nome = form.name.trim();
            const emailLc = form.email.trim().toLowerCase();
            const fone = form.phone.trim();
            const doc = form.document.trim() || null;
            const leadTags = ['WTECH_LISBOA_OUT_2026', 'CHECKOUT_LISBOA', paymentType === 'deposit' ? 'SINAL' : 'INTEGRAL'];

            // 1. Garante o lead no CRM. IMPORTANTE: aqui NÃO criamos inscrição.
            //    Sem pagamento concluído, a pessoa fica apenas como "Novo Lead" para o
            //    atendente trabalhar. A inscrição (SITE_Enrollments) só é criada em
            //    /obrigado-lisboa, quando o pagamento é confirmado.
            let leadId = lid;
            if (leadId) {
                await supabase
                    .from('SITE_Leads')
                    .update({ name: nome, email: emailLc, phone: fone, cpf: doc, tags: leadTags })
                    .eq('id', leadId);
            } else {
                // Dedupe: reaproveita lead existente (mesmo e-mail ou telefone) antes de criar outro.
                let existingLead: { id: string } | null = null;
                if (emailLc) {
                    const { data } = await supabase.from('SITE_Leads').select('id').eq('email', emailLc).limit(1);
                    existingLead = data?.[0] || null;
                }
                if (!existingLead && fone) {
                    const last8 = fone.replace(/\D/g, '').slice(-8);
                    if (last8) {
                        const { data } = await supabase.from('SITE_Leads').select('id').ilike('phone', `%${last8}%`).limit(1);
                        existingLead = data?.[0] || null;
                    }
                }

                if (existingLead) {
                    await supabase
                        .from('SITE_Leads')
                        .update({ name: nome, email: emailLc, phone: fone, cpf: doc, tags: leadTags })
                        .eq('id', existingLead.id);
                    leadId = existingLead.id;
                } else {
                    const { data: newLead } = await supabase
                        .from('SITE_Leads')
                        .insert([{
                            name: nome,
                            email: emailLc,
                            phone: fone,
                            cpf: doc,
                            type: 'Course_Registration',
                            status: 'New',
                            context_id: 'WTECH EUROPA LISBOA OUTUBRO 2026 (CHECKOUT)',
                            tags: leadTags,
                            assigned_to: ASSIGNED_TO,
                            ...getLeadTrackingFields()
                        }])
                        .select()
                        .single();
                    leadId = newLead?.id || null;
                }
            }

            if (!leadId) throw new Error('Não foi possível registrar seus dados. Tente novamente.');

            // 2. Dispara o webhook de lead (automações de CRM) — ainda sem inscrição/pagamento.
            await triggerWebhook('webhook_lead', {
                lead_id: leadId,
                student_name: nome,
                student_email: emailLc,
                student_phone: fone,
                payment_type: paymentType,
                stage: 'checkout_started'
            });

            // 3. Gera o link do Stripe. A inscrição será criada/confirmada apenas no
            //    retorno (/obrigado-lisboa), a partir do lead, após o pagamento.
            const stripeResult = await createStripePaymentLink({
                title: paymentType === 'deposit'
                    ? `Sinal de Reserva: W-Tech Lisboa (Out 2026) - ${nome}`
                    : `Inscrição Integral: W-Tech Lisboa (Out 2026) - ${nome}`,
                price: selectedPrice,
                currency: 'eur',
                email: emailLc,
                successUrl: window.location.origin + `/obrigado-lisboa?lid=${leadId}&session_id={CHECKOUT_SESSION_ID}&type=${paymentType}`
            });

            if (!stripeResult.success || !stripeResult.url) {
                throw new Error(stripeResult.error || 'Erro ao gerar o link de pagamento.');
            }

            setRedirecting(true);
            setTimeout(() => { window.location.href = stripeResult.url!; }, 700);
        } catch (err: any) {
            console.error('Checkout Lisboa error:', err);
            setError(err.message || 'Erro inesperado. Tente novamente.');
            setSubmitting(false);
        }
    };

    if (pageLoading) {
        return (
            <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center">
                <Loader2 className="animate-spin text-wtech-red" size={48} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FDFCFB] relative">
            {/* Barra topo */}
            <div className="h-1.5 bg-gradient-to-r from-wtech-red via-red-500 to-wtech-gold" />

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
                            <p className="text-white font-black text-xl mb-1">Redirecionando para o pagamento seguro...</p>
                            <p className="text-gray-400 text-sm">Você será levado ao ambiente protegido do Stripe</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between">
                    <Link to="/lp-wtech-lisboa-nov" className="text-gray-400 hover:text-gray-600 text-sm font-bold transition-colors">
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
                        <div className="w-6 h-6 rounded-full bg-wtech-red text-white text-xs font-black flex items-center justify-center">1</div>
                        <span className="text-xs font-black text-gray-800 uppercase tracking-wide">Seus Dados</span>
                    </div>
                    <ChevronRight size={14} className="text-gray-300" />
                    <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-400 text-xs font-black flex items-center justify-center">2</div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Pagamento</span>
                    </div>
                </div>

                {/* Intro */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="mb-8 rounded-2xl border border-wtech-red/20 bg-gradient-to-br from-red-50 via-white to-white p-6 md:p-7 shadow-sm"
                >
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className="inline-flex items-center gap-1.5 bg-wtech-red/10 text-wtech-red text-[11px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
                            <Sparkles size={12} /> 2ª Edição · Lisboa
                        </span>
                        {spotsLeft > 0 && (
                            <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-600 text-[11px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
                                ⚡ {spotsLeft} {spotsLeft === 1 ? 'vaga restante' : 'vagas restantes'}
                            </span>
                        )}
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black text-gray-900 leading-tight">
                        Garanta sua vaga agora — com <span className="text-wtech-red">segurança total</span>
                    </h1>
                    <p className="text-sm text-gray-600 mt-2 max-w-2xl leading-relaxed">
                        Reserve com o <strong>sinal de {fmtEur(depositPrice)}</strong> e sua vaga fica
                        <strong> 100% no seu nome</strong>, ou pague o <strong>valor integral de {fmtEur(fullPrice)}</strong>.
                        Tudo com a estrutura e a certificação internacional oficiais da <strong>W-Tech</strong>, na Art on Wheels Garage, em Sintra.
                    </p>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
                        {[
                            { icon: BadgeCheck, title: 'Vaga 100% garantida', desc: 'Reservada no seu nome na hora' },
                            { icon: Users, title: 'Reserva pelo sinal', desc: 'Garanta hoje, pague o restante depois' },
                            { icon: RotateCcw, title: 'Saldo até 10 dias antes', desc: 'Restante acertado antes do curso' },
                            { icon: Award, title: 'Certificação internacional', desc: 'Padrão W-Tech reconhecido' }
                        ].map((b, i) => (
                            <div key={i} className="flex items-start gap-2.5 bg-white/70 border border-gray-100 rounded-xl p-3">
                                <b.icon size={18} className="text-wtech-red shrink-0 mt-0.5" strokeWidth={2.5} />
                                <div>
                                    <p className="text-xs font-black text-gray-900 leading-tight">{b.title}</p>
                                    <p className="text-[11px] text-gray-500 leading-tight mt-0.5">{b.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>

                <div className="grid lg:grid-cols-5 gap-6 lg:gap-10 items-start">
                    {/* Coluna esquerda: vídeo + resumo */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4 }}
                        className="lg:col-span-2 space-y-4"
                    >
                        {/* Vídeo — recap da 1ª edição em Lisboa */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="px-5 pt-4 pb-3">
                                <p className="text-[10px] font-black text-wtech-red uppercase tracking-widest mb-0.5">Conheça por dentro</p>
                                <h3 className="text-sm font-black text-gray-900 leading-tight">Como foi a 1ª edição em Lisboa</h3>
                            </div>
                            <div className="bg-black">
                                <video
                                    src="/videos/finalwtech.mp4"
                                    className="w-full aspect-video object-cover"
                                    controls
                                    playsInline
                                    preload="metadata"
                                />
                            </div>
                        </div>

                        {/* Card do curso */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            {course?.image && (
                                <div className="aspect-video bg-gray-100 overflow-hidden">
                                    <img src={course.image} alt={course.title} className="w-full h-full object-cover" />
                                </div>
                            )}
                            <div className="p-5">
                                <p className="text-[10px] font-black text-wtech-red uppercase tracking-widest mb-1">Você está se inscrevendo em</p>
                                <h2 className="text-lg font-black text-gray-900 leading-tight mb-4">{course?.title || 'W-Tech Lisboa II'}</h2>

                                <div className="space-y-2.5">
                                    <div className="flex items-center gap-2.5 text-sm text-gray-600">
                                        <Calendar size={15} className="text-wtech-red shrink-0" />
                                        <span className="font-bold">
                                            {course?.date
                                                ? `${formatDateLocal(course.date)}${course.date_end && course.date_end !== course.date ? ` a ${formatDateLocal(course.date_end)}` : ''}`
                                                : '23, 24 e 25 de Outubro de 2026'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2.5 text-sm text-gray-600">
                                        <MapPin size={15} className="text-wtech-red shrink-0" />
                                        <span className="font-bold">Art on Wheels Garage · Sintra, Portugal</span>
                                    </div>
                                </div>

                                <div className="mt-5 pt-4 border-t border-gray-100 space-y-2">
                                    <div className="flex items-baseline justify-between">
                                        <span className="text-xs font-bold text-gray-400 uppercase">Total do Curso</span>
                                        <span className="text-lg font-bold text-gray-600">{fmtEur(fullPrice)}</span>
                                    </div>
                                    {paymentType === 'deposit' && (
                                        <div className="flex items-baseline justify-between border-t border-dashed border-gray-100 pt-2">
                                            <span className="text-xs font-black text-wtech-red uppercase">Sinal da Reserva</span>
                                            <span className="text-3xl font-black text-gray-900">{fmtEur(depositPrice)}</span>
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
                                <span className="font-bold">Pagamento internacional seguro via Stripe</span>
                            </div>
                            <div className="flex items-center gap-2.5 text-sm text-gray-600">
                                <Lock size={16} className="text-blue-500 shrink-0" />
                                <span className="font-bold">Seus dados protegidos com SSL</span>
                            </div>
                            <div className="flex items-center gap-2.5 text-sm text-gray-600">
                                <CreditCard size={16} className="text-purple-500 shrink-0" />
                                <span className="font-bold">Cartão de crédito internacional (EUR)</span>
                            </div>
                            <div className="flex items-center gap-2.5 text-sm text-gray-600">
                                <CheckCircle size={16} className="text-wtech-red shrink-0" />
                                <span className="font-bold">Vaga confirmada assim que o pagamento é aprovado</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Coluna direita: formulário */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                        className="lg:col-span-3"
                    >
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
                            <h1 className="text-xl font-black text-gray-900 mb-1">Complete seus dados</h1>
                            <p className="text-sm text-gray-500 mb-6">Preencha abaixo para prosseguir com o pagamento</p>

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
                                        {/* Integral */}
                                        <div
                                            onClick={() => setPaymentType('full')}
                                            className={`cursor-pointer rounded-xl p-4 border-2 transition-all flex flex-col justify-between ${
                                                paymentType === 'full'
                                                    ? 'border-wtech-red bg-red-50/30 shadow-sm'
                                                    : 'border-gray-200 bg-white hover:border-gray-300'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-black text-gray-950 uppercase tracking-tight">Valor Integral</span>
                                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${paymentType === 'full' ? 'border-wtech-red' : 'border-gray-300'}`}>
                                                    {paymentType === 'full' && <div className="w-2 h-2 rounded-full bg-wtech-red" />}
                                                </div>
                                            </div>
                                            <span className="text-lg font-black text-gray-900">{fmtEur(fullPrice)}</span>
                                            <span className="text-[10px] text-gray-400 mt-1 font-bold leading-tight">Quitação integral e acesso garantido</span>
                                        </div>

                                        {/* Sinal */}
                                        <div
                                            onClick={() => setPaymentType('deposit')}
                                            className={`cursor-pointer rounded-xl p-4 border-2 transition-all flex flex-col justify-between ${
                                                paymentType === 'deposit'
                                                    ? 'border-wtech-red bg-red-50/30 shadow-sm'
                                                    : 'border-gray-200 bg-white hover:border-gray-300'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-black text-gray-950 uppercase tracking-tight">Reservar Vaga (Sinal)</span>
                                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${paymentType === 'deposit' ? 'border-wtech-red' : 'border-gray-300'}`}>
                                                    {paymentType === 'deposit' && <div className="w-2 h-2 rounded-full bg-wtech-red" />}
                                                </div>
                                            </div>
                                            <span className="text-lg font-black text-gray-900">{fmtEur(depositPrice)}</span>
                                            <span className="text-[10px] text-gray-400 mt-2 font-bold leading-tight">Restante de {fmtEur(remaining)} até 10 dias antes do curso</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Nome */}
                                <div>
                                    <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">Nome Completo *</label>
                                    <div className="relative">
                                        <User size={16} className="absolute left-3.5 top-3.5 text-gray-400" />
                                        <input
                                            type="text"
                                            value={form.name}
                                            onChange={e => setForm({ ...form, name: e.target.value })}
                                            placeholder="Seu nome completo"
                                            className="w-full border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-sm font-bold text-gray-800 focus:outline-none focus:border-wtech-red focus:ring-2 focus:ring-wtech-red/20 transition-all"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid sm:grid-cols-2 gap-4">
                                    {/* E-mail */}
                                    <div>
                                        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">E-mail *</label>
                                        <div className="relative">
                                            <Mail size={16} className="absolute left-3.5 top-3.5 text-gray-400" />
                                            <input
                                                type="email"
                                                value={form.email}
                                                onChange={e => setForm({ ...form, email: e.target.value })}
                                                placeholder="seu@email.com"
                                                className="w-full border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-sm font-bold text-gray-800 focus:outline-none focus:border-wtech-red focus:ring-2 focus:ring-wtech-red/20 transition-all"
                                                required
                                            />
                                        </div>
                                    </div>

                                    {/* Telemóvel */}
                                    <div>
                                        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">Telemóvel / WhatsApp *</label>
                                        <div className="relative">
                                            <Phone size={16} className="absolute left-3.5 top-3.5 text-gray-400" />
                                            <input
                                                type="tel"
                                                value={form.phone}
                                                onChange={e => setForm({ ...form, phone: e.target.value })}
                                                placeholder="+351 ..."
                                                inputMode="tel"
                                                className="w-full border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-sm font-bold text-gray-800 focus:outline-none focus:border-wtech-red focus:ring-2 focus:ring-wtech-red/20 transition-all"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Documento (opcional) */}
                                <div>
                                    <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">
                                        CPF / NIF / Documento <span className="text-gray-300 normal-case font-bold">(opcional)</span>
                                    </label>
                                    <div className="relative">
                                        <FileText size={16} className="absolute left-3.5 top-3.5 text-gray-400" />
                                        <input
                                            type="text"
                                            value={form.document}
                                            onChange={e => setForm({ ...form, document: e.target.value })}
                                            placeholder="Seu documento"
                                            className="w-full border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-sm font-bold text-gray-800 focus:outline-none focus:border-wtech-red focus:ring-2 focus:ring-wtech-red/20 transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Resumo e CTA */}
                                <div className="pt-2">
                                    <div className="flex justify-between items-center text-sm mb-4 bg-gray-50 rounded-xl p-4">
                                        <span className="font-bold text-gray-500">Total a pagar agora</span>
                                        <span className="text-xl font-black text-gray-950">{fmtEur(selectedPrice)}</span>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={submitting || redirecting}
                                        className="w-full bg-wtech-red text-white font-black py-4 rounded-xl text-base uppercase tracking-wide hover:bg-black active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-red-200"
                                    >
                                        {submitting ? (
                                            <>
                                                <Loader2 size={20} className="animate-spin" />
                                                Processando...
                                            </>
                                        ) : (
                                            <>
                                                <Lock size={18} />
                                                {paymentType === 'deposit' ? `Pagar Sinal (${fmtEur(depositPrice)})` : `Pagar Integral (${fmtEur(fullPrice)})`}
                                            </>
                                        )}
                                    </button>

                                    <p className="text-center text-xs text-gray-400 mt-3 font-bold">
                                        Ao continuar, você será redirecionado para o ambiente seguro do Stripe
                                    </p>
                                </div>
                            </form>
                        </div>

                        <p className="text-center text-xs text-gray-400 mt-4 font-bold uppercase tracking-widest">
                            W-Tech Europa · Lisboa 2ª Edição (Out 2026)
                        </p>
                    </motion.div>
                </div>

                {/* Garantia — reforço final */}
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
                            <h3 className="text-lg md:text-xl font-black text-gray-900">Sua vaga garantida pela W-Tech</h3>
                            <p className="text-sm text-gray-600 mt-2 leading-relaxed max-w-3xl">
                                Assim que o pagamento é confirmado, sua <strong>vaga fica reservada no seu nome</strong> imediatamente.
                                Ao escolher o sinal, o <strong>restante de {fmtEur(remaining)}</strong> é acertado até 10 dias antes do curso, conforme orientação da equipe.
                                Você conta com toda a estrutura, a metodologia e a certificação internacional oficiais da <strong>W-Tech</strong>.
                            </p>
                            <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4">
                                {[
                                    { icon: BadgeCheck, text: 'Vaga reservada no seu nome' },
                                    { icon: Lock, text: 'Pagamento seguro via Stripe' },
                                    { icon: Award, text: 'Certificação internacional W-Tech' }
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

export default CheckoutLisboa;
