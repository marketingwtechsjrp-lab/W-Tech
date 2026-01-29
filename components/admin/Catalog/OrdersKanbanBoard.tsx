import React from 'react';
import { motion } from 'framer-motion';
import { Sale } from '../../../types';
import { Clock, CreditCard, Wrench, Truck, CheckCircle2, MessageCircle, BadgeCheck } from 'lucide-react';

interface OrdersKanbanProps {
    sales: Sale[];
    onUpdateStatus: (saleId: string, status: string) => void;
    onEditSale: (saleId: string) => void;
}

const COLUMNS = [
    { id: 'pending', label: 'Pendente', icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' },
    { id: 'negotiation', label: 'Negociação', icon: MessageCircle, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
    { id: 'approved', label: 'Aprovado', icon: BadgeCheck, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' },
    { id: 'paid', label: 'Pago', icon: CreditCard, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
    { id: 'producing', label: 'Em Produção', icon: Wrench, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
    { id: 'shipped', label: 'Enviado', icon: Truck, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
    { id: 'delivered', label: 'Entregue', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' }
];

export const OrdersKanbanBoard: React.FC<OrdersKanbanProps> = ({ sales, onUpdateStatus, onEditSale }) => {
    const [draggedId, setDraggedId] = React.useState<string | null>(null);
    const [dragOverCol, setDragOverCol] = React.useState<string | null>(null);

    const handleDragStart = (e: React.DragEvent, id: string) => {
        setDraggedId(id);
        e.dataTransfer.setData('saleId', id);
        // Set a transparent drag image to allow custom ghost if needed, 
        // but default is fine for now.
    };

    const handleDragOver = (e: React.DragEvent, colId: string) => {
        e.preventDefault();
        if (dragOverCol !== colId) setDragOverCol(colId);
    };

    const handleDragLeave = () => {
        setDragOverCol(null);
    };

    const handleDrop = (e: React.DragEvent, status: string) => {
        e.preventDefault();
        setDragOverCol(null);
        const id = e.dataTransfer.getData('saleId');
        if (id) onUpdateStatus(id, status);
        setDraggedId(null);
    };
    
    const getNextStatus = (current: string) => {
        const order = ['pending', 'negotiation', 'approved', 'paid', 'producing', 'shipped', 'delivered'];
        const idx = order.indexOf(current);
        if (idx >= 0 && idx < order.length - 1) return order[idx + 1];
        return null;
    };

    const getPrevStatus = (current: string) => {
         const order = ['pending', 'negotiation', 'approved', 'paid', 'producing', 'shipped', 'delivered'];
         const idx = order.indexOf(current);
         if (idx > 0) return order[idx - 1];
         return null;
    };

    return (
        <div className="flex overflow-x-auto gap-3 pb-4 h-[calc(100vh-220px)] min-h-[500px] custom-scrollbar">
            {COLUMNS.map(col => {
                const colSales = sales.filter(s => (s.status || 'pending') === col.id);
                const Icon = col.icon;
                const isOver = dragOverCol === col.id;

                return (
                    <div 
                        key={col.id} 
                        onDragOver={(e) => handleDragOver(e, col.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, col.id)}
                        className={`min-w-[240px] w-[240px] flex flex-col bg-gray-50/50 dark:bg-white/[0.02] rounded-2xl border transition-all duration-200 ${isOver ? 'border-wtech-gold bg-wtech-gold/5 shadow-inner' : 'border-gray-100 dark:border-gray-800'}`}
                    >
                        {/* Column Header */}
                        <div className={`p-2.5 rounded-t-2xl border-b border-gray-100 dark:border-gray-800 flex justify-between items-center ${col.bg} dark:bg-opacity-5`}>
                            <div className="flex items-center gap-2">
                                <Icon size={12} className={col.color} />
                                <h3 className={`font-black uppercase text-[9px] tracking-widest ${col.color}`}>{col.label}</h3>
                            </div>
                            <span className="bg-white/50 dark:bg-black/20 px-1.5 py-0.5 rounded text-[9px] font-black text-gray-400">
                                {colSales.length}
                            </span>
                        </div>

                        {/* Cards Container */}
                        <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                            {colSales.map(sale => (
                                <motion.div
                                    layoutId={sale.id}
                                    key={sale.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, sale.id)}
                                    onDragEnd={() => { setDraggedId(null); setDragOverCol(null); }}
                                    className={`bg-white dark:bg-[#151515] p-2.5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800/50 hover:shadow-md transition-all cursor-grab active:cursor-grabbing group relative ${draggedId === sale.id ? 'opacity-30' : 'opacity-100'}`}
                                    onClick={() => onEditSale(sale.id)}
                                    whileHover={{ scale: 1.01 }}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-[8px] font-bold text-gray-400 dark:text-gray-600 uppercase">#{sale.id.slice(0, 6)}</span>
                                        <span className="text-[9px] font-black text-gray-900 dark:text-white">
                                            R$ {Math.floor(sale.totalValue).toLocaleString('pt-BR')}
                                        </span>
                                    </div>
                                    
                                    <h4 className="font-bold text-gray-800 dark:text-gray-200 text-[10px] line-clamp-1 mb-2 leading-tight">{sale.clientName || 'Cliente Balcão'}</h4>
                                    
                                    <div className="flex items-center justify-between text-[8px] text-gray-400 font-medium">
                                        <div className="flex items-center gap-1">
                                            <Clock size={8} />
                                            <span>{new Date(sale.createdAt).toLocaleDateString('pt-BR')}</span>
                                        </div>
                                        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-gray-50 dark:bg-white/5 rounded-full border border-gray-100 dark:border-gray-800">
                                            <span className="w-1 h-1 rounded-full bg-wtech-red animate-pulse"></span>
                                            <span className="text-[7px] font-black uppercase tracking-tighter text-gray-500">{sale.channel || 'Admin'}</span>
                                        </div>
                                    </div>

                                    {/* Action Overlays / Hover Buttons */}
                                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-black p-1 rounded-lg border border-gray-100 dark:border-gray-800 shadow-2xl z-10" onClick={e => e.stopPropagation()}>
                                        {getNextStatus(col.id) && (
                                            <button 
                                                onClick={() => onUpdateStatus(sale.id, getNextStatus(col.id)!)}
                                                className="p-1 hover:bg-green-50 dark:hover:bg-green-900/20 rounded text-green-500 transition-colors"
                                            >
                                                →
                                            </button>
                                        )}
                                        {getPrevStatus(col.id) && (
                                            <button 
                                                onClick={() => onUpdateStatus(sale.id, getPrevStatus(col.id)!)}
                                                className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded text-gray-400 transition-colors"
                                            >
                                                ←
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                            {colSales.length === 0 && (
                                <div className="text-center py-4 border border-dashed border-gray-100 dark:border-gray-800/20 rounded-xl">
                                    <p className="text-[8px] font-black text-gray-200 dark:text-gray-800 uppercase tracking-tighter">Soltar aqui</p>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
