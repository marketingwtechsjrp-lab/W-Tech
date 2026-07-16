import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Radio, Inbox, MessageCircle, AlertTriangle, CheckCircle2, RefreshCw, Clock, Loader2,
} from 'lucide-react';
import { supabase } from '../../../../lib/supabaseClient';
import {
    REQUEST_FLOW, STATUS_LABELS, STATUS_DOT, OPEN_STATUSES, TARGET_SECTORS, TARGET_SECTOR_LABELS,
    PRIORITY_LABELS, getSlaBadge, SLA_CHIP,
    type CampaignRequest, type RequestPriority,
} from '../../../../lib/popMarketing';
import CourseRiskPanel from './CourseRiskPanel';
import type { PopNotify } from './PopMarketingView';

/**
 * Painel ao Vivo — o "tempo real" do POP: board por status do fluxo com
 * contadores, métricas no topo e polling de 10s (setInterval + cleanup).
 * Leitura direta via supabase (padrão do sistema); sem WebSocket.
 * Fase 2: bloco "Turmas em risco" (POP 8.4) com polling próprio de 60s.
 */

interface LivePanelViewProps {
    notify: PopNotify;
}

const POLL_INTERVAL_MS = 10_000;

/** Cor do dot de prioridade nos cards compactos. */
const PRIORITY_DOT: Record<RequestPriority, string> = {
    Baixa: '#9ca3af',
    Media: '#2563eb',
    Alta: '#dc2626',
};

interface ApprovalItemLite {
    id: number;
    status: string;
    decided_at: string | null;
}

const LivePanelView = ({ notify }: LivePanelViewProps) => {
    const [requests, setRequests] = useState<CampaignRequest[]>([]);
    const [approvalItems, setApprovalItems] = useState<ApprovalItemLite[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [sectorFilter, setSectorFilter] = useState<string>('all');
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const errorNotified = useRef(false);

    const fetchAll = async (showSpinner: boolean) => {
        if (showSpinner) setIsLoading(true);
        try {
            const [reqRes, apRes] = await Promise.all([
                supabase.from('SITE_CampaignRequests').select('*').order('created_at', { ascending: false }),
                supabase.from('SITE_ApprovalItems').select('id,status,decided_at'),
            ]);
            if (reqRes.error) throw reqRes.error;
            setRequests((reqRes.data as CampaignRequest[]) || []);
            // Itens de aprovação são opcionais para as métricas — erro não derruba o painel
            if (!apRes.error) setApprovalItems((apRes.data as ApprovalItemLite[]) || []);
            setLastUpdated(new Date());
            errorNotified.current = false;
        } catch (err) {
            console.error('Erro ao atualizar o Painel ao Vivo:', err);
            if (showSpinner) setRequests([]);
            if (!errorNotified.current) {
                errorNotified.current = true;
                notify('info', 'Painel sem conexão com o banco no momento.');
            }
        } finally {
            if (showSpinner) setIsLoading(false);
        }
    };

    // Polling de 10s com cleanup — padrão do projeto (sem WebSocket/Realtime)
    useEffect(() => {
        fetchAll(true);
        const id = setInterval(() => fetchAll(false), POLL_INTERVAL_MS);
        return () => clearInterval(id);
    }, []);

    // Filtro por setor aplicado ao board e às métricas de pedidos
    const visibleRequests = useMemo(
        () => (sectorFilter === 'all' ? requests : requests.filter(r => (r.target_sector || 'Marketing') === sectorFilter)),
        [requests, sectorFilter],
    );

    const metrics = useMemo(() => {
        const now = Date.now();
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const open = visibleRequests.filter(r => (OPEN_STATUSES as string[]).includes(r.status));
        const slaBusted = open.filter(r => r.sla_due_at && new Date(r.sla_due_at).getTime() < now);
        // Métricas do WhatsApp são globais (itens de aprovação não têm setor)
        const waitingWhatsApp = approvalItems.filter(i => i.status === 'Enviado');
        const approvedToday = approvalItems.filter(i =>
            i.status === 'Aprovado' && i.decided_at && new Date(i.decided_at) >= todayStart);

        return {
            open: open.length,
            waitingWhatsApp: waitingWhatsApp.length,
            slaBusted: slaBusted.length,
            approvedToday: approvedToday.length,
        };
    }, [visibleRequests, approvalItems]);

    const byStatus = useMemo(() => {
        const map = new Map<string, CampaignRequest[]>();
        REQUEST_FLOW.forEach(s => map.set(s, []));
        visibleRequests.forEach(r => {
            if (map.has(r.status)) map.get(r.status)!.push(r);
        });
        return map;
    }, [visibleRequests]);

    const metricCards = [
        {
            label: 'Pedidos abertos',
            value: metrics.open,
            icon: Inbox,
            cls: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20',
            pulse: false,
        },
        {
            label: 'Aguardando no WhatsApp',
            value: metrics.waitingWhatsApp,
            icon: MessageCircle,
            cls: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20',
            pulse: false,
        },
        {
            label: 'SLA estourado',
            value: metrics.slaBusted,
            icon: AlertTriangle,
            cls: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20',
            pulse: metrics.slaBusted > 0, // vermelho pulsante quando há estouro
        },
        {
            label: 'Aprovados hoje',
            value: metrics.approvedToday,
            icon: CheckCircle2,
            cls: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20',
            pulse: false,
        },
    ];

    return (
        <div className="space-y-6">
            {/* Barra superior: título, filtro por setor e status do polling */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[var(--admin-surface-1)] p-6 rounded-2xl shadow-sm border border-[var(--admin-border)]">
                <div>
                    <h3 className="font-black text-2xl text-[var(--admin-text-primary)] flex items-center gap-2">
                        <Radio className="text-red-500 animate-pulse" /> Painel ao Vivo
                    </h3>
                    <p className="text-sm text-[var(--admin-text-secondary)] font-medium tracking-tight">
                        Fluxo completo do POP em tempo real — do Recebido ao Concluído.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <select
                        className="bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl px-4 py-2 text-sm font-bold text-[var(--admin-text-primary)] outline-none focus:border-purple-400"
                        value={sectorFilter}
                        onChange={e => setSectorFilter(e.target.value)}
                    >
                        <option value="all">Todos os setores</option>
                        {TARGET_SECTORS.map(s => <option key={s} value={s}>{TARGET_SECTOR_LABELS[s]}</option>)}
                    </select>
                    <button
                        onClick={() => fetchAll(false)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[var(--admin-surface-2)] border border-[var(--admin-border)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:border-gray-400 transition-all"
                        title="Atualizar agora"
                    >
                        <RefreshCw size={14} />
                        {lastUpdated
                            ? `Atualizado ${lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                            : 'Atualizar'}
                    </button>
                </div>
            </div>

            {/* Faixa de métricas */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {metricCards.map(card => (
                    <div
                        key={card.label}
                        className={`bg-[var(--admin-surface-1)] rounded-2xl border p-5 flex items-center gap-4 shadow-sm transition-all ${
                            card.pulse ? 'border-red-300 dark:border-red-900/60 animate-pulse' : 'border-[var(--admin-border)]'
                        }`}
                    >
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${card.cls}`}>
                            <card.icon size={22} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-3xl font-black text-[var(--admin-text-primary)] leading-none">{card.value}</p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--admin-text-tertiary)] mt-1 truncate">{card.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* 🎓 Turmas em risco (POP 8.4) — polling próprio de 60s */}
            <CourseRiskPanel notify={notify} />

            {/* Board por status do fluxo */}
            {isLoading ? (
                <div className="bg-[var(--admin-surface-1)] rounded-2xl border border-[var(--admin-border)] py-20 text-center text-[var(--admin-text-tertiary)]">
                    <Loader2 size={30} className="mx-auto animate-spin mb-2" />
                    <p className="text-sm font-medium">Carregando o painel…</p>
                </div>
            ) : (
                <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-3">
                    {REQUEST_FLOW.map(status => {
                        const cards = byStatus.get(status) || [];
                        return (
                            <div key={status} className="w-[240px] shrink-0 flex flex-col bg-[var(--admin-surface-2)] rounded-2xl border border-[var(--admin-border)]">
                                {/* Cabeçalho da coluna */}
                                <div className="px-3.5 pt-3.5 pb-2.5 border-b border-[var(--admin-border)] flex items-center justify-between">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: STATUS_DOT[status] }} />
                                        <h4 className="font-black text-[11px] uppercase tracking-widest text-[var(--admin-text-primary)] truncate">
                                            {STATUS_LABELS[status]}
                                        </h4>
                                    </div>
                                    <span className="px-2 py-0.5 rounded-full text-xs font-black text-[var(--admin-text-primary)] bg-black/5 dark:bg-white/10">
                                        {cards.length}
                                    </span>
                                </div>

                                {/* Cards compactos */}
                                <div className="p-2.5 space-y-2 min-h-[220px] max-h-[520px] overflow-y-auto custom-scrollbar">
                                    {cards.map(req => {
                                        const sla = getSlaBadge(req.sla_due_at);
                                        const isFinal = status === 'Concluido';
                                        return (
                                            <div key={req.id} className="bg-[var(--admin-surface-1)] rounded-xl border border-[var(--admin-border)] p-3 shadow-sm hover:shadow-md transition-shadow">
                                                <p className="text-sm font-bold text-[var(--admin-text-primary)] leading-snug line-clamp-2">{req.title}</p>
                                                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                                    <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-[var(--admin-surface-2)] text-[var(--admin-text-tertiary)]">
                                                        {TARGET_SECTOR_LABELS[req.target_sector || 'Marketing'] || req.target_sector} · {req.requester_sector}
                                                    </span>
                                                    <span className="flex items-center gap-1 text-[9px] font-bold text-[var(--admin-text-tertiary)]" title={`Prioridade ${PRIORITY_LABELS[req.priority]}`}>
                                                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: PRIORITY_DOT[req.priority] }} />
                                                        {PRIORITY_LABELS[req.priority]}
                                                    </span>
                                                </div>
                                                <div className="mt-2">
                                                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${isFinal ? SLA_CHIP.none : SLA_CHIP[sla.tone]}`}>
                                                        <Clock size={9} /> {isFinal ? 'Entregue' : sla.label}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {cards.length === 0 && (
                                        <div className="flex flex-col items-center justify-center py-8 gap-1.5 text-[var(--admin-text-tertiary)]">
                                            <div className="w-7 h-7 rounded-full bg-[var(--admin-surface-3)] flex items-center justify-center">
                                                <Inbox size={12} />
                                            </div>
                                            <span className="text-[10px] font-medium">Vazio</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default LivePanelView;
