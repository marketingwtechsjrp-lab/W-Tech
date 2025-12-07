import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { BlogPost } from '../types';
import {
  Clock, Calendar, User, Share2, ArrowLeft, Play, Pause,
  Volume2, Facebook, Twitter, Linkedin, Copy
} from 'lucide-react';
import { motion, useScroll, useSpring } from 'framer-motion';
import SEO from '../components/SEO';

const BlogPostReader: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  // TTS State
  const [isPlaying, setIsPlaying] = useState(false);
  const [utterance, setUtterance] = useState<SpeechSynthesisUtterance | null>(null);

  // Scroll Progress
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  useEffect(() => {
    fetchPost();
    return () => {
      // Cleanup TTS on unmount
      window.speechSynthesis.cancel();
    };
  }, [slug]);

  const fetchPost = async () => {
    if (!slug) return;
    setLoading(true);
    try {
      // Try finding by slug first, then by ID as fallback
      let { data, error } = await supabase
        .from('SITE_BlogPosts')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (error) console.error("Error fetching by slug:", error);

      if (!data) {
        // Fallback to ID only if slug is a valid UUID to avoid PG errors
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
        if (isUUID) {
          const { data: dataId, error: errorId } = await supabase
            .from('SITE_BlogPosts')
            .select('*')
            .eq('id', slug)
            .maybeSingle();
          if (dataId) data = dataId;
          if (errorId) console.error("Error fetching by ID:", errorId);
        }
      }

      if (data) {
        setPost(data);
        // Increment View Count (Non-blocking)
        supabase.rpc('increment_post_view', { post_id: data.id }).then(({ error }) => {
          if (error) {
            // Fallback if RPC fails or doesn't exist
            supabase.from('SITE_BlogPosts').update({ views: (data.views || 0) + 1 }).eq('id', data.id);
          }
        });

        if (data.content) prepareTTS(data.content);
      } else {
        console.warn("Post not found for slug:", slug);
      }
    } catch (err) {
      console.error("Unexpected error in fetchPost:", err);
    } finally {
      setLoading(false);
    }
  };

  const calculateReadTime = (content: string) => {
    const text = content.replace(/<[^>]*>/g, '');
    const words = text.trim().split(/\s+/).length;
    return Math.ceil(words / 200);
  };

  // Prepare Text-to-Speech
  const prepareTTS = (htmlContent: string) => {
    // Simply clear previous to avoid conflicts
    window.speechSynthesis.cancel();
  };

  const speakText = (text: string) => {
    // Split by sentence to avoid browser limits (Chrome stops at ~200-300 chars often)
    // This is a naive implementation but works better than full text
    const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];

    let index = 0;
    const speakNext = () => {
      if (index < sentences.length && isPlaying) {
        const u = new SpeechSynthesisUtterance(sentences[index]);
        u.lang = 'pt-BR';
        u.rate = 1.1;
        u.onend = () => {
          index++;
          speakNext();
        };
        u.onerror = (e) => {
          console.error("TTS Error", e);
          setIsPlaying(false);
        };
        setUtterance(u); // Keep ref to current
        window.speechSynthesis.speak(u);
      } else {
        setIsPlaying(false);
      }
    };
    speakNext();
  };

  const toggleSpeech = () => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    } else {
      if (!post?.content) return;
      setIsPlaying(true);
      const text = post.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      speakText(text);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wtech-gold"></div></div>;

  if (!post) return <div className="text-center py-20">Post não encontrado.</div>;

  return (
    <div className="bg-white min-h-screen relative">
      <SEO
        title={post.title}
        description={post.excerpt}
        image={post.image}
        type="article"
        schema={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          "headline": post.title,
          "image": post.image,
          "author": {
            "@type": "Person",
            "name": post.author
          },
          "publisher": {
            "@type": "Organization",
            "name": "W-TECH Brasil",
            "logo": {
              "@type": "ImageObject",
              "url": "https://w-techbrasil.com.br/logo.png"
            }
          },
          "datePublished": post.date,
          "description": post.excerpt
        }}
      />
      {/* Scroll Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-wtech-gold origin-left z-50"
        style={{ scaleX }}
      />

      {/* Floating Audio Player */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1 }}
        className="fixed bottom-6 right-6 z-40 bg-wtech-black text-white p-4 rounded-full shadow-2xl flex items-center gap-4 border border-wtech-gold/20 backdrop-blur-md"
      >
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-wtech-gold uppercase">Ouvir Artigo</span>
          <span className="text-xs text-gray-300">{isPlaying ? 'Reproduzindo...' : 'Clique para ouvir'}</span>
        </div>
        <button
          onClick={toggleSpeech}
          className="w-12 h-12 bg-wtech-gold rounded-full flex items-center justify-center text-black hover:scale-110 transition-transform shadow-lg"
        >
          {isPlaying ? <Pause fill="black" size={20} /> : <Play fill="black" size={20} className="ml-1" />}
        </button>
      </motion.div>

      {/* Hero Header */}
      <header className="relative h-[60vh] min-h-[400px]">
        <div className="absolute inset-0">
          <img src={post.image} alt={post.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
        </div>

        <div className="absolute top-6 left-6 z-10">
          <Link to="/blog" className="flex items-center gap-2 text-white/80 hover:text-wtech-gold transition-colors font-bold text-sm bg-black/30 px-4 py-2 rounded-full backdrop-blur">
            <ArrowLeft size={16} /> Voltar para o Blog
          </Link>
        </div>

        <div className="absolute bottom-0 w-full p-8 md:p-16">
          <div className="container mx-auto max-w-4xl">
            <div className="flex flex-wrap gap-4 mb-6 text-sm font-bold text-white/80">
              <span className="bg-wtech-gold text-black px-3 py-1 rounded uppercase tracking-wider">{post.category}</span>
              <span className="flex items-center gap-2 bg-black/50 px-3 py-1 rounded backdrop-blur"><Clock size={16} className="text-wtech-gold" /> {calculateReadTime(post.content)} min de leitura</span>
              <span className="flex items-center gap-2 bg-black/50 px-3 py-1 rounded backdrop-blur"><Calendar size={16} className="text-wtech-gold" /> {new Date(post.date).toLocaleDateString()}</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight drop-shadow-lg mb-6">
              {post.title}
            </h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center border-2 border-wtech-gold">
                  <User size={20} className="text-gray-600" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Escrito por</p>
                  <p className="text-wtech-gold text-sm">{post.author}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12 max-w-4xl flex flex-col md:flex-row gap-12">
        {/* Article Body */}
        <article className="flex-grow">
          {/* Excerpt */}
          <p className="text-xl md:text-2xl text-gray-600 font-medium leading-relaxed mb-10 border-l-4 border-wtech-gold pl-6 italic">
            {post.excerpt}
          </p>

          {/* HTML Content Injection */}
          <div
            className="prose prose-lg prose-slate max-w-none 
                prose-headings:font-bold prose-headings:text-wtech-black 
                prose-a:text-wtech-gold prose-a:no-underline hover:prose-a:underline
                prose-img:rounded-xl prose-img:shadow-lg
                prose-blockquote:border-l-wtech-gold prose-blockquote:bg-gray-50 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:not-italic
                "
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* Tags */}
          <div className="mt-12 pt-8 border-t border-gray-100">
            <h3 className="text-sm font-bold text-gray-500 uppercase mb-3">Tópicos Relacionados</h3>
            <div className="flex flex-wrap gap-2">
              {post.keywords && post.keywords.map(tag => (
                <span key={tag} className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1 rounded text-sm transition-colors cursor-pointer">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </article>

        {/* Sidebar / Share */}
        <aside className="md:w-64 flex-shrink-0 space-y-8">
          <div className="sticky top-24">
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Share2 size={18} /> Compartilhar</h3>
              <div className="grid grid-cols-2 gap-2">
                <button className="flex items-center justify-center gap-2 bg-[#1877F2] text-white py-2 rounded text-xs font-bold hover:opacity-90"><Facebook size={16} /> Facebook</button>
                <button className="flex items-center justify-center gap-2 bg-[#1DA1F2] text-white py-2 rounded text-xs font-bold hover:opacity-90"><Twitter size={16} /> Twitter</button>
                <button className="flex items-center justify-center gap-2 bg-[#0A66C2] text-white py-2 rounded text-xs font-bold hover:opacity-90"><Linkedin size={16} /> LinkedIn</button>
                <button
                  onClick={() => { navigator.clipboard.writeText(window.location.href); alert('Link copiado!'); }}
                  className="flex items-center justify-center gap-2 bg-gray-800 text-white py-2 rounded text-xs font-bold hover:bg-black"
                >
                  <Copy size={16} /> Copiar
                </button>
              </div>
            </div>

            <div className="mt-8 bg-wtech-black text-white p-6 rounded-xl text-center">
              <h3 className="font-bold text-lg mb-2 text-wtech-gold">Gostou do conteúdo?</h3>
              <p className="text-sm text-gray-400 mb-4">Inscreva-se para receber novos artigos e dicas técnicas.</p>
              <input type="email" placeholder="Seu melhor e-mail" className="w-full bg-white/10 border border-white/20 rounded p-2 text-sm mb-2 text-white placeholder-gray-500 focus:border-wtech-gold outline-none" />
              <button className="w-full bg-wtech-gold text-black font-bold py-2 rounded text-sm hover:bg-white transition-colors">QUERO RECEBER</button>
            </div>
          </div>
        </aside>
      </main>

    </div>
  );
};

export default BlogPostReader;