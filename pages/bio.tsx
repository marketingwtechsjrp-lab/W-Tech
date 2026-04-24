import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Instagram, Facebook, Linkedin, MessageCircle, GraduationCap, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface BioLink {
    id: string;
    title: string;
    url: string;
    type: 'normal' | 'prominent' | 'highlight';
}

interface BioConfig {
    logo_url: string;
    title: string;
    description: string;
    links: BioLink[];
    show_latest_courses: boolean;
    whatsapp: string;
    instagram: string;
    facebook: string;
    linkedin: string;
    custom_html: string;
    background_type?: 'color' | 'image' | 'preset' | 'video';
    background_value?: string;
    background_opacity?: number;
    background_color: string;
    button_color: string;
    text_color: string;
}

const BioPage = () => {
    // Helper to extract YouTube ID
    const getYouTubeId = (url: string) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const [config, setConfig] = useState<BioConfig | null>(null);
    const [courses, setCourses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        // 1. Fetch Config
        const { data: configData } = await supabase.from('SITE_SystemSettings').select('*').eq('key', 'bio_config').maybeSingle();
        
        let parsedConfig: BioConfig | null = null;
        if (configData) {
            try {
                parsedConfig = typeof configData.value === 'string' ? JSON.parse(configData.value) : configData.value;
                setConfig(parsedConfig);
            } catch (e) {
                console.error("Failed to parse bio_config", e);
            }
        }

        // 2. Fetch Courses if needed
        if (parsedConfig?.show_latest_courses) {
            const { data: coursesData } = await supabase
                .from('SITE_Courses')
                .select('*')
                .eq('status', 'Published')
                .gte('date', new Date().toISOString())
                .order('date', { ascending: true })
                .limit(3);
            if (coursesData) setCourses(coursesData);
        }

        setLoading(false);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="animate-spin text-wtech-gold" size={40} />
            </div>
        );
    }

    if (!config) {
        return (
            <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
                <h1 className="text-2xl font-bold mb-4">Página de BIO não configurada</h1>
                <p className="text-gray-400">Entre no painel administrativo para configurar sua página de links.</p>
                <a href="/#/admin" className="mt-8 bg-wtech-gold text-black px-6 py-2 rounded-lg font-bold">Ir para Admin</a>
            </div>
        );
    }

    // Helper to get background style
    const getBackgroundStyle = () => {
        if (config.background_type === 'image') {
            return { backgroundImage: `url(${config.background_value})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: '#000' };
        }
        if (config.background_type === 'video') {
            return { backgroundColor: '#000' };
        }
        if (config.background_type === 'preset') {
            switch (config.background_value) {
                case 'aurora': return { background: 'linear-gradient(45deg, #00cdac 0%, #009688 100%)' };
                case 'ocean': return { background: 'linear-gradient(to top, #1e3c72 0%, #2a5298 100%)' };
                case 'sunset': return { background: 'linear-gradient(to top, #ff0844 0%, #ffb199 100%)' };
                case 'matrix': return { backgroundColor: '#000' }; // Needs custom elements
                case 'neon_pulse': return { backgroundColor: '#050505' };
                case 'particles': return { backgroundColor: '#1a1a2e' };
                default: return { backgroundColor: '#000' };
            }
        }
        // Default color
        return { backgroundColor: config.background_type === 'color' ? config.background_value : config.background_color || '#111' };
    };

    return (
        <div 
            className="min-h-screen flex flex-col items-center p-6 overflow-x-hidden relative"
            style={{ 
                ...getBackgroundStyle(),
                color: config.text_color 
            }}
        >
            {/* Overlay for Image/Video Opacity */}
            {(config.background_type === 'image' || config.background_type === 'video') && (
                <div className="absolute inset-0 pointer-events-none z-0" style={{ backgroundColor: `rgba(0,0,0,${(config.background_opacity || 0) / 100})` }}></div>
            )}

            {/* Video Background Element */}
            {config.background_type === 'video' && (
                <div className="absolute inset-0 overflow-hidden -z-10">
                    {getYouTubeId(config.background_value || '') ? (
                        <div className="absolute inset-0 pointer-events-none overflow-hidden h-[300%] w-[300%] -left-[100%] -top-[100%]">
                            <iframe
                                className="absolute top-0 left-0 w-full h-full pointer-events-none"
                                src={`https://www.youtube.com/embed/${getYouTubeId(config.background_value || '')}?autoplay=1&mute=1&controls=0&loop=1&playlist=${getYouTubeId(config.background_value || '')}&playsinline=1&showinfo=0&rel=0&iv_load_policy=3&disablekb=1&fs=0`}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                style={{ filter: 'brightness(1.2)' }}
                                title="bg"
                            />
                        </div>
                    ) : (
                        <video 
                            className="absolute inset-0 w-full h-full object-cover"
                            src={config.background_value}
                            autoPlay 
                            loop 
                            muted 
                            playsInline
                        />
                    )}
                </div>
            )}

            {/* Animated Background Layers */}
            {config.background_type === 'preset' && config.background_value === 'matrix' && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20 z-0">
                     <div className="absolute inset-0 bg-[url('https://media.giphy.com/media/oEI9uBYSzLpBK/giphy.gif')] bg-repeat opacity-30 mix-blend-screen"></div>
                </div>
            )}
            
            {config.background_type === 'preset' && config.background_value === 'neon_pulse' && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/20 blur-[100px] rounded-full animate-pulse"></div>
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-wtech-gold to-transparent opacity-50"></div>
                </div>
            )}

            {config.background_type === 'preset' && config.background_value === 'particles' && (
                 <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                     <div className="absolute w-2 h-2 bg-white rounded-full top-10 left-10 animate-bounce opacity-20"></div>
                     <div className="absolute w-1 h-1 bg-white rounded-full top-40 left-80 animate-ping opacity-20"></div>
                     <div className="absolute w-3 h-3 bg-blue-300 rounded-full bottom-20 right-20 animate-pulse opacity-20"></div>
                 </div>
            )}

            <div className="w-full max-w-[480px] flex flex-col items-center relative z-10">
                
                {/* Logo & Profile */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 mt-10 flex flex-col items-center text-center"
                >
                    <div className="w-32 h-32 flex items-center justify-center mb-6">
                        {config.logo_url ? (
                            <img src={config.logo_url} alt={config.title} className="w-full h-full object-contain drop-shadow-xl" />
                        ) : (
                            <div className="w-24 h-24 bg-gray-800 flex items-center justify-center rounded-xl">
                                <span className="text-4xl font-black text-wtech-gold">{config.title.substring(0, 1)}</span>
                            </div>
                        )}
                    </div>
                    <h1 className="text-xl font-black tracking-tight" style={{ color: config.text_color }}>{config.title}</h1>
                    <p className="text-sm opacity-80 mt-2 font-medium" style={{ color: config.text_color }}>{config.description}</p>
                </motion.div>

                {/* Main Links */}
                <div className="w-full space-y-4 mb-10">
                    {config.links.map((link, idx) => (
                        <motion.a
                            key={link.id}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            initial={{ opacity: 0, x: idx % 2 === 0 ? -20 : 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={`block w-full py-4 px-6 rounded-2xl text-center font-black text-sm uppercase tracking-wider transition-all border shadow-lg ${
                                link.type === 'normal' ? 'border-transparent' : 
                                link.type === 'prominent' ? 'border-white/20' : 
                                'border-wtech-gold ring-4 ring-wtech-gold/20'
                            }`}
                            style={{ 
                                backgroundColor: config.button_color, 
                                color: '#000' // Gold background needs black text usually for contrast
                            }}
                        >
                            {link.title}
                        </motion.a>
                    ))}
                </div>

                {/* Dynamic Courses */}
                {config.show_latest_courses && courses.length > 0 && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="w-full space-y-4 mb-10"
                    >
                        <h3 className="text-xs font-black uppercase tracking-widest opacity-50 mb-2 border-b border-white/10 pb-2">⚠️ Próximos Treinamentos</h3>
                        {courses.map((course, idx) => (
                            <motion.a
                                key={course.id}
                                href={`/#/lp/${course.slug || course.id}`}
                                className="block w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-all group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-wtech-gold/20 flex items-center justify-center text-wtech-gold">
                                        <GraduationCap size={24} />
                                    </div>
                                    <div className="flex-grow">
                                        <h4 className="text-sm font-bold leading-tight mb-1">{course.title}</h4>
                                        <p className="text-[10px] opacity-60 font-medium">
                                            {new Date(course.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })} • {course.location}
                                        </p>
                                    </div>
                                    <ArrowRight size={16} className="text-wtech-gold opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </motion.a>
                        ))}
                    </motion.div>
                )}

                {/* Custom HTML */}
                {config.custom_html && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="w-full mb-10 text-sm font-medium"
                        dangerouslySetInnerHTML={{ __html: config.custom_html }}
                    />
                )}

                {/* Social Footer */}
                <div className="mt-auto flex flex-col items-center pb-10">
                    <div className="flex gap-8 mb-8">
                        {config.whatsapp && (
                            <a href={`https://wa.me/${config.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="opacity-70 hover:opacity-100 hover:scale-110 transition-all">
                                <MessageCircle size={24} />
                            </a>
                        )}
                        {config.instagram && (
                            <a href={config.instagram} target="_blank" rel="noopener noreferrer" className="opacity-70 hover:opacity-100 hover:scale-110 transition-all">
                                <Instagram size={24} />
                            </a>
                        )}
                        {config.facebook && (
                            <a href={config.facebook} target="_blank" rel="noopener noreferrer" className="opacity-70 hover:opacity-100 hover:scale-110 transition-all">
                                <Facebook size={24} />
                            </a>
                        )}
                        {config.linkedin && (
                            <a href={config.linkedin} target="_blank" rel="noopener noreferrer" className="opacity-70 hover:opacity-100 hover:scale-110 transition-all">
                                <Linkedin size={24} />
                            </a>
                        )}
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-tighter opacity-30">Desenvolvido por W-TECH</p>
                </div>

            </div>
        </div>
    );
};

export default BioPage;
