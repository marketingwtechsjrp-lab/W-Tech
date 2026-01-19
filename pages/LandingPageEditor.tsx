import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Course, LandingPage } from '../types';
import { X, Save, Plus, Trash2, Layout, Video, User, CheckSquare, Loader2, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';

interface LandingPageEditorProps {
    course: Course;
    onClose: () => void;
}

export const LandingPageEditor: React.FC<LandingPageEditorProps> = ({ course, onClose }) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'hero' | 'content' | 'instructor'>('hero');
    
    // Initial State Template
    const [lp, setLp] = useState<Partial<LandingPage>>({
        courseId: course.id,
        title: course.title,
        subtitle: 'Domine a arte da suspensão de motos com a metodologia W-Tech.',
        slug: course.title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''),
        heroImage: course.image || '',
        heroSecondaryImage: 'https://lp.w-techbrasil.com.br/wp-content/webp-express/webp-images/uploads/2025/09/boas-vindas-2.png.webp',
        benefits: [
            { title: 'Fundamentos Teóricos', description: 'Hidráulica, Mola, SAG, Atrito e Qualidade de Trabalho.' },
            { title: 'Técnica de Revalvulação', description: 'Aprenda a personalizar e preparar suspensões para alta performance.' },
            { title: 'Prática de Oficina', description: 'Montagem, desmontagem e dicas essenciais para o dia-a-dia.' },
            { title: 'Análise de Modelos', description: 'Variações entre suspensões atuais e tradicionais. Diagnóstico técnico.' },
            { title: 'Peças e Ferramentas', description: 'Acesso a projetos e desenvolvimentos próprios da W-Tech.' },
            { title: 'Seja um Credenciado', description: 'Tabela de preços exclusiva e suporte técnico contínuo para parceiros.' }
        ],
        modules: [
            { image: 'https://lp.w-techbrasil.com.br/wp-content/uploads/2025/09/SUSPENSOES-E-SEUS-MODELOS-VARIADOS.jpg.webp', title: 'SUSPENSÕES E SEUS MODELOS VARIADOS', description: 'Neste módulo introdutório, você aprenderá sobre os diferentes tipos de suspensão aplicados a motos off-road e de alta velocidade. Entenda como cada sistema funciona e qual é o mais adequado para cada terreno ou estilo de pilotagem' },
            { image: 'https://lp.w-techbrasil.com.br/wp-content/uploads/2025/09/MOLAS-E-SUAS-PARTICULARIDAS-768x512.jpg.webp', title: 'MOLAS E SUAS PROPRIEDADES', description: 'As molas são componentes fundamentais na suspensão. Neste módulo, você vai se aprofundar nas propriedades das molas e como elas impactam o desempenho e a estabilidade da moto em diferentes situações' },
            { image: 'https://lp.w-techbrasil.com.br/wp-content/uploads/2025/09/MECANICA-DOS-FLUIDOS-PARA-SUSPENSAO-768x512.jpg.webp', title: 'MECÂNICA DOS FLUIDOS PARA SUSPENSÃO', description: 'A suspensão hidráulica utiliza fluido para amortecer impactos. Neste módulo, você vai entender os princípios da mecânica dos fluidos e como eles influenciam o desempenho do sistema de suspensão' },
            { image: 'https://lp.w-techbrasil.com.br/wp-content/uploads/2025/09/SUSPENSOES-E-SEUS-MODELOS-VARIADOS.jpg.webp', title: 'PARAMETRIZAÇÃO DA SUSPENSÃO', description: 'Neste módulo, você aprenderá a parametrizar a suspensão de forma precisa, ajustando configurações para obter o melhor desempenho em diferentes condições e terrenos' },
            { image: 'https://lp.w-techbrasil.com.br/wp-content/uploads/2025/09/MOLAS-E-SUAS-PARTICULARIDAS-768x512.jpg.webp', title: 'ÓLEO E SUAS VISCOSIDADES', description: 'A escolha do óleo correto é fundamental para o bom funcionamento do sistema hidráulico. Neste módulo, você aprenderá sobre as diferentes viscosidades e como elas afetam o desempenho da suspensão' },
            { image: 'https://lp.w-techbrasil.com.br/wp-content/uploads/2025/09/MECANICA-DOS-FLUIDOS-PARA-SUSPENSAO-768x512.jpg.webp', title: 'FLUXOGRAMA DA VÁLVULA', description: 'Entender o funcionamento das válvulas no sistema de suspensão é crucial para ajustar corretamente o fluxo hidráulico. Neste módulo, você aprenderá sobre o fluxo de óleo e como ele é controlado pelas válvulas' }
        ],
        instructorName: 'Alex Crepaldi',
        instructorBio: 'Referência nacional em suspensões, Alex Crepaldi ensina as técnicas de acerto e ajuste em todos os modelos. Torne-se um profissional diferenciado ao associar-se à empresa líder no mercado nacional e desfrute de todas as vantagens de ser um credenciado W-Tech!',
        instructorImage: 'https://w-techbrasil.com.br/wp-content/uploads/2021/05/alex-crepaldi.jpg',
        whatsappNumber: '5511999999999',
        videoUrl: 'https://www.youtube.com/watch?v=RePclscnxDM'
    });

    useEffect(() => {
        fetchLandingPage();
    }, [course.id]);

    const fetchLandingPage = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('SITE_LandingPages')
            .select('*')
            .eq('course_id', course.id)
            .single();

        if (data) {
            setLp({
                ...data,
                courseId: data.course_id,
                heroImage: data.hero_image,
                heroSecondaryImage: data.hero_secondary_image,
                videoUrl: data.video_url || 'https://www.youtube.com/watch?v=RePclscnxDM',
                instructorName: data.instructor_name,
                instructorBio: data.instructor_bio,
                instructorImage: data.instructor_image,
                whatsappNumber: data.whatsapp_number,
                modules: data.modules || [], // Ensure array
                quizEnabled: data.quiz_enabled,
                fakeAlertsEnabled: data.fake_alerts_enabled
            });
        }
        setLoading(false);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const { data, error } = await supabase
                .from('SITE_LandingPages')
                .upsert({
                    course_id: course.id,
                    slug: lp.slug,
                    title: lp.title,
                    subtitle: lp.subtitle,
                    hero_image: lp.heroImage,
                    hero_secondary_image: lp.heroSecondaryImage,
                    video_url: lp.videoUrl,
                    benefits: lp.benefits,
                    modules: lp.modules,
                    instructor_name: lp.instructorName,
                    instructor_bio: lp.instructorBio,
                    instructor_image: lp.instructorImage,
                    whatsapp_number: lp.whatsappNumber,
                    quiz_enabled: lp.quizEnabled,
                    fake_alerts_enabled: lp.fakeAlertsEnabled
                }, { onConflict: 'course_id' })
                .select()
                .single();

            if (error) throw error;

            if (data) {
                setLp(prev => ({
                    ...prev,
                    ...data,
                    heroImage: data.hero_image,
                    heroSecondaryImage: data.hero_secondary_image,
                    videoUrl: data.video_url,
                    instructorName: data.instructor_name,
                    instructorBio: data.instructor_bio,
                    instructorImage: data.instructor_image,
                    whatsappNumber: data.whatsapp_number,
                    modules: data.modules,
                    quizEnabled: data.quiz_enabled,
                    fakeAlertsEnabled: data.fake_alerts_enabled
                }));
            }
            alert('Página salva com sucesso!');
        } catch (err: any) {
            console.error("Catch Error:", err);
            alert('Erro ao salvar: ' + (err.message || JSON.stringify(err)));
        } finally {
            setSaving(false);
        }
    };

    const updateBenefit = (index: number, field: string, value: string) => {
        const newBenefits = [...(lp.benefits || [])];
        newBenefits[index] = { ...newBenefits[index], [field]: value };
        setLp({ ...lp, benefits: newBenefits });
    };

    const addBenefit = () => {
        setLp({ ...lp, benefits: [...(lp.benefits || []), { title: 'Novo Benefício', description: 'Descrição...' }] });
    };

    const removeBenefit = (index: number) => {
        const newBenefits = [...(lp.benefits || [])];
        newBenefits.splice(index, 1);
        setLp({ ...lp, benefits: newBenefits });
    };
    
    // Modules Handlers
    const updateModule = (index: number, field: string, value: string) => {
        const newModules = [...(lp.modules || [])];
        newModules[index] = { ...newModules[index], [field]: value };
        setLp({ ...lp, modules: newModules });
    };

    const addModule = () => {
        setLp({ ...lp, modules: [...(lp.modules || []), { 
            title: 'Novo Módulo', 
            description: 'Descrição do módulo...',
            image: 'https://lp.w-techbrasil.com.br/wp-content/uploads/2025/09/SUSPENSOES-E-SEUS-MODELOS-VARIADOS.jpg.webp'
        }] });
    };

    const removeModule = (index: number) => {
        const newModules = [...(lp.modules || [])];
        newModules.splice(index, 1);
        setLp({ ...lp, modules: newModules });
    };

    if (loading) return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white p-8 rounded-lg flex items-center gap-4">
                <Loader2 className="animate-spin text-wtech-gold" /> Carregando editor...
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center backdrop-blur-sm p-4">
            <div className="bg-white text-gray-900 w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <Layout className="text-wtech-gold" /> Editor de Landing Page
                        </h2>
                        <p className="text-gray-500 text-sm">Editando página para: <span className="font-semibold text-black">{course.title}</span></p>
                    </div>
                    <div className="flex gap-3">
                         <a href={`#/lp/${lp.slug}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm">
                            <LinkIcon size={16} /> Visualizar
                        </a>
                        <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex flex-1 overflow-hidden">
                    
                    {/* Sidebar Tabs */}
                    <div className="w-64 bg-gray-50 border-r border-gray-100 p-4 space-y-2 shrink-0 overflow-y-auto">
                        <button onClick={() => setActiveTab('hero')} className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'hero' ? 'bg-black text-white shadow-lg' : 'text-gray-600 hover:bg-gray-200'}`}>
                            <Layout size={18} /> Hero & Capa
                        </button>
                        <button onClick={() => setActiveTab('content')} className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'content' ? 'bg-black text-white shadow-lg' : 'text-gray-600 hover:bg-gray-200'}`}>
                            <CheckSquare size={18} /> Conteúdo & Vídeo
                        </button>
                        <button onClick={() => setActiveTab('modules')} className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'modules' ? 'bg-black text-white shadow-lg' : 'text-gray-600 hover:bg-gray-200'}`}>
                            <Layout size={18} /> Módulos
                        </button>
                        <button onClick={() => setActiveTab('instructor')} className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'instructor' ? 'bg-black text-white shadow-lg' : 'text-gray-600 hover:bg-gray-200'}`}>
                            <User size={18} /> Instrutor
                        </button>
                    </div>

                    {/* Form Area */}
                    <div className="flex-1 p-8 overflow-y-auto">
                        
                        {activeTab === 'hero' && (
                            <div className="space-y-6 animate-fade-in">
                                <h3 className="text-xl font-bold border-b pb-2 mb-4">Informações Principais</h3>
                                {/* Existing fields */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-500 mb-1">Título da Página (H1)</label>
                                    <input className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-black outline-none transition-all" value={lp.title || ''} onChange={e => setLp({ ...lp, title: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-500 mb-1">Subtítulo (Headline)</label>
                                    <textarea rows={3} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-black outline-none transition-all" value={lp.subtitle || ''} onChange={e => setLp({ ...lp, subtitle: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-500 mb-1">URL Slug (ex: curso-bh)</label>
                                    <div className="flex items-center">
                                        <span className="p-3 bg-gray-100 border border-r-0 border-gray-200 text-gray-500 rounded-l-lg text-sm">w-tech.com/curso/</span>
                                        <input className="flex-1 bg-white border border-gray-200 p-3 rounded-r-lg focus:ring-2 focus:ring-black outline-none transition-all" value={lp.slug || ''} onChange={e => setLp({ ...lp, slug: e.target.value })} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-500 mb-1">Imagem de Capa (Background Hero)</label>
                                    <div className="flex gap-2">
                                        <input className="flex-1 bg-gray-50 border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-black outline-none transition-all" value={lp.heroImage || ''} onChange={e => setLp({ ...lp, heroImage: e.target.value })} placeholder="https://..." />
                                        {lp.heroImage && <img src={lp.heroImage} className="w-12 h-12 object-cover rounded shadow" alt="Preview" />}
                                    </div>
                                </div>
                                
                                {/* New Secondary Image Field */}
                                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Imagem de Boas Vindas (Substitui o Form no topo)</label>
                                    <p className="text-xs text-gray-500 mb-2">Esta imagem aparecerá à direita no topo da página. O formulário será movido para o final.</p>
                                    <div className="flex gap-2">
                                        <input className="flex-1 bg-white border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-black outline-none transition-all" value={lp.heroSecondaryImage || ''} onChange={e => setLp({ ...lp, heroSecondaryImage: e.target.value })} placeholder="https://..." />
                                        {lp.heroSecondaryImage && <img src={lp.heroSecondaryImage} className="w-12 h-12 object-cover rounded shadow" alt="Preview" />}
                                    </div>
                                </div>
                                
                                <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-between mt-4">
                                    <div>
                                        <h4 className="font-bold text-gray-800 flex items-center gap-2">
                                            <CheckSquare className="text-purple-600" size={18} /> Quiz Interativo de Qualificação
                                        </h4>
                                        <p className="text-xs text-gray-500 max-w-md">Ative para substituir o formulário padrão por um quiz de 5 perguntas que qualifica o lead (Frio, Morno, Quente).</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={lp.quizEnabled || false} onChange={e => setLp({ ...lp, quizEnabled: e.target.checked })} />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                                    </label>
                                </div>

                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between mt-4">
                                    <div>
                                        <h4 className="font-bold text-gray-800 flex items-center gap-2">
                                            <Layout className="text-blue-600" size={18} /> Notificações de Inscrição Fake
                                        </h4>
                                        <p className="text-xs text-gray-500 max-w-md">Ative para mostrar pequenos popups aleatórios de "Alguém acabou de se inscrever" para aumentar a prova social.</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={lp.fakeAlertsEnabled || false} onChange={e => setLp({ ...lp, fakeAlertsEnabled: e.target.checked })} />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>
                            </div>
                        )}

                        {activeTab === 'modules' && (
                             <div className="space-y-6 animate-fade-in">
                                <div className="flex items-center justify-between border-b pb-2 mb-4">
                                    <h3 className="text-xl font-bold">Módulos do Curso (Grid)</h3>
                                    <button onClick={addModule} className="text-sm bg-black text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-800"><Plus size={16} /> Adicionar Módulo</button>
                                </div>
                                
                                <div className="grid grid-cols-1 gap-6">
                                    {lp.modules?.map((mod, idx) => (
                                        <div key={idx} className="flex gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200 items-start">
                                            <div className="w-24 h-24 bg-gray-200 rounded-lg shrink-0 overflow-hidden border border-gray-300">
                                                 {mod.image ? <img src={mod.image} className="w-full h-full object-cover" /> : <ImageIcon className="w-full h-full p-6 text-gray-400" />}
                                            </div>
                                            <div className="flex-1 space-y-3">
                                                <div>
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Título</label>
                                                    <input className="w-full bg-white border border-gray-200 p-2 rounded font-bold" value={mod.title} onChange={e => updateModule(idx, 'title', e.target.value)} />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Descrição</label>
                                                    <textarea rows={2} className="w-full bg-white border border-gray-200 p-2 rounded text-sm text-gray-600" value={mod.description} onChange={e => updateModule(idx, 'description', e.target.value)} />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Imagem URL</label>
                                                    <input className="w-full bg-white border border-gray-200 p-2 rounded text-xs text-gray-500" value={mod.image} onChange={e => updateModule(idx, 'image', e.target.value)} />
                                                </div>
                                            </div>
                                            <button onClick={() => removeModule(idx)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                <Trash2 size={20} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'content' && (
                            <div className="space-y-6 animate-fade-in">
                                <h3 className="text-xl font-bold border-b pb-2 mb-4">Conteúdo e Benefícios (Checklist)</h3>
                                
                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                                    <label className="block text-sm font-bold text-gray-500 mb-1 flex items-center gap-2"><Video size={16} /> Vídeo de Vendas (Youtube URL)</label>
                                    <input className="w-full bg-white border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-black outline-none transition-all" value={lp.videoUrl || ''} onChange={e => setLp({ ...lp, videoUrl: e.target.value })} placeholder="https://youtube.com/watch?v=..." />
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <label className="block text-sm font-bold text-gray-500">Lista de Benefícios</label>
                                        <button onClick={addBenefit} className="text-xs bg-black text-white px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-gray-800"><Plus size={12} /> Adicionar Item</button>
                                    </div>
                                    <div className="space-y-4">
                                        {lp.benefits?.map((benefit, idx) => (
                                            <div key={idx} className="flex gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100 group">
                                                <div className="flex-1 space-y-2">
                                                    <input className="w-full bg-white border border-gray-200 p-2 rounded text-sm font-bold" value={benefit.title} placeholder="Título do Benefício" onChange={e => updateBenefit(idx, 'title', e.target.value)} />
                                                    <input className="w-full bg-white border border-gray-200 p-2 rounded text-sm text-gray-600" value={benefit.description} placeholder="Descrição curta" onChange={e => updateBenefit(idx, 'description', e.target.value)} />
                                                </div>
                                                <button onClick={() => removeBenefit(idx)} className="self-center p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'instructor' && (
                            <div className="space-y-6 animate-fade-in">
                                <h3 className="text-xl font-bold border-b pb-2 mb-4">Quem é o Instrutor?</h3>
                                <div>
                                    <label className="block text-sm font-bold text-gray-500 mb-1">Nome do Instrutor</label>
                                    <input className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-black outline-none transition-all" value={lp.instructorName || ''} onChange={e => setLp({ ...lp, instructorName: e.target.value })} />
                                </div>
                                <div className="flex gap-6">
                                    <div className="flex-1">
                                        <label className="block text-sm font-bold text-gray-500 mb-1">Biografia</label>
                                        <textarea rows={5} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-black outline-none transition-all" value={lp.instructorBio || ''} onChange={e => setLp({ ...lp, instructorBio: e.target.value })} />
                                    </div>
                                    <div className="w-1/3">
                                        <label className="block text-sm font-bold text-gray-500 mb-1">Foto (URL)</label>
                                        <div className="space-y-2">
                                            <input className="w-full bg-gray-50 border border-gray-200 p-2 rounded-lg text-sm" value={lp.instructorImage || ''} onChange={e => setLp({ ...lp, instructorImage: e.target.value })} placeholder="http://..." />
                                            <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden border border-gray-200">
                                                {lp.instructorImage ? <img src={lp.instructorImage} className="w-full h-full object-cover" /> : <ImageIcon className="text-gray-300" />}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                    </div>
                </div>

                {/* Footer Save Actions */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3 transition-colors">
                     <button onClick={onClose} className="px-6 py-3 rounded-lg font-bold text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors">
                         Cancelar
                     </button>
                     <button onClick={handleSave} disabled={saving} className="px-8 py-3 bg-black text-wtech-gold rounded-lg font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg flex items-center gap-2">
                         {saving ? <Loader2 className="animate-spin" /> : <Save size={18} />} Salvar Página
                     </button>
                </div>
            </div>
        </div>
    );
};
