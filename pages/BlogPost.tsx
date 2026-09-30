import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { BlogPost } from '../types';
import {
  Clock, Calendar, User, ArrowLeft, Play, Pause,
  Facebook, Twitter, Linkedin, Copy
} from 'lucide-react';
import { motion, useScroll, useSpring } from 'framer-motion';
import SEO from '../components/SEO';
import { formatDateLocal, sanitizeHtml } from '../lib/utils';
import { normalizeBlogContentImages, resolveBlogImage } from '../lib/blogImages';
import { ORGANIZATION_ID, absoluteUrl } from '../lib/publicUrl';
import { CourseCard, PostConversion } from '../components/blog/PostConversion';
import { PostHero, PostCourseExperience } from '../components/blog/PostExperience';

// Rótulos de importação/geração e a assinatura da equipe não são pessoa: viram a
// própria W-Tech no schema.
const AUTORES_DE_SISTEMA = /^(importado wp|w-tech ai|ai generator|equipe w-tech)$/i;

const BlogPostReader: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // TTS State
  const [isPlaying, setIsPlaying] = useState(false);
  const isPlayingRef = useRef(false);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);

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
      window.speechSynthesis?.cancel();
      isPlayingRef.current = false;
    };
  }, [slug]);

  const fetchPost = async () => {
    if (!slug) return;
    setLoading(true);
    setPost(null);
    setCopied(false);
    try {
      let { data, error } = await supabase
        .from('SITE_BlogPosts')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (error) console.error("Error fetching by slug:", error);

      if (!data) {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
        if (isUUID) {
          const { data: dataId, error: errorId } = await supabase
            .from('SITE_BlogPosts')
            .select('*')
            .eq('id', slug)
            .maybeSingle();
          if (dataId) data = dataId;
        }
      }

      if (data) {
        setPost(data);
        supabase.rpc('increment_post_view', { post_id: data.id }).then(({ error }) => {
          if (error) {
             supabase.from('SITE_BlogPosts').update({ views: (data.views || 0) + 1 }).eq('id', data.id);
          }
        });
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

  const speakText = (text: string, startIndex = 0) => {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    let index = startIndex;

    const speakNext = () => {
      if (!isPlayingRef.current) return;

      if (index < sentences.length) {
        const utterance = new SpeechSynthesisUtterance(sentences[index].trim());
        
        // Find a Portuguese voice (prioritize Google or high quality ones)
        let voices = window.speechSynthesis.getVoices();
        let ptVoice = voices.find(v => v.lang === 'pt-BR' && v.name.includes('Google')) || 
                      voices.find(v => v.lang === 'pt-BR') ||
                      voices.find(v => v.lang.startsWith('pt'));

        if (ptVoice) utterance.voice = ptVoice;
        
        utterance.lang = 'pt-BR';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        utterance.onstart = () => {
          console.log("Speaking sentence", index);
        };

        utterance.onend = () => {
          index++;
          setCurrentSentenceIndex(index);
          speakNext();
        };

        utterance.onerror = (event) => {
          console.error('SpeechSynthesisUtterance error', event);
          setIsPlaying(false);
          isPlayingRef.current = false;
        };

        window.speechSynthesis.speak(utterance);
      } else {
        setIsPlaying(false);
        isPlayingRef.current = false;
        setCurrentSentenceIndex(0);
      }
    };

    speakNext();
  };

  const toggleSpeech = () => {
    if (isPlaying) {
      window.speechSynthesis?.cancel();
      setIsPlaying(false);
      isPlayingRef.current = false;
    } else {
      if (!post?.content) return;
      
      const cleanText = post.title + ". " + post.content
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      setIsPlaying(true);
      isPlayingRef.current = true;
      speakText(cleanText, currentSentenceIndex);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wtech-gold"></div></div>;

  if (!post) return <div className="text-center py-20">Post não encontrado.</div>;

  const coverImage = resolveBlogImage(post);
  const articleContent = normalizeBlogContentImages(post.content, post);
  // Schema e og:image pedem URL absoluta; a capa vinha relativa (/images/blog/…).
  const coverImageUrl = /^https?:\/\//.test(coverImage) ? coverImage : absoluteUrl(coverImage);
  const postUrl = absoluteUrl(`/blog/${post.slug}`);
  const autorReal = post.author && !AUTORES_DE_SISTEMA.test(post.author.trim());
  // Nenhum post linkava a página do curso: o fim do artigo passa a levar a ela.
  const shareUrl = encodeURIComponent(postUrl);

  return (
    <div className="post-reader min-h-screen relative">
      <SEO
        title={post.title}
        description={post.excerpt}
        image={coverImageUrl}
        type="article"
        schema={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          "@id": `${postUrl}#post`,
          "mainEntityOfPage": postUrl,
          "headline": post.title,
          "image": coverImageUrl,
          "inLanguage": "pt-BR",
          "author": autorReal
            ? { "@type": "Person", "name": post.author }
            : { "@id": ORGANIZATION_ID },
          "publisher": {
            "@id": ORGANIZATION_ID,
            "@type": "Organization",
            "name": "W-TECH Brasil",
            "logo": {
              "@type": "ImageObject",
              // /logo.png dava 404; este é o mesmo logo do grafo do index.html.
              "url": "https://w-techbrasil.com.br/logo-wtech-letreiro.png"
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

      <PostHero title={post.title} excerpt={post.excerpt} category={post.category} author={autorReal ? post.author : 'Equipe W-Tech'} date={post.date} readTime={calculateReadTime(post.content)} audio={<button className="post-audio" onClick={toggleSpeech} aria-label={isPlaying ? 'Pausar leitura do artigo' : 'Ouvir artigo'}>{isPlaying ? <Pause size={16} /> : <Play size={16} />} {isPlaying ? 'Pausar leitura' : 'Ouvir artigo'}</button>} />
      <div id="post-reading" className="post-shell"><div className="post-reading-label"><strong>Conhecimento W-Tech. Aplicação na sua moto.</strong><span>GUIA DE LEITURA · {calculateReadTime(post.content)} MIN</span></div></div>
      <main className="post-shell post-content-grid">
        <article>
          {/* HTML Content Injection */}
          <div
            data-post-body
            className="prose prose-lg prose-slate max-w-none 
                prose-headings:font-bold prose-headings:text-wtech-black 
                prose-a:text-wtech-gold prose-a:no-underline hover:prose-a:underline
                prose-img:rounded-xl prose-img:shadow-lg
                prose-blockquote:border-l-wtech-gold prose-blockquote:bg-gray-50 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:not-italic
                "
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(articleContent) }}
          />

          <CourseCard />

          {/* Tags */}
          <div className="post-tags mt-12 pt-8 border-t border-gray-100">
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

        <aside className="post-sidebar">
          <CourseCard compact />
          <p className="post-sidebar-note">Aprenda os fundamentos, faça os ajustes e entenda como sua moto responde. Aulas online para acompanhar no seu ritmo.</p>
          <div className="post-share">
            <h3>Compartilhe este conhecimento</h3>
            <div className="post-share-actions">
              <a href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`} target="_blank" rel="noopener noreferrer" aria-label="Compartilhar no Facebook"><Facebook size={18} /></a>
              <a href={`https://twitter.com/intent/tweet?url=${shareUrl}&text=${encodeURIComponent(post.title)}`} target="_blank" rel="noopener noreferrer" aria-label="Compartilhar no X"><Twitter size={18} /></a>
              <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`} target="_blank" rel="noopener noreferrer" aria-label="Compartilhar no LinkedIn"><Linkedin size={18} /></a>
              <button onClick={async () => { try { await navigator.clipboard.writeText(postUrl); setCopied(true); } catch { setCopied(false); } }}><Copy size={16} /> {copied ? 'Copiado' : 'Copiar link'}</button>
            </div>
          </div>
        </aside>
      </main>
      <PostCourseExperience />
      <PostConversion key={post.slug} slug={post.slug} title={post.title} />

    </div>
  );
};

export default BlogPostReader;
