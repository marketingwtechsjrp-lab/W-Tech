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

const MarketingView = ({ permissions }: { permissions?: any }) => {
    const { user } = useAuth();
    
    const hasPerm = (key: string) => {
        if (!permissions) return true; // Default to true if not provided (fallback)
        if (permissions.admin_access) return true;
        return !!permissions[key] || !!permissions['manage_marketing']; // manage_marketing is the legacy all-access
    };

    const tabs = [
        { id: 'Dashboard', icon: BarChart2, label: 'Visão Geral', permission: 'marketing_view' },
        { id: 'Lists', icon: Users, label: 'Listas Inteligentes', permission: 'marketing_manage_lists' },
        { id: 'Campaigns', icon: Megaphone, label: 'Campanhas', permission: 'marketing_manage_campaigns' },
        { id: 'Templates', icon: FileText, label: 'Modelos', permission: 'marketing_manage_templates' }
    ].filter(tab => hasPerm(tab.permission));

    const [activeTab, setActiveTab] = useState<'Dashboard' | 'Lists' | 'Campaigns' | 'Templates'>(
        tabs.length > 0 ? tabs[0].id as any : 'Dashboard'
    );

    useEffect(() => {
        if (tabs.length > 0 && !tabs.find(t => t.id === activeTab)) {
            setActiveTab(tabs[0].id as any);
        }
    }, [permissions]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            {/* Header */}
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200 dark:border-gray-800 pb-4">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                        <Megaphone className="text-wtech-gold" /> Marketing Center
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Central de campanhas, automação e listas inteligentes.</p>
                </div>
                {/* Global Actions */}
                <div className="flex gap-2">
                     {/* Add buttons here later */}
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex bg-white dark:bg-[#1A1A1A] p-1 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 w-full md:w-auto overflow-x-auto">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                            activeTab === tab.id 
                            ? 'bg-black text-white shadow-lg dark:bg-white dark:text-black' 
                            : 'text-gray-500 hover:bg-gray-50 hover:text-black dark:text-gray-400 dark:hover:bg-[#333] dark:hover:text-white'
                        }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className={`bg-white dark:bg-[#1A1A1A] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm min-h-[500px] ${activeTab === 'Dashboard' ? '' : 'p-6'}`}>
                {activeTab === 'Dashboard' && <DashboardTab />}
                {activeTab === 'Lists' && <ListsManager permissions={permissions} />}
                {activeTab === 'Campaigns' && <CampaignsManager permissions={permissions} />}
                {activeTab === 'Templates' && <MessageTemplateManager permissions={permissions} />}
            </div>
        </div>
    );
};

export default MarketingView;
