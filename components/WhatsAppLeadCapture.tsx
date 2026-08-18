import React, { useEffect, useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import { distributeLead } from '../lib/leadDistribution';
import { supabase } from '../lib/supabaseClient';
import { getLeadTrackingFields } from '../lib/tracking';
import { triggerWebhook } from '../lib/webhooks';
import { trackEvent } from './AnalyticsTracker';

const DEFAULT_PHONE = '5512982976468';

interface WhatsAppLeadCaptureProps {
    pageLabel: string;
    className?: string;
    children?: React.ReactNode;
    floating?: boolean;
    ariaLabel?: string;
}

export const WhatsAppLeadCapture: React.FC<WhatsAppLeadCaptureProps> = ({
    pageLabel,
    className = '',
    children,
    floating = false,
    ariaLabel = 'Falar com a equipe no WhatsApp',
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [form, setForm] = useState({ name: '', phone: '', email: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isOpen) return;
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsOpen(false);
        };
        document.addEventListener('keydown', closeOnEscape);
        return () => document.removeEventListener('keydown', closeOnEscape);
    }, [isOpen]);

    const open = () => {
        setError('');
        setIsOpen(true);
        trackEvent('WhatsApp', 'open_lead_capture', pageLabel);
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        const phone = form.phone.replace(/\D/g, '');
        if (phone.length < 10) {
            setError('Informe um WhatsApp válido com DDD.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const assignedTo = await distributeLead();
            const payload = {
                name: form.name.trim(),
                email: form.email.trim() || null,
                phone,
                type: 'WhatsApp_Contact',
                status: 'New',
                context_id: `WhatsApp · ${pageLabel}`,
                tags: ['curso_online_suspensao', 'whatsapp_click', 'lead_capture'],
                assigned_to: assignedTo,
                origin: window.location.href,
                ...getLeadTrackingFields(),
            };

            const { error: insertError } = await supabase.from('SITE_Leads').insert([payload]);
            if (insertError) throw insertError;

            await triggerWebhook('webhook_lead', payload).catch(() => undefined);
            trackEvent('WhatsApp', 'lead_captured', pageLabel);

            const message = `Olá! Meu nome é ${form.name.trim()}. Vim da página do Curso Online de Suspensão e gostaria de tirar uma dúvida.`;
            window.location.href = `https://wa.me/${DEFAULT_PHONE}?text=${encodeURIComponent(message)}`;
        } catch (submitError) {
            console.error('Falha ao captar lead antes do WhatsApp:', submitError);
            setError('Não foi possível iniciar o atendimento. Confira os dados e tente novamente.');
            setLoading(false);
        }
    };

    const triggerClassName = floating
        ? 'fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_14px_35px_rgba(37,211,102,0.34)] transition hover:-translate-y-1 lg:bottom-6 lg:right-6'
        : className;

    return (
        <>
            <button type="button" onClick={open} aria-label={ariaLabel} className={triggerClassName}>
                {children ?? <MessageCircle size={27} fill="currentColor" aria-hidden="true" />}
            </button>

            {isOpen && (
                <div
                    className="fixed inset-0 z-[100] flex items-end justify-center bg-black/65 p-4 backdrop-blur-sm sm:items-center"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="whatsapp-lead-title"
                    onMouseDown={(event) => {
                        if (event.currentTarget === event.target) setIsOpen(false);
                    }}
                >
                    <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white text-[#24211f] shadow-2xl">
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            aria-label="Fechar"
                            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/10 text-white transition hover:bg-black/20"
                        >
                            <X size={20} />
                        </button>

                        <div className="bg-[#075e54] px-6 py-7 text-center text-white">
                            <MessageCircle size={42} className="mx-auto mb-2" aria-hidden="true" />
                            <h2 id="whatsapp-lead-title" className="text-xl font-black">Falar com a W-Tech</h2>
                            <p className="mt-1 text-sm text-white/80">Preencha seus dados para iniciar o atendimento.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4 p-6">
                            <label className="block text-xs font-black uppercase tracking-[0.08em] text-[#625e59]">
                                Nome
                                <input
                                    required
                                    autoFocus
                                    autoComplete="name"
                                    value={form.name}
                                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                                    className="mt-1.5 min-h-12 w-full rounded-xl border border-black/15 bg-[#faf9f7] px-4 text-base font-medium normal-case tracking-normal text-[#24211f] outline-none transition focus:border-[#25D366] focus:ring-2 focus:ring-[#25D366]/20"
                                    placeholder="Seu nome"
                                />
                            </label>

                            <label className="block text-xs font-black uppercase tracking-[0.08em] text-[#625e59]">
                                WhatsApp com DDD
                                <input
                                    required
                                    inputMode="tel"
                                    autoComplete="tel"
                                    value={form.phone}
                                    onChange={(event) => setForm({ ...form, phone: event.target.value })}
                                    className="mt-1.5 min-h-12 w-full rounded-xl border border-black/15 bg-[#faf9f7] px-4 text-base font-medium normal-case tracking-normal text-[#24211f] outline-none transition focus:border-[#25D366] focus:ring-2 focus:ring-[#25D366]/20"
                                    placeholder="(12) 99999-9999"
                                />
                            </label>

                            <label className="block text-xs font-black uppercase tracking-[0.08em] text-[#625e59]">
                                E-mail <span className="font-semibold normal-case tracking-normal text-[#8c8781]">(opcional)</span>
                                <input
                                    type="email"
                                    autoComplete="email"
                                    value={form.email}
                                    onChange={(event) => setForm({ ...form, email: event.target.value })}
                                    className="mt-1.5 min-h-12 w-full rounded-xl border border-black/15 bg-[#faf9f7] px-4 text-base font-medium normal-case tracking-normal text-[#24211f] outline-none transition focus:border-[#25D366] focus:ring-2 focus:ring-[#25D366]/20"
                                    placeholder="voce@email.com"
                                />
                            </label>

                            {error && <p className="text-sm font-semibold text-red-600" role="alert">{error}</p>}

                            <button
                                type="submit"
                                disabled={loading}
                                className="flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 font-black text-white shadow-lg transition hover:bg-[#1ebd5a] disabled:cursor-wait disabled:opacity-70"
                            >
                                {loading ? 'Salvando seus dados...' : 'Continuar para o WhatsApp'}
                                {!loading && <Send size={18} aria-hidden="true" />}
                            </button>
                            <p className="text-center text-[11px] leading-4 text-[#817b75]">
                                Seus dados serão usados pela W-Tech para dar continuidade ao atendimento.
                            </p>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};
