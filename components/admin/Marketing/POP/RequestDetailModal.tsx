import React, { useEffect, useState } from 'react';
import {
    X, Send, CheckCircle2, XCircle, ArrowRight, Circle, Clock,
    User as UserIcon, Target, Wallet, FileText, CalendarClock, MessageCircle,
} from 'lucide-react';
import { supabase } from '../../../../lib/supabaseClient';
import { useAuth } from '../../../../context/AuthContext';
import {
    REQUEST_STATUSES, STATUS_LABELS, STATUS_CHIP, STATUS_DOT,
    PRIORITY_LABELS, PRIORITY_CHIP, getSlaBadge, SLA_CHIP,
    formatDate, formatDateTime, prettyEvent,
    APPROVAL_STATUS_CHIP,
    type CampaignRequest, type ApprovalEvent, type ApprovalItem, type RequestStatus,
} from '../../../../lib/popMarketing';
import CampaignResultsSection from './CampaignResultsSection';
import type { PopNotify } from './PopMarketingView';

/**
 * Detalhe do Pedido de Campanha: todos os campos do POP 8.1, mudança de
 * status, timeline (SITE_ApprovalEvents por request_id) e itens de aprovação
 * vinculados, com atalho "Enviar material para aprovação".
 * Fase 2: seção "Resultados da campanha" (POP 8.8) quando o pedido já foi
 * aprovado/publicado/concluído.
 */

interface RequestDetailModalProps {
    request: CampaignRequest;
    notify: PopNotify;
    onClose: () => void;
    onChanged: () => void;
    onSendToApproval: (requestId: string) => void;
}

/** Ícone da timeline conforme o tipo de evento. */
const eventIcon = (event: string) => {
    if (event.includes('aprovado')) return <CheckCircle2 size={14} className="text-green-500" />;
    if (event.includes('reprovado')) return <XCircle size={14} className="text-red-500" />;
    if (event.includes('enviado')) return <Send size={14} className="text-blue-500" />;
    if (event.includes('status')) return <ArrowRight size={14} className="text-purple-500" />;
    return <Circle size={10} className="text-gray-400" />;
};

const Field = ({ label, value, icon: Icon }: { label: string; value?: React.ReactNode; icon?: any }) => (
    <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--admin-text-tertiary)] mb-1 flex items-center gap-1">
            {Icon && <Icon size={11} />} {label}
        </p>
        <p className="text-sm font-medium text-[var(--admin-text-primary)] break-words">{value || '—'}</p>
    </div>
);

const RequestDetailModal = ({ request, notify, onClose, onChanged, onSendToApproval }: RequestDetailModalProps) => {
    const { user } = useAuth();
    const [events, setEvents] = useState<ApprovalEvent[]>([]);
    const [linkedItems, setLinkedItems] = useState<ApprovalItem[]>([]);
    const [isTimelineLoading, setIsTimelineLoading] = useState(true);
    const [status, setStatus] = useState<RequestStatus>(request.status);

    const sla = getSlaBadge(request.sla_due_at);

    // Timeline: eventos + itens de aprovação vinculados ao pedido (via supabase,
    // para funcionar mesmo sem o backend de aprovações no ar)
    const fetchTimeline = async () => {
        setIsTimelineLoading(true);
        try {
            const [evRes, itemRes] = await Promise.all([
                supabase.from('SITE_ApprovalEvents').select('*').eq('request_id', request.id).order('created_at', { ascending: false }).limit(60),
                supabase.from('SITE_ApprovalItems').select('*').eq('request_id', request.id).order('created_at', { ascending: false }),
            ]);
            if (evRes.error) throw evRes.error;
            setEvents((evRes.data as ApprovalEvent[]) || []);
            if (!itemRes.error) setLinkedItems((itemRes.data as ApprovalItem[]) || []);
        } catch (err) {
            console.error('Erro ao carregar timeline do pedido:', err);
            setEvents([]);
        } finally {
            setIsTimelineLoading(false);
        }
    };

    useEffect(() => { fetchTimeline(); }, [request.id]);

    // Mudança de status registra evento na timeline e marca completed_at ao concluir
    const handleStatusChange = async (next: RequestStatus) => {
        const prev = status;
        if (next === prev) return;
        setStatus(next);
        try {
            const patch: Record<string, any> = {
                status: next,
                updated_at: new Date().toISOString(),
                completed_at: next === 'Concluido' ? new Date().toISOString() : null,
            };
            const { error } = await supabase.from('SITE_CampaignRequests').update(patch).eq('id', request.id);
            if (error) throw error;

            await supabase.from('SITE_ApprovalEvents').insert({
                request_id: request.id,
                event: 'status_alterado',
                actor: user?.name || 'Admin',
                payload: { de: prev, para: next },
            }).then(({ error: evErr }) => { if (evErr) console.error('Falha ao registrar evento:', evErr); });

            notify('success', `Status alterado para ${STATUS_LABELS[next]}.`);
            onChanged();
            fetchTimeline();
        } catch (err: any) {
            console.error('Erro ao mudar status:', err);
            setStatus(prev);
            notify('error', 'Não foi possível alterar o status.');
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-[var(--admin-surface-1)] rounded-2xl border border-[var(--admin-border)] shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto custom-scrollbar"
                onClick={e => e.stopPropagation()}
            >
                {/* Cabeçalho */}
                <div className="sticky top-0 bg-[var(--admin-surface-1)] border-b border-[var(--admin-border)] px-6 py-4 flex items-start justify-between gap-4 z-10">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${STATUS_CHIP[status]}`}>
                                {STATUS_LABELS[status]}
                            </span>
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${PRIORITY_CHIP[request.priority]}`}>
                                {PRIORITY_LABELS[request.priority]}
                            </span>
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${SLA_CHIP[sla.tone]}`}>
                                <Clock size={10} /> {sla.label}
                            </span>
                        </div>
                        <h3 className="font-black text-xl text-[var(--admin-text-primary)] leading-tight truncate">{request.title}</h3>
                        <p className="text-xs text-[var(--admin-text-secondary)]">
                            Criado em {formatDateTime(request.created_at)} · SLA até {formatDateTime(request.sla_due_at)}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-[var(--admin-surface-2)] text-[var(--admin-text-tertiary)] transition-all shrink-0" title="Fechar">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
                    {/* ── Coluna de dados ── */}
                    <div className="lg:col-span-3 space-y-6">
                        <div className="bg-[var(--admin-surface-2)] rounded-2xl border border-[var(--admin-border)] p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Field label="Solicitante" icon={UserIcon} value={`${request.requester_name} · ${request.requester_sector}`} />
                            <Field label="Contato" value={request.requester_contact} />
                            <Field label="Tipo de entrega" icon={FileText} value={request.delivery_type} />
                            <Field label="Público-alvo" icon={Target} value={request.target_audience} />
                            <Field label="Prazo desejado" icon={CalendarClock} value={formatDate(request.desired_date)} />
                            <Field label="Justificativa de urgência" value={request.urgency_reason} />
                            <Field
                                label="Budget / centro de custo"
                                icon={Wallet}
                                value={request.budget != null
                                    ? `${Number(request.budget).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}${request.cost_center ? ` · ${request.cost_center}` : ''}`
                                    : request.cost_center}
                            />
                            <Field label="Aprovador responsável" value={request.approver_name} />
                            <div className="md:col-span-2">
                                <Field label="Objetivo" value={request.objective} />
                            </div>
                            <div className="md:col-span-2">
                                <Field label="Meta / resultado esperado" icon={Target} value={request.expected_result} />
                            </div>
                            <div className="md:col-span-2">
                                <Field label="Contexto / referências" value={request.context_refs} />
                            </div>
                        </div>

                        {/* Mudança de status */}
                        <div className="bg-[var(--admin-surface-2)] rounded-2xl border border-[var(--admin-border)] p-5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--admin-text-tertiary)] mb-3">Mover no fluxo</p>
                            <div className="flex flex-wrap gap-2">
                                {REQUEST_STATUSES.map(s => (
                                    <button
                                        key={s}
                                        onClick={() => handleStatusChange(s)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all active:scale-95 flex items-center gap-1.5 ${
                                            status === s
                                                ? 'bg-black text-white dark:bg-white dark:text-black border-transparent shadow'
                                                : 'bg-[var(--admin-surface-1)] text-[var(--admin-text-secondary)] border-[var(--admin-border)] hover:border-gray-400'
                                        }`}
                                    >
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_DOT[s] }} />
                                        {STATUS_LABELS[s]}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Pós-Campanha (POP 8.8): só quando o pedido já passou da aprovação */}
                        {(status === 'Aprovado' || status === 'Publicado' || status === 'Concluido') && (
                            <CampaignResultsSection
                                request={request}
                                currentStatus={status}
                                notify={notify}
                                onMarkCompleted={() => handleStatusChange('Concluido')}
                            />
                        )}

                        {/* Atalho para a tela de Aprovações já vinculada a este pedido */}
                        <button
                            onClick={() => onSendToApproval(request.id)}
                            className="w-full bg-green-600 text-white px-5 py-3 rounded-xl text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-green-700 shadow-xl shadow-green-100 dark:shadow-none active:scale-[0.98] transition-all"
                        >
                            <MessageCircle size={18} /> Enviar material para aprovação
                        </button>
                    </div>

                    {/* ── Timeline ── */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* Itens de aprovação vinculados */}
                        {linkedItems.length > 0 && (
                            <div className="bg-[var(--admin-surface-2)] rounded-2xl border border-[var(--admin-border)] p-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--admin-text-tertiary)] mb-2">Materiais em aprovação</p>
                                <div className="space-y-2">
                                    {linkedItems.map(item => (
                                        <div key={item.id} className="flex items-center justify-between gap-2 text-sm bg-[var(--admin-surface-1)] border border-[var(--admin-border)] rounded-xl px-3 py-2">
                                            <span className="font-bold text-[var(--admin-text-primary)] truncate">#{item.id} {item.title}</span>
                                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase shrink-0 ${APPROVAL_STATUS_CHIP[item.status] || ''}`}>
                                                {item.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="bg-[var(--admin-surface-2)] rounded-2xl border border-[var(--admin-border)] p-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--admin-text-tertiary)] mb-3">Timeline</p>
                            {isTimelineLoading ? (
                                <p className="text-xs text-[var(--admin-text-tertiary)] py-4 text-center">Carregando…</p>
                            ) : events.length === 0 ? (
                                <p className="text-xs text-[var(--admin-text-tertiary)] py-4 text-center">Nenhum evento registrado ainda.</p>
                            ) : (
                                <div className="space-y-3 max-h-[420px] overflow-y-auto custom-scrollbar pr-1">
                                    {events.map(ev => (
                                        <div key={ev.id} className="flex gap-3">
                                            <div className="pt-0.5 shrink-0">{eventIcon(ev.event)}</div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-[var(--admin-text-primary)] leading-tight">
                                                    {prettyEvent(ev.event)}
                                                    {ev.payload?.de && ev.payload?.para && (
                                                        <span className="font-medium text-[var(--admin-text-secondary)]"> — {STATUS_LABELS[ev.payload.de as RequestStatus] || ev.payload.de} → {STATUS_LABELS[ev.payload.para as RequestStatus] || ev.payload.para}</span>
                                                    )}
                                                </p>
                                                {ev.payload?.note && <p className="text-xs text-[var(--admin-text-secondary)] italic">“{ev.payload.note}”</p>}
                                                <p className="text-[10px] text-[var(--admin-text-tertiary)] font-medium">
                                                    {ev.actor ? `${ev.actor} · ` : ''}{formatDateTime(ev.created_at)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RequestDetailModal;
