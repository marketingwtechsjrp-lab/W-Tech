import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, MapPin, Calendar, Gauge, Droplet, Users, BookOpen } from 'lucide-react';
import SEO from '../components/SEO';
import { supabase } from '../lib/supabaseClient';
import { useSettings } from '../context/SettingsContext';
import { PUBLIC_BASE_URL, ORGANIZATION_ID, WEBSITE_ID } from '../lib/publicUrl';

/**
 * Home5 — variante de homepage construída para GEO/AEO.
 *
 * DIFERENÇAS DELIBERADAS EM RELAÇÃO À HOME3
 * 1. Resposta antes de tudo: o primeiro bloco de texto depois do H1 responde "o que é
 *    a W-Tech" em ~60 palavras, autocontido. É a passagem que um assistente extrai.
 * 2. H2 em forma de pergunta real, cada um resolvendo uma intenção diferente.
 * 3. Nada de conteúdo escondido: sem accordion, sem tab, sem "ler mais". Conteúdo em
 *    display:none não é lido de forma confiável — e um FAQ colapsado não pode ser
 *    marcado como FAQPage.
 * 4. Sem animação de entrada no texto. Só o que é decorativo se move, para o HTML
 *    prerenderizado nunca sair com o conteúdo em opacity:0.
 * 5. Links internos são <Link> de verdade (viram <a href>), nunca div com onClick.
 *
 * REGRA DE CONTEÚDO: nenhum número aqui é inventado. Turmas, preços e a contagem de
 * mecânicos vêm do banco; contato e endereço vêm das configurações do site. Onde não
 * há dado verificável, o bloco simplesmente não aparece.
 */

interface CourseRow {
    id: string;
    title: string;
    slug?: string;
    date: string;
    city?: string;
    state?: string;
    location?: string;
    locationType?: string;
    price?: number;
    capacity?: number;
    registeredCount?: number;
}

interface PostRow {
    id: string;
    title: string;
    slug: string;
    excerpt?: string;
    date?: string;
}

const dateFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
const moneyFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const fmtDate = (iso?: string) => {
    if (!iso) return null;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : dateFmt.format(d);
};

/** Rótulo de seção no estilo folha de especificação: "01 — Pergunta". */
const SectionLabel: React.FC<{ index: string; children: React.ReactNode }> = ({ index, children }) => (
    <div className="flex items-baseline gap-3 lg:sticky lg:top-28">
        <span className="font-display text-sm font-bold tabular-nums text-wtech-gold">{index}</span>
        <span className="h-px flex-1 bg-wtech-black/15 lg:hidden" />
        <span className="font-display text-xs font-bold uppercase tracking-[0.22em] text-wtech-black/50">
            {children}
        </span>
    </div>
);

/** Bloco de conteúdo: rótulo estreito à esquerda, texto largo à direita. */
const Section: React.FC<{ id: string; index: string; label: string; children: React.ReactNode }> = ({
    id, index, label, children,
}) => (
    <section id={id} aria-labelledby={`${id}-heading`} className="border-t border-wtech-black/12">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-16 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:gap-16 lg:py-24">
            <SectionLabel index={index}>{label}</SectionLabel>
            <div>{children}</div>
        </div>
    </section>
);

const Home5: React.FC = () => {
    const { get } = useSettings();
    const [courses, setCourses] = useState<CourseRow[]>([]);
    const [posts, setPosts] = useState<PostRow[]>([]);
    const [mechanicsCount, setMechanicsCount] = useState<number | null>(null);
    const [statesCovered, setStatesCovered] = useState<number | null>(null);

    const address = get('address', 'R. Zumbi dos Palmares, 410 - Jd. Paulista, São José do Rio Preto - SP');
    const phone = get('phone_main', '17 3231-2858');
    const email = get('email_contato', 'contato@w-techbrasil.com.br');
    const hours = get('working_hours', 'Seg a Sex: 08h às 18h');

    useEffect(() => {
        let active = true;

        const load = async () => {
            const today = new Date().toISOString().slice(0, 10);

            const [courseRes, postRes, mechRes] = await Promise.all([
                supabase
                    .from('SITE_Courses')
                    .select('id, title, slug, date, city, state, location, location_type, price, capacity, registered_count')
                    .eq('status', 'Published')
                    .gte('date', today)
                    .order('date', { ascending: true })
                    .limit(4),
                supabase
                    .from('SITE_BlogPosts')
                    .select('id, title, slug, excerpt, date')
                    .eq('status', 'Published')
                    .order('date', { ascending: false })
                    .limit(3),
                supabase
                    .from('SITE_Mechanics')
                    .select('id, state')
                    .eq('status', 'Approved'),
            ]);

            if (!active) return;

            if (courseRes.error) console.warn('[Home5] cursos indisponíveis:', courseRes.error.message);
            else setCourses((courseRes.data ?? []).map((c: any) => ({
                ...c,
                locationType: c.location_type,
                registeredCount: c.registered_count,
            })));

            if (postRes.error) console.warn('[Home5] blog indisponível:', postRes.error.message);
            else setPosts((postRes.data ?? []) as PostRow[]);

            if (mechRes.error) console.warn('[Home5] mecânicos indisponíveis:', mechRes.error.message);
            else {
                const rows = mechRes.data ?? [];
                setMechanicsCount(rows.length);
                setStatesCovered(new Set(rows.map((m: any) => m.state).filter(Boolean)).size);
            }
        };

        load().catch((e) => console.warn('[Home5] falha ao carregar conteúdo', e));
        return () => { active = false; };
    }, []);

    // ── JSON-LD ──────────────────────────────────────────────────────────────
    // Um @graph só, com @id referenciando a entidade declarada no index.html.
    // As perguntas do FAQPage são exatamente as que aparecem na tela, palavra por palavra.
    const faq = [
        {
            q: 'A W-Tech dá curso presencial ou online?',
            a: 'Os dois. Os cursos presenciais acontecem em cidades do Brasil e em Lisboa, com turmas divulgadas na agenda. O Curso de Suspensão para Piloto é online e fica disponível de forma contínua.',
        },
        {
            q: 'Preciso ser mecânico para fazer o curso?',
            a: 'Não. Existe uma trilha para pilotos, que ensina a regular a própria suspensão sem depender de mecânico, e uma trilha técnica presencial voltada a profissionais de oficina.',
        },
        {
            q: 'Como sei qual mola serve para o meu peso?',
            a: 'A W-Tech mantém um banco de dados de molas dianteiras e traseiras organizado por modelo de motocicleta e peso do piloto equipado. A consulta é gratuita na página de molas.',
        },
        {
            q: 'A W-Tech dá curso fora do Brasil?',
            a: 'Sim. Além das turmas brasileiras, a escola realiza cursos em Lisboa, Portugal.',
        },
        {
            q: 'Onde fica a sede da W-Tech?',
            a: `A sede fica em ${address}. O atendimento é ${hours.toLowerCase()}, pelo telefone ${phone} ou pelo e-mail ${email}.`,
        },
    ];

    const schema = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'WebPage',
                '@id': `${PUBLIC_BASE_URL}/home5#webpage`,
                url: `${PUBLIC_BASE_URL}/home5`,
                name: 'W-TECH Brasil — Escola técnica de suspensão de motocicletas',
                inLanguage: 'pt-BR',
                isPartOf: { '@id': WEBSITE_ID },
                about: { '@id': ORGANIZATION_ID },
            },
            {
                '@type': 'FAQPage',
                '@id': `${PUBLIC_BASE_URL}/home5#faq`,
                mainEntity: faq.map((item) => ({
                    '@type': 'Question',
                    name: item.q,
                    acceptedAnswer: { '@type': 'Answer', text: item.a },
                })),
            },
            // ItemList só existe quando há turma de verdade na tela.
            ...(courses.length
                ? [{
                    '@type': 'ItemList',
                    '@id': `${PUBLIC_BASE_URL}/home5#turmas`,
                    name: 'Próximas turmas',
                    numberOfItems: courses.length,
                    itemListElement: courses.map((c, i) => ({
                        '@type': 'ListItem',
                        position: i + 1,
                        name: c.title,
                        url: `${PUBLIC_BASE_URL}/cursos/${c.slug || c.id}`,
                    })),
                }]
                : []),
        ],
    };

    return (
        <div className="min-h-screen bg-[#FAFAF8] font-sans text-wtech-black antialiased">
            {/*
              `noindex` enquanto /home5 for variante de teste: o conteúdo é o mesmo da "/"
              e duas homes indexadas competem entre si (canibalização) — o mecanismo
              escolhe uma e desconta a outra.
              AO PROMOVER PARA "/": remover o `noindex`, trocar os @id de /home5 para a
              raiz e rodar `npm run sitemap`.
            */}
            <SEO
                title="Escola técnica de suspensão de motocicletas"
                description="A W-Tech Brasil forma mecânicos e pilotos em regulagem de suspensão de motos: SAG, molas por peso do piloto, óleo, compressão e retorno. Cursos presenciais no Brasil e em Lisboa, e curso online para piloto."
                schema={schema}
                noindex
            />

            {/* ── HERO ─────────────────────────────────────────────────────── */}
            <header className="relative overflow-hidden">
                {/* Malha de fundo: única coisa decorativa da dobra, atrás do texto. */}
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 opacity-[0.055]"
                    style={{
                        backgroundImage:
                            'linear-gradient(to right, #0A0A0A 1px, transparent 1px), linear-gradient(to bottom, #0A0A0A 1px, transparent 1px)',
                        backgroundSize: '64px 64px',
                    }}
                />

                <div className="relative mx-auto max-w-6xl px-6 pb-16 pt-28 lg:pb-24 lg:pt-36">
                    <p className="font-display text-xs font-bold uppercase tracking-[0.3em] text-wtech-gold">
                        W-Tech Brasil · desde São José do Rio Preto (SP)
                    </p>

                    <h1
                        id="hero-heading"
                        className="mt-6 max-w-4xl font-display text-[2.75rem] font-bold uppercase leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl"
                    >
                        Escola técnica de<br />
                        <span className="text-wtech-gold">suspensão</span> de motocicletas
                    </h1>

                    {/*
                      RESPOSTA DIRETA — ~60 palavras, autocontida.
                      É o primeiro bloco de texto depois do H1 e o trecho mais provável de
                      ser citado por um assistente. Tem que fazer sentido sozinho, fora da página.
                    */}
                    <div className="mt-10 grid gap-8 border-t-2 border-wtech-black pt-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-16">
                        <p className="max-w-2xl text-lg leading-relaxed text-wtech-black/80 sm:text-xl">
                            A <strong className="font-semibold text-wtech-black">W-Tech Brasil</strong> é uma escola
                            técnica especializada em suspensão de motocicletas. Forma mecânicos e pilotos para medir SAG,
                            escolher molas pelo peso do piloto, trocar óleo e regular compressão e retorno. Os cursos
                            presenciais acontecem em cidades do Brasil e em Lisboa; o curso para piloto é online. A sede
                            fica em São José do Rio Preto, no interior de São Paulo.
                        </p>

                        <div className="flex flex-col gap-3">
                            <Link
                                to="/cursos"
                                className="group flex items-center justify-between gap-4 bg-wtech-black px-6 py-4 font-display text-sm font-bold uppercase tracking-widest text-white transition-colors hover:bg-wtech-red"
                            >
                                Ver agenda de turmas
                                <ArrowUpRight size={18} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                            </Link>
                            <Link
                                to="/curso-suspensao-piloto"
                                className="group flex items-center justify-between gap-4 border border-wtech-black/25 px-6 py-4 font-display text-sm font-bold uppercase tracking-widest transition-colors hover:border-wtech-black hover:bg-wtech-black/5"
                            >
                                Curso online para piloto
                                <ArrowUpRight size={18} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                            </Link>
                        </div>
                    </div>

                    {/* Faixa de especificação: só campos com valor real. */}
                    <dl className="mt-14 grid grid-cols-2 border-t border-wtech-black/15 md:grid-cols-4">
                        {[
                            { k: 'Modalidades', v: 'Presencial e online' },
                            { k: 'Atuação', v: 'Brasil e Portugal' },
                            mechanicsCount ? { k: 'Mecânicos certificados', v: String(mechanicsCount) } : null,
                            statesCovered ? { k: 'Estados no mapa', v: String(statesCovered) } : null,
                        ].filter(Boolean).map((item) => (
                            <div key={(item as any).k} className="border-b border-r border-wtech-black/15 px-4 py-5 first:pl-0">
                                <dt className="font-display text-[10px] font-bold uppercase tracking-[0.18em] text-wtech-black/45">
                                    {(item as any).k}
                                </dt>
                                <dd className="mt-1.5 font-display text-xl font-bold tabular-nums">{(item as any).v}</dd>
                            </div>
                        ))}
                    </dl>
                </div>
            </header>

            {/* ── 01 · O QUE FAZ ───────────────────────────────────────────── */}
            <Section id="o-que-faz" index="01" label="Escopo">
                <h2 id="o-que-faz-heading" className="font-display text-3xl font-bold uppercase tracking-tight sm:text-4xl">
                    O que a W-Tech faz?
                </h2>
                <p className="mt-5 max-w-2xl text-lg leading-relaxed text-wtech-black/75">
                    Três frentes, todas em torno do mesmo assunto: fazer a suspensão da moto trabalhar para o piloto
                    que está em cima dela.
                </p>

                <div className="mt-12 grid gap-px bg-wtech-black/15 sm:grid-cols-3">
                    {[
                        {
                            to: '/cursos',
                            icon: Calendar,
                            title: 'Formação técnica',
                            body: 'Turmas presenciais para mecânicos e oficinas, com prática em bancada e em moto real. Agenda por cidade e data.',
                            cta: 'Ver a agenda',
                        },
                        {
                            to: '/curso-suspensao-piloto',
                            icon: Gauge,
                            title: 'Curso para piloto',
                            body: 'Trilha online para quem quer regular a própria moto: SAG, cliques de compressão e retorno, e leitura de comportamento na pista.',
                            cta: 'Conhecer o curso',
                        },
                        {
                            to: '/mapa',
                            icon: Users,
                            title: 'Rede credenciada',
                            body: 'Mecânicos formados pela W-Tech espalhados pelo país, com oficina, cidade e contato no mapa.',
                            cta: 'Abrir o mapa',
                        },
                    ].map(({ to, icon: Icon, title, body, cta }) => (
                        <Link
                            key={to}
                            to={to}
                            className="group flex flex-col bg-[#FAFAF8] p-7 transition-colors hover:bg-white"
                        >
                            <Icon size={22} className="text-wtech-gold" strokeWidth={1.75} />
                            <h3 className="mt-5 font-display text-xl font-bold uppercase tracking-tight">{title}</h3>
                            <p className="mt-3 flex-1 text-sm leading-relaxed text-wtech-black/70">{body}</p>
                            <span className="mt-6 inline-flex items-center gap-1.5 font-display text-xs font-bold uppercase tracking-widest text-wtech-red">
                                {cta}
                                <ArrowUpRight size={14} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                            </span>
                        </Link>
                    ))}
                </div>
            </Section>

            {/* ── 02 · TURMAS ──────────────────────────────────────────────── */}
            <Section id="turmas" index="02" label="Agenda">
                <h2 id="turmas-heading" className="font-display text-3xl font-bold uppercase tracking-tight sm:text-4xl">
                    Quais são as próximas turmas?
                </h2>

                {courses.length > 0 ? (
                    <>
                        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-wtech-black/75">
                            Turmas presenciais com data e vaga confirmadas. Cada linha leva à página do curso, com
                            conteúdo programático, local exato e inscrição.
                        </p>

                        <ul className="mt-12 border-t border-wtech-black/15">
                            {courses.map((c) => {
                                const when = fmtDate(c.date);
                                const where = [c.city, c.state].filter(Boolean).join(' · ') || c.location;
                                const seats = typeof c.capacity === 'number' && typeof c.registeredCount === 'number'
                                    ? Math.max(0, c.capacity - c.registeredCount)
                                    : null;

                                return (
                                    <li key={c.id} className="border-b border-wtech-black/15">
                                        <Link
                                            to={`/cursos/${c.slug || c.id}`}
                                            className="group grid items-baseline gap-2 py-6 transition-colors hover:bg-white sm:grid-cols-[8rem_minmax(0,1fr)_auto] sm:gap-6"
                                        >
                                            <span className="font-display text-sm font-bold uppercase tabular-nums tracking-wider text-wtech-gold">
                                                {when ?? '—'}
                                            </span>
                                            <span>
                                                <span className="block font-display text-lg font-bold uppercase tracking-tight sm:text-xl">
                                                    {c.title}
                                                </span>
                                                <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-wtech-black/60">
                                                    {where && (
                                                        <span className="inline-flex items-center gap-1.5">
                                                            <MapPin size={13} /> {where}
                                                        </span>
                                                    )}
                                                    {c.locationType && <span>{c.locationType}</span>}
                                                    {seats !== null && seats > 0 && <span>{seats} vagas</span>}
                                                </span>
                                            </span>
                                            <span className="flex items-center gap-2 font-display text-base font-bold tabular-nums">
                                                {typeof c.price === 'number' && c.price > 0 ? moneyFmt.format(c.price) : ''}
                                                <ArrowUpRight size={16} className="text-wtech-red transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                                            </span>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </>
                ) : (
                    /* Sem turma futura publicada, a seção não inventa nada — manda para a agenda. */
                    <p className="mt-5 max-w-2xl text-lg leading-relaxed text-wtech-black/75">
                        As próximas datas são publicadas na{' '}
                        <Link to="/cursos" className="font-semibold text-wtech-red underline underline-offset-4">
                            agenda de cursos
                        </Link>
                        . Para ser avisado quando abrir turma na sua região, fale com a equipe pelo{' '}
                        <Link to="/contato" className="font-semibold text-wtech-red underline underline-offset-4">
                            contato
                        </Link>.
                    </p>
                )}

                <Link
                    to="/cursos"
                    className="mt-10 inline-flex items-center gap-2 border-b-2 border-wtech-black pb-1 font-display text-sm font-bold uppercase tracking-widest transition-colors hover:border-wtech-red hover:text-wtech-red"
                >
                    Agenda completa <ArrowUpRight size={16} />
                </Link>
            </Section>

            {/* ── 03 · FERRAMENTAS ─────────────────────────────────────────── */}
            <Section id="ferramentas" index="03" label="Consulta técnica">
                <h2 id="ferramentas-heading" className="font-display text-3xl font-bold uppercase tracking-tight sm:text-4xl">
                    Como descobrir a mola e o óleo certos para a sua moto?
                </h2>
                <p className="mt-5 max-w-2xl text-lg leading-relaxed text-wtech-black/75">
                    A mola correta é a que corresponde ao peso do piloto equipado, não a que veio de fábrica. A W-Tech
                    mantém duas consultas técnicas abertas e gratuitas, sem cadastro.
                </p>

                <div className="mt-12 grid gap-6 md:grid-cols-2">
                    {[
                        {
                            to: '/molas',
                            icon: Gauge,
                            kicker: 'Banco de dados',
                            title: 'Molas por peso e modelo',
                            body: 'Constante elástica de mola dianteira e traseira, organizada por modelo de motocicleta e faixa de peso do piloto equipado.',
                        },
                        {
                            to: '/oleo',
                            icon: Droplet,
                            kicker: 'Referência',
                            title: 'Óleo de suspensão',
                            body: 'Volume e viscosidade de referência do óleo de garfo e amortecedor por modelo, para quem vai fazer a manutenção.',
                        },
                    ].map(({ to, icon: Icon, kicker, title, body }) => (
                        <Link
                            key={to}
                            to={to}
                            className="group relative border border-wtech-black/20 bg-white p-8 transition-colors hover:border-wtech-gold"
                        >
                            {/* Cantos: moldura de instrumento, puramente decorativa. */}
                            <span aria-hidden className="absolute left-0 top-0 h-3 w-3 border-l-2 border-t-2 border-wtech-gold" />
                            <span aria-hidden className="absolute bottom-0 right-0 h-3 w-3 border-b-2 border-r-2 border-wtech-gold" />

                            <div className="flex items-center gap-2 font-display text-[10px] font-bold uppercase tracking-[0.22em] text-wtech-black/45">
                                <Icon size={14} className="text-wtech-gold" /> {kicker}
                            </div>
                            <h3 className="mt-4 font-display text-2xl font-bold uppercase leading-tight tracking-tight">
                                {title}
                            </h3>
                            <p className="mt-4 text-sm leading-relaxed text-wtech-black/70">{body}</p>
                            <span className="mt-7 inline-flex items-center gap-1.5 font-display text-xs font-bold uppercase tracking-widest text-wtech-red">
                                Consultar agora
                                <ArrowUpRight size={14} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                            </span>
                        </Link>
                    ))}
                </div>
            </Section>

            {/* ── 04 · REDE ────────────────────────────────────────────────── */}
            <Section id="rede" index="04" label="Rede">
                <h2 id="rede-heading" className="font-display text-3xl font-bold uppercase tracking-tight sm:text-4xl">
                    Onde encontrar um mecânico certificado?
                </h2>
                <p className="mt-5 max-w-2xl text-lg leading-relaxed text-wtech-black/75">
                    Os mecânicos formados pela W-Tech ficam num mapa público, com oficina, cidade e contato.
                    {mechanicsCount ? (
                        <> Hoje são <strong className="font-semibold text-wtech-black tabular-nums">{mechanicsCount}</strong> profissionais aprovados
                            {statesCovered ? <> em <strong className="font-semibold text-wtech-black tabular-nums">{statesCovered}</strong> estados</> : null}.</>
                    ) : null}{' '}
                    É por ali que se começa quando o serviço precisa ser feito por alguém que já passou pelo treinamento.
                </p>

                <div className="mt-10 flex flex-wrap gap-3">
                    <Link
                        to="/mapa"
                        className="inline-flex items-center gap-2 bg-wtech-black px-6 py-3.5 font-display text-sm font-bold uppercase tracking-widest text-white transition-colors hover:bg-wtech-red"
                    >
                        <MapPin size={16} /> Abrir o mapa
                    </Link>
                    <Link
                        to="/sou-mecanico"
                        className="inline-flex items-center gap-2 border border-wtech-black/25 px-6 py-3.5 font-display text-sm font-bold uppercase tracking-widest transition-colors hover:border-wtech-black hover:bg-white"
                    >
                        Sou mecânico, quero me credenciar
                    </Link>
                </div>
            </Section>

            {/* ── 05 · CONHECIMENTO ────────────────────────────────────────── */}
            <Section id="conhecimento" index="05" label="Base técnica">
                <h2 id="conhecimento-heading" className="font-display text-3xl font-bold uppercase tracking-tight sm:text-4xl">
                    Onde aprender os termos e os procedimentos?
                </h2>
                <p className="mt-5 max-w-2xl text-lg leading-relaxed text-wtech-black/75">
                    O glossário define os termos que aparecem em qualquer conversa sobre suspensão — SAG, precarga,
                    compressão, retorno. O blog traz os procedimentos passo a passo.
                </p>

                <div className="mt-10 flex flex-wrap gap-3">
                    <Link
                        to="/glossario"
                        className="inline-flex items-center gap-2 border border-wtech-black/25 px-6 py-3.5 font-display text-sm font-bold uppercase tracking-widest transition-colors hover:border-wtech-gold hover:bg-white"
                    >
                        <BookOpen size={16} className="text-wtech-gold" /> Glossário técnico
                    </Link>
                    <Link
                        to="/blog"
                        className="inline-flex items-center gap-2 border border-wtech-black/25 px-6 py-3.5 font-display text-sm font-bold uppercase tracking-widest transition-colors hover:border-wtech-gold hover:bg-white"
                    >
                        Artigos técnicos
                    </Link>
                </div>

                {posts.length > 0 && (
                    <ul className="mt-12 border-t border-wtech-black/15">
                        {posts.map((p) => (
                            <li key={p.id} className="border-b border-wtech-black/15">
                                <Link to={`/blog/${p.slug}`} className="group block py-6 transition-colors hover:bg-white">
                                    <span className="font-display text-[10px] font-bold uppercase tracking-[0.22em] text-wtech-black/45">
                                        {fmtDate(p.date) ?? 'Artigo'}
                                    </span>
                                    <span className="mt-2 flex items-start justify-between gap-4">
                                        <span className="font-display text-lg font-bold uppercase leading-tight tracking-tight">
                                            {p.title}
                                        </span>
                                        <ArrowUpRight size={16} className="mt-1 shrink-0 text-wtech-red transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                                    </span>
                                    {p.excerpt && (
                                        <span className="mt-2 block max-w-2xl text-sm leading-relaxed text-wtech-black/65">
                                            {p.excerpt}
                                        </span>
                                    )}
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </Section>

            {/* ── 06 · FAQ ─────────────────────────────────────────────────── */}
            <Section id="faq" index="06" label="Perguntas frequentes">
                <h2 id="faq-heading" className="font-display text-3xl font-bold uppercase tracking-tight sm:text-4xl">
                    Perguntas frequentes
                </h2>

                {/*
                  Sem accordion de propósito: as respostas ficam sempre visíveis. Conteúdo
                  colapsado em display:none não pode ser marcado como FAQPage — o schema
                  precisa corresponder ao que o visitante enxerga.
                */}
                <dl className="mt-10 border-t border-wtech-black/15">
                    {faq.map((item) => (
                        <div
                            key={item.q}
                            className="grid gap-2 border-b border-wtech-black/15 py-7 md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] md:gap-10"
                        >
                            <dt className="font-display text-lg font-bold uppercase leading-tight tracking-tight">
                                {item.q}
                            </dt>
                            <dd className="text-base leading-relaxed text-wtech-black/75">{item.a}</dd>
                        </div>
                    ))}
                </dl>
            </Section>

            {/* ── CONTATO ──────────────────────────────────────────────────── */}
            <section aria-labelledby="contato-heading" className="border-t-2 border-wtech-black bg-wtech-black text-white">
                <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:py-20">
                    <div>
                        <p className="font-display text-xs font-bold uppercase tracking-[0.3em] text-wtech-gold">
                            Falar com a W-Tech
                        </p>
                        <h2 id="contato-heading" className="mt-5 font-display text-3xl font-bold uppercase leading-tight tracking-tight sm:text-4xl">
                            Dúvida sobre qual curso serve para você?
                        </h2>
                        <p className="mt-5 max-w-lg leading-relaxed text-white/70">
                            A equipe responde sobre turmas, pré-requisitos, conteúdo programático e credenciamento de
                            oficina.
                        </p>
                        <Link
                            to="/contato"
                            className="mt-8 inline-flex items-center gap-2 bg-wtech-gold px-7 py-4 font-display text-sm font-bold uppercase tracking-widest text-wtech-black transition-colors hover:bg-white"
                        >
                            Página de contato <ArrowUpRight size={16} />
                        </Link>
                    </div>

                    {/*
                      Os filetes vêm de border nos itens, não de `gap-px` sobre um fundo
                      claro no <dl>: como esta coluna é mais baixa que a da esquerda, a
                      área sobrando pintava um retângulo cinza solto no rodapé.
                    */}
                    <dl className="grid content-start border-t border-white/15 sm:grid-cols-2">
                        {[
                            { k: 'Sede', v: address },
                            { k: 'Telefone', v: phone },
                            { k: 'E-mail', v: email },
                            { k: 'Atendimento', v: hours },
                        ].map((item) => (
                            <div key={item.k} className="border-b border-white/15 p-5 sm:odd:border-r">
                                <dt className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-wtech-gold">
                                    {item.k}
                                </dt>
                                <dd className="mt-2 text-sm leading-relaxed text-white/85">{item.v}</dd>
                            </div>
                        ))}
                    </dl>
                </div>
            </section>
        </div>
    );
};

export default Home5;
