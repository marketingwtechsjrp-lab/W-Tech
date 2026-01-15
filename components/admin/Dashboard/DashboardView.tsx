import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Users, ShoppingBag, Calendar, CheckCircle, BarChart3, Award, ArrowUpRight, ArrowRight, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../../lib/supabaseClient';

const DashboardView = () => {
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
        completedTasks: 0
    });

    // Lists for Rankings
    const [attendantsRank, setAttendantsRank] = useState<any[]>([]);
    const [coursesRank, setCoursesRank] = useState<any[]>([]);
    
    // Charts Data
    const [financialHistory, setFinancialHistory] = useState<{ month: string, revenue: number, expenses: number }[]>([]);

    useEffect(() => {
        fetchDashboardData();
    }, [filterPeriod]);

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
            // 1. Fetch Leads (for Conversion & Attendant Rank)
            // We need owner info. Assuming 'owner_id' links to SITE_Users or we join manually.
            // fetching owner_id directly.
            const { data: leadsDTO } = await supabase
                .from('SITE_Leads')
                .select('id, status, owner_id, created_at')
                .gte('created_at', startDate);
            
            const leads = leadsDTO || [];
            
            // 2. Fetch Users (for Names)
            const { data: users } = await supabase.from('SITE_Users').select('id, name');
            const userMap = new Map(users?.map(u => [u.id, u.name]) || []);

            // 3. Fetch Enrollments (Revenue & Course Rank)
            const { data: enrollments } = await supabase
                .from('SITE_Enrollments')
                .select('amount_paid, created_at, course_id, status')
                .gte('created_at', startDate);

            // 4. Fetch Courses (Titles)
            const { data: courses } = await supabase.from('SITE_Courses').select('id, title, status');
            const courseMap = new Map(courses?.map(c => [c.id, c.title]) || []);

            // 5. Fetch Tasks (Attendances/Productivity)
            const { data: tasks } = await supabase
                .from('SITE_Tasks')
                .select('id, status, closed_at')
                .gte('created_at', startDate);

            // 6. Fetch Expenses (Transactions)
            const { data: expensesDTO } = await supabase
                .from('SITE_Transactions')
                .select('amount, date, type')
                .eq('type', 'Expense') // Ensure we only get expenses
                .gte('date', startDate);

            // --- CALCULATIONS ---

            // A. General KPIs
            const totalLeads = leads.length;
            const convertedLeads = leads.filter(l => ['Converted', 'Matriculated', 'Fechamento', 'Ganho'].includes(l.status)).length;
            const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100) : 0;
            
            const totalRevenue = enrollments?.reduce((acc, curr) => acc + (curr.amount_paid || 0), 0) || 0;
            const totalExpenses = expensesDTO?.reduce((acc, curr) => acc + Number(curr.amount || 0), 0) || 0;
            const totalStudents = enrollments?.filter(e => e.status !== 'Cancelled').length || 0;
            const activeCoursesCount = courses?.filter(c => c.status === 'Published').length || 0;
            const totalAttendances = tasks?.length || 0;
            const completedTasks = tasks?.filter(t => t.status === 'DONE').length || 0;

            setKpis({
                revenue: totalRevenue,
                expenses: totalExpenses,
                netResult: totalRevenue - totalExpenses,
                totalLeads,
                conversionRate,
                totalStudents,
                activeCourses: activeCoursesCount,
                totalAttendances,
                completedTasks
            });

            // B. Attendant Ranking
            const attendantStats: Record<string, { name: string, total: number, converted: number }> = {};
            
            leads.forEach(l => {
                const ownerId = l.owner_id || 'unassigned';
                const name = ownerId === 'unassigned' ? 'Sem Dono' : (userMap.get(ownerId) || 'Desconhecido');
                
                if (!attendantStats[ownerId]) attendantStats[ownerId] = { name, total: 0, converted: 0 };
                
                attendantStats[ownerId].total++;
                if (['Converted', 'Matriculated', 'Fechamento', 'Ganho'].includes(l.status)) {
                    attendantStats[ownerId].converted++;
                }
            });

            const rankedAttendants = Object.values(attendantStats)
                .map(stat => ({
                    ...stat,
                    rate: stat.total > 0 ? (stat.converted / stat.total) * 100 : 0
                }))
                .sort((a, b) => b.rate - a.rate || b.converted - a.converted); // Sort by Rate then Volume

            setAttendantsRank(rankedAttendants);

            // C. Course Ranking
            const courseStats: Record<string, { title: string, students: number, revenue: number }> = {};
            
            enrollments?.forEach((e: any) => {
                const cId = e.course_id || 'unknown';
                const title = courseMap.get(cId) || 'Curso Desconhecido';
                
                if (!courseStats[cId]) courseStats[cId] = { title, students: 0, revenue: 0 };
                courseStats[cId].students++; // Count all enrollments for volume
                courseStats[cId].revenue += (e.amount_paid || 0);
            });

            const rankedCourses = Object.values(courseStats)
                .sort((a, b) => b.revenue - a.revenue);

            setCoursesRank(rankedCourses);

            // D. Financial History (Month by Month)
            const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
            const historyMap: Record<number, { revenue: number, expenses: number }> = {};

            // Init 12 months
            for(let i=0; i<12; i++) historyMap[i] = { revenue: 0, expenses: 0 };

            enrollments?.forEach((e: any) => {
                const month = new Date(e.created_at).getMonth();
                historyMap[month].revenue += (e.amount_paid || 0);
            });

            expensesDTO?.forEach((ex: any) => {
                const month = new Date(ex.date).getMonth();
                historyMap[month].expenses += Number(ex.amount || 0);
            });

            // Filter to show only relevant months if using filterPeriod, for 'YYYY' show all up to current month?
            // Doing full year for simplicity as requested "Evolucao mes a mes"
            const chartData = Object.keys(historyMap).map(mIndex => ({
                month: months[Number(mIndex)],
                revenue: historyMap[Number(mIndex)].revenue,
                expenses: historyMap[Number(mIndex)].expenses
            }));
            
            // Trim future months if needed, or leave to show zero
            const currentMonthIndex = new Date().getMonth();
            setFinancialHistory(chartData.slice(0, currentMonthIndex + 1));

        } catch (error) {
            console.error("Error fetching dashboard:", error);
        } finally {
            setLoading(false);
        }
    };

    // --- SUB-COMPONENTS ---
    
    const KpiCard = ({ label, value, sub, icon: Icon, color, trend }: any) => (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-lg transition-all">
            <div className={`absolute top-0 right-0 p-12 bg-${color.replace('text-', '')}/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2`}></div>
            <div className="flex justify-between items-start mb-2">
                <div className={`p-3 rounded-xl bg-${color.replace('text-', '')}/10 ${color}`}>
                    <Icon size={22} />
                </div>
                {trend && (
                    <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                        <ArrowUpRight size={10} /> {trend}
                    </span>
                )}
            </div>
            <div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight mt-2">{value}</h3>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wide mt-1">{label}</p>
                {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
            </div>
        </div>
    );

    const FinancialChart = () => {
        const maxVal = Math.max(...financialHistory.map(h => Math.max(h.revenue, h.expenses)), 1000);
        
        return (
            <div className="w-full h-64 flex items-end gap-2 md:gap-4 mt-8 px-2">
                {financialHistory.map((item, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs p-2 rounded pointer-events-none whitespace-nowrap z-10">
                            <div className="text-green-400 font-bold">Rec: R$ {item.revenue.toLocaleString('pt-BR')}</div>
                            <div className="text-red-400 font-bold">Desp: R$ {item.expenses.toLocaleString('pt-BR')}</div>
                        </div>

                        <div className="w-full flex justify-center gap-1 items-end h-full">
                            {/* Revenue Bar */}
                            <div 
                                className="w-3 md:w-6 bg-gradient-to-t from-green-600 to-green-400 rounded-t-sm transition-all duration-500 hover:opacity-80"
                                style={{ height: `${(item.revenue / maxVal) * 100}%` }}
                            ></div>
                            {/* Expense Bar */}
                            <div 
                                className="w-3 md:w-6 bg-gradient-to-t from-red-600 to-red-400 rounded-t-sm transition-all duration-500 hover:opacity-80"
                                style={{ height: `${(item.expenses / maxVal) * 100}%` }}
                            ></div>
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">{item.month}</span>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            
            {/* Header & Filter */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                     <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                        <BarChart3 className="text-wtech-gold" /> Visão Geral do Sistema
                     </h2>
                     <p className="text-gray-500 text-sm">Acompanhe métricas, ranking de equipe e saúde financeira.</p>
                </div>
                <select 
                    value={filterPeriod} 
                    onChange={e => setFilterPeriod(e.target.value)}
                    className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-wtech-gold focus:border-wtech-gold block w-full md:w-auto p-2.5 font-bold"
                >
                    <option value="YYYY">Ano Atual</option>
                    <option value="90d">Últimos 3 Meses</option>
                    <option value="30d">Últimos 30 Dias</option>
                </select>
            </div>

            {/* KPI ROW 1: General Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard 
                    label="Receita Total" 
                    value={`R$ ${kpis.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`} 
                    sub={`Despesas: R$ ${kpis.expenses.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                    icon={DollarSign} 
                    color="text-green-600" 
                    trend={kpis.revenue > 0 ? '+OK' : null}
                />
                <KpiCard 
                    label="Total de Leads" 
                    value={kpis.totalLeads} 
                    sub={`Conversão Global: ${kpis.conversionRate.toFixed(1)}%`}
                    icon={Users} 
                    color="text-blue-600" 
                />
                <KpiCard 
                    label="Alunos Ativos" 
                    value={kpis.totalStudents} 
                    sub={`${kpis.activeCourses} Cursos Ofertados`}
                    icon={ShoppingBag} 
                    color="text-purple-600" 
                />
                <KpiCard 
                    label="Atendimentos" 
                    value={kpis.completedTasks} 
                    sub={`De ${kpis.totalAttendances} tarefas totais`}
                    icon={CheckCircle} 
                    color="text-wtech-gold" 
                />
            </div>

            {/* MAIN SECTION: Financials & Top Performer */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* FINANCIAL CHART */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                            <TrendingUp size={20} className="text-gray-400" />
                            Evolução Financeira
                        </h3>
                        <div className="flex gap-4 text-xs font-bold">
                            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500 rounded-full"></div> Receita</div>
                            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500 rounded-full"></div> Despesas</div>
                        </div>
                    </div>
                    
                    {/* Graph Container */}
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <FinancialChart />
                    </div>
                </div>

                {/* BEST ATTENDANT HIGHLIGHT */}
                <div className="bg-gradient-to-br from-wtech-black to-gray-900 text-white p-6 rounded-2xl shadow-xl relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-wtech-gold rounded-full opacity-10 blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
                    
                    <div>
                        <div className="inline-block px-3 py-1 bg-wtech-gold text-black rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
                            🏆 Top Performance
                        </div>
                        <h3 className="text-xl font-bold text-gray-200">Melhor Atendente</h3>
                        <p className="text-xs text-gray-400 mb-6">Maior taxa de conversão do período.</p>
                        
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-wtech-gold to-yellow-600 p-[2px] shadow-lg shadow-wtech-gold/20">
                                <div className="w-full h-full rounded-full bg-gray-800 flex items-center justify-center text-xl font-bold text-wtech-gold">
                                    {(attendantsRank[0]?.name || 'N/A').charAt(0)}
                                </div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-white leading-none">{attendantsRank[0]?.name || 'Ninguém'}</div>
                                <div className="text-wtech-gold font-bold text-lg mt-1">{attendantsRank[0]?.rate.toFixed(1)}% Conversão</div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 bg-white/5 rounded-xl p-4 border border-white/10">
                        <div>
                            <div className="text-xs text-gray-400 uppercase">Vendas</div>
                            <div className="text-lg font-bold text-white">{attendantsRank[0]?.converted || 0}</div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-400 uppercase">Total Leads</div>
                            <div className="text-lg font-bold text-white">{attendantsRank[0]?.total || 0}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* RANKINGS ROW */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Attendants Ranking Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                            <Award className="text-wtech-gold" /> Ranking de Atendimento (Top 10)
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-3">#</th>
                                    <th className="px-6 py-3">Nome</th>
                                    <th className="px-6 py-3 text-center">Leads</th>
                                    <th className="px-6 py-3 text-center">Vendas</th>
                                    <th className="px-6 py-3 text-right">Conv. %</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {attendantsRank.slice(0, 10).map((att, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-gray-400">
                                            {idx === 0 ? '👑' : idx + 1}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-gray-900">{att.name}</td>
                                        <td className="px-6 py-4 text-center text-gray-600">{att.total}</td>
                                        <td className="px-6 py-4 text-center text-green-600 font-bold">{att.converted}</td>
                                        <td className="px-6 py-4 text-right font-black text-gray-900">{att.rate.toFixed(1)}%</td>
                                    </tr>
                                ))}
                                {attendantsRank.length === 0 && (
                                    <tr><td colSpan={5} className="p-6 text-center text-gray-400">Nenhum dado encontrado.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-4 border-t border-gray-100 bg-gray-50 text-center">
                        <button className="text-xs font-bold text-gray-500 hover:text-wtech-gold uppercase flex items-center justify-center gap-1 mx-auto">
                            Ver Lista Completa <ArrowRight size={12} />
                        </button>
                    </div>
                </div>

                {/* Courses Ranking Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                            <ShoppingBag className="text-purple-600" /> Cursos Mais Rentáveis
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-3">Curso</th>
                                    <th className="px-6 py-3 text-center">Alunos</th>
                                    <th className="px-6 py-3 text-right">Gerado (R$)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {coursesRank.slice(0, 10).map((course, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-gray-900 truncate max-w-[200px]" title={course.title}>
                                            {idx + 1}. {course.title}
                                        </td>
                                        <td className="px-6 py-4 text-center text-gray-600">{course.students}</td>
                                        <td className="px-6 py-4 text-right font-bold text-green-600">
                                            R$ {course.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                                        </td>
                                    </tr>
                                ))}
                                {coursesRank.length === 0 && (
                                    <tr><td colSpan={3} className="p-6 text-center text-gray-400">Nenhum dado encontrado.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default DashboardView;
