import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { MarketingCampaign } from '../../../types';
import { Plus, Megaphone, Calendar, CheckCircle, AlertCircle, Play, Pause, Trash2, Clock, Send, Mail } from 'lucide-react';
import CampaignBuilder from './CampaignBuilder';
import QueueProcessor from './QueueProcessor';

const CampaignsManager = () => {
    const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isBuilderOpen, setIsBuilderOpen] = useState(false);
    const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);

    const [filterDays, setFilterDays] = useState<string>('30');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchCampaigns();
        
        const subscription = supabase
            .channel('campaigns_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'SITE_MarketingCampaigns' }, () => {
                fetchCampaigns();
            })
            .subscribe();

        return () => { subscription.unsubscribe(); }
    }, [filterDays]); // Refetch when filter changes

    const fetchCampaigns = async () => {
        setIsLoading(true);
        let query = supabase
            .from('SITE_MarketingCampaigns')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (filterDays !== 'all') {
            const date = new Date();
            date.setDate(date.getDate() - parseInt(filterDays));
            query = query.gte('created_at', date.toISOString());
        }

        const { data } = await query;
        
        if (data) {
            // Map created_at to createdAt for UI consistency
            const mapped = data.map((c: any) => ({
                ...c,
                createdAt: c.created_at,
                stats: c.stats || { sent: 0, failed: 0, total: c.total_recipients || 0 }
            }));
            setCampaigns(mapped);
        }
        setIsLoading(false);
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Excluir esta campanha?')) return;
        
        await supabase.from('SITE_CampaignQueue').delete().eq('campaign_id', id);
        await supabase.from('SITE_MarketingCampaigns').delete().eq('id', id);
        fetchCampaigns();
    };

    const handleResume = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        await supabase.from('SITE_MarketingCampaigns').update({ status: 'Processing' }).eq('id', id);
    };

    const handlePause = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        await supabase.from('SITE_MarketingCampaigns').update({ status: 'Paused' }).eq('id', id);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Draft': return 'bg-gray-100 text-gray-500';
            case 'Scheduled': return 'bg-blue-50 text-blue-600';
            case 'Processing': return 'bg-yellow-50 text-yellow-600 animate-pulse';
            case 'Completed': return 'bg-green-50 text-green-600';
            case 'Paused': return 'bg-red-50 text-red-600';
            default: return 'bg-gray-100';
        }
    };

    if (isBuilderOpen) {
        return <CampaignBuilder onClose={() => { setIsBuilderOpen(false); fetchCampaigns(); }} />;
    }

    const activeProcessingCampaign = campaigns.find(c => c.status === 'Processing');
    const filteredCampaigns = campaigns.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            
            {/* Active Processor Widget */}
            {activeProcessingCampaign && (
                <QueueProcessor campaign={activeProcessingCampaign} onComplete={fetchCampaigns} />
            )}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                     <h3 className="font-black text-2xl text-gray-900 flex items-center gap-2">
                        <Megaphone className="text-purple-600" /> Campanhas
                    </h3>
                    <p className="text-sm text-gray-500 font-medium tracking-tight">Gerencie e monitore seus disparos de marketing.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <input 
                            type="text" 
                            placeholder="Buscar campanha..."
                            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all font-medium"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                        <Megaphone size={14} className="absolute left-3 top-3 text-gray-400" />
                    </div>

                    <select 
                        className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold text-gray-700 outline-none focus:border-purple-400"
                        value={filterDays}
                        onChange={e => setFilterDays(e.target.value)}
                    >
                        <option value="7">Últimos 7 dias</option>
                        <option value="30">Últimos 30 dias</option>
                        <option value="90">Últimos 90 dias</option>
                        <option value="all">Todo o período</option>
                    </select>

                    <button 
                        onClick={() => setIsBuilderOpen(true)}
                        className="bg-purple-600 text-white px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-wider flex items-center gap-2 hover:bg-purple-700 shadow-xl shadow-purple-100 active:scale-95 transition-all"
                    >
                        <Plus size={18} /> Nova Campanha
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {filteredCampaigns.map(campaign => {
                    const totalCount = campaign.stats?.total || campaign.total_recipients || 0;
                    const sentCount = campaign.stats?.sent || 0;
                    const progress = totalCount > 0 ? Math.round((sentCount / totalCount) * 100) : 0;

                    return (
                        <div key={campaign.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                            {/* Decorative accent */}
                            <div className={`absolute top-0 left-0 w-1 h-full ${campaign.status === 'Completed' ? 'bg-green-500' : campaign.status === 'Processing' ? 'bg-yellow-500' : 'bg-purple-500'}`} />

                            <div className="flex justify-between items-start">
                                <div className="flex gap-5 items-center">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${campaign.channel === 'WhatsApp' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                                        {campaign.channel === 'WhatsApp' ? <Send size={24} /> : <Mail size={24} />} 
                                    </div>
                                    <div>
                                        <h4 className="font-black text-gray-900 text-lg leading-tight mb-1 group-hover:text-purple-600 transition-colors uppercase tracking-tight">{campaign.name}</h4>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-bold mt-2">
                                            <span className={`px-2 py-0.5 rounded-lg text-[10px] uppercase tracking-widest ${getStatusColor(campaign.status)}`}>
                                                {campaign.status === 'Processing' ? 'ENVIANDO' : campaign.status === 'Completed' ? 'CONCLUÍDA' : campaign.status === 'Paused' ? 'PAUSADA' : campaign.status}
                                            </span>
                                            <span className="flex items-center gap-1.5 text-gray-400 bg-gray-50 px-2 py-1 rounded-md">
                                                <Calendar size={12} className="text-gray-300" /> {new Date(campaign.createdAt).toLocaleDateString('pt-BR')}
                                            </span>
                                            <span className="flex items-center gap-1.5 text-gray-400 bg-gray-50 px-2 py-1 rounded-md">
                                                <CheckCircle size={12} className="text-green-500" /> {sentCount} de {totalCount} Enviados
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {campaign.status === 'Processing' && (
                                        <button onClick={(e) => handlePause(campaign.id, e)} className="p-2.5 bg-yellow-50 text-yellow-600 rounded-xl hover:bg-yellow-100 transition-all active:scale-90" title="Pausar">
                                            <Pause size={18} fill="currentColor" />
                                        </button>
                                    )}
                                    {(campaign.status === 'Paused' || campaign.status === 'Draft' || campaign.status === 'Scheduled') && (
                                         <button onClick={(e) => handleResume(campaign.id, e)} className="p-2.5 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-all active:scale-90" title="Iniciar/Retomar">
                                            <Play size={18} fill="currentColor" />
                                        </button>
                                    )}
                                    
                                    <button onClick={(e) => handleDelete(campaign.id, e)} className="p-2.5 hover:bg-red-50 text-red-400 rounded-xl transition-all hover:text-red-500 active:scale-90" title="Excluir">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                            
                            {/* Improved Progress Bar */}
                            {(campaign.status === 'Processing' || campaign.status === 'Paused' || campaign.status === 'Completed') && (
                                 <div className="mt-6">
                                    <div className="flex justify-between items-end mb-2">
                                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Progresso do Disparo</span>
                                        <span className="text-xs font-black text-gray-900">{progress}%</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden p-0.5 border border-gray-50">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-1000 ease-out shadow-sm ${campaign.status === 'Completed' ? 'bg-gradient-to-r from-green-400 to-green-600' : 'bg-gradient-to-r from-purple-500 to-indigo-600 shadow-[0_0_10px_rgba(139,92,246,0.3)]'}`} 
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                 </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {filteredCampaigns.length === 0 && !isLoading && (
                <div className="bg-white border-2 border-dashed border-gray-100 rounded-3xl py-20 text-center text-gray-400">
                    <Megaphone size={64} className="mx-auto mb-4 opacity-10" />
                    <p className="text-lg font-bold">Nenhuma campanha encontrada</p>
                    <p className="text-sm">Ajuste os filtros ou crie uma nova campanha.</p>
                </div>
            )}
        </div>
    );
};

export default CampaignsManager;
