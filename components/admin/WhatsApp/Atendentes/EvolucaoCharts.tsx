import React from 'react';
import {
    Area, AreaChart, CartesianGrid, Legend, Line, LineChart, PolarAngleAxis, PolarGrid,
    PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { ArrowDownRight, ArrowRight, ArrowUpRight, Clock, FileText, Gauge } from 'lucide-react';
import { CRITERIOS, EvolucaoPonto, EvolucaoResumo, Veredito } from '../../../../lib/waEvolucao';

/**
 * Gráficos da aba Evolução — série temporal das notas, comparação
 * primeiro × último período e curva do tempo médio de resposta.
 */

const NOTA_GERAL_COR = '#0ea5e9';

const CHART_TOOLTIP = {
    contentStyle: {
        background: 'var(--admin-surface-1)',
        border: '1px solid var(--admin-border)',
        borderRadius: 12,
        fontSize: 12,
        color: 'var(--admin-text-primary)',
    },
    labelStyle: { color: 'var(--admin-text-secondary)', fontWeight: 700 },
} as const;

const EIXO = { axisLine: false, tickLine: false, tick: { fill: '#9ca3af', fontSize: 11 } } as const;

/**
 * Animação de entrada desligada: o path do recharts nasce com stroke-dasharray
 * zerado e, se a animação não completar, a linha simplesmente não aparece.
 * Aqui o dado importa mais que o efeito.
 */
const SEM_ANIMACAO = { isAnimationActive: false } as const;

/** Rótulo curto no eixo X ("01/06 → 07/06" vira "07/06"); o período completo fica no tooltip. */
const labelCurto = (label: string) => label.split('→').pop()?.trim() || label;

const tooltipPeriodo = (_: unknown, payload: readonly any[] | undefined) =>
    payload?.[0]?.payload?.periodo ?? '';

const arred = (n: number) => Math.round(n * 10) / 10;
const sinal = (n: number) => (n > 0 ? `+${arred(n)}` : `${arred(n)}`);

// ─── Veredito ────────────────────────────────────────────────────────────────

const VEREDITO: Record<Veredito, { label: string; classe: string; Icon: React.ElementType }> = {
    evoluiu: { label: 'Evoluiu', classe: 'bg-green-100 text-green-700', Icon: ArrowUpRight },
    piorou: { label: 'Piorou', classe: 'bg-red-100 text-red-700', Icon: ArrowDownRight },
    estavel: { label: 'Estável', classe: 'bg-yellow-100 text-yellow-700', Icon: ArrowRight },
};

const corDelta = (delta: number, menorEhMelhor = false) => {
    const bom = menorEhMelhor ? delta < 0 : delta > 0;
    const ruim = menorEhMelhor ? delta > 0 : delta < 0;
    return bom ? 'text-green-600' : ruim ? 'text-red-600' : 'text-[var(--admin-text-tertiary)]';
};

interface ResumoProps {
    resumo: EvolucaoResumo;
    totalRelatorios: number;
}

export const EvolucaoResumoCards: React.FC<ResumoProps> = ({ resumo, totalRelatorios }) => {
    const v = VEREDITO[resumo.veredito];
    const deltaTempo =
        resumo.tempoRespostaInicial !== null && resumo.tempoRespostaFinal !== null
            ? resumo.tempoRespostaFinal - resumo.tempoRespostaInicial
            : null;

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Veredito */}
            <div className="bg-[var(--admin-surface-1)] border border-[var(--admin-border)] rounded-xl p-4">
                <p className="text-[10px] font-black uppercase text-[var(--admin-text-tertiary)] mb-2">Veredito</p>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black ${v.classe}`}>
                    <v.Icon size={14} /> {v.label}
                </span>
                <p className="text-[10px] text-[var(--admin-text-tertiary)] mt-2">
                    Média {resumo.mediaInicial} → {resumo.mediaFinal}
                </p>
            </div>

            {/* Nota geral */}
            <div className="bg-[var(--admin-surface-1)] border border-[var(--admin-border)] rounded-xl p-4">
                <p className="text-[10px] font-black uppercase text-[var(--admin-text-tertiary)] mb-2 flex items-center gap-1">
                    <Gauge size={12} /> Nota geral
                </p>
                <p className="text-2xl font-black text-[var(--admin-text-primary)] leading-none">
                    {resumo.notaFinal}
                    <span className="text-sm text-[var(--admin-text-tertiary)] font-bold">/10</span>
                </p>
                <p className={`text-[11px] font-bold mt-1 ${corDelta(resumo.deltaGeral)}`}>
                    {sinal(resumo.deltaGeral)} desde {resumo.primeiroPeriodo.split(' → ')[0]}
                </p>
            </div>

            {/* Tempo de resposta */}
            <div className="bg-[var(--admin-surface-1)] border border-[var(--admin-border)] rounded-xl p-4">
                <p className="text-[10px] font-black uppercase text-[var(--admin-text-tertiary)] mb-2 flex items-center gap-1">
                    <Clock size={12} /> Tempo de resposta
                </p>
                {resumo.tempoRespostaFinal !== null ? (
                    <>
                        <p className="text-2xl font-black text-[var(--admin-text-primary)] leading-none">
                            {resumo.tempoRespostaFinal}
                            <span className="text-sm text-[var(--admin-text-tertiary)] font-bold"> min</span>
                        </p>
                        {deltaTempo !== null && (
                            <p className={`text-[11px] font-bold mt-1 ${corDelta(deltaTempo, true)}`}>
                                {sinal(deltaTempo)} min · antes {resumo.tempoRespostaInicial} min
                            </p>
                        )}
                    </>
                ) : (
                    <p className="text-xs text-[var(--admin-text-tertiary)]">Sem dados suficientes</p>
                )}
            </div>

            {/* Base da análise */}
            <div className="bg-[var(--admin-surface-1)] border border-[var(--admin-border)] rounded-xl p-4">
                <p className="text-[10px] font-black uppercase text-[var(--admin-text-tertiary)] mb-2 flex items-center gap-1">
                    <FileText size={12} /> Relatórios comparados
                </p>
                <p className="text-2xl font-black text-[var(--admin-text-primary)] leading-none">{totalRelatorios}</p>
                <p className="text-[10px] text-[var(--admin-text-tertiary)] mt-1">
                    {resumo.primeiroPeriodo} até {resumo.ultimoPeriodo}
                </p>
            </div>
        </div>
    );
};

// ─── Série temporal das notas ────────────────────────────────────────────────

interface PontosProps {
    pontos: EvolucaoPonto[];
}

export const EvolucaoLinhaChart: React.FC<PontosProps> = ({ pontos }) => {
    const data = pontos.map(p => ({
        eixo: labelCurto(p.label),
        periodo: p.label,
        geral: p.notas.geral,
        ...Object.fromEntries(CRITERIOS.map(c => [c.key, p.notas[c.key]])),
    }));

    return (
        <div className="bg-[var(--admin-surface-1)] border border-[var(--admin-border)] rounded-xl p-4">
            <h4 className="text-xs font-black text-[var(--admin-text-primary)] mb-1">Evolução das notas por período</h4>
            <p className="text-[10px] text-[var(--admin-text-tertiary)] mb-3">
                Notas de 0 a 10 extraídas de cada relatório, do mais antigo para o mais recente.
            </p>
            <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 5, right: 8, left: -22, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#888" opacity={0.15} />
                        <XAxis dataKey="eixo" interval="preserveStartEnd" {...EIXO} dy={8} />
                        <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} {...EIXO} />
                        <Tooltip {...CHART_TOOLTIP} labelFormatter={tooltipPeriodo} />
                        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="plainline" />
                        <Line
                            {...SEM_ANIMACAO} type="monotone" dataKey="geral" name="Nota geral"
                            stroke={NOTA_GERAL_COR} strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }}
                        />
                        {CRITERIOS.map(c => (
                            <Line
                                {...SEM_ANIMACAO} key={c.key} type="monotone" dataKey={c.key} name={c.label}
                                stroke={c.cor} strokeWidth={1.75} strokeDasharray="4 3" dot={{ r: 2 }}
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

// ─── Primeiro × último período ───────────────────────────────────────────────

export const EvolucaoComparativo: React.FC<PontosProps> = ({ pontos }) => {
    const primeiro = pontos[0];
    const ultimo = pontos[pontos.length - 1];

    const data = CRITERIOS.map(c => ({
        criterio: c.label,
        antes: primeiro.notas[c.key],
        agora: ultimo.notas[c.key],
    }));

    return (
        <div className="bg-[var(--admin-surface-1)] border border-[var(--admin-border)] rounded-xl p-4">
            <h4 className="text-xs font-black text-[var(--admin-text-primary)] mb-1">Primeiro relatório × último</h4>
            <p className="text-[10px] text-[var(--admin-text-tertiary)] mb-3">
                {primeiro.label} comparado com {ultimo.label}.
            </p>
            <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={data} outerRadius="72%">
                        <PolarGrid stroke="#888" opacity={0.25} />
                        <PolarAngleAxis dataKey="criterio" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                        <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
                        <Tooltip {...CHART_TOOLTIP} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Radar {...SEM_ANIMACAO} name={primeiro.label} dataKey="antes" stroke="#9ca3af" fill="#9ca3af" fillOpacity={0.2} />
                        <Radar {...SEM_ANIMACAO} name={ultimo.label} dataKey="agora" stroke="#25D366" fill="#25D366" fillOpacity={0.35} />
                    </RadarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

// ─── Tempo médio de resposta (métrica dura, não vem da IA) ───────────────────

/** Há série suficiente de tempo de resposta para desenhar o gráfico? */
export const temSerieTempoResposta = (pontos: EvolucaoPonto[]): boolean =>
    pontos.filter(p => p.metricas?.tempoRespostaMin != null).length >= 2;

export const EvolucaoTempoResposta: React.FC<PontosProps> = ({ pontos }) => {
    const data = pontos
        .filter(p => p.metricas?.tempoRespostaMin != null)
        .map(p => ({
            eixo: labelCurto(p.label),
            periodo: p.label,
            minutos: p.metricas!.tempoRespostaMin as number,
            conversas: p.metricas!.conversas,
        }));

    if (data.length < 2) return null;

    return (
        <div className="bg-[var(--admin-surface-1)] border border-[var(--admin-border)] rounded-xl p-4">
            <h4 className="text-xs font-black text-[var(--admin-text-primary)] mb-1">Tempo médio de resposta</h4>
            <p className="text-[10px] text-[var(--admin-text-tertiary)] mb-3">
                Minutos entre a mensagem do cliente e a resposta do atendente — quanto menor, melhor. Medido pelo
                sistema, sem interferência da IA.
            </p>
            <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 5, right: 8, left: -22, bottom: 0 }}>
                        <defs>
                            <linearGradient id="corTempoResposta" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#888" opacity={0.15} />
                        <XAxis dataKey="eixo" interval="preserveStartEnd" {...EIXO} dy={8} />
                        <YAxis {...EIXO} tickFormatter={(v: number) => `${v}m`} />
                        <Tooltip
                            {...CHART_TOOLTIP}
                            labelFormatter={tooltipPeriodo}
                            formatter={(value: number) => [`${value} min`, 'Resposta média']}
                        />
                        <Area
                            {...SEM_ANIMACAO} type="monotone" dataKey="minutos" stroke="#f59e0b" strokeWidth={2.5}
                            fillOpacity={1} fill="url(#corTempoResposta)" name="minutos"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

// ─── Deltas por critério ─────────────────────────────────────────────────────

interface DeltasProps {
    resumo: EvolucaoResumo;
}

export const EvolucaoDeltas: React.FC<DeltasProps> = ({ resumo }) => (
    <div className="bg-[var(--admin-surface-1)] border border-[var(--admin-border)] rounded-xl p-4">
        <h4 className="text-xs font-black text-[var(--admin-text-primary)] mb-3">Variação por critério</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
            {CRITERIOS.map(c => {
                const delta = resumo.deltas[c.key];
                const Icon = delta > 0 ? ArrowUpRight : delta < 0 ? ArrowDownRight : ArrowRight;
                return (
                    <div key={c.key} className="bg-[var(--admin-surface-2)] rounded-lg px-3 py-2">
                        <p className="text-[10px] font-bold text-[var(--admin-text-secondary)] flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.cor }} />
                            {c.label}
                        </p>
                        <p className={`text-lg font-black leading-tight flex items-center gap-1 ${corDelta(delta)}`}>
                            <Icon size={15} /> {sinal(delta)}
                        </p>
                    </div>
                );
            })}
        </div>
    </div>
);
