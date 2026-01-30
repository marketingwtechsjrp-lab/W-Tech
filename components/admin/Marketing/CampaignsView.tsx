import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { 
    BarChart2, Users, Megaphone, FileText
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import ListsManager from './ListsManager';
import CampaignsManager from './CampaignsManager';
import MessageTemplateManager from '../WhatsApp/MessageTemplateManager';

// Sub-components
const DashboardTab = () => (
    <div className="p-8 text-center text-gray-500">
        <BarChart2 size={48} className="mx-auto mb-4 opacity-20" />
        <h3 className="text-lg font-bold text-gray-700">Visão Geral das Campanhas</h3>
        <p>Estatísticas e métricas de envio e conversão aparecerão aqui.</p>
    </div>
);

const CampaignsView = ({ permissions }: { permissions?: any }) => {
    const { user } = useAuth();
    
    const hasPerm = (key: string) => {
        if (!permissions) return true; 
        if (permissions.admin_access) return true;
        return !!permissions[key] || !!permissions['manage_marketing']; 
    };

    const tabs = [
        { id: 'Dashboard', icon: BarChart2, label: 'Visão Geral', permission: 'marketing_view' },
        { id: 'Lists', icon: Users, label: 'Listas Inteligentes', permission: 'marketing_manage_lists' },
        { id: 'Campaigns', icon: Megaphone, label: 'Campanhas', permission: 'marketing_manage_campaigns' },
        { id: 'Templates', icon: FileText, label: 'Modelos', permission: 'marketing_manage_templates' },
    ].filter(tab => hasPerm(tab.permission));

    const [activeTab, setActiveTab] = useState<string>(
        tabs.length > 0 ? tabs[0].id : 'Dashboard'
    );

    useEffect(() => {
        if (tabs.length > 0 && !tabs.find(t => t.id === activeTab)) {
            setActiveTab(tabs[0].id);
        }
    }, [permissions]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            {/* Header */}
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200 dark:border-gray-800 pb-4">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                        <Megaphone className="text-wtech-gold" /> Campanhas
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Automação de e-mail, WhatsApp e gestão de listas.</p>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex bg-white dark:bg-[#1A1A1A] p-1 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 w-full md:w-auto overflow-x-auto custom-scrollbar">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
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
            <div className={`bg-white dark:bg-[#1A1A1A] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm min-h-[600px] ${activeTab === 'Dashboard' ? '' : 'p-6'}`}>
                {activeTab === 'Dashboard' && <DashboardTab />}
                {activeTab === 'Lists' && <ListsManager permissions={permissions} />}
                {activeTab === 'Campaigns' && <CampaignsManager permissions={permissions} />}
                {activeTab === 'Templates' && <MessageTemplateManager permissions={permissions} />}
            </div>
        </div>
    );
};

export default CampaignsView;
