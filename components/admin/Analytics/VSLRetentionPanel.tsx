import React, { useEffect, useState } from 'react';
import ReactApexChart from 'react-apexcharts';
import { AlertTriangle, Eye, PlayCircle, RefreshCw, TrendingDown, Unlock } from 'lucide-react';

/**
 * Retenção da VSL — responde "até onde assistem" e "onde desistem".
 *
 * Lê /api/vsl-progress (GET, sessão de staff). A tabela é service_role only,
 * por isso este painel não fala direto com o Supabase como as outras views.
 */

interface PontoRetencao {
    percentual: number;
    sessoes: number;
    taxa: number;
}

/** Nomes técnicos gravados pelo player viram nomes de gente no painel. */
const NOME_DA_PAGINA: Record<string, string> = {
    vsl_dark: 'VSL escura',
    vsl_light: 'VSL clara',
    lp_v2: 'Landing V2',
    lp_completa: 'Landing completa',
    lp_clara: 'Landing clara',
};

const rotuloPagina = (pagina: string) => NOME_DA_PAGINA[pagina] || pagina;

interface Relatorio {
    periodo_dias: number;
    duracao_segundos: number;
    total_sessoes: number;
    media_assistida_segundos: number;
    media_assistida_percentual: number;
    concluiram: number;
    liberaram_inscricao: number;
    retencao: PontoRetencao[];
    maior_queda: { de: number; para: number; perdidas: number };
    pagina_selecionada: string | null;
    paginas_disponiveis: { pagina: string; sessoes: number }[];
    videos: string[];
    total_geral: number;
}

const mmss = (segundos: number) => {
    const s = Math.max(0, Math.round(segundos));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const Cartao: React.FC<{
    icone: React.ReactNode;
    rotulo: string;
    valor: string;
    apoio?: string;
}> = ({ icone, rotulo, valor, apoio }) => (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.03]">
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            {icone}
            <span className="text-xs font-bold uppercase tracking-wider">{rotulo}</span>
        </div>
        <p className="mt-3 text-3xl font-black text-gray-900 dark:text-white">{valor}</p>
        {apoio && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{apoio}</p>}
    </div>
);

const VSLRetentionPanel: React.FC = () => {
    const [dados, setDados] = useState<Relatorio | null>(null);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState('');
    const [dias, setDias] = useState(30);
    const [pagina, setPagina] = useState<string | null>(null);

    const buscar = async (periodo: number, paginaAlvo: string | null) => {
        setCarregando(true);
        setErro('');
        try {
            const query = `dias=${periodo}${paginaAlvo ? `&page=${encodeURIComponent(paginaAlvo)}` : ''}`;
            const resposta = await fetch(`/api/vsl-progress?${query}`, {
                credentials: 'include',
                headers: { Accept: 'application/json' },
            });
            if (resposta.status === 401) throw new Error('Sessão de staff expirada. Entre de novo no painel.');
            if (!resposta.ok) throw new Error(`Falha ao carregar (HTTP ${resposta.status}).`);
            setDados(await resposta.json());
        } catch (e) {
            setErro(e instanceof Error ? e.message : 'Falha ao carregar as métricas.');
        } finally {
            setCarregando(false);
        }
    };

    useEffect(() => { void buscar(dias, pagina); }, [dias, pagina]);

    if (carregando && !dados) {
        return <div className="py-16 text-center text-sm text-gray-500">Carregando retenção da VSL…</div>;
    }

    if (erro) {
        return (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-500/20 dark:bg-red-500/10">
                <p className="flex items-center gap-2 font-bold text-red-700 dark:text-red-300">
                    <AlertTriangle size={18} /> {erro}
                </p>
                <button onClick={() => void buscar(dias, pagina)} className="mt-3 text-sm font-bold text-red-700 underline dark:text-red-300">
                    Tentar de novo
                </button>
            </div>
        );
    }

    if (!dados || dados.total_geral === 0) {
        return (
            <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center dark:border-white/10 dark:bg-white/[0.03]">
                <PlayCircle className="mx-auto mb-3 text-gray-400" size={38} />
                <p className="font-bold text-gray-700 dark:text-gray-200">Nenhuma sessão registrada ainda</p>
                <p className="mt-1 text-sm text-gray-500">
                    As métricas começam a aparecer assim que alguém assistir à VSL nas páginas de venda.
                </p>
            </div>
        );
    }

    const seletorDePagina = (
        <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-gray-500">Página</span>
            <button
                onClick={() => setPagina(null)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    pagina === null
                        ? 'bg-wtech-gold text-black'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-300'
                }`}
            >
                Todas ({dados.total_geral})
            </button>
            {dados.paginas_disponiveis.map((item) => (
                <button
                    key={item.pagina}
                    onClick={() => setPagina(item.pagina)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                        pagina === item.pagina
                            ? 'bg-wtech-gold text-black'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-300'
                    }`}
                >
                    {rotuloPagina(item.pagina)} ({item.sessoes})
                </button>
            ))}
        </div>
    );

    const duracao = dados.duracao_segundos || 0;
    const taxaConclusao = dados.total_sessoes ? (dados.concluiram / dados.total_sessoes) * 100 : 0;
    const taxaLiberacao = dados.total_sessoes ? (dados.liberaram_inscricao / dados.total_sessoes) * 100 : 0;

    const opcoes: ApexCharts.ApexOptions = {
        chart: { type: 'area', toolbar: { show: false }, fontFamily: 'inherit' },
        stroke: { curve: 'smooth', width: 3 },
        dataLabels: { enabled: false },
        colors: ['#d7ad4f'],
        fill: {
            type: 'gradient',
            gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.02, stops: [0, 95] },
        },
        xaxis: {
            categories: dados.retencao.map((p) => `${p.percentual}%`),
            title: { text: 'Ponto do vídeo' },
            labels: { rotate: 0 },
        },
        yaxis: { title: { text: '% que ainda assiste' }, max: 100, min: 0 },
        tooltip: {
            y: {
                formatter: (valor: number, contexto: any) => {
                    const ponto = dados.retencao[contexto?.dataPointIndex ?? 0];
                    const instante = duracao ? ` · ${mmss((ponto.percentual / 100) * duracao)}` : '';
                    return `${valor}% (${ponto?.sessoes ?? 0} sessões)${instante}`;
                },
            },
        },
        annotations: {
            xaxis: [{
                x: `${dados.maior_queda.para}%`,
                borderColor: '#e0564f',
                label: {
                    text: `Maior abandono (-${dados.maior_queda.perdidas})`,
                    style: { background: '#e0564f', color: '#fff', fontSize: '11px' },
                },
            }],
        },
        grid: { borderColor: 'rgba(148,163,184,.18)' },
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="text-lg font-black text-gray-900 dark:text-white">
                        Retenção da VSL · {pagina ? rotuloPagina(pagina) : 'todas as páginas'}
                    </h3>
                    <p className="text-sm text-gray-500">
                        {dados.videos.join(', ') || '—'} · {duracao ? mmss(duracao) : '—'} de duração
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {[7, 30, 90].map((p) => (
                        <button
                            key={p}
                            onClick={() => setDias(p)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                                dias === p
                                    ? 'bg-wtech-gold text-black'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-300'
                            }`}
                        >
                            {p} dias
                        </button>
                    ))}
                    <button
                        onClick={() => void buscar(dias, pagina)}
                        className="rounded-lg bg-gray-100 p-2 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-300"
                        aria-label="Atualizar"
                    >
                        <RefreshCw size={15} className={carregando ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {seletorDePagina}

            {dados.total_sessoes === 0 ? (
                <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center dark:border-white/10 dark:bg-white/[0.03]">
                    <PlayCircle className="mx-auto mb-3 text-gray-400" size={34} />
                    <p className="font-bold text-gray-700 dark:text-gray-200">
                        Sem sessões em {rotuloPagina(pagina || '')} neste período
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                        Há dados em outras páginas — escolha outra acima ou amplie o período.
                    </p>
                </div>
            ) : (
            <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Cartao icone={<Eye size={15} />} rotulo="Sessões" valor={String(dados.total_sessoes)} apoio={`últimos ${dados.periodo_dias} dias`} />
                <Cartao
                    icone={<PlayCircle size={15} />}
                    rotulo="Média assistida"
                    valor={mmss(dados.media_assistida_segundos)}
                    apoio={`${dados.media_assistida_percentual}% do vídeo`}
                />
                <Cartao
                    icone={<Unlock size={15} />}
                    rotulo="Liberaram inscrição"
                    valor={`${Math.round(taxaLiberacao)}%`}
                    apoio={`${dados.liberaram_inscricao} passaram dos 50s`}
                />
                <Cartao
                    icone={<TrendingDown size={15} />}
                    rotulo="Assistiram até o fim"
                    valor={`${Math.round(taxaConclusao)}%`}
                    apoio={`${dados.concluiram} sessões`}
                />
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.03]">
                <ReactApexChart options={opcoes} series={[{ name: 'Ainda assistindo', data: dados.retencao.map((p) => p.taxa) }]} type="area" height={330} />
                <p className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                    <TrendingDown size={14} className="text-[#e0564f]" />
                    Maior abandono entre {dados.maior_queda.de}% e {dados.maior_queda.para}% do vídeo
                    {duracao ? ` (por volta de ${mmss((dados.maior_queda.de / 100) * duracao)})` : ''} — {dados.maior_queda.perdidas} sessões saíram aí.
                </p>
            </div>
            </>
            )}

        </div>
    );
};

export default VSLRetentionPanel;
