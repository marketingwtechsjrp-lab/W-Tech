import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, Calendar, MapPin, Download, ArrowRight, Loader2, Clock, Mail, User, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { formatDateLocal } from '../lib/utils';

interface EnrollmentData {
    id: string;
    student_name: string;
    student_email: string;
    status: string;
    amount_paid: number;
    total_amount: number;
    payment_method: string;
    currency: string;
    SITE_Courses: {
        title: string;
        date: string;
        date_end?: string;
        city?: string;
        state?: string;
        start_time?: string;
        what_to_bring?: string;
        currency?: string;
    } | null;
}

const InscricaoConfirmada: React.FC = () => {
    const [searchParams] = useSearchParams();
    const enrollmentId = searchParams.get('eid');
    const urlStatus = searchParams.get('status') || 'approved';

    const [loading, setLoading] = useState(true);
    const [enrollment, setEnrollment] = useState<EnrollmentData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [dots, setDots] = useState('');
    const [pollCount, setPollCount] = useState(0);

    // Animação de ellipsis
    useEffect(() => {
        const interval = setInterval(() => {
            setDots(prev => prev.length >= 3 ? '' : prev + '.');
        }, 500);
        return () => clearInterval(interval);
    }, []);

    const fetchEnrollment = async (showLoading = true) => {
        if (!enrollmentId) {
            setError('Identificador de inscrição não encontrado.');
            setLoading(false);
            return;
        }

        if (showLoading) setLoading(true);

        try {
            const { data, error: fetchError } = await supabase
                .from('SITE_Enrollments')
                .select('id, student_name, student_email, status, amount_paid, total_amount, payment_method, currency, SITE_Courses(title, date, date_end, city, state, start_time, what_to_bring, currency)')
                .eq('id', enrollmentId)
                .single();

            if (fetchError) throw fetchError;
            setEnrollment(data as unknown as EnrollmentData);
        } catch (err: any) {
            console.error('Error fetching enrollment:', err);
            setError('Não foi possível carregar os dados da inscrição. Verifique seu e-mail para confirmação.');
        } finally {
            setLoading(false);
        }
    };

    // Busca inicial
    useEffect(() => {
        fetchEnrollment();
    }, [enrollmentId]);

    // Polling enquanto Pending (máx 60s / 20 tentativas)
    useEffect(() => {
        if (!enrollment || enrollment.status === 'Confirmed' || pollCount >= 20) return;

        const interval = setInterval(() => {
            setPollCount(prev => prev + 1);
            fetchEnrollment(false);
        }, 3000);

        return () => clearInterval(interval);
    }, [enrollment?.status, pollCount]);

    const currencySymbol = (enrollment?.SITE_Courses?.currency || enrollment?.currency || 'BRL') === 'EUR' ? '€'
        : (enrollment?.SITE_Courses?.currency || enrollment?.currency) === 'USD' ? '$'
        : 'R$';

    const course = enrollment?.SITE_Courses;
    const isConfirmed = enrollment?.status === 'Confirmed' || urlStatus === 'approved';

    // Estado: carregando
    if (loading && !enrollment) {
        return (
            <div className="min-h-screen bg-[#FDFCFB] flex flex-col items-center justify-center p-4">
                <Loader2 className="animate-spin text-wtech-gold mb-4" size={48} />
                <p className="text-gray-500 font-bold animate-pulse uppercase tracking-widest text-xs text-center">
                    Confirmando inscrição{dots}
                </p>
            </div>
        );
    }

    // Estado: sem ID de inscrição
    if (!enrollmentId || error) {
        return (
            <div className="min-h-screen bg-[#FDFCFB] flex flex-col items-center justify-center p-6 text-center">
                <AlertCircle size={48} className="text-yellow-400 mb-4" />
                <h1 className="text-xl font-black mb-2 text-gray-800">
                    {error || 'Dados não encontrados'}
                </h1>
                <p className="text-gray-500 text-sm mb-6 max-w-sm">
                    Verifique seu e-mail para a confirmação de inscrição ou entre em contato com o suporte.
                </p>
                <a
                    href="mailto:suporte@w-tech.com"
                    className="bg-wtech-gold text-black font-black px-6 py-3 rounded-xl text-sm"
                >
                    Falar com suporte
                </a>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FDFCFB]">
            {/* Barra dourada topo */}
            <div className="h-1.5 bg-gradient-to-r from-wtech-gold via-yellow-400 to-wtech-gold" />

            <div className="flex items-center justify-center p-4 py-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-lg w-full bg-white rounded-3xl shadow-2xl shadow-gray-200/50 overflow-hidden border border-gray-100"
                >
                    <div className="p-8 md:p-12">
                        <AnimatePresence mode="wait">
                            {/* Estado: Aguardando confirmação de pagamento */}
                            {!isConfirmed && enrollment?.status === 'Pending' ? (
                                <motion.div
                                    key="pending"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="text-center"
                                >
                                    <div className="w-24 h-24 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <Clock size={48} className="text-wtech-gold animate-pulse" />
                                    </div>
                                    <h1 className="text-2xl font-black text-gray-900 mb-2">
                                        Aguardando confirmação{dots}
                                    </h1>
                                    <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                                        Seu pagamento está sendo processado. Para Pix e boleto isso pode levar alguns minutos.
                                    </p>

                                    {course && (
                                        <div className="bg-gray-50 rounded-2xl p-5 text-left border border-gray-100">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Sua inscrição</p>
                                            <p className="font-black text-gray-900 mb-2">{course.title}</p>
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <Calendar size={14} className="text-wtech-gold" />
                                                <span className="font-bold">{formatDateLocal(course.date)}</span>
                                            </div>
                                            {course.city && (
                                                <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                                                    <MapPin size={14} className="text-wtech-gold" />
                                                    <span className="font-bold">{course.city}{course.state ? `, ${course.state}` : ''}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <p className="text-xs text-gray-400 mt-6 font-bold">
                                        Você receberá uma confirmação no e-mail <strong>{enrollment?.student_email}</strong>
                                    </p>
                                </motion.div>
                            ) : (
                                /* Estado: Inscrição Confirmada */
                                <motion.div
                                    key="confirmed"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-center"
                                >
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: 'spring', stiffness: 200, damping: 10, delay: 0.1 }}
                                        className="w-24 h-24 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6"
                                    >
                                        <CheckCircle size={56} />
                                    </motion.div>

                                    <h1 className="text-3xl font-black text-gray-900 mb-1 uppercase tracking-tight">
                                        Inscrição Confirmada!
                                    </h1>
                                    <p className="text-wtech-gold font-black mb-6 uppercase tracking-widest text-xs">
                                        Parabéns, {enrollment?.student_name?.split(' ')[0]}!
                                    </p>

                                    {/* Detalhes do curso */}
                                    <div className="bg-gray-50 rounded-2xl p-6 mb-6 text-left border border-gray-100 space-y-4">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Detalhes da inscrição</p>

                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase">Curso</p>
                                            <p className="font-black text-gray-900">{course?.title || 'Curso W-Tech'}</p>
                                        </div>

                                        {course?.date && (
                                            <div className="flex items-center gap-3">
                                                <Calendar size={16} className="text-wtech-gold shrink-0" />
                                                <div>
                                                    <p className="text-[10px] font-black text-gray-400 uppercase">Data</p>
                                                    <p className="font-bold text-gray-700 text-sm">
                                                        {formatDateLocal(course.date)}
                                                        {course.date_end && course.date_end !== course.date ? ` a ${formatDateLocal(course.date_end)}` : ''}
                                                        {course.start_time ? ` · ${course.start_time}` : ''}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {course?.city && (
                                            <div className="flex items-center gap-3">
                                                <MapPin size={16} className="text-wtech-gold shrink-0" />
                                                <div>
                                                    <p className="text-[10px] font-black text-gray-400 uppercase">Local</p>
                                                    <p className="font-bold text-gray-700 text-sm">
                                                        {[course.city, course.state].filter(Boolean).join(', ')}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex items-center gap-3 border-t border-gray-200 pt-4">
                                            <div className="flex-1">
                                                <p className="text-[10px] font-black text-gray-400 uppercase">Valor Pago</p>
                                                {enrollment?.status === 'Confirmed' ? (
                                                    <p className="text-xl font-black text-green-600">
                                                        {currencySymbol} {(enrollment.amount_paid || 0).toFixed(2).replace('.', ',')}
                                                    </p>
                                                ) : (
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <Loader2 size={14} className="animate-spin text-wtech-gold" />
                                                        <span className="text-sm font-bold text-gray-400">Confirmando com o banco...</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-black text-gray-400 uppercase">Aluno</p>
                                                <p className="font-black text-gray-700 text-sm">{enrollment?.student_name}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Próximos passos */}
                                    <div className="bg-blue-50 rounded-2xl p-5 mb-6 text-left border border-blue-100">
                                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-3">Próximos Passos</p>
                                        <ul className="space-y-2">
                                            <li className="flex items-start gap-2 text-sm text-gray-700">
                                                <Mail size={14} className="text-blue-500 shrink-0 mt-0.5" />
                                                <span className="font-bold">Verifique seu e-mail para a confirmação oficial da inscrição</span>
                                            </li>
                                            <li className="flex items-start gap-2 text-sm text-gray-700">
                                                <User size={14} className="text-blue-500 shrink-0 mt-0.5" />
                                                <span className="font-bold">Nossa equipe entrará em contato com instruções e materiais</span>
                                            </li>
                                            {course?.what_to_bring && (
                                                <li className="flex items-start gap-2 text-sm text-gray-700">
                                                    <CheckCircle size={14} className="text-green-500 shrink-0 mt-0.5" />
                                                    <span className="font-bold">O que trazer: {course.what_to_bring}</span>
                                                </li>
                                            )}
                                        </ul>
                                    </div>

                                    {/* Ações */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <Link
                                            to="/"
                                            className="flex items-center justify-center gap-2 py-3.5 bg-wtech-black text-white rounded-2xl font-black text-sm hover:bg-gray-800 transition-all active:scale-95 shadow-lg shadow-gray-200"
                                        >
                                            Início <ArrowRight size={16} />
                                        </Link>
                                        <button
                                            onClick={() => window.print()}
                                            className="flex items-center justify-center gap-2 py-3.5 border-2 border-gray-100 text-gray-700 rounded-2xl font-black text-sm hover:bg-gray-50 transition-all active:scale-95"
                                        >
                                            Imprimir <Download size={16} />
                                        </button>
                                    </div>

                                    <p className="mt-8 text-xs text-gray-400 font-bold uppercase tracking-widest">
                                        Dúvidas? suporte@w-tech.com
                                    </p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default InscricaoConfirmada;
