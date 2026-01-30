import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import ReactApexChart from 'react-apexcharts';
import { Users, Eye, Smartphone, Monitor, Activity, MessageCircle, Globe, Database, RefreshCw } from 'lucide-react';
import { fetchGA4Data, fetchGA4Realtime, RealtimeData } from '../../../lib/googleAnalytics';

const AnalyticsView = () => {
    // State
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState(30);
    const [activeTab, setActiveTab] = useState<'overview' | 'acquisition' | 'engagement' | 'realtime'>('overview');
    const [dataSource, setDataSource] = useState<'supabase' | 'google'>('supabase');
    const [stats, setStats] = useState({
        totalViews: 0,
        uniqueVisitors: 0,
        totalEvents: 0,
        whatsappClicks: 0,
        conversionRate: 0,
        avgDuration: '0m 0s',
        bounceRate: '0%',
        sessions: 0,
        engagedSessions: 0,
        engagementRate: '0%',
        eventsPerSession: 0
    });
    const [dailyVisits, setDailyVisits] = useState<{ categories: string[], data: number[] }>({ categories: [], data: [] });
    const [topPages, setTopPages] = useState<any[]>([]);
    const [recentEvents, setRecentEvents] = useState<any[]>([]);
    const [deviceStats, setDeviceStats] = useState<{ mobile: number, desktop: number }>({ mobile: 0, desktop: 0 });
    const [acquisitionChannels, setAcquisitionChannels] = useState<{ source: string, count: number }[]>([]);
    const [acquisitionChart, setAcquisitionChart] = useState<{ categories: string[], series: any[] }>({ categories: [], series: [] });
    const [realtime, setRealtime] = useState<RealtimeData | null>(null);

    useEffect(() => {
        fetchData();
        if (activeTab === 'realtime') {
            const interval = setInterval(fetchRealtime, 30000); // 30s refresh
            fetchRealtime();
            return () => clearInterval(interval);
        }
    }, [period, activeTab]);

    const fetchRealtime = async () => {
        const rt = await fetchGA4Realtime();
        if (rt) setRealtime(rt);
    };

    const fetchData = async () => {
        setLoading(true);
        const googleData = await fetchGA4Data(period);
        
        if (googleData) {
            setDataSource('google');
            setStats({
                totalViews: googleData.totalViews,
                uniqueVisitors: googleData.activeUsers,
                totalEvents: googleData.eventCount,
                whatsappClicks: googleData.whatsappClicks,
                conversionRate: googleData.conversionRate,
                avgDuration: googleData.averageSessionDuration,
                bounceRate: googleData.bounceRate,
                sessions: googleData.engagementMetrics.sessions,
                engagedSessions: googleData.engagementMetrics.engagedSessions,
                engagementRate: googleData.engagementMetrics.engagementRate,
                eventsPerSession: googleData.engagementMetrics.eventsPerSession
            });
            setDailyVisits(googleData.dailyData);
            setTopPages(googleData.topPages);
            setDeviceStats(googleData.deviceStats);
            setAcquisitionChannels(googleData.acquisitionChannels);
            if (googleData.acquisitionChartData) {
                setAcquisitionChart(googleData.acquisitionChartData);
            }
            setLoading(false);
            return;
        }

        // Fallback to Supabase Internal Tracking
        setDataSource('supabase');
        // ... (Supabase logic if needed, but primary focus is GA4)
        setLoading(false);
    };

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

            {/* Tabs Navigation */}
            <div className="flex border-b border-gray-100 dark:border-gray-800 gap-8 overflow-x-auto no-scrollbar">
                {[
                    { id: 'overview', label: 'Visão Geral' },
                    { id: 'acquisition', label: 'Aquisição' },
                    { id: 'engagement', label: 'Engajamento' },
                    { id: 'realtime', label: 'Tempo Real' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`pb-4 text-sm font-bold transition-all relative ${activeTab === tab.id ? 'text-wtech-gold' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    >
                        {tab.label}
                        {activeTab === tab.id && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-wtech-gold rounded-full" />}
                    </button>
                ))}
            </div>

            {activeTab === 'overview' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <KPICard icon={Eye} label="Visualizações" value={stats.totalViews} color="blue" />
                        <KPICard icon={Users} label="Visitantes Únicos" value={stats.uniqueVisitors} color="purple" />
                        <KPICard icon={MessageCircle} label="Cliques WhatsApp" value={stats.whatsappClicks} color="green" />
                        <KPICard icon={Activity} label="Taxa de Conversão" value={`${stats.conversionRate}%`} color="yellow" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-white dark:bg-[#1A1A1A] p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
                            <h3 className="font-bold text-gray-800 dark:text-white mb-6">Tráfego no Período</h3>
                            <div className="h-[300px]">
                                <ReactApexChart options={chartOptions} series={[{ name: 'Visitas', data: dailyVisits.data }]} type="area" height="100%" />
                            </div>
                        </div>

                        <div className="bg-white dark:bg-[#1A1A1A] p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col justify-between">
                            <div>
                                <h3 className="font-bold text-gray-800 dark:text-white mb-4 italic">Dispositivos</h3>
                                <div className="space-y-6 py-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 font-bold"><Smartphone size={18} /> Mobile</div>
                                        <span className="font-black text-xl dark:text-white">{deviceStats.mobile}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 font-bold"><Monitor size={18} /> Desktop</div>
                                        <span className="font-black text-xl dark:text-white">{deviceStats.desktop}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-black/20 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 font-bold">
                                <p className="text-[10px] text-gray-500 uppercase font-black mb-1">Dica do Time</p>
                                <p className="text-xs text-gray-400 leading-relaxed">
                                    {deviceStats.mobile > deviceStats.desktop 
                                        ? "Seu tráfego é majoritariamente Mobile. Foque na velocidade." 
                                        : "Muitos acessos via Desktop. Priorize a navegabilidade."}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-[#1A1A1A] p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
                            <h3 className="font-bold text-gray-800 dark:text-white mb-4">Páginas mais Visitadas</h3>
                            <div className="space-y-3">
                                {topPages.map((p, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-sm group">
                                        <span className="text-gray-500 group-hover:text-wtech-gold transition-colors truncate w-4/5">{p.path}</span>
                                        <span className="font-bold dark:text-white bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">{p.count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="bg-white dark:bg-[#1A1A1A] p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
                            <h3 className="font-bold text-gray-800 dark:text-white mb-4">Métricas de Engajamento</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <MetricBox label="Taxa de Rejeição" value={stats.bounceRate} sub="Menor é melhor" />
                                <MetricBox label="Tempo Médio" value={stats.avgDuration} sub="Permanência" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'acquisition' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="bg-white dark:bg-[#1A1A1A] p-6 rounded-xl border border-gray-100 dark:border-gray-800">
                        <h3 className="text-lg font-bold dark:text-white mb-6">Tráfego por Canal ao Longo do Tempo</h3>
                        <div className="h-[350px]">
                            {acquisitionChart.series.length > 0 ? (
                                <ReactApexChart
                                    options={{
                                        chart: {
                                            type: 'line',
                                            toolbar: { show: false },
                                            fontFamily: 'Outfit, sans-serif',
                                            animations: { enabled: true },
                                            background: 'transparent'
                                        },
                                        stroke: {
                                            width: acquisitionChart.series.map(s => s.name === 'Total' ? 3 : 2),
                                            curve: 'smooth',
                                            dashArray: acquisitionChart.series.map(s => s.name === 'Total' ? 5 : 0)
                                        },
                                        colors: ['#3b82f6', '#10b981', '#f59e0b', '#4338ca', '#ec4899', '#8b5cf6', '#0ea5e9'],
                                        grid: {
                                            borderColor: '#f1f1f1',
                                            strokeDashArray: 4,
                                            xaxis: { lines: { show: true } },
                                            yaxis: { lines: { show: true } }
                                        },
                                        xaxis: {
                                            categories: acquisitionChart.categories,
                                            labels: { style: { colors: '#64748b' } },
                                            axisBorder: { show: false },
                                            axisTicks: { show: false }
                                        },
                                        yaxis: {
                                            labels: { style: { colors: '#64748b' } }
                                        },
                                        legend: {
                                            position: 'top',
                                            horizontalAlign: 'left',
                                            labels: { colors: '#64748b' }
                                        },
                                        tooltip: {
                                            theme: 'dark',
                                            x: { show: true }
                                        }
                                    }}
                                    series={acquisitionChart.series}
                                    type="line"
                                    height="100%"
                                />
                            ) : (
                                <div className="h-full flex items-center justify-center text-gray-400">
                                    Carregando dados do gráfico...
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-[#1A1A1A] p-8 rounded-xl border border-gray-100 dark:border-gray-800">
                        <h3 className="text-lg font-bold dark:text-white mb-6">Canais de Aquisição (Sessões)</h3>
                        <div className="space-y-6">
                            {acquisitionChannels.map((c, idx) => (
                                <div key={idx} className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="font-bold text-gray-700 dark:text-gray-300 capitalize">{c.source === '(direct)' ? 'Direto / Bookmark' : c.source}</span>
                                        <span className="text-wtech-gold font-bold">{c.count} sessões</span>
                                    </div>
                                    <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-wtech-gold transition-all duration-1000" 
                                            style={{ width: `${(c.count / (stats.sessions || 1)) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'engagement' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <KPICard icon={Activity} label="Sessões Engajadas" value={stats.engagedSessions} color="blue" />
                        <KPICard icon={Activity} label="Taxa de Engajamento" value={stats.engagementRate} color="green" />
                        <KPICard icon={Activity} label="Eventos por Sessão" value={stats.eventsPerSession.toFixed(1)} color="purple" />
                    </div>
                </div>
            )}

            {activeTab === 'realtime' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-wtech-gold/10 p-8 rounded-2xl border border-wtech-gold/20 flex flex-col items-center justify-center text-center">
                            <div className="relative mb-4">
                                <div className="absolute inset-0 bg-wtech-gold/20 rounded-full animate-ping" />
                                <div className="relative w-20 h-20 bg-wtech-gold rounded-full flex items-center justify-center text-white text-3xl font-black shadow-lg">
                                    {realtime?.activeUsers || 0}
                                </div>
                            </div>
                            <h3 className="text-lg font-bold text-wtech-gold mb-1 uppercase tracking-widest">Usuários Online</h3>
                            <p className="text-xs text-gray-500">Acessos registrados nos últimos 30 minutos.</p>
                        </div>

                        <div className="bg-white dark:bg-[#1A1A1A] p-6 rounded-xl border border-gray-100 dark:border-gray-800">
                            <h3 className="font-bold dark:text-white mb-4">Páginas em Alta (Agora)</h3>
                            <div className="space-y-4">
                                {realtime?.topPages.map((p, idx) => (
                                    <div key={idx} className="flex justify-between items-center group">
                                        <span className="text-sm text-gray-500 truncate w-3/4 group-hover:text-wtech-gold transition-colors">{p.path}</span>
                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-md text-[10px] font-black">
                                            {p.users} ONLINE
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white dark:bg-[#1A1A1A] p-6 rounded-xl border border-gray-100 dark:border-gray-800 lg:col-span-2">
                            <h3 className="font-bold dark:text-white mb-4">Origem Geográfica</h3>
                            <div className="flex flex-wrap gap-4">
                                {realtime?.topCountries.map((c, idx) => (
                                    <div key={idx} className="flex-1 min-w-[150px] p-4 bg-gray-50 dark:bg-black/20 rounded-xl border border-gray-100 dark:border-gray-800 text-center">
                                        <p className="text-[10px] text-gray-500 uppercase font-black mb-1">{c.country}</p>
                                        <p className="text-2xl font-black dark:text-white">{c.users}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
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
        <div className="bg-white dark:bg-[#1A1A1A] p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-4">
            <div className={`p-4 rounded-full ${colors[color]}`}><Icon size={24} /></div>
            <div>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{label}</p>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">{value}</h3>
            </div>
        </div>
    );
};

const MetricBox = ({ label, value, sub }: any) => (
    <div className="text-center p-4 bg-gray-50 dark:bg-black/20 rounded-xl border border-gray-100 dark:border-gray-800">
        <p className="text-[10px] text-gray-500 uppercase font-black mb-1">{label}</p>
        <p className="text-xl font-bold dark:text-white">{value}</p>
        <p className="text-[9px] text-gray-400 italic">{sub}</p>
    </div>
);

export default AnalyticsView;
