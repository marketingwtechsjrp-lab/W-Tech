import React from 'react';
import { ArrowRight, Check, ShieldCheck, User } from 'lucide-react';
import { QualificationQuiz } from '../QualificationQuiz';
import type { LandingPageWithCourse } from '../../hooks/useLandingPage';

/**
 * Formulário de inscrição compartilhado pelos templates V5+.
 *
 * Regra de negócio central: o PREÇO do curso só aparece quando o checkout
 * automático está ativo (prop checkoutAtivo). Sem checkout, a página é
 * persuasiva mas não cita valores — o lead vai para o CRM/WhatsApp.
 */
type Props = {
    lp: LandingPageWithCourse;
    theme: 'dark' | 'light';
    checkoutAtivo: boolean;
    isFullOrDone: boolean;
    form: { name: string; email: string; phone: string };
    setForm: (f: { name: string; email: string; phone: string }) => void;
    paymentType: 'full' | 'deposit';
    setPaymentType: (t: 'full' | 'deposit') => void;
    submitted: boolean;
    setSubmitted: (v: boolean) => void;
    handleSubmit: (e: React.FormEvent) => void;
    whatsappGlobal?: string;
};

export const LPEnrollForm: React.FC<Props> = ({
    lp, theme, checkoutAtivo, isFullOrDone,
    form, setForm, paymentType, setPaymentType,
    submitted, setSubmitted, handleSubmit, whatsappGlobal
}) => {
    const dark = theme === 'dark';

    const inputCls = dark
        ? 'w-full bg-white/5 border border-white/15 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-white/30 focus:bg-white/10 focus:border-wtech-gold focus:ring-2 focus:ring-wtech-gold/25 outline-none transition-all'
        : 'w-full bg-gray-50 border border-gray-200 rounded-xl py-4 pl-12 pr-4 text-zinc-900 placeholder:text-gray-400 focus:bg-white focus:border-wtech-gold focus:ring-2 focus:ring-wtech-gold/25 outline-none transition-all';
    const labelCls = dark
        ? 'text-xs font-bold text-white/50 uppercase ml-1 mb-2 block'
        : 'text-xs font-bold text-gray-500 uppercase ml-1 mb-2 block';

    if (lp.quizEnabled) {
        return <QualificationQuiz lp={lp as any} onComplete={() => setSubmitted(true)} whatsappGlobalNumber={whatsappGlobal} />;
    }

    if (submitted) {
        return (
            <div className={`text-center py-12 rounded-xl border ${dark ? 'bg-green-500/10 border-green-500/30' : 'bg-green-50 border-green-200'}`}>
                <div className="w-20 h-20 bg-green-600 text-white rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check size={40} strokeWidth={3} />
                </div>
                <h3 className={`text-2xl font-bold mb-2 ${dark ? 'text-white' : 'text-zinc-900'}`}>Inscrição Recebida!</h3>
                <p className={dark ? 'text-green-400' : 'text-green-700'}>Em breve entraremos em contato pelo WhatsApp.</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label className={labelCls}>Nome Completo</label>
                <div className="relative">
                    <User className={`absolute left-4 top-3.5 ${dark ? 'text-white/30' : 'text-gray-400'}`} size={20} />
                    <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="Digite seu nome" />
                </div>
            </div>
            <div>
                <label className={labelCls}>WhatsApp</label>
                <div className="relative">
                    <span className={`absolute left-4 top-4 font-bold text-xs ${dark ? 'text-white/30' : 'text-gray-400'}`}>BR</span>
                    <input required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className={inputCls} placeholder="(00) 00000-0000" />
                </div>
            </div>
            <div>
                <label className={labelCls}>E-mail</label>
                <div className="relative">
                    <span className={`absolute left-4 top-4 ${dark ? 'text-white/30' : 'text-gray-400'}`}>@</span>
                    <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={inputCls} placeholder="Digite seu e-mail" />
                </div>
            </div>

            <button type="submit" className="w-full bg-gradient-to-r from-wtech-gold to-yellow-600 text-black py-4 rounded-xl font-black text-lg uppercase tracking-wider hover:shadow-[0_10px_20px_rgba(212,175,55,0.35)] hover:scale-[1.01] transition-all flex items-center justify-center gap-2">
                {isFullOrDone ? 'Entrar na Lista de Espera' : 'Quero Garantir Minha Vaga'} <ArrowRight size={20} strokeWidth={3} />
            </button>

            <div className={`flex items-center justify-center gap-4 pt-4 border-t text-xs font-bold uppercase ${dark ? 'border-white/10 text-white/40' : 'border-gray-100 text-gray-400'}`}>
                <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-green-500" /> Seus dados estão seguros</span>
                <span>•</span>
                <span>Oficial W-Tech</span>
            </div>
        </form>
    );
};

export default LPEnrollForm;
