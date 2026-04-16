import React, { useState, useEffect } from 'react';
import { 
    Megaphone, 
    MoreHorizontal, 
    Play, 
    Pause, 
    BarChart2, 
    Calendar,
    Target,
    Wallet
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000/api';

const MetaCampaigns = ({ slug }: { slug: string | null }) => {
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('ACTIVE');

    useEffect(() => {
        if (slug) fetchCampaigns();
    }, [slug, statusFilter]);

    const fetchCampaigns = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE}/meta/campaigns?status=${statusFilter}`);
            if (!response.ok) throw new Error('Falha ao carregar campanhas');
            const data = await response.json();
            if (Array.isArray(data)) {
                setCampaigns(data);
            } else {
                setCampaigns([]);
                if (data.error) console.error("API Error (Campaigns):", data.error);
            }
        } catch (error) {
            console.error("Error fetching Meta campaigns:", error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'ACTIVE': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800';
            case 'PAUSED': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';
            default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 border-gray-200 ';
        }
    };

    if (loading) {
        return (
            <div className="p-8 space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-20 bg-gray-50 bg-[var(--admin-surface-1)] animate-pulse rounded-2xl border border-[var(--admin-border)]"></div>
                ))}
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex bg-[var(--admin-surface-1)] border border-gray-200  p-1 rounded-xl shadow-sm">
                    {['ACTIVE', 'PAUSED', 'ALL'].map(f => (
                        <button
                            key={f}
                            onClick={() => setStatusFilter(f)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                statusFilter === f 
                                ? 'bg-black text-white dark:bg-white dark:text-black shadow-md' 
                                : 'text-gray-500 hover:text-black dark:hover:text-white'
                            }`}
                        >
                            {f === 'ACTIVE' ? 'Ativas' : f === 'PAUSED' ? 'Pausadas' : 'Todas'}
                        </button>
                    ))}
                </div>

                <button className="w-full md:w-auto px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/25">
                    <Megaphone size={18} /> Nova Campanha
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {campaigns.length === 0 ? (
                    <div className="text-center py-20 bg-[var(--admin-surface-1)] rounded-3xl border border-dashed border-gray-200 ">
                        <Megaphone size={48} className="mx-auto text-[var(--admin-text-tertiary)] mb-4" />
                        <p className="text-gray-400 font-medium">Nenhuma campanha encontrada com este filtro.</p>
                    </div>
                ) : (
                    campaigns.map((campaign) => (
                        <div 
                            key={campaign.id} 
                            className="group bg-[var(--admin-surface-1)] p-5 rounded-2xl border border-[var(--admin-border)] shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
                        >
                            <div className="flex items-center gap-4 flex-1">
                                <div className={`p-4 rounded-2xl ${getStatusStyles(campaign.status)} border shrink-0`}>
                                    <Target size={24} />
                                </div>
                                <div className="space-y-1 min-w-0">
                                    <h4 className="font-bold text-[var(--admin-text-primary)] truncate lg:max-w-md">{campaign.name}</h4>
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--admin-text-secondary)]">
                                        <span className="flex items-center gap-1 font-bold text-blue-500">
                                            {campaign.objective}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Calendar size={12} /> {new Date(campaign.start_time).toLocaleDateString('pt-BR')}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${getStatusStyles(campaign.status)}`}>
                                            {campaign.status}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-8 md:gap-12 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0 border-gray-50 /50">
                                <div className="space-y-1 md:text-right">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Orçamento Diário</p>
                                    <div className="flex items-center md:justify-end gap-1.5 font-black text-[var(--admin-text-primary)]">
                                        <Wallet size={14} className="text-gray-400" />
                                        {campaign.daily_budget 
                                            ? (parseFloat(campaign.daily_budget) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                                            : 'CBO / S.D'}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button className="p-2.5 rounded-xl border border-[var(--admin-border)] hover:bg-gray-50 dark:hover:bg-[#222] transition-colors text-[var(--admin-text-secondary)]">
                                        <BarChart2 size={18} />
                                    </button>
                                    <button className="p-2.5 rounded-xl border border-[var(--admin-border)] hover:bg-gray-50 dark:hover:bg-[#222] transition-colors text-[var(--admin-text-secondary)]">
                                        {campaign.status === 'ACTIVE' ? <Pause size={18} /> : <Play size={18} />}
                                    </button>
                                    <button className="p-2.5 rounded-xl border border-[var(--admin-border)] hover:bg-gray-50 dark:hover:bg-[#222] transition-colors text-[var(--admin-text-secondary)]">
                                        <MoreHorizontal size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default MetaCampaigns;
