import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { MarketingCampaign } from '../../../types';
import { Plus, Megaphone, Calendar, CheckCircle, AlertCircle, Play, Pause, Trash2, Clock, Send } from 'lucide-react';
import CampaignBuilder from './CampaignBuilder';
import QueueProcessor from './QueueProcessor';

const CampaignsManager = () => {
    const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isBuilderOpen, setIsBuilderOpen] = useState(false);
    const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);

    useEffect(() => {
        fetchCampaigns();
        
        // Subscribe to changes
        const subscription = supabase
            .channel('campaigns_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'SITE_MarketingCampaigns' }, () => {
                fetchCampaigns();
            })
            .subscribe();

        return () => { subscription.unsubscribe(); }
    }, []);

    const fetchCampaigns = async () => {
        setIsLoading(true);
        const { data } = await supabase
            .from('SITE_MarketingCampaigns')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (data) setCampaigns(data);
        setIsLoading(false);
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Excluir esta campanha?')) return;
        
        await supabase.from('SITE_CampaignQueue').delete().eq('campaign_id', id); // Cascade should handle this but safer
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

    // Identify active processing campaign to show QueueProcessor
    const activeProcessingCampaign = campaigns.find(c => c.status === 'Processing');

    return (
        <div className="space-y-6">
            
            {/* Active Processor Widget */}
            {activeProcessingCampaign && (
                <QueueProcessor campaign={activeProcessingCampaign} onComplete={fetchCampaigns} />
            )}

            <div className="flex justify-between items-center">
                <div>
                     <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                        <Megaphone className="text-purple-600" /> Minhas Campanhas
                    </h3>
                    <p className="text-sm text-gray-500">Gerencie e monitore seus disparos.</p>
                </div>
                <button 
                    onClick={() => setIsBuilderOpen(true)}
                    className="bg-purple-600 text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2 hover:bg-purple-700 shadow-lg shadow-purple-200"
                >
                    <Plus size={16} /> Nova Campanha
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {campaigns.map(campaign => (
                    <div key={campaign.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                        <div className="flex justify-between items-start">
                            <div className="flex gap-4 items-center">
                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${campaign.channel === 'WhatsApp' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                                    {campaign.channel === 'WhatsApp' ? <Send size={20} /> : <AlertCircle size={20} />} 
                                    {/* Icon choice: Send for WA, Alert/Mail for Email */}
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-800 text-lg">{campaign.name}</h4>
                                    <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${getStatusColor(campaign.status)}`}>
                                            {campaign.status}
                                        </span>
                                        <span className="flex items-center gap-1"><Clock size={12} /> {new Date(campaign.createdAt).toLocaleDateString()}</span>
                                        <span className="flex items-center gap-1"><CheckCircle size={12} /> {campaign.stats?.sent || 0} Enviados</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {/* Actions based on status */}
                                {campaign.status === 'Processing' && (
                                    <button onClick={(e) => handlePause(campaign.id, e)} className="p-2 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200" title="Pausar">
                                        <Pause size={16} />
                                    </button>
                                )}
                                {(campaign.status === 'Paused' || campaign.status === 'Draft' || campaign.status === 'Scheduled') && (
                                     <button onClick={(e) => handleResume(campaign.id, e)} className="p-2 bg-green-100 text-green-700 rounded hover:bg-green-200" title="Iniciar/Retomar">
                                        <Play size={16} />
                                    </button>
                                )}
                                
                                <button onClick={(e) => handleDelete(campaign.id, e)} className="p-2 hover:bg-red-50 text-red-500 rounded transition-colors" title="Excluir">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                        
                        {/* Progress Bar for active/paused campaigns */}
                        {(campaign.status === 'Processing' || campaign.status === 'Paused' || campaign.status === 'Completed') && (
                             <div className="mt-4">
                                <div className="flex justify-between text-xs text-gray-500 mb-1">
                                    <span>Progresso</span>
                                    <span>{campaign.stats?.sent || 0} / {campaign.stats?.total || '?'}</span> 
                                    {/* Note: I need to add 'total' to stats in DB or derive it */}
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                    <div 
                                        className={`h-full ${campaign.status === 'Completed' ? 'bg-green-500' : 'bg-purple-500'} transition-all duration-500`} 
                                        style={{ width: `${campaign.stats?.total ? ((campaign.stats.sent / campaign.stats.total) * 100) : 0}%` }}
                                    ></div>
                                </div>
                             </div>
                        )}
                    </div>
                ))}
            </div>

            {campaigns.length === 0 && !isLoading && (
                <div className="text-center py-10 text-gray-400">
                    <Megaphone size={48} className="mx-auto mb-2 opacity-20" />
                    <p>Nenhuma campanha criada.</p>
                </div>
            )}
        </div>
    );
};

export default CampaignsManager;
