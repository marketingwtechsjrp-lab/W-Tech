import React, { useState, useEffect } from 'react';
import { 
    Sparkles, TrendingUp, TrendingDown, Users, DollarSign, 
    BarChart3, PieChart, Activity, ShieldCheck, Download,
    RefreshCw, Filter, BrainCircuit, Target, Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../../lib/supabaseClient';
import { IntelligenceAIService } from './IntelligenceAI';
import { useSettings } from '../../../context/SettingsContext';
import ReactApexChart from 'react-apexcharts';

type Category = 'Global' | 'Atendimento' | 'Vendas' | 'Equipe';
type DateRange = '7d' | '30d' | 'this_month' | 'all';

const IntelligenceView = ({ permissions }: { permissions?: any }) => {
    const { get } = useSettings();
    const [activeCategory, setActiveCategory] = useState<Category>('Global');
    const [dateRange, setDateRange] = useState<DateRange>('30d');
    const [aiSummary, setAiSummary] = useState<string>('');
    const [teamAnalysis, setTeamAnalysis] = useState<string>('');
    const [loadingAI, setLoadingAI] = useState(false);
    const [loadingTeamAI, setLoadingTeamAI] = useState(false);
    const [fetchingData, setFetchingData] = useState(true);

    // Business Data States
    const [stats, setStats] = useState({
        totalLeads: 0,
        conversionRate: 0,
        totalRevenue: 0,
        pendingTasks: 0,
        activeStudents: 0
    });



    const [attendants, setAttendants] = useState<any[]>([]);
    const [attendantAnalysis, setAttendantAnalysis] = useState<Record<string, string>>({});
    const [loadingAnalysis, setLoadingAnalysis] = useState<Record<string, boolean>>({});

    useEffect(() => {
        loadData();
    }, [dateRange]);

    const getFilterDate = (range: DateRange) => {
        const now = new Date();
        if (range === '7d') return new Date(now.setDate(now.getDate() - 7)).toISOString();
        if (range === '30d') return new Date(now.setDate(now.getDate() - 30)).toISOString();
        if (range === 'this_month') return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        return null;
    };

    const loadData = async () => {
        setFetchingData(true);
        try {
            const filterDate = getFilterDate(dateRange);
            
            let leadsQuery = supabase.from('SITE_Leads').select('status, conversion_value, created_at, assigned_to', { count: 'exact' });
            let enrollmentsQuery = supabase.from('SITE_Enrollments').select('amount_paid, status, created_at');
            let tasksQuery = supabase.from('SITE_Tasks').select('*', { count: 'exact', head: true }).neq('status', 'DONE');

            if (filterDate) {
                leadsQuery = leadsQuery.gte('created_at', filterDate);
                enrollmentsQuery = enrollmentsQuery.gte('created_at', filterDate);
                tasksQuery = tasksQuery.gte('created_at', filterDate);
            }

            const { data: leadsData, count: leadsCount } = await leadsQuery;
            const { data: enrollments } = await enrollmentsQuery;
            const { count: tasksCount } = await tasksQuery;
            
            // Attendants: "Quero todos"
            const { data: team } = await supabase.from('SITE_Users').select('id, name, role').order('name');
            setAttendants(team || []);

            // Revenue from Leads (as requested)
            const wonStatuses = ['Converted', 'Matriculated', 'CheckedIn', 'Fechamento', 'Ganho', 'Closed'];
            const revenue = leadsData?.filter(l => wonStatuses.includes(l.status as string))
                                     .reduce((acc, curr: any) => acc + (Number(curr.conversion_value) || 0), 0) || 0;

            const confirmed = enrollments?.filter(e => e.status === 'Confirmed').length || 0;
            const convRate = leadsCount ? ((leadsData?.filter(l => wonStatuses.includes(l.status as string)).length || 0) / leadsCount) * 100 : 0;

            setStats({
                totalLeads: leadsCount || 0,
                conversionRate: convRate,
                totalRevenue: revenue,
                pendingTasks: tasksCount || 0,
                activeStudents: confirmed
            });

        } catch (error) {
            console.error("Error loading intelligence data:", error);
        } finally {
            setFetchingData(false);
        }
    };

    const handleGenerateAISummary = async () => {
        setLoadingAI(true);
        const service = new IntelligenceAIService();
        
        // Prepare context data for AI
        const contextData = {
            stats,
            lastTransactions: [] // Would fetch more for better analysis
        };

        const summary = await service.generateExecutiveSummary(contextData);
        setAiSummary(summary);
        setLoadingAI(false);
    };

    const handleAnalyzeAttendant = async (attendant: any) => {
        
        setLoadingAnalysis(prev => ({ ...prev, [attendant.id]: true }));
        const service = new IntelligenceAIService();

        try {
            // Fetch this specific attendant's leads and tasks
            const { data: leads } = await supabase.from('SITE_Leads').select('status, context_id').eq('assigned_to', attendant.id);
            const { data: tasks } = await supabase.from('SITE_Tasks').select('title, status, priority').eq('assigned_to', attendant.id).limit(10);

            const analysis = await service.analyzeAttendantPerformance(attendant.name, leads || [], tasks || []);
            setAttendantAnalysis(prev => ({ ...prev, [attendant.id]: analysis }));
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingAnalysis(prev => ({ ...prev, [attendant.id]: false }));
        }
    };

    const handleGenerateTeamAnalysis = async () => {
        setLoadingTeamAI(true);
        const service = new IntelligenceAIService();

        try {
            // Consolidate team data for analysis
            const teamData = await Promise.all(attendants.map(async (att) => {
                const { count: leads } = await supabase.from('SITE_Leads').select('*', { count: 'exact', head: true }).eq('assigned_to', att.id);
                const { count: closed } = await supabase.from('SITE_Leads').select('*', { count: 'exact', head: true }).eq('assigned_to', att.id).eq('status', 'Closed');
                const { count: tasks } = await supabase.from('SITE_Tasks').select('*', { count: 'exact', head: true }).eq('assigned_to', att.id).neq('status', 'DONE');
                
                return {
                    name: att.name,
                    role: att.role,
                    totalLeads: leads || 0,
                    conversionCount: closed || 0,
                    pendingTasks: tasks || 0
                };
            }));

            const analysis = await service.analyzeTeamPerformance(teamData);
            setTeamAnalysis(analysis);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingTeamAI(false);
        }
    };

    return (
        <div className="text-gray-900 dark:text-gray-100 animate-in fade-in duration-500 pb-20">
            {/* Header / Premium Glass Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="p-2 bg-gradient-to-br from-wtech-gold to-yellow-600 rounded-lg text-black shadow-lg shadow-yellow-500/20">
                            <Sparkles size={20} />
                        </div>
                        <h2 className="text-3xl font-black tracking-tighter dark:text-white uppercase">W-Intelligence</h2>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Análise de negócios e resumos estratégicos alimentados por IA.</p>
                </div>

                <div className="flex gap-2">
                    {/* Date Filters UI */}
                    <div className="flex bg-white dark:bg-[#111] p-1 rounded-xl border border-gray-200 dark:border-gray-800 mr-4">
                        {(['7d', '30d', 'this_month', 'all'] as DateRange[]).map(range => (
                            <button
                                key={range}
                                onClick={() => setDateRange(range)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${dateRange === range ? 'bg-black text-white dark:bg-white dark:text-black shadow-md' : 'text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                            >
                                {range === '7d' ? '7 Dias' : range === '30d' ? '30 Dias' : range === 'this_month' ? 'Este Mês' : 'Geral'}
                            </button>
                        ))}
                    </div>

                    <button 
                        onClick={() => loadData()}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg border border-gray-200 dark:border-gray-800 transition-colors"
                        title="Recarregar Dados"
                    >
                        <RefreshCw size={18} className={fetchingData ? 'animate-spin' : ''} />
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-lg text-sm font-bold hover:bg-gray-50 dark:hover:bg-white/10 transition-colors">
                        <Download size={16} /> Exportar Report
                    </button>
                </div>
            </div>

            {/* AI Summary Section - Premium Card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="lg:col-span-2 relative">
                    <div className="h-full bg-black text-white p-8 rounded-3xl overflow-hidden shadow-2xl relative border border-white/10">
                        {/* Background Decoration */}
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-wtech-gold/20 blur-[100px] rounded-full pointer-events-none"></div>
                        
                        <div className="flex items-center justify-between mb-6 relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
                                    <BrainCircuit size={24} className="text-wtech-gold" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg leading-tight uppercase tracking-widest">Resumo Executivo</h3>
                                    <p className="text-[10px] text-gray-500 font-bold">ANALISADO POR W-IA</p>
                                </div>
                            </div>
                            
                            <button 
                                onClick={handleGenerateAISummary}
                                disabled={loadingAI}
                                className="px-5 py-2 bg-gradient-to-r from-wtech-gold to-yellow-600 text-black text-xs font-black rounded-full hover:scale-105 transition-transform flex items-center gap-2 shadow-xl shadow-yellow-500/20 disabled:opacity-50 disabled:scale-100"
                            >
                                {loadingAI ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                {aiSummary ? 'ATUALIZAR ANÁLISE' : 'GERAR ANÁLISE IA'}
                            </button>
                        </div>

                        <div className="relative z-10 prose prose-invert prose-sm max-w-none">
                            {aiSummary ? (
                                <div className="text-gray-300 leading-relaxed whitespace-pre-line animate-in fade-in slide-in-from-bottom-2 duration-700">
                                    {aiSummary}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                                        <Activity size={32} className="text-gray-600 animate-pulse" />
                                    </div>
                                    <p className="text-gray-500 font-medium italic">Seus dados estão prontos. Clique no botão acima para que nossa IA gere uma visão estratégica do seu negócio.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* KPIs Column */}
                <div className="space-y-4">
                    <KPIComponent label="Receita Total" value={`R$ ${stats.totalRevenue.toLocaleString()}`} icon={DollarSign} color="text-green-500" trend={12} />
                    <KPIComponent label="Taxa de Conversão" value={`${stats.conversionRate.toFixed(1)}%`} icon={Target} color="text-wtech-gold" trend={5} />
                    <KPIComponent label="Alunos Ativos" value={stats.activeStudents.toString()} icon={Users} color="text-blue-500" trend={-2} />
                    <KPIComponent label="Tarefas Críticas" value={stats.pendingTasks.toString()} icon={Activity} color="text-red-500" trend={stats.pendingTasks > 10 ? 15 : 0} />
                </div>
            </div>

            {/* Tabs for Detailed Analysis */}
            <div className="flex gap-2 mb-6 bg-white dark:bg-[#111] p-1.5 rounded-2xl border border-gray-100 dark:border-gray-800 w-fit">
                {(['Global', 'Atendimento', 'Vendas', 'Equipe'] as Category[]).map(cat => (
                    <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`px-6 py-2 rounded-xl text-xs font-black uppercase transition-all ${activeCategory === cat ? 'bg-black text-white dark:bg-white dark:text-black shadow-lg' : 'text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Main Visual Reports Area */}
            <AnimatePresence mode="wait">
                {activeCategory === 'Global' && (
                    <motion.div 
                        key="global"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-6"
                    >
                        <div className="bg-white dark:bg-[#111] p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
                            <div className="flex justify-between items-center mb-6">
                                <h4 className="font-bold flex items-center gap-2"><BarChart3 size={18} className="text-wtech-gold" /> Funil de Vendas</h4>
                                <span className="text-[10px] font-bold text-gray-400 uppercase">Últimos 30 dias</span>
                            </div>
                            <ChartPlaceholder height={300} type="bar" />
                        </div>

                        <div className="bg-white dark:bg-[#111] p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
                            <div className="flex justify-between items-center mb-6">
                                <h4 className="font-bold flex items-center gap-2"><PieChart size={18} className="text-wtech-gold" /> Distribuição de Origem</h4>
                                <span className="text-[10px] font-bold text-gray-400 uppercase">Total Geral</span>
                            </div>
                            <ChartPlaceholder height={300} type="donut" />
                        </div>
                    </motion.div>
                )}

                {activeCategory === 'Atendimento' && (
                    <motion.div 
                        key="atendimento"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-6"
                    >
                        <div className="bg-white dark:bg-[#111] p-8 rounded-3xl border border-gray-100 dark:border-gray-800">
                           <h4 className="font-bold text-lg mb-6 flex items-center gap-2"><Users size={20} className="text-wtech-gold" /> Análise de Atendentes</h4>
                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                               {attendants.map((att) => (
                                   <div key={att.id} className="p-6 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex flex-col">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-wtech-gold to-yellow-600 flex items-center justify-center text-black font-bold">
                                                {att.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h5 className="font-bold text-sm">{att.name}</h5>
                                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">Consultor de Vendas</p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex-1">
                                            {attendantAnalysis[att.id] ? (
                                                <div className="text-[11px] text-gray-600 dark:text-gray-400 mb-4 bg-white dark:bg-black/20 p-4 rounded-xl border border-gray-100 dark:border-white/5 animate-in fade-in slide-in-from-top-2">
                                                    {attendantAnalysis[att.id]}
                                                </div>
                                            ) : (
                                                <div className="h-24 flex items-center justify-center text-[10px] text-gray-400 italic text-center px-4">
                                                    Nenhuma análise gerada para este atendente.
                                                </div>
                                            )}
                                        </div>

                                        <button 
                                            onClick={() => handleAnalyzeAttendant(att)}
                                            disabled={loadingAnalysis[att.id]}
                                            className="w-full py-3 bg-black text-white dark:bg-white dark:text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-80 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                                        >
                                            {loadingAnalysis[att.id] ? <RefreshCw size={12} className="animate-spin" /> : <BrainCircuit size={12} />}
                                            {attendantAnalysis[att.id] ? 'Refazer Análise IA' : 'Analisar Performance'}
                                        </button>
                                   </div>
                               ))}
                           </div>
                        </div>
                    </motion.div>
                )}

                {activeCategory === 'Vendas' && (
                    <motion.div 
                        key="vendas"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
                    >
                        <div className="bg-white dark:bg-[#111] p-8 rounded-3xl border border-gray-100 dark:border-gray-800">
                           <h4 className="font-bold text-lg mb-6 flex items-center gap-2"><DollarSign size={20} className="text-wtech-gold" /> Performance de Vendas</h4>
                           <div className="space-y-6">
                               <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-white/5 rounded-2xl">
                                   <div>
                                       <p className="text-[10px] text-gray-500 font-bold uppercase">Receita Bruta</p>
                                       <p className="text-2xl font-black text-green-500">R$ {stats.totalRevenue.toLocaleString()}</p>
                                   </div>
                                   <ChartPlaceholder height={100} type="bar" />
                               </div>
                               <div className="grid grid-cols-2 gap-4">
                                   <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl">
                                       <p className="text-[10px] text-gray-500 font-bold uppercase">Ticket Médio</p>
                                       <p className="text-lg font-bold">R$ {(stats.totalRevenue / (stats.activeStudents || 1)).toLocaleString()}</p>
                                   </div>
                                   <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl">
                                       <p className="text-[10px] text-gray-500 font-bold uppercase">Alunos Confirmados</p>
                                       <p className="text-lg font-bold">{stats.activeStudents}</p>
                                   </div>
                               </div>
                           </div>
                        </div>

                        <div className="bg-white dark:bg-[#111] p-8 rounded-3xl border border-gray-100 dark:border-gray-800">
                           <h4 className="font-bold text-lg mb-6 flex items-center gap-2"><TrendingUp size={20} className="text-wtech-gold" /> Projeção de Crescimento</h4>
                           <p className="text-sm text-gray-500 mb-6">Baseado na taxa de conversão atual de {stats.conversionRate.toFixed(1)}%, projetamos o seguinte cenário:</p>
                           <ChartPlaceholder height={250} type="bar" />
                        </div>
                    </motion.div>
                )}

                {activeCategory === 'Equipe' && (
                    <motion.div 
                        key="equipe"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-6"
                    >
                        {/* Team AI Analysis Card */}
                        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
                            <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/20 blur-[100px] rounded-full pointer-events-none"></div>
                            
                            <div className="flex items-center justify-between mb-6 relative z-10">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                                        <Users size={24} className="text-indigo-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg uppercase tracking-widest leading-tight">Análise Estratégica da Equipe</h3>
                                        <p className="text-[10px] text-gray-400 font-bold">VISÃO DE LIDERANÇA W-IA</p>
                                    </div>
                                </div>
                                
                                <button 
                                    onClick={handleGenerateTeamAnalysis}
                                    disabled={loadingTeamAI}
                                    className="px-6 py-3 bg-white text-indigo-900 text-xs font-black rounded-full hover:scale-105 transition-transform flex items-center gap-2 shadow-xl disabled:opacity-50"
                                >
                                    {loadingTeamAI ? <RefreshCw size={14} className="animate-spin" /> : <BrainCircuit size={14} />}
                                    {teamAnalysis ? 'ATUALIZAR DIAGNÓSTICO' : 'GERAR DIAGNÓSTICO DE EQUIPE'}
                                </button>
                            </div>

                            <div className="prose prose-invert prose-sm max-w-none relative z-10">
                                {teamAnalysis ? (
                                    <div className="text-gray-200 leading-relaxed whitespace-pre-line animate-in fade-in slide-in-from-bottom-2 duration-700">
                                        {teamAnalysis}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-8 text-center bg-black/20 rounded-2xl border border-white/5">
                                        <Activity size={32} className="text-indigo-500/50 mb-4 animate-pulse" />
                                        <p className="text-gray-400 font-medium max-w-md">Solicite uma análise para entender o clima, gargalos e oportunidades de treinamento para sua equipe de atendimento.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                         <div className="bg-white dark:bg-[#111] p-8 rounded-3xl border border-gray-100 dark:border-gray-800">
                           <h4 className="font-bold text-lg mb-6 flex items-center gap-2"><Activity size={20} className="text-wtech-gold" /> Monitoramento de Atividade</h4>
                           <div className="space-y-4">
                               {/* Activity content remains the same... */}
                               {[1,2,3,4].map(i => (
                                   <div key={i} className="flex gap-4 p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors rounded-2xl items-center">
                                       <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-xs font-bold">{i}</div>
                                       <div className="flex-1">
                                           <p className="text-sm font-bold">Ação do Sistema #{i}</p>
                                           <p className="text-[10px] text-gray-500">Módulo Administrativo • Habilitado via W-Intelligence</p>
                                       </div>
                                       <span className="text-[10px] text-gray-400 font-mono">Há {i * 15} min</span>
                                   </div>
                               ))}
                           </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Sub-components for better organization

const KPIComponent = ({ label, value, icon: Icon, color, trend }: any) => (
    <div className="bg-white dark:bg-[#111] p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:border-wtech-gold/50 transition-colors group">
        <div className="flex justify-between items-start mb-2">
            <div className={`p-2 rounded-lg bg-gray-50 dark:bg-gray-900 group-hover:bg-wtech-gold/10 transition-colors`}>
                <Icon size={18} className={color} />
            </div>
            {trend !== 0 && (
                <div className={`flex items-center gap-0.5 text-[10px] font-bold ${trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {trend > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {Math.abs(trend)}%
                </div>
            )}
        </div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
        <h4 className="text-xl font-black">{value}</h4>
    </div>
);

const ChartPlaceholder = ({ height, type }: { height: number, type: 'bar' | 'donut' }) => {
    // Standard configuration for a professional look
    const options: any = {
        chart: {
            toolbar: { show: false },
            fontFamily: 'Inter, sans-serif',
            background: 'transparent'
        },
        theme: { mode: 'dark' },
        colors: ['#D4AF37', '#888', '#444', '#222'],
        stroke: { show: false },
        dataLabels: { enabled: false },
        plotOptions: {
            bar: { borderRadius: 8, columnWidth: '60%' },
            pie: { donut: { size: '75%' } }
        },
        legend: { position: 'bottom', labels: { colors: '#888' } }
    };

    const series = type === 'bar' 
        ? [{ name: 'Leads', data: [44, 55, 41, 67, 22, 43, 21] }]
        : [44, 55, 13, 33];

    return (
        <div style={{ height }}>
            <ReactApexChart options={options} series={series} type={type} height={height} />
        </div>
    );
};

export default IntelligenceView;
