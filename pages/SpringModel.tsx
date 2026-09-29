import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Gauge } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import SEO from '../components/SEO';
import { supabase } from '../lib/supabaseClient';
import { PUBLIC_BASE_URL } from '../lib/publicUrl';
import { COURSE_NAME } from '../lib/courseSchema';
import {
  faixaDoPeso,
  formatarTaxa,
  montarTabela,
  type LinhaMola,
  type Mola,
} from '../lib/springModels';

type ModeloDaMarca = { model: string; model_slug: string };

/** Pesos das perguntas frequentes: os mais comuns entre pilotos adultos. */
const PESOS_DAS_PERGUNTAS = [80, 95];

const descreverMola = (mola: Mola | null) =>
  mola ? `${formatarTaxa(mola.taxa)} (${mola.codigo})` : 'não informada no catálogo';

const juntar = (itens: string[]) =>
  itens.length <= 1 ? itens.join('') : `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`;

/**
 * /molas/<modelo>: a tabela de molas de um modelo, em HTML. Texto montado só a
 * partir do catálogo (SITE_SpringRecommendations): nada aqui é gerado por IA.
 */
const SpringModel: React.FC = () => {
  const { slug = '' } = useParams<{ slug: string }>();
  const [linhas, setLinhas] = useState<LinhaMola[]>([]);
  const [irmaos, setIrmaos] = useState<ModeloDaMarca[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    supabase
      .from('SITE_SpringRecommendations')
      .select('brand, model, part_type, weight_range, spring_code, standard_code')
      .eq('model_slug', slug)
      .then(({ data, error }) => {
        if (!ativo) return;
        if (error) console.warn('[Molas] tabela do modelo indisponível:', error.message);
        setLinhas((data as LinhaMola[] | null) || []);
        setCarregando(false);
      });
    return () => { ativo = false; };
  }, [slug]);

  const marca = linhas[0]?.brand || '';
  const modelo = linhas[0]?.model || '';

  // Outros anos e versões da mesma marca, para o leitor achar o ano certo.
  useEffect(() => {
    if (!marca) return;
    let ativo = true;
    supabase
      .from('SITE_SpringModels')
      .select('model, model_slug')
      .eq('brand', marca)
      .order('model', { ascending: true })
      .then(({ data }) => {
        if (ativo) setIrmaos(((data as ModeloDaMarca[] | null) || []).filter((m) => m.model_slug !== slug));
      });
    return () => { ativo = false; };
  }, [marca, slug]);

  const tabela = useMemo(() => montarTabela(linhas), [linhas]);

  if (carregando) {
    return <div className="container mx-auto px-4 py-20 text-center text-gray-500">Carregando tabela de molas…</div>;
  }

  if (!linhas.length) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <Gauge className="mx-auto text-wtech-gold mb-4" size={44} />
        <h1 className="text-3xl font-black text-gray-900 mb-3">Modelo não encontrado</h1>
        <Link to="/molas" className="text-wtech-red font-bold hover:underline">Ver todos os modelos</Link>
      </div>
    );
  }

  const nome = `${marca} ${modelo}`;
  const url = `${PUBLIC_BASE_URL}/molas/${slug}`;
  const temBengala = tabela.faixas.some((f) => f.bengala);
  const temAmortecedor = tabela.faixas.some((f) => f.amortecedor);
  // Mesma família: primeiro "nome" do modelo igual (ex.: CRF450R de outros anos).
  const familia = modelo.split(/[\s-]/)[0].toLowerCase();
  const mesmaFamilia = irmaos.filter((m) => m.model.split(/[\s-]/)[0].toLowerCase() === familia);

  const perguntas: Array<{ q: string; a: string }> = [];
  if (tabela.fabricaBengala || tabela.fabricaAmortecedor) {
    perguntas.push({
      q: `Qual é a mola de fábrica da ${nome}?`,
      a: [
        tabela.fabricaBengala ? `Na bengala, ${descreverMola(tabela.fabricaBengala)}.` : '',
        tabela.fabricaAmortecedor ? `No amortecedor traseiro, ${descreverMola(tabela.fabricaAmortecedor)}.` : '',
      ].filter(Boolean).join(' '),
    });
  }
  for (const peso of PESOS_DAS_PERGUNTAS) {
    const faixa = faixaDoPeso(tabela, peso);
    if (!faixa) continue;
    perguntas.push({
      q: `Qual mola usar na ${nome} para um piloto de ${peso} kg equipado?`,
      a: [
        `A faixa de ${faixa.rotulo} indica`,
        juntar([
          faixa.bengala ? `mola de ${descreverMola(faixa.bengala)} na bengala` : '',
          faixa.amortecedor ? `mola de ${descreverMola(faixa.amortecedor)} no amortecedor` : '',
        ].filter(Boolean)) + '.',
        'Depois da troca, confira o SAG e ajuste a pré-carga.',
      ].join(' '),
    });
  }
  perguntas.push({
    q: 'A tabela vale para outros anos do mesmo modelo?',
    a: `Não necessariamente. Esta tabela vale para a ${nome}. Anos e versões diferentes podem ter bengala, amortecedor e link diferentes, e por isso mola diferente: consulte a tabela do ano certo.`,
  });

  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Início', item: `${PUBLIC_BASE_URL}/` },
          { '@type': 'ListItem', position: 2, name: 'Molas de suspensão', item: `${PUBLIC_BASE_URL}/molas` },
          { '@type': 'ListItem', position: 3, name: nome, item: url },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: perguntas.map((p) => ({
          '@type': 'Question',
          name: p.q,
          acceptedAnswer: { '@type': 'Answer', text: p.a },
        })),
      },
    ],
  };

  return (
    <>
      <SEO
        title={`Mola para ${nome}: tabela por peso`}
        description={`Qual mola usar na bengala e no amortecedor da ${nome}: tabela por peso do piloto equipado, mola de fábrica e como conferir pelo SAG.`}
        url={url}
        type="article"
        schema={schema}
      />
      <main className="bg-gray-50 min-h-screen">
        <div className="container mx-auto px-4 py-12 lg:py-20 max-w-5xl">
          <Link to="/molas" className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-wtech-red mb-8">
            <ArrowLeft size={16} /> Todos os modelos
          </Link>
          <article className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <header className="bg-wtech-black text-white px-7 py-10 lg:px-14 lg:py-14">
              <span className="text-xs font-black text-wtech-gold uppercase tracking-[0.25em]">Molas de suspensão · {marca}</span>
              <h1 className="mt-3 text-3xl lg:text-5xl font-display font-black tracking-tight">Mola de suspensão para {nome}</h1>
              <p className="text-gray-300 mt-5 text-lg max-w-3xl leading-relaxed">
                Tabela de molas {temBengala && temAmortecedor ? 'da bengala e do amortecedor traseiro' : temBengala ? 'da bengala' : 'do amortecedor traseiro'} da {nome} por
                peso do piloto equipado, a partir do catálogo de molas da W-Tech Brasil.
              </p>
            </header>

            <div className="px-7 py-10 lg:px-14 lg:py-14 space-y-10">
              {(tabela.fabricaBengala || tabela.fabricaAmortecedor) && (
                <section aria-labelledby="fabrica">
                  <h2 id="fabrica" className="text-2xl font-black text-gray-900 border-l-4 border-wtech-gold pl-4">A mola de fábrica</h2>
                  <p className="mt-4 text-gray-700 leading-relaxed">
                    {tabela.fabricaBengala && <>De fábrica, a bengala da {nome} usa mola de <strong>{descreverMola(tabela.fabricaBengala)}</strong>. </>}
                    {tabela.fabricaAmortecedor && <>O amortecedor traseiro usa mola de <strong>{descreverMola(tabela.fabricaAmortecedor)}</strong>. </>}
                    {tabela.faixasDeFabricaBengala.length > 0 && <>No catálogo, a mola de fábrica da bengala é a indicada para {juntar(tabela.faixasDeFabricaBengala)}. </>}
                    {tabela.faixasDeFabricaAmortecedor.length > 0 && <>A do amortecedor, para {juntar(tabela.faixasDeFabricaAmortecedor)}. </>}
                    Fora delas o catálogo indica outra mola, porque a de fábrica fica mole ou dura para o peso do piloto e a pré-carga sozinha não compensa.
                  </p>
                </section>
              )}

              <section aria-labelledby="tabela">
                <h2 id="tabela" className="text-2xl font-black text-gray-900 border-l-4 border-wtech-gold pl-4">Tabela de molas por peso do piloto</h2>
                <p className="mt-4 text-gray-700 leading-relaxed">
                  O peso é o do piloto <strong>equipado</strong>: some capacete, botas, colete e roupa ao seu peso. A taxa da mola está em N/mm; o código é o do catálogo.
                </p>
                <div className="mt-6 overflow-x-auto rounded-2xl border border-gray-100">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wider">
                      <tr>
                        <th scope="col" className="px-4 py-3">Piloto equipado</th>
                        {temBengala && <th scope="col" className="px-4 py-3">Mola da bengala</th>}
                        {temAmortecedor && <th scope="col" className="px-4 py-3">Mola do amortecedor</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 tabular-nums">
                      {tabela.faixas.map((faixa) => (
                        <tr key={faixa.rotulo}>
                          <th scope="row" className="px-4 py-3 font-bold text-gray-900 whitespace-nowrap">{faixa.rotulo}</th>
                          {temBengala && (
                            <td className="px-4 py-3">
                              {faixa.bengala ? (
                                <>
                                  <span className="font-bold text-gray-900">{formatarTaxa(faixa.bengala.taxa)}</span>
                                  <span className="block text-xs text-gray-500">{faixa.bengala.codigo}{tabela.faixasDeFabricaBengala.includes(faixa.rotulo) ? ' · de fábrica' : ''}</span>
                                </>
                              ) : '—'}
                            </td>
                          )}
                          {temAmortecedor && (
                            <td className="px-4 py-3">
                              {faixa.amortecedor ? (
                                <>
                                  <span className="font-bold text-gray-900">{formatarTaxa(faixa.amortecedor.taxa)}</span>
                                  <span className="block text-xs text-gray-500">{faixa.amortecedor.codigo}{tabela.faixasDeFabricaAmortecedor.includes(faixa.rotulo) ? ' · de fábrica' : ''}</span>
                                </>
                              ) : '—'}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section aria-labelledby="como-usar">
                <h2 id="como-usar" className="text-2xl font-black text-gray-900 border-l-4 border-wtech-gold pl-4">Como usar a tabela</h2>
                <ol className="mt-4 list-decimal pl-6 space-y-2 text-gray-700 leading-relaxed">
                  <li>Pese-se com todo o equipamento que você usa para andar.</li>
                  <li>Ache a sua faixa de peso e a mola indicada para a bengala e para o amortecedor.</li>
                  <li>Com a mola certa instalada, meça o <Link to="/glossario/o-que-e-ajuste-de-sag-como-ajustar-sua-suspensao" className="text-wtech-red font-bold hover:underline">SAG</Link> e ajuste a <Link to="/glossario/o-que-e-definicao-de-pre-carga-suspensao" className="text-wtech-red font-bold hover:underline">pré-carga</Link> até chegar à medida do manual da moto.</li>
                  <li>Só depois regule compressão e retorno. Mola errada não se corrige com clique.</li>
                </ol>
              </section>

              <section aria-labelledby="sinais">
                <h2 id="sinais" className="text-2xl font-black text-gray-900 border-l-4 border-wtech-gold pl-4">Como saber se a mola está errada para o seu peso</h2>
                <p className="mt-4 text-gray-700 leading-relaxed">
                  Acerte primeiro o SAG com você em cima da moto. Depois meça o SAG livre, com a moto só com o próprio peso. Se sobrou pouco SAG livre, foi
                  preciso muita pré-carga para chegar à medida: a mola está mole para você. Se o SAG livre ficou grande demais, a mola está dura. Em qualquer dos
                  casos, a troca de mola resolve o que a pré-carga não resolve.
                </p>
              </section>

              {perguntas.length > 0 && (
                <section aria-labelledby="perguntas">
                  <h2 id="perguntas" className="text-2xl font-black text-gray-900 border-l-4 border-wtech-gold pl-4">Perguntas frequentes</h2>
                  <div className="mt-4 space-y-5">
                    {perguntas.map((p) => (
                      <div key={p.q}>
                        <h3 className="font-black text-gray-900">{p.q}</h3>
                        <p className="mt-1 text-gray-700 leading-relaxed">{p.a}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <aside className="mx-7 mb-10 lg:mx-14 lg:mb-14 rounded-2xl bg-wtech-black text-white p-6 lg:p-8 flex flex-col md:flex-row md:items-center gap-5 md:justify-between">
              <div>
                <span className="text-xs font-black text-wtech-gold uppercase tracking-[0.25em]">Curso online</span>
                <p className="text-xl lg:text-2xl font-black mt-2">Aprenda a medir o SAG e regular a suspensão</p>
                <p className="text-gray-300 mt-2 max-w-2xl">No {COURSE_NAME} você aprende a acertar mola, pré-carga, compressão e retorno na sua própria moto.</p>
              </div>
              <Link to="/curso-suspensao-piloto" className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-wtech-red px-5 py-3 font-black text-white hover:brightness-110">
                Conhecer o curso <ArrowRight size={18} />
              </Link>
            </aside>
          </article>

          {mesmaFamilia.length > 0 && (
            <nav aria-label="Outros anos e versões" className="mt-10">
              <h2 className="text-lg font-black text-gray-900 mb-4">Outros anos e versões</h2>
              <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {mesmaFamilia.map((m) => (
                  <li key={m.model_slug}>
                    <Link to={`/molas/${m.model_slug}`} className="block bg-white rounded-xl border border-gray-100 px-4 py-3 font-bold text-gray-800 hover:text-wtech-red hover:border-wtech-gold">
                      {marca} {m.model}
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
};

export default SpringModel;
