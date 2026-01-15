import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { Plus, Search, Calendar, Users, Mail, Trash2, Edit, Send, Play, Pause, BarChart2, Eye, MousePointer, Clock, ArrowDown, ArrowUp, AlertCircle, Save, X, Megaphone, FileText, Filter, MessageSquare } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { MarketingList, MarketingCampaign, MessageTemplate } from '../../../types';
import ListsManager from './ListsManager';
import CampaignsManager from './CampaignsManager';
import MessageTemplateManager from '../WhatsApp/MessageTemplateManager';

// Sub-components (Will be extracted later if too large)
const DashboardTab = () => (
    <div className="p-8 text-center text-gray-500">
        <BarChart2 size={48} className="mx-auto mb-4 opacity-20" />
        <h3 className="text-lg font-bold text-gray-700">Visão Geral do Marketing</h3>
        <p>Estatísticas e métricas de campanhas aparecerão aqui.</p>
        {/* Future: Add aggregated stats here */}
    </div>
);

const MarketingView = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'Dashboard' | 'Lists' | 'Campaigns' | 'Templates'>('Dashboard');

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
             {/* Header */}
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200 pb-4">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <Megaphone className="text-wtech-gold" /> Marketing Center
                    </h2>
                    <p className="text-gray-500 mt-1">Central de campanhas, automação e listas inteligentes.</p>
                </div>
                {/* Global Actions */}
                <div className="flex gap-2">
                     {/* Add buttons here later */}
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-100 w-full md:w-auto overflow-x-auto">
                {[
                    { id: 'Dashboard', icon: BarChart2, label: 'Visão Geral' },
                    { id: 'Lists', icon: Users, label: 'Listas Inteligentes' },
                    { id: 'Campaigns', icon: Megaphone, label: 'Campanhas' },
                    { id: 'Templates', icon: FileText, label: 'Modelos' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                            activeTab === tab.id 
                            ? 'bg-black text-white shadow-lg' 
                            : 'text-gray-500 hover:bg-gray-50 hover:text-black'
                        }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm min-h-[500px] ${activeTab === 'Dashboard' ? '' : 'p-6'}`}>
                {activeTab === 'Dashboard' && <DashboardTab />}
                {activeTab === 'Lists' && <ListsManager />}
                {activeTab === 'Campaigns' && <CampaignsManager />}
                {activeTab === 'Templates' && <MessageTemplateManager />}
            </div>
        </div>
    );
};

export default MarketingView;
