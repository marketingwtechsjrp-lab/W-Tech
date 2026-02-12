import React, { useState, useRef, useEffect } from 'react';
import { 
    X, Download, Wand2, RefreshCcw, Type, Image as ImageIcon, 
    Palette, LayoutGrid, Layers, Trash2, Plus, 
    ChevronLeft, ChevronRight, User, MapPin, Calendar, 
    ShieldCheck, Star, Award, Sparkles, Send, Move, Maximize2, Code
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import html2canvas from 'html2canvas';
import { Course } from '../../../types';
import { ASSETS } from '../../../constants';

interface CreativeHubProps {
    course: Course;
    onClose: () => void;
}

type TemplateId = 'performance' | 'experience' | 'technical';

const LOGO_PRO_RIDERS = 'https://raw.githubusercontent.com/marketingwtechsjrp-lab/W-Tech/main/public/logos/pro-riders-logo.png'; 
const LOGO_LIQUI_MOLY = 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Liqui_Moly_logo.svg/1200px-Liqui_Moly_logo.svg.png';
const LOGO_MOTUL = 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/Motul_logo.svg/2560px-Motul_logo.svg.png';
const LOGO_ART_ON_WHEELS = 'https://raw.githubusercontent.com/marketingwtechsjrp-lab/W-Tech/main/public/logos/art-on-wheels.png';

export const CreativeHub: React.FC<CreativeHubProps> = ({ course, onClose }) => {
    const [template, setTemplate] = useState<TemplateId>('performance');
    const [activeTab, setActiveTab] = useState<'content' | 'layers' | 'visual'>('content');
    const [isGenerating, setIsGenerating] = useState(false);
    const [interactiveMode, setInteractiveMode] = useState(true);
    const [selectedLayer, setSelectedLayer] = useState<'instructor' | 'bg' | 'logo' | null>(null);
    const canvasRef = useRef<HTMLDivElement>(null);

    // Dynamic Fields State
    const [fields, setFields] = useState({
        title: course.title || 'CURSO DE SUSPENSÃO W-TECH',
        subtitle: 'A MANUTENÇÃO INVISÍVEL',
        instructor: course.instructor || 'Alex Crepaldi',
        date: new Date(course.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }),
        location: course.location || 'São José do Rio Preto - SP',
        address: course.address ? `${course.address}, ${course.addressNumber || ''}` : 'NA ART ON WHEELS GARAGE',
        cta: 'GARANTIR MINHA VAGA',
        phone: '(17) 98132-7309',
        priceLabel: 'EM ATÉ 12X',
        vagas: 'Somente 12 Vagas!',
        instructorPhoto: 'https://lp.w-techbrasil.com.br/wp-content/webp-express/webp-images/uploads/2025/09/boas-vindas-2.png.webp',
        bgImage: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?q=80&w=2832&auto=format&fit=crop',
        logoCustom: 'https://xvefqpzwefihodcnxfqr.supabase.co/storage/v1/object/public/site-assets/w-tech-logo.png',
        showLogos: true,
        // Additional Text Content Fields
        labelTop: 'CONVITE ESPECIAL W-TECH',
        titleAlt: 'EXPERIENCE',
        description: 'Descubra como os detalhes que ninguém vê fazem a diferença nas pistas e no dia a dia.',
        // Template Specific Transform Configs
        templateConfigs: {
            performance: {
                instructor: { x: -10, y: 0, scale: 1, zIndex: 20, customCss: '' },
                bg: { x: 0, y: 0, scale: 1, zIndex: 0, customCss: 'opacity: 0.3;' },
                logo: { x: 0, y: -450, scale: 0.5, zIndex: 30, customCss: '' },
                textStyles: {
                    title: { fontSize: 60, color: '#FFFFFF' },
                    subtitle: { fontSize: 14, color: '#FFFFFF' },
                    labelTop: { fontSize: 12, color: '#D4AF37' },
                    cta: { fontSize: 20, color: '#FFFFFF' },
                    info: { fontSize: 24, color: '#FFFFFF' }
                }
            },
            experience: {
                instructor: { x: 0, y: 0, scale: 1, zIndex: 20, customCss: '' },
                bg: { x: 0, y: 0, scale: 1, zIndex: 0, customCss: 'opacity: 0.3;' },
                logo: { x: 0, y: -450, scale: 0.5, zIndex: 30, customCss: '' },
                textStyles: {
                    title: { fontSize: 60, color: '#D4AF37' },
                    subtitle: { fontSize: 14, color: '#FFFFFF' },
                    labelTop: { fontSize: 12, color: '#FFFFFF' },
                    cta: { fontSize: 16, color: '#000000' },
                    info: { fontSize: 32, color: '#FFFFFF' }
                }
            },
            technical: {
                instructor: { x: 0, y: 0, scale: 1, zIndex: 20, customCss: '' },
                bg: { x: 0, y: 0, scale: 1, zIndex: 0, customCss: 'opacity: 0.3;' },
                logo: { x: 0, y: -450, scale: 0.5, zIndex: 30, customCss: '' },
                textStyles: {
                    title: { fontSize: 50, color: '#FFFFFF' },
                    subtitle: { fontSize: 14, color: '#D4AF37' },
                    labelTop: { fontSize: 12, color: '#D4AF37' },
                    cta: { fontSize: 18, color: '#FFFFFF' },
                    info: { fontSize: 24, color: '#FFFFFF' }
                }
            },
            minimal: {
                instructor: { x: 0, y: 150, scale: 0.8, zIndex: 20, customCss: '' },
                bg: { x: 0, y: 0, scale: 1, zIndex: 0, customCss: 'opacity: 0.05;' },
                logo: { x: 0, y: -450, scale: 0.5, zIndex: 30, customCss: '' },
                textStyles: {
                    title: { fontSize: 60, color: '#000000' },
                    subtitle: { fontSize: 12, color: '#000000' },
                    labelTop: { fontSize: 12, color: '#D4AF37' },
                    cta: { fontSize: 14, color: '#FFFFFF' },
                    info: { fontSize: 20, color: '#000000' }
                }
            },
            impact: {
                instructor: { x: 0, y: 100, scale: 1, zIndex: 20, customCss: '' },
                bg: { x: 0, y: 0, scale: 1, zIndex: 0, customCss: 'opacity: 0.2;' },
                logo: { x: 0, y: -450, scale: 0.5, zIndex: 30, customCss: '' },
                textStyles: {
                    title: { fontSize: 80, color: '#000000' },
                    subtitle: { fontSize: 20, color: '#FFFFFF' },
                    labelTop: { fontSize: 60, color: '#D4AF37' },
                    cta: { fontSize: 32, color: '#D4AF37' },
                    info: { fontSize: 24, color: '#000000' }
                }
            },
            storytelling: {
                instructor: { x: 100, y: -100, scale: 1, zIndex: 20, customCss: '' },
                bg: { x: 0, y: 0, scale: 1, zIndex: 0, customCss: '' },
                logo: { x: 0, y: -450, scale: 0.5, zIndex: 30, customCss: '' },
                textStyles: {
                    title: { fontSize: 50, color: '#FFFFFF' },
                    subtitle: { fontSize: 18, color: '#FFFFFF' },
                    labelTop: { fontSize: 12, color: '#D4AF37' },
                    cta: { fontSize: 16, color: '#000000' },
                    info: { fontSize: 20, color: '#FFFFFF' }
                }
            }
        }
    });

    // Effect to load saved design model
    useEffect(() => {
        const savedConfigs = localStorage.getItem('creative_hub_template_configs');
        if (savedConfigs) {
            try {
                const parsed = JSON.parse(savedConfigs);
                
                // Smart merge: preserve defaults if localStorage has old schema
                setFields(prev => {
                    const newConfigs = { ...prev.templateConfigs };
                    Object.keys(parsed).forEach(tid => {
                        const templateId = tid as TemplateId;
                        if (newConfigs[templateId]) {
                            newConfigs[templateId] = {
                                ...newConfigs[templateId],
                                ...parsed[templateId],
                                // Deep merge textStyles specifically as they were recently added
                                textStyles: {
                                    ...newConfigs[templateId].textStyles,
                                    ...(parsed[templateId]?.textStyles || {})
                                }
                            };
                        }
                    });
                    return { ...prev, templateConfigs: newConfigs };
                });
            } catch (e) {
                console.error('Error loading saved design model', e);
            }
        }
    }, []);

    // Save design model manually
    const saveDesignModel = () => {
        localStorage.setItem('creative_hub_template_configs', JSON.stringify(fields.templateConfigs));
        alert('Modelo de design salvo com sucesso! Estes posicionamentos serão repetidos em outros cursos.');
    };

    // Helper to get active transform for a layer in current template
    const getTransform = (layer: 'instructor' | 'bg' | 'logo') => {
        return fields.templateConfigs[template][layer];
    };

    // Helper to bypass tainted cache for CORS images
    const getSafeUrl = (url: string) => {
        if (!url || url.startsWith('data:')) return url;
        // When generating, append a unique parameter to force a fresh CORS-enabled fetch
        if (isGenerating) {
            const separator = url.includes('?') ? '&' : '?';
            return `${url}${separator}render_v=${Date.now()}`;
        }
        return url;
    };

    const handleFieldChange = (key: keyof typeof fields, value: any) => {
        setFields(prev => ({ ...prev, [key]: value }));
    };

    const handleTextStyleChange = (element: string, key: 'fontSize' | 'color', value: any) => {
        setFields(prev => ({
            ...prev,
            templateConfigs: {
                ...prev.templateConfigs,
                [template]: {
                    ...prev.templateConfigs[template],
                    textStyles: {
                        ...prev.templateConfigs[template].textStyles,
                        [element]: {
                            ...prev.templateConfigs[template].textStyles[element],
                            [key]: value
                        }
                    }
                }
            }
        }));
    };

    const getTextStyle = (element: 'title' | 'subtitle' | 'labelTop' | 'cta' | 'info') => {
        const styles = fields.templateConfigs[template]?.textStyles;
        if (!styles || !styles[element]) {
            // Fallback to avoid white screen if something goes wrong
            return { fontSize: 20, color: '#FFFFFF' };
        }
        return styles[element];
    };

    const handleTransformChange = (layer: 'instructor' | 'bg' | 'logo', key: string, value: any) => {
        setFields(prev => ({
            ...prev,
            templateConfigs: {
                ...prev.templateConfigs,
                [template]: {
                    ...prev.templateConfigs[template],
                    [layer]: {
                        ...prev.templateConfigs[template][layer],
                        [key]: value
                    }
                }
            }
        }));
    };

    const InteractiveLayer = ({ 
        id, 
        transform, 
        children, 
        className = "" 
    }: { 
        id: 'instructor' | 'bg' | 'logo', 
        transform: any, 
        children: React.ReactNode,
        className?: string
    }) => {
        const isSelected = selectedLayer === id;
        
        const handleDragStart = (e: React.PointerEvent) => {
            if (!interactiveMode || isGenerating) return;
            // Prevent event bubbling so we don't drag parent containers
            e.stopPropagation();
            setSelectedLayer(id);
            
            const startX = e.clientX;
            const startY = e.clientY;
            const startPosX = transform.x;
            const startPosY = transform.y;
            
            const onPointerMove = (moveEvent: PointerEvent) => {
                const deltaX = moveEvent.clientX - startX;
                const deltaY = moveEvent.clientY - startY;
                handleTransformChange(id, 'x', startPosX + deltaX);
                handleTransformChange(id, 'y', startPosY + deltaY);
            };
            
            const onPointerUp = () => {
                window.removeEventListener('pointermove', onPointerMove);
                window.removeEventListener('pointerup', onPointerUp);
            };
            
            window.addEventListener('pointermove', onPointerMove);
            window.addEventListener('pointerup', onPointerUp);
        };

        const handleResize = (e: React.PointerEvent) => {
            e.stopPropagation();
            if (!interactiveMode || isGenerating) return;
            
            const startY = e.clientY;
            const startScale = transform.scale;
            
            const onPointerMove = (moveEvent: PointerEvent) => {
                const delta = (startY - moveEvent.clientY) / 100;
                handleTransformChange(id, 'scale', Math.max(0.01, startScale + delta));
            };
            
            const onPointerUp = () => {
                window.removeEventListener('pointermove', onPointerMove);
                window.removeEventListener('pointerup', onPointerUp);
            };
            
            window.addEventListener('pointermove', onPointerMove);
            window.addEventListener('pointerup', onPointerUp);
        };
        
        return (
            <div
                onPointerDown={handleDragStart}
                className={`absolute transition-[outline] ${interactiveMode ? 'cursor-move active:cursor-grabbing' : ''} ${isSelected && interactiveMode ? 'outline-2 outline-dashed outline-[#D4AF37] outline-offset-4 z-[100]' : ''} ${className}`}
                style={{
                    zIndex: transform.zIndex,
                    left: 0,
                    top: 0,
                    transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                    transformOrigin: 'center center',
                    ...parseCustomCss(transform.customCss),
                    pointerEvents: interactiveMode ? 'auto' : 'none',
                    userSelect: 'none',
                    touchAction: 'none'
                }}
            >
                {children}
                {isSelected && interactiveMode && (
                    <div className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 flex gap-2 z-[200]">
                        <button 
                            className="bg-[#D4AF37] hover:bg-yellow-500 text-black p-2 rounded-full shadow-2xl border-2 border-black"
                            onPointerDown={handleResize}
                        >
                            <Maximize2 size={16} />
                        </button>
                    </div>
                )}
            </div>
        );
    };

    const handleDownload = async () => {
        if (!canvasRef.current) return;
        setIsGenerating(true);
        try {
            await new Promise(r => setTimeout(r, 1200)); // Even more delay for CORS fresh fetch
            const canvas = await html2canvas(canvasRef.current, {
                useCORS: true,
                allowTaint: false,
                scale: 3, 
                backgroundColor: '#000',
                logging: true, // Enable logging to see CORS issues in console
                onclone: (clonedDoc) => {
                    // Ensure cloned images also have CORS
                    const images = clonedDoc.getElementsByTagName('img');
                    for (let i = 0; i < images.length; i++) {
                        images[i].crossOrigin = "anonymous";
                    }
                }
            });
            const link = document.createElement('a');
            link.download = `Creative-WTech-${course.title.replace(/\s+/g, '-')}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (error) {
            console.error('Error generating image:', error);
            alert('Erro ao gerar imagem. Verifique se as imagens externas permitem CORS.');
        } finally {
            setIsGenerating(false);
        }
    };

    const Template1_Performance = () => (
        <div className="relative w-full h-full bg-[#000000] overflow-hidden flex flex-col font-sans">
            {/* Background */}
            <InteractiveLayer id="bg" transform={getTransform('bg')} className="inset-0">
                <img src={getSafeUrl(fields.bgImage)} className="w-full h-full object-cover" alt="" crossOrigin="anonymous" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#000000] via-[#000000]/40 to-transparent"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-[#7F1D1D]/40 via-transparent to-transparent"></div>
            </InteractiveLayer>

            {/* Header Content */}
            <div className="relative z-10 p-8 flex flex-col items-center">
                <div className="flex justify-center w-full items-center mb-10">
                    <div className="h-10"></div>
                </div>
                <div className="text-center mt-4">
                    <p 
                        style={{ fontSize: getTextStyle('labelTop').fontSize, color: getTextStyle('labelTop').color }}
                        className="font-bold tracking-[0.2em] mb-2 uppercase"
                    >
                        {fields.labelTop}
                    </p>
                    <h1 
                        style={{ fontSize: getTextStyle('title').fontSize, color: getTextStyle('title').color }}
                        className="font-black italic tracking-tighter leading-[0.9] drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] uppercase"
                    >
                        {fields.title.split(' ').map((word, i) => (
                            <span key={i} className="block">{word}</span>
                        ))}
                    </h1>
                </div>
            </div>

            {/* Instructor Image */}
            <InteractiveLayer id="instructor" transform={getTransform('instructor')} className="bottom-32 w-[120%]">
                 <img src={getSafeUrl(fields.instructorPhoto)} className="w-full drop-shadow-[0_20px_50px_rgba(220,38,38,0.3)] select-none" alt="" crossOrigin="anonymous" />
            </InteractiveLayer>

            {/* Red Decorative Shapes */}
            <div className="absolute top-1/2 -right-20 w-80 h-80 bg-[#DC2626] rotate-45 opacity-60 blur-3xl rounded-full z-[5]"></div>
            <div className="absolute top-1/3 -left-40 w-80 h-80 bg-[#991B1B] rotate-12 opacity-40 blur-3xl z-[5]"></div>

            {/* Footer Content */}
            <div className="mt-auto relative z-30 p-8 pb-12 flex flex-col items-center">
                <div className="bg-[#991B1B]/80 backdrop-blur-md px-6 py-4 rounded-xl border border-[#DC2626]/30 flex items-center gap-4 mb-6 shadow-2xl">
                    <div className="bg-white/10 p-2 rounded-lg">
                        <Calendar className="text-white" size={24} />
                    </div>
                    <div>
                        <p 
                            style={{ fontSize: getTextStyle('info').fontSize, color: getTextStyle('info').color }}
                            className="font-black tracking-tighter"
                        >
                            {fields.date}
                        </p>
                        <p className="text-[#FECACA] text-[10px] font-bold uppercase tracking-widest">{fields.location}</p>
                    </div>
                </div>
                <div className="w-full flex flex-col gap-3">
                    <button 
                        style={{ fontSize: getTextStyle('cta').fontSize }}
                        className="bg-gradient-to-r from-[#DC2626] to-[#991B1B] text-white font-black py-5 rounded-2xl shadow-[0_10px_30px_rgba(220,38,38,0.4)] border border-[#DC2626]/50 uppercase tracking-widest"
                    >
                        <span style={{ color: getTextStyle('cta').color }}>{fields.cta}</span>
                    </button>
                    <div className="flex justify-between items-center px-4">
                        <span className="text-[#D4AF37] font-black text-sm italic">{fields.priceLabel}</span>
                        <span className="text-white/60 text-[10px] font-bold uppercase">{fields.phone}</span>
                    </div>
                </div>
            </div>
        </div>
    );

    const Template2_Experience = () => (
        <div className="relative w-full h-full bg-[#0a0a0a] overflow-hidden flex flex-col font-sans">
            <InteractiveLayer id="bg" transform={getTransform('bg')} className="inset-0">
                <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black opacity-80"></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-yellow-500/10 via-transparent to-transparent"></div>
            </InteractiveLayer>

            <div className="relative z-10 p-10 flex flex-col items-center">
                <div className="h-10 mb-16"></div>
                <p 
                    style={{ fontSize: getTextStyle('labelTop').fontSize, color: getTextStyle('labelTop').color }}
                    className="font-bold tracking-[0.3em] mb-2 uppercase"
                >
                    {fields.labelTop}
                </p>
                <h2 
                    style={{ fontSize: getTextStyle('title').fontSize, color: getTextStyle('title').color }}
                    className="font-black tracking-tight drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]"
                >
                    {fields.titleAlt}
                </h2>
            </div>

            <div className="relative mt-10 flex justify-center">
                <InteractiveLayer id="instructor" transform={getTransform('instructor')} className="w-72 h-72 rounded-full border-4 border-[#D4AF37]/30 p-2 shadow-[0_0_50px_rgba(212,175,55,0.2)]">
                    <div className="w-full h-full rounded-full overflow-hidden border-2 border-[#D4AF37]">
                        <img src={getSafeUrl(fields.instructorPhoto)} className="w-full h-full object-cover transition-all duration-700" alt="" crossOrigin="anonymous" />
                    </div>
                </InteractiveLayer>
                <div className="absolute -top-4 -right-2 bg-black/80 backdrop-blur-md border border-wtech-gold px-4 py-2 rounded-full flex items-center gap-2 shadow-xl z-30">
                     <Sparkles className="text-wtech-gold" size={14} />
                     <span className="text-white font-black text-xs uppercase tracking-tighter">Instrutor: {fields.instructor}</span>
                </div>
            </div>

            <div className="relative z-30 mt-auto p-10 flex flex-col items-center gap-8">
                <div className="text-center">
                    <p 
                        style={{ fontSize: getTextStyle('info').fontSize, color: getTextStyle('info').color }}
                        className="font-black tracking-tighter drop-shadow-lg"
                    >
                        {fields.date.split('/')[0]} <span className="text-2xl align-top block -mt-2">A {parseInt(fields.date.split('/')[0]) + 3}</span>
                    </p>
                    <p className="text-[#D4AF37] font-bold text-xl uppercase tracking-widest -mt-2">{fields.date.split('/')[1]}</p>
                    <p className="text-white/40 text-[10px] font-bold tracking-widest uppercase mt-1">{fields.location}</p>
                </div>
                <div className="bg-gradient-to-b from-[#D4AF37] to-yellow-600 p-[1px] rounded-xl w-full">
                    <div className="bg-black py-4 px-2 rounded-xl text-center">
                        <p className="text-[#D4AF37] font-black text-lg uppercase italic tracking-tighter">{fields.vagas}</p>
                    </div>
                </div>
                <div className="w-full">
                     <div className="text-white font-black text-center mb-4 italic tracking-widest">{fields.priceLabel}</div>
                     <div 
                         style={{ fontSize: getTextStyle('cta').fontSize }}
                         className="bg-white py-4 rounded-xl flex items-center justify-center font-black text-sm uppercase tracking-widest hover:bg-[#D4AF37] transition-colors cursor-pointer border-b-4 border-gray-300"
                     >
                         <span style={{ color: getTextStyle('cta').color }}>{fields.cta}</span>
                     </div>
                </div>
                <div className="flex gap-6 items-center opacity-60">
                    <img src={LOGO_MOTUL} className="h-4" crossOrigin="anonymous" />
                    <div className="h-4 w-px bg-white/20"></div>
                    <img src={LOGO_LIQUI_MOLY} className="h-3" crossOrigin="anonymous" />
                </div>
            </div>
        </div>
    );

    const Template3_Technical = () => (
        <div className="relative w-full h-full bg-[#050505] overflow-hidden flex flex-col font-sans">
             <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
             
             <InteractiveLayer id="bg" transform={getTransform('bg')} className="inset-0">
                 <img src={getSafeUrl(fields.instructorPhoto)} className="w-[120%] h-full object-cover object-left opacity-40 blur-[2px] scale-110" alt="" crossOrigin="anonymous" />
                 <div className="absolute inset-0 bg-gradient-to-r from-[#000000] via-[#000000]/80 to-transparent"></div>
                 <div className="absolute inset-0 bg-gradient-to-t from-[#000000] via-transparent to-transparent"></div>
             </InteractiveLayer>

             <div className="relative z-10 p-10 flex-1 flex flex-col">
                 <div className="flex items-start justify-between">
                     <div className="h-10"></div>
                     <div className="flex flex-col items-end gap-2">
                        {/* Removed broken technical logos */}
                     </div>
                 </div>
                 <div className="mt-20">
                    <p 
                        style={{ fontSize: getTextStyle('labelTop').fontSize, color: getTextStyle('labelTop').color }}
                        className="font-bold tracking-[0.2em] mb-4 uppercase flex items-center gap-2"
                    >
                        <Award size={14} /> {fields.labelTop}
                    </p>
                    <h2 
                        style={{ fontSize: getTextStyle('title').fontSize, color: getTextStyle('title').color }}
                        className="font-black leading-tight drop-shadow-2xl uppercase"
                    >
                        {fields.title.split(' ').map((word, i) => (
                            <span key={i} className="block last:text-gray-400">{word}</span>
                        ))}
                    </h2>
                 </div>
                 <div className="mt-10 max-w-[80%] border-l-4 border-[#D4AF37] pl-4 py-2">
                    <p 
                        style={{ fontSize: getTextStyle('subtitle').fontSize, color: getTextStyle('subtitle').color }}
                        className="leading-relaxed font-bold italic"
                    >
                        {fields.description}
                    </p>
                 </div>
                 <div className="mt-auto flex flex-col gap-8">
                     <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 border border-white/10 backdrop-blur-md p-4 rounded-2xl">
                            <p className="text-wtech-gold text-[10px] font-bold uppercase tracking-widest mb-1">Data</p>
                            <p className="text-white text-2xl font-black tracking-tighter">{fields.date}</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 backdrop-blur-md p-4 rounded-2xl">
                            <p className="text-wtech-gold text-[10px] font-bold uppercase tracking-widest mb-1">Cidade</p>
                            <p className="text-white text-md font-black tracking-tighter uppercase truncate leading-none mt-1">{fields.location.split('-')[0]}</p>
                        </div>
                     </div>
                     <div className="flex flex-col gap-4">
                        <div className="text-center text-white/40 uppercase font-black text-[10px] tracking-[0.3em]">{fields.address}</div>
                        <div className="bg-gradient-to-r from-red-600 to-red-900 py-5 rounded-full text-white font-black text-center text-md uppercase tracking-widest shadow-2xl relative overflow-hidden group">
                            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                            {fields.cta}
                        </div>
                        <div className="flex justify-center flex-col items-center gap-2">
                             <img src={LOGO_LIQUI_MOLY} className="h-8 grayscale opacity-50" crossOrigin="anonymous" />
                             <span className="text-white/30 text-[9px] font-bold uppercase tracking-widest">Apoio oficial</span>
                        </div>
                     </div>
                 </div>
             </div>
        </div>
    );

    const Template4_Minimal = () => (
        <div className="relative w-full h-full bg-white overflow-hidden flex flex-col font-sans">
            <InteractiveLayer id="bg" transform={getTransform('bg')} className="inset-0 grayscale opacity-10">
                <img src={getSafeUrl(fields.bgImage)} className="w-full h-full object-cover" alt="" crossOrigin="anonymous" />
            </InteractiveLayer>

            <div className="relative z-10 p-12 mt-20">
                <div className="w-12 h-1 bg-black mb-8"></div>
                <h1 
                    style={{ fontSize: getTextStyle('title').fontSize, color: getTextStyle('title').color }}
                    className="font-black tracking-tighter leading-none uppercase mb-4"
                >
                    {fields.title}
                </h1>
                <p 
                    style={{ fontSize: getTextStyle('subtitle').fontSize, color: getTextStyle('subtitle').color }}
                    className="font-bold tracking-[0.2em] uppercase mb-12"
                >
                    {fields.subtitle}
                </p>
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <Calendar className="text-[#D4AF37]" size={20} />
                        <span style={{ fontSize: getTextStyle('info').fontSize, color: getTextStyle('info').color }} className="font-black">
                            {fields.date}
                        </span>
                    </div>
                </div>
            </div>
            
            <InteractiveLayer id="instructor" transform={getTransform('instructor')} className="bottom-40 right-[-10%] w-[100%] h-[50%]">
                <img src={getSafeUrl(fields.instructorPhoto)} className="w-full h-full object-contain filter contrast-110 drop-shadow-2xl" alt="" crossOrigin="anonymous" />
            </InteractiveLayer>

            <div className="mt-auto p-12 relative z-30">
                <div className="bg-black text-white p-6 text-center font-black uppercase tracking-[0.2em] text-sm">
                    {fields.cta}
                </div>
            </div>
        </div>
    );

    const Template5_Impact = () => (
        <div className="relative w-full h-full bg-[#D4AF37] overflow-hidden flex flex-col font-sans">
            <InteractiveLayer id="bg" transform={getTransform('bg')} className="inset-0 opacity-20 mix-blend-multiply">
                <img src={getSafeUrl(fields.bgImage)} className="w-full h-full object-cover grayscale" crossOrigin="anonymous" />
            </InteractiveLayer>
            
            <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[30%] bg-black -rotate-6 z-1 shadow-2xl flex items-center justify-center pt-8">
                <h1 
                    style={{ fontSize: getTextStyle('labelTop').fontSize, color: getTextStyle('labelTop').color }}
                    className="font-black italic tracking-tighter uppercase"
                >
                    {fields.labelTop.split(' ')[0]}
                </h1>
            </div>
            
            <div className="relative z-10 p-10 flex flex-col h-full">
                <div className="mt-40 text-black">
                    <h2 
                        style={{ fontSize: getTextStyle('title').fontSize, color: getTextStyle('title').color }}
                        className="font-black leading-[0.8] tracking-tighter uppercase mb-4 drop-shadow-sm"
                    >
                        {fields.title}
                    </h2>
                    <p 
                        style={{ fontSize: getTextStyle('subtitle').fontSize, color: getTextStyle('subtitle').color }}
                        className="bg-[#000000] inline-block px-4 py-1 font-black italic uppercase tracking-tighter"
                    >
                        {fields.subtitle}
                    </p>
                </div>

                <InteractiveLayer id="instructor" transform={getTransform('instructor')} className="bottom-20 right-0 w-[110%]">
                    <img src={getSafeUrl(fields.instructorPhoto)} className="w-full drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]" crossOrigin="anonymous" />
                </InteractiveLayer>

                <div className="mt-auto relative z-20 flex flex-col gap-4">
                    <div className="bg-white p-6 rounded-none border-t-8 border-black shadow-2xl">
                        <div className="flex justify-between items-center mb-2">
                             <span style={{ fontSize: getTextStyle('info').fontSize, color: getTextStyle('info').color }} className="font-black tracking-tighter">{fields.date}</span>
                             <span className="bg-[#D4AF37] text-black px-2 py-0.5 font-black text-[10px] uppercase">{fields.location}</span>
                        </div>
                        <div className="text-black/60 text-[10px] font-bold uppercase tracking-widest">{fields.address}</div>
                    </div>
                    <div 
                        style={{ fontSize: getTextStyle('cta').fontSize, color: getTextStyle('cta').color }}
                        className="bg-[#000000] py-6 text-center font-black uppercase tracking-widest italic shadow-[10px_10px_0px_rgba(255,255,255,0.2)]"
                    >
                        {fields.cta}
                    </div>
                </div>
            </div>
        </div>
    );

    const Template6_Storytelling = () => (
        <div className="relative w-full h-full bg-[#111111] overflow-hidden flex flex-col font-sans">
            <InteractiveLayer id="bg" transform={getTransform('bg')} className="h-[45%] w-full">
                <img src={getSafeUrl(fields.bgImage)} className="w-full h-full object-cover" crossOrigin="anonymous" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#111111] via-transparent to-transparent"></div>
            </InteractiveLayer>

            <div className="px-10 py-6 relative z-[15] flex-1 flex flex-col">
                <div className="h-8 mb-4"></div>
                <div className="mt-12 flex gap-2 items-center mb-4">
                    <div className="h-0.5 w-8 bg-[#D4AF37]"></div>
                    <span 
                        style={{ fontSize: getTextStyle('labelTop').fontSize, color: getTextStyle('labelTop').color }}
                        className="font-black uppercase tracking-[0.3em]"
                    >
                        {fields.labelTop}
                    </span>
                </div>
                
                <h1 
                    style={{ fontSize: getTextStyle('title').fontSize, color: getTextStyle('title').color }}
                    className="font-black tracking-tight leading-none uppercase mb-6 drop-shadow-xl"
                >
                    {fields.title}
                </h1>
                
                <p 
                    style={{ fontSize: getTextStyle('subtitle').fontSize, color: getTextStyle('subtitle').color }}
                    className="text-lg font-medium leading-relaxed italic mb-8 border-l-2 border-white/20 pl-6"
                >
                    "{fields.subtitle}"
                </p>

                <div className="grid grid-cols-2 gap-2 mt-auto pb-10">
                    <div className="bg-white/5 p-4 rounded-3xl border border-white/5">
                        <Calendar className="text-[#D4AF37] mb-2" size={18} />
                        <p 
                            style={{ fontSize: getTextStyle('info').fontSize, color: getTextStyle('info').color }}
                            className="font-black tracking-tighter"
                        >
                            {fields.date}
                        </p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-3xl border border-white/5">
                        <MapPin className="text-[#D4AF37] mb-2" size={18} />
                        <p className="text-white font-bold text-xs uppercase truncate leading-none mt-1">{fields.location.split('-')[0]}</p>
                    </div>
                </div>

                <div 
                    style={{ fontSize: getTextStyle('cta').fontSize }}
                    className="bg-[#D4AF37] py-5 rounded-3xl flex items-center justify-center font-black text-center text-md uppercase tracking-widest shadow-[0_20px_40px_rgba(212,175,55,0.3)]"
                >
                    <span style={{ color: getTextStyle('cta').color }}>{fields.cta}</span>
                </div>
            </div>

            <InteractiveLayer id="instructor" transform={getTransform('instructor')} className="top-[25%] right-[-20%] w-[100%]">
                <img src={getSafeUrl(fields.instructorPhoto)} className="w-full drop-shadow-2xl" crossOrigin="anonymous" />
            </InteractiveLayer>
        </div>
    );

    const CustomLogoLayer = () => {
        if (!fields.logoCustom) return null;
        return (
            <InteractiveLayer 
                id="logo" 
                transform={getTransform('logo')} 
                className="w-auto h-auto min-w-[50px] min-h-[50px]"
            >
                <img src={getSafeUrl(fields.logoCustom)} className="max-w-[300px] h-auto object-contain" crossOrigin="anonymous" />
            </InteractiveLayer>
        );
    };

    const parseCustomCss = (cssString: string) => {
        const style: React.CSSProperties = {};
        if (!cssString) return style;
        
        try {
            const rules = cssString.split(';').filter(r => r.trim());
            rules.forEach(rule => {
                const parts = rule.split(':');
                if (parts.length >= 2) {
                    const prop = parts[0].trim();
                    const value = parts.slice(1).join(':').trim();
                    // simple dash-to-camel converter
                    const camelProp = prop.replace(/-([a-z])/g, g => g[1].toUpperCase());
                    (style as any)[camelProp] = value;
                }
            });
        } catch (e) {
            console.error('CSS Parse error', e);
        }
        return style;
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center lg:p-4 overflow-hidden animate-in fade-in duration-300 text-white">
            <div className="bg-[#111] w-full max-w-[1400px] h-full lg:h-[90vh] lg:rounded-3xl border border-white/10 flex flex-col lg:flex-row shadow-2xl relative overflow-hidden">
                <button onClick={onClose} className="absolute top-6 right-6 z-[110] p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all hover:rotate-90">
                    <X size={20} />
                </button>

                {/* Sidebar Controls */}
                <div className="w-full lg:w-[450px] bg-[#1a1a1a] border-r border-white/10 flex flex-col h-full overflow-hidden">
                    <div className="p-8 border-b border-white/5 flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <div className="p-3 bg-wtech-gold/20 rounded-2xl">
                                <Wand2 className="text-wtech-gold" size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-white italic tracking-tight uppercase">CREATIVE HUB</h2>
                                <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-0.5 tracking-tighter">Studio v3.0 • Drag & Resize Active</p>
                            </div>
                         </div>
                         <button 
                            onClick={() => setInteractiveMode(!interactiveMode)}
                            className={`p-2 rounded-xl border transition-all ${interactiveMode ? 'bg-wtech-gold text-black border-wtech-gold' : 'bg-white/5 text-white/40 border-white/5'}`}
                            title={interactiveMode ? "Desativar Arrastar" : "Ativar Arrastar"}
                         >
                            <Move size={20} />
                         </button>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex flex-wrap px-8 py-4 gap-2 bg-black/20 border-b border-white/5">
                        <button onClick={() => setActiveTab('content')} className={`flex-1 min-w-fit px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'content' ? 'bg-wtech-gold text-black' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>
                            <Type size={14} /> Conteúdo
                        </button>
                        <button onClick={() => setActiveTab('layers')} className={`flex-1 min-w-fit px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'layers' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>
                            <Layers size={14} /> Camadas
                        </button>
                        <button onClick={() => setActiveTab('visual')} className={`flex-1 min-w-fit px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'visual' ? 'bg-pink-600 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>
                            <Palette size={14} /> Estilo
                        </button>
                        <button onClick={saveDesignModel} className="flex-1 min-w-fit px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 bg-emerald-600 text-white hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/20">
                            <Download size={14} /> Salvar
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                        <AnimatePresence mode="wait">
                            {activeTab === 'content' && (
                                <motion.div 
                                    key="content"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="space-y-8"
                                >
                                    {/* Select Template */}
                                    <div>
                                        <label className="block text-white/50 text-[10px] font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                            <LayoutGrid size={12} /> Modelo de Design
                                        </label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {[
                                                { id: 'performance', label: 'Performance', color: 'bg-red-600' },
                                                { id: 'experience', label: 'Experience', color: 'bg-wtech-gold' },
                                                { id: 'technical', label: 'Technical', color: 'bg-gray-400' },
                                                { id: 'minimal', label: 'Minimal', color: 'bg-white' },
                                                { id: 'impact', label: 'Impact', color: 'bg-indigo-900' },
                                                { id: 'storytelling', label: 'Story', color: 'bg-orange-500' }
                                            ].map(t => (
                                                <button 
                                                    key={t.id}
                                                    onClick={() => setTemplate(t.id as TemplateId)}
                                                    className={`p-3 rounded-2xl border transition-all flex flex-col items-center gap-2 ${template === t.id ? 'bg-white/10 border-wtech-gold ring-1 ring-wtech-gold' : 'bg-white/5 border-white/5 hover:bg-white/10 opacity-60'}`}
                                                >
                                                    <div className={`w-8 h-8 rounded-full ${t.color} shadow-lg`}></div>
                                                    <span className="text-[10px] font-black uppercase text-white tracking-widest">{t.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Inputs */}
                                    <div className="space-y-4">
                                        <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                                            <label className="block text-[10px] text-white/40 font-bold uppercase mb-1">Título</label>
                                            <input className="bg-transparent w-full text-white font-bold outline-none border-b border-white/10 pb-1 focus:border-wtech-gold text-sm" value={fields.title} onChange={e => handleFieldChange('title', e.target.value)} />
                                        </div>
                                        <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                                            <label className="block text-[10px] text-white/40 font-bold uppercase mb-1">Subtítulo</label>
                                            <input className="bg-transparent w-full text-white font-bold outline-none border-b border-white/10 pb-1 focus:border-wtech-gold text-sm" value={fields.subtitle} onChange={e => handleFieldChange('subtitle', e.target.value)} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                                                <label className="block text-[10px] text-white/40 font-bold uppercase mb-1">Data</label>
                                                <input className="bg-transparent w-full text-white font-bold outline-none border-b border-white/10 pb-1 focus:border-wtech-gold text-sm" value={fields.date} onChange={e => handleFieldChange('date', e.target.value)} />
                                            </div>
                                            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                                                <label className="block text-[10px] text-white/40 font-bold uppercase mb-1">Local</label>
                                                <input className="bg-transparent w-full text-white font-bold outline-none border-b border-white/10 pb-1 focus:border-wtech-gold text-sm" value={fields.location} onChange={e => handleFieldChange('location', e.target.value)} />
                                            </div>
                                        </div>
                                        <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                                            <label className="block text-[10px] text-white/40 font-bold uppercase mb-1">CTA</label>
                                            <input className="bg-transparent w-full text-white font-bold outline-none border-b border-white/10 pb-1 focus:border-wtech-gold text-sm" value={fields.cta} onChange={e => handleFieldChange('cta', e.target.value)} />
                                        </div>
                                    </div>

                                    {/* Media & Assets */}
                                    <div className="space-y-4">
                                        <label className="block text-white/50 text-[10px] font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                            <ImageIcon size={12} /> Mídia & Assets
                                        </label>
                                        
                                        <div className="space-y-4">
                                            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                                                <label className="block text-[10px] text-white/40 font-bold uppercase mb-2">Foto do Instrutor (URL)</label>
                                                <input 
                                                    className="bg-transparent w-full text-white/60 font-medium outline-none border-b border-white/10 pb-1 text-[10px] truncate"
                                                    value={fields.instructorPhoto}
                                                    onChange={e => handleFieldChange('instructorPhoto', e.target.value)}
                                                />
                                            </div>
                                            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                                                <label className="block text-[10px] text-white/40 font-bold uppercase mb-2">Imagem de Fundo (URL)</label>
                                                <input 
                                                    className="bg-transparent w-full text-white/60 font-medium outline-none border-b border-white/10 pb-1 text-[10px] truncate"
                                                    value={fields.bgImage}
                                                    onChange={e => handleFieldChange('bgImage', e.target.value)}
                                                />
                                            </div>
                                            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                                                <label className="block text-[10px] text-white/40 font-bold uppercase mb-2">Logotipo Adicional (URL)</label>
                                                <input 
                                                    className="bg-transparent w-full text-white font-bold outline-none border-b border-white/10 pb-1 focus:border-wtech-gold text-xs"
                                                    placeholder="Cole o link do logotipo aqui..."
                                                    value={fields.logoCustom}
                                                    onChange={e => handleFieldChange('logoCustom', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'layers' && (
                                <motion.div 
                                    key="layers"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="space-y-8"
                                >
                                    {/* Layer Controller */}
                                    {['instructor', 'bg', 'logo'].map((layerId) => (
                                        <div key={layerId} className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-6">
                                            <div className="flex items-center justify-between mb-2">
                                                <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400 flex items-center gap-2">
                                                    {layerId === 'instructor' ? <User size={14} /> : layerId === 'bg' ? <ImageIcon size={14} /> : <Award size={14} />}
                                                    {layerId === 'instructor' ? 'Camada: Instrutor' : layerId === 'bg' ? 'Camada: Fundo' : 'Camada: Logotipo'}
                                                </h3>
                                                <div className="bg-white/10 px-2 py-1 rounded text-[10px] font-black">
                                                    Z-INDEX: {getTransform(layerId as any).zIndex}
                                                </div>
                                            </div>

                                            {/* Z-Index */}
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center text-[10px] font-bold uppercase text-white/40">
                                                    <span>Ordem de Camada (Z-Index)</span>
                                                    <span>{getTransform(layerId as any).zIndex}</span>
                                                </div>
                                                <input 
                                                    type="range" min="-10" max="100" step="1"
                                                    value={getTransform(layerId as any).zIndex}
                                                    onChange={e => handleTransformChange(layerId as any, 'zIndex', parseInt(e.target.value))}
                                                    className="w-full accent-indigo-500 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                                                />
                                            </div>

                                            {/* Position X/Y */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-center text-[10px] font-bold uppercase text-white/40">
                                                        <span>Eixo X</span>
                                                        <span>{getTransform(layerId as any).x}px</span>
                                                    </div>
                                                    <input 
                                                        type="range" min="-1000" max="1000" step="1"
                                                        value={getTransform(layerId as any).x}
                                                        onChange={e => handleTransformChange(layerId as any, 'x', parseInt(e.target.value))}
                                                        className="w-full accent-white/40 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-center text-[10px] font-bold uppercase text-white/40">
                                                        <span>Eixo Y</span>
                                                        <span>{getTransform(layerId as any).y}px</span>
                                                    </div>
                                                    <input 
                                                        type="range" min="-1000" max="1000" step="1"
                                                        value={getTransform(layerId as any).y}
                                                        onChange={e => handleTransformChange(layerId as any, 'y', parseInt(e.target.value))}
                                                        className="w-full accent-white/40 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                                                    />
                                                </div>
                                            </div>

                                            {/* Scale */}
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center text-[10px] font-bold uppercase text-white/40">
                                                    <span>Escala / Tamanho</span>
                                                    <span>{getTransform(layerId as any).scale.toFixed(2)}x</span>
                                                </div>
                                                <input 
                                                    type="range" min="0.01" max="5" step="0.01"
                                                    value={getTransform(layerId as any).scale}
                                                    onChange={e => handleTransformChange(layerId as any, 'scale', parseFloat(e.target.value))}
                                                    className="w-full accent-[#D4AF37] h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                                                />
                                            </div>

                                            {/* Custom CSS */}
                                            <div className="space-y-2">
                                                <label className="block text-[10px] font-black uppercase text-white/40 flex items-center gap-2">
                                                    <Code size={12} /> Personalizar CSS (Raw)
                                                </label>
                                                <textarea 
                                                    rows={2}
                                                    className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-[10px] font-mono text-indigo-300 outline-none focus:border-indigo-500/50"
                                                    placeholder="opacity: 0.5; filter: blur(5px);"
                                                    value={getTransform(layerId as any).customCss}
                                                    onChange={e => handleTransformChange(layerId as any, 'customCss', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </motion.div>
                            )}

                            {activeTab === 'visual' && (
                                <motion.div 
                                    key="visual"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="space-y-8"
                                >
                                    {/* Text Style Controller */}
                                    {['title', 'subtitle', 'labelTop', 'cta', 'info'].map((elementId) => (
                                        <div key={elementId} className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-6">
                                            <div className="flex items-center justify-between mb-2">
                                                <h3 className="text-xs font-black uppercase tracking-widest text-pink-400 flex items-center gap-2">
                                                    <Type size={14} /> Estilo: {
                                                        elementId === 'title' ? 'Título' : 
                                                        elementId === 'subtitle' ? 'Subtítulo' : 
                                                        elementId === 'labelTop' ? 'Etiqueta Topo' : 
                                                        elementId === 'cta' ? 'Botão' : 'Info (Data)'
                                                    }
                                                </h3>
                                            </div>

                                            {/* Font Size */}
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center text-[10px] font-bold uppercase text-white/40">
                                                    <span>Tamanho da Fonte</span>
                                                    <span>{getTextStyle(elementId as any).fontSize}px</span>
                                                </div>
                                                <input 
                                                    type="range" min="8" max="200" step="1"
                                                    value={getTextStyle(elementId as any).fontSize}
                                                    onChange={e => handleTextStyleChange(elementId as any, 'fontSize', parseInt(e.target.value))}
                                                    className="w-full accent-pink-500 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                                                />
                                            </div>

                                            {/* Color Picker (Simple Hex Input) */}
                                            <div className="space-y-2">
                                                <label className="block text-[10px] font-black uppercase text-white/40">Cor do Texto (HEX)</label>
                                                <div className="flex gap-3">
                                                    <input 
                                                        type="color" 
                                                        value={getTextStyle(elementId as any).color}
                                                        onChange={e => handleTextStyleChange(elementId as any, 'color', e.target.value)}
                                                        className="w-12 h-12 rounded-xl bg-transparent border-none cursor-pointer"
                                                    />
                                                    <input 
                                                        type="text" 
                                                        value={getTextStyle(elementId as any).color}
                                                        onChange={e => handleTextStyleChange(elementId as any, 'color', e.target.value)}
                                                        className="flex-1 bg-black/40 border border-white/5 rounded-xl px-4 text-xs font-mono uppercase"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="p-8 bg-[#111] border-t border-white/10 flex flex-col gap-4">
                        <button 
                            onClick={handleDownload}
                            disabled={isGenerating}
                            className="w-full bg-wtech-gold text-black font-black py-5 rounded-2xl flex items-center justify-center gap-3 shadow-[0_10px_40px_rgba(212,175,55,0.2)] hover:bg-yellow-500 transition-all uppercase tracking-widest disabled:opacity-50"
                        >
                            {isGenerating ? <RefreshCcw size={20} className="animate-spin" /> : <Download size={20} />}
                            {isGenerating ? 'RENDERIZANDO...' : 'BAIXAR CRIATIVO (PNG)'}
                        </button>
                    </div>
                </div>

                {/* Preview Area */}
                <div className="flex-1 bg-black p-4 lg:p-12 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none">
                         <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-red-600/10 blur-[120px] rounded-full"></div>
                         <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-600/10 blur-[120px] rounded-full"></div>
                    </div>

                    <motion.div 
                        layout
                        className="relative h-full max-h-[85vh] aspect-[9/16] shadow-[0_50px_100px_rgba(0,0,0,0.9)] rounded-3xl overflow-hidden bg-black ring-1 ring-white/10"
                    >
                         <div ref={canvasRef} className="w-full h-full">
                            {template === 'performance' && <Template1_Performance />}
                            {template === 'experience' && <Template2_Experience />}
                            {template === 'technical' && <Template3_Technical />}
                            {template === 'minimal' && <Template4_Minimal />}
                            {template === 'impact' && <Template5_Impact />}
                            {template === 'storytelling' && <Template6_Storytelling />}
                            <CustomLogoLayer />
                         </div>

                         <div className="absolute top-4 left-4 z-[99] px-4 py-1.5 bg-black/60 backdrop-blur-xl rounded-full border border-white/10 flex items-center gap-2">
                             <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                             <span className="text-white/60 text-[10px] font-black tracking-widest uppercase">HD PREVIEW • {template.toUpperCase()}</span>
                         </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};
