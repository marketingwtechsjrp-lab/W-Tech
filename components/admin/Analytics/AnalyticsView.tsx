import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import ReactApexChart from 'react-apexcharts';
import { Users, Eye, MousePointer, Smartphone, Monitor, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { useSettings } from '../../../context/SettingsContext';


const AnalyticsView = () => {
    // State
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState(30); // days
    const [stats, setStats] = useState({
        totalViews: 0,
        uniqueVisitors: 0,
        totalEvents: 0,
        bounceRate: 0 // Placeholder
    });
    const [dailyVisits, setDailyVisits] = useState<{ categories: string[], data: number[] }>({ categories: [], data: [] });
    const [topPages, setTopPages] = useState<any[]>([]);
    const [topSources, setTopSources] = useState<any[]>([]);
    const [deviceStats, setDeviceStats] = useState<{ mobile: number, desktop: number }>({ mobile: 0, desktop: 0 });
    const { settings } = useSettings();
    const [googleStatus, setGoogleStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');
    const [statusMessage, setStatusMessage] = useState('');


    useEffect(() => {
        fetchData();
    }, [period]);

    const verifyGoogleIntegration = async () => {
        setGoogleStatus('checking');
        setStatusMessage('Verificando integração...');

        // Artificial delay for better UX
        await new Promise(resolve => setTimeout(resolve, 1500));

        const gaId = settings.ga_id;
        const gtagPresent = typeof (window as any).gtag === 'function';

        if (!gaId) {
            setGoogleStatus('error');
            setStatusMessage('ID do Google Analytics (GA4) não configurado nas configurações do sistema.');
            return;
        }

        if (!gtagPresent) {
            setGoogleStatus('error');
            setStatusMessage('Script do Google Analytics não detectado na página. Verifique se há bloqueadores de anúncios.');
            return;
        }

        try {
            // Tentativa de enviar um evento de teste
            (window as any).gtag('event', 'integration_check', {
                'event_category': 'admin_action',
                'event_label': 'manual_verification'
            });

            setGoogleStatus('success');
            setStatusMessage(`Integração Ativa! ID Detectado: ${gaId}. Script carregado e funcional.`);
        } catch (error) {
            setGoogleStatus('error');
            setStatusMessage('Erro ao comunicar com o Google Analytics: ' + (error as Error).message);
        }
    };


    const fetchData = async () => {
        setLoading(true);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - period);
        const startIso = startDate.toISOString();

        // 1. Fetch Page Views
        const { data: views, error } = await supabase
            .from('SITE_Analytics_PageViews')
            .select('*')
            .gte('created_at', startIso);

        if (views) {
            // KPI: Total Views
            const totalViews = views.length;

            // KPI: Unique Visitors
            const uniqueVisitors = new Set(views.map(v => v.visitor_id)).size;

            // Chart: Daily Visits
            const daysMap: Record<string, number> = {};
            // Init last 30 days
            for (let i = 0; i < period; i++) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                daysMap[d.toISOString().split('T')[0]] = 0;
            }

            let mobile = 0;
            let desktop = 0;
            const pagesMap: Record<string, number> = {};
            const referrersMap: Record<string, number> = {};

            views.forEach(v => {
                const date = v.created_at.split('T')[0];
                if (daysMap[date] !== undefined) daysMap[date]++;

                // Device
                if (v.device_type === 'mobile') mobile++;
                else desktop++;

                // Pages
                const p = v.path.split('?')[0]; // simple path
                pagesMap[p] = (pagesMap[p] || 0) + 1;

                // Referrer
                let ref = 'Direto';
                if (v.referrer && v.referrer !== 'direct') {
                    try {
                        const url = new URL(v.referrer);
                        ref = url.hostname.replace('www.', '');
                    } catch { ref = v.referrer; }
                }
                referrersMap[ref] = (referrersMap[ref] || 0) + 1;
            });

            // Sort Chart Data
            const sortedDates = Object.keys(daysMap).sort();
            setDailyVisits({
                categories: sortedDates.map(d => {
                    const [y, m, day] = d.split('-');
                    return `${day}/${m}`;
                }),
                data: sortedDates.map(d => daysMap[d])
            });

            // Sort Top Pages
            const sortedPages = Object.entries(pagesMap)
                .map(([path, count]) => ({ path, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 10);
            setTopPages(sortedPages);

            // Sort Top Sources
            const sortedSources = Object.entries(referrersMap)
                .map(([source, count]) => ({ source, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 10);
            setTopSources(sortedSources);

            setStats(prev => ({ ...prev, totalViews, uniqueVisitors }));
            setDeviceStats({ mobile, desktop });
        }

        // 2. Fetch Events
        const { data: events } = await supabase
            .from('SITE_Analytics_Events')
            .select('id')
            .gte('created_at', startIso);

        if (events) {
            setStats(prev => ({ ...prev, totalEvents: events.length }));
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
        colors: ['#D4AF37'],
        fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.7, opacityTo: 0.1, stops: [0, 90, 100] } },
        theme: { mode: 'dark' }
    };

    const donutOptions: ApexCharts.ApexOptions = {
        labels: ['Mobile', 'Desktop'],
        colors: ['#D4AF37', '#3B82F6'],
        legend: { position: 'bottom', labels: { colors: '#888' } },
        stroke: { show: false },
        dataLabels: { enabled: false },
        plotOptions: { pie: { donut: { size: '70%' } } }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Analytics Geral</h2>
                    <p className="text-sm text-gray-500">Monitoramento interno de acessos e eventos.</p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Google Verification Button */}
                    <div className="flex flex-col items-end">
                        <button
                            onClick={verifyGoogleIntegration}
                            disabled={googleStatus === 'checking'}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${googleStatus === 'success' ? 'bg-green-500/10 text-green-600 border border-green-200 dark:border-green-900/50' :
                                googleStatus === 'error' ? 'bg-red-500/10 text-red-600 border border-red-200 dark:border-red-900/50' :
                                    'bg-white dark:bg-[#1A1A1A] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800 hover:border-wtech-gold/50 shadow-sm'
                                }`}
                        >
                            {googleStatus === 'checking' ? <RefreshCw size={16} className="animate-spin" /> :
                                googleStatus === 'success' ? <CheckCircle size={16} /> :
                                    googleStatus === 'error' ? <AlertCircle size={16} /> :
                                        <img src="https://www.google.com/images/branding/googleg/1x/googleg_standard_color_128dp.png" className="w-4 h-4" alt="Google" />
                            }
                            {googleStatus === 'success' ? 'Google Integrado' :
                                googleStatus === 'error' ? 'Erro na Integração' :
                                    'Verificar Google API'}
                        </button>
                        {statusMessage && (
                            <span className={`text-[10px] mt-1 font-medium ${googleStatus === 'success' ? 'text-green-500' :
                                googleStatus === 'error' ? 'text-red-500' :
                                    'text-gray-400'
                                }`}>
                                {statusMessage}
                            </span>
                        )}
                    </div>

                    <div className="flex bg-gray-100 dark:bg-[#111] p-1 rounded-lg">

                        {[7, 30, 90].map(d => (
                            <button
                                key={d}
                                onClick={() => setPeriod(d)}
                                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${period === d ? 'bg-white dark:bg-[#222] shadow text-black dark:text-white' : 'text-gray-500'}`}
                            >
                                {d} dias
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-[#1A1A1A] p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-4">
                    <div className="p-3 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                        <Eye size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-bold uppercase">Visualizações</p>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white">{stats.totalViews}</h3>
                    </div>
                </div>
                <div className="bg-white dark:bg-[#1A1A1A] p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-4">
                    <div className="p-3 rounded-full bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-wtech-gold">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-bold uppercase">Visitantes Únicos</p>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white">{stats.uniqueVisitors}</h3>
                    </div>
                </div>
                <div className="bg-white dark:bg-[#1A1A1A] p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-4">
                    <div className="p-3 rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                        <MousePointer size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-bold uppercase">Eventos / Cliques</p>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white">{stats.totalEvents}</h3>
                    </div>
                </div>
            </div>

            {/* Main Chart */}
            <div className="bg-white dark:bg-[#1A1A1A] p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
                <h3 className="font-bold text-gray-800 dark:text-white mb-4">Tráfego no Período</h3>
                <div className="h-[300px]">
                    <ReactApexChart options={chartOptions} series={[{ name: 'Visitas', data: dailyVisits.data }]} type="area" height="100%" />
                </div>
            </div>

            {/* Lower Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Top Pages */}
                <div className="bg-white dark:bg-[#1A1A1A] p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
                    <h3 className="font-bold text-gray-800 dark:text-white mb-4">Páginas Mais Acessadas</h3>
                    <div className="space-y-3">
                        {topPages.map((p, idx) => (
                            <div key={idx} className="flex justify-between items-center text-sm border-b border-gray-50 dark:border-gray-800 pb-2">
                                <span className="text-gray-600 dark:text-gray-400 truncate w-3/4">{p.path}</span>
                                <span className="font-bold text-gray-900 dark:text-white">{p.count}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Sources */}
                <div className="bg-white dark:bg-[#1A1A1A] p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
                    <h3 className="font-bold text-gray-800 dark:text-white mb-4">Origem do Tráfego</h3>
                    <div className="space-y-3">
                        {topSources.map((s, idx) => (
                            <div key={idx} className="flex justify-between items-center text-sm border-b border-gray-50 dark:border-gray-800 pb-2">
                                <span className="text-gray-600 dark:text-gray-400 capitalize">{s.source || 'Direto / Desconhecido'}</span>
                                <span className="font-bold text-gray-900 dark:text-white">{s.count}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Devices */}
                <div className="bg-white dark:bg-[#1A1A1A] p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
                    <h3 className="font-bold text-gray-800 dark:text-white mb-4">Dispositivos</h3>
                    <div className="h-[200px] flex items-center justify-center">
                        <ReactApexChart
                            options={donutOptions}
                            series={[deviceStats.mobile, deviceStats.desktop]}
                            type="donut"
                            width="100%"
                        />
                    </div>
                    <div className="flex justify-center gap-6 mt-4">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Smartphone size={16} /> Mobile: <strong className="text-gray-900 dark:text-white">{deviceStats.mobile}</strong>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Monitor size={16} /> Desktop: <strong className="text-gray-900 dark:text-white">{deviceStats.desktop}</strong>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AnalyticsView;
