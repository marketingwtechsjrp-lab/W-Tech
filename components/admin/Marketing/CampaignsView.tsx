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
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const DashboardTab = ({ permissions }: { permissions?: any }) => {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        totalContacts: 0,
        totalCampaigns: 0,
        totalTemplates: 0,
        messages: { sent: 0, failed: 0, pending: 0, total: 0 }
    });
    
    // Chart Data State
    const [chartData, setChartData] = useState<any[]>([]);
    const [dateFilter, setDateFilter] = useState('7'); // Default 7 days

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchStats();
            fetchChartData();
        }
    }, [user, permissions, dateFilter]); // Re-fetch chart when filter changes

    const fetchStats = async () => {
        const isAdmin = permissions?.admin_access || permissions?.manage_marketing;

        try {
            // 1. Contacts (Leads)
            let leadsQuery = supabase.from('SITE_Leads').select('*', { count: 'exact', head: true });
            if (!isAdmin) leadsQuery = leadsQuery.eq('assigned_to', user?.id);
            const { count: leadsCount } = await leadsQuery;

            // 2. Campaigns
            let campQuery = supabase.from('SITE_MarketingCampaigns').select('stats, template_id');
            if (!isAdmin) campQuery = campQuery.eq('created_by', user?.id);
            const { data: campaigns } = await campQuery;

            const campCount = campaigns?.length || 0;
            
            // 3. Message Stats (Aggregate)
            let msgStats = { sent: 0, failed: 0, pending: 0, total: 0 };
            const usedTemplateIds = new Set();

            campaigns?.forEach((c: any) => {
                const s = c.stats || {};
                msgStats.sent += (s.sent || 0);
                msgStats.failed += (s.failed || 0);
                msgStats.total += (s.total || 0);
                if (c.template_id) usedTemplateIds.add(c.template_id);
            });
            msgStats.pending = msgStats.total - (msgStats.sent + msgStats.failed);
            if (msgStats.pending < 0) msgStats.pending = 0;

            // 4. Templates
            // If Admin, show ALL templates. If User, show templates THEY used or created (if templates have owner)
            // For now, let's show "Templates Used" for users, or Total available if that makes more sense. 
            // The prompt says "quantos modelos ELES estão disparando", implying usage.
            // So for non-admins, counting distinct templates from their campaigns might be more accurate to "what they are using".
            let templatesCount = 0;
            if (isAdmin) {
                 const { count } = await supabase.from('SITE_MessageTemplates').select('*', { count: 'exact', head: true });
                 templatesCount = count || 0;
            } else {
                 templatesCount = usedTemplateIds.size;
            }

            setStats({
                totalContacts: leadsCount || 0,
                totalCampaigns: campCount,
                totalTemplates: templatesCount,
                messages: msgStats
            });

        } catch (error) {
            console.error("Error loading stats:", error);
        }
    };

    const fetchChartData = async () => {
        setLoading(true);
        const isAdmin = permissions?.admin_access || permissions?.manage_marketing;
        const days = parseInt(dateFilter);
        
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            // Fetch campaigns created within range
            let query = supabase
                .from('SITE_MarketingCampaigns')
                .select('created_at, stats')
                .gte('created_at', startDate.toISOString())
                .order('created_at', { ascending: true });

            if (!isAdmin) {
                query = query.eq('created_by', user?.id);
            }

            const { data } = await query;
            
            // Aggregate by Day
            const dailyStats: any = {};
            
            // Initialize all days in range with 0
            for (let i = 0; i <= days; i++) {
                const d = new Date();
                d.setDate(d.getDate() - (days - i));
                const key = d.toLocaleDateString('pt-BR'); // DD/MM/YYYY
                dailyStats[key] = { name: key.slice(0, 5), sent: 0, failed: 0 }; // Show DD/MM
            }

            data?.forEach((c: any) => {
                const dateKey = new Date(c.created_at).toLocaleDateString('pt-BR');
                if (dailyStats[dateKey]) {
                    dailyStats[dateKey].sent += (c.stats?.sent || 0);
                    dailyStats[dateKey].failed += (c.stats?.failed || 0);
                }
            });

            setChartData(Object.values(dailyStats));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading && stats.totalCampaigns === 0) {
        return <div className="p-12 text-center text-gray-400">Carregando métricas...</div>;
    }

    return (
        <div className="p-6 md:p-8 space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-[#222] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">
                            {permissions?.admin_access ? 'Total de Contatos' : 'Meus Contatos'}
                        </p>
                        <h3 className="text-3xl font-black text-gray-900 dark:text-white">{stats.totalContacts}</h3>
                    </div>
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-2xl">
                        <Users size={28} />
                    </div>
                </div>

                <div className="bg-white dark:bg-[#222] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Campanhas</p>
                        <h3 className="text-3xl font-black text-gray-900 dark:text-white">{stats.totalCampaigns}</h3>
                    </div>
                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-2xl">
                        <Megaphone size={28} />
                    </div>
                </div>

                 <div className="bg-white dark:bg-[#222] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Disparos Feitos</p>
                        <h3 className="text-3xl font-black text-gray-900 dark:text-white">{stats.messages.sent}</h3>
                        <p className="text-xs text-green-500 font-bold mt-1">Entregues</p>
                    </div>
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-2xl">
                        <div className="relative">
                            <BarChart2 size={28} />
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-[#222]"></div>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-[#222] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Modelos Usados</p>
                        <h3 className="text-3xl font-black text-gray-900 dark:text-white">{stats.totalTemplates}</h3>
                    </div>
                    <div className="p-4 bg-orange-50 dark:bg-orange-900/20 text-orange-600 rounded-2xl">
                        <FileText size={28} />
                    </div>
                </div>
            </div>

            {/* Chart Section */}
            <div className="bg-white dark:bg-[#222] rounded-3xl p-8 border border-gray-100 dark:border-gray-800 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <div>
                        <h4 className="font-black text-xl text-gray-900 dark:text-white">Desempenho de Disparos</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Volume de mensagens enviadas e falhas no período.</p>
                    </div>
                    <div className="flex bg-gray-100 dark:bg-[#111] p-1 rounded-xl">
                        {['1', '7', '15', '30', '60', '90'].map((d) => (
                            <button
                                key={d}
                                onClick={() => setDateFilter(d)}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                                    dateFilter === d 
                                    ? 'bg-white dark:bg-[#333] text-black dark:text-white shadow-sm' 
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                }`}
                            >
                                {d === '1' ? 'Hoje' : `${d}D`}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                            <XAxis 
                                dataKey="name" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{fontSize: 12, fill: '#9CA3AF'}} 
                                dy={10}
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{fontSize: 12, fill: '#9CA3AF'}} 
                            />
                            <Tooltip 
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                cursor={{fill: 'transparent'}}
                            />
                            <Legend />
                            <Bar dataKey="sent" name="Enviados" fill="#8B5CF6" radius={[4, 4, 0, 0]} barSize={20} />
                            <Bar dataKey="failed" name="Falhas" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
            
            {/* Status Progress Bars (Same as before) */}
            <div className="bg-gray-50 dark:bg-[#1A1A1A] rounded-3xl p-8 border border-gray-100 dark:border-gray-800">
                <h4 className="font-black text-xl text-gray-900 dark:text-white mb-6">Status Global</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-[#222] p-5 rounded-2xl border border-gray-100 dark:border-gray-700">
                        <div className="flex justify-between mb-2">
                             <span className="font-bold text-gray-500 dark:text-gray-400">Total Processado</span>
                             <span className="font-black text-gray-900 dark:text-white">{stats.messages.total}</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-[#111] h-2 rounded-full overflow-hidden">
                            <div className="bg-gray-400 h-full w-full opacity-20"></div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-[#222] p-5 rounded-2xl border border-gray-100 dark:border-gray-700">
                        <div className="flex justify-between mb-2">
                             <span className="font-bold text-yellow-600 dark:text-yellow-500">Pendentes</span>
                             <span className="font-black text-gray-900 dark:text-white">{stats.messages.pending}</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-[#111] h-2 rounded-full overflow-hidden">
                            <div className="bg-yellow-400 h-full transition-all" style={{ width: `${stats.messages.total ? (stats.messages.pending / stats.messages.total) * 100 : 0}%` }}></div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-[#222] p-5 rounded-2xl border border-gray-100 dark:border-gray-700">
                        <div className="flex justify-between mb-2">
                             <span className="font-bold text-red-600 dark:text-red-500">Falhas / Erros</span>
                             <span className="font-black text-gray-900 dark:text-white">{stats.messages.failed}</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-[#111] h-2 rounded-full overflow-hidden">
                            <div className="bg-red-500 h-full transition-all" style={{ width: `${stats.messages.total ? (stats.messages.failed / stats.messages.total) * 100 : 0}%` }}></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

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
                {activeTab === 'Dashboard' && <DashboardTab permissions={permissions} />}
                {activeTab === 'Lists' && <ListsManager permissions={permissions} />}
                {activeTab === 'Campaigns' && <CampaignsManager permissions={permissions} />}
                {activeTab === 'Templates' && <MessageTemplateManager permissions={permissions} />}
            </div>
        </div>
    );
};

export default CampaignsView;
