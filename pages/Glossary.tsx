import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, Search } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import SEO from '../components/SEO';
import { MOCK_GLOSSARY } from '../constants';
import { supabase } from '../lib/supabaseClient';
import { PUBLIC_BASE_URL, ORGANIZATION_ID } from '../lib/publicUrl';
import { sanitizeHtml } from '../lib/utils';
import type { GlossaryTerm } from '../types';

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function mapRow(row: any): GlossaryTerm {
  return {
    id: String(row.id),
    term: row.term,
    slug: row.slug,
    letter: row.letter,
    content: row.content,
    definition: row.summary || row.content?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
    summary: row.summary,
    seoTitle: row.seo_title,
    niche: row.niche,
    category: row.category,
    image: row.image,
    author: row.author,
    origin: row.origin,
    published: row.published,
    reviewed: row.reviewed,
    views: row.views,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function fallbackTerms(): GlossaryTerm[] {
  return MOCK_GLOSSARY.map((item) => ({
    ...item,
    slug: item.term
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, ''),
    letter: item.term.charAt(0).toUpperCase(),
    summary: item.definition,
    content: `<p>${item.definition}</p>`,
    published: true,
  }));
}

const Glossary: React.FC = () => {
  const { slug } = useParams<{ slug?: string }>();
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [query, setQuery] = useState('');
  const [letter, setLetter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('SITE_GlossaryTerms')
        .select('*')
        .eq('published', true)
        .order('term', { ascending: true });

      if (!active) return;
      if (error) {
        console.warn('[Glossary] Tabela ainda indisponível; usando termos básicos.', error.message);
        setTerms(fallbackTerms());
      } else {
        setTerms((data || []).map(mapRow));
      }
      setLoading(false);
    };

    load();
    return () => { active = false; };
  }, []);

  const selected = slug ? terms.find((item) => item.slug === slug) : undefined;

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return terms.filter((item) => {
      if (letter && item.letter !== letter) return false;
      if (!normalized) return true;
      return [
        item.term,
        item.summary,
        item.definition,
        item.category,
        item.niche,
      ].some((value) => String(value || '').toLowerCase().includes(normalized));
    });
  }, [letter, query, terms]);

  if (slug) {
    if (loading) {
      return <div className="container mx-auto px-4 py-20 text-center text-gray-500">Carregando verbete…</div>;
    }

    if (!selected) {
      return (
        <div className="container mx-auto px-4 py-20 text-center">
          <BookOpen className="mx-auto text-wtech-gold mb-4" size={44} />
          <h1 className="text-3xl font-black text-gray-900 mb-3">Verbete não encontrado</h1>
          <Link to="/glossario" className="text-wtech-red font-bold hover:underline">Voltar ao glossário</Link>
        </div>
      );
    }

    const description = selected.summary || selected.definition || `Entenda ${selected.term} no glossário técnico da W-Tech Brasil.`;
    const canonical = `${PUBLIC_BASE_URL}/glossario/${selected.slug}`;
    const termSetId = `${PUBLIC_BASE_URL}/glossario#termset`;
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'DefinedTerm',
      '@id': `${canonical}#term`,
      name: selected.term,
      description,
      url: canonical,
      inDefinedTermSet: { '@id': termSetId },
      publisher: { '@id': ORGANIZATION_ID },
    };

    return (
      <>
        <SEO
          title={selected.seoTitle || selected.term}
          description={description}
          image={selected.image}
          url={canonical}
          type="article"
          schema={schema}
        />
        <main className="bg-gray-50 min-h-screen">
          <div className="container mx-auto px-4 py-12 lg:py-20 max-w-5xl">
            <Link to="/glossario" className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-wtech-red mb-8">
              <ArrowLeft size={16} /> Voltar ao glossário
            </Link>
            <article className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <header className="bg-wtech-black text-white px-7 py-10 lg:px-14 lg:py-14 relative overflow-hidden">
                <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-wtech-gold/10" />
                <span className="relative text-xs font-black text-wtech-gold uppercase tracking-[0.25em]">
                  {selected.category || 'Glossário Técnico'}
                </span>
                <h1 className="relative mt-3 text-4xl lg:text-6xl font-display font-black tracking-tight">
                  {selected.term}
                </h1>
                {selected.summary && (
                  <p className="relative text-gray-300 mt-5 text-lg max-w-3xl leading-relaxed">{selected.summary}</p>
                )}
              </header>
              <div
                className="prose prose-lg max-w-none px-7 py-10 lg:px-14 lg:py-14 prose-headings:font-black prose-headings:text-gray-900 prose-h2:border-l-4 prose-h2:border-wtech-gold prose-h2:pl-4 prose-a:text-wtech-red"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(selected.content || `<p>${description}</p>`) }}
              />
            </article>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <SEO
        title="Glossário Técnico de Suspensão"
        description="Consulte definições sobre suspensão de motocicletas, ajustes, componentes, preparação e diagnóstico técnico."
        url={`${PUBLIC_BASE_URL}/glossario`}
        schema={{
          '@context': 'https://schema.org',
          '@type': 'DefinedTermSet',
          '@id': `${PUBLIC_BASE_URL}/glossario#termset`,
          name: 'Glossário Técnico W-Tech Brasil',
          url: `${PUBLIC_BASE_URL}/glossario`,
          inLanguage: 'pt-BR',
          publisher: { '@id': ORGANIZATION_ID },
          // Só os termos realmente listados na tela — schema tem que espelhar o visível.
          hasDefinedTerm: filtered.map((item) => ({
            '@type': 'DefinedTerm',
            '@id': `${PUBLIC_BASE_URL}/glossario/${item.slug}#term`,
            name: item.term,
            description: item.summary || item.definition,
            url: `${PUBLIC_BASE_URL}/glossario/${item.slug}`,
          })),
        }}
      />
      <main className="bg-gray-50 min-h-screen">
        <section className="bg-wtech-black text-white">
          <div className="container mx-auto px-4 py-14 lg:py-20">
            <span className="text-wtech-gold text-xs font-black uppercase tracking-[0.3em]">Base de conhecimento W-Tech</span>
            <h1 className="text-4xl lg:text-6xl font-display font-black mt-3">Glossário Técnico</h1>
            <p className="text-gray-300 mt-4 max-w-2xl text-lg">
              Entenda os termos utilizados na engenharia, preparação e manutenção de suspensões de motocicletas.
            </p>
          </div>
        </section>

        <div className="container mx-auto px-4 py-10 lg:py-14">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 lg:p-6 mb-10">
            <div className="relative max-w-2xl">
              <input
                type="search"
                placeholder="Pesquisar termo, categoria ou assunto…"
                className="w-full pl-11 pr-4 py-3.5 border border-gray-200 rounded-xl focus:outline-none focus:border-wtech-gold"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <Search className="absolute left-4 top-4 text-gray-400" size={20} />
            </div>

            <div className="flex flex-wrap gap-1.5 mt-5 pt-5 border-t border-gray-100">
              <button
                onClick={() => setLetter(null)}
                className={`h-8 px-3 rounded-lg text-xs font-black transition-colors ${letter === null ? 'bg-wtech-red text-white' : 'bg-gray-100 text-gray-500 hover:text-black'}`}
              >
                TODOS
              </button>
              {alphabet.map((item) => {
                const count = terms.filter((term) => term.letter === item).length;
                return (
                  <button
                    key={item}
                    onClick={() => count && setLetter(item)}
                    disabled={!count}
                    className={`h-8 w-8 rounded-lg text-xs font-black transition-colors ${
                      letter === item
                        ? 'bg-wtech-red text-white'
                        : count
                          ? 'bg-gray-100 text-gray-600 hover:text-black'
                          : 'bg-gray-50 text-gray-300 cursor-not-allowed'
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-16 text-gray-500">Carregando glossário…</div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((item) => (
                <Link
                  to={`/glossario/${item.slug}`}
                  key={item.id}
                  className="group bg-white p-6 rounded-2xl shadow-sm hover:shadow-lg transition-all border border-gray-100 border-t-4 border-t-wtech-black hover:-translate-y-1"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs font-bold text-wtech-gold uppercase tracking-wider">{item.category || item.letter}</span>
                    <span className="h-8 w-8 flex items-center justify-center rounded-lg bg-gray-100 text-xs font-black text-gray-500 group-hover:bg-wtech-red group-hover:text-white">
                      {item.letter}
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-gray-900 mt-3 mb-3 group-hover:text-wtech-red transition-colors">{item.term}</h2>
                  <p className="text-gray-600 leading-relaxed text-sm line-clamp-4">
                    {item.summary || item.definition || 'Acesse para consultar a definição completa.'}
                  </p>
                  <span className="inline-block mt-5 text-xs font-black uppercase tracking-wider text-gray-400 group-hover:text-wtech-red">
                    Ler definição →
                  </span>
                </Link>
              ))}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
              <BookOpen className="mx-auto text-gray-300 mb-3" size={38} />
              <p className="text-gray-500">Nenhum termo encontrado.</p>
            </div>
          )}
        </div>
      </main>
    </>
  );
};

export default Glossary;
