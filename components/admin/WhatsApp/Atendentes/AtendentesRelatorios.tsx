import React, { useEffect, useMemo, useState } from 'react';
import { Bot, Loader2, ChevronDown, ChevronUp, Trash2, Copy, Check, Sparkles } from 'lucide-react';
import {
    WaAtendente, WaAnalise, AtendenteStats,
    listAnalises, deleteAnalise, gerarRelatorioIA,
} from '../../../../lib/waAtendentes';

/**
 * Relatórios de qualidade de atendimento gerados pela IA (sob demanda).
 * Usa o provedor de IA já configurado no sistema (Configurações → GPT & Gemini).
 */

interface Props {
    atendentes: WaAtendente[];
}

type Periodo = 'hoje' | '7d' | '30d' | 'custom';

const inicioDoDia = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const fmtData = (iso: string) => new Date(iso).toLocaleDateString('pt-BR');
const fmtDataHora = (iso: string) =>
    new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

const AtendentesRelatorios: React.FC<Props> = ({ atendentes }) => {
    const [atendenteId, setAtendenteId] = useState<string>('');
    const [periodo, setPeriodo] = useState<Periodo>('7d');
    const [customIni, setCustomIni] = useState('');
    const [customFim, setCustomFim] = useState('');
    const [gerando, setGerando] = useState(false);
    const [analises, setAnalises] = useState<WaAnalise[]>([]);
    const [abertoId, setAbertoId] = useState<string | null>(null);
    const [copiadoId, setCopiadoId] = useState<string | null>(null);

    useEffect(() => {
        listAnalises().then(setAnalises);
    }, []);

    const intervalo = useMemo((): { fromISO: string; toISO: string } | null => {
        const agora = new Date();
        if (periodo === 'hoje') return { fromISO: inicioDoDia(agora).toISOString(), toISO: agora.toISOString() };
        if (periodo === '7d') return { fromISO: new Date(agora.getTime() - 7 * 864e5).toISOString(), toISO: agora.toISOString() };
        if (periodo === '30d') return { fromISO: new Date(agora.getTime() - 30 * 864e5).toISOString(), toISO: agora.toISOString() };
        if (!customIni || !customFim) return null;
        const ini = new Date(customIni + 'T00:00:00');
        const fim = new Date(customFim + 'T23:59:59');
        if (isNaN(ini.getTime()) || isNaN(fim.getTime()) || ini > fim) return null;
        return { fromISO: ini.toISOString(), toISO: fim.toISOString() };
    }, [periodo, customIni, customFim]);

    const handleGerar = async () => {
        if (!intervalo) return alert('Informe um período válido.');
        setGerando(true);
        try {
            const analise = await gerarRelatorioIA({
                atendenteId: atendenteId || null,
                fromISO: intervalo.fromISO,
                toISO: intervalo.toISO,
            });
            setAnalises(prev => [analise, ...prev]);
            setAbertoId(analise.id);
        } catch (e: any) {
            const msg = String(e?.message || e);
            if (msg.includes('não configurada')) {
                alert(msg + '\n\nConfigure o provedor de IA em Configurações → GPT & Gemini.');
            } else {
                alert('Falha ao gerar o relatório: ' + msg);
            }
        } finally {
            setGerando(false);
        }
    };

    const handleExcluir = async (id: string) => {
        if (!confirm('Excluir este relatório?')) return;
        const ok = await deleteAnalise(id);
        if (ok) setAnalises(prev => prev.filter(a => a.id !== id));
    };

    const handleCopiar = async (analise: WaAnalise) => {
        try {
            await navigator.clipboard.writeText(analise.relatorio);
            setCopiadoId(analise.id);
            setTimeout(() => setCopiadoId(null), 1500);
        } catch {
            alert('Não foi possível copiar.');
        }
    };

    return (
        <div className="space-y-4">
            {/* Gerador */}
            <div className="bg-[var(--admin-surface-1)] border border-[var(--admin-border)] rounded-xl p-4">
                <h3 className="font-black text-sm text-[var(--admin-text-primary)] flex items-center gap-2 mb-3">
                    <Sparkles size={15} className="text-[var(--admin-accent-gold)]" /> Gerar análise de atendimento
                </h3>
                <div className="flex flex-wrap items-end gap-3">
                    <div>
                        <label className="block text-[10px] font-black uppercase text-[var(--admin-text-tertiary)] mb-1">Atendente</label>
                        <select
                            value={atendenteId}
                            onChange={e => setAtendenteId(e.target.value)}
                            className="bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-lg px-3 py-2 text-xs text-[var(--admin-text-primary)]"
                        >
                            <option value="">Todos os atendentes</option>
                            {atendentes.filter(a => a.instance_name).map(a => (
                                <option key={a.id} value={a.id}>{a.nome || `Atendente ${a.slot}`}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black uppercase text-[var(--admin-text-tertiary)] mb-1">Período</label>
                        <select
                            value={periodo}
                            onChange={e => setPeriodo(e.target.value as Periodo)}
                            className="bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-lg px-3 py-2 text-xs text-[var(--admin-text-primary)]"
                        >
                            <option value="hoje">Hoje</option>
                            <option value="7d">Últimos 7 dias</option>
                            <option value="30d">Últimos 30 dias</option>
                            <option value="custom">Personalizado</option>
                        </select>
                    </div>
                    {periodo === 'custom' && (
                        <>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-[var(--admin-text-tertiary)] mb-1">De</label>
                                <input type="date" value={customIni} onChange={e => setCustomIni(e.target.value)}
                                    className="bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-lg px-3 py-2 text-xs text-[var(--admin-text-primary)]" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-[var(--admin-text-tertiary)] mb-1">Até</label>
                                <input type="date" value={customFim} onChange={e => setCustomFim(e.target.value)}
                                    className="bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-lg px-3 py-2 text-xs text-[var(--admin-text-primary)]" />
                            </div>
                        </>
                    )}
                    <button
                        onClick={handleGerar}
                        disabled={gerando || !intervalo}
                        className="bg-gradient-to-r from-wtech-gold to-yellow-600 text-black px-5 py-2 rounded-lg font-black text-xs uppercase flex items-center gap-2 disabled:opacity-50"
                    >
                        {gerando ? <Loader2 size={14} className="animate-spin" /> : <Bot size={14} />}
                        {gerando ? 'Analisando conversas…' : 'Gerar relatório'}
                    </button>
                </div>
                <p className="text-[10px] text-[var(--admin-text-tertiary)] mt-2">
                    A IA lê as conversas sincronizadas do período e avalia cordialidade, agilidade, clareza técnica,
                    aproveitamento comercial e resolução. Pode levar até ~1 minuto. Nada é enviado ao WhatsApp.
                </p>
            </div>

            {/* Histórico */}
            <div className="space-y-2">
                {!analises.length && (
                    <p className="text-xs text-[var(--admin-text-tertiary)] text-center py-6">
                        Nenhum relatório gerado ainda.
                    </p>
                )}
                {analises.map(analise => {
                    const aberto = abertoId === analise.id;
                    const stats: AtendenteStats[] = analise.stats?.porAtendente || [];
                    return (
                        <div key={analise.id} className="bg-[var(--admin-surface-1)] border border-[var(--admin-border)] rounded-xl overflow-hidden">
                            <button
                                onClick={() => setAbertoId(aberto ? null : analise.id)}
                                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[var(--admin-surface-2)] transition-colors"
                            >
                                <div className="min-w-0">
                                    <p className="text-xs font-black text-[var(--admin-text-primary)] truncate">
                                        {analise.atendente_nome || 'Todos os atendentes'} · {fmtData(analise.periodo_inicio)} → {fmtData(analise.periodo_fim)}
                                    </p>
                                    <p className="text-[10px] text-[var(--admin-text-tertiary)]">
                                        Gerado em {fmtDataHora(analise.created_at)}
                                        {analise.stats?.totalMensagens ? ` · ${analise.stats.totalMensagens} mensagens analisadas` : ''}
                                    </p>
                                </div>
                                {aberto ? <ChevronUp size={16} className="shrink-0 text-[var(--admin-text-tertiary)]" /> : <ChevronDown size={16} className="shrink-0 text-[var(--admin-text-tertiary)]" />}
                            </button>
                            {aberto && (
                                <div className="px-4 pb-4 space-y-3">
                                    {stats.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {stats.map(s => (
                                                <div key={s.atendente} className="bg-[var(--admin-surface-2)] rounded-lg px-3 py-2 text-[10px] text-[var(--admin-text-secondary)]">
                                                    <p className="font-black text-[var(--admin-text-primary)]">{s.atendente}</p>
                                                    <p>{s.conversas} conversas · {s.enviadas} enviadas · {s.recebidas} recebidas</p>
                                                    <p>
                                                        {s.aguardandoResposta} aguardando resposta
                                                        {s.tempoMedioRespostaMin !== null ? ` · resposta média ${s.tempoMedioRespostaMin} min` : ''}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <pre className="whitespace-pre-wrap break-words font-sans text-xs leading-relaxed text-[var(--admin-text-primary)] bg-[var(--admin-surface-2)]/50 rounded-lg p-4 max-h-[500px] overflow-y-auto custom-scrollbar">
                                        {analise.relatorio}
                                    </pre>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleCopiar(analise)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-[var(--admin-surface-2)] text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface-3)]"
                                        >
                                            {copiadoId === analise.id ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                                            {copiadoId === analise.id ? 'Copiado!' : 'Copiar relatório'}
                                        </button>
                                        <button
                                            onClick={() => handleExcluir(analise.id)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold text-red-500 hover:bg-red-50"
                                        >
                                            <Trash2 size={12} /> Excluir
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AtendentesRelatorios;
