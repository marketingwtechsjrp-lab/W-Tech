import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { Save, Plus, Trash2, Layout, Image as ImageIcon, Link as LinkIcon, Instagram, Facebook, Linkedin, MessageCircle, Code, Eye, GraduationCap, ChevronUp, ChevronDown } from 'lucide-react';

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
    background_type: 'color' | 'image' | 'preset' | 'video';
    background_value: string; // Hex color, Image URL, or Preset ID
    background_opacity: number; // 0 to 100
    button_color: string;
    text_color: string;
}

const PRESETS = [
    { id: 'aurora', name: 'Aurora Boreal', preview: 'linear-gradient(45deg, #00cdac 0%, #009688 100%)' },
    { id: 'matrix', name: 'Matrix Digital', preview: '#000' },
    { id: 'neon_pulse', name: 'Neon Pulse', preview: '#111' },
    { id: 'particles', name: 'Partículas', preview: '#1a1a2e' },
    { id: 'ocean', name: 'Oceano Profundo', preview: 'linear-gradient(to top, #1e3c72 0%, #2a5298 100%)' },
    { id: 'sunset', name: 'Pôr do Sol', preview: 'linear-gradient(to top, #ff0844 0%, #ffb199 100%)' },
];

const BioPageManager = () => {
    // Helper to extract YouTube ID
    const getYouTubeId = (url: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const [config, setConfig] = useState<BioConfig>({
        logo_url: '',
        title: 'W-TECH',
        description: 'Elite da Tecnologia Automotiva',
        links: [],
        show_latest_courses: true,
        whatsapp: '',
        instagram: '',
        facebook: '',
        linkedin: '',
        custom_html: '',
        background_type: 'color',
        background_value: '#111111',
        background_opacity: 0,
        button_color: '#D4AF37',
        text_color: '#FFFFFF'
    });
    const [activeBgTab, setActiveBgTab] = useState<'color' | 'image' | 'preset' | 'video'>('color');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchBioConfig();
    }, []);

    const fetchBioConfig = async () => {
        const { data } = await supabase.from('SITE_SystemSettings').select('*').eq('key', 'bio_config').maybeSingle();
        if (data) {
            try {
                const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
                setConfig(prev => ({ ...prev, ...parsed }));
            } catch (e) {
                console.error("Failed to parse bio_config", e);
            }
        }
        setLoading(false);
    };

    const handleSave = async () => {
        setSaving(true);
        const { error } = await supabase.from('SITE_SystemSettings').upsert({
            key: 'bio_config',
            value: JSON.stringify(config)
        }, { onConflict: 'key' });

        if (error) {
            alert('Erro ao salvar: ' + error.message);
        } else {
            alert('Página de BIO salva com sucesso!');
        }
        setSaving(false);
    };

    const addLink = () => {
        const newLink: BioLink = {
            id: Math.random().toString(36).substr(2, 9),
            title: 'Novo Link',
            url: 'https://',
            type: 'normal'
        };
        setConfig(prev => ({ ...prev, links: [...prev.links, newLink] }));
    };

    const removeLink = (id: string) => {
        setConfig(prev => ({ ...prev, links: prev.links.filter(l => l.id !== id) }));
    };

    const updateLink = (id: string, field: keyof BioLink, value: string) => {
        setConfig(prev => ({
            ...prev,
            links: prev.links.map(l => l.id === id ? { ...l, [field]: value } : l)
        }));
    };

    const moveLink = (index: number, direction: 'up' | 'down') => {
        const newLinks = [...config.links];
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= newLinks.length) return;
        [newLinks[index], newLinks[newIndex]] = [newLinks[newIndex], newLinks[index]];
        setConfig(prev => ({ ...prev, links: newLinks }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-wtech-gold"></div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-gray-900 animate-in fade-in transition-all">
            {/* Editor Side */}
            <div className="space-y-8 h-[calc(100vh-200px)] overflow-y-auto pr-4 custom-scrollbar">
                <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm sticky top-0 z-10">
                    <div>
                        <h2 className="text-xl font-bold">Configurador de Bio</h2>
                        <p className="text-xs text-gray-500">Personalize sua página de links para redes sociais.</p>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-wtech-gold text-black px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all"
                    >
                        {saving ? 'Salvando...' : <><Save size={18} /> Salvar Alterações</>}
                    </button>
                </div>

                {/* General Section */}
                <section className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
                    <h3 className="font-bold border-b pb-2 flex items-center gap-2 text-gray-800"><Layout size={18} className="text-blue-500" /> Identidade Visual</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">URL do Logo</label>
                            <div className="flex gap-2">
                                <input
                                    className="flex-grow border border-gray-300 p-2 rounded text-sm dark:bg-white"
                                    value={config.logo_url}
                                    onChange={e => setConfig({ ...config, logo_url: e.target.value })}
                                />
                                <div className="w-10 h-10 bg-gray-100 rounded border flex items-center justify-center overflow-hidden">
                                    {config.logo_url ? <img src={config.logo_url} alt="Logo preview" className="max-h-full max-w-full" /> : <ImageIcon size={20} className="text-gray-300" />}
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Título da Página</label>
                            <input
                                className="w-full border border-gray-300 p-2 rounded text-sm dark:bg-white"
                                value={config.title}
                                onChange={e => setConfig({ ...config, title: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Bio / Descrição</label>
                            <input
                                className="w-full border border-gray-300 p-2 rounded text-sm dark:bg-white"
                                value={config.description}
                                onChange={e => setConfig({ ...config, description: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 border-t pt-4 mt-2">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Cor dos Botões</label>
                            <div className="flex items-center gap-2">
                                <input type="color" value={config.button_color} onChange={e => setConfig({ ...config, button_color: e.target.value })} className="w-8 h-8 rounded border-0" />
                                <span className="text-[10px] font-mono">{config.button_color}</span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Cor do Texto</label>
                            <div className="flex items-center gap-2">
                                <input type="color" value={config.text_color} onChange={e => setConfig({ ...config, text_color: e.target.value })} className="w-8 h-8 rounded border-0" />
                                <span className="text-[10px] font-mono">{config.text_color}</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Background Section */}
                <section className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
                    <h3 className="font-bold border-b pb-2 flex items-center gap-2 text-gray-800"><ImageIcon size={18} className="text-purple-500" /> Fundo & Aparência</h3>
                    
                    {/* Background Tabs */}
                    <div className="flex bg-gray-100 p-1 rounded-lg mb-4">
                        <button onClick={() => { setActiveBgTab('color'); setConfig({ ...config, background_type: 'color', background_value: '#111111' }); }} className={`flex-1 py-1 text-xs font-bold rounded ${activeBgTab === 'color' ? 'bg-white shadow text-black' : 'text-gray-500'}`}>Cor</button>
                        <button onClick={() => { setActiveBgTab('image'); setConfig({ ...config, background_type: 'image', background_value: '' }); }} className={`flex-1 py-1 text-xs font-bold rounded ${activeBgTab === 'image' ? 'bg-white shadow text-black' : 'text-gray-500'}`}>Imagem</button>
                        <button onClick={() => { setActiveBgTab('video'); setConfig({ ...config, background_type: 'video', background_value: '' }); }} className={`flex-1 py-1 text-xs font-bold rounded ${activeBgTab === 'video' ? 'bg-white shadow text-black' : 'text-gray-500'}`}>Vídeo</button>
                        <button onClick={() => { setActiveBgTab('preset'); setConfig({ ...config, background_type: 'preset', background_value: 'aurora' }); }} className={`flex-1 py-1 text-xs font-bold rounded ${activeBgTab === 'preset' ? 'bg-white shadow text-black' : 'text-gray-500'}`}>Animado</button>
                    </div>

                    {activeBgTab === 'color' && (
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Selecione a Cor</label>
                            <div className="flex items-center gap-2">
                                <input type="color" value={config.background_type === 'color' ? config.background_value : '#111111'} onChange={e => setConfig({ ...config, background_type: 'color', background_value: e.target.value })} className="w-full h-10 rounded border cursor-pointer" />
                            </div>
                        </div>
                    )}

                    {activeBgTab === 'image' && (
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">URL da Imagem</label>
                            <div className="flex gap-2">
                                <input 
                                    className="flex-grow border border-gray-300 p-2 rounded text-sm dark:bg-white" 
                                    placeholder="https://..." 
                                    value={config.background_type === 'image' ? config.background_value : ''} 
                                    onChange={e => setConfig({ ...config, background_type: 'image', background_value: e.target.value })} 
                                />
                                <div className="w-10 h-10 bg-gray-100 rounded border flex items-center justify-center overflow-hidden">
                                     {config.background_type === 'image' && config.background_value ? <img src={config.background_value} className="w-full h-full object-cover" /> : <ImageIcon size={20} className="text-gray-300" />}
                                </div>
                            </div>
                            <div className="mt-4">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Opacidade da Sobreposição (Escura)</label>
                                <input 
                                    type="range" 
                                    min="0" 
                                    max="90" 
                                    step="10"
                                    value={config.background_opacity || 0} 
                                    onChange={e => setConfig({ ...config, background_opacity: Number(e.target.value) })} 
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                />
                                <div className="text-xs text-right text-gray-400 mt-1">{config.background_opacity || 0}%</div>
                            </div>
                        </div>
                    )}

                    {activeBgTab === 'video' && (
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">URL do Vídeo (YouTube ou MP4)</label>
                            <input 
                                className="w-full border border-gray-300 p-2 rounded text-sm dark:bg-white mb-2" 
                                placeholder="https://youtu.be/... ou https://.../video.mp4" 
                                value={config.background_type === 'video' ? config.background_value : ''} 
                                onChange={e => setConfig({ ...config, background_type: 'video', background_value: e.target.value })} 
                            />
                            <p className="text-[10px] text-gray-400 mb-4">Suporta links do YouTube ou arquivos diretos (.mp4).</p>
                            
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Opacidade da Sobreposição (Escura)</label>
                                <input 
                                    type="range" 
                                    min="0" 
                                    max="90" 
                                    step="10"
                                    value={config.background_opacity || 0} 
                                    onChange={e => setConfig({ ...config, background_opacity: Number(e.target.value) })} 
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                />
                                <div className="text-xs text-right text-gray-400 mt-1">{config.background_opacity || 0}%</div>
                            </div>
                        </div>
                    )}

                    {activeBgTab === 'preset' && (
                        <div className="grid grid-cols-3 gap-2">
                            {PRESETS.map(preset => (
                                <button
                                    key={preset.id}
                                    onClick={() => setConfig({ ...config, background_type: 'preset', background_value: preset.id })}
                                    className={`relative h-16 rounded-lg overflow-hidden border-2 transition-all ${config.background_type === 'preset' && config.background_value === preset.id ? 'border-wtech-gold scale-105 shadow-md' : 'border-transparent opacity-70 hover:opacity-100'}`}
                                >
                                    <div className="absolute inset-0" style={{ background: preset.preview }}></div>
                                    <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-[8px] text-white py-0.5 text-center font-bold truncate">{preset.name}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </section>

                {/* Links Section */}
                <section className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
                    <div className="flex justify-between items-center border-b pb-2">
                        <h3 className="font-bold flex items-center gap-2 text-gray-800"><LinkIcon size={18} className="text-green-500" /> Links & Botões</h3>
                        <button onClick={addLink} className="text-[10px] font-bold bg-black text-white px-2 py-1 rounded-lg uppercase flex items-center gap-1 hover:bg-gray-800">
                            <Plus size={14} /> Adicionar Link
                        </button>
                    </div>

                    <div className="space-y-3">
                        {config.links.map((link, idx) => (
                            <div key={link.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200 group">
                                <div className="flex items-center gap-4 mb-3">
                                    <div className="flex flex-col gap-1">
                                        <button onClick={() => moveLink(idx, 'up')} disabled={idx === 0} className="p-0.5 hover:bg-gray-200 rounded disabled:opacity-30"><ChevronUp size={14} /></button>
                                        <button onClick={() => moveLink(idx, 'down')} disabled={idx === config.links.length - 1} className="p-0.5 hover:bg-gray-200 rounded disabled:opacity-30"><ChevronDown size={14} /></button>
                                    </div>
                                    <div className="flex-grow grid grid-cols-2 gap-3">
                                        <input
                                            className="border border-gray-300 p-2 rounded text-xs font-bold dark:bg-white"
                                            placeholder="Título do Link"
                                            value={link.title}
                                            onChange={e => updateLink(link.id, 'title', e.target.value)}
                                        />
                                        <input
                                            className="border border-gray-300 p-2 rounded text-xs font-mono dark:bg-white"
                                            placeholder="URL (https://...)"
                                            value={link.url}
                                            onChange={e => updateLink(link.id, 'url', e.target.value)}
                                        />
                                    </div>
                                    <button onClick={() => removeLink(link.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                                </div>
                                <div className="flex gap-4 items-center">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Estilo:</label>
                                    <div className="flex gap-2">
                                        {['normal', 'prominent', 'highlight'].map(type => (
                                            <button
                                                key={type}
                                                onClick={() => updateLink(link.id, 'type', type as any)}
                                                className={`text-[9px] px-2 py-1 rounded border font-bold uppercase transition-all ${link.type === type ? 'bg-wtech-black text-white border-black' : 'bg-white text-gray-500 border-gray-200'}`}
                                            >
                                                {type === 'normal' ? 'Padrão' : type === 'prominent' ? 'Destaque' : 'Brilhante'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Courses Section */}
                <section className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
                    <div className="flex justify-between items-center border-b pb-2">
                        <h3 className="font-bold flex items-center gap-2 text-gray-800"><GraduationCap size={18} className="text-wtech-gold" /> Cursos Dinâmicos</h3>
                        <label className="flex items-center cursor-pointer">
                            <input type="checkbox" checked={config.show_latest_courses} onChange={e => setConfig({ ...config, show_latest_courses: e.target.checked })} className="sr-only peer" />
                            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-wtech-gold relative"></div>
                        </label>
                    </div>
                    <p className="text-xs text-gray-500">Quando ativo, mostra automaticamente os últimos 3 cursos programados na plataforma.</p>
                </section>

                {/* Social Media Section */}
                <section className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
                    <h3 className="font-bold border-b pb-2 flex items-center gap-2 text-gray-800"><Instagram size={18} className="text-pink-500" /> Redes Sociais (Rodapé)</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                            <MessageCircle size={16} className="text-green-500" />
                            <input className="flex-grow border border-gray-300 p-2 rounded text-xs dark:bg-white" placeholder="Whats (5511...)" value={config.whatsapp} onChange={e => setConfig({ ...config, whatsapp: e.target.value })} />
                        </div>
                        <div className="flex items-center gap-2">
                            <Instagram size={16} className="text-pink-500" />
                            <input className="flex-grow border border-gray-300 p-2 rounded text-xs dark:bg-white" placeholder="Instagram URL" value={config.instagram} onChange={e => setConfig({ ...config, instagram: e.target.value })} />
                        </div>
                        <div className="flex items-center gap-2">
                            <Facebook size={16} className="text-blue-600" />
                            <input className="flex-grow border border-gray-300 p-2 rounded text-xs dark:bg-white" placeholder="Facebook URL" value={config.facebook} onChange={e => setConfig({ ...config, facebook: e.target.value })} />
                        </div>
                        <div className="flex items-center gap-2">
                            <Linkedin size={16} className="text-blue-700" />
                            <input className="flex-grow border border-gray-300 p-2 rounded text-xs dark:bg-white" placeholder="LinkedIn URL" value={config.linkedin} onChange={e => setConfig({ ...config, linkedin: e.target.value })} />
                        </div>
                    </div>
                </section>

                {/* Custom HTML Section */}
                <section className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
                    <h3 className="font-bold border-b pb-2 flex items-center gap-2 text-gray-800"><Code size={18} className="text-gray-600" /> HTML Personalizado</h3>
                    <textarea
                        className="w-full h-32 border border-gray-300 p-3 rounded font-mono text-xs dark:bg-white"
                        placeholder="<div>Adicione código HTML customizado aqui...</div>"
                        value={config.custom_html}
                        onChange={e => setConfig({ ...config, custom_html: e.target.value })}
                    />
                </section>
            </div>

            {/* Preview Side */}
            <div className="flex flex-col h-[calc(100vh-200px)]">
                <div className="flex items-center gap-2 mb-4 px-2">
                    <Eye size={18} className="text-gray-400" />
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Pré-visualização Mobile</span>
                    <div className="flex-grow h-px bg-gray-100 ml-4"></div>
                </div>

                <div className="flex-grow flex justify-center bg-gray-50 rounded-2xl border-4 border-gray-200 p-4 relative overflow-hidden">
                    {/* Mock Phone Frame */}
                    <div
                        className="w-[320px] h-full bg-black rounded-[40px] border-[8px] border-gray-900 shadow-2xl relative overflow-y-auto custom-scrollbar flex flex-col items-center p-6 text-center transition-all bg-cover bg-center z-0"
                        style={{ 
                            backgroundColor: config.background_type === 'color' ? config.background_value : '#000',
                            backgroundImage: config.background_type === 'image' ? `url(${config.background_value})` : 'none',
                            color: config.text_color
                        }}
                    >
                         {/* Overlay for Image/Video Opacity */}
                         {(config.background_type === 'image' || config.background_type === 'video') && (
                                <div className="absolute inset-0 pointer-events-none -z-10" style={{ backgroundColor: `rgba(0,0,0,${(config.background_opacity || 0) / 100})` }}></div>
                         )}

                         {/* Video Background Element (YouTube or Direct) */}
                         {config.background_type === 'video' && (
                            <>
                                {getYouTubeId(config.background_value) ? (
                                    <div className="absolute inset-0 -z-20 pointer-events-none overflow-hidden block">
                                        <iframe
                                            className="absolute top-1/2 left-1/2 w-[300%] h-[150%] -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                                            src={`https://www.youtube.com/embed/${getYouTubeId(config.background_value)}?autoplay=1&mute=1&controls=0&loop=1&playlist=${getYouTubeId(config.background_value)}&playsinline=1&showinfo=0&rel=0&iv_load_policy=3&disablekb=1&fs=0`}
                                            title="bg"
                                            frameBorder="0"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            style={{ filter: 'brightness(1.2)' }}
                                        />
                                    </div>
                                ) : (
                                    <video 
                                        className="absolute inset-0 w-full h-full object-cover -z-20"
                                        src={config.background_value}
                                        autoPlay 
                                        loop 
                                        muted 
                                        playsInline
                                    />
                                )}
                            </>
                         )}

                         {/* Preset Overlay with Z-Index fix */}
                            {config.background_type === 'preset' && (
                                <div className="absolute inset-0 -z-30" style={{
                                    background: PRESETS.find(p => p.id === config.background_value)?.preview || '#000'
                                }}></div>
                            )}

                        {/* Logo */}
                        <div className="w-24 h-24 flex items-center justify-center mb-4 mt-6">
                            {config.logo_url ? <img src={config.logo_url} className="max-h-full max-w-full object-contain" /> : <div className="w-12 h-12 bg-gray-800 rounded mx-auto" />}
                        </div>

                        {/* Text */}
                        <h1 className="text-lg font-bold mb-1" style={{ color: config.text_color }}>{config.title}</h1>
                        <p className="text-xs opacity-70 mb-8" style={{ color: config.text_color }}>{config.description}</p>

                        {/* Static Links */}
                        <div className="w-full space-y-3 mb-6">
                            {config.links.map(link => (
                                <div
                                    key={link.id}
                                    className={`w-full py-3 px-4 rounded-xl text-sm font-bold shadow-sm transition-all border ${link.type === 'normal' ? 'border-transparent' : link.type === 'prominent' ? 'border-white/20' : 'border-wtech-gold animate-pulse'}`}
                                    style={{
                                        backgroundColor: config.button_color,
                                        color: '#000',
                                        transform: link.type === 'highlight' ? 'scale(1.02)' : 'none'
                                    }}
                                >
                                    {link.title}
                                </div>
                            ))}
                        </div>

                        {/* Courses (Static Mock) */}
                        {config.show_latest_courses && (
                            <div className="w-full space-y-3 mb-6">
                                <div className="text-[10px] font-bold uppercase tracking-widest opacity-50 text-left mb-1">Cursos & Agenda</div>
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="w-full h-12 bg-white/5 rounded-xl flex items-center gap-3 p-3 border border-white/5">
                                        <div className="w-6 h-6 rounded bg-wtech-gold/20 flex items-center justify-center text-wtech-gold"><GraduationCap size={14} /></div>
                                        <div className="text-left flex-grow">
                                            <div className="text-[10px] font-bold">Curso de Injeção Eletrônica #{i}</div>
                                            <div className="text-[8px] opacity-60">15 de Maio - São Paulo</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Custom HTML */}
                        {config.custom_html && (
                            <div className="w-full text-xs text-left mb-8 opacity-90" dangerouslySetInnerHTML={{ __html: config.custom_html }} />
                        )}

                        {/* Footer Socials */}
                        <div className="mt-auto flex gap-6 pb-6">
                            {config.whatsapp && <MessageCircle size={20} className="hover:scale-110 transition-transform opacity-70" />}
                            {config.instagram && <Instagram size={20} className="hover:scale-110 transition-transform opacity-70" />}
                            {config.facebook && <Facebook size={20} className="hover:scale-110 transition-transform opacity-70" />}
                            {config.linkedin && <Linkedin size={20} className="hover:scale-110 transition-transform opacity-70" />}
                        </div>
                    </div>
                </div>

                <div className="mt-4 p-4 bg-yellow-50 rounded-xl border border-yellow-100 flex items-center gap-3">
                    <div className="bg-yellow-500 text-white p-2 rounded-lg"><Layout size={16} /></div>
                    <p className="text-[10px] text-yellow-800 leading-tight">
                        <strong>Link da BIO:</strong> Sua página estará disponível em <code className="bg-white px-1 py-0.5 rounded ml-1 font-bold">/bio</code> após salvar e publicar.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default BioPageManager;
