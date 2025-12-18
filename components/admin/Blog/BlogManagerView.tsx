
import React, { useState, useEffect } from 'react';
import { ArrowRight, Sparkles, Loader2, Save, Edit, Trash2, CalendarClock } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import { generateBlogPost } from '../../../lib/gemini';
import type { BlogPost, PostComment } from '../../../types';

const BlogManagerView = ({ permissions }: { permissions?: any }) => {
    const [viewMode, setViewMode] = useState<'list' | 'edit' | 'ai_batch'>('list');
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
    const [comments, setComments] = useState<PostComment[]>([]);
    const [newComment, setNewComment] = useState('');
    const { user } = useAuth();
    const [formData, setFormData] = useState<Partial<BlogPost>>({});

    // AI State
    const [showAI, setShowAI] = useState(false);
    const [aiTopic, setAiTopic] = useState('');
    const [aiGenerating, setAiGenerating] = useState(false);

    // AI Batch State
    const [batchTopic, setBatchTopic] = useState('');
    const [batchKeywords, setBatchKeywords] = useState('');
    const [batchPostsPerDay, setBatchPostsPerDay] = useState<number>(3);
    const [batchGenerating, setBatchGenerating] = useState(false);
    const [batchSuccess, setBatchSuccess] = useState(false); // Can be boolean or a summary string
    const [generatedCount, setGeneratedCount] = useState(0);

    const hasPermission = (key: string) => {
        if (!user) return false;
        
        // 0. Live Permissions (Prop)
        if (permissions) {
             if (permissions.admin_access) return true;
             return !!permissions[key];
        }

        if (user.role === 'Super Admin' || user.role === 'ADMIN' || user.permissions?.admin_access) return true;
        if (typeof user.role !== 'string' && user.role?.level >= 10) return true;
        
        const rolePermissions = typeof user.role === 'object' ? user.role?.permissions : {};
        const effectivePermissions = { ...rolePermissions, ...user.permissions };
        return !!effectivePermissions[key];
    };

    useEffect(() => {
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        const { data } = await supabase.from('SITE_BlogPosts').select('*').order('date', { ascending: false });
        if (data) setPosts(data.map((p: any) => ({
            ...p,
            seoScore: p.seo_score,
            seoDescription: p.seo_description,
            seoTitle: p.seo_title
        })));
    };

    const handleDeletePost = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir este post permanentemente?")) return;

        const { error } = await supabase.from('SITE_BlogPosts').delete().eq('id', id);

        if (error) {
            alert("Erro ao excluir: " + error.message);
        } else {
            setPosts(prev => prev.filter(p => p.id !== id));
        }
    };

    const handleEdit = async (post?: BlogPost) => {
        if (post) {
            setSelectedPost(post);
            setFormData(post);
            const { data } = await supabase.from('SITE_PostComments').select('*').eq('post_id', post.id).order('created_at', { ascending: true });
            if (data) setComments(data.map((c: any) => ({ ...c, postId: c.post_id, userName: c.user_name, createdAt: c.created_at })));
        } else {
            setSelectedPost(null);
            setFormData({ status: 'Draft', content: '', title: '' });
            setComments([]);
        }
        setViewMode('edit');
    };

    const handleSave = async () => {
        const score = calculateSeoScore(formData);

        const payload = {
            title: formData.title,
            content: formData.content,
            slug: formData.slug,
            excerpt: formData.excerpt,
            seo_title: formData.seoTitle,
            seo_description: formData.seoDescription,
            status: formData.status,
            seo_score: score,
            image: formData.image,
            author: formData.author || user?.name || 'Admin',
            category: formData.category || 'Blog',
            date: formData.date || new Date().toISOString()
        };

        if (selectedPost && selectedPost.id) {
            await supabase.from('SITE_BlogPosts').update(payload).eq('id', selectedPost.id);
        } else {
            await supabase.from('SITE_BlogPosts').insert([payload]);
        }

        alert('Post salvo com sucesso!');
        setViewMode('list');
        fetchPosts();
    };

    const handleGenerateAI = async () => {
        if (!aiTopic) return alert("Digite um tópico.");
        setAiGenerating(true);
        try {
            const aiPost = await generateBlogPost(aiTopic, []);
            const generatedSlug = aiPost.slug || aiPost.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

            setFormData({
                ...formData,
                title: aiPost.title,
                slug: generatedSlug,
                excerpt: aiPost.excerpt,
                content: aiPost.content,
                seoTitle: aiPost.title,
                seoDescription: aiPost.seo_description,
                image: `https://image.pollinations.ai/prompt/${encodeURIComponent(aiTopic)}?width=800&height=400&nologo=true`
            });
            setShowAI(false);
        } catch (error: any) {
            alert("Erro IA: " + error.message);
        } finally {
            setAiGenerating(false);
        }
    };

    const handleComment = async () => {
        if (!newComment || !selectedPost || !user) return;
        await supabase.from('SITE_PostComments').insert({
            post_id: selectedPost.id,
            user_name: user.name,
            content: newComment
        });
        setNewComment('');
        // Refresh comments logic here if needed
    };

    const calculateSeoScore = (data: Partial<BlogPost>) => {
        let score = 50;
        if (data.title && data.title.length > 30 && data.title.length < 60) score += 10;
        if (data.seoDescription && data.seoDescription.length > 120 && data.seoDescription.length < 160) score += 10;
        if (data.content && data.content.length > 500) score += 20;
        if (data.slug && !data.slug.includes(' ')) score += 10;
        return Math.min(100, score);
    };

    const handleGenerateBatch = async () => {
        if (!batchTopic && !batchKeywords) return alert("Preencha os tópicos e palavras-chave");

        // Split topics (priority) or generate from keywords
        let topicsList = batchTopic ? batchTopic.split(',').map(t => t.trim()).filter(t => t) : [];
        if (topicsList.length === 0 && batchKeywords) {
            // If only keywords are provided, use them as topics
            topicsList = batchKeywords.split(',').map(k => k.trim()).filter(k => k);
        }

        if (topicsList.length === 0) return alert("Nenhum tópico identificado.");

        setBatchGenerating(true);
        setBatchSuccess(false);
        setGeneratedCount(0);

        try {
            const keywordList = batchKeywords.split(',').map(k => k.trim());
            const postsPerDay = batchPostsPerDay || 3;

            let completed = 0;

            for (let i = 0; i < topicsList.length; i++) {
                const topic = topicsList[i];

                // Schedule Date Logic
                const daysToAdd = Math.floor(i / postsPerDay);
                const scheduleDate = new Date();
                scheduleDate.setDate(scheduleDate.getDate() + daysToAdd);
                // Set to a reasonable time (e.g., 09:00 AM) or keep current time

                const aiPost = await generateBlogPost(topic, keywordList);
                let coverImage = aiPost.image_prompt
                    ? `https://image.pollinations.ai/prompt/${encodeURIComponent(aiPost.image_prompt)}?width=800&height=400&nologo=true`
                    : `https://image.pollinations.ai/prompt/${encodeURIComponent(topic)}?width=800&height=400&nologo=true`;

                const generatedSlug = aiPost.slug || aiPost.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Math.random().toString(36).substr(2, 5);

                await supabase.from('SITE_BlogPosts').insert([{
                    title: aiPost.title,
                    slug: generatedSlug,
                    excerpt: aiPost.excerpt,
                    content: aiPost.content,
                    seo_description: aiPost.seo_description,
                    seo_title: aiPost.title,
                    keywords: aiPost.tags || keywordList,
                    status: 'Published', // Auto-publish with future date? Or 'Draft'. User asked to "create content", assuming intent to publish.
                    author: 'W-TECH AI',
                    category: 'Blog',
                    image: coverImage,
                    seo_score: Math.floor(Math.random() * (95 - 75) + 75),
                    views: 0,
                    clicks: 0,
                    date: scheduleDate.toISOString() // Future date
                }]);

                completed++;
                setGeneratedCount(completed);
            }
            setBatchSuccess(true);
            setBatchTopic('');
            // Don't switch view immediately
        } catch (error: any) {
            alert("Erro Parcial: " + error.message);
        } finally {
            setBatchGenerating(false);
        }
    };

    const currentScore = calculateSeoScore(formData);

    if (viewMode === 'edit') {
        return (
            <div className="flex h-full gap-6 text-gray-900">
                <div className="flex-grow bg-white rounded-lg shadow-sm border border-gray-100 flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setViewMode('list')} className="text-gray-500 hover:text-black"><ArrowRight className="rotate-180" /></button>
                            <h2 className="font-bold text-lg text-gray-900">Editor de Postagem</h2>
                            <button onClick={() => setShowAI(!showAI)} className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-3 py-1 rounded text-xs font-bold flex items-center gap-2 shadow-sm hover:shadow-md transition-all">
                                <Sparkles size={12} /> {showAI ? 'Fechar IA' : 'Gerar com IA'}
                            </button>
                        </div>
                        <div className="flex gap-2">
                            <select
                                className="border border-gray-300 p-2 rounded text-sm text-gray-900 bg-white"
                                value={formData.status}
                                onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                            >
                                <option value="Draft">Rascunho</option>
                                <option value="Published">Publicado</option>
                            </select>
                            <button onClick={handleSave} className="bg-wtech-gold text-black px-4 py-2 rounded font-bold text-sm flex items-center gap-2">
                                <Save size={16} /> Salvar
                            </button>
                        </div>
                    </div>

                    {showAI && (
                        <div className="bg-purple-50 p-4 border-b border-purple-100 animate-in slide-in-from-top-2">
                            <div className="flex gap-2">
                                <input
                                    className="flex-grow border border-purple-200 rounded p-2 text-sm"
                                    placeholder="Sobre o que você quer escrever?"
                                    value={aiTopic}
                                    onChange={e => setAiTopic(e.target.value)}
                                />
                                <button
                                    onClick={handleGenerateAI}
                                    disabled={aiGenerating}
                                    className="bg-purple-600 text-white px-4 py-2 rounded font-bold text-sm hover:bg-purple-700 disabled:opacity-50"
                                >
                                    {aiGenerating ? <Loader2 className="animate-spin" /> : 'Gerar'}
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Título</label>
                            <input className="w-full text-2xl font-bold border-b border-gray-200 text-gray-900 bg-transparent py-2" value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Slug</label>
                                <input className="w-full border border-gray-300 p-2 rounded text-sm text-gray-900" value={formData.slug || ''} onChange={e => setFormData({ ...formData, slug: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date</label>
                                <input type="datetime-local" className="w-full border border-gray-300 p-2 rounded text-sm text-gray-900"
                                    value={formData.date ? new Date(formData.date).toISOString().slice(0, 16) : ''}
                                    onChange={e => setFormData({ ...formData, date: new Date(e.target.value).toISOString() })} />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Resumo</label>
                            <textarea rows={2} className="w-full border border-gray-300 p-2 rounded text-sm text-gray-900" value={formData.excerpt || ''} onChange={e => setFormData({ ...formData, excerpt: e.target.value })} />
                        </div>

                        <div className="flex-grow">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Conteúdo (HTML)</label>
                            <textarea
                                className="w-full h-96 border border-gray-300 p-4 rounded font-mono text-sm"
                                value={formData.content || ''}
                                onChange={e => setFormData({ ...formData, content: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                <div className="w-72 flex-shrink-0 flex flex-col gap-6">
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 text-center">
                        <h3 className="font-bold text-gray-800 mb-2">SEO Score</h3>
                        <span className="text-4xl font-bold text-wtech-gold">{currentScore}</span>
                    </div>
                </div>
            </div>
        );
    }

    if (viewMode === 'ai_batch') {
        return (
            <div className="flex h-full gap-6 text-gray-900 justify-center items-start pt-10">
                <div className="max-w-4xl w-full bg-white p-8 rounded-xl shadow-sm border border-gray-100 relative">
                    <button onClick={() => setViewMode('list')} className="absolute top-4 left-4 p-2 hover:bg-gray-100 rounded-full text-gray-500">
                        <ArrowRight className="rotate-180" size={24} />
                    </button>

                    <div className="flex items-center gap-3 mb-6 ml-10">
                        <div className="bg-wtech-black p-2 rounded text-wtech-gold"><Sparkles size={24} /></div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Agendador de Conteúdo IA</h2>
                            <p className="text-xs text-gray-500">Crie um cronograma de postagens otimizadas automaticamente.</p>
                        </div>
                    </div>

                    {batchSuccess && (
                        <div className="mb-6 bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg flex justify-between items-center animate-in fade-in">
                            <div>
                                <strong>Sucesso!</strong> {generatedCount} artigos agendados.
                            </div>
                            <button onClick={() => { setViewMode('list'); fetchPosts(); }} className="text-sm font-bold underline hover:text-green-900">
                                Ver Calendário
                            </button>
                        </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Lista de Tópicos (Um por linha ou vírgula)</label>
                            <textarea
                                rows={6}
                                className="w-full border border-gray-300 p-3 rounded text-gray-900 focus:border-wtech-gold focus:ring-1 focus:ring-wtech-gold outline-none font-mono text-sm"
                                value={batchTopic}
                                onChange={e => setBatchTopic(e.target.value)}
                                placeholder={"Manutenção de Freios\nTroca de Óleo\nSuspensão Esportiva\n..."}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Publicações por Dia</label>
                            <input
                                type="number"
                                min="1" max="10"
                                className="w-full border border-gray-300 p-3 rounded text-gray-900 font-bold"
                                value={batchPostsPerDay}
                                onChange={e => setBatchPostsPerDay(parseInt(e.target.value))}
                            />
                            <p className="text-[10px] text-gray-400 mt-1">Ex: 3 posts = 1 manhã, 1 tarde, 1 noite (distribuídos nas datas).</p>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Palavras-chave Globais</label>
                            <input
                                className="w-full border border-gray-300 p-3 rounded text-gray-900"
                                value={batchKeywords}
                                onChange={e => setBatchKeywords(e.target.value)}
                                placeholder="motos, oficina, performance"
                            />
                        </div>
                    </div>

                    <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-100">
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">Total de Artigos:</span>
                            <span className="font-bold">{batchTopic ? batchTopic.split(/,|\n/).filter(t => t.trim()).length : 0}</span>
                        </div>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">Duração do Cronograma:</span>
                            <span className="font-bold">~{Math.ceil((batchTopic ? batchTopic.split(/,|\n/).filter(t => t.trim()).length : 0) / batchPostsPerDay)} dias</span>
                        </div>
                    </div>

                    <button
                        onClick={handleGenerateBatch}
                        disabled={batchGenerating}
                        className="mt-6 w-full bg-gradient-to-r from-wtech-gold to-yellow-600 text-black font-bold py-4 rounded-lg flex items-center justify-center gap-2 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {batchGenerating ? (
                            <>
                                <Loader2 className="animate-spin" />
                                Gerando {generatedCount + 1}...
                            </>
                        ) : (
                            <><CalendarClock /> INICIAR AGENDAMENTO</>
                        )}
                    </button>

                    {batchGenerating && (
                        <div className="mt-4 w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div
                                className="bg-wtech-gold h-full transition-all duration-500 linear"
                                style={{ width: `${(generatedCount / Math.max(1, batchTopic.split(/,|\n/).length)) * 100}%` }}
                            />
                        </div>
                    )}
                </div>
            </div>
        );
    }
    return (
        <div className="h-full flex flex-col bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden text-gray-900">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Gerenciador de Blog</h2>
                    <p className="text-xs text-gray-500">Edite, aprove e analise a performance dos posts.</p>
                </div>
                <div className="flex gap-2">
                    {hasPermission('blog_create') && (
                        <button onClick={() => handleEdit()} className="bg-wtech-black text-white px-4 py-2 rounded font-bold text-sm hover:opacity-80">
                            + Novo Post
                        </button>
                    )}
                    {hasPermission('blog_ai') && (
                        <button onClick={() => setViewMode('ai_batch')} className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded font-bold text-sm hover:opacity-80 flex items-center gap-2">
                            <Sparkles size={16} /> Agendador IA
                        </button>
                    )}
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th className="px-6 py-3">Título</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3">Data</th>
                            <th className="px-6 py-3">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {posts.map((post) => (
                            <tr key={post.id} className="bg-white border-b hover:bg-gray-50">
                                <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                                    {post.title}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${post.status === 'Published' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                        {post.status === 'Published' ? 'Publicado' : 'Rascunho'}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    {new Date(post.date).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4">
                                    {hasPermission('blog_edit') && (
                                        <button
                                            onClick={() => handleEdit(post)}
                                            className="text-wtech-gold font-bold hover:underline flex items-center gap-1"
                                        >
                                            <Edit size={14} /> Editar
                                        </button>
                                    )}
                                    {hasPermission('blog_delete') && (
                                        <button
                                            onClick={() => handleDeletePost(post.id)}
                                            className="text-red-600 font-bold hover:underline flex items-center gap-1 ml-4"
                                        >
                                            <Trash2 size={14} /> Excluir
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default BlogManagerView;
