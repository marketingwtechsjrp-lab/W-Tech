import React from 'react';
import { motion } from 'framer-motion';
import { Sale } from '../../../types';
import { Clock, CreditCard, Wrench, Truck, CheckCircle2, MessageCircle, BadgeCheck, ChevronRight, ChevronLeft } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface OrdersKanbanProps {
    sales: Sale[];
    onUpdateStatus: (saleId: string, status: string, trackingCode?: string) => void;
    onEditSale: (saleId: string) => void;
    onDeleteSale?: (saleId: string) => void;
}

// ── Column config ──────────────────────────────────────────────────────────

const COLUMNS = [
    { id: 'pending',     label: 'Pendente',    icon: Clock,         iconText: 'text-yellow-500',  headerBg: 'bg-yellow-500/10',  dot: 'bg-yellow-500' },
    { id: 'negotiation', label: 'Negociação',  icon: MessageCircle, iconText: 'text-purple-500',  headerBg: 'bg-purple-500/10',  dot: 'bg-purple-500' },
    { id: 'approved',    label: 'Aprovado',    icon: BadgeCheck,    iconText: 'text-indigo-500',  headerBg: 'bg-indigo-500/10',  dot: 'bg-indigo-500' },
    { id: 'paid',        label: 'Pago',        icon: CreditCard,    iconText: 'text-green-500',   headerBg: 'bg-green-500/10',   dot: 'bg-green-500' },
    { id: 'producing',   label: 'Em Produção', icon: Wrench,        iconText: 'text-blue-500',    headerBg: 'bg-blue-500/10',    dot: 'bg-blue-500' },
    { id: 'shipped',     label: 'Enviado',     icon: Truck,         iconText: 'text-orange-500',  headerBg: 'bg-orange-500/10',  dot: 'bg-orange-500' },
    { id: 'delivered',   label: 'Entregue',   icon: CheckCircle2,  iconText: 'text-emerald-500', headerBg: 'bg-emerald-500/10', dot: 'bg-emerald-500' },
] as const;

const STATUS_ORDER = COLUMNS.map(c => c.id);

// ── OrderCard ──────────────────────────────────────────────────────────────

const OrderCard: React.FC<{
    sale: Sale;
    draggedId: string | null;
    handleDragStart: (e: React.DragEvent, id: string) => void;
    onEditSale: (id: string) => void;
    onStatusChange: (id: string, status: string) => void;
    nextStatus?: string | null;
    prevStatus?: string | null;
}> = ({ sale, draggedId, handleDragStart, onEditSale, onStatusChange, nextStatus, prevStatus }) => {
    const pointerStart = React.useRef({ x: 0, y: 0 });

    return (
        <div
            draggable
            onDragStart={e => handleDragStart(e, sale.id)}
            onPointerDown={e => { pointerStart.current = { x: e.clientX, y: e.clientY }; }}
            onPointerUp={e => {
                const dx = Math.abs(e.clientX - pointerStart.current.x);
                const dy = Math.abs(e.clientY - pointerStart.current.y);
                if (dx < 5 && dy < 5) onEditSale(sale.id);
            }}
            className={cn(
                'bg-[var(--admin-surface-1)] border border-[var(--admin-border)] rounded-xl p-3',
                'hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer active:cursor-grabbing group relative select-none',
                draggedId === sale.id && 'opacity-30'
            )}
        >
            {/* ID + value */}
            <div className="flex justify-between items-center mb-1.5">
                <span className="text-[9px] font-bold text-[var(--admin-text-tertiary)] font-mono">#{sale.id.slice(0, 6)}</span>
                <span className="text-[11px] font-black text-[var(--admin-text-primary)]">
                    R$ {Math.floor(sale.totalValue || 0).toLocaleString('pt-BR')}
                </span>
            </div>

            {/* Client name */}
            <h4 className="font-bold text-[var(--admin-text-primary)] text-[11px] line-clamp-1 mb-2 leading-tight">
                {sale.clientName || 'Cliente Balcão'}
            </h4>

            {/* Footer */}
            <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-[9px] text-[var(--admin-text-tertiary)]">
                    <Clock size={8} />
                    {new Date(sale.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                </span>
                <span className="text-[9px] font-black text-[var(--admin-text-tertiary)] bg-[var(--admin-surface-3)] border border-[var(--admin-border)] px-1.5 py-0.5 rounded-full uppercase tracking-tight">
                    {sale.channel || 'Admin'}
                </span>
            </div>

            {/* Hover action arrows */}
            <div
                className="absolute right-1 top-1/2 -translate-y-1/2 flex-col gap-1 hidden group-hover:flex z-10 bg-[var(--admin-surface-1)] border border-[var(--admin-border)] p-1 rounded-lg shadow-xl"
                onPointerDown={e => e.stopPropagation()}
                onPointerUp={e => e.stopPropagation()}
                onClick={e => e.stopPropagation()}
            >
                {nextStatus && (
                    <button
                        onClick={() => onStatusChange(sale.id, nextStatus)}
                        className="p-1 rounded hover:bg-emerald-500/10 text-emerald-500 transition-colors"
                        title="Avançar"
                    >
                        <ChevronRight size={12} />
                    </button>
                )}
                {prevStatus && (
                    <button
                        onClick={() => onStatusChange(sale.id, prevStatus)}
                        className="p-1 rounded hover:bg-[var(--admin-surface-3)] text-[var(--admin-text-tertiary)] transition-colors"
                        title="Voltar"
                    >
                        <ChevronLeft size={12} />
                    </button>
                )}
            </div>
        </div>
    );
};

// ── Main Board ─────────────────────────────────────────────────────────────

export const OrdersKanbanBoard: React.FC<OrdersKanbanProps> = ({ sales, onUpdateStatus, onEditSale }) => {
    const [draggedId, setDraggedId]       = React.useState<string | null>(null);
    const [dragOverCol, setDragOverCol]   = React.useState<string | null>(null);
    const [trackingModal, setTrackingModal] = React.useState<{ saleId: string; status: string } | null>(null);
    const [trackingCode, setTrackingCode] = React.useState('');

    const handleDragStart = (e: React.DragEvent, id: string) => {
        setDraggedId(id);
        e.dataTransfer.setData('saleId', id);
    };
    const handleDragOver  = (e: React.DragEvent, colId: string) => { e.preventDefault(); if (dragOverCol !== colId) setDragOverCol(colId); };
    const handleDragLeave = () => setDragOverCol(null);
    const handleDrop      = (e: React.DragEvent, status: string) => {
        e.preventDefault(); setDragOverCol(null);
        const id = e.dataTransfer.getData('saleId');
        if (id) {
            if (status === 'shipped') setTrackingModal({ saleId: id, status });
            else onUpdateStatus(id, status);
        }
        setDraggedId(null);
    };

    const handleStatusChange = (id: string, status: string) => {
        if (status === 'shipped') setTrackingModal({ saleId: id, status });
        else onUpdateStatus(id, status);
    };

    const getNextStatus = (current: string) => {
        const idx = STATUS_ORDER.indexOf(current as any);
        return idx >= 0 && idx < STATUS_ORDER.length - 1 ? STATUS_ORDER[idx + 1] : null;
    };
    const getPrevStatus = (current: string) => {
        const idx = STATUS_ORDER.indexOf(current as any);
        return idx > 0 ? STATUS_ORDER[idx - 1] : null;
    };

    const confirmTracking = () => {
        if (trackingModal) {
            onUpdateStatus(trackingModal.saleId, trackingModal.status, trackingCode);
            setTrackingModal(null);
            setTrackingCode('');
        }
    };

    return (
        <div className="flex overflow-x-auto gap-3 pb-4 h-[calc(100vh-340px)] min-h-[420px] custom-scrollbar">
            {COLUMNS.map(col => {
                const colSales = sales.filter(s => (s.status || 'pending') === col.id);
                const Icon = col.icon;
                const isOver = dragOverCol === col.id;

                return (
                    <div
                        key={col.id}
                        onDragOver={e => handleDragOver(e, col.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={e => handleDrop(e, col.id)}
                        className={cn(
                            'min-w-[220px] w-[220px] flex flex-col bg-[var(--admin-surface-2)] rounded-2xl border transition-all duration-200 overflow-hidden',
                            isOver
                                ? 'border-wtech-gold bg-[var(--admin-accent-gold-muted)] shadow-inner'
                                : 'border-[var(--admin-border)]'
                        )}
                    >
                        {/* Column header */}
                        <div className={cn('px-3 py-2.5 border-b border-[var(--admin-border)] flex items-center justify-between', col.headerBg)}>
                            <div className="flex items-center gap-1.5">
                                <Icon size={11} className={col.iconText} />
                                <h3 className={cn('font-black uppercase text-[9px] tracking-widest', col.iconText)}>{col.label}</h3>
                            </div>
                            <span className="bg-[var(--admin-surface-1)]/60 border border-[var(--admin-border)] px-1.5 py-0.5 rounded text-[9px] font-black text-[var(--admin-text-tertiary)]">
                                {colSales.length}
                            </span>
                        </div>

                        {/* Cards */}
                        <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                            {colSales.map(sale => (
                                <OrderCard
                                    key={sale.id}
                                    sale={sale}
                                    draggedId={draggedId}
                                    handleDragStart={handleDragStart}
                                    onEditSale={onEditSale}
                                    onStatusChange={handleStatusChange}
                                    nextStatus={getNextStatus(col.id)}
                                    prevStatus={getPrevStatus(col.id)}
                                />
                            ))}
                            {colSales.length === 0 && (
                                <div className="flex items-center justify-center py-6 border border-dashed border-[var(--admin-border)] rounded-xl">
                                    <p className="text-[9px] font-black text-[var(--admin-text-tertiary)] uppercase tracking-wider">Soltar aqui</p>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}

            {/* Tracking Code Modal */}
            {trackingModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 12 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        className="bg-[var(--admin-surface-1)] border border-[var(--admin-border)] w-full max-w-md rounded-2xl p-6 shadow-2xl"
                    >
                        <div className="flex items-center gap-3 mb-5">
                            <div className="p-2.5 bg-orange-500/10 text-orange-500 rounded-xl">
                                <Truck size={20} />
                            </div>
                            <div>
                                <h3 className="text-base font-black text-[var(--admin-text-primary)]">Código de Rastreio</h3>
                                <p className="text-[11px] text-[var(--admin-text-tertiary)] font-bold">Informe o código para o cliente acompanhar</p>
                            </div>
                        </div>

                        <div className="mb-5">
                            <label className="block text-[10px] font-black text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-1.5">Código da Encomenda</label>
                            <input
                                autoFocus
                                type="text"
                                value={trackingCode}
                                onChange={e => setTrackingCode(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && confirmTracking()}
                                placeholder="Ex: BR123456789XX"
                                className="w-full bg-[var(--admin-surface-2)] border border-[var(--admin-border)] focus:border-wtech-gold rounded-xl py-3 px-4 text-sm font-bold text-[var(--admin-text-primary)] outline-none transition-colors placeholder:text-[var(--admin-text-tertiary)]"
                            />
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => { onUpdateStatus(trackingModal.saleId, trackingModal.status); setTrackingModal(null); setTrackingCode(''); }}
                                className="flex-1 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface-3)] transition-colors border border-[var(--admin-border)]"
                            >
                                Pular
                            </button>
                            <button
                                onClick={confirmTracking}
                                className="flex-1 py-2.5 bg-gradient-to-r from-wtech-gold to-yellow-600 text-black rounded-xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-md shadow-yellow-500/20"
                            >
                                Confirmar Envio
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};
