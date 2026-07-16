import React, { useEffect, useMemo, useState } from 'react';
import { X, Save, CalendarClock, Loader2 } from 'lucide-react';
import { supabase } from '../../../../lib/supabaseClient';
import { useAuth } from '../../../../context/AuthContext';
import {
    SECTORS, DELIVERY_TYPES, PRIORITIES, PRIORITY_LABELS,
    calcSlaDueAt, isLaunchLike, toDateInputValue, dateInputToIso,
    type RequestPriority,
} from '../../../../lib/popMarketing';
import type { PopNotify } from './PopMarketingView';

/**
 * Formulário de novo Pedido de Campanha (POP 8.1).
 * Ao criar: status "Recebido", prioridade "Media" e SLA automático
 * (+5 dias úteis, ou +30 dias corridos para Kit de evento / lançamento),
 * com o prazo calculado exibido e editável antes de salvar.
 */

interface RequestFormModalProps {
    notify: PopNotify;
    onClose: () => void;
    onCreated: () => void;
}

const inputCls = 'w-full bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl px-4 py-2.5 text-sm text-[var(--admin-text-primary)] outline-none focus:border-purple-400 dark:focus:border-purple-500 focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900/20 transition-all font-medium';
const labelCls = 'block text-[10px] font-black uppercase tracking-widest text-[var(--admin-text-tertiary)] mb-1.5';

const RequestFormModal = ({ notify, onClose, onCreated }: RequestFormModalProps) => {
    const { user } = useAuth();
    const [isSaving, setIsSaving] = useState(false);

    // ── Campos do POP 8.1 ──
    const [requesterName, setRequesterName] = useState(user?.name || '');
    const [requesterSector, setRequesterSector] = useState<string>('Marketing');
    const [requesterContact, setRequesterContact] = useState('');
    const [title, setTitle] = useState('');
    const [objective, setObjective] = useState('');
    // Meta do pedido (POP 8.8) — o 8.8 compara o resultado real contra ela
    const [expectedResult, setExpectedResult] = useState('');
    const [targetAudience, setTargetAudience] = useState('');
    const [deliveryType, setDeliveryType] = useState<string>('Post');
    const [contextRefs, setContextRefs] = useState('');
    const [desiredDate, setDesiredDate] = useState('');
    const [urgencyReason, setUrgencyReason] = useState('');
    const [budget, setBudget] = useState('');
    const [costCenter, setCostCenter] = useState('');
    const [approverName, setApproverName] = useState('');
    const [priority, setPriority] = useState<RequestPriority>('Media');

    // ── SLA: recalculado automaticamente até o usuário editar manualmente ──
    const [slaDate, setSlaDate] = useState(() => toDateInputValue(calcSlaDueAt('Post')));
    const [slaTouched, setSlaTouched] = useState(false);

    const isBigDeadline = deliveryType === 'Kit de evento' || isLaunchLike(title, objective);

    useEffect(() => {
        if (slaTouched) return; // usuário assumiu o controle do prazo
        setSlaDate(toDateInputValue(calcSlaDueAt(deliveryType, title, objective)));
    }, [deliveryType, title, objective, slaTouched]);

    const slaHint = useMemo(() => (
        isBigDeadline
            ? 'Regra aplicada: +30 dias corridos (Kit de evento / lançamento).'
            : 'Regra aplicada: +5 dias úteis (padrão do POP).'
    ), [isBigDeadline]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !requesterName.trim()) {
            notify('error', 'Preencha ao menos o título e o nome do solicitante.');
            return;
        }
        setIsSaving(true);
        try {
            const payload = {
                title: title.trim(),
                objective: objective.trim() || null,
                expected_result: expectedResult.trim() || null,
                requester_name: requesterName.trim(),
                requester_sector: requesterSector,
                requester_contact: requesterContact.trim() || null,
                target_audience: targetAudience.trim() || null,
                delivery_type: deliveryType,
                context_refs: contextRefs.trim() || null,
                desired_date: desiredDate || null,
                urgency_reason: urgencyReason.trim() || null,
                budget: budget !== '' ? Number(budget) : null,
                cost_center: costCenter.trim() || null,
                approver_name: approverName.trim() || null,
                priority,
                status: 'Recebido',
                sla_due_at: dateInputToIso(slaDate),
                created_by: user?.id || null,
            };

            const { data, error } = await supabase
                .from('SITE_CampaignRequests')
                .insert(payload)
                .select('id')
                .single();
            if (error) throw error;

            // Evento inicial da timeline (falha aqui não bloqueia a criação)
            if (data?.id) {
                await supabase.from('SITE_ApprovalEvents').insert({
                    request_id: data.id,
                    event: 'pedido_criado',
                    actor: user?.name || requesterName.trim(),
                    payload: { setor: requesterSector, tipo: deliveryType },
                }).then(({ error: evErr }) => {
                    if (evErr) console.error('Falha ao registrar evento de criação:', evErr);
                });
            }

            notify('success', 'Pedido de campanha registrado com status Recebido.');
            onCreated();
            onClose();
        } catch (err: any) {
            console.error('Erro ao criar pedido:', err);
            notify('error', err?.message || 'Não foi possível salvar o pedido.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-[var(--admin-surface-1)] rounded-2xl border border-[var(--admin-border)] shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto custom-scrollbar"
                onClick={e => e.stopPropagation()}
            >
                {/* Cabeçalho */}
                <div className="sticky top-0 bg-[var(--admin-surface-1)] border-b border-[var(--admin-border)] px-6 py-4 flex items-center justify-between z-10">
                    <div>
                        <h3 className="font-black text-xl text-[var(--admin-text-primary)]">Novo Pedido de Campanha</h3>
                        <p className="text-xs text-[var(--admin-text-secondary)]">Intake formal conforme o POP 8.1 — entra no fluxo com status Recebido.</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-[var(--admin-surface-2)] text-[var(--admin-text-tertiary)] transition-all" title="Fechar">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* ── Solicitante ── */}
                    <fieldset>
                        <legend className="text-xs font-black uppercase tracking-widest text-purple-600 dark:text-purple-400 mb-3">Solicitante</legend>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className={labelCls}>Nome *</label>
                                <input className={inputCls} value={requesterName} onChange={e => setRequesterName(e.target.value)} placeholder="Quem está pedindo" required />
                            </div>
                            <div>
                                <label className={labelCls}>Setor</label>
                                <select className={inputCls} value={requesterSector} onChange={e => setRequesterSector(e.target.value)}>
                                    {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelCls}>Contato</label>
                                <input className={inputCls} value={requesterContact} onChange={e => setRequesterContact(e.target.value)} placeholder="WhatsApp ou e-mail" />
                            </div>
                        </div>
                    </fieldset>

                    {/* ── Pedido ── */}
                    <fieldset>
                        <legend className="text-xs font-black uppercase tracking-widest text-purple-600 dark:text-purple-400 mb-3">O pedido</legend>
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelCls}>Título *</label>
                                    <input className={inputCls} value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex.: Campanha lançamento curso Lisboa" required />
                                </div>
                                <div>
                                    <label className={labelCls}>Tipo de entrega</label>
                                    <select className={inputCls} value={deliveryType} onChange={e => setDeliveryType(e.target.value)}>
                                        {DELIVERY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className={labelCls}>Objetivo</label>
                                <textarea className={`${inputCls} min-h-[70px] resize-y`} value={objective} onChange={e => setObjective(e.target.value)} placeholder="O que esta campanha precisa alcançar?" />
                            </div>
                            <div>
                                <label className={labelCls}>Meta / resultado esperado</label>
                                <input className={inputCls} value={expectedResult} onChange={e => setExpectedResult(e.target.value)} placeholder="Ex.: 500 leads, 30 matrículas, R$ 50 mil em vendas" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelCls}>Público-alvo</label>
                                    <input className={inputCls} value={targetAudience} onChange={e => setTargetAudience(e.target.value)} placeholder="Ex.: mecânicos de suspensão, leads frios" />
                                </div>
                                <div>
                                    <label className={labelCls}>Aprovador responsável</label>
                                    <input className={inputCls} value={approverName} onChange={e => setApproverName(e.target.value)} placeholder="Ex.: Alex" />
                                </div>
                            </div>
                            <div>
                                <label className={labelCls}>Contexto / referências</label>
                                <textarea className={`${inputCls} min-h-[70px] resize-y`} value={contextRefs} onChange={e => setContextRefs(e.target.value)} placeholder="Links, materiais anteriores, referências visuais…" />
                            </div>
                        </div>
                    </fieldset>

                    {/* ── Prazo e orçamento ── */}
                    <fieldset>
                        <legend className="text-xs font-black uppercase tracking-widest text-purple-600 dark:text-purple-400 mb-3">Prazo & orçamento</legend>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className={labelCls}>Prazo desejado</label>
                                <input type="date" className={inputCls} value={desiredDate} onChange={e => setDesiredDate(e.target.value)} />
                            </div>
                            <div className="md:col-span-2">
                                <label className={labelCls}>Justificativa de urgência</label>
                                <input className={inputCls} value={urgencyReason} onChange={e => setUrgencyReason(e.target.value)} placeholder="Obrigatória quando o prazo desejado for menor que o SLA" />
                            </div>
                            <div>
                                <label className={labelCls}>Budget (R$)</label>
                                <input type="number" min="0" step="0.01" className={inputCls} value={budget} onChange={e => setBudget(e.target.value)} placeholder="0,00" />
                            </div>
                            <div>
                                <label className={labelCls}>Centro de custo</label>
                                <input className={inputCls} value={costCenter} onChange={e => setCostCenter(e.target.value)} placeholder="Ex.: MKT-2026" />
                            </div>
                            <div>
                                <label className={labelCls}>Prioridade</label>
                                <select className={inputCls} value={priority} onChange={e => setPriority(e.target.value as RequestPriority)}>
                                    {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* SLA calculado (editável) */}
                        <div className="mt-4 bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-3">
                            <div className="flex items-center gap-2 text-[var(--admin-text-primary)]">
                                <CalendarClock size={18} className="text-purple-600 dark:text-purple-400 shrink-0" />
                                <span className="text-sm font-bold">SLA calculado:</span>
                            </div>
                            <input
                                type="date"
                                className={`${inputCls} md:w-48`}
                                value={slaDate}
                                onChange={e => { setSlaTouched(true); setSlaDate(e.target.value); }}
                            />
                            <p className="text-xs text-[var(--admin-text-secondary)] font-medium">
                                {slaHint}{slaTouched && ' (ajustado manualmente)'}
                            </p>
                        </div>
                    </fieldset>

                    {/* Ações */}
                    <div className="flex justify-end gap-3 pt-2 border-t border-[var(--admin-border)]">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-bold text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface-2)] transition-all">
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="bg-purple-600 text-white px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-wider flex items-center gap-2 hover:bg-purple-700 shadow-xl shadow-purple-100 dark:shadow-none active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            {isSaving ? 'Salvando…' : 'Registrar Pedido'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RequestFormModal;
