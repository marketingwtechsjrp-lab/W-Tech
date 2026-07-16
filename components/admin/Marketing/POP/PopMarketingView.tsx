import React, { useCallback, useState } from 'react';
import { ClipboardCheck, Radio, Inbox, MessageCircle, TrendingUp, NotebookPen, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import LivePanelView from './LivePanelView';
import CampaignRequestsView from './CampaignRequestsView';
import ApprovalsView from './ApprovalsView';
import TrafficPlanView from './TrafficPlanView';
import MeetingNotesView from './MeetingNotesView';

/**
 * POP de Marketing — hub com as telas do procedimento operacional:
 *  1. Painel ao Vivo  — board em tempo real (polling) do fluxo de pedidos
 *  2. Pedidos de Campanha — intake formal (POP 8.1) com SLA automático
 *  3. Aprovações (WhatsApp) — envio de material para o grupo e decisão
 *  4. Tráfego — planejamento mensal de anúncios e verbas (POP 8.6)
 *  5. Reuniões — registros de alinhamento com Diretoria/Comercial (POP 8.7)
 *
 * Segue o mesmo padrão de tabs do MarketingView (Marketing Hub).
 */

type PopTab = 'painel' | 'pedidos' | 'aprovacoes' | 'trafego' | 'reunioes';

/** Assinatura do toast local repassado às telas filhas. */
export type PopNotify = (tone: 'success' | 'error' | 'info', message: string) => void;

interface PopToast {
    id: number;
    tone: 'success' | 'error' | 'info';
    message: string;
}

const TOAST_DURATION_MS = 4500;

const TOAST_STYLES: Record<PopToast['tone'], { icon: typeof CheckCircle2; cls: string }> = {
    success: { icon: CheckCircle2, cls: 'border-green-200 dark:border-green-900/60 text-green-600 dark:text-green-400' },
    error: { icon: AlertCircle, cls: 'border-red-200 dark:border-red-900/60 text-red-500 dark:text-red-400' },
    info: { icon: Info, cls: 'border-blue-200 dark:border-blue-900/60 text-blue-500 dark:text-blue-400' },
};

const PopMarketingView = ({ permissions }: { permissions?: any }) => {
    const [activeTab, setActiveTab] = useState<PopTab>('painel');
    // Pedido pré-vinculado ao abrir a tela de Aprovações a partir do detalhe do pedido
    const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
    const [toasts, setToasts] = useState<PopToast[]>([]);

    // Toast discreto local ao módulo (as sub-telas do admin não têm acesso ao
    // SplashedPushNotifications da página; o padrão dos vizinhos é feedback local).
    const notify: PopNotify = useCallback((tone, message) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev.slice(-3), { id, tone, message }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), TOAST_DURATION_MS);
    }, []);

    // "Enviar material para aprovação" no detalhe do pedido → troca de aba já vinculada
    const handleSendToApproval = useCallback((requestId: string) => {
        setPendingRequestId(requestId);
        setActiveTab('aprovacoes');
    }, []);

    const tabs: { id: PopTab; icon: typeof Radio; label: string }[] = [
        { id: 'painel', icon: Radio, label: 'Painel ao Vivo' },
        { id: 'pedidos', icon: Inbox, label: 'Pedidos de Campanha' },
        { id: 'aprovacoes', icon: MessageCircle, label: 'Aprovações (WhatsApp)' },
        { id: 'trafego', icon: TrendingUp, label: 'Tráfego' },
        { id: 'reunioes', icon: NotebookPen, label: 'Reuniões' },
    ];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            {/* Cabeçalho */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200 pb-4">
                <div>
                    <h2 className="text-3xl font-black text-[var(--admin-text-primary)] tracking-tight flex items-center gap-3">
                        <ClipboardCheck className="text-wtech-gold" /> POP Marketing
                    </h2>
                    <p className="text-[var(--admin-text-secondary)] mt-1">
                        Pedidos de campanha, aprovações via WhatsApp e acompanhamento do fluxo em tempo real.
                    </p>
                </div>
            </div>

            {/* Navegação por abas (mesmo padrão do Marketing Hub) */}
            <div className="flex bg-[var(--admin-surface-1)] p-1 rounded-xl shadow-sm border border-[var(--admin-border)] w-full overflow-x-auto custom-scrollbar">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                            activeTab === tab.id
                                ? 'bg-black text-white shadow-lg dark:bg-white dark:text-black'
                                : 'text-gray-500 hover:bg-gray-50 hover:text-black dark:hover:bg-[#333] dark:hover:text-white'
                        }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Conteúdo */}
            <div className="min-h-[600px]">
                {activeTab === 'painel' && <LivePanelView notify={notify} />}
                {activeTab === 'pedidos' && (
                    <CampaignRequestsView
                        permissions={permissions}
                        notify={notify}
                        onSendToApproval={handleSendToApproval}
                    />
                )}
                {activeTab === 'aprovacoes' && (
                    <ApprovalsView
                        notify={notify}
                        pendingRequestId={pendingRequestId}
                        onConsumePendingRequest={() => setPendingRequestId(null)}
                    />
                )}
                {activeTab === 'trafego' && <TrafficPlanView notify={notify} />}
                {activeTab === 'reunioes' && <MeetingNotesView notify={notify} />}
            </div>

            {/* Pilha de toasts discretos do módulo */}
            {toasts.length > 0 && (
                <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 max-w-sm">
                    {toasts.map(toast => {
                        const style = TOAST_STYLES[toast.tone];
                        const Icon = style.icon;
                        return (
                            <div
                                key={toast.id}
                                className={`flex items-start gap-3 bg-[var(--admin-surface-1)] border ${style.cls} rounded-xl px-4 py-3 shadow-xl animate-in fade-in slide-in-from-bottom-2`}
                            >
                                <Icon size={18} className="shrink-0 mt-0.5" />
                                <p className="text-sm font-medium text-[var(--admin-text-primary)] leading-snug">{toast.message}</p>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default PopMarketingView;
