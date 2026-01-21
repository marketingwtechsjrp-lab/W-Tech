import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Calendar as CalendarIcon, ArrowRight, Star, CheckCircle, Search, Play, Instagram, Award, Menu, X, Phone, Mail, Clock, Volume2, VolumeX, Send } from 'lucide-react';
import { Calendar as BentoCalendar } from '../components/ui/calendar';
import { generateAgendaPDF } from '../lib/pdfGenerator';

import { triggerWebhook } from '../lib/webhooks';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mechanic } from '../types';

import SEO from '../components/SEO';
import { useSettings } from '../context/SettingsContext';
import { HeroSection } from '../components/ui/hero-section-5';
import { ContainerAnimated, ContainerInset, ContainerScroll, ContainerStagger } from '../components/ui/hero-video';


const Home = () => {
    // State
    const mapRef = useRef<HTMLDivElement>(null);
    const [mechanics, setMechanics] = useState<Mechanic[]>([]);
    const [courses, setCourses] = useState<any[]>([]);
    const [posts, setPosts] = useState<any[]>([]);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const navigate = useNavigate();

    const { get } = useSettings();
    const [isMuted, setIsMuted] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const videoIframeRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const toggleMute = () => {
        if (videoIframeRef.current && videoIframeRef.current.contentWindow) {
            const command = isMuted ? 'unMute' : 'mute';
            videoIframeRef.current.contentWindow.postMessage(
                JSON.stringify({ event: 'command', func: command, args: [] }),
                '*'
            );
            setIsMuted(!isMuted);
        }
    };


    const address = get('address', 'R. Zumbi dos Palmares, 410 - Jd. Paulista CEP: 15060-190 - São José do Rio Preto - SP - Brasil');
    const phone = get('phone_main', '17 3231-2858');
    const email = get('email_contato', 'contato@w-techbrasil.com.br');
    const hours = get('working_hours', 'Seg a Sex: 08h às 18h');

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
                        hotelsInfo: c.hotels_info,
                        dateEnd: c.date_end
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

    const downloadCourseList = async () => {
        const siteTitle = get('site_title', 'W-TECH BRASIL');
        const logoUrl = get('logo_url', '');
        await generateAgendaPDF(siteTitle, logoUrl);
    };

    return (
        <div className="bg-wtech-light min-h-screen font-sans text-gray-900 selection:bg-wtech-gold selection:text-white overflow-x-hidden">
            <SEO
                title="W-TECH Brasil | Escola de Tecnologia Automotiva"
                description="A W-Tech Brasil é a maior escola de tecnologia automotiva da América Latina. Cursos presenciais e online, rede de oficinas credenciadas e suporte técnico especializado."
                schema={{
                    "@context": "https://schema.org",
                    "@type": "EducationalOrganization",
                    "name": "W-TECH Brasil",
                    "alternateName": "W-Tech Treinamentos",
                    "url": "https://w-techbrasil.com.br",
                    "logo": get('logo_url', 'https://w-techbrasil.com.br/logo.png'),
                    "address": {
                        "@type": "PostalAddress",
                        "streetAddress": "R. Zumbi dos Palmares, 410 - Jd. Paulista",
                        "addressLocality": "São José do Rio Preto",
                        "addressRegion": "SP",
                        "postalCode": "15060-190",
                        "addressCountry": "BR"
                    },
                    "sameAs": [
                        "https://www.instagram.com/wtechbrasil",
                        "https://www.facebook.com/wtechbrasil",
                        "https://www.youtube.com/@wtechbrasil"
                    ],
                    "contactPoint": {
                        "@type": "ContactPoint",
                        "telephone": "+55-17-3231-2858",
                        "contactType": "Sales and Support",
                        "areaServed": "BR",
                        "availableLanguage": "Portuguese"
                    }
                }}
            />
            <HeroSection />


            {/* ABOUT & HQ SECTION ... (Keep as is) */}
            <section className="py-24 bg-white relative">
                <div className="container mx-auto px-6">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div className="relative">
                            <div className="rounded-[2rem] overflow-hidden shadow-2xl border-4 border-gray-100 rotate-2 hover:rotate-0 transition-all duration-500">
                                <img
                                    src="https://w-techbrasil.com.br/wp-content/uploads/2025/01/w-tech-sobre-nos-1-768x495.jpg"
                                    className="w-full h-full object-cover"
                                    alt="Sede da W-Tech Brasil em São José do Rio Preto - Estrutura Técnica de 1.200m²"
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
            <section id="agenda" className="py-24 bg-black relative selection:bg-wtech-red selection:text-white overflow-hidden">
                {/* Background Image with Overlay */}
                <div className="absolute inset-0 z-0">
                    <img 
                        src="https://media.jornaldooeste.com.br/2022/03/79b31d1f-bissinhozavatti_hondaracing_rallyminasbrasil2022_creditoricardoleizer_mundopress_4028-scaled-1.jpg" 
                        alt="Piloto de Rally Bissinho Zavatti representando a parceria técnica da W-Tech" 
                        className="w-full h-full object-cover opacity-40" 
                        width="1920"
                        height="1280"
                        loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black via-black/20 to-black"></div>
                </div>

                <div id="courses" className="absolute top-0 left-0"></div>
                <div className="container mx-auto px-6 relative z-10">
                    <div className="flex flex-col md:flex-row justify-between items-end mb-16 px-4">
                        <div>
                            <h2 className="text-4xl lg:text-5xl font-black text-white mb-4 tracking-tight uppercase">AGENDA <span className="text-transparent bg-clip-text bg-gradient-to-r from-wtech-gold to-yellow-600">OFICIAL</span></h2>
                            <p className="text-gray-400 font-medium text-lg max-w-xl">
                                Planeje sua especialização. Confira o calendário completo de treinamentos presenciais e online da W-Tech Brasil.
                            </p>
                        </div>
                        <div className="hidden md:block">
                            <button 
                                onClick={downloadCourseList}
                                className="px-6 py-3 bg-white/10 backdrop-blur-md border border-white/10 text-white font-bold rounded-lg hover:bg-wtech-gold hover:text-black transition-all shadow-sm flex items-center gap-2 uppercase text-sm"
                            >
                                <CalendarIcon size={18} /> Baixar Lista {new Date().getFullYear()}
                            </button>
                        </div>
                    </div>

                    <div className="grid lg:grid-cols-12 gap-8">
                        {/* LEFT: VISUAL CALENDAR WIDGET */}
                        {/* LEFT: VISUAL CALENDAR WIDGET - NEW BENTO MODEL */}
                        <div className="lg:col-span-4 lg:sticky lg:top-32 h-fit">
                             <BentoCalendar events={courses.map(c => ({ start: c.date, end: c.dateEnd }))} />
                             
                             {/* Simple Legend below the bento card */}
                             <div className="mt-6 flex flex-wrap gap-6 px-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full bg-wtech-gold shadow-[0_0_10px_rgba(212,175,55,0.4)]"></div>
                                    <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-none">Cursos Presenciais</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.4)]"></div>
                                    <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-none">Eventos Online</span>
                                </div>
                             </div>
                        </div>

                        {/* RIGHT: EVENT LIST */}
                        <div className="lg:col-span-8 space-y-4">
                            {courses.length > 0 ? (
                                courses.map((course) => (
                                    <div key={course.id} className="group bg-black/40 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:border-wtech-gold transition-all hover:shadow-2xl flex flex-col md:flex-row items-start md:items-center gap-6">

                                        {/* Date Badge */}
                                        <div className="flex-shrink-0 bg-white/5 rounded-xl p-4 text-center min-w-[90px] group-hover:bg-wtech-gold group-hover:text-black transition-all duration-300">
                                            <span className="block text-3xl font-black text-white group-hover:text-black leading-none">
                                                {parseInt(course.date.split('T')[0].split('-')[2])}
                                                {course.dateEnd && `-${parseInt(course.dateEnd.split('T')[0].split('-')[2])}`}
                                            </span>
                                            <span className="block text-[10px] font-black text-gray-400 group-hover:text-black uppercase mt-1 tracking-widest">
                                                {new Date(course.date.split('T')[0].split('-')[0], parseInt(course.date.split('T')[0].split('-')[1]) - 1, parseInt(course.date.split('T')[0].split('-')[2])).toLocaleString('default', { month: 'short' })}
                                            </span>
                                        </div>

                                        {/* Content */}
                                        <div className="flex-grow">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${course.locationType === 'Online' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'}`}>
                                                    {course.locationType || 'Presencial'}
                                                </span>
                                                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-white/5 text-gray-400 border border-white/10 flex items-center gap-1">
                                                    <MapPin size={10} /> {course.location}
                                                </span>
                                            </div>
                                            <h3 className="text-xl font-bold text-white mb-1 group-hover:text-wtech-gold transition-colors">{course.title}</h3>
                                            <p className="text-sm text-gray-400 font-medium">
                                                Instrutor: {course.instructor || 'Especialista W-Tech'}
                                            </p>
                                        </div>

                                        {/* Action */}
                                        <div className="flex-shrink-0 w-full md:w-auto mt-4 md:mt-0">
                                            <button onClick={() => navigate(`/lp/${course.id}`)} className="w-full md:w-auto px-6 py-3 bg-white text-black text-sm font-bold rounded-lg hover:bg-wtech-gold transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-[10px]">
                                                Mais Detalhes <ArrowRight size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-8 text-center bg-white rounded-2xl border border-gray-200 border-dashed">
                                    <CalendarIcon size={48} className="mx-auto text-gray-300 mb-4" />
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
                                    <button 
                                        onClick={() => navigate('/cursos')}
                                        className="px-8 py-4 bg-wtech-gold text-black font-bold rounded-lg hover:scale-105 transition-transform uppercase tracking-widest text-xs"
                                    >
                                        Ver Todos os Cursos
                                    </button>
                                </div>
                                {/* Decor */}
                                <div className="absolute right-0 top-0 w-64 h-64 bg-wtech-gold/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* IMMERSIVE VIDEO SECTION - NEW MODEL */}
            <ContainerScroll className="bg-[#0a0a0a] text-center text-white">
                <ContainerStagger viewport={{ once: false }} className="pt-20 pb-4">
                    <ContainerAnimated animation="top" className="mb-2">
                        <span className="text-wtech-gold font-bold tracking-[0.3em] uppercase text-xs">W-TECH BRASIL</span>
                    </ContainerAnimated>
                    
                    <ContainerAnimated animation="blur">
                        <h2 className="text-6xl md:text-8xl lg:text-[9rem] font-black text-white uppercase tracking-tighter leading-none">
                            EXPERIÊNCIA
                        </h2>
                    </ContainerAnimated>
                    
                    <ContainerAnimated animation="blur" transition={{ delay: 0.1 }}>
                        <h2 className="text-6xl md:text-8xl lg:text-[9rem] font-black text-white uppercase tracking-tighter leading-none -mt-2 md:-mt-6">
                            IMERSIVA
                        </h2>
                    </ContainerAnimated>

                    <ContainerAnimated animation="bottom" className="mt-8">
                        <p className="text-white/40 font-medium text-center uppercase tracking-[0.3em] text-[10px] animate-pulse">
                             ↓ SCROLLE PARA EXPANDIR
                        </p>
                    </ContainerAnimated>
                </ContainerStagger>

                <ContainerInset 
                    insetXRange={[isMobile ? 20 : 35, 0]} 
                    insetYRange={[isMobile ? 15 : 25, 0]} 
                    progressRange={[0, isMobile ? 0.25 : 0.45]}
                    translateYRange={["0%", "2%"]}
                    className="mx-4 md:mx-8 shadow-2xl"
                >
                    <div className="relative w-full aspect-video md:h-[80vh] overflow-hidden rounded-2xl bg-black group/video">
                        <iframe
                            ref={videoIframeRef}
                            width='100%'
                            height='100%'
                            src={`https://www.youtube.com/embed/RePclscnxDM?autoplay=1&mute=1&loop=1&controls=0&showinfo=0&rel=0&disablekb=1&modestbranding=1&playlist=RePclscnxDM&enablejsapi=1`}
                            className='w-full h-full object-cover scale-110'
                            frameBorder='0'
                            title="Experiência W-Tech Brasil - Vídeo Institucional"
                            allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen'
                            allowFullScreen
                            loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />
                        
                        {/* Audio Controls */}
                        <div className="absolute bottom-8 right-8 z-50">
                            <button
                                onClick={toggleMute}
                                className="p-4 bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 rounded-full text-white transition-all hover:scale-110 group-hover/video:opacity-100 opacity-60 flex items-center gap-3 font-bold text-xs uppercase tracking-widest"
                            >
                                {isMuted ? (
                                    <>
                                        <VolumeX size={18} /> Ligar Som
                                    </>
                                ) : (
                                    <>
                                        <Volume2 size={18} /> Silenciar
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </ContainerInset>

                {/* Content below expanded video */}
                <div className="max-w-4xl mx-auto text-left px-8 py-10">
                    <ContainerStagger viewport={{ once: false }}>
                        <ContainerAnimated animation="left">
                            <h2 className="text-4xl md:text-5xl font-black mb-6 text-white uppercase tracking-tighter">O Próximo Nível da Suspensão</h2>
                        </ContainerAnimated>
                        
                        <ContainerAnimated animation="left" transition={{ delay: 0.2 }}>
                            <p className="text-xl text-gray-400 mb-10 font-medium leading-relaxed">
                                Mais do que um treinamento, uma imersão completa no mundo da alta performance. 
                                Na W-Tech, combinamos tecnologia de ponta com a experiência prática dos melhores especialistas do mercado para entregar um conhecimento que não existe em livros.
                            </p>
                        </ContainerAnimated>

                        <ContainerAnimated animation="bottom" transition={{ delay: 0.4 }}>
                            <div className="grid md:grid-cols-3 gap-8 pt-10 border-t border-white/10">
                                <div>
                                    <p className="text-wtech-gold font-black text-4xl mb-1">100%</p>
                                    <p className="text-xs uppercase font-bold tracking-[0.2em] text-gray-500">Metodologia Prática</p>
                                </div>
                                <div>
                                    <p className="text-wtech-gold font-black text-4xl mb-1">+5.000</p>
                                    <p className="text-xs uppercase font-bold tracking-[0.2em] text-gray-500">Alunos Certificados</p>
                                </div>
                                <div>
                                    <p className="text-wtech-gold font-black text-4xl mb-1">VITALÍCIO</p>
                                    <p className="text-xs uppercase font-bold tracking-[0.2em] text-gray-500">Suporte Técnico</p>
                                </div>
                            </div>
                        </ContainerAnimated>
                    </ContainerStagger>
                </div>
            </ContainerScroll>



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
                                        <img src={post.image} alt={post.title} width="400" height="240" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
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
                        <div className="lg:col-span-8 group/form [perspective:2000px]">
                            <motion.div 
                                className="relative w-full h-full [transform-style:preserve-3d]"
                                animate={{ rotateY: isSubmitted ? 180 : 0 }}
                                transition={{ duration: 0.8, ease: "circOut" }}
                            >
                                {/* Glowing Background Blur */}
                                <div className="absolute -inset-1 bg-gradient-to-r from-wtech-gold to-yellow-600 rounded-[2.5rem] blur opacity-25 group-hover/form:opacity-50 transition duration-1000"></div>
                                
                                {/* FRONT SIDE: THE FORM */}
                                <div className="relative bg-[#0a0a0a] backdrop-blur-2xl p-8 lg:p-12 rounded-[2.5rem] border border-white/10 shadow-2xl [backface-visibility:hidden]">
                                    <div className="absolute top-0 right-0 p-8">
                                        <div className="w-12 h-12 rounded-full bg-wtech-gold/10 flex items-center justify-center text-wtech-gold animate-pulse">
                                            <Send size={20} />
                                        </div>
                                    </div>

                                    <h3 className="text-3xl font-black text-white mb-2 uppercase tracking-tight">Envie uma mensagem</h3>
                                    <p className="text-gray-400 mb-10 font-medium">Preencha o formulário e nossa equipe técnica entrará em contato.</p>
                                    
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
                                            setIsSubmitted(true);
                                            formEl.reset();
                                        } catch (err) {
                                            console.error(err);
                                            alert('Erro ao enviar mensagem.');
                                        } finally {
                                            if(btn) btn.disabled = false;
                                        }
                                    }} className="space-y-6">
                                        <div className="grid md:grid-cols-2 gap-8">
                                            <div>
                                                <label className="block text-[10px] font-black text-wtech-gold uppercase tracking-[0.2em] mb-3">Nome Completo</label>
                                                <input name="name" required type="text" className="w-full px-5 py-4 rounded-xl border border-white/5 bg-white/5 text-white focus:outline-none focus:border-wtech-gold focus:bg-white/10 transition-all placeholder:text-gray-600" placeholder="Seu nome completo" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-wtech-gold uppercase tracking-[0.2em] mb-3">Seu E-mail Profissional</label>
                                                <input name="email" required type="email" className="w-full px-5 py-4 rounded-xl border border-white/5 bg-white/5 text-white focus:outline-none focus:border-wtech-gold focus:bg-white/10 transition-all placeholder:text-gray-600" placeholder="contato@empresa.com" />
                                            </div>
                                        </div>
                                        <div className="grid md:grid-cols-2 gap-8">
                                            <div>
                                                <label className="block text-[10px] font-black text-wtech-gold uppercase tracking-[0.2em] mb-3">WhatsApp / Celular</label>
                                                <input name="phone" required type="tel" className="w-full px-5 py-4 rounded-xl border border-white/5 bg-white/5 text-white focus:outline-none focus:border-wtech-gold focus:bg-white/10 transition-all placeholder:text-gray-600" placeholder="(17) 00000-0000" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-wtech-gold uppercase tracking-[0.2em] mb-3">Assunto do Contato</label>
                                                <select name="subject" className="w-full px-5 py-4 rounded-xl border border-white/5 bg-white/5 text-white focus:outline-none focus:border-wtech-gold focus:bg-white/10 transition-all appearance-none cursor-pointer">
                                                    <option className="bg-black text-white">Cursos Presenciais</option>
                                                    <option className="bg-black text-white">Treinamentos Online</option>
                                                    <option className="bg-black text-white">Suporte Técnico</option>
                                                    <option className="bg-black text-white">Seja um Parceiro</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-wtech-gold uppercase tracking-[0.2em] mb-3">Como podemos ajudar?</label>
                                            <textarea name="message" required rows={4} className="w-full px-5 py-4 rounded-xl border border-white/5 bg-white/5 text-white focus:outline-none focus:border-wtech-gold focus:bg-white/10 transition-all placeholder:text-gray-600 resize-none" placeholder="Descreva brevemente sua dúvida ou necessidade..."></textarea>
                                        </div>

                                        <button 
                                            type="submit"
                                            className="w-full md:w-auto px-12 py-5 bg-wtech-gold text-black font-black uppercase tracking-widest text-xs rounded-xl hover:bg-white transition-all hover:scale-[1.02] active:scale-95 shadow-[0_0_20px_rgba(212,175,55,0.2)]"
                                        >
                                            Enviar Mensagem Agora
                                        </button>
                                    </form>
                                </div>

                                {/* BACK SIDE: SUCCESS MESSAGE */}
                                <div 
                                    className="absolute inset-0 bg-[#0a0a0a] backdrop-blur-2xl p-8 lg:p-12 rounded-[2.5rem] border border-wtech-gold/30 shadow-2xl [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col items-center justify-center text-center"
                                >
                                    <div className="mb-6 px-4 py-1 bg-wtech-gold/10 border border-wtech-gold/20 rounded-full">
                                        <span className="text-[10px] font-black text-wtech-gold uppercase tracking-[0.2em]">Cadastro Concluído</span>
                                    </div>
                                    
                                    <div className="w-24 h-24 rounded-full bg-wtech-gold/20 flex items-center justify-center text-wtech-gold mb-8 shadow-[0_0_50px_rgba(212,175,55,0.3)]">
                                        <CheckCircle size={52} className="animate-in zoom-in duration-500" />
                                    </div>
                                    
                                    <h3 className="text-4xl font-black text-white mb-4 uppercase tracking-tighter">SOLICITAÇÃO <br/> ENVIADA!</h3>
                                    <p className="text-gray-400 text-lg max-w-sm leading-relaxed font-medium">
                                        Sua mensagem foi recebida pela nossa central técnica em São José do Rio Preto. <br/>
                                        <span className="text-white">Retornaremos em breve.</span>
                                    </p>
                                    
                                    <button 
                                        onClick={() => setIsSubmitted(false)}
                                        className="mt-12 px-8 py-3 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest"
                                    >
                                        ← Novo Contato
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </div>

            </section>


        </div>
    );
};

export default Home;