import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Check, Copy, FileDown, History, Loader2, Trash2, TrendingUp, User } from 'lucide-react';
import { exportarEvolucaoPDF } from '../../../../lib/waPdf';
import { WaAtendente } from '../../../../lib/waAtendentes';
import {
    WaEvolucao, deleteEvolucao, gerarEvolucaoIA, listAnalisesDoAtendente, listEvolucoes,
} from '../../../../lib/waEvolucao';
import {
    EvolucaoComparativo, EvolucaoDeltas, EvolucaoLinhaChart, EvolucaoResumoCards, EvolucaoTempoResposta,
    temSerieTempoResposta,
} from './EvolucaoCharts';

/**
 * Evolução do atendente — a IA lê TODOS os relatórios anteriores do funcionário,
 * pontua cada período e o sistema compara o primeiro com o último para mostrar,
 * em gráfico, se o atendimento melhorou ou piorou.
 */

interface Props {
    atendentes: WaAtendente[];
}

const fmtDataHora = (iso: string) =>
    new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

const AtendentesEvolucao: React.FC<Props> = ({ atendentes }) => {
    const [atendenteId, setAtendenteId] = useState('');
    const [evolucoes, setEvolucoes] = useState<WaEvolucao[]>([]);
    const [selecionadaId, setSelecionadaId] = useState<string | null>(null);
    const [baseRelatorios, setBaseRelatorios] = useState<number | null>(null);
    const [gerando, setGerando] = useState(false);
    const [carregando, setCarregando] = useState(false);
    const [copiado, setCopiado] = useState(false);

    const atendente = atendentes.find(a => a.id === atendenteId) || null;
    const selecionada = evolucoes.find(e => e.id === selecionadaId) || null;

    const carregar = useCallback(async (alvo: WaAtendente) => {
        setCarregando(true);
        try {
            const [lista, analises] = await Promise.all([
                listEvolucoes(alvo.id),
                listAnalisesDoAtendente(alvo),
            ]);
            setEvolucoes(lista);
            setSelecionadaId(lista[0]?.id ?? null);
            setBaseRelatorios(analises.length);
        } finally {
            setCarregando(false);
        }
    }, []);

    useEffect(() => {
        if (!atendente) {
            setEvolucoes([]);
            setSelecionadaId(null);
            setBaseRelatorios(null);
            return;
        }
        carregar(atendente);
    }, [atendente, carregar]);

    const handleGerar = async () => {
        if (!atendenteId) return;
        setGerando(true);
        try {
            const evolucao = await gerarEvolucaoIA({ atendenteId });
            setEvolucoes(prev => [evolucao, ...prev]);
            setSelecionadaId(evolucao.id);
        } catch (e: any) {
            const msg = String(e?.message || e);
            alert(msg.includes('não configurada')
                ? msg + '\n\nConfigure o provedor de IA em Configurações → GPT & Gemini.'
                : msg);
        } finally {
            setGerando(false);
        }
    };

    const handleExcluir = async (id: string) => {
        if (!confirm('Excluir esta análise de evolução? Os relatórios originais não são afetados.')) return;
        const ok = await deleteEvolucao(id);
        if (!ok) return alert('Não foi possível excluir.');
        setEvolucoes(prev => {
            const next = prev.filter(e => e.id !== id);
            if (selecionadaId === id) setSelecionadaId(next[0]?.id ?? null);
            return next;
        });
    };

    const handleExportarPDF = () => {
        if (!selecionada) return;
        try {
            exportarEvolucaoPDF(selecionada);
        } catch (e: any) {
            alert('Não foi possível gerar o PDF: ' + String(e?.message || e));
        }
    };

    const handleCopiar = async () => {
        if (!selecionada) return;
        try {
            await navigator.clipboard.writeText(selecionada.relatorio);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 1500);
        } catch {
            alert('Não foi possível copiar.');
        }
    };

    const podeGerar = !!atendenteId && (baseRelatorios ?? 0) >= 2 && !gerando && !carregando;

    return (
        <div className="space-y-4">
            {/* Gerador */}
            <div className="bg-[var(--admin-surface-1)] border border-[var(--admin-border)] rounded-xl p-4">
                <h3 className="font-black text-sm text-[var(--admin-text-primary)] flex items-center gap-2 mb-3">
                    <TrendingUp size={15} className="text-[var(--admin-accent-gold)]" /> Evolução do atendimento
                </h3>
                <div className="flex flex-wrap items-end gap-3">
                    <div>
                        <label className="block text-[10px] font-black uppercase text-[var(--admin-text-tertiary)] mb-1">Funcionário</label>
                        <select
                            value={atendenteId}
                            onChange={e => setAtendenteId(e.target.value)}
                            className="bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-lg px-3 py-2 text-xs text-[var(--admin-text-primary)] min-w-[200px]"
                        >
                            <option value="">Selecione o funcionário…</option>
                            {atendentes.map(a => (
                                <option key={a.id} value={a.id}>{a.nome || `Atendente ${a.slot}`}</option>
                            ))}
                        </select>
                    </div>
                    <button
                        onClick={handleGerar}
                        disabled={!podeGerar}
                        className="bg-gradient-to-r from-wtech-gold to-yellow-600 text-black px-5 py-2 rounded-lg font-black text-xs uppercase flex items-center gap-2 disabled:opacity-50"
                    >
                        {gerando ? <Loader2 size={14} className="animate-spin" /> : <TrendingUp size={14} />}
                        {gerando ? 'Comparando relatórios…' : 'Gerar análise de evolução'}
                    </button>

                    {atendente && baseRelatorios !== null && (
                        <p className="text-[11px] text-[var(--admin-text-tertiary)] pb-2">
                            {baseRelatorios === 0
                                ? 'Nenhum relatório encontrado para este funcionário.'
                                : `${baseRelatorios} relatório${baseRelatorios > 1 ? 's' : ''} disponíve${baseRelatorios > 1 ? 'is' : 'l'} para comparação.`}
                        </p>
                    )}
                </div>

                <p className="text-[10px] text-[var(--admin-text-tertiary)] mt-2">
                    A IA relê todos os relatórios já gerados na aba “Relatórios IA” para este funcionário, pontua cada
                    período (cordialidade, agilidade, clareza técnica, aproveitamento comercial e resolução) e o sistema
                    compara o primeiro com o último para apontar melhora ou piora. Nada é enviado ao WhatsApp.
                </p>

                {atendente && baseRelatorios !== null && baseRelatorios < 2 && (
                    <div className="mt-3 p-3 rounded-lg border border-yellow-300 bg-yellow-50 text-[11px] text-yellow-800">
                        São necessários pelo menos 2 relatórios de períodos diferentes para medir evolução. Gere mais
                        relatórios na aba “Relatórios IA” (por exemplo, um por semana) e volte aqui.
                    </div>
                )}
            </div>

            {!atendenteId && (
                <p className="text-xs text-[var(--admin-text-tertiary)] text-center py-10 flex flex-col items-center gap-2">
                    <User size={22} className="opacity-40" />
                    Selecione um funcionário para ver a evolução do atendimento dele.
                </p>
            )}

            {carregando && (
                <p className="text-xs text-[var(--admin-text-tertiary)] text-center py-6 flex items-center justify-center gap-2">
                    <Loader2 size={14} className="animate-spin" /> Carregando análises…
                </p>
            )}

            {atendenteId && !carregando && !evolucoes.length && (
                <p className="text-xs text-[var(--admin-text-tertiary)] text-center py-6">
                    Nenhuma análise de evolução gerada para este funcionário ainda.
                </p>
            )}

            {/* Resultado */}
            {selecionada?.resumo && selecionada.pontuacoes && selecionada.pontuacoes.length >= 2 && (
                <div className="space-y-3">
                    {selecionada.persistido === false && (
                        <div className="flex items-start gap-2 p-3 rounded-xl border border-yellow-300 bg-yellow-50 text-[11px] text-yellow-800">
                            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                            <span>
                                Análise gerada, mas <strong>não salva</strong>: a tabela <code className="px-1 bg-yellow-100 rounded">SITE_WaAtendenteEvolucao</code> ainda
                                não existe no banco. Ela some ao recarregar a página. Rode a migração
                                <code className="mx-1 px-1 bg-yellow-100 rounded">migrations/create_wa_atendente_evolucao.sql</code>
                                no SQL Editor do Supabase e gere de novo para ficar no histórico.
                            </span>
                        </div>
                    )}
                    <EvolucaoResumoCards resumo={selecionada.resumo} totalRelatorios={selecionada.relatorios_analisados} />
                    <EvolucaoLinhaChart pontos={selecionada.pontuacoes} />
                    <div className={`grid grid-cols-1 gap-3 ${temSerieTempoResposta(selecionada.pontuacoes) ? 'xl:grid-cols-2' : ''}`}>
                        <EvolucaoComparativo pontos={selecionada.pontuacoes} />
                        <EvolucaoTempoResposta pontos={selecionada.pontuacoes} />
                    </div>
                    <EvolucaoDeltas resumo={selecionada.resumo} />

                    <div className="bg-[var(--admin-surface-1)] border border-[var(--admin-border)] rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                            <h4 className="text-xs font-black text-[var(--admin-text-primary)]">Relatório comparativo</h4>
                            <p className="text-[10px] text-[var(--admin-text-tertiary)]">
                                Gerado em {fmtDataHora(selecionada.created_at)}
                            </p>
                        </div>
                        <pre className="whitespace-pre-wrap break-words font-sans text-xs leading-relaxed text-[var(--admin-text-primary)] bg-[var(--admin-surface-2)]/50 rounded-lg p-4 max-h-[500px] overflow-y-auto custom-scrollbar">
                            {selecionada.relatorio}
                        </pre>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleExportarPDF}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase bg-[var(--admin-accent-gold)] text-black hover:brightness-110"
                            >
                                <FileDown size={12} /> Exportar PDF
                            </button>
                            <button
                                onClick={handleCopiar}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-[var(--admin-surface-2)] text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface-3)]"
                            >
                                {copiado ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                                {copiado ? 'Copiado!' : 'Copiar relatório'}
                            </button>
                            <button
                                onClick={() => handleExcluir(selecionada.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold text-red-500 hover:bg-red-50"
                            >
                                <Trash2 size={12} /> Excluir análise
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Histórico de análises de evolução */}
            {evolucoes.length > 1 && (
                <div className="bg-[var(--admin-surface-1)] border border-[var(--admin-border)] rounded-xl p-4">
                    <h4 className="text-xs font-black text-[var(--admin-text-primary)] flex items-center gap-2 mb-2">
                        <History size={13} /> Análises anteriores
                    </h4>
                    <div className="space-y-1">
                        {evolucoes.map(e => (
                            <button
                                key={e.id}
                                onClick={() => setSelecionadaId(e.id)}
                                className={`w-full text-left px-3 py-2 rounded-lg text-[11px] transition-colors ${
                                    e.id === selecionadaId
                                        ? 'bg-[#25D366]/15 text-[var(--admin-text-primary)] font-bold'
                                        : 'text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface-2)]'
                                }`}
                            >
                                {fmtDataHora(e.created_at)} · {e.relatorios_analisados} relatórios ·{' '}
                                {e.resumo ? `nota ${e.resumo.notaInicial} → ${e.resumo.notaFinal}` : 'sem pontuação'}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AtendentesEvolucao;
