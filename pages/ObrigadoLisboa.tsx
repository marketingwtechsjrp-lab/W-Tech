import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { CheckCircle, ArrowRight, Instagram, Globe, MessageCircle } from 'lucide-react';

const ObrigadoLisboa: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [enrollment, setEnrollment] = useState<any>(null);

    const enrollmentId = searchParams.get('eid');
    const sessionId = searchParams.get('session_id');

    useEffect(() => {
        const confirmPayment = async () => {
            if (!enrollmentId) {
                setStatus('error');
                return;
            }

            try {
                // 1. Fetch Enrollment to check if it belongs to the Lisboa course and get student details
                const { data: enr, error: fetchError } = await supabase
                    .from('SITE_Enrollments')
                    .select('*, SITE_Courses(title)')
                    .eq('id', enrollmentId)
                    .single();

                if (fetchError || !enr) throw new Error('Inscrição não encontrada.');

                setEnrollment(enr);

                // 2. Update status to Confirmed and set amount paid
                // We assume if they reached here from a valid session, it's paid (Simplified flow as requested)
                const { error: updateError } = await supabase
                    .from('SITE_Enrollments')
                    .update({
                        status: 'Confirmed',
                        amount_paid: 380, // Valor fixo conforme áudio
                        payment_method: 'Stripe'
                    })
                    .eq('id', enrollmentId);

                if (updateError) throw updateError;

                // 3. Also insert a transaction for financial control
                await supabase.from('SITE_Transactions').insert([{
                    description: `Matrícula Online: ${enr.SITE_Courses?.title} - ${enr.student_name}`,
                    category: 'Sales',
                    type: 'Income',
                    amount: 380,
                    currency: 'EUR',
                    payment_method: 'Stripe',
                    enrollment_id: enrollmentId,
                    date: new Date().toISOString()
                }]);

                setStatus('success');
            } catch (err) {
                console.error('Error confirming payment:', err);
                setStatus('error');
            }
        };

        confirmPayment();
    }, [enrollmentId]);

    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-wtech-red border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400 font-bold uppercase tracking-widest animate-pulse">Confirmando sua inscrição...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans flex items-center justify-center p-6">
            <div className="max-w-2xl w-full bg-zinc-900 border border-white/10 p-8 md:p-12 rounded-2xl shadow-2xl relative overflow-hidden">
                {/* Decorative background */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-wtech-red/10 blur-3xl -translate-y-16 translate-x-16 rounded-full"></div>
                
                {status === 'success' ? (
                    <div className="relative z-10 text-center">
                        <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: 'spring', damping: 12 }}
                            className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_30px_rgba(34,197,94,0.3)]"
                        >
                            <CheckCircle size={48} className="text-white" strokeWidth={3} />
                        </motion.div>

                        <motion.h1 
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-4"
                        >
                            Inscrição <span className="text-wtech-red">Confirmada!</span>
                        </motion.h1>

                        <motion.p 
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            className="text-gray-400 text-lg mb-8"
                        >
                            Parabéns, <strong>{enrollment?.student_name}</strong>! <br/>
                            Sua vaga para o <strong>W-Tech Europa em Lisboa</strong> está garantida e seu pagamento de €380 foi processado com sucesso.
                        </motion.p>

                        <div className="bg-black/50 border border-white/5 p-6 rounded-xl mb-8 text-left">
                            <h3 className="text-xs font-black uppercase text-gray-500 tracking-widest mb-4">Próximos Passos:</h3>
                            <ul className="space-y-3">
                                <li className="flex gap-3 text-sm font-medium">
                                    <span className="text-wtech-red font-bold">01.</span>
                                    <span>Você receberá um e-mail de confirmação com os detalhes técnicos.</span>
                                </li>
                                <li className="flex gap-3 text-sm font-medium">
                                    <span className="text-wtech-red font-bold">02.</span>
                                    <span>Nossa equipe entrará em contato via WhatsApp para boas-vindas.</span>
                                </li>
                                <li className="flex gap-3 text-sm font-medium">
                                    <span className="text-wtech-red font-bold">03.</span>
                                    <span>Salve a data: 25 de Abril de 2026, na sede da Liqui Moly.</span>
                                </li>
                            </ul>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <a 
                                href="https://instagram.com/wtechbrasil" 
                                target="_blank" 
                                rel="noreferrer"
                                className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 transition-colors py-4 rounded-lg font-bold uppercase text-xs tracking-widest"
                            >
                                <Instagram size={18} /> Seguir no Instagram
                            </a>
                            <button 
                                onClick={() => navigate('/')}
                                className="flex items-center justify-center gap-2 bg-white text-black hover:bg-gray-200 transition-colors py-4 rounded-lg font-bold uppercase text-xs tracking-widest"
                            >
                                <Globe size={18} /> Voltar ao Site
                            </button>
                        </div>

                        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col items-center gap-4">
                            <img 
                                src="https://w-techstore.com.br/wp-content/uploads/2025/11/logo-w-tech-branca.png" 
                                alt="W-Tech" 
                                className="h-8 opacity-50"
                            />
                            <p className="text-[10px] text-gray-600 uppercase font-black tracking-widest">
                                W-Tech Europa Experience | Lisboa 2026
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                            <div className="text-3xl font-bold">!</div>
                        </div>
                        <h2 className="text-2xl font-black uppercase mb-4">Ops! Algo deu errado.</h2>
                        <p className="text-gray-500 mb-8">Não conseguimos processar automaticamente sua confirmação. Por favor, entre em contato com nosso suporte via WhatsApp.</p>
                        <a 
                            href="https://wa.me/351912345678" 
                            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-lg font-black uppercase text-sm tracking-widest transition-all"
                        >
                            <MessageCircle size={20} /> Falar com Suporte
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ObrigadoLisboa;
