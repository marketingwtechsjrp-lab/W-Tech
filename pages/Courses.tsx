import React, { useState, useEffect } from 'react';
import CourseCard from '../components/CourseCard';
import { Search, Calendar as CalendarIcon, List, MapPin, Clock } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { Course } from '../types';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

const Courses: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'All' | 'Presencial' | 'Online'>('All');
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

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
                    registeredCount: c.registered_count
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

    const CalendarView = () => {
        const today = new Date();
        const [currentMonth, setCurrentMonth] = useState(today.getMonth());
        const [currentYear, setCurrentYear] = useState(today.getFullYear());

        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun, 1 = Mon, etc.

        const eventsByDay: { [key: number]: Course[] } = {};
        courses.forEach(c => {
            const d = new Date(c.date);
            if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
                const day = d.getDate();
                if (!eventsByDay[day]) eventsByDay[day] = [];
                eventsByDay[day].push(c);
            }
        });

        const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

        const nextMonth = () => {
            if (currentMonth === 11) {
                setCurrentMonth(0);
                setCurrentYear(prev => prev + 1);
            } else {
                setCurrentMonth(prev => prev + 1);
            }
        };

        const prevMonth = () => {
            if (currentMonth === 0) {
                setCurrentMonth(11);
                setCurrentYear(prev => prev - 1);
            } else {
                setCurrentMonth(prev => prev - 1);
            }
        };

        return (
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Calendar Header */}
                <div className="bg-wtech-black text-white p-6 flex justify-between items-center">
                    <h2 className="text-2xl font-bold uppercase tracking-wider">{monthNames[currentMonth]} {currentYear}</h2>
                    <div className="flex gap-2">
                        <button onClick={prevMonth} className="p-2 hover:bg-gray-800 rounded transition-colors text-wtech-gold font-bold">Anterior</button>
                        <button onClick={nextMonth} className="p-2 hover:bg-gray-800 rounded transition-colors text-wtech-gold font-bold">Próximo</button>
                    </div>
                </div>

                {/* Calendar Grid */}
                <div className="p-6">
                    <div className="grid grid-cols-7 gap-4 mb-4">
                        {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map(d => (
                            <div key={d} className="font-bold text-center text-sm text-gray-400 uppercase tracking-widest">{d}</div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-4">
                        {/* Empty cells for days before the first day of the month */}
                        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                            <div key={`empty-${i}`} className="min-h-[120px]"></div>
                        ))}

                        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                            <div key={day} className={`border border-gray-100 min-h-[120px] p-3 rounded-lg relative transition-all duration-300 ${eventsByDay[day] ? 'bg-yellow-50/50 border-yellow-200 shadow-sm' : 'hover:bg-gray-50'}`}>
                                <span className={`text-lg font-bold absolute top-2 left-3 ${eventsByDay[day] ? 'text-wtech-gold' : 'text-gray-300'}`}>{day}</span>

                                <div className="mt-8 space-y-2">
                                    {eventsByDay[day]?.map(ev => (
                                        <div key={ev.id} className="group relative cursor-pointer">
                                            <div className="bg-wtech-black text-white text-[10px] p-2 rounded shadow-md border-l-2 border-wtech-gold hover:bg-gray-800 transition-colors">
                                                <div className="font-bold truncate">{ev.title}</div>
                                                <div className="flex items-center gap-1 mt-1 text-gray-400">
                                                    <Clock size={10} /> {new Date(ev.date).getHours()}h
                                                </div>
                                            </div>

                                            {/* Tooltip */}
                                            <div className="absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-white text-black text-xs rounded-lg shadow-xl p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-gray-100">
                                                <div className="font-bold mb-1">{ev.title}</div>
                                                <div className="text-gray-500 mb-1">{ev.location}</div>
                                                <div className="text-wtech-gold font-bold">{ev.locationType}</div>
                                                {/* Triangle */}
                                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-8 border-transparent border-t-white"></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
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
                <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')] bg-cover bg-center"></div>
                <div className="container mx-auto px-4 relative z-10 text-center">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">Agenda Oficial</h1>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">Confira os próximos treinamentos, workshops e eventos técnicos da Rede W-Tech.</p>
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
                            <CalendarView />
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