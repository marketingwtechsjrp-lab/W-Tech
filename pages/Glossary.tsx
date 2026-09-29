import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Search } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import SEO from '../components/SEO';
import { MOCK_GLOSSARY } from '../constants';
import { supabase } from '../lib/supabaseClient';
import { PUBLIC_BASE_URL, ORGANIZATION_ID } from '../lib/publicUrl';
import { sanitizeHtml } from '../lib/utils';
import type { GlossaryTerm } from '../types';
import { COURSE_NAME } from '../lib/courseSchema';

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// Colunas da listagem: sem `content`. Com o glossário antigo de volta são
// centenas de verbetes; baixar o texto de todos a cada visita pesaria megabytes.
const LIST_COLUMNS = 'id, term, slug, letter, category, summary, niche, published';

/** Limite de verbetes no JSON-LD da listagem (o schema não precisa repetir a página inteira). */
const SCHEMA_LIST_LIMIT = 100;

const SUSPENSAO_RE = /suspens|amortec|mola|sag|pr[eé]-?carga|bengala|garfo|kyb|showa|wp\b|retorno|compress/;

function ehSuspensao(term: GlossaryTerm) {
  // O glossário antigo já vem com a categoria certa (gerar_sql.py separa "mola de
  // válvula" e "compressão do motor" da suspensão), então nele a categoria manda.
  if (term.origin === 'WORDPRESS_LEGADO') return term.category === 'Suspensão';
  return SUSPENSAO_RE.test(`${term.category || ''} ${term.term} ${term.slug || ''}`.toLowerCase());
}

/** Verbetes de suspensão levam o curso online; os de motor e mecânica, os cursos da W-Tech. */
function ctaFor(term: GlossaryTerm) {
  if (ehSuspensao(term)) {
    return {
      eyebrow: 'Curso online',
      title: 'Aprenda a regular a suspensão da sua moto',
      text: `No ${COURSE_NAME} você aprende, do zero, a medir o SAG e a acertar molas, óleo e cliques na sua própria moto.`,
      href: '/curso-suspensao-piloto',
      label: 'Conhecer o curso',
    };
  }
  return {
    eyebrow: 'Cursos W-Tech',
    title: 'Quer dominar a mecânica da sua moto?',
    text: 'A W-Tech forma pilotos e mecânicos em cursos presenciais e online de suspensão.',
    href: '/cursos',
    label: 'Ver os cursos',
  };
}

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
  const [selected, setSelected] = useState<GlossaryTerm | undefined>(undefined);
  const [loadingTerm, setLoadingTerm] = useState(Boolean(slug));

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('SITE_GlossaryTerms')
        .select(LIST_COLUMNS)
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

  // O verbete aberto vem sozinho, com o texto completo.
  useEffect(() => {
    if (!slug) { setSelected(undefined); setLoadingTerm(false); return; }
    let active = true;
    setLoadingTerm(true);
    supabase
      .from('SITE_GlossaryTerms')
      .select('*')
      .eq('slug', slug)
      .eq('published', true)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error || !data) {
          setSelected(fallbackTerms().find((item) => item.slug === slug));
        } else {
          setSelected(mapRow(data));
        }
        setLoadingTerm(false);
      });
    return () => { active = false; };
  }, [slug]);

  // Relacionados: os próximos da mesma categoria em ordem alfabética, dando a volta.
  // Assim cada verbete recebe link dos anteriores, em vez de os 8 primeiros da
  // categoria levarem todos os links do glossário.
  const related = useMemo(() => {
    if (!selected?.category) return [];
    const mesmaCategoria = terms.filter((item) => item.category === selected.category);
    const posicao = mesmaCategoria.findIndex((item) => item.slug === selected.slug);
    const seguintes = posicao < 0
      ? mesmaCategoria
      : [...mesmaCategoria.slice(posicao + 1), ...mesmaCategoria.slice(0, posicao)];
    return seguintes.slice(0, 8);
  }, [selected, terms]);

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
    if (loadingTerm) {
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
      inLanguage: 'pt-BR',
      inDefinedTermSet: { '@id': termSetId },
    };
    const cta = ctaFor(selected);

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
              <aside className="mx-7 mb-10 lg:mx-14 lg:mb-14 rounded-2xl bg-wtech-black text-white p-6 lg:p-8 flex flex-col md:flex-row md:items-center gap-5 md:justify-between">
                <div>
                  <span className="text-xs font-black text-wtech-gold uppercase tracking-[0.25em]">{cta.eyebrow}</span>
                  <p className="text-xl lg:text-2xl font-black mt-2">{cta.title}</p>
                  <p className="text-gray-300 mt-2 max-w-2xl">{cta.text}</p>
                </div>
                <Link to={cta.href} className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-wtech-red px-5 py-3 font-black text-white hover:brightness-110">
                  {cta.label} <ArrowRight size={18} />
                </Link>
              </aside>
            </article>
            {related.length > 0 && (
              <nav aria-label="Verbetes relacionados" className="mt-10">
                <h2 className="text-lg font-black text-gray-900 mb-4">Veja também</h2>
                <ul className="grid sm:grid-cols-2 gap-3">
                  {related.map((item) => (
                    <li key={item.id}>
                      <Link to={`/glossario/${item.slug}`} className="block bg-white rounded-xl border border-gray-100 px-4 py-3 font-bold text-gray-800 hover:text-wtech-red hover:border-wtech-gold">
                        {item.term}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            )}
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <SEO
        title="Glossário Técnico de Motos: Suspensão, Motor e Freios"
        description="Termos de mecânica de motos explicados: suspensão, amortecedor, bengala, SAG, motor, freios, transmissão e elétrica. Glossário técnico da W-Tech Brasil."
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
          hasDefinedTerm: filtered.slice(0, SCHEMA_LIST_LIMIT).map((item) => ({
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
              Entenda os termos de suspensão, motor, freios, transmissão e manutenção de motocicletas.
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
