import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Inbox, Clock, Eye, Loader2 } from 'lucide-react';
import { supabase } from '../../../../lib/supabaseClient';
import { useAuth } from '../../../../context/AuthContext';
import {
    REQUEST_STATUSES, STATUS_LABELS, STATUS_DOT, STATUS_CHIP,
    PRIORITIES, PRIORITY_LABELS, PRIORITY_CHIP,
    getSlaBadge, SLA_CHIP, formatDate,
    type CampaignRequest, type RequestStatus, type RequestPriority,
} from '../../../../lib/popMarketing';
import RequestFormModal from './RequestFormModal';
import RequestDetailModal from './RequestDetailModal';
import type { PopNotify } from './PopMarketingView';

/**
 * Pedidos de Campanha (POP 8.1) — lista com filtros por status, busca,
 * prioridade editável (clique alterna), badge de SLA e mudança rápida de
 * status por select (padrão mais simples que drag, conforme o POP).
 */

interface CampaignRequestsViewProps {
    permissions?: any;
    notify: PopNotify;
    onSendToApproval: (requestId: string) => void;
}

/** Próxima prioridade no ciclo Baixa → Média → Alta → Baixa. */
const nextPriority = (p: RequestPriority): RequestPriority =>
    PRIORITIES[(PRIORITIES.indexOf(p) + 1) % PRIORITIES.length];

const CampaignRequestsView = ({ permissions, notify, onSendToApproval }: CampaignRequestsViewProps) => {
    const { user } = useAuth();
    const [requests, setRequests] = useState<CampaignRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | RequestStatus>('all');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [detailRequest, setDetailRequest] = useState<CampaignRequest | null>(null);

    const fetchRequests = async (showSpinner = true) => {
        if (showSpinner) setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('SITE_CampaignRequests')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setRequests((data as CampaignRequest[]) || []);
        } catch (err) {
            console.error('Erro ao carregar pedidos de campanha:', err);
            setRequests([]);
            notify('error', 'Não foi possível carregar os pedidos. Verifique a conexão.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchRequests(); }, []);

    // Contadores por status para os chips de filtro
    const countByStatus = useMemo(() => {
        const map = new Map<RequestStatus, number>();
        requests.forEach(r => map.set(r.status, (map.get(r.status) || 0) + 1));
        return map;
    }, [requests]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return requests.filter(r => {
            if (statusFilter !== 'all' && r.status !== statusFilter) return false;
            if (!q) return true;
            return [r.title, r.requester_name, r.requester_sector, r.objective, r.delivery_type]
                .some(v => (v || '').toLowerCase().includes(q));
        });
    }, [requests, search, statusFilter]);

    // ── Ações inline ──

    const handlePriorityCycle = async (req: CampaignRequest) => {
        const next = nextPriority(req.priority);
        // Atualização otimista (novo array, sem mutação)
        setRequests(prev => prev.map(r => (r.id === req.id ? { ...r, priority: next } : r)));
        const { error } = await supabase
            .from('SITE_CampaignRequests')
            .update({ priority: next, updated_at: new Date().toISOString() })
            .eq('id', req.id);
        if (error) {
            console.error('Erro ao mudar prioridade:', error);
            setRequests(prev => prev.map(r => (r.id === req.id ? { ...r, priority: req.priority } : r)));
            notify('error', 'Não foi possível alterar a prioridade.');
        }
    };

    const handleStatusChange = async (req: CampaignRequest, next: RequestStatus) => {
        if (next === req.status) return;
        const prevStatus = req.status;
        setRequests(prev => prev.map(r => (r.id === req.id ? { ...r, status: next } : r)));
        try {
            const { error } = await supabase
                .from('SITE_CampaignRequests')
                .update({
                    status: next,
                    updated_at: new Date().toISOString(),
                    completed_at: next === 'Concluido' ? new Date().toISOString() : null,
                })
                .eq('id', req.id);
            if (error) throw error;

            // Registro na timeline do pedido (best effort)
            await supabase.from('SITE_ApprovalEvents').insert({
                request_id: req.id,
                event: 'status_alterado',
                actor: user?.name || 'Admin',
                payload: { de: prevStatus, para: next },
            }).then(({ error: evErr }) => { if (evErr) console.error('Falha ao registrar evento:', evErr); });

            notify('success', `"${req.title}" movido para ${STATUS_LABELS[next]}.`);
        } catch (err) {
            console.error('Erro ao mudar status:', err);
            setRequests(prev => prev.map(r => (r.id === req.id ? { ...r, status: prevStatus } : r)));
            notify('error', 'Não foi possível alterar o status.');
        }
    };

    return (
        <div className="space-y-6">
            {/* Barra de ações */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[var(--admin-surface-1)] p-6 rounded-2xl shadow-sm border border-[var(--admin-border)]">
                <div>
                    <h3 className="font-black text-2xl text-[var(--admin-text-primary)] flex items-center gap-2">
                        <Inbox className="text-purple-600 dark:text-purple-400" /> Pedidos de Campanha
                    </h3>
                    <p className="text-sm text-[var(--admin-text-secondary)] font-medium tracking-tight">
                        Intake formal do POP 8.1 — todo pedido entra como Recebido com SLA automático.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <input
                            type="text"
                            placeholder="Buscar por título, solicitante…"
                            className="w-full pl-9 pr-4 py-2 bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl text-sm outline-none focus:border-purple-400 dark:focus:border-purple-500 focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900/20 transition-all font-medium"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                        <Search size={14} className="absolute left-3 top-3 text-gray-400" />
                    </div>
                    <button
                        onClick={() => setIsFormOpen(true)}
                        className="bg-purple-600 text-white px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-wider flex items-center gap-2 hover:bg-purple-700 shadow-xl shadow-purple-100 dark:shadow-none active:scale-95 transition-all"
                    >
                        <Plus size={18} /> Novo Pedido
                    </button>
                </div>
            </div>

            {/* Chips de filtro por status */}
            <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
                <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap border transition-all ${
                        statusFilter === 'all'
                            ? 'bg-black text-white dark:bg-white dark:text-black border-transparent'
                            : 'bg-[var(--admin-surface-1)] text-[var(--admin-text-secondary)] border-[var(--admin-border)] hover:border-gray-400'
                    }`}
                >
                    Todos ({requests.length})
                </button>
                {REQUEST_STATUSES.map(s => (
                    <button
                        key={s}
                        onClick={() => setStatusFilter(s)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap border transition-all flex items-center gap-1.5 ${
                            statusFilter === s
                                ? 'bg-black text-white dark:bg-white dark:text-black border-transparent'
                                : 'bg-[var(--admin-surface-1)] text-[var(--admin-text-secondary)] border-[var(--admin-border)] hover:border-gray-400'
                        }`}
                    >
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_DOT[s] }} />
                        {STATUS_LABELS[s]} ({countByStatus.get(s) || 0})
                    </button>
                ))}
            </div>

            {/* Tabela de pedidos */}
            <div className="bg-[var(--admin-surface-1)] rounded-2xl border border-[var(--admin-border)] shadow-sm overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-[var(--admin-border)] text-left">
                                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-[var(--admin-text-tertiary)]">Pedido</th>
                                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-[var(--admin-text-tertiary)]">Solicitante</th>
                                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-[var(--admin-text-tertiary)]">Prioridade</th>
                                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-[var(--admin-text-tertiary)]">SLA</th>
                                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-[var(--admin-text-tertiary)]">Status</th>
                                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-[var(--admin-text-tertiary)]">Criado</th>
                                <th className="px-5 py-3" />
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(req => {
                                const sla = getSlaBadge(req.sla_due_at);
                                const isFinal = req.status === 'Concluido' || req.status === 'Cancelado' || req.status === 'Reprovado';
                                return (
                                    <tr
                                        key={req.id}
                                        className="border-b border-[var(--admin-border)] last:border-b-0 hover:bg-[var(--admin-surface-2)] transition-colors cursor-pointer"
                                        onClick={() => setDetailRequest(req)}
                                    >
                                        <td className="px-5 py-4">
                                            <p className="font-bold text-[var(--admin-text-primary)] leading-tight">{req.title}</p>
                                            <p className="text-xs text-[var(--admin-text-tertiary)] font-medium">{req.delivery_type || '—'}</p>
                                        </td>
                                        <td className="px-5 py-4">
                                            <p className="font-medium text-[var(--admin-text-primary)]">{req.requester_name}</p>
                                            <p className="text-xs text-[var(--admin-text-tertiary)]">{req.requester_sector}</p>
                                        </td>
                                        <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                                            <button
                                                onClick={() => handlePriorityCycle(req)}
                                                className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${PRIORITY_CHIP[req.priority]}`}
                                                title="Clique para alternar a prioridade"
                                            >
                                                {PRIORITY_LABELS[req.priority]}
                                            </button>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${isFinal ? SLA_CHIP.none : SLA_CHIP[sla.tone]}`}>
                                                <Clock size={10} /> {isFinal ? 'Encerrado' : sla.label}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                                            <select
                                                value={req.status}
                                                onChange={e => handleStatusChange(req, e.target.value as RequestStatus)}
                                                className={`text-xs font-bold rounded-lg px-2 py-1.5 border border-[var(--admin-border)] outline-none cursor-pointer bg-[var(--admin-surface-2)] text-[var(--admin-text-primary)] focus:border-purple-400`}
                                            >
                                                {REQUEST_STATUSES.map(s => (
                                                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-5 py-4 text-xs font-medium text-[var(--admin-text-tertiary)] whitespace-nowrap">
                                            {formatDate(req.created_at)}
                                        </td>
                                        <td className="px-5 py-4 text-right" onClick={e => e.stopPropagation()}>
                                            <button
                                                onClick={() => setDetailRequest(req)}
                                                className="p-2 rounded-xl hover:bg-[var(--admin-surface-3)] text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] transition-all"
                                                title="Ver detalhes"
                                            >
                                                <Eye size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {isLoading && (
                    <div className="py-16 text-center text-[var(--admin-text-tertiary)]">
                        <Loader2 size={28} className="mx-auto animate-spin mb-2" />
                        <p className="text-sm font-medium">Carregando pedidos…</p>
                    </div>
                )}

                {!isLoading && filtered.length === 0 && (
                    <div className="py-20 text-center text-gray-400">
                        <Inbox size={64} className="mx-auto mb-4 opacity-10" />
                        <p className="text-lg font-bold">Nenhum pedido encontrado</p>
                        <p className="text-sm">Ajuste os filtros ou registre um novo pedido de campanha.</p>
                    </div>
                )}
            </div>

            {/* Modais */}
            {isFormOpen && (
                <RequestFormModal
                    notify={notify}
                    onClose={() => setIsFormOpen(false)}
                    onCreated={() => fetchRequests(false)}
                />
            )}
            {detailRequest && (
                <RequestDetailModal
                    request={detailRequest}
                    notify={notify}
                    onClose={() => setDetailRequest(null)}
                    onChanged={() => fetchRequests(false)}
                    onSendToApproval={(id) => { setDetailRequest(null); onSendToApproval(id); }}
                />
            )}
        </div>
    );
};

export default CampaignRequestsView;
