import React, { useState, useEffect } from 'react';
import { 
    TrendingUp, 
    MousePointer2, 
    Eye, 
    DollarSign,
    ArrowUpRight,
    ArrowDownRight,
    RefreshCcw
} from 'lucide-react';
import { 
    Area, 
    AreaChart, 
    CartesianGrid, 
    XAxis, 
    YAxis, 
    Tooltip, 
    ResponsiveContainer,
    BarChart,
    Bar
} from 'recharts';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000/api';

const StatCard = ({ title, value, unit, icon: Icon, trend, color }: any) => (
    <div className="bg-white dark:bg-[#1A1A1A] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col gap-4">
        <div className="flex justify-between items-start">
            <div className={`p-3 rounded-xl bg-${color}-50 dark:bg-${color}-900/20 text-${color}-600`}>
                <Icon size={24} />
            </div>
            {trend && (
                <div className={`flex items-center gap-1 text-xs font-bold ${trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {trend > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    {Math.abs(trend)}%
                </div>
            )}
        </div>
        <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{title}</p>
            <div className="flex items-baseline gap-1 mt-1">
                <h3 className="text-2xl font-black text-gray-900 dark:text-white">{value}</h3>
                {unit && <span className="text-sm font-bold text-gray-400">{unit}</span>}
            </div>
        </div>
    </div>
);

const MetaDashboard = ({ slug }: { slug: string | null }) => {
    const [overview, setOverview] = useState<any>(null);
    const [insights, setInsights] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (slug) fetchData();
    }, [slug]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [ovResp, inResp] = await Promise.all([
                fetch(`${API_BASE}/meta/overview`),
                fetch(`${API_BASE}/meta/insights?level=account&preset=last_30d`)
            ]);
            
            const ovData = await ovResp.json();
            const inData = await inResp.json();
            
            if (ovData && !ovData.error) {
                setOverview(ovData);
            }
            if (Array.isArray(inData)) {
                setInsights(inData);
            } else {
                setInsights([]);
                if (inData.error) console.error("API Error (Insights):", inData.error);
            }
        } catch (error) {
            console.error("Error loading Meta dashboard data:", error);
            setInsights([]);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-32 bg-gray-100 dark:bg-[#1A1A1A] rounded-2xl border border-gray-100 dark:border-gray-800"></div>
                ))}
            </div>
        );
    }

    const metrics = insights[0] || {};
    const spend = (parseFloat(metrics.spend || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const cpc = parseFloat(metrics.cpc || 0).toFixed(2);
    const ctr = parseFloat(metrics.ctr || 0).toFixed(2);
    const impressions = parseInt(metrics.impressions || 0).toLocaleString('pt-BR');
    const clicks = parseInt(metrics.clicks || 0).toLocaleString('pt-BR');

    return (
        <div className="p-6 md:p-8 space-y-8 animate-in fade-in duration-500">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title="Investimento (30D)" 
                    value={spend} 
                    icon={DollarSign} 
                    color="blue"
                    trend={12.5}
                />
                <StatCard 
                    title="Impressões" 
                    value={impressions} 
                    icon={Eye} 
                    color="purple"
                    trend={8.2}
                />
                <StatCard 
                    title="Cliques" 
                    value={clicks} 
                    icon={MousePointer2} 
                    color="orange"
                    trend={-2.4}
                />
                <StatCard 
                    title="CTR Médio" 
                    value={ctr} 
                    unit="%" 
                    icon={TrendingUp} 
                    color="green"
                    trend={4.1}
                />
            </div>

            {/* Performance Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white dark:bg-[#1A1A1A] p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h4 className="font-black text-xl text-gray-900 dark:text-white">Performance Temporal</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Gasto vs Cliques nos últimos 30 dias.</p>
                        </div>
                        <button onClick={fetchData} className="p-2 hover:bg-gray-100 dark:hover:bg-[#222] rounded-lg transition-colors">
                            <RefreshCcw size={18} className="text-gray-400" />
                        </button>
                    </div>
                    
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={insights}>
                                <defs>
                                    <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                <XAxis 
                                    dataKey="date_start" 
                                    hide 
                                />
                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9CA3AF'}} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', backgroundColor: '#1A1A1A', color: 'white' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="spend" 
                                    stroke="#3B82F6" 
                                    strokeWidth={3}
                                    fillOpacity={1} 
                                    fill="url(#colorSpend)" 
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-3xl text-white relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute top-0 right-0 p-8 opacity-10 scale-150 rotate-12">
                        <TrendingUp size={120} />
                    </div>
                    
                    <div>
                        <h4 className="text-sm font-bold uppercase tracking-widest opacity-70">Conta de Anúncios</h4>
                        <h3 className="text-2xl font-black mt-1">{overview?.name || 'Carregando...'}</h3>
                        <p className="text-xs opacity-60 mt-2">Moeda: {overview?.currency} | Status: {overview?.account_status === 1 ? 'ATIVO' : 'VERIFICAR'}</p>
                    </div>

                    <div className="mt-8 space-y-4">
                        <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md">
                            <p className="text-[10px] font-bold uppercase opacity-70">Saldo / Limite</p>
                            <p className="text-xl font-black">
                                {((overview?.spend_cap || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                        </div>
                        <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md">
                            <p className="text-[10px] font-bold uppercase opacity-70">Total Gasto na Vida</p>
                            <p className="text-lg font-black">
                                {((overview?.amount_spent || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                        </div>
                    </div>

                    <button className="mt-8 w-full py-3 bg-white text-blue-600 rounded-xl font-black text-sm hover:bg-blue-50 transition-colors">
                        CONFIGURAR CONTA
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MetaDashboard;
