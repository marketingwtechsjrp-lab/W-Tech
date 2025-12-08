import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { BlogPost } from '../types';
import { Clock, ChevronRight, Search, Calendar, User, ArrowRight } from 'lucide-react';
import SEO from '../components/SEO';

const Blog: React.FC = () => {
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('SITE_BlogPosts')
            .select('*')
            .eq('status', 'Published')
            .order('date', { ascending: false });

        if (data) {
            setPosts(data.map((p: any) => ({
                ...p,
                seoScore: p.seo_score || 0
            })));
        }
        setLoading(false);
    };

    const calculateReadTime = (content: string) => {
        const text = content.replace(/<[^>]*>/g, ''); // Strip HTML
        const words = text.trim().split(/\s+/).length;
        return Math.ceil(words / 200); // 200 wpm
    };

    const filteredPosts = posts.filter(p =>
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const featuredPost = filteredPosts[0];
    const gridPosts = filteredPosts.slice(1);

    return (
        <div className="bg-gray-50 min-h-screen">
            <SEO
                title="Blog Tech"
                description="Artigos técnicos, novidades sobre suspensão automotiva e dicas de especialistas da W-Tech Brasil."
            />
            {/* Header */}
            <div className="bg-wtech-black text-white py-16 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                <div className="relative z-10 container mx-auto px-4">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">W-TECH <span className="text-wtech-gold">INSIGHTS</span></h1>
                    <p className="text-gray-400 max-w-2xl mx-auto text-lg">
                        Conteúdo técnico de ponta, novidades da engenharia de competição e tutoriais exclusivos.
                    </p>
                </div>
            </div>

            <div className="container mx-auto px-4 -mt-8 pb-20 relative z-20">
                {/* Search Bar */}
                <div className="bg-white p-4 rounded-lg shadow-lg max-w-2xl mx-auto mb-12 flex items-center gap-2">
                    <Search className="text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar artigo por título ou assunto..."
                        className="flex-grow outline-none text-gray-700"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wtech-gold"></div>
                    </div>
                ) : filteredPosts.length === 0 ? (
                    <div className="text-center py-20 text-gray-500">Nenhum artigo encontrado.</div>
                ) : (
                    <>
                        {/* Featured Hero Post (First Item) */}
                        {featuredPost && (
                            <div className="group relative rounded-2xl overflow-hidden shadow-2xl mb-16 h-[500px] flex items-end">
                                <img
                                    src={featuredPost.image}
                                    alt={featuredPost.title}
                                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent"></div>

                                <div className="relative z-10 p-8 md:p-12 w-full max-w-4xl">
                                    <div className="flex items-center gap-4 mb-4 text-xs font-bold uppercase tracking-wider text-wtech-gold">
                                        <span className="bg-wtech-gold text-black px-2 py-1 rounded">{featuredPost.category}</span>
                                        <span className="flex items-center gap-1 text-white/80"><Clock size={14} /> {calculateReadTime(featuredPost.content)} min leitura</span>
                                    </div>
                                    <Link to={`/blog/${featuredPost.slug || featuredPost.id}`}>
                                        <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 hover:text-wtech-gold transition-colors leading-tight">
                                            {featuredPost.title}
                                        </h2>
                                    </Link>
                                    <p className="text-gray-300 text-lg line-clamp-2 mb-6 max-w-2xl">
                                        {featuredPost.excerpt}
                                    </p>
                                    <Link
                                        to={`/blog/${featuredPost.slug || featuredPost.id}`}
                                        className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/30 text-white px-6 py-3 rounded font-bold hover:bg-white hover:text-black transition-all"
                                    >
                                        LER ARTIGO COMPLETO <ArrowRight size={18} />
                                    </Link>
                                </div>
                            </div>
                        )}

                        {/* Grid for Other Posts */}
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {gridPosts.map(post => (
                                <Link key={post.id} to={`/blog/${post.slug || post.id}`} className="group bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col overflow-hidden h-full">
                                    <div className="h-48 overflow-hidden relative">
                                        <img
                                            src={post.image}
                                            alt={post.title}
                                            className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                                        />
                                        <div className="absolute top-4 left-4 bg-wtech-black/80 backdrop-blur text-white text-[10px] font-bold px-2 py-1 rounded uppercase">
                                            {post.category}
                                        </div>
                                    </div>
                                    <div className="p-6 flex flex-col flex-grow">
                                        <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                                            <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(post.date).toLocaleDateString()}</span>
                                            <span className="flex items-center gap-1"><Clock size={12} /> {calculateReadTime(post.content)} min</span>
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-wtech-gold transition-colors">
                                            {post.title}
                                        </h3>
                                        <p className="text-gray-600 text-sm line-clamp-3 mb-4 flex-grow">
                                            {post.excerpt}
                                        </p>
                                        <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                                                    <User size={12} className="text-gray-500" />
                                                </div>
                                                <span className="text-xs font-bold text-gray-700">{post.author}</span>
                                            </div>
                                            <span className="text-wtech-gold font-bold text-xs flex items-center gap-1">
                                                LER MAIS <ChevronRight size={14} />
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default Blog;