import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import ReactApexChart from 'react-apexcharts';
import { Users, Eye, MousePointer, Smartphone, Monitor, ArrowRight, Filter, Download, Activity, MessageCircle, Globe, Database, RefreshCw } from 'lucide-react';
import { useSettings } from '../../../context/SettingsContext';
import { fetchGA4Data, GA4Metrics } from '../../../lib/googleAnalytics';

const AnalyticsView = () => {
    // State
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState(30);
    const [dataSource, setDataSource] = useState<'supabase' | 'google'>('supabase');
    const [stats, setStats] = useState({
        totalViews: 0,
        uniqueVisitors: 0,
        totalEvents: 0,
        whatsappClicks: 0,
        conversionRate: 0
    });
    const [dailyVisits, setDailyVisits] = useState<{ categories: string[], data: number[] }>({ categories: [], data: [] });
    const [topPages, setTopPages] = useState<any[]>([]);
    const [recentEvents, setRecentEvents] = useState<any[]>([]);
    const [deviceStats, setDeviceStats] = useState<{ mobile: number, desktop: number }>({ mobile: 0, desktop: 0 });

    useEffect(() => {
        fetchData();
    }, [period]);

    const fetchData = async () => {
        setLoading(true);
        
        // Try Google Analytics 4 First
        const googleData = await fetchGA4Data(period);
        
        if (googleData) {
            setDataSource('google');
            setStats({
                totalViews: googleData.totalViews,
                uniqueVisitors: googleData.activeUsers,
                totalEvents: googleData.eventCount,
                whatsappClicks: 0, // Need GA4 Event parsing
                conversionRate: 0
            });
            setDailyVisits(googleData.dailyData);
            setTopPages(googleData.topPages);
            setDeviceStats(googleData.deviceStats);
            setLoading(false);
            return;
        }

        // Fallback to Supabase Internal Tracking
        setDataSource('supabase');
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - period);
        const startIso = startDate.toISOString();

        // 1. Fetch Page Views
        const { data: views } = await supabase
            .from('SITE_Analytics_PageViews')
            .select('*')
            .gte('created_at', startIso);

        // 2. Fetch Events
        const { data: events } = await supabase
            .from('SITE_Analytics_Events')
            .select('*')
            .gte('created_at', startIso)
            .order('created_at', { ascending: false });

        if (views && events) {
            // KPI: Basics
            const totalViews = views.length;
            const uniqueVisitors = new Set(views.map(v => v.visitor_id)).size;
            const totalEvents = events.length;
            
            // KPI: Conversions (WhatsApp or Forms)
            const whatsappClicks = events.filter(e => 
                e.action === 'click_start_chat' || 
                e.action === 'conversation_started' || 
                e.category === 'WhatsApp'
            ).length;

            const conversionRate = totalViews > 0 ? ((whatsappClicks / totalViews) * 100).toFixed(1) : 0;

            // Chart: Daily Visits
            const daysMap: Record<string, number> = {};
            for (let i = 0; i < period; i++) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                daysMap[d.toISOString().split('T')[0]] = 0;
            }

            let mobile = 0;
            let desktop = 0;
            const pagesMap: Record<string, number> = {};

            views.forEach(v => {
                const date = v.created_at.split('T')[0];
                if (daysMap[date] !== undefined) daysMap[date]++;

                // Device
                if (v.device_type === 'mobile') mobile++;
                else desktop++;

                // Pages
                const p = v.path.split('?')[0]; 
                pagesMap[p] = (pagesMap[p] || 0) + 1;
            });

            // Sort Chart
            const sortedDates = Object.keys(daysMap).sort();
            setDailyVisits({
                categories: sortedDates.map(d => d.split('-').slice(1).join('/')),
                data: sortedDates.map(d => daysMap[d])
            });

            // Top Pages
            setTopPages(Object.entries(pagesMap)
                .map(([path, count]) => ({ path, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 10));

            // Recent Events
            setRecentEvents(events.slice(0, 50));

            setStats({ 
                totalViews, 
                uniqueVisitors, 
                totalEvents, 
                whatsappClicks, 
                conversionRate: Number(conversionRate) 
            });
            setDeviceStats({ mobile, desktop });
        }

        setLoading(false);
    };

    // Chart Config
    const chartOptions: ApexCharts.ApexOptions = {
        chart: { type: 'area', toolbar: { show: false }, background: 'transparent' },
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth', width: 2 },
        xaxis: { categories: dailyVisits.categories, labels: { style: { colors: '#888' } } },
        yaxis: { labels: { style: { colors: '#888' } } },
        grid: { borderColor: '#333', strokeDashArray: 4 },
        colors: [dataSource === 'google' ? '#10b981' : '#D4AF37'],
        fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.7, opacityTo: 0.1, stops: [0, 90, 100] } },
        theme: { mode: 'dark' }
    };

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <Activity className="text-wtech-gold" /> Analytics 2.0
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-gray-500">Monitoramento de tráfego e conversões.</p>
                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${dataSource === 'google' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                            {dataSource === 'google' ? <><Globe size={10} /> Google Analytics 4</> : <><Database size={10} /> Local Database</>}
                        </span>
                        {dataSource === 'supabase' && !loading && (
                            <span className="text-[10px] text-gray-400 animate-pulse kur">
                                (Conecte ao Google em Integrações para dados reais)
                            </span>
                        )}
                        {loading && <RefreshCw size={12} className="animate-spin text-gray-400 ml-1" />}
                    </div>
                </div>

                <div className="flex bg-gray-100 dark:bg-[#1A1A1A] p-1 rounded-lg border border-gray-200 dark:border-gray-800">
                    {[7, 30, 90].map(d => (
                        <button
                            key={d}
                            onClick={() => setPeriod(d)}
                            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${period === d ? 'bg-white dark:bg-[#333] shadow text-black dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                        >
                            {d} dias
                        </button>
                    ))}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard icon={Eye} label="Visualizações" value={stats.totalViews} color="blue" />
                <KPICard icon={Users} label="Visitantes Únicos" value={stats.uniqueVisitors} color="purple" />
                <KPICard icon={MessageCircle} label="Cliques WhatsApp" value={stats.whatsappClicks} color="green" />
                <KPICard icon={Activity} label="Taxa de Conversão" value={`${stats.conversionRate}%`} color="yellow" />
            </div>

            {/* Main Chart */}
            <div className="bg-white dark:bg-[#1A1A1A] p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
                <h3 className="font-bold text-gray-800 dark:text-white mb-6">Tráfego no Período</h3>
                <div className="h-[300px]">
                    <ReactApexChart options={chartOptions} series={[{ name: 'Visitas', data: dailyVisits.data }]} type="area" height="100%" />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Event Log (New) */}
                <div className="lg:col-span-2 bg-white dark:bg-[#1A1A1A] rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col h-[500px]">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                        <h3 className="font-bold text-gray-800 dark:text-white">Últimos Eventos</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                        <table className="w-full text-sm">
                            <thead className="text-xs text-gray-400 font-bold uppercase sticky top-0 bg-white dark:bg-[#1A1A1A]">
                                <tr>
                                    <th className="px-4 py-3 text-left">Hora</th>
                                    <th className="px-4 py-3 text-left">Ação</th>
                                    <th className="px-4 py-3 text-left">Categoria</th>
                                    <th className="px-4 py-3 text-left">Label</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {recentEvents.map((e) => (
                                    <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                        <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                                            {new Date(e.created_at).toLocaleTimeString()}
                                        </td>
                                        <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{e.action}</td>
                                        <td className="px-4 py-3">
                                            <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-gray-100 dark:bg-gray-800 text-gray-500">
                                                {e.category}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500 truncate max-w-[150px]" title={e.label}>{e.label}</td>
                                    </tr>
                                ))}
                                {recentEvents.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                                            Nenhum evento registrado ainda.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Top Pages & Devices */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-[#1A1A1A] p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
                        <h3 className="font-bold text-gray-800 dark:text-white mb-4">Páginas Populares</h3>
                        <div className="space-y-3">
                            {topPages.map((p, idx) => (
                                <div key={idx} className="flex justify-between items-center text-sm border-b border-gray-50 dark:border-gray-800 pb-2 last:border-0">
                                    <span className="text-gray-600 dark:text-gray-400 truncate w-3/4" title={p.path}>{p.path}</span>
                                    <span className="font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-xs">{p.count}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-[#1A1A1A] p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
                        <h3 className="font-bold text-gray-800 dark:text-white mb-4">Dispositivos</h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                    <Smartphone size={18} /> Mobile
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-24 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-wtech-gold" style={{ width: `${(deviceStats.mobile / ((deviceStats.mobile + deviceStats.desktop) || 1)) * 100}%` }}></div>
                                    </div>
                                    <span className="font-bold dark:text-white">{deviceStats.mobile}</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                    <Monitor size={18} /> Desktop
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-24 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500" style={{ width: `${(deviceStats.desktop / ((deviceStats.mobile + deviceStats.desktop) || 1)) * 100}%` }}></div>
                                    </div>
                                    <span className="font-bold dark:text-white">{deviceStats.desktop}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const KPICard = ({ icon: Icon, label, value, color }: any) => {
    const colors: any = {
        blue: 'text-blue-600 bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400',
        purple: 'text-purple-600 bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400',
        green: 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400',
        yellow: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400',
    };

    return (
        <div className="bg-white dark:bg-[#1A1A1A] p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-4 hover:border-wtech-gold/30 transition-colors">
            <div className={`p-4 rounded-full ${colors[color]}`}>
                <Icon size={24} />
            </div>
            <div>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{label}</p>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">{value}</h3>
            </div>
        </div>
    );
};

export default AnalyticsView;
