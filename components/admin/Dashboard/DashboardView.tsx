import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import { 
    Users, DollarSign, ShoppingBag, TrendingUp, Calendar, 
    ArrowRight, MessageCircle, BarChart3, Package, Target, 
    Award, Zap, Megaphone, Activity
} from 'lucide-react';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    BarChart, Bar, Cell
} from 'recharts';

// --- Types ---
interface KpiData {
    revenue: number;
    expenses: number;
    netResult: number;
    totalLeads: number;
    conversionRate: number;
    totalStudents: number;
    activeCourses: number;
    totalAttendances: number;
    completedTasks: number;
    whatsappShots: number;
    totalOrders: number;
}

const DashboardView = ({ isAdmin = false, userId, permissions }: { isAdmin?: boolean, userId?: string, permissions?: any }) => {
    const { user } = useAuth();
    const effectiveUserId = userId || user?.id; // Fallback to auth user if prop is missing
    const [isSuperAdmin, setIsSuperAdmin] = useState(() => {
        if (isAdmin) return true;
        if (permissions?.dashboard_view_all) return true;
        
        const r = (user as any)?.role;
        const rName = typeof r === 'string' ? r.toLowerCase() : (r?.name?.toLowerCase() || '');
        return rName === 'admin' || rName === 'super admin' || rName === 'super_admin';
    });

    const [loading, setLoading] = useState(true);
    const [filterPeriod, setFilterPeriod] = useState('30d');
    const [kpis, setKpis] = useState<KpiData>({
        revenue: 0, expenses: 0, netResult: 0, totalLeads: 0, conversionRate: 0,
        totalStudents: 0, activeCourses: 0, totalAttendances: 0, completedTasks: 0, whatsappShots: 0, totalOrders: 0
    });

    // Chart Data States
    const [financialData, setFinancialData] = useState<any[]>([]);
    const [ordersData, setOrdersData] = useState<any[]>([]);
    const [funnelData, setFunnelData] = useState<any[]>([]);
    
    // Lists
    const [recentCampaigns, setRecentCampaigns] = useState<any[]>([]);
    const [attendantsRank, setAttendantsRank] = useState<any[]>([]);
    const [coursesRank, setCoursesRank] = useState<any[]>([]);

    useEffect(() => {
        if (effectiveUserId) fetchDashboardData();
    }, [effectiveUserId, filterPeriod]); 

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            // 0. Verify Admin Status from DB (Source of Truth)
            let isAdminView = isAdmin;
            
            // If prop already says yes, we start with yes, but we verify DB to be safe/current
            // However, we must ensure we don't accidentally revoke it due to shallow checking
            
            if (user?.id) {
                // Verify against DB to ensure real-time validity
                // Fetches User AND their Role (if possible via join, or manual)
                // We'll fetch role_id and perform a deeper check
                const { data: currentUserProfile } = await supabase
                    .from('SITE_Users')
                    .select('role_id, role, permissions')
                    .eq('id', user.id)
                    .single();
                
                if (currentUserProfile) {
                    const r = currentUserProfile.role;
                    const rName = typeof r === 'string' ? r.toLowerCase() : (r?.name?.toLowerCase() || '');
                    
                    // 1. Direct Role Name Check
                    if (rName === 'admin' || rName === 'super admin' || rName === 'super_admin') {
                        isAdminView = true;
                    } 
                    // 2. User Specific Permission Check
                    else if (currentUserProfile.permissions?.dashboard_view_all) {
                        isAdminView = true;
                    }
                    // 3. Role-Based Permission Check (The missing link)
                    else if (currentUserProfile.role_id) {
                        const { data: roleData } = await supabase
                            .from('SITE_Roles')
                            .select('permissions')
                            .eq('id', currentUserProfile.role_id)
                            .single();
                        
                        if (roleData?.permissions?.dashboard_view_all) {
                            isAdminView = true;
                        }
                    }
                }
            }
            setIsSuperAdmin(isAdminView);

            // 1. Fetch Basic Data (Parallel)
            const [
                { data: expensesDTO },
                { data: allLeads },
                { data: allSales },
                { data: enrollments },
                { data: courses },
                { data: allTasks },
                { data: campaigns },
                { data: allUsers }
            ] = await Promise.all([
                supabase.from('SITE_Transactions').select('*'),
                supabase.from('SITE_Leads').select('*'),
                supabase.from('SITE_Sales').select('*'), // Consistent with Admin financial tab
                supabase.from('SITE_Enrollments').select('*'),
                supabase.from('SITE_Courses').select('*'),
                supabase.from('SITE_Tasks').select('*'),
                supabase.from('SITE_Campaigns').select('*').order('created_at', { ascending: false }).limit(5),
                supabase.from('SITE_Users').select('id, name')
            ]);

            // Maps
            const userMap = new Map((allUsers || []).map((u: any) => [u.id, u.name]));
            const leadOwnerMap = new Map((allLeads || []).map((l: any) => [l.id, l.assigned_to]));
            const courseMap = new Map((courses || []).map((c: any) => [c.id, c.title]));

            // Filtering based on User Role (Use calculated isAdminView)
            const myLeads = isAdminView ? (allLeads || []) : (allLeads || []).filter(l => l.assigned_to === effectiveUserId);
            const myTasks = isAdminView ? (allTasks || []) : (allTasks || []).filter(t => t.assigned_to === effectiveUserId);

            // Revenue (Financial + CRM Won)
            const incomeTransactions = (expensesDTO || []).filter((t: any) => 
                t.type === 'Income' || t.type === 'Revenue' || (t.amount > 0 && t.type !== 'Expense')
            );

            const myRevenueTransactions = isAdminView ? incomeTransactions : incomeTransactions.filter((t: any) => t.attendant_id === effectiveUserId);
            let totalRevenue = myRevenueTransactions.reduce((acc: any, curr: any) => acc + (Number(curr.amount) || 0), 0);
            
            // CRM Won Value
            const myWonLeads = myLeads.filter(l => ['Converted', 'Matriculated', 'Fechamento', 'Ganho', 'Won', 'Product'].includes(l.status));
            const crmWonValue = myWonLeads.reduce((acc, lead) => acc + (Number(lead.conversion_value) || 0), 0);
            totalRevenue += crmWonValue;

            // Expenses (Admin Only)
            const totalExpenses = isAdminView ? ((expensesDTO || []).filter((t:any) => t.type === 'Expense').reduce((acc: any, curr: any) => acc + Number(curr.amount || 0), 0) || 0) : 0;

            // Sales Volume
            const mySales = isAdminView ? (allSales || []) : (allSales || []).filter(s => {
                const ownerId = leadOwnerMap.get(s.client_id);
                return ownerId === effectiveUserId;
            });
            const totalOrdersCreated = mySales.length;

            // Stats
            const totalLeads = myLeads.length;
            const convertedLeads = myLeads.filter(l => ['Converted', 'Matriculated', 'Fechamento', 'Ganho', 'Won'].includes(l.status)).length;
            const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100) : 0;
            const totalStudents = enrollments?.filter(e => e.status !== 'Cancelled').length || 0;
            const activeCoursesCount = courses?.filter(c => c.status === 'Published').length || 0;
            const totalAttendances = myTasks.length;
            const completedTasks = myTasks.filter(t => t.status === 'DONE').length;
            const whatsappShots = campaigns?.filter(c => c.channel === 'WhatsApp').reduce((acc, curr) => acc + (curr.stats_sent || 0), 0) || 0;

            setKpis({
                revenue: totalRevenue,
                expenses: totalExpenses,
                netResult: totalRevenue - totalExpenses,
                totalLeads,
                conversionRate,
                totalStudents,
                activeCourses: activeCoursesCount,
                totalAttendances,
                completedTasks,
                whatsappShots,
                totalOrders: totalOrdersCreated
            });
            setRecentCampaigns(campaigns || []);

            // --- DATA PROCESSING FOR CHARTS ---
            
            // 1. Financial Chart Data (Gradient Area)
            let processedFinancialData: any[] = [];
            const daysMap: Record<string, { revenue: number, expenses: number }> = {};
            const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
            
            if (filterPeriod === '30d') {
                // Last 30 Days
                for (let i = 29; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    const key = d.toISOString().split('T')[0];
                    daysMap[key] = { revenue: 0, expenses: 0 };
                }
                
                myRevenueTransactions.forEach((t: any) => {
                    const dateKey = t.date ? t.date.split('T')[0] : '';
                    if (daysMap[dateKey]) daysMap[dateKey].revenue += (Number(t.amount) || 0);
                });

                // Add Enrollments (Direct Course Purchases)
                (enrollments || []).forEach((e: any) => {
                    const dateKey = e.created_at ? e.created_at.split('T')[0] : '';
                    if (daysMap[dateKey]) daysMap[dateKey].revenue += (Number(e.amount_paid) || 0);
                });

                // Add CRM Conversions (Leads marked as Won/Converted)
                myWonLeads.forEach((l: any) => {
                    const dateKey = l.created_at ? l.created_at.split('T')[0] : '';
                    if (daysMap[dateKey]) daysMap[dateKey].revenue += (Number(l.conversion_value) || 0);
                });

                if(isAdminView) {
                    (expensesDTO || []).filter((t:any) => t.type === 'Expense').forEach((ex: any) => {
                         const dateKey = ex.date ? ex.date.split('T')[0] : '';
                         if (daysMap[dateKey]) daysMap[dateKey].expenses += Number(ex.amount || 0);
                    });
                }
                
                processedFinancialData = Object.keys(daysMap).sort().map(key => ({
                    name: key.split('-')[2] + '/' + key.split('-')[1], // DD/MM
                    receita: daysMap[key].revenue,
                    despesas: daysMap[key].expenses
                }));

            } else {
                 // Yearly
                 const historyMap: Record<number, { revenue: number, expenses: number }> = {};
                 for (let i = 0; i < 12; i++) historyMap[i] = { revenue: 0, expenses: 0 };
                 
                  myRevenueTransactions.forEach((t: any) => {
                     const month = t.date ? new Date(t.date).getMonth() : 0;
                     historyMap[month].revenue += (Number(t.amount) || 0);
                 });

                 // Add Enrollments
                 (enrollments || []).forEach((e: any) => {
                    const month = e.created_at ? new Date(e.created_at).getMonth() : 0;
                    historyMap[month].revenue += (Number(e.amount_paid) || 0);
                 });

                 // Add CRM Won
                 myWonLeads.forEach((l: any) => {
                    const month = l.created_at ? new Date(l.created_at).getMonth() : 0;
                    historyMap[month].revenue += (Number(l.conversion_value) || 0);
                 });

                  if(isAdminView) {
                     (expensesDTO || []).filter((t:any) => t.type === 'Expense').forEach((ex: any) => {
                         const month = ex.date ? new Date(ex.date).getMonth() : 0;
                         historyMap[month].expenses += Number(ex.amount || 0);
                     });
                 }
                
                processedFinancialData = months.map((m, i) => ({
                    name: m,
                    receita: historyMap[i].revenue,
                    despesas: historyMap[i].expenses
                }));
            }
            setFinancialData(processedFinancialData);

            // 2. Orders Volume Data
            const processedOrdersData = months.map((m, i) => {
                const count = mySales.filter(s => new Date(s.created_at).getMonth() === i).length;
                return { name: m, pedidos: count };
            });
            setOrdersData(processedOrdersData);

            // 3. Funnel Data
            const leadsInteracted = myLeads.filter(l => l.status !== 'New').length;
            const leadsNegotiating = myLeads.filter(l => ['Negotiating', 'Qualified', 'Proposta', 'Agendado'].includes(l.status)).length;
            
            setFunnelData([
                { name: 'Total Leads', value: totalLeads, fill: '#3b82f6' },
                { name: 'Interação', value: leadsInteracted, fill: '#8b5cf6' },
                { name: 'Negociação', value: leadsNegotiating + convertedLeads, fill: '#f59e0b' },
                { name: 'Vendas', value: convertedLeads, fill: '#10b981' },
            ]);


            // Ranking Logic
            const attendantStats: Record<string, { name: string, total: number, converted: number }> = {};
            (allLeads || []).forEach(l => {
                const ownerId = l.assigned_to || 'unassigned';
                const name = ownerId === 'unassigned' ? 'Sem Dono' : (userMap.get(ownerId) || 'Desconhecido');
                if (!attendantStats[ownerId]) attendantStats[ownerId] = { name, total: 0, converted: 0 };
                attendantStats[ownerId].total++;
                if (['Converted', 'Matriculated', 'Fechamento', 'Ganho', 'Won'].includes(l.status)) attendantStats[ownerId].converted++;
            });
            setAttendantsRank(Object.values(attendantStats).map(stat => ({ ...stat, rate: stat.total > 0 ? (stat.converted / stat.total) * 100 : 0 })).sort((a, b) => b.rate - a.rate));

            const courseStats: Record<string, { title: string, students: number, revenue: number }> = {};
            (enrollments || []).forEach((e: any) => {
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

    // --- Sub-Components ---
    
    const KpiCard = ({ label, value, sub, icon: Icon, color, isCurrency }: any) => (
        <motion.div 
            whileHover={{ y: -5 }}
            className={`
                relative overflow-hidden bg-white dark:bg-black/40 backdrop-blur-xl 
                border-l-4 ${color.replace('text-', 'border-')} border-y border-r border-gray-100 dark:border-white/10 
                p-6 rounded-2xl shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all
            `}
        >
            <div className="flex justify-between items-start">
                <div>
                     <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
                     <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">
                         <CountUp end={value} duration={2} separator="." decimals={isCurrency ? 2 : 0} prefix={isCurrency ? 'R$ ' : ''} />
                    </h3>
                </div>
                <div className={`p-3 rounded-xl bg-gray-50 dark:bg-white/5 ${color}`}>
                    <Icon size={24} />
                </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5 flex items-center gap-2">
                <div className="bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-1">
                    <TrendingUp size={10} /> +12%
                </div>
                <p className="text-[10px] text-gray-400 font-medium">{sub}</p>
            </div>
        </motion.div>
    );

    return (
        <div className="space-y-8 pb-12 w-full font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 bg-white dark:bg-gradient-to-r dark:from-blue-900/10 dark:to-purple-900/10 p-8 rounded-[2.5rem] border border-gray-100 dark:border-white/10 shadow-sm">
                <div>
                     <div className="flex items-center gap-2 mb-2">
                        <span className="w-2 h-2 rounded-full bg-wtech-gold animate-pulse"></span>
                        <span className="text-xs font-black text-wtech-gold uppercase tracking-[0.2em]">Live Dashboard</span>
                     </div>
                     <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter">
                         Visão Geral <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Corporativa</span>
                     </h2>
                </div>
                
                <div className="flex p-1 bg-gray-100 dark:bg-black/40 rounded-xl border border-gray-200 dark:border-white/10">
                     {['30d', '90d', 'YYYY'].map((key) => (
                         <button 
                            key={key} 
                            onClick={() => setFilterPeriod(key)}
                            className={`px-5 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${filterPeriod === key ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                         >
                             {key === 'YYYY' ? 'Anual' : key === '30d' ? 'Mensal' : 'Trimestral'}
                         </button>
                     ))}
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard label="Receita Total" value={kpis.revenue} sub="Faturamento + CRM" icon={DollarSign} color="text-emerald-500" isCurrency />
                <KpiCard label="Pedidos" value={(kpis as any).totalOrders} sub="Volume de Vendas" icon={Package} color="text-amber-500" />
                <KpiCard label="Leads Ativos" value={kpis.totalLeads} sub={`${kpis.conversionRate.toFixed(1)}% Conversão`} icon={Users} color="text-blue-500" />
                <KpiCard label="Alunos" value={kpis.totalStudents} sub="Matrículas Ativas" icon={Award} color="text-purple-500" />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Financial Area Chart */}
                <div className="lg:col-span-2 bg-white dark:bg-black/40 backdrop-blur-xl border border-gray-100 dark:border-white/10 rounded-3xl p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <Activity className="text-emerald-500" size={18} /> Fluxo Financeiro
                        </h3>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={financialData}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" opacity={0.1} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} tickFormatter={(value) => `R$${value/1000}k`} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                    formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, '']}
                                />
                                <Area type="monotone" dataKey="receita" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" name="Receita" />
                                <Area type="monotone" dataKey="despesas" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" name="Despesas" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Orders Bar Chart */}
                <div className="bg-white dark:bg-black/40 backdrop-blur-xl border border-gray-100 dark:border-white/10 rounded-3xl p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <ShoppingBag className="text-amber-500" size={18} /> Volumetria
                        </h3>
                    </div>
                    <div className="h-[200px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={ordersData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" opacity={0.1} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 10}} />
                                <Tooltip 
                                    cursor={{fill: 'transparent'}}
                                    contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                                />
                                <Bar dataKey="pedidos" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={30}>
                                    {ordersData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#f59e0b' : '#fbbf24'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    {/* Insight Box */}
                    <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-white/5 flex items-center gap-3">
                        <div className="p-2 bg-amber-500 text-white rounded-lg shadow-lg shadow-amber-500/20">
                            <Zap size={16} fill="currentColor" />
                        </div>
                        <div>
                             <p className="text-[10px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-widest">Insight</p>
                             <p className="text-xs font-bold text-gray-600 dark:text-gray-300">
                                 Média de {((kpis as any).totalOrders / 12).toFixed(1)} pedidos mensais.
                             </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Funnel & Conversion Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Funnel Chart */}
                <div className="bg-white dark:bg-black/40 backdrop-blur-xl border border-gray-100 dark:border-white/10 rounded-3xl p-8 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-6">
                        <Target className="text-blue-500" size={18} /> Funil de Conversão
                    </h3>
                    <div className="flex flex-col gap-2 mt-4">
                        {funnelData.map((stage, i) => (
                            <div key={i} className="relative h-12 flex items-center group">
                                {/* Funnel Shape Background */}
                                <div 
                                    className="absolute left-0 top-0 bottom-0 bg-blue-500/10 dark:bg-white/5 rounded-r-xl transition-all duration-500 group-hover:bg-blue-500/20"
                                    style={{ width: `${funnelData[0]?.value > 0 ? (stage.value / funnelData[0].value) * 100 : 0}%` }}
                                ></div>
                                
                                <div className="relative z-10 flex w-full justify-between px-4 items-center">
                                    <span className="text-sm font-bold text-gray-600 dark:text-gray-300">{stage.name}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-gray-400">
                                            {i > 0 && funnelData[i-1]?.value > 0 ? `${((stage.value / funnelData[i-1].value) * 100).toFixed(0)}%` : '100%'}
                                        </span>
                                        <span className="text-sm font-black text-gray-800 dark:text-gray-100 bg-white dark:bg-black/50 px-2 py-1 rounded-md shadow-sm border border-gray-100 dark:border-white/10">
                                            {stage.value}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Conversion Performance Card (Replaces Campaigns) */}
                <div className="bg-white dark:bg-black/40 backdrop-blur-xl border border-gray-100 dark:border-white/10 rounded-3xl p-8 shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-center mb-6">
                         <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <TrendingUp className="text-emerald-500" size={18} /> Performance de CRM
                         </h3>
                    </div>
                    
                    <div className="flex flex-col gap-6">
                        {/* Main Stat: Conversion Rate */}
                        <div className="flex items-center gap-6">
                            <div className="relative w-24 h-24 flex items-center justify-center">
                                {/* Circular Progress Mockup */}
                                <svg className="transform -rotate-90 w-24 h-24">
                                    <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-100 dark:text-gray-800" />
                                    <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-emerald-500" strokeDasharray={251.2} strokeDashoffset={251.2 - (251.2 * kpis.conversionRate) / 100} strokeLinecap="round" />
                                </svg>
                                <span className="absolute text-lg font-black text-gray-900 dark:text-white">{kpis.conversionRate.toFixed(1)}%</span>
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-500 uppercase tracking-wide">Taxa de Conversão</p>
                                <p className="text-xs text-gray-400 mt-1 max-w-[150px]">Porcentagem de leads que se tornaram vendas efetivas.</p>
                            </div>
                        </div>

                        {/* Breakdown Stats */}
                        <div className="grid grid-cols-2 gap-4 mt-2">
                            <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/5">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Leads Totais</p>
                                <div className="flex items-baseline gap-1">
                                    <h4 className="text-2xl font-black text-gray-900 dark:text-white">{kpis.totalLeads}</h4>
                                    <span className="text-[10px] text-gray-400">atendidos</span>
                                </div>
                            </div>
                            <div className="bg-emerald-50 dark:bg-emerald-500/10 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-500/20">
                                <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Vendas (Ganhos)</p>
                                <div className="flex items-baseline gap-1">
                                    <h4 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{funnelData[3]?.value || 0}</h4>
                                    <span className="text-[10px] text-emerald-600/60 dark:text-emerald-400/60">convertidos</span>
                                </div>
                            </div>
                        </div>

                        {/* Average Ticket */}
                        <div className="mt-2 pt-4 border-t border-gray-100 dark:border-white/5 flex justify-between items-center">
                            <span className="text-xs font-bold text-gray-500">Ticket Médio por Venda</span>
                            <span className="text-lg font-black text-gray-900 dark:text-white">
                                R$ { ((funnelData[3]?.value || 0) > 0 ? (kpis.revenue / funnelData[3]?.value) : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Rankings (Merged into one component for cleaner UI) */}
             <div className="bg-white dark:bg-black/40 backdrop-blur-xl border border-gray-100 dark:border-white/10 rounded-3xl p-8 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                     <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <Award className="text-wtech-gold" size={18} /> Top Performance
                     </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Attendants */}
                    <div>
                        <h4 className="text-xs font-black text-gray-400 uppercase mb-4 tracking-widest">Atendentes</h4>
                        <div className="space-y-3">
                             {attendantsRank.slice(0, 4).map((att, i) => (
                                 <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${i === 0 ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-500'}`}>
                                        {i + 1}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-gray-700 dark:text-gray-200">{att.name}</p>
                                        <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full mt-1 overflow-hidden">
                                            <div className="h-full bg-blue-500" style={{ width: `${att.rate}%` }}></div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-gray-800 dark:text-white">{att.converted} <span className="text-[10px] text-gray-400 font-normal">vendas</span></p>
                                    </div>
                                 </div>
                             ))}
                        </div>
                    </div>
                    {/* Courses */}
                    <div>
                         <h4 className="text-xs font-black text-gray-400 uppercase mb-4 tracking-widest">Cursos Populares</h4>
                         <div className="space-y-3">
                             {coursesRank.slice(0, 4).map((course, i) => (
                                 <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-gray-700 dark:text-gray-200 truncate">{course.title}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-emerald-500">R$ {course.revenue.toLocaleString('pt-BR')}</p>
                                    </div>
                                 </div>
                             ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardView;
