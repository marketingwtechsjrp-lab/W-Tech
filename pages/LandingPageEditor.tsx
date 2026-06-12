import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Course, LandingPage } from '../types';
import { X, Save, Plus, Trash2, Layout, Video, User, CheckSquare, Loader2, Link as LinkIcon, Image as ImageIcon, Layers, Sparkles, Check, MessageSquare, ArrowUp, ArrowDown, Star } from 'lucide-react';

interface LandingPageEditorProps {
    course: Course;
    onClose: () => void;
}

/** Rota pública de cada template (v1 → /lp, v2..v8 → /lp2../lp8). */
const lpPathOf = (t?: string) => (!t || t === 'v1' ? 'lp' : `lp${t.replace('v', '')}`);

/** Nome de exibição de cada template (usado em badges/avisos). */
const TEMPLATE_DISPLAY: Record<string, string> = {
    v1: 'Classic Dark', v2: 'Premium Cinematic', v3: 'White Clean', v4: 'Classic Light',
    v5: 'Gold Brutal', v6: 'Carbon Racing', v7: 'Editorial Light', v8: 'Swiss Tech'
};

export const LandingPageEditor: React.FC<LandingPageEditorProps> = ({ course, onClose }) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [launching, setLaunching] = useState(false);

    /**
     * Lançamento por região: consulta o público (dry run), confirma com o
     * usuário e dispara a cadência de e-mails para os leads da base com a
     * cidade/estado do curso (inclui leads perdidos, para reaquecimento).
     */
    const handleLaunchCampaign = async () => {
        setLaunching(true);
        try {
            const preview = await fetch('/api/launch-course-campaign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ courseId: course.id, dryRun: true })
            }).then(r => r.json());

            if (!preview.ok) {
                alert('Não foi possível montar o público: ' + (preview.error || 'erro desconhecido'));
                return;
            }
            const go = window.confirm(
                `Lançamento "${preview.course}" — ${preview.city}${preview.state ? '/' + preview.state : ''}\n\n` +
                `Público encontrado na base: ${preview.audienceTotal} contatos\n` +
                ` • Mesma cidade: ${preview.cityMatches}\n` +
                ` • Mesmo estado: ${preview.stateMatches}\n` +
                ` • Leads perdidos (reaquecimento): ${preview.lostIncluded}\n\n` +
                `Será criada uma cadência de 3 e-mails (anúncio, prova social e última chamada) apontando para:\n${preview.lpUrl}\n\n` +
                `Confirmar o lançamento?`
            );
            if (!go) return;

            const result = await fetch('/api/launch-course-campaign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ courseId: course.id })
            }).then(r => r.json());

            if (result.ok) {
                alert(`✅ Lançamento criado!\n\n${result.enrolled} contatos entraram na cadência "${'Lançamento — ' + result.course}".\nOs e-mails saem pelo processador diário de fluxos (requer Brevo ativo).`);
            } else {
                alert('Falha no lançamento: ' + (result.error || 'erro desconhecido'));
            }
        } catch (err: any) {
            alert('Erro ao lançar campanha: ' + err.message);
        } finally {
            setLaunching(false);
        }
    };
    const [activeTab, setActiveTab] = useState<'template' | 'hero' | 'content' | 'modules' | 'instructor' | 'testimonials'>('template');
    
    // Initial State Template
    const [lp, setLp] = useState<Partial<LandingPage>>({
        courseId: course.id,
        title: course.title,
        subtitle: 'Domine a arte da suspensão de motos com a metodologia W-Tech.',
        slug: course.title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
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
        videoUrl: 'https://www.youtube.com/watch?v=RePclscnxDM',
        template: 'v1',
        testimonials: []
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
                fakeAlertsEnabled: data.fake_alerts_enabled,
                template: data.template || 'v1',
                testimonials: data.testimonials || []
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
                    fake_alerts_enabled: lp.fakeAlertsEnabled,
                    template: lp.template || 'v1',
                    testimonials: lp.testimonials || []
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
                    fakeAlertsEnabled: data.fake_alerts_enabled,
                    testimonials: data.testimonials || []
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

    // Testimonials Handlers
    const updateTestimonial = (index: number, field: string, value: string) => {
        const newTestimonials = [...(lp.testimonials || [])];
        newTestimonials[index] = { ...newTestimonials[index], [field]: value };
        setLp({ ...lp, testimonials: newTestimonials });
    };

    const addTestimonial = () => {
        setLp({
            ...lp,
            testimonials: [
                ...(lp.testimonials || []),
                { name: 'Novo Aluno', text: 'Excelente curso! Aprendi muito sobre revalvulação de suspensões...', image: '', videoUrl: '' }
            ]
        });
    };

    const removeTestimonial = (index: number) => {
        const newTestimonials = [...(lp.testimonials || [])];
        newTestimonials.splice(index, 1);
        setLp({ ...lp, testimonials: newTestimonials });
    };

    const moveTestimonial = (index: number, direction: 'up' | 'down') => {
        const list = [...(lp.testimonials || [])];
        if (direction === 'up' && index > 0) {
            const temp = list[index];
            list[index] = list[index - 1];
            list[index - 1] = temp;
        } else if (direction === 'down' && index < list.length - 1) {
            const temp = list[index];
            list[index] = list[index + 1];
            list[index + 1] = temp;
        }
        setLp({ ...lp, testimonials: list });
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
                         <button type="button" onClick={handleLaunchCampaign} disabled={launching}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium text-sm bg-black text-white hover:bg-gray-800 disabled:opacity-50"
                            title="Envia a cadência de lançamento por e-mail para os leads da base com cidade/estado do curso">
                            {launching ? <Loader2 size={16} className="animate-spin" /> : <span>📣</span>}
                            Lançar p/ Base da Região
                        </button>
                        <a href={`/${lpPathOf(lp.template)}/${lp.slug}`} target="_blank" rel="noreferrer"
                            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium text-sm bg-yellow-500 text-black hover:bg-yellow-400">
                            <LinkIcon size={16} />
                            Visualizar ({(lp.template || 'v1').toUpperCase()})
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
                        {/* Template tab — highlighted when V2 is active */}
                        <button onClick={() => setActiveTab('template')}
                            className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'template' ? 'bg-black text-white shadow-lg' : 'text-gray-600 hover:bg-gray-200'}`}>
                            <Layers size={18} />
                            <span className="flex-1">Template</span>
                            <span className="text-[9px] font-black bg-yellow-400 text-black px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                <Sparkles size={7} />{(lp.template || 'v1').toUpperCase()}
                            </span>
                        </button>
                        <div className="h-px bg-gray-200 my-1" />
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
                        <button onClick={() => setActiveTab('testimonials')} className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'testimonials' ? 'bg-black text-white shadow-lg' : 'text-gray-600 hover:bg-gray-200'}`}>
                            <MessageSquare size={18} /> Depoimentos
                        </button>
                    </div>

                    {/* Form Area */}
                    <div className="flex-1 p-8 overflow-y-auto">
                        
                        {/* ── TAB TEMPLATE ── */}
                        {activeTab === 'template' && (
                            <div className="space-y-6 animate-fade-in">
                                <div>
                                    <h3 className="text-xl font-bold border-b pb-2 mb-1">Escolha o Template</h3>
                                    <p className="text-sm text-gray-500 mb-6">Define o visual e os efeitos desta Landing Page. Pode trocar a qualquer momento e salvar novamente.</p>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {([
                                        { id: 'v1', name: 'Classic Dark', tagline: 'Sólido e direto', isNew: false,
                                          features: ['Hero com imagem de fundo', 'Seção de benefícios', 'Lista de módulos', 'Formulário de inscrição', 'WhatsApp CTA'] },
                                        { id: 'v2', name: 'Premium Cinematic', tagline: 'Parallax e efeitos', isNew: false,
                                          features: ['Parallax hero + barra de scroll', 'Countdown em tempo real', 'Contadores animados', 'Cards com stagger', 'FAQ accordion', 'CTA flutuante mobile'] },
                                        { id: 'v3', name: 'White Clean', tagline: 'Branco e cronograma', isNew: false,
                                          features: ['Design branco/claro', 'Cronograma visual', 'Cards com borda dourada', 'Countdown branco', 'Formulário lateral'] },
                                        { id: 'v4', name: 'Classic Light', tagline: 'Claro e objetivo', isNew: false,
                                          features: ['Hero claro / imagem direita', 'Seção de benefícios em grid', 'Módulos em cards claros', 'Formulário de inscrição premium', 'WhatsApp CTA'] },
                                        { id: 'v5', name: 'Gold Brutal', tagline: 'Dark impactante', isNew: true,
                                          features: ['Neo-brutalista escuro', 'Marquee de urgência', 'Tipografia gigante', 'Bordas e sombras douradas', 'Módulos numerados', 'CTA flutuante mobile'] },
                                        { id: 'v6', name: 'Carbon Racing', tagline: 'Dark de pista', isNew: true,
                                          features: ['Textura fibra de carbono', 'Faixa racing dourada', 'Stats de autoridade', 'Módulos em pit-lane (timeline)', 'Hero cinematográfico', 'CTA flutuante mobile'] },
                                        { id: 'v7', name: 'Editorial Light', tagline: 'Revista premium', isNew: true,
                                          features: ['Fundo creme + serifa', 'Benefícios numerados editoriais', 'Depoimentos em pull quote', 'Módulos estilo revista', 'Muito respiro visual', 'CTA flutuante mobile'] },
                                        { id: 'v8', name: 'Swiss Tech', tagline: 'Grid técnico claro', isNew: true,
                                          features: ['Grid suíço com bordas', 'Seções numeradas 01–08', 'Labels monoespaçados', 'Tabela de módulos', 'Precisão técnica', 'CTA flutuante mobile'] }
                                    ] as const).map(t => (
                                        <button key={t.id} type="button" onClick={() => setLp({ ...lp, template: t.id })}
                                            className={`relative rounded-xl border-2 overflow-hidden text-left transition-all duration-200 w-full ${
                                                lp.template === t.id
                                                    ? 'border-yellow-500 shadow-[0_0_0_3px_rgba(212,175,55,0.2)]'
                                                    : 'border-gray-200 hover:border-yellow-400/60'
                                            }`}
                                        >
                                            {/* Mini mockup */}
                                            <div className="h-40 overflow-hidden pointer-events-none relative">
                                                {t.id === 'v1' ? (
                                                    /* V1 mockup — dark */
                                                    <div className="w-full h-full bg-[#0a0a0a] select-none">
                                                        <div className="h-5 bg-black/80 flex items-center px-2 gap-1 border-b border-white/5">
                                                            <div className="w-8 h-1.5 bg-yellow-500/60 rounded-full" />
                                                            <div className="flex-1" />
                                                            <div className="w-10 h-2 bg-yellow-500 rounded-sm" />
                                                        </div>
                                                        <div className="relative h-20 bg-gradient-to-br from-gray-700/40 to-gray-900/80">
                                                            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
                                                            <div className="absolute bottom-2 left-3 space-y-1">
                                                                <div className="flex gap-1">
                                                                    <div className="h-1.5 w-12 bg-yellow-500/50 rounded-full" />
                                                                    <div className="h-1.5 w-8 bg-white/20 rounded-full" />
                                                                </div>
                                                                <div className="h-3.5 w-28 bg-white/80 rounded" />
                                                                <div className="h-2 w-20 bg-white/40 rounded" />
                                                                <div className="flex gap-1 mt-0.5">
                                                                    <div className="h-2.5 w-14 bg-yellow-500 rounded" />
                                                                    <div className="h-2.5 w-12 bg-white/10 border border-white/20 rounded" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="p-2 grid grid-cols-3 gap-1">
                                                            {[1,2,3].map(i => (
                                                                <div key={i} className="bg-white/3 border border-white/8 rounded p-1.5 space-y-1">
                                                                    <div className="w-3 h-3 bg-yellow-500/20 rounded" />
                                                                    <div className="h-1.5 w-full bg-white/30 rounded-full" />
                                                                    <div className="h-1 w-3/4 bg-white/15 rounded-full" />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ) : t.id === 'v2' ? (
                                                    /* V2 mockup — dark cinematic */
                                                    <div className="w-full h-full bg-[#050505] select-none">
                                                        <div className="h-0.5 bg-yellow-500 w-2/3" />
                                                        <div className="h-5 bg-black/80 flex items-center px-2 gap-1 border-b border-white/5">
                                                            <div className="w-7 h-2 bg-yellow-500/70 rounded-sm" />
                                                            <div className="flex-1" />
                                                            <div className="w-10 h-2 bg-yellow-500 rounded-sm" />
                                                        </div>
                                                        <div className="relative h-24 overflow-hidden bg-gradient-to-br from-gray-700/30 to-gray-900/70">
                                                            <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 60% 50%, rgba(212,175,55,0.15) 0%, transparent 60%)' }} />
                                                            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] to-transparent" />
                                                            <div className="absolute top-2 left-3 space-y-0.5">
                                                                <div className="h-3.5 w-24 bg-white/90 rounded" />
                                                                <div className="h-1.5 w-16 bg-white/40 rounded" />
                                                            </div>
                                                            <div className="absolute bottom-1.5 right-2 flex gap-1">
                                                                {[1,2,3,4].map(i => (
                                                                    <div key={i} className="w-5 h-5 bg-black/60 border border-yellow-500/30 rounded flex items-center justify-center">
                                                                        <div className="h-1.5 w-3 bg-white/70 rounded-full" />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div className="p-2 grid grid-cols-3 gap-1">
                                                            {[0,1,2].map(i => (
                                                                <div key={i} className="bg-white/3 border border-white/8 rounded p-1.5 space-y-1" style={{ opacity: 1 - i * 0.1 }}>
                                                                    <div className="w-4 h-4 bg-yellow-500/15 border border-yellow-500/20 rounded" />
                                                                    <div className="h-1.5 w-full bg-white/30 rounded-full" />
                                                                    <div className="h-1 w-3/4 bg-white/15 rounded-full" />
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <div className="h-3 bg-black/90 border-t border-white/10 flex items-center justify-center">
                                                            <div className="h-1.5 w-20 bg-yellow-500 rounded-sm" />
                                                        </div>
                                                    </div>
                                                ) : t.id === 'v3' ? (
                                                    /* V3 mockup — white clean */
                                                    <div className="w-full h-full bg-white select-none">
                                                        <div className="h-0.5 bg-gradient-to-r from-yellow-400 to-yellow-500 w-full" />
                                                        <div className="h-5 bg-white flex items-center px-2 gap-1 border-b border-gray-100 shadow-sm">
                                                            <div className="w-7 h-2 bg-yellow-500 rounded-sm" />
                                                            <div className="flex-1" />
                                                            <div className="w-12 h-2.5 bg-yellow-500 rounded-lg" />
                                                        </div>
                                                        <div className="relative h-20 bg-gradient-to-br from-gray-50 to-yellow-50/30 flex">
                                                            <div className="flex-1 p-2 space-y-1">
                                                                <div className="h-1.5 w-16 bg-yellow-500/30 border border-yellow-500/40 rounded-full" />
                                                                <div className="h-3 w-24 bg-gray-800 rounded" />
                                                                <div className="h-1.5 w-1/2 bg-yellow-500 rounded-full" style={{ height: '2px', width: '24px' }} />
                                                                <div className="h-1.5 w-20 bg-gray-400/50 rounded-full" />
                                                                <div className="flex gap-1 mt-1">
                                                                    <div className="h-3 w-12 bg-yellow-500 rounded-lg" />
                                                                    <div className="h-3 w-10 bg-white border border-gray-200 rounded-lg" />
                                                                </div>
                                                            </div>
                                                            {/* right — image + countdown */}
                                                            <div className="w-16 p-1 space-y-1">
                                                                <div className="h-10 bg-gray-200 rounded-lg border border-gray-100" />
                                                                <div className="bg-white border border-gray-200 rounded p-1 flex gap-0.5 justify-center shadow-sm">
                                                                    {[1,2,3,4].map(i => (
                                                                        <div key={i} className="w-3 h-3 bg-white border border-yellow-400/50 rounded flex items-center justify-center">
                                                                            <div className="h-1 w-2 bg-gray-700/60 rounded-full" />
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {/* stats strip */}
                                                        <div className="bg-gray-800 h-4 flex items-center justify-around px-2">
                                                            {[1,2,3,4].map(i => <div key={i} className="h-1 w-6 bg-yellow-500/50 rounded-full" />)}
                                                        </div>
                                                        {/* benefit cards */}
                                                        <div className="p-1.5 grid grid-cols-3 gap-1">
                                                            {[1,2,3].map(i => (
                                                                <div key={i} className="bg-white border border-gray-200 rounded p-1 space-y-0.5 shadow-sm">
                                                                    <div className="w-3 h-3 bg-yellow-500/15 border border-yellow-500/20 rounded" />
                                                                    <div className="h-1.5 w-full bg-gray-700/30 rounded-full" />
                                                                    <div className="h-1 w-3/4 bg-gray-300/50 rounded-full" />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ) : t.id === 'v4' ? (
                                                    /* V4 mockup — classic light */
                                                    <div className="w-full h-full bg-gray-50 select-none">
                                                        <div className="h-5 bg-white flex items-center px-2 gap-1 border-b border-gray-200">
                                                            <div className="w-8 h-1.5 bg-yellow-500/60 rounded-full" />
                                                            <div className="flex-1" />
                                                            <div className="w-10 h-2 bg-yellow-500 rounded-sm" />
                                                        </div>
                                                        <div className="relative h-20 bg-gradient-to-br from-gray-100 to-white">
                                                            <div className="absolute bottom-2 left-3 space-y-1">
                                                                <div className="flex gap-1">
                                                                    <div className="h-1.5 w-12 bg-yellow-500/50 rounded-full" />
                                                                    <div className="h-1.5 w-8 bg-gray-300 rounded-full" />
                                                                </div>
                                                                <div className="h-3.5 w-28 bg-gray-800 rounded" />
                                                                <div className="h-2 w-20 bg-gray-400 rounded" />
                                                                <div className="flex gap-1 mt-0.5">
                                                                    <div className="h-2.5 w-14 bg-yellow-500 rounded" />
                                                                    <div className="h-2.5 w-12 bg-white border border-gray-300 rounded" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="p-2 grid grid-cols-3 gap-1">
                                                            {[1,2,3].map(i => (
                                                                <div key={i} className="bg-white border border-gray-200 rounded p-1.5 space-y-1">
                                                                    <div className="w-3 h-3 bg-yellow-500/20 rounded" />
                                                                    <div className="h-1.5 w-full bg-gray-700/30 rounded-full" />
                                                                    <div className="h-1 w-3/4 bg-gray-300/50 rounded-full" />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ) : t.id === 'v5' ? (
                                                    /* V5 mockup — gold brutal (dark) */
                                                    <div className="w-full h-full bg-[#0A0A0A] select-none">
                                                        <div className="h-2 bg-yellow-500 flex items-center overflow-hidden">
                                                            <div className="text-[5px] font-black text-black whitespace-nowrap px-1">● VAGAS LIMITADAS ● CERTIFICADO OFICIAL ● VAGAS LIMITADAS ●</div>
                                                        </div>
                                                        <div className="h-4 border-b-2 border-yellow-500 flex items-center px-2 gap-1">
                                                            <div className="w-7 h-1.5 bg-white/70 rounded-sm" />
                                                            <div className="flex-1" />
                                                            <div className="w-9 h-2 bg-yellow-500 border border-black shadow-[1px_1px_0_#000]" />
                                                        </div>
                                                        <div className="p-2.5 space-y-1.5">
                                                            <div className="h-4 w-32 bg-white rounded-sm" />
                                                            <div className="h-4 w-24 bg-white rounded-sm" />
                                                            <div className="h-1.5 w-20 bg-white/30 rounded-full border-l-2 border-yellow-500" />
                                                            <div className="flex gap-1.5 mt-1">
                                                                <div className="h-3.5 w-16 bg-red-600 border border-white shadow-[2px_2px_0_#D4AF37]" />
                                                                <div className="h-3.5 w-12 bg-black border-2 border-yellow-500 shadow-[2px_2px_0_#D4AF37]" />
                                                            </div>
                                                        </div>
                                                        <div className="px-2 grid grid-cols-3 gap-1">
                                                            {[1,2,3].map(i => (
                                                                <div key={i} className="bg-black border border-white/20 p-1 space-y-0.5">
                                                                    <div className="text-[7px] font-black text-yellow-500/50">0{i}</div>
                                                                    <div className="h-1 w-full bg-white/40" />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ) : t.id === 'v6' ? (
                                                    /* V6 mockup — carbon racing (dark) */
                                                    <div className="w-full h-full bg-[#08090B] select-none">
                                                        <div className="h-4 bg-black/80 border-b border-yellow-500/40 flex items-center px-2 gap-1">
                                                            <div className="w-8 h-1.5 bg-white/70 rounded-sm italic" />
                                                            <div className="flex-1" />
                                                            <div className="w-9 h-2 bg-yellow-500 skew-x-[-8deg]" />
                                                        </div>
                                                        <div className="relative h-16 bg-gradient-to-r from-gray-800/60 to-transparent p-2 space-y-1">
                                                            <div className="h-1 w-12 border border-yellow-500/60 rounded-sm" />
                                                            <div className="h-3.5 w-28 bg-white/90 rounded-sm skew-x-[-3deg]" />
                                                            <div className="h-1.5 w-20 bg-white/30 rounded-full" />
                                                            <div className="h-3 w-16 bg-yellow-500 skew-x-[-8deg] mt-1" />
                                                        </div>
                                                        <div className="h-1.5 bg-[repeating-linear-gradient(45deg,#D4AF37_0,#D4AF37_4px,#08090B_4px,#08090B_8px)]" />
                                                        <div className="flex justify-around py-1.5 bg-black/60">
                                                            {['+15','+5K','#1'].map((s,i) => (
                                                                <div key={i} className="text-center">
                                                                    <div className="text-[8px] font-black italic text-yellow-500">{s}</div>
                                                                    <div className="h-0.5 w-5 bg-white/20 mx-auto mt-0.5" />
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <div className="p-1.5 pl-3 space-y-1 relative">
                                                            <div className="absolute left-1.5 top-1.5 bottom-1 w-px bg-yellow-500/60" />
                                                            {[1,2].map(i => (
                                                                <div key={i} className="bg-white/5 border border-white/10 rounded p-1 ml-1">
                                                                    <div className="h-1 w-3/4 bg-white/40 rounded-full" />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ) : t.id === 'v7' ? (
                                                    /* V7 mockup — editorial light (creme) */
                                                    <div className="w-full h-full bg-[#FAF7F1] select-none">
                                                        <div className="h-4 border-b border-gray-200 flex items-center px-2 gap-1">
                                                            <div className="w-9 h-2 bg-gray-800 rounded-sm" style={{ fontStyle: 'italic' }} />
                                                            <div className="flex-1" />
                                                            <div className="w-10 h-2.5 bg-gray-900 rounded-full" />
                                                        </div>
                                                        <div className="text-center pt-2.5 space-y-1.5">
                                                            <div className="flex items-center justify-center gap-1">
                                                                <div className="h-px w-6 bg-gray-300" />
                                                                <div className="h-1 w-12 bg-gray-300 rounded-full" />
                                                                <div className="h-px w-6 bg-gray-300" />
                                                            </div>
                                                            <div className="h-4 w-32 bg-gray-900 rounded-sm mx-auto" />
                                                            <div className="h-1.5 w-24 bg-gray-400/60 rounded-full mx-auto italic" />
                                                            <div className="h-3 w-16 bg-gray-900 rounded-full mx-auto mt-1" />
                                                        </div>
                                                        <div className="mx-3 mt-2 h-9 bg-gray-300 rounded-sm" />
                                                        <div className="px-3 mt-1.5 space-y-1">
                                                            {[1,2].map(i => (
                                                                <div key={i} className="flex gap-1.5 items-center border-t border-gray-200 pt-1">
                                                                    <div className="text-[9px] font-serif text-yellow-700/60">0{i}</div>
                                                                    <div className="h-1 flex-1 bg-gray-400/40 rounded-full" />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    /* V8 mockup — swiss tech (branco/grid) */
                                                    <div className="w-full h-full bg-white select-none">
                                                        <div className="h-4 border-b-2 border-gray-900 flex items-center px-2 gap-1">
                                                            <div className="w-8 h-2 bg-gray-900 rounded-sm" />
                                                            <div className="flex-1" />
                                                            <div className="w-9 h-2.5 bg-gray-900" />
                                                        </div>
                                                        <div className="grid grid-cols-12 h-16 border-b-2 border-gray-900">
                                                            <div className="col-span-7 border-r-2 border-gray-900 p-1.5 space-y-1">
                                                                <div className="flex items-center gap-0.5">
                                                                    <div className="w-1 h-1 bg-yellow-500" />
                                                                    <div className="h-1 w-10 bg-yellow-600/50" />
                                                                </div>
                                                                <div className="h-3 w-full bg-gray-900 rounded-sm" />
                                                                <div className="h-3 w-3/4 bg-gray-900 rounded-sm" />
                                                                <div className="flex gap-1 mt-0.5">
                                                                    <div className="h-2.5 w-12 bg-gray-900" />
                                                                    <div className="h-2.5 w-10 border-2 border-gray-900" />
                                                                </div>
                                                            </div>
                                                            <div className="col-span-5 bg-gray-200" />
                                                        </div>
                                                        <div className="grid grid-cols-4 divide-x-2 divide-gray-900 border-b-2 border-gray-900">
                                                            {[1,2,3,4].map(i => (
                                                                <div key={i} className="p-1">
                                                                    <div className="w-1.5 h-1.5 bg-yellow-500 mb-0.5" />
                                                                    <div className="h-1 w-full bg-gray-400/50" />
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <div className="p-1.5 flex justify-between items-center">
                                                            <div className="h-1.5 w-16 bg-gray-900" />
                                                            <div className="text-[7px] font-mono text-gray-400">/01</div>
                                                        </div>
                                                    </div>
                                                )}
                                                {/* NEW badge */}
                                                {t.isNew && (
                                                    <div className="absolute top-2 left-2 bg-yellow-400 text-black text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 z-10">
                                                        <Sparkles size={7} /> Novo
                                                    </div>
                                                )}
                                                {/* selected check */}
                                                {lp.template === t.id && (
                                                    <div className="absolute top-2 right-2 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center z-10">
                                                        <Check size={11} className="text-black" strokeWidth={3} />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Label */}
                                            <div className="p-3 bg-white border-t border-gray-100">
                                                <div className="flex items-center justify-between mb-0.5">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[9px] font-black bg-gray-900 text-white px-1.5 py-0.5 rounded">{t.id.toUpperCase()}</span>
                                                        <span className="font-black text-gray-900 text-xs">{t.name}</span>
                                                    </div>
                                                    {lp.template === t.id && <span className="text-[10px] text-yellow-600 font-black">✓ Ativo</span>}
                                                </div>
                                                <p className="text-[10px] text-yellow-600 font-semibold mb-1.5">{t.tagline}</p>
                                                <ul className="space-y-0.5">
                                                    {t.features.slice(0, 3).map((f, i) => (
                                                        <li key={i} className="flex items-center gap-1 text-[9px] text-gray-500">
                                                            <div className="w-1 h-1 bg-yellow-400 rounded-full flex-shrink-0" />
                                                            {f}
                                                        </li>
                                                    ))}
                                                    {t.features.length > 3 && <li className="text-[9px] text-gray-400 pl-2">+{t.features.length - 3} mais...</li>}
                                                </ul>
                                            </div>
                                        </button>
                                    ))}
                                </div>

                                {/* Info box */}
                                <div className={`rounded-xl p-4 border text-sm ${lp.template === 'v2' ? 'bg-yellow-50 border-yellow-200' : lp.template === 'v3' ? 'bg-blue-50 border-blue-200' : lp.template === 'v4' ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'}`}>
                                    {lp.template === 'v2' ? (
                                        <div className="flex gap-3">
                                            <Sparkles size={16} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <p className="font-black text-yellow-800 mb-0.5">Template Premium Cinematic selecionado</p>
                                                <p className="text-yellow-700 text-xs leading-relaxed">Esta LP vai usar parallax, countdown ao vivo, animações de entrada, FAQ e CTA flutuante mobile. Clique em <strong>Salvar Página</strong> para confirmar.</p>
                                            </div>
                                        </div>
                                    ) : lp.template === 'v3' ? (
                                        <div className="flex gap-3">
                                            <Layers size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <p className="font-black text-blue-800 mb-0.5">Template White Clean selecionado</p>
                                                <p className="text-blue-700 text-xs leading-relaxed">Design branco/claro com cronograma visual do curso, countdown em cards brancos e formulário lateral. O campo <strong>Cronograma / Conteúdo</strong> do curso aparece automaticamente.</p>
                                            </div>
                                        </div>
                                    ) : lp.template === 'v4' ? (
                                        <div className="flex gap-3">
                                            <Layers size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <p className="font-black text-emerald-800 mb-0.5">Template Classic Light selecionado</p>
                                                <p className="text-emerald-700 text-xs leading-relaxed">Baseado inteiramente na estrutura do V1, mas com um visual totalmente claro, luminoso e elegante. Perfeito para conversão premium.</p>
                                            </div>
                                        </div>
                                    ) : ['v5', 'v6', 'v7', 'v8'].includes(lp.template || '') ? (
                                        <div className="flex gap-3">
                                            <Sparkles size={16} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <p className="font-black text-yellow-800 mb-0.5">Template {TEMPLATE_DISPLAY[lp.template || ''] || lp.template} selecionado</p>
                                                <p className="text-yellow-700 text-xs leading-relaxed">
                                                    Template persuasivo da nova geração. Importante: o <strong>preço do curso só aparece quando o Checkout Automático está ativo</strong> no curso — sem ele, a página converte para o formulário/WhatsApp sem citar valores. Clique em <strong>Salvar Página</strong> para confirmar.
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex gap-3">
                                            <Layers size={16} className="text-gray-500 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <p className="font-black text-gray-700 mb-0.5">Template Classic Dark selecionado</p>
                                                <p className="text-gray-500 text-xs leading-relaxed">Layout escuro clássico com hero, benefícios, módulos e formulário. Sólido e testado para conversão.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-3 pt-2">
                                    <button type="button" onClick={handleSave} disabled={saving}
                                        className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-gray-800 transition-colors disabled:opacity-50">
                                        {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                                        Salvar Template
                                    </button>
                                    {lp.slug && (
                                        <a href={`/${lpPathOf(lp.template)}/${lp.slug}`} target="_blank" rel="noreferrer"
                                            className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-colors bg-yellow-500 text-black hover:bg-yellow-400">
                                            <LinkIcon size={15} />
                                            Visualizar {(lp.template || 'v1').toUpperCase()}
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}

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
                                        <span className="p-3 bg-gray-100 border border-r-0 border-gray-200 text-gray-500 rounded-l-lg text-sm">w-techbrasil.com.br/lp/</span>
                                        <input className="flex-1 bg-white border border-gray-200 p-3 rounded-r-lg focus:ring-2 focus:ring-black outline-none transition-all" value={lp.slug || ''} onChange={e => setLp({ ...lp, slug: e.target.value.toLowerCase().trim().replace(/[^a-z0-9-]+/g, '') })} />
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

                        {activeTab === 'testimonials' && (
                             <div className="space-y-6 animate-fade-in">
                                 <div className="flex items-center justify-between border-b pb-2 mb-4">
                                     <div>
                                         <h3 className="text-xl font-bold">Depoimentos dos Alunos</h3>
                                         <p className="text-sm text-gray-500">Adicione depoimentos em texto ou vídeo (YouTube) para impulsionar a prova social e conversão.</p>
                                     </div>
                                     <button onClick={addTestimonial} className="text-sm bg-black text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-800">
                                         <Plus size={16} /> Adicionar Depoimento
                                     </button>
                                 </div>

                                 <div className="space-y-6">
                                     {(!lp.testimonials || lp.testimonials.length === 0) ? (
                                         <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                             <MessageSquare className="mx-auto text-gray-300 mb-3" size={40} />
                                             <p className="text-gray-500 font-medium">Nenhum depoimento cadastrado ainda.</p>
                                             <button onClick={addTestimonial} className="mt-3 text-xs bg-black text-white px-3 py-1.5 rounded-lg inline-flex items-center gap-1 hover:bg-gray-800">
                                                 <Plus size={12} /> Começar a Cadastrar
                                             </button>
                                         </div>
                                     ) : (
                                         lp.testimonials.map((test, idx) => {
                                             const ytId = test.videoUrl ? (() => {
                                                 const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
                                                 const match = test.videoUrl.match(regExp);
                                                 return (match && match[2].length === 11) ? match[2] : '';
                                             })() : '';

                                             return (
                                                 <div key={idx} className="p-5 bg-gray-50 rounded-2xl border border-gray-200 flex gap-4 items-start relative group shadow-sm transition-all hover:border-yellow-500/40">
                                                     {/* Move buttons */}
                                                     <div className="flex flex-col gap-1 shrink-0">
                                                         <button onClick={() => moveTestimonial(idx, 'up')} disabled={idx === 0}
                                                             className="p-1 hover:bg-gray-200 rounded text-gray-500 disabled:opacity-30">
                                                             <ArrowUp size={16} />
                                                        </button>
                                                         <span className="text-[10px] text-center font-bold text-gray-400">{idx + 1}</span>
                                                         <button onClick={() => moveTestimonial(idx, 'down')} disabled={idx === (lp.testimonials?.length || 0) - 1}
                                                             className="p-1 hover:bg-gray-200 rounded text-gray-500 disabled:opacity-30">
                                                             <ArrowDown size={16} />
                                                         </button>
                                                     </div>

                                                     {/* Image Avatar */}
                                                     <div className="w-20 h-20 rounded-xl shrink-0 overflow-hidden border border-gray-300 bg-white relative">
                                                         {ytId ? (
                                                             /* Show YouTube video thumbnail if videoUrl is provided */
                                                             <div className="w-full h-full relative">
                                                                 <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} className="w-full h-full object-cover" alt="YT cover" />
                                                                 <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                                     <Video size={16} className="text-white" />
                                                                 </div>
                                                             </div>
                                                         ) : test.image ? (
                                                             <img src={test.image} className="w-full h-full object-cover" alt={test.name} />
                                                         ) : (
                                                             <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                                 <User size={24} />
                                                             </div>
                                                         )}
                                                     </div>

                                                     {/* Fields */}
                                                     <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                         <div className="space-y-3 md:col-span-2">
                                                             <div className="flex gap-4">
                                                                 <div className="flex-1">
                                                                     <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nome do Aluno</label>
                                                                     <input className="w-full bg-white border border-gray-200 p-2.5 rounded-lg text-sm font-bold focus:ring-1 focus:ring-black outline-none" value={test.name} placeholder="Ex: João da Silva" onChange={e => updateTestimonial(idx, 'name', e.target.value)} />
                                                                 </div>
                                                                 <div className="flex-1">
                                                                     <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Foto URL (Opcional)</label>
                                                                     <input className="w-full bg-white border border-gray-200 p-2.5 rounded-lg text-xs text-gray-600 focus:ring-1 focus:ring-black outline-none" value={test.image || ''} placeholder="https://..." onChange={e => updateTestimonial(idx, 'image', e.target.value)} />
                                                                 </div>
                                                             </div>
                                                         </div>

                                                         <div className="space-y-3 md:col-span-2">
                                                             <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Link de Vídeo do YouTube (Opcional)</label>
                                                             <p className="text-[10px] text-gray-400 -mt-2">Cole o link completo do vídeo de depoimento do aluno no YouTube.</p>
                                                             <div className="flex gap-2">
                                                                 <input className="flex-1 bg-white border border-gray-200 p-2.5 rounded-lg text-xs text-gray-600 focus:ring-1 focus:ring-black outline-none" value={test.videoUrl || ''} placeholder="https://www.youtube.com/watch?v=..." onChange={e => updateTestimonial(idx, 'videoUrl', e.target.value)} />
                                                                 {ytId && (
                                                                     <span className="bg-yellow-100 text-yellow-800 text-[10px] font-bold px-2.5 py-1 rounded-md self-center flex items-center gap-1">
                                                                         <Check size={10} strokeWidth={3} /> Vídeo Detectado
                                                                     </span>
                                                                 )}
                                                             </div>
                                                         </div>

                                                         <div className="space-y-3 md:col-span-2">
                                                             <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Texto do Depoimento</label>
                                                             <textarea rows={3} className="w-full bg-white border border-gray-200 p-2.5 rounded-lg text-sm text-gray-600 focus:ring-1 focus:ring-black outline-none" value={test.text} placeholder="Escreva o relato do aluno aqui..." onChange={e => updateTestimonial(idx, 'text', e.target.value)} />
                                                         </div>
                                                     </div>

                                                     {/* Delete Button */}
                                                     <button onClick={() => removeTestimonial(idx)} className="p-2.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors shrink-0">
                                                         <Trash2 size={20} />
                                                     </button>
                                                 </div>
                                             );
                                         })
                                     )}
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
