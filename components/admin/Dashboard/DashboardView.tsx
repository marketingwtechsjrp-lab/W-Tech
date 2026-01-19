import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Users, ShoppingBag, CheckCircle, BarChart3, Award, ArrowUpRight, ArrowRight, Target, Megaphone, MessageCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import Chart from 'react-apexcharts';
import CountUp from 'react-countup';
import { useAuth } from '../../../context/AuthContext';

const DashboardView = () => {
    const { user } = useAuth(); // Import user context
    const [loading, setLoading] = useState(true);
    const [filterPeriod, setFilterPeriod] = useState('YYYY');

    // KPIs
    const [kpis, setKpis] = useState({
        revenue: 0,
        expenses: 0,
        netResult: 0,
        totalLeads: 0,
        conversionRate: 0,
        totalStudents: 0,
        activeCourses: 0,
        totalAttendances: 0,
        completedTasks: 0,
        whatsappShots: 0
    });

    // Lists for Rankings & Summaries
    const [attendantsRank, setAttendantsRank] = useState<any[]>([]);
    const [coursesRank, setCoursesRank] = useState<any[]>([]);
    const [recentCampaigns, setRecentCampaigns] = useState<any[]>([]);

    // Charts Data
    const [financialChartSeries, setFinancialChartSeries] = useState<any[]>([]);
    const [financialChartOptions, setFinancialChartOptions] = useState<any>({});

    const [funnelSeries, setFunnelSeries] = useState<any[]>([]);
    const [funnelOptions, setFunnelOptions] = useState<any>({});

    useEffect(() => {
        if (user) {
            fetchDashboardData();
        }
    }, [filterPeriod, user]);

    const fetchDashboardData = async () => {
        setLoading(true);
        // Date Logic
        const now = new Date();
        let startDate = new Date(now.getFullYear(), 0, 1).toISOString(); // Default Year

        if (filterPeriod === '30d') {
            const d = new Date();
            d.setDate(d.getDate() - 30);
            startDate = d.toISOString();
        } else if (filterPeriod === '90d') {
            const d = new Date();
            d.setDate(d.getDate() - 90);
            startDate = d.toISOString();
        }

        try {
            // Determine Role (Robust Check)
            let isAdmin = false;

            if (user?.role) {
                if (typeof user.role === 'string') {
                    isAdmin = ['ADMIN', 'Admin', 'Super Admin'].includes(user.role);
                } else if (typeof user.role === 'object') {
                    // Check name or level (assuming Level 10+ is Admin)
                    isAdmin =
                        ['ADMIN', 'Admin', 'Super Admin'].includes(user.role.name) ||
                        (user.role.level && user.role.level >= 10);
                }
            }

            console.log("Dashboard Role Check:", { role: user?.role, isAdmin }); // Debug log

            const userId = user?.id;

            // 1. Fetch Global Data (Rankings needs everyone)
            // Ideally we fetch "Leads" globally for ranking, BUT display "My Results" differently.
            // Let's fetch ALL leads for calculation, then filter in memory for "My Stats".

            // Optimization: If dataset grows huge, we should split queries. 
            // For now, fetching all is fine for ranking purposes.

            const [
                { data: leadsDTO },
                { data: usersDTO },
                { data: enrollments },
                { data: courses },
                { data: tasksDTO },
                { data: expensesDTO },
                { data: campaigns }
            ] = await Promise.all([
                supabase.from('SITE_Leads').select('id, status, assigned_to, created_at, conversion_value').gte('created_at', startDate),
                supabase.from('SITE_Users').select('id, name'),
                supabase.from('SITE_Enrollments').select('amount_paid, created_at, course_id, status').gte('created_at', startDate),
                supabase.from('SITE_Courses').select('id, title, status'),
                supabase.from('SITE_Tasks').select('id, status, closed_at, assigned_to').gte('created_at', startDate),
                supabase.from('SITE_Transactions').select('amount, date, type').eq('type', 'Expense').gte('date', startDate),
                supabase.from('SITE_MarketingCampaigns').select('id, name, channel, status, stats_sent, created_at').order('created_at', { ascending: false }).limit(5)
            ]);

            const allLeads = leadsDTO || [];
            const userMap = new Map(usersDTO?.map(u => [u.id, u.name]) || []);
            const courseMap = new Map(courses?.map(c => [c.id, c.title]) || []);
            const allTasks = tasksDTO || [];

            // --- FILTERING FOR VIEW ---
            // If Admin: View All. If User: View Only Assigned.
            // Exception: Ranking (Always Global). Campaigns (Usually Global or Permission based? Let's keep Global for now as "Company Campaings").
            // Expenses: Usually only Admins see expenses. Let's hide expenses for non-admins? Or show 0? 
            // User requested: "cada usuario veja seu resultado" (their result).

            const myLeads = isAdmin ? allLeads : allLeads.filter(l => l.assigned_to === userId);
            const myTasks = isAdmin ? allTasks : allTasks.filter(t => t.assigned_to === userId);

            // Revenue for User: Based on THEIR closed leads/enrollments.
            // Enrollments don't always have 'assigned_to'. We link via Lead? 
            // For simplicty, let's use CRM Value for users, or assume Enrollments are global revenue (Company Revenue).
            // "cada usuario veja SEU resultado". So Revenue should be "Minhas Vendas".
            // Expenses: Users usually don't have "My Expenses" in this context unless tracked. Let's show 0 for users or hide.

            // Filter Enrollments? We don't have 'sold_by' on enrollments clearly here, often assumed from Lead owner.
            // Let's rely on CRM Sales Value for the User's "Revenue" KPI.

            // --- CALCULATIONS (PERSONAL VIEW) ---
            const totalLeads = myLeads.length;
            const convertedLeads = myLeads.filter(l => ['Converted', 'Matriculated', 'Fechamento', 'Ganho', 'Won'].includes(l.status)).length;
            const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100) : 0;

            const crmSalesValue = myLeads
                .filter(l => ['Converted', 'Matriculated', 'Fechamento', 'Ganho', 'Won'].includes(l.status))
                .reduce((acc, curr) => acc + (Number(curr.conversion_value) || 0), 0);

            // Special Case: Enrollment Revenue often tracks real payments. 
            // If Admin, use Total Enrollment Revenue. If User, maybe use CRM Value as proxy for "My Contribution"?
            // Or if we can link enrollments. The current code matches CRM value.
            const totalRevenue = crmSalesValue;

            // Expenses: Only Admin sees company expenses
            const totalExpenses = isAdmin ? (expensesDTO?.reduce((acc, curr) => acc + Number(curr.amount || 0), 0) || 0) : 0;

            const totalStudents = enrollments?.filter(e => e.status !== 'Cancelled').length || 0; // Global Stat? Or "My Students"? Usually Global is fine for "Active Students in School".
            const activeCoursesCount = courses?.filter(c => c.status === 'Published').length || 0;

            const totalAttendances = myTasks.length;
            const completedTasks = myTasks.filter(t => t.status === 'DONE').length;

            // WhatsApp: Global stat usually? Or messages sent by me? 
            // Campaings are usually central. Let's show Global for everyone for now (System Health).
            const whatsappShots = campaigns?.filter(c => c.channel === 'WhatsApp').reduce((acc, curr) => acc + (curr.stats_sent || 0), 0) || 0;

            setKpis({
                revenue: totalRevenue,
                expenses: totalExpenses,
                netResult: totalRevenue - totalExpenses,
                totalLeads,
                conversionRate,
                totalStudents, // Keep Global
                activeCourses: activeCoursesCount, // Keep Global
                totalAttendances,
                completedTasks,
                whatsappShots // Keep Global
            });
            setRecentCampaigns(campaigns || []);

            // B. ApexCharts: Financial Evolution (PERSONAL)
            const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
            const historyMap: Record<number, { revenue: number, expenses: number }> = {};
            for (let i = 0; i < 12; i++) historyMap[i] = { revenue: 0, expenses: 0 };

            // For Chart, stick to CRM Value for consistency with "My Results"
            myLeads.forEach((l: any) => {
                if (['Converted', 'Matriculated', 'Fechamento', 'Ganho', 'Won'].includes(l.status)) {
                    if (!l.created_at) return;
                    const month = new Date(l.created_at).getMonth();
                    historyMap[month].revenue += (Number(l.conversion_value) || 0);
                }
            });

            if (isAdmin) {
                expensesDTO?.forEach((ex: any) => {
                    if (!ex.date) return;
                    const month = new Date(ex.date).getMonth();
                    historyMap[month].expenses += Number(ex.amount || 0);
                });
            }

            // Prepare Series
            const currentMonthIndex = new Date().getMonth();
            const sliceLimit = filterPeriod === 'YYYY' ? currentMonthIndex + 2 : 12;

            const revenueData = months.map((_, i) => historyMap[i].revenue).slice(0, sliceLimit);
            const expensesData = months.map((_, i) => historyMap[i].expenses).slice(0, sliceLimit);
            const categories = months.slice(0, sliceLimit);

            setFinancialChartSeries([
                { name: isAdmin ? 'Receita Total' : 'Minhas Vendas', data: revenueData },
                { name: 'Despesas', data: expensesData }
            ]);

            setFinancialChartOptions({
                chart: {
                    type: 'area',
                    height: 350,
                    toolbar: { show: false },
                    animations: {
                        enabled: true,
                        easing: 'easeinout',
                        speed: 800,
                        animateGradually: { enabled: true, delay: 150 },
                        dynamicAnimation: { enabled: true, speed: 350 }
                    }
                },
                colors: ['#22c55e', '#ef4444'],
                fill: {
                    type: 'gradient',
                    gradient: {
                        shadeIntensity: 1,
                        opacityFrom: 0.7,
                        opacityTo: 0.2,
                        stops: [0, 90, 100]
                    }
                },
                dataLabels: { enabled: false },
                stroke: { curve: 'smooth', width: 2 },
                xaxis: {
                    categories: categories,
                    axisBorder: { show: false },
                    axisTicks: { show: false },
                    labels: { style: { colors: '#9ca3af', fontSize: '12px', fontFamily: 'Inter' } }
                },
                yaxis: {
                    labels: {
                        style: { colors: '#9ca3af', fontSize: '12px', fontFamily: 'Inter' },
                        formatter: (val: number) => `R$ ${val >= 1000 ? (val / 1000).toFixed(1) + 'k' : val.toFixed(0)}`
                    }
                },
                grid: {
                    borderColor: '#f3f4f6',
                    strokeDashArray: 4,
                    yaxis: { lines: { show: true } }
                },
                tooltip: {
                    theme: 'dark',
                    y: { formatter: (val: number) => `R$ ${val.toLocaleString('pt-BR')}` }
                }
            });

            // C. ApexCharts: Sales Funnel (PERSONAL)
            const leadsInteracted = myLeads.filter(l => l.status !== 'New').length;
            const leadsNegotiating = myLeads.filter(l => ['Negotiating', 'Qualified', 'Proposta', 'Agendado'].includes(l.status)).length;

            setFunnelSeries([{
                name: "Leads",
                data: [totalLeads, leadsInteracted, leadsNegotiating + convertedLeads, convertedLeads]
            }]);

            setFunnelOptions({
                chart: {
                    type: 'bar',
                    height: 350,
                    dropShadow: {
                        enabled: true,
                    },
                    toolbar: { show: false }
                },
                plotOptions: {
                    bar: {
                        borderRadius: 0,
                        horizontal: true,
                        barHeight: '80%',
                        isFunnel: true,
                    },
                },
                dataLabels: {
                    enabled: true,
                    formatter: function (val: any, opt: any) {
                        return opt.w.globals.labels[opt.dataPointIndex] + ':  ' + val
                    },
                    dropShadow: {
                        enabled: true,
                    },
                    style: {
                        colors: ['#fff']
                    }
                },
                title: {
                    text: isAdmin ? 'Funil de Conversão (Geral)' : 'Meu Funil de Conversão',
                    align: 'middle',
                    style: { color: '#888' }
                },
                xaxis: {
                    categories: [
                        'Total Leads',
                        'Interação',
                        'Negociação',
                        'Vendas'
                    ],
                    labels: { style: { colors: '#9ca3af' } }
                },
                legend: {
                    show: false,
                },
                colors: ['#3b82f6', '#818cf8', '#facc15', '#22c55e'],
                tooltip: { theme: 'dark' }
            });


            // D. Rankings (ALWAYS GLOBAL)
            const attendantStats: Record<string, { name: string, total: number, converted: number }> = {};

            // Use allLeads for ranking
            allLeads.forEach(l => {
                const ownerId = l.assigned_to || 'unassigned';
                const name = ownerId === 'unassigned' ? 'Sem Dono' : (userMap.get(ownerId) || 'Desconhecido');
                if (!attendantStats[ownerId]) attendantStats[ownerId] = { name, total: 0, converted: 0 };
                attendantStats[ownerId].total++;
                if (['Converted', 'Matriculated', 'Fechamento', 'Ganho', 'Won'].includes(l.status)) attendantStats[ownerId].converted++;
            });
            setAttendantsRank(Object.values(attendantStats)
                .map(stat => ({ ...stat, rate: stat.total > 0 ? (stat.converted / stat.total) * 100 : 0 }))
                .sort((a, b) => b.rate - a.rate || b.converted - a.converted)
            );

            // Course Ranking (Always Global)
            const courseStats: Record<string, { title: string, students: number, revenue: number }> = {};
            enrollments?.forEach((e: any) => {
                const cId = e.course_id || 'unknown';
                const title = courseMap.get(cId) || 'Curso Desconhecido';
                if (!courseStats[cId]) courseStats[cId] = { title, students: 0, revenue: 0 };
                courseStats[cId].students++;
                courseStats[cId].revenue += (e.amount_paid || 0);
            });
            setCoursesRank(Object.values(courseStats).sort((a, b) => b.revenue - a.revenue));

        } catch (error) {
            console.error("Error fetching dashboard:", error);
        } finally {
            setLoading(false);
        }
    };

    const KpiCard = ({ label, value, sub, icon: Icon, color, trend, isCurrency = false, isPercent = false }: any) => (
        <div className="bg-white dark:bg-[#1A1A1A] p-6 rounded-2xl border border-gray-100 dark:border-transparent shadow-sm relative overflow-hidden group hover:shadow-lg transition-all hover:-translate-y-1">
            <div className={`absolute top-0 right-0 p-12 bg-${color.replace('text-', '')}/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-${color.replace('text-', '')}/20 transition-colors`}></div>
            <div className="flex justify-between items-start mb-2">
                <div className={`p-3 rounded-xl bg-${color.replace('text-', '')}/10 ${color}`}>
                    <Icon size={22} />
                </div>
                {trend && (
                    <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                        <ArrowUpRight size={10} /> {trend}
                    </span>
                )}
            </div>
            <div>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight mt-2">
                    <CountUp
                        end={value}
                        duration={2.5}
                        separator="."
                        prefix={isCurrency ? 'R$ ' : ''}
                        suffix={isPercent ? '%' : ''}
                        decimals={isPercent ? 1 : 0}
                    />
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wide mt-1">{label}</p>
                {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
            </div>
        </div>
    );

    return (
        <div className="space-y-8 animate-fade-in pb-12">

            {/* Header & Filter */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-[#1A1A1A] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-transparent transition-colors">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                        <BarChart3 className="text-wtech-gold" /> Visão Geral ({
                            (typeof user?.role === 'string' && ['ADMIN', 'Admin', 'Super Admin'].includes(user.role)) ||
                                (typeof user?.role === 'object' && (['ADMIN', 'Admin', 'Super Admin'].includes(user?.role?.name) || (user?.role?.level && user.role.level >= 10)))
                                ? 'Geral (Admin)' : 'Individual'
                        })
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Acompanhe métricas, funil de vendas e saúde financeira.</p>
                </div>
                <div className="flex gap-2">
                    <select
                        value={filterPeriod}
                        onChange={e => setFilterPeriod(e.target.value)}
                        className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-wtech-gold focus:border-wtech-gold block p-2.5 font-bold"
                    >
                        <option value="YYYY">Ano Atual</option>
                        <option value="90d">Últimos 3 Meses</option>
                        <option value="30d">Últimos 30 Dias</option>
                    </select>
                </div>
            </div>

            {/* KPI ROW: Animated Numbers */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <KpiCard
                    label="Receita (Total)"
                    value={kpis.revenue}
                    sub={`Despesas: R$ ${kpis.expenses.toLocaleString('pt-BR')}`}
                    icon={DollarSign}
                    color="text-green-600"
                    trend={kpis.revenue > 0 ? '+OK' : null}
                    isCurrency={true}
                />
                <KpiCard
                    label="Leads Atendidos"
                    value={kpis.totalLeads}
                    sub={`Conversão: ${kpis.conversionRate.toFixed(1)}%`}
                    icon={Users}
                    color="text-blue-600"
                />
                <KpiCard
                    label="Disparos WhatsApp"
                    value={kpis.whatsappShots}
                    sub="Mensagens Enviadas"
                    icon={MessageCircle}
                    color="text-green-500"
                />
                <KpiCard
                    label="Alunos (Escola)"
                    value={kpis.totalStudents}
                    sub={`${kpis.activeCourses} Cursos`}
                    icon={ShoppingBag}
                    color="text-purple-600"
                />
                <KpiCard
                    label="Tarefas Feitas"
                    value={kpis.completedTasks}
                    sub={`De ${kpis.totalAttendances} total`}
                    icon={CheckCircle}
                    color="text-wtech-gold"
                />
            </div>

            {/* ROW 2: Financial Evolution (ApexCharts) */}
            <div className="bg-white dark:bg-[#1A1A1A] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-transparent transition-colors">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-gray-900 dark:text-white text-lg flex items-center gap-2">
                        <TrendingUp size={20} className="text-gray-400" />
                        Evolução Financeira
                    </h3>
                </div>

                <div className="h-[350px] w-full text-black">
                    {financialChartSeries.length > 0 && typeof window !== 'undefined' && (
                        <Chart options={financialChartOptions} series={financialChartSeries} type="area" height={350} />
                    )}
                </div>
            </div>

            {/* ROW 3: Sales Funnel & Marketing Campaigns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Sales Funnel (ApexBar) */}
                <div className="bg-white dark:bg-[#1A1A1A] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-transparent transition-colors">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-gray-900 dark:text-white text-lg flex items-center gap-2">
                            <Target size={20} className="text-blue-500" />
                            {(typeof user?.role === 'string' && ['ADMIN', 'Admin', 'Super Admin'].includes(user.role)) ||
                                (typeof user?.role === 'object' && (['ADMIN', 'Admin', 'Super Admin'].includes(user?.role?.name) || user?.role?.level >= 10))
                                ? 'Funil Global' : 'Meu Funil de Vendas'}
                        </h3>
                    </div>
                    {funnelSeries.length > 0 && (
                        <div className="h-[300px] w-full">
                            <Chart options={funnelOptions} series={funnelSeries} type="bar" height={350} />
                        </div>
                    )}
                </div>

                {/* Marketing Campaigns Summary */}
                <div className="bg-white dark:bg-[#1A1A1A] rounded-2xl shadow-sm border border-gray-100 dark:border-transparent overflow-hidden flex flex-col transition-colors">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                        <h3 className="font-bold text-gray-900 dark:text-white text-lg flex items-center gap-2">
                            <Megaphone className="text-pink-500" /> Resumo de Campanhas
                        </h3>
                        <button className="text-xs text-wtech-gold font-bold uppercase hover:underline">Ver Todas</button>
                    </div>
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 dark:bg-black/40 text-gray-500 dark:text-gray-400 font-bold uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-3">Campanha</th>
                                    <th className="px-6 py-3">Canal</th>
                                    <th className="px-6 py-3 text-center">Disparos</th>
                                    <th className="px-6 py-3 text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 dark:text-gray-300">
                                {recentCampaigns.map((camp, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-gray-900 dark:text-white truncate max-w-[150px]">{camp.name}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${camp.channel === 'WhatsApp' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                {camp.channel}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center font-mono">{camp.stats_sent || 0}</td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`text-xs font-bold uppercase ${camp.status === 'Completed' ? 'text-green-500' :
                                                camp.status === 'Processing' ? 'text-yellow-500' : 'text-gray-400'
                                                }`}>{camp.status}</span>
                                        </td>
                                    </tr>
                                ))}
                                {recentCampaigns.length === 0 && (
                                    <tr><td colSpan={4} className="p-8 text-center text-gray-400 text-sm">Nenhuma campanha recente.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            {/* ROW 4: Rankings (Existing - ALWAYS GLOBAL) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Attendants Ranking */}
                <div className="bg-white dark:bg-[#1A1A1A] rounded-2xl shadow-sm border border-gray-100 dark:border-transparent overflow-hidden flex flex-col transition-colors">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                        <h3 className="font-bold text-gray-900 dark:text-white text-lg flex items-center gap-2">
                            <Award className="text-wtech-gold" /> Ranking (Top 5)
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 dark:bg-black/40 text-gray-500 dark:text-gray-400 font-bold uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-3">#</th>
                                    <th className="px-6 py-3">Nome</th>
                                    <th className="px-6 py-3 text-center">Vd</th>
                                    <th className="px-6 py-3 text-right">Cv %</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 dark:text-gray-300">
                                {attendantsRank.slice(0, 5).map((att, idx) => (
                                    <tr key={idx} className={`transition-colors ${att.name === user?.name ? 'bg-wtech-gold/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>
                                        <td className="px-6 py-4 font-bold text-gray-400">{idx + 1}</td>
                                        <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{att.name} {att.name === user?.name && <span className="text-[10px] bg-wtech-gold text-white px-1 rounded ml-1">VOCÊ</span>}</td>
                                        <td className="px-6 py-4 text-center text-green-600 dark:text-green-400 font-bold">{att.converted}</td>
                                        <td className="px-6 py-4 text-right font-black text-gray-900 dark:text-white">{att.rate.toFixed(0)}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Courses Ranking */}
                <div className="bg-white dark:bg-[#1A1A1A] rounded-2xl shadow-sm border border-gray-100 dark:border-transparent overflow-hidden flex flex-col transition-colors">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                        <h3 className="font-bold text-gray-900 dark:text-white text-lg flex items-center gap-2">
                            <ShoppingBag className="text-purple-600" /> Top Cursos
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 dark:bg-black/40 text-gray-500 dark:text-gray-400 font-bold uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-3">Curso</th>
                                    <th className="px-6 py-3 text-right">Gerado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 dark:text-gray-300">
                                {coursesRank.slice(0, 5).map((course, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-gray-900 dark:text-white truncate max-w-[200px]">{course.title}</td>
                                        <td className="px-6 py-4 text-right font-bold text-green-600 dark:text-green-400">
                                            R$ {course.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

        </div>
    );
};

export default DashboardView;
