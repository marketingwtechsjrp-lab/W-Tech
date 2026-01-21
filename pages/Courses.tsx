import React, { useState, useEffect } from 'react';
import CourseCard from '../components/CourseCard';
import { formatDateLocal } from '../lib/utils';
import { Search, Calendar as CalendarIcon, List, MapPin, Clock, ArrowRight } from 'lucide-react';

import { supabase } from '../lib/supabaseClient';
import { Course } from '../types';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { useSettings } from '../context/SettingsContext';
import { generateAgendaPDF } from '../lib/pdfGenerator';
import { Download } from 'lucide-react';

const Courses: React.FC = () => {
    const { get } = useSettings();
    const [searchTerm, setSearchTerm] = useState('');
    // ... rest of state stays same but I need to make sure I don't break it
    // Wait, replace_file_content needs exact match.

    // Let me just add the download function first.
    const handleDownloadPDF = async () => {
        const siteTitle = get('site_title', 'W-TECH BRASIL');
        const logoUrl = get('logo_url', '');
        await generateAgendaPDF(siteTitle, logoUrl);
    };
    const [filterType, setFilterType] = useState<'All' | 'Presencial' | 'Online'>('All');
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
    const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());


    useEffect(() => {
        const fetchCourses = async () => {
            setLoading(true);
            const { data } = await supabase
                .from('SITE_Courses')
                .select('*')
                .eq('status', 'Published')
                .order('date', { ascending: true });

            if (data) {
                setCourses(data.map((c: any) => ({
                    ...c,
                    locationType: c.location_type,
                    registeredCount: c.registered_count,
                    type: c.type,
                    tags: c.tags || [],
                    features: c.features || []
                })));
            }
            setLoading(false);
        };
        fetchCourses();
    }, []);

    const filteredCourses = courses.filter(course => {
        const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            course.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterType === 'All' || course.locationType === filterType;
        return matchesSearch && matchesType;
    });

    const AnnualCalendarView = () => {
        const today = new Date();
        const displayYear = calendarYear;
        const months = [

            "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
            "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
        ];

        // Group courses by month (index 0-11)
        const coursesByMonth: { [key: number]: Course[] } = {};
        for (let m = 0; m < 12; m++) {
            const firstDayOfMonth = new Date(displayYear, m, 1).toISOString().split('T')[0];
            const lastDayOfMonth = new Date(displayYear, m + 1, 0).toISOString().split('T')[0];
            
            coursesByMonth[m] = courses.filter(c => {
                const start = c.date.split('T')[0];
                const end = (c.dateEnd || c.date).split('T')[0];
                return (start <= lastDayOfMonth && end >= firstDayOfMonth);
            });
        }

        return (
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden animate-in fade-in zoom-in duration-300">
                <div className="bg-wtech-black text-white p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                    <h2 className="text-2xl font-black uppercase tracking-wider">Calendário Anual</h2>
                    
                    <div className="flex items-center bg-white/10 p-1 rounded-lg backdrop-blur-sm">
                        <button 
                            onClick={() => setCalendarYear(prev => prev - 1)}
                            className="p-2 hover:bg-white/10 rounded-md transition-colors"
                        >
                            <ArrowRight size={20} className="rotate-180" />
                        </button>
                        <span className="px-6 font-black text-xl min-w-[100px] text-center">{calendarYear}</span>
                        <button 
                            onClick={() => setCalendarYear(prev => prev + 1)}
                            className="p-2 hover:bg-white/10 rounded-md transition-colors"
                        >
                            <ArrowRight size={20} />
                        </button>
                    </div>
                </div>
                
                <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6 bg-gray-50">

                    {months.map((monthName, monthIndex) => {
                        const monthEvents = coursesByMonth[monthIndex] || [];
                        const daysInMonth = new Date(displayYear, monthIndex + 1, 0).getDate();
                        const firstDay = new Date(displayYear, monthIndex, 1).getDay();

                        return (
                            <div key={monthName} className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all p-4">
                                <h3 className="text-center font-bold text-wtech-black uppercase border-b border-gray-100 pb-2 mb-3">
                                    {monthName}
                                </h3>
                                {/* Simple Month Grid */}
                                <div className="grid grid-cols-7 gap-1 text-center">
                                    {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => (
                                        <div key={d} className="text-[10px] text-gray-400 font-bold">{d}</div>
                                    ))}
                                    
                                    {/* Empty */}
                                    {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`}></div>)}

                                    {/* Days */}
                                    {Array.from({ length: daysInMonth }).map((_, i) => {
                                        const day = i + 1;
                                        // Find events for this day
                                        const dayStr = `${displayYear}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                        const dayEvents = monthEvents.filter(e => {
                                            const start = e.date.split('T')[0];
                                            const end = (e.dateEnd || e.date).split('T')[0];
                                            return dayStr >= start && dayStr <= end;
                                        });
                                        const hasEvent = dayEvents.length > 0;
                                        
                                        return (
                                            <div key={day} className="relative aspect-square flex items-center justify-center">
                                                {hasEvent ? (
                                                    <Link 
                                                        to={`/lp/${dayEvents[0].slug || dayEvents[0].id}`}
                                                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium cursor-pointer transition-colors bg-wtech-gold text-black font-bold hover:scale-110`}
                                                        title={dayEvents.map(e => e.title).join(', ')}
                                                    >
                                                        {day}
                                                    </Link>
                                                ) : (
                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors`}>
                                                        {day}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                                {/* Event List Below */}
                                <div className="mt-4 space-y-2 min-h-[60px]">
                                    {monthEvents.slice(0, 3).map(ev => (
                                        <Link to={`/lp/${ev.slug || ev.id}`} key={ev.id} className="block text-xs bg-gray-50 p-2 rounded border border-gray-100 hover:bg-wtech-gold/10 hover:border-wtech-gold/30 transition-colors">
                                            <div className="font-bold truncate text-wtech-black">
                                                {parseInt(ev.date.split('T')[0].split('-')[2])} - {ev.title}
                                            </div>
                                        </Link>
                                    ))}
                                    {monthEvents.length > 3 && (
                                        <div className="text-xs text-center text-gray-400 italic">
                                            + {monthEvents.length - 3} eventos
                                        </div>
                                    )}
                                    {monthEvents.length === 0 && (
                                        <div className="text-center text-xs text-gray-300 py-2">Sem eventos</div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <SEO
                title="Agenda de Cursos"
                description="Confira a agenda completa de cursos presenciais e online da W-Tech Brasil. Treinamentos em suspensão, injeção eletrônica e muito mais."
            />
            {/* Hero Section */}
            <div className="bg-wtech-black text-white pt-40 pb-20 relative overflow-hidden">
                <div className="absolute inset-0 opacity-40 bg-[url('https://media.jornaldooeste.com.br/2022/03/79b31d1f-bissinhozavatti_hondaracing_rallyminasbrasil2022_creditoricardoleizer_mundopress_4028-scaled-1.jpg')] bg-cover bg-center"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black/20"></div>
                <div className="container mx-auto px-4 relative z-10 text-center">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">Agenda Oficial</h1>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">Confira os próximos treinamentos, workshops e eventos técnicos da Rede W-Tech.</p>
                    
                    <button 
                        onClick={handleDownloadPDF}
                        className="inline-flex items-center gap-2 px-8 py-3 bg-wtech-gold text-black font-black rounded-xl hover:bg-yellow-500 transition-all shadow-xl shadow-wtech-gold/20 uppercase text-sm tracking-widest"
                    >
                        <Download size={20} /> Baixar Agenda {new Date().getFullYear()}
                    </button>
                </div>
            </div>

            <div className="container mx-auto px-4 py-12 -mt-10 relative z-20">
                {/* Controls Bar */}
                <div className="bg-white p-4 rounded-lg shadow-lg flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
                    {/* Search & Filter */}
                    <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Buscar evento..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg w-full sm:w-64 focus:outline-none focus:border-wtech-gold bg-gray-50 focus:bg-white transition-colors"
                            />
                            <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
                        </div>

                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            {['All', 'Presencial', 'Online'].map(type => (
                                <button
                                    key={type}
                                    onClick={() => setFilterType(type as any)}
                                    className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${filterType === type ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    {type === 'All' ? 'Todos' : type}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* View Toggles */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-lg transition-colors flex items-center gap-2 font-bold text-sm ${viewMode === 'list' ? 'bg-wtech-black text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                        >
                            <List size={18} /> Lista
                        </button>
                        <button
                            onClick={() => setViewMode('calendar')}
                            className={`p-2 rounded-lg transition-colors flex items-center gap-2 font-bold text-sm ${viewMode === 'calendar' ? 'bg-wtech-black text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                        >
                            <CalendarIcon size={18} /> Calendário
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-20">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-wtech-gold"></div>
                    </div>
                ) : filteredCourses.length > 0 ? (
                    <>
                        {viewMode === 'list' ? (
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {filteredCourses.map(course => (
                                    <CourseCard key={course.id} course={course} />
                                ))}
                            </div>
                        ) : (
                            <AnnualCalendarView />
                        )}
                    </>
                ) : (
                    <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-gray-100">
                        <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CalendarIcon size={32} className="text-gray-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Nenhum evento encontrado</h3>
                        <p className="text-gray-500 mb-6">Tente ajustar seus filtros de busca ou verifique em outro mês.</p>
                        <button
                            onClick={() => { setSearchTerm(''); setFilterType('All'); }}
                            className="text-wtech-gold font-bold hover:underline"
                        >
                            Limpar todos os filtros
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Courses;