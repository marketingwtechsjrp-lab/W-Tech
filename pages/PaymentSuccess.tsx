
import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, ArrowRight, Download, Calendar, Mail, User, BookOpen, Wallet, Loader2, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';

const PaymentSuccess: React.FC = () => {
    const [searchParams] = useSearchParams();
    const [dots, setDots] = useState('');
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [data, setData] = useState<{
        studentName: string,
        courseTitle: string,
        amountPaid: number,
        totalAmount: number,
        currency: string
    } | null>(null);

    const enrollmentId = searchParams.get('eid');

    useEffect(() => {
        const interval = setInterval(() => {
            setDots(prev => prev.length >= 3 ? '' : prev + '.');
        }, 500);
        return () => clearInterval(interval);
    }, []);

    const fetchData = async (showLoading = true) => {
        if (!enrollmentId) {
            setLoading(false);
            return;
        }

        if (showLoading) setIsRefreshing(true);

        try {
            const { data: enrollment, error: eError } = await supabase
                .from('SITE_Enrollments')
                .select('*, SITE_Courses(title, currency)')
                .eq('id', enrollmentId)
                .single();

            if (eError) throw eError;

            if (enrollment) {
                setData({
                    studentName: enrollment.student_name,
                    courseTitle: enrollment.SITE_Courses?.title || 'Curso W-Tech',
                    amountPaid: enrollment.amount_paid || 0,
                    totalAmount: enrollment.total_amount || 0,
                    currency: enrollment.SITE_Courses?.currency || 'BRL'
                });
            }
        } catch (err) {
            console.error("Error fetching success data:", err);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    // Poll for changes if amount is 0
    useEffect(() => {
        fetchData();
        
        // Se o valor for 0, tenta buscar novamente a cada 3 segundos por 30 segundos
        const timer = setInterval(() => {
            if (data && data.amountPaid === 0) {
                fetchData(false);
            }
        }, 3000);

        return () => clearInterval(timer);
    }, [enrollmentId, data?.amountPaid === 0]);

    const getSymbol = (curr: string) => {
        if (curr === 'EUR') return '€';
        if (curr === 'USD') return '$';
        return 'R$';
    };

    if (loading && !data) {
        return (
            <div className="min-h-screen bg-[#FDFCFB] flex flex-col items-center justify-center p-4">
                <Loader2 className="animate-spin text-wtech-gold mb-4" size={48} />
                <p className="text-gray-500 font-bold animate-pulse uppercase tracking-widest text-xs text-center">
                    Confirmando transação com o banco{dots}
                </p>
            </div>
        );
    }

    const remaining = (data?.totalAmount || 0) - (data?.amountPaid || 0);

    return (
        <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-xl w-full bg-white rounded-3xl shadow-2xl shadow-gray-200/50 overflow-hidden border border-gray-100"
            >
                <div className="h-3 bg-gradient-to-r from-wtech-gold via-yellow-400 to-wtech-gold"></div>
                
                <div className="p-8 md:p-12 text-center">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200, damping: 10, delay: 0.2 }}
                        className="relative w-24 h-24 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-8"
                    >
                        <CheckCircle size={56} />
                        {isRefreshing && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <RefreshCw className="animate-spin text-green-500 opacity-20" size={80} />
                            </div>
                        )}
                    </motion.div>

                    <h1 className="text-3xl font-black text-gray-900 mb-2 uppercase tracking-tight">
                        Pagamento Recebido!
                    </h1>
                    <p className="text-green-600 font-black mb-6 uppercase tracking-wider text-sm tracking-widest">
                        Olá, {data?.studentName}
                    </p>
                    
                    <p className="text-gray-500 mb-10 leading-relaxed text-sm">
                        Sua inscrição no curso <strong>{data?.courseTitle}</strong> foi processada. 
                        {data?.amountPaid === 0 ? (
                            <span className="block mt-2 text-wtech-gold font-bold">Aguardando confirmação final da rede bancária...</span>
                        ) : (
                            <span className="block mt-2">Os detalhes abaixo foram atualizados em tempo real.</span>
                        )}
                    </p>

                    <div className="bg-gray-50 rounded-2xl p-6 mb-10 border border-gray-100 text-left">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Resumo do Faturamento</h3>
                            {isRefreshing && <RefreshCw size={12} className="animate-spin text-gray-400" />}
                        </div>
                        
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-gray-100">
                                    <BookOpen className="text-wtech-gold" size={20} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Curso</p>
                                    <p className="text-xs font-black text-gray-800 line-clamp-1">{data?.courseTitle}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-gray-100">
                                    <Wallet className="text-green-600" size={20} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Valor Reconhecido</p>
                                    <div className="flex items-baseline gap-2">
                                        <p className={`text-2xl font-black ${data?.amountPaid === 0 ? 'text-gray-300' : 'text-green-600'}`}>
                                            {getSymbol(data?.currency || 'BRL')} {data?.amountPaid.toFixed(2)}
                                        </p>
                                        {data?.amountPaid === 0 && <Loader2 size={12} className="animate-spin text-gray-400" />}
                                    </div>
                                </div>
                            </div>

                            {remaining > 0 && data?.amountPaid > 0 && (
                                <div className="flex items-center gap-4 pt-4 border-t border-gray-200 border-dashed">
                                    <div className="w-10 h-10 bg-yellow-50 rounded-xl flex items-center justify-center border border-yellow-100">
                                        <Calendar className="text-yellow-600" size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase">Saldo Pendente</p>
                                        <p className="text-lg font-black text-gray-700">
                                            {getSymbol(data?.currency || 'BRL')} {remaining.toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center gap-4 border-t border-gray-200 pt-4 mt-2">
                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-gray-100">
                                    <Mail className="text-blue-500" size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Confirmação</p>
                                    <p className="text-sm font-black text-gray-800">Enviada ao seu e-mail</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Link 
                            to="/" 
                            className="flex items-center justify-center gap-2 py-4 bg-wtech-black text-white rounded-2xl font-black hover:bg-gray-800 transition-all active:scale-95 shadow-lg shadow-gray-200"
                        >
                            Voltar ao Site <ArrowRight size={18} />
                        </Link>
                        
                        <button 
                            onClick={() => window.print()}
                            className="flex items-center justify-center gap-2 py-4 border-2 border-gray-100 text-gray-700 rounded-2xl font-black hover:bg-gray-50 transition-all active:scale-95"
                        >
                            Imprimir Comprovante <Download size={18} />
                        </button>
                    </div>

                    <p className="mt-10 text-xs text-gray-400 flex items-center justify-center gap-2 font-bold uppercase tracking-widest">
                        <User size={12} /> Dúvidas? suporte@w-tech.com
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default PaymentSuccess;
