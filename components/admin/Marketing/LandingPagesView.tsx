import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { Plus, Eye, TrendingUp, ArrowUpRight } from 'lucide-react';
import type { LandingPage } from '../../../types';

const LandingPagesView = ({ permissions }: { permissions?: any }) => {
    const [pages, setPages] = useState<LandingPage[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<Partial<LandingPage>>({});

    // Hardcoded System Links for easier access
    const systemLinks = [
        { label: 'Home (Início)', url: 'https://w-techbrasil.com.br/#/' },
        { label: 'Cursos & Agenda', url: 'https://w-techbrasil.com.br/#/courses' },
        { label: 'Mapa da Rede', url: 'https://w-techbrasil.com.br/#/mechanics-map' },
        { label: 'Blog', url: 'https://w-techbrasil.com.br/#/blog' },
        { label: 'Glossário Técnico', url: 'https://w-techbrasil.com.br/#/glossary' },
        { label: 'Página de Contato', url: 'https://w-techbrasil.com.br/#/contact' },
        { label: 'Cadastro de Mecânico', url: 'https://w-techbrasil.com.br/#/register-mechanic' },
        { label: 'Painel Admin', url: 'https://w-techbrasil.com.br/#/admin' },
    ];

    useEffect(() => {
        fetchPages();
    }, []);

    const fetchPages = async () => {
        const { data } = await supabase.from('SITE_LandingPages').select('*').order('created_at', { ascending: false });
        if (data) setPages(data.map((p: any) => ({
            ...p,
            heroHeadline: p.hero_headline,
            heroSubheadline: p.hero_subheadline,
            heroImage: p.hero_image,
            viewCount: p.view_count,
            conversionCount: p.conversion_count
        })));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            title: formData.title,
            slug: formData.slug,
            hero_headline: formData.heroHeadline,
            hero_subheadline: formData.heroSubheadline,
            hero_image: formData.heroImage,
            features: formData.features,
            status: formData.status || 'Draft'
        };

        if (formData.id) {
            await supabase.from('SITE_LandingPages').update(payload).eq('id', formData.id);
        } else {
            await supabase.from('SITE_LandingPages').insert([payload]);
        }
        setIsEditing(false);
        fetchPages();
        console.log("Sitemap update triggered automatically.");
    };

    if (isEditing) {
        return (
            <div className="bg-white p-6 rounded-lg shadow-sm text-gray-900 animate-in fade-in transition-all">
                <h2 className="text-xl font-bold mb-6 text-gray-900">{formData.id ? 'Editar LP' : 'Nova Landing Page'}</h2>
                <form onSubmit={handleSave} className="grid grid-cols-2 gap-6 text-gray-900">
                    <div>
                        <label className="block text-sm font-bold mb-1 text-gray-700">Título Interno</label>
                        <input className="w-full border border-gray-300 p-2 rounded text-gray-900 dark:bg-white" value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} required />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1 text-gray-700">Slug (URL)</label>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">w-tech.com/#/lp/</span>
                            <input className="flex-grow border border-gray-300 p-2 rounded text-gray-900 dark:bg-white" value={formData.slug || ''} onChange={e => setFormData({ ...formData, slug: e.target.value })} required />
                        </div>
                    </div>
                    <div className="col-span-2">
                        <label className="block text-sm font-bold mb-1 text-gray-700">Headline (Título Principal)</label>
                        <input className="w-full border border-gray-300 p-2 rounded text-gray-900 font-bold text-lg dark:bg-white" value={formData.heroHeadline || ''} onChange={e => setFormData({ ...formData, heroHeadline: e.target.value })} />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-sm font-bold mb-1 text-gray-700">Subheadline</label>
                        <textarea className="w-full border border-gray-300 p-2 rounded text-gray-900 dark:bg-white" rows={2} value={formData.heroSubheadline || ''} onChange={e => setFormData({ ...formData, heroSubheadline: e.target.value })} />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-sm font-bold mb-1 text-gray-700">Imagem de Capa (URL)</label>
                        <input className="w-full border border-gray-300 p-2 rounded text-gray-900 dark:bg-white" value={formData.heroImage || ''} onChange={e => setFormData({ ...formData, heroImage: e.target.value })} />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-sm font-bold mb-1 text-gray-700">Lista de Benefícios (Features)</label>
                        <p className="text-xs text-gray-500 mb-2">Separe itens por vírgula</p>
                        <textarea
                            className="w-full border border-gray-300 p-2 rounded text-gray-900 dark:bg-white"
                            rows={4}
                            value={Array.isArray(formData.features) ? formData.features.join(', ') : formData.features || ''}
                            onChange={e => setFormData({ ...formData, features: e.target.value.split(',').map(s => s.trim()) })}
                        />
                    </div>
                    <div className="col-span-2 flex justify-end gap-2">
                        <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 border rounded text-gray-700">Cancelar</button>
                        <button type="submit" className="px-4 py-2 bg-wtech-gold font-bold rounded">Salvar LP</button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div className="text-gray-900 animate-in fade-in transition-all">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold">Construtor de Landing Pages</h2>
                    <p className="text-xs text-gray-500">Crie páginas de alta conversão para campanhas específicas.</p>
                </div>
                <button onClick={() => { setFormData({}); setIsEditing(true); }} className="bg-wtech-gold text-black px-4 py-2 rounded font-bold flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <Plus size={18} /> Nova LP
                </button>
            </div>

            <div className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-bold text-gray-700 mb-2 text-sm uppercase">Links Internos do Sistema</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {systemLinks.map((link, idx) => (
                        <div key={idx} className="flex flex-col text-xs">
                            <span className="font-bold text-gray-900">{link.label}</span>
                            <code className="bg-gray-200 p-1 rounded mt-1 truncate hover:text-clip select-all cursor-pointer" title="Clique para selecionar">{link.url}</code>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pages.map(page => (
                    <div key={page.id} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                        <div className="h-32 bg-gray-200 relative">
                            {page.heroImage && <img src={page.heroImage} alt={page.title} className="w-full h-full object-cover" />}
                            <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-2 py-1 rounded text-[10px] font-bold uppercase">
                                {page.status}
                            </div>
                        </div>
                        <div className="p-4 flex-grow">
                            <h3 className="font-bold text-gray-900 mb-1">{page.title}</h3>
                            <p className="text-xs text-gray-500 mb-4 truncate">/lp/{page.slug}</p>

                            <div className="flex gap-4 text-xs text-gray-600 mb-4">
                                <span className="flex items-center gap-1"><Eye size={12} /> {page.viewCount} views</span>
                                <span className="flex items-center gap-1 text-green-600 font-bold"><TrendingUp size={12} /> {page.conversionCount} leads</span>
                            </div>
                        </div>
                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-2">
                            <button onClick={() => { setFormData(page); setIsEditing(true); }} className="flex-1 py-2 text-xs font-bold bg-white border border-gray-200 rounded hover:bg-gray-100 text-gray-700 transition-colors">Editar</button>
                            <a href={`/#/lp/${page.slug}`} target="_blank" rel="noopener noreferrer" className="flex-1 py-2 text-xs font-bold bg-wtech-black text-white rounded hover:bg-gray-800 text-center flex items-center justify-center gap-1 transition-colors">
                                Visualizar <ArrowUpRight size={10} />
                            </a>
                        </div>
                    </div>
                ))}
                {pages.length === 0 && (
                    <div className="col-span-full py-20 text-center text-gray-400 border-2 border-dashed border-gray-100 rounded-2xl">
                        Nenhuma Landing Page criada ainda.
                    </div>
                )}
            </div>
        </div>
    );
};

export default LandingPagesView;
