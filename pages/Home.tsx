import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Calendar, ArrowRight, Star, CheckCircle, Search, Play, Instagram, Award, Menu, X, Phone, Mail, Clock } from 'lucide-react';
import { triggerWebhook } from '../lib/webhooks';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mechanic } from '../types';

import SEO from '../components/SEO';
import { useSettings } from '../context/SettingsContext';

const Home = () => {
    // State
    const mapRef = useRef<HTMLDivElement>(null);
    const [mechanics, setMechanics] = useState<Mechanic[]>([]);
    const [courses, setCourses] = useState<any[]>([]);
    const [posts, setPosts] = useState<any[]>([]);
    const navigate = useNavigate();
    const { get } = useSettings();

    const address = get('address', 'Rua da Performance, 1234<br />São Paulo, SP - Brasil');
    const phone = get('phone_main', '(11) 99999-9999');
    const email = get('email_contato', 'contato@w-techbrasil.com.br');
    const hours = get('working_hours', 'Seg a Sex: 08h às 18h<br />Sáb: 08h às 12h');

    // Calendar Logic (Current Month)
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

    // Fetch Content (Courses & Blog)
    useEffect(() => {
        const fetchContent = async () => {
            try {
                // Fetch Courses (Next 3)
                const { data: coursesData } = await supabase
                    .from('SITE_Courses')
                    .select('*')
                    .eq('status', 'Published')
                    .order('date', { ascending: true })
                    .limit(3);

                if (coursesData) {
                    setCourses(coursesData.map((c: any) => ({
                        ...c,
                        locationType: c.location_type,
                        registeredCount: c.registered_count,
                        hotelsInfo: c.hotels_info
                    })));
                }

                // Fetch Blog Posts (Latest 3)
                const { data: blogData, error: blogError } = await supabase
                    .from('SITE_BlogPosts')
                    .select('*')
                    .eq('status', 'Published')
                    .order('date', { ascending: false }) // Sort by Schedule Date
                    .limit(3);

                if (blogError) console.error("Blog fetch error:", blogError);
                if (blogData) {
                    console.log("Blogs fetched:", blogData);
                    setPosts(blogData);
                }

            } catch (e) {
                console.error("Error fetching content", e);
            }
        };
        fetchContent();
    }, []);

    // Fetch Mechanics
    useEffect(() => {
        const fetchMechanics = async () => {
            try {
                const { data, error } = await supabase
                    .from('SITE_Mechanics')
                    .select(`
                        id,
                        name,
                        workshopName:workshop_name,
                        city,
                        state,
                        phone,
                        email,
                        photo,
                        status,
                        specialty,
                        latitude,
                        longitude,
                        description,
                        street,
                        number,
                        zipCode:zip_code,
                        district
                    `)
                    .eq('status', 'Approved');

                if (data) setMechanics(data as Mechanic[]);
            } catch (e) {
                console.error("Error fetching mechanics", e);
            }
        };
        fetchMechanics();
    }, []);

    useEffect(() => {
        // Initialize Map
        if (mapRef.current && !mapRef.current.innerHTML) {
            const L = (window as any).L;
            if (L) {
                const map = L.map(mapRef.current).setView([-15.793889, -47.882778], 4); // Center of Brazil
                L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                    subdomains: 'abcd',
                    maxZoom: 20
                }).addTo(map);

                // Add Mechanics Pins
                const locations = mechanics.length > 0 ? mechanics.map(m => ({
                    lat: m.latitude || -23.550520 + (Math.random() - 0.5) * 10,
                    lng: m.longitude || -46.633308 + (Math.random() - 0.5) * 10,
                    name: m.workshopName || m.name
                })) : [
                    { lat: -23.550520, lng: -46.633308, name: "W-TECH SP" },
                    { lat: -22.906847, lng: -43.1729, name: "Tech Center RJ" },
                    { lat: -19.916681, lng: -43.934493, name: "Oficina Partner BH" }
                ];

                locations.forEach(loc => {
                    const icon = L.divIcon({
                        className: 'custom-div-icon',
                        html: `<div style="background-color: #EF4444; width: 10px; height: 10px; border-radius: 50%; border: 1px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
                        iconSize: [10, 10],
                        iconAnchor: [5, 5]
                    });
                    L.marker([loc.lat, loc.lng], { icon: icon }).addTo(map).bindPopup(`<b>${loc.name}</b>`);
                });
            }
        }
    }, [mechanics]);

    return (
        <div className="bg-wtech-light min-h-screen font-sans text-gray-900 selection:bg-wtech-gold selection:text-white overflow-x-hidden">
            <SEO
                title="Início"
                description="A W-Tech Brasil é a maior escola de tecnologia automotiva da América Latina. Cursos presenciais e online, rede de oficinas credenciadas e suporte técnico especializado."
                schema={{
                    "@context": "https://schema.org",
                    "@type": "Organization",
                    "name": "W-TECH Brasil",
                    "url": "https://w-techbrasil.com.br",
                    "logo": "https://w-techbrasil.com.br/logo.png",
                    "sameAs": [
                        "https://www.instagram.com/wtechbrasil",
                        "https://www.facebook.com/wtechbrasil"
                    ],
                    "contactPoint": {
                        "@type": "ContactPoint",
                        "telephone": "+55-11-99999-9999",
                        "contactType": "customer service"
                    }
                }}
            />
            {/* HERO SECTION */}
            <header id="home" className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-black">
                {/* Background Image with stronger fade */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.3 }}
                    className="absolute top-0 left-0 w-full h-[900px] z-0 pointer-events-none select-none"
                >
                    <img
                        src="https://w-techbrasil.com.br/wp-content/uploads/2025/09/O-PLANO-DEFINITIVO-1920-x-900-px-2000-x-590-px-768-x-432-px-1.png"
                        className="w-full h-full object-cover object-top opacity-50 grayscale"
                        alt="Background Pattern"
                        width="1920"
                        height="900"
                        fetchPriority="high"
                    />
                </motion.div>

                {/* Smoked Black Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-black via-black/95 to-transparent/50 pointer-events-none z-0"></div>

                <div className="container mx-auto px-6 relative z-10 grid lg:grid-cols-2 gap-12 items-center">
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-wtech-gold/20 text-wtech-gold rounded-full text-xs font-bold mb-6 border border-wtech-gold/30 uppercase tracking-wider backdrop-blur-sm">
                            <Star size={12} className="fill-wtech-gold" /> A Maior Escola da América Latina
                        </div>
                        <h1 className="text-5xl lg:text-7xl font-black leading-[1.05] mb-8 text-white tracking-tighter">
                            Cursos e Peças para<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-wtech-gold to-yellow-600">Suspensões</span><br />
                            Off-road e On road
                        </h1>
                        <p className="text-lg text-gray-400 mb-10 max-w-lg leading-relaxed font-medium">
                            A W-Tech Brasil é referência absoluta em capacitação técnica.
                            Formamos uma elite de especialistas prontos para o futuro da reparação.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <a href="#courses" className="px-8 py-4 bg-wtech-gold text-black text-base font-bold rounded-xl shadow-xl shadow-yellow-500/20 hover:bg-yellow-400 hover:scale-105 transition-all flex items-center justify-center gap-2 uppercase">
                                <Calendar size={20} /> Próximas Turmas
                            </a>
                            <button className="px-8 py-4 bg-white/10 text-white border border-white/20 text-base font-bold rounded-xl hover:bg-white hover:text-black hover:border-white transition-all flex items-center justify-center gap-2 group uppercase backdrop-blur-sm">
                                <Play size={20} className="fill-white group-hover:fill-black transition-transform group-hover:scale-110" /> Nossa Metodologia
                            </button>
                        </div>

                        <div className="mt-12 flex items-center gap-4 text-sm font-semibold text-gray-500">
                            <div className="flex -space-x-3">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="w-10 h-10 rounded-full border-2 border-black bg-gray-800 overflow-hidden">
                                        <img src={`https://ui-avatars.com/api/?background=random&name=User${i}`} alt="user" loading="lazy" width="40" height="40" />
                                    </div>
                                ))}
                            </div>
                            <p>+2.500 Alunos Certificados</p>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="relative hidden lg:block"
                    >
                        <div className="relative z-10 w-full h-[600px] rounded-[2rem] overflow-hidden shadow-2xl border-4 border-white/10 rotate-1 hover:rotate-0 transition-all duration-500 group">
                            {/* HERO IMAGE: ALEX TEACHING */}
                            <img
                                src="https://w-techbrasil.com.br/wp-content/uploads/2023/12/EFP00005-e1701440657699-600x755.jpg"
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                alt="Treinamento com Especialista"
                                width="600"
                                height="755"
                                loading="lazy"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80"></div>

                            {/* Floating Card */}
                            <div className="absolute bottom-8 right-8 bg-black/80 backdrop-blur-md p-6 rounded-2xl shadow-lg max-w-xs border border-white/10 text-left">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-full bg-wtech-gold flex items-center justify-center text-black">
                                        <Award size={24} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-white text-lg">Alex Crepaldi</p>
                                        <p className="text-xs text-wtech-gold font-bold uppercase tracking-wide">Diretor Técnico & Instrutor</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="absolute top-10 -left-10 w-72 h-72 bg-wtech-gold/10 rounded-full blur-[100px] -z-10 animate-pulse"></div>
                        <div className="absolute -bottom-10 -right-10 w-72 h-72 bg-blue-500/5 rounded-full blur-[100px] -z-10"></div>
                    </motion.div>
                </div>
            </header>


            {/* ABOUT & HQ SECTION ... (Keep as is) */}
            <section className="py-24 bg-white relative">
                <div className="container mx-auto px-6">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div className="relative">
                            <div className="rounded-[2rem] overflow-hidden shadow-2xl border-4 border-gray-100 rotate-2 hover:rotate-0 transition-all duration-500">
                                <img
                                    src="https://w-techbrasil.com.br/wp-content/uploads/2025/01/w-tech-sobre-nos-1-768x495.jpg"
                                    className="w-full h-full object-cover"
                                    alt="Sede W-Tech Brasil"
                                    width="768"
                                    height="495"
                                    loading="lazy"
                                />
                            </div>
                            <div className="absolute -bottom-10 -left-10 bg-wtech-black text-white p-8 rounded-2xl shadow-xl max-w-sm hidden md:block">
                                <p className="text-4xl font-black text-wtech-gold mb-1">1.200m²</p>
                                <p className="text-sm font-bold uppercase tracking-widest text-gray-400">De Estrutura Técnica</p>
                            </div>
                        </div>

                        <div>
                            <span className="text-wtech-gold font-bold tracking-widest uppercase text-sm mb-4 block">Sobre a W-Tech</span>
                            <h2 className="text-4xl lg:text-5xl font-black mb-8 leading-tight text-gray-900">
                                A MAIOR ESTRUTURA <br /> INDEPENDENTE DO BRASIL.
                            </h2>
                            <div className="space-y-6 text-gray-600 text-lg">
                                <p>
                                    Localizada estrategicamente, a sede da W-Tech Brasil conta com laboratórios de última geração,
                                    salas de aula climatizadas e o maior acervo de ferramentas especiais do país.
                                </p>
                                <p>
                                    Aqui, o ensino é levado a sério. Não vendemos apenas cursos, entregamos carreiras transformadas.
                                    Nossa metodologia une a teoria da engenharia com a prática do chão de oficina.
                                </p>

                                <ul className="grid sm:grid-cols-2 gap-4 pt-6">
                                    {[
                                        "Laboratório de Eletrônica",
                                        "Área de Dinamômetro",
                                        "Auditório Multimídia",
                                        "Alojamento Próprio"
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-wtech-gold"></div>
                                            <span className="font-bold text-black">{item}</span>
                                        </li>
                                    ))}
                                </ul>

                                <div className="pt-8">
                                    <button className="px-8 py-4 bg-black text-white font-bold rounded-lg hover:bg-gray-800 transition-colors uppercase tracking-wide">
                                        Conheça Nossa Sede
                                    </button>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </section>


            {/* MAP SECTION - Updated with CARBON BACKGROUND */}
            <section className="py-0 relative" id="network">
                <div className="grid lg:grid-cols-2 min-h-[600px]">
                    {/* Text Side - CARBON BACKGROUND */}
                    <div className="bg-[#111111] p-12 lg:p-24 flex flex-col justify-center text-white relative overflow-hidden">
                        {/* Carbon Texture Pattern Overlay */}
                        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #333 1px, transparent 0)', backgroundSize: '20px 20px' }}></div>
                        <div className="absolute inset-0 bg-gradient-to-br from-black/80 to-transparent pointer-events-none"></div>

                        <div className="relative z-10">
                            <h2 className="text-5xl font-black mb-8 leading-tight">POR QUE SOMOS <br /><span className="text-wtech-red">A AUTORIDADE?</span></h2>
                            <div className="space-y-6 text-white/80 text-xl font-medium">
                                <p>A W-Tech não é apenas uma escola. É um ecossistema. Conectamos o fabricante da peça, o engenheiro, o mecânico e o piloto.</p>
                                <ul className="space-y-6 pt-6">
                                    {[
                                        "Material didático proprietário e exclusivo",
                                        "Suporte técnico vitalício para alunos",
                                        "Acesso às ferramentas mais modernas do mercado",
                                        "Certificação com validação via QR Code"
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-center gap-4 border-b border-white/10 pb-4">
                                            <div className="bg-wtech-red text-white p-1 rounded-full"><CheckCircle size={16} /></div>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Map Side */}
                    <div className="relative h-[500px] lg:h-auto bg-gray-900 border-l border-white/10">
                        {/* Map Container */}
                        <div ref={mapRef} className="absolute inset-0 z-0"></div>

                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent pointer-events-none"></div>
                        <div className="absolute bottom-12 left-12 z-20 bg-black p-8 rounded-sm border-l-4 border-wtech-red max-w-sm shadow-2xl">
                            <div className="flex items-center gap-4 mb-4">
                                <MapPin size={32} className="text-wtech-red" />
                                <div>
                                    <h4 className="font-bold text-white text-xl">Encontre Agora</h4>
                                    <p className="text-gray-400 text-sm">Busque oficinas certificadas próximas</p>
                                </div>
                            </div>
                            <button
                                onClick={() => navigate('/mapa')}
                                className="block w-full bg-white text-black text-center py-3 rounded-sm font-bold text-sm hover:bg-gray-200 uppercase tracking-widest"
                            >
                                Abrir Mapa Completo
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* AGENDA / CALENDAR SECTION - REDESIGNED */}
            <section id="agenda" className="py-24 bg-gray-50 relative selection:bg-wtech-red selection:text-white">
                <div id="courses" className="absolute top-0 left-0"></div>
                <div className="container mx-auto px-6">
                    <div className="flex flex-col md:flex-row justify-between items-end mb-16 px-4">
                        <div>
                            <h2 className="text-4xl lg:text-5xl font-black text-gray-900 mb-4 tracking-tight">AGENDA <span className="text-transparent bg-clip-text bg-gradient-to-r from-wtech-gold to-yellow-600">OFICIAL</span></h2>
                            <p className="text-gray-500 font-medium text-lg max-w-xl">
                                Planeje sua especialização. Confira o calendário completo de treinamentos presenciais e online da W-Tech Brasil.
                            </p>
                        </div>
                        <div className="hidden md:block">
                            <button className="px-6 py-3 bg-white border border-gray-200 text-gray-900 font-bold rounded-lg hover:bg-black hover:text-white transition-all shadow-sm flex items-center gap-2 uppercase text-sm">
                                <Calendar size={18} /> Baixar PDF 2024
                            </button>
                        </div>
                    </div>

                    <div className="grid lg:grid-cols-12 gap-8">
                        {/* LEFT: VISUAL CALENDAR WIDGET */}
                        <div className="lg:col-span-4">
                            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 sticky top-32">
                                <div className="bg-wtech-black p-6 text-white flex justify-between items-center">
                                    <span className="font-bold text-lg uppercase tracking-widest">{monthNames[currentMonth]} {currentYear}</span>
                                    <div className="flex gap-2 opacity-50 cursor-not-allowed">
                                        <button disabled className="p-1"><ArrowRight className="rotate-180" size={16} /></button>
                                        <button disabled className="p-1"><ArrowRight size={16} /></button>
                                    </div>
                                </div>
                                <div className="p-6">
                                    <div className="grid grid-cols-7 mb-4 text-center">
                                        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                                            <span key={i} className="text-xs font-bold text-gray-400">{d}</span>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-7 gap-y-4 gap-x-2 text-center text-sm font-medium text-gray-600">
                                        {/* Empty cells */}
                                        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                                            <div key={`empty-${i}`}></div>
                                        ))}

                                        {/* Days */}
                                        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                                            // Check if any course is on this day
                                            const hasEvent = courses.some(c => {
                                                const d = new Date(c.date);
                                                return d.getDate() === day && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                                            });

                                            return (
                                                <div key={day} className={`w-8 h-8 flex items-center justify-center rounded-full mx-auto transition-all ${hasEvent ? 'bg-wtech-gold text-black font-bold shadow-md scale-110' : 'text-gray-400 hover:bg-gray-100'}`}>
                                                    {day}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="mt-8 pt-6 border-t border-gray-100">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-3 h-3 rounded-full bg-wtech-gold"></div>
                                            <span className="text-xs text-gray-500 font-semibold uppercase">Curso Presencial</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                            <span className="text-xs text-gray-500 font-semibold uppercase">Curso Online</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: EVENT LIST */}
                        <div className="lg:col-span-8 space-y-4">
                            {courses.length > 0 ? (
                                courses.map((course) => (
                                    <div key={course.id} className="group bg-white rounded-2xl p-6 border border-gray-100 hover:border-wtech-gold transition-all hover:shadow-lg flex flex-col md:flex-row items-start md:items-center gap-6">

                                        {/* Date Badge */}
                                        <div className="flex-shrink-0 bg-gray-50 rounded-xl p-4 text-center min-w-[90px] group-hover:bg-wtech-gold group-hover:text-black transition-colors">
                                            <span className="block text-2xl font-black leading-none">{new Date(course.date).getDate()}</span>
                                            <span className="block text-xs font-bold uppercase mt-1">{new Date(course.date).toLocaleString('default', { month: 'short' })}</span>
                                        </div>

                                        {/* Content */}
                                        <div className="flex-grow">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${course.locationType === 'Online' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-green-50 text-green-700 border-green-200'}`}>
                                                    {course.locationType || 'Presencial'}
                                                </span>
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-100 text-gray-500 border border-gray-200 flex items-center gap-1">
                                                    <MapPin size={10} /> {course.location}
                                                </span>
                                            </div>
                                            <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-wtech-gold transition-colors">{course.title}</h3>
                                            <p className="text-sm text-gray-500">
                                                Instrutor: {course.instructor || 'Especialista W-Tech'}
                                            </p>
                                        </div>

                                        {/* Action */}
                                        <div className="flex-shrink-0 w-full md:w-auto mt-4 md:mt-0">
                                            <button onClick={() => navigate(`/cursos/${course.id}`)} className="w-full md:w-auto px-6 py-3 bg-black text-white text-sm font-bold rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
                                                Mais Detalhes <ArrowRight size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-8 text-center bg-white rounded-2xl border border-gray-200 border-dashed">
                                    <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
                                    <p className="text-gray-500 font-medium">Nenhum evento agendado para breve.</p>
                                </div>
                            )}

                            {/* PROMO BANNER IN LIST */}
                            <div className="mt-8 bg-gradient-to-r from-[#111] to-[#222] rounded-2xl p-8 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
                                <div className="relative z-10">
                                    <h3 className="text-2xl font-bold text-white mb-2">Não pode comparecer?</h3>
                                    <p className="text-gray-400">Acesse nossa plataforma EAD e estude de onde estiver.</p>
                                </div>
                                <div className="relative z-10">
                                    <button className="px-6 py-3 bg-wtech-gold text-black font-bold rounded-lg hover:scale-105 transition-transform">
                                        Acessar Cursos Online
                                    </button>
                                </div>
                                {/* Decor */}
                                <div className="absolute right-0 top-0 w-64 h-64 bg-wtech-gold/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* BLOG SECTION */}
            <section id="blog" className="py-20 bg-white">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-black text-gray-900">Blog Tech</h2>
                        <p className="text-gray-500 mt-2">Artigos técnicos e notícias do setor.</p>
                    </div>

                    <div className="flex overflow-x-auto pb-8 gap-8 snap-x snap-mandatory">
                        {posts.length > 0 ? (
                            posts.map(post => (
                                <div key={post.id} className="min-w-[350px] md:min-w-[400px] snap-center group cursor-pointer bg-white rounded-2xl shadow-sm hover:shadow-md transition-all border border-gray-100">
                                    <div className="overflow-hidden rounded-t-2xl h-60">
                                        <img src={post.image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                    </div>
                                    <div className="p-6">
                                        <div className="flex gap-4 items-center mb-3">
                                            <span className="text-xs font-bold text-wtech-gold uppercase tracking-wider">{post.category}</span>
                                            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                            <span className="text-xs text-gray-400">5 min</span>
                                        </div>
                                        <h3 className="text-xl font-bold mb-3 group-hover:text-wtech-gold transition-colors line-clamp-2">{post.title}</h3>
                                        <div className="text-gray-500 text-sm mb-4 line-clamp-2" dangerouslySetInnerHTML={{ __html: post.excerpt || post.content.substring(0, 50) + '...' }} />
                                        <Link to={`/blog/${post.slug || post.id}`} className="text-sm font-bold border-b-2 border-transparent group-hover:border-wtech-gold inline-block pb-1 transition-all">Ler Artigo</Link>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-500 w-full text-center">Nenhum artigo publicado ainda.</p>
                        )}
                    </div>
                </div>
            </section>

            {/* CONTACT SECTION */}
            <section id="contact" className="py-24 bg-white border-t border-gray-100">
                <div className="container mx-auto px-6">
                    <div className="grid lg:grid-cols-12 gap-12">
                        {/* Info Side */}
                        <div className="lg:col-span-4">
                            <span className="text-wtech-gold font-bold uppercase tracking-widest text-sm mb-2 block">Fale Conosco</span>
                            <h2 className="text-4xl font-black text-gray-900 mb-8 leading-tight">ENTRE EM <br />CONTATO</h2>
                            <p className="text-gray-500 mb-10 text-lg">
                                Estamos prontos para atender você e sua oficina. Tire suas dúvidas sobre cursos, serviços e suporte.
                            </p>

                            <div className="space-y-8">
                                <div className="flex items-start gap-4 group">
                                    <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-gray-900 group-hover:bg-wtech-gold transition-colors">
                                        <MapPin size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-lg">Endereço</h4>
                                        <p className="text-gray-500" dangerouslySetInnerHTML={{ __html: address.replace(/\n/g, '<br/>') }} />
                                    </div>
                                </div>

                                <div className="flex items-start gap-4 group">
                                    <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-gray-900 group-hover:bg-wtech-gold transition-colors">
                                        <Phone size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-lg">Telefone</h4>
                                        <p className="text-gray-500">{phone}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4 group">
                                    <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-gray-900 group-hover:bg-wtech-gold transition-colors">
                                        <Mail size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-lg">E-mail</h4>
                                        <p className="text-gray-500">{email}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4 group">
                                    <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-gray-900 group-hover:bg-wtech-gold transition-colors">
                                        <Clock size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-lg">Horário de Atendimento</h4>
                                        <p className="text-gray-500" dangerouslySetInnerHTML={{ __html: hours.replace(/\n/g, '<br/>') }} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Form Side */}
                        <div className="lg:col-span-8">
                            <div className="bg-gray-50 p-8 lg:p-12 rounded-[2rem]">
                                <h3 className="text-2xl font-bold text-gray-900 mb-8">Envie uma mensagem</h3>
                                <form onSubmit={async (e) => {
                                    e.preventDefault();
                                    const formEl = e.target as HTMLFormElement;
                                    const btn = formEl.querySelector('button');
                                    if(btn) btn.disabled = true;
                                    
                                    const formData = new FormData(formEl);
                                    const payload = {
                                        name: formData.get('name'),
                                        email: formData.get('email'),
                                        phone: formData.get('phone'),
                                        type: 'Contact_Home',
                                        status: 'New',
                                        context_id: `Assunto: ${formData.get('subject')} | Msg: ${formData.get('message')}`,
                                        tags: ['home_contact', 'website'],
                                        origin: window.location.href,
                                        assigned_to: null 
                                    };

                                    try {
                                        await supabase.from('SITE_Leads').insert([payload]);
                                        try { await triggerWebhook('webhook_lead', payload); } catch(e) {}
                                        alert('Mensagem enviada com sucesso!');
                                        formEl.reset();
                                    } catch (err) {
                                        console.error(err);
                                        alert('Erro ao enviar mensagem.');
                                    } finally {
                                        if(btn) btn.disabled = false;
                                    }
                                }} className="space-y-6">
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nome Completo</label>
                                            <input name="name" required type="text" className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-wtech-gold transition-colors" placeholder="Seu nome" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Seu E-mail</label>
                                            <input name="email" required type="email" className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-wtech-gold transition-colors" placeholder="exemplo@email.com" />
                                        </div>
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Telefone / WhatsApp</label>
                                            <input name="phone" required type="tel" className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-wtech-gold transition-colors" placeholder="(00) 00000-0000" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Assunto</label>
                                            <select name="subject" className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-wtech-gold transition-colors">
                                                <option>Cursos Presenciais</option>
                                                <option>Cursos Online</option>
                                                <option>Suporte Técnico</option>
                                                <option>Outros</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Sua Mensagem</label>
                                        <textarea name="message" required rows={5} className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-wtech-gold transition-colors" placeholder="Como podemos ajudar?"></textarea>
                                    </div>
                                    <button type="submit" className="w-full md:w-auto px-10 py-4 bg-black text-white font-bold rounded-lg hover:bg-wtech-gold hover:text-black transition-colors uppercase tracking-wide shadow-lg disabled:opacity-50">
                                        Enviar Mensagem
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>

            </section>


        </div>
    );
};

export default Home;