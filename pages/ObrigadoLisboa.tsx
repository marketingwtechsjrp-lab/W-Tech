import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { syncStudentToLeads } from '../lib/leads';
import { CheckCircle, ArrowRight, Instagram, Globe, MessageCircle } from 'lucide-react';

// Curso Lisboa II — Outubro 2026 (mesmo COURSE_ID usado no CheckoutLisboa).
const COURSE_ID = 'b88e8979-520a-4c37-8cb8-1128e7e5dffc';

// O webhook do Stripe normalmente grava antes do redirect chegar aqui, mas não é
// garantido (rede do cliente, retry do Stripe). Em vez de confirmar por conta
// própria, esta página espera o servidor confirmar.
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 40000;

const ObrigadoLisboa: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'loading' | 'success' | 'pending' | 'error'>('loading');
    const [enrollment, setEnrollment] = useState<any>(null);

    const [qForm, setQForm] = useState({
        fullName: '',
        tShirtSize: 'M',
        cpf: '',
        zipCode: '',
        address: '',
        addressNumber: '',
        addressNeighborhood: '',
        city: '',
        state: '',
        hasWorkshop: 'no',
        workshopName: '',
        worksWithSuspensions: 'no',
        tookSuspensionCourse: 'no',
        experienceYears: ''
    });
    const [savingQ, setSavingQ] = useState(false);
    const [qSubmitted, setQSubmitted] = useState(false);

    // `session_id` e `type` continuam na URL (úteis para suporte/analytics), mas NÃO
    // alimentam mais nada nesta página — o que vale é o que o webhook gravou no banco.
    const enrollmentId = searchParams.get('eid');
    const leadId = searchParams.get('lid');

    useEffect(() => {
        let cancelled = false;

        const confirmPayment = async () => {
            if (enrollmentId === 'test' || enrollmentId === 'mock') {
                const mockEnr = {
                    student_name: 'Aluno Teste',
                    student_cpf: '',
                    t_shirt_size: 'M',
                    zip_code: '',
                    address: '',
                    address_number: '',
                    address_neighborhood: '',
                    city: '',
                    state: '',
                    has_workshop: false,
                    workshop_name: '',
                    works_with_suspensions: false,
                    took_suspension_course: false,
                    experience_years: '',
                    // Valores só para a pré-visualização (?eid=test) não renderizar € 0,00.
                    amount_paid: 150,
                    total_amount: 480,
                    currency: 'EUR',
                    SITE_Courses: { title: 'W-Tech Lisboa Out 2026', currency: 'EUR' }
                };
                setEnrollment(mockEnr);
                setQForm(prev => ({
                    ...prev,
                    fullName: mockEnr.student_name,
                    tShirtSize: mockEnr.t_shirt_size,
                    hasWorkshop: 'no',
                    worksWithSuspensions: 'no',
                    tookSuspensionCourse: 'no'
                }));
                setStatus('success');
                return;
            }

            if (!enrollmentId && !leadId) {
                setStatus('error');
                return;
            }

            try {
                // 1. Consulta a inscrição — SOMENTE LEITURA.
                //    Quem cria e confirma é o WEBHOOK do Stripe, com o valor real da
                //    sessão. Antes esta página criava a inscrição e a marcava como paga
                //    a partir do ?type= da URL: qualquer pessoa que abrisse o link
                //    marcava matrícula como quitada sem ter pago nada.
                //    O retry existe porque o redirect pode chegar antes do webhook.
                let enr: any = null;

                const fetchEnrollment = async (): Promise<any | null> => {
                    if (enrollmentId) {
                        const { data } = await supabase
                            .from('SITE_Enrollments')
                            .select('*, SITE_Courses(title, currency)')
                            .eq('id', enrollmentId)
                            .maybeSingle();
                        return data;
                    }

                    const { data: lead } = await supabase
                        .from('SITE_Leads')
                        .select('email')
                        .eq('id', leadId)
                        .maybeSingle();

                    const leadEmail = ((lead as any)?.email || '').trim().toLowerCase();
                    if (!leadEmail) return null;

                    // ilike porque o webhook grava em minúsculas mas registros antigos
                    // podem ter maiúsculas; `%`/`_` escapados (ilike trata como padrão).
                    const { data } = await supabase
                        .from('SITE_Enrollments')
                        .select('*, SITE_Courses(title, currency)')
                        .eq('course_id', COURSE_ID)
                        .ilike('student_email', leadEmail.replace(/[%_\\]/g, '\\$&'))
                        .order('created_at', { ascending: false })
                        .limit(1);

                    return data?.[0] || null;
                };

                const deadline = Date.now() + POLL_TIMEOUT_MS;
                while (!cancelled) {
                    enr = await fetchEnrollment();
                    if (enr?.status === 'Confirmed') break;
                    if (Date.now() >= deadline) break;
                    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
                }

                if (cancelled) return;
                if (!enr) throw new Error('Inscrição não encontrada.');

                setEnrollment(enr);
                setQForm(prev => ({
                    ...prev,
                    fullName: enr.student_name || '',
                    zipCode: enr.zip_code || '',
                    address: enr.address || '',
                    addressNumber: enr.address_number || '',
                    addressNeighborhood: enr.address_neighborhood || '',
                    city: enr.city || '',
                    state: enr.state || '',
                    cpf: enr.student_cpf || '',
                    tShirtSize: enr.t_shirt_size || 'M',
                    hasWorkshop: enr.has_workshop ? 'yes' : 'no',
                    workshopName: enr.workshop_name || '',
                    worksWithSuspensions: enr.works_with_suspensions ? 'yes' : 'no',
                    tookSuspensionCourse: enr.took_suspension_course ? 'yes' : 'no',
                    experienceYears: enr.experience_years || ''
                }));

                if (enr.t_shirt_size || enr.student_cpf) {
                    setQSubmitted(true);
                }

                // 2. Nada é gravado aqui. Status, valor pago, transação financeira e
                //    e-mail de confirmação são responsabilidade do webhook do Stripe
                //    (server/edge/stripe-webhook.ts), que valida a assinatura HMAC e usa
                //    o amount_total real da sessão — nunca um valor vindo da URL.
                setStatus(enr.status === 'Confirmed' ? 'success' : 'pending');
            } catch (err) {
                console.error('Error confirming payment:', err);
                setStatus('error');
            }
        };

        confirmPayment();
        return () => { cancelled = true; };
    }, [enrollmentId, leadId]);

    const handleQSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingQ(true);
        if (enrollmentId === 'test' || enrollmentId === 'mock') {
            setQSubmitted(true);
            alert('Cadastro de teste concluído com sucesso!');
            setSavingQ(false);
            return;
        }
        try {
            const payload = {
                student_name: qForm.fullName,
                t_shirt_size: qForm.tShirtSize,
                student_cpf: qForm.cpf,
                zip_code: qForm.zipCode,
                address: qForm.address,
                address_number: qForm.addressNumber,
                address_neighborhood: qForm.addressNeighborhood,
                city: qForm.city,
                state: qForm.state,
                has_workshop: qForm.hasWorkshop === 'yes',
                workshop_name: qForm.hasWorkshop === 'yes' ? qForm.workshopName : '',
                works_with_suspensions: qForm.worksWithSuspensions === 'yes',
                took_suspension_course: qForm.tookSuspensionCourse === 'yes',
                experience_years: qForm.experienceYears
            };

            // 1. Update SITE_Enrollments (usa o id da inscrição resolvida — no fluxo
            //    novo a inscrição foi criada a partir do lead, então não há eid na URL).
            const { error: updateError } = await supabase
                .from('SITE_Enrollments')
                .update(payload)
                .eq('id', enrollment?.id);

            if (updateError) throw updateError;

            // 2. Sync to leads in CRM
            const updatedEnrollment = {
                ...enrollment,
                studentName: qForm.fullName,
                tShirtSize: qForm.tShirtSize,
                studentCpf: qForm.cpf,
                zipCode: qForm.zipCode,
                address: qForm.address,
                addressNumber: qForm.addressNumber,
                addressNeighborhood: qForm.addressNeighborhood,
                city: qForm.city,
                state: qForm.state,
                hasWorkshop: qForm.hasWorkshop === 'yes',
                workshopName: qForm.hasWorkshop === 'yes' ? qForm.workshopName : '',
                worksWithSuspensions: qForm.worksWithSuspensions === 'yes',
                tookSuspensionCourse: qForm.tookSuspensionCourse === 'yes',
                experienceYears: qForm.experienceYears
            };

            await syncStudentToLeads(updatedEnrollment);

            setQSubmitted(true);
            alert('Informações enviadas com sucesso! Obrigado.');
        } catch (err: any) {
            console.error('Error saving questionnaire:', err);
            alert('Erro ao salvar as informações: ' + err.message);
        }
        setSavingQ(false);
    };

    // Tudo o que é dinheiro vem do banco (gravado pelo webhook a partir da sessão
    // do Stripe). Nada é derivado do ?type= da URL — era daí que saía o "€150/€480"
    // fixo, que mentia sempre que o valor real fosse outro.
    const paidAmount = Number(enrollment?.amount_paid || 0);
    const totalAmount = Number(enrollment?.total_amount || 0);
    const remaining = Math.max(0, totalAmount - paidAmount);
    const isPartial = remaining > 0;
    const curCode = String(enrollment?.currency || enrollment?.SITE_Courses?.currency || 'EUR').toUpperCase();
    const curSymbol = curCode === 'EUR' ? '€' : curCode === 'USD' ? '$' : 'R$';
    const money = (n: number) => `${curSymbol} ${Number(n || 0).toFixed(2).replace('.', ',')}`;

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
                            Inscrição <span className="text-wtech-red">{isPartial ? 'Pré-Reservada!' : 'Confirmada!'}</span>
                        </motion.h1>

                        <motion.p 
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            className="text-gray-400 text-lg mb-8"
                        >
                            Parabéns, <strong>{enrollment?.student_name}</strong>! <br/>
                            Sua vaga para o <strong>W-Tech Europa em Lisboa</strong> foi assegurada e seu {isPartial ? 'sinal' : 'pagamento'} de <strong>{money(paidAmount)}</strong> foi processado com sucesso.
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
                                    <span>{isPartial
                                        ? `Sinal de entrada pago (${money(paidAmount)}). Restante (${money(remaining)}) a ser acertado até 10 dias antes do curso, conforme orientação da equipe.`
                                        : `Pagamento concluído (${money(paidAmount)}). Não há saldo pendente — sua vaga está 100% quitada.`}</span>
                                </li>
                            </ul>
                        </div>

                        {/* QUESTIONNAIRE FORM */}
                        {!qSubmitted ? (
                            <div className="mt-8 border-t border-white/10 pt-8 text-left">
                                <h3 className="text-xl font-black uppercase text-white mb-6 tracking-tighter flex items-center gap-2">
                                    <span className="w-1.5 h-6 bg-wtech-red rounded-sm inline-block"></span>
                                    Informações Complementares para o Curso
                                </h3>
                                <p className="text-gray-400 text-sm mb-6">
                                    Para concluir sua matrícula e preparar sua credencial e camiseta oficial, preencha as informações abaixo:
                                </p>

                                <form onSubmit={handleQSubmit} className="space-y-6">
                                    {/* Nome Completo */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-wider text-gray-400">Nome Completo (para o Certificado)</label>
                                        <input
                                            value={qForm.fullName}
                                            onChange={e => setQForm({ ...qForm, fullName: e.target.value })}
                                            className="w-full bg-black border border-white/10 p-3.5 rounded-xl text-white outline-none focus:border-wtech-red focus:ring-1 focus:ring-wtech-red font-bold text-sm"
                                            placeholder="Como quer no certificado"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* CPF */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-black uppercase tracking-wider text-gray-400">CPF / NIF / Documento</label>
                                            <input
                                                value={qForm.cpf}
                                                onChange={e => setQForm({ ...qForm, cpf: e.target.value })}
                                                className="w-full bg-black border border-white/10 p-3.5 rounded-xl text-white outline-none focus:border-wtech-red focus:ring-1 focus:ring-wtech-red font-bold text-sm"
                                                placeholder="Seu documento"
                                            />
                                        </div>

                                        {/* Tamanho da Camiseta */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-black uppercase tracking-wider text-gray-400">Tamanho da Camiseta</label>
                                            <select
                                                value={qForm.tShirtSize}
                                                onChange={e => setQForm({ ...qForm, tShirtSize: e.target.value })}
                                                className="w-full bg-black border border-white/10 p-3.5 rounded-xl text-white outline-none focus:border-wtech-red focus:ring-1 focus:ring-wtech-red font-bold text-sm"
                                            >
                                                <option value="P">P (S)</option>
                                                <option value="M">M (M)</option>
                                                <option value="G">G (L)</option>
                                                <option value="GG">GG (XL)</option>
                                                <option value="XG">XG (XXL)</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Endereço Title */}
                                    <h4 className="text-xs font-black uppercase tracking-widest text-wtech-gold mt-6 flex items-center gap-1.5">
                                        <span className="w-1 h-3 bg-wtech-gold rounded-sm inline-block"></span>
                                        Endereço de Envio
                                    </h4>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {/* CEP */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-black uppercase tracking-wider text-gray-400">Código Postal / CEP</label>
                                            <input
                                                value={qForm.zipCode}
                                                onChange={e => setQForm({ ...qForm, zipCode: e.target.value })}
                                                className="w-full bg-black border border-white/10 p-3.5 rounded-xl text-white outline-none focus:border-wtech-red focus:ring-1 focus:ring-wtech-red font-bold text-sm"
                                                placeholder="Ex: 2710-297"
                                            />
                                        </div>

                                        {/* Cidade */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-black uppercase tracking-wider text-gray-400">Cidade</label>
                                            <input
                                                value={qForm.city}
                                                onChange={e => setQForm({ ...qForm, city: e.target.value })}
                                                className="w-full bg-black border border-white/10 p-3.5 rounded-xl text-white outline-none focus:border-wtech-red focus:ring-1 focus:ring-wtech-red font-bold text-sm"
                                                placeholder="Ex: Sintra"
                                            />
                                        </div>

                                        {/* Estado */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-black uppercase tracking-wider text-gray-400">Estado / Distrito</label>
                                            <input
                                                value={qForm.state}
                                                onChange={e => setQForm({ ...qForm, state: e.target.value })}
                                                className="w-full bg-black border border-white/10 p-3.5 rounded-xl text-white outline-none focus:border-wtech-red focus:ring-1 focus:ring-wtech-red font-bold text-sm"
                                                placeholder="Ex: Lisboa"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {/* Logradouro / Rua */}
                                        <div className="md:col-span-2 space-y-2">
                                            <label className="text-xs font-black uppercase tracking-wider text-gray-400">Logradouro / Rua</label>
                                            <input
                                                value={qForm.address}
                                                onChange={e => setQForm({ ...qForm, address: e.target.value })}
                                                className="w-full bg-black border border-white/10 p-3.5 rounded-xl text-white outline-none focus:border-wtech-red focus:ring-1 focus:ring-wtech-red font-bold text-sm"
                                                placeholder="Nome da rua/avenida"
                                            />
                                        </div>

                                        {/* Número */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-black uppercase tracking-wider text-gray-400">Número</label>
                                            <input
                                                value={qForm.addressNumber}
                                                onChange={e => setQForm({ ...qForm, addressNumber: e.target.value })}
                                                className="w-full bg-black border border-white/10 p-3.5 rounded-xl text-white outline-none focus:border-wtech-red focus:ring-1 focus:ring-wtech-red font-bold text-sm"
                                                placeholder="Ex: 10A"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-wider text-gray-400">Freguesia / Bairro / Complemento</label>
                                        <input
                                            value={qForm.addressNeighborhood}
                                            onChange={e => setQForm({ ...qForm, addressNeighborhood: e.target.value })}
                                            className="w-full bg-black border border-white/10 p-3.5 rounded-xl text-white outline-none focus:border-wtech-red focus:ring-1 focus:ring-wtech-red font-bold text-sm"
                                            placeholder="Bairro ou freguesia"
                                        />
                                    </div>

                                    {/* Experiência Title */}
                                    <h4 className="text-xs font-black uppercase tracking-widest text-wtech-gold mt-6 flex items-center gap-1.5">
                                        <span className="w-1 h-3 bg-wtech-gold rounded-sm inline-block"></span>
                                        Questionário Técnico
                                    </h4>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Tem oficina */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-black uppercase tracking-wider text-gray-400">Você já tem oficina?</label>
                                            <select
                                                value={qForm.hasWorkshop}
                                                onChange={e => setQForm({ ...qForm, hasWorkshop: e.target.value })}
                                                className="w-full bg-black border border-white/10 p-3.5 rounded-xl text-white outline-none focus:border-wtech-red focus:ring-1 focus:ring-wtech-red font-bold text-sm"
                                            >
                                                <option value="yes">Sim</option>
                                                <option value="no">Não</option>
                                            </select>
                                        </div>

                                        {/* Qual oficina */}
                                        {qForm.hasWorkshop === 'yes' && (
                                            <div className="space-y-2">
                                                <label className="text-xs font-black uppercase tracking-wider text-gray-400">Nome da Oficina</label>
                                                <input
                                                    value={qForm.workshopName}
                                                    onChange={e => setQForm({ ...qForm, workshopName: e.target.value })}
                                                    className="w-full bg-black border border-white/10 p-3.5 rounded-xl text-white outline-none focus:border-wtech-red focus:ring-1 focus:ring-wtech-red font-bold text-sm"
                                                    placeholder="Nome da sua oficina"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Já trabalha com suspensão */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-black uppercase tracking-wider text-gray-400">Já trabalha com suspensão?</label>
                                            <select
                                                value={qForm.worksWithSuspensions}
                                                onChange={e => setQForm({ ...qForm, worksWithSuspensions: e.target.value })}
                                                className="w-full bg-black border border-white/10 p-3.5 rounded-xl text-white outline-none focus:border-wtech-red focus:ring-1 focus:ring-wtech-red font-bold text-sm"
                                            >
                                                <option value="yes">Sim</option>
                                                <option value="no">Não</option>
                                            </select>
                                        </div>

                                        {/* Já fez curso de suspensão */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-black uppercase tracking-wider text-gray-400">Já fez algum curso de suspensão?</label>
                                            <select
                                                value={qForm.tookSuspensionCourse}
                                                onChange={e => setQForm({ ...qForm, tookSuspensionCourse: e.target.value })}
                                                className="w-full bg-black border border-white/10 p-3.5 rounded-xl text-white outline-none focus:border-wtech-red focus:ring-1 focus:ring-wtech-red font-bold text-sm"
                                            >
                                                <option value="yes">Sim</option>
                                                <option value="no">Não</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Há quanto tempo trabalha na área */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-wider text-gray-400">Há quanto tempo trabalha na área mecânica?</label>
                                        <input
                                            value={qForm.experienceYears}
                                            onChange={e => setQForm({ ...qForm, experienceYears: e.target.value })}
                                            className="w-full bg-black border border-white/10 p-3.5 rounded-xl text-white outline-none focus:border-wtech-red focus:ring-1 focus:ring-wtech-red font-bold text-sm"
                                            placeholder="Ex: 2 anos, iniciante, não trabalho na área, etc."
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={savingQ}
                                        className="w-full bg-wtech-red hover:bg-white hover:text-black text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-8 shadow-[0_15px_30px_rgba(230,0,0,0.2)]"
                                    >
                                        {savingQ ? 'A Salvar...' : 'Concluir Cadastro de Aluno'}
                                        <ArrowRight size={16} />
                                    </button>
                                </form>
                            </div>
                        ) : (
                            <div className="mt-8 border-t border-white/10 pt-8 text-center bg-green-500/10 border border-green-500/20 p-6 rounded-xl relative z-10">
                                <CheckCircle size={32} className="text-green-500 mx-auto mb-3" />
                                <h4 className="font-black uppercase text-white tracking-widest text-sm mb-1">Cadastro de Aluno Concluído!</h4>
                                <p className="text-gray-400 text-xs leading-relaxed">Suas informações de tamanho de camiseta, endereço e histórico profissional foram salvas com sucesso.</p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                            <a 
                                href="https://instagram.com/wtechbrasil" 
                                target="_blank" 
                                rel="noreferrer"
                                className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 transition-colors py-4 rounded-lg font-bold uppercase text-xs tracking-widest"
                            >
                                <Instagram size={18} /> Seguir no Instagram
                            </a>
                            {qSubmitted ? (
                                <a 
                                    href="https://chat.whatsapp.com/DpbyOLZ7QrN2D5rFQRv3WQ?mode=gi_t" 
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-black transition-colors py-4 rounded-lg uppercase text-xs tracking-widest shadow-[0_0_20px_rgba(22,163,74,0.4)] relative overflow-hidden animate-pulse"
                                >
                                    <MessageCircle size={18} /> Grupo VIP de Lisboa no WhatsApp
                                </a>
                            ) : (
                                <button 
                                    onClick={() => navigate('/')}
                                    className="flex items-center justify-center gap-2 bg-white text-black hover:bg-gray-200 transition-colors py-4 rounded-lg font-bold uppercase text-xs tracking-widest"
                                >
                                    <Globe size={18} /> Voltar ao Site
                                </button>
                            )}
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
                ) : status === 'pending' ? (
                    /* Pagamento feito, mas o webhook ainda não gravou (ou falhou). Nunca
                       mostrar erro aqui: o dinheiro do cliente JÁ saiu, e "algo deu errado"
                       gera pânico e chamado no suporte sem necessidade. */
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                        <h2 className="text-2xl font-black uppercase mb-4">Pagamento recebido!</h2>
                        <p className="text-gray-500 mb-8">
                            Estamos a confirmar a sua inscrição — costuma levar alguns segundos.
                            Pode fechar esta página com tranquilidade: assim que confirmar, você
                            recebe o e-mail com todos os detalhes. Qualquer dúvida, fale connosco.
                        </p>
                        <a
                            href="https://wa.me/351912345678"
                            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-lg font-black uppercase text-sm tracking-widest transition-all"
                        >
                            <MessageCircle size={20} /> Falar com Suporte
                        </a>
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
