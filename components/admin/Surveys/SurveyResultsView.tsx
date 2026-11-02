import React, { useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle,
    ClipboardCheck,
    Copy,
    Download,
    ExternalLink,
    GraduationCap,
    MessageSquareQuote,
    Repeat,
    Star,
    Users,
} from 'lucide-react';
import {
    SECTION_LABELS,
    SURVEYS,
    type MultiQuestion,
    type ScaleQuestion,
    type Survey,
    type SurveyAnswers,
} from '../../../lib/surveys';

/**
 * Avaliações de curso — resultados do quiz público /avaliacao/<slug>.
 *
 * Lê /api/surveys (GET, sessão de staff com courses_view). A tabela é service_role
 * only, por isso esta view não fala direto com o Supabase.
 */

interface SurveyResponse {
    id: string;
    survey: string;
    answers: SurveyAnswers;
    name: string | null;
    created_at: string;
}

const formatAvg = (n: number | null) => (n === null ? '—' : n.toFixed(1).replace('.', ','));

function average(responses: SurveyResponse[], questionId: string): number | null {
    const scores = responses
        .map((r) => r.answers[questionId])
        .filter((v): v is number => typeof v === 'number');
    return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
}

const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string | number }> = ({ icon, label, value }) => (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.03]">
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            {icon}
            <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
        </div>
        <p className="mt-3 text-3xl font-black tabular-nums text-gray-900 dark:text-white">{value}</p>
    </div>
);

const Panel: React.FC<{ title: string; subtitle?: string; badge?: string; className?: string; children: React.ReactNode }> = ({
    title,
    subtitle,
    badge,
    className = '',
    children,
}) => (
    <section className={`rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-white/[0.03] ${className}`}>
        <header className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4 dark:border-white/[0.06]">
            <div>
                {subtitle && <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{subtitle}</p>}
                <h3 className="mt-0.5 text-sm font-bold leading-snug text-gray-900 dark:text-white">{title}</h3>
            </div>
            {badge && (
                <span className="shrink-0 rounded-lg bg-wtech-gold/15 px-2.5 py-1 text-xs font-black text-yellow-700 dark:text-wtech-gold">
                    {badge}
                </span>
            )}
        </header>
        {children}
    </section>
);

const SurveyResultsView: React.FC = () => {
    const [slug, setSlug] = useState(SURVEYS[0].slug);
    const [responses, setResponses] = useState<SurveyResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);
    const survey = SURVEYS.find((s) => s.slug === slug) ?? SURVEYS[0];

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setError('');
        fetch(`/api/surveys?slug=${encodeURIComponent(slug)}`, {
            credentials: 'include',
            headers: { Accept: 'application/json' },
            signal: controller.signal,
        })
            .then(async (r) => {
                if (r.status === 401) throw new Error('Sessão de staff expirada. Entre de novo no painel.');
                if (!r.ok) throw new Error(`Falha ao carregar avaliações (HTTP ${r.status}).`);
                const data = await r.json();
                setResponses(Array.isArray(data) ? data : []);
            })
            .catch((e) => {
                if (controller.signal.aborted) return;
                setError(e instanceof Error ? e.message : 'Falha ao carregar avaliações.');
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });
        return () => controller.abort();
    }, [slug, reloadKey]);

    const stats = useMemo(() => {
        const total = responses.length;
        const returning = responses.filter((r) => Number(r.answers.return) >= 4).length;
        return {
            total,
            course: average(responses, 'course'),
            instructor: average(responses, 'instructor'),
            returnRate: total ? Math.round((returning / total) * 100) : null,
        };
    }, [responses]);

    const scaleQuestions = survey.questions.filter((q): q is ScaleQuestion => q.type === 'scale');
    const multiQuestions = survey.questions.filter((q): q is MultiQuestion => q.type === 'multi');
    const suggestions = responses.filter((r) => typeof r.answers.suggestions === 'string');
    const publicUrl = `${window.location.origin}/avaliacao/${survey.slug}`;

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(publicUrl);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            window.prompt('Copie o link da avaliação:', publicUrl);
        }
    };

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-black text-gray-900 dark:text-white">
                        <ClipboardCheck className="text-wtech-gold" size={24} /> Avaliações de Curso
                    </h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {survey.course} · {survey.dates} · {survey.location}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {SURVEYS.length > 1 && (
                        <select
                            value={slug}
                            onChange={(e) => setSlug(e.target.value)}
                            className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-[#161616] dark:text-white"
                        >
                            {SURVEYS.map((s) => (
                                <option key={s.slug} value={s.slug}>
                                    {s.course} · {s.dates}
                                </option>
                            ))}
                        </select>
                    )}
                    <button
                        type="button"
                        onClick={copyLink}
                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-gray-200 px-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50 dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/5"
                    >
                        <Copy size={15} /> {copied ? 'Link copiado!' : 'Copiar link'}
                    </button>
                    <a
                        href={publicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-gray-200 px-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50 dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/5"
                    >
                        <ExternalLink size={15} /> Abrir quiz
                    </a>
                    <button
                        type="button"
                        onClick={() => downloadCsv(survey, responses)}
                        disabled={!responses.length}
                        className="inline-flex h-9 items-center gap-2 rounded-lg bg-wtech-gold px-3 text-sm font-black text-black transition hover:brightness-95 disabled:opacity-40"
                    >
                        <Download size={15} /> Exportar CSV
                    </button>
                </div>
            </div>

            {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-500/20 dark:bg-red-500/10">
                    <p className="flex items-center gap-2 font-bold text-red-700 dark:text-red-300">
                        <AlertTriangle size={18} /> {error}
                    </p>
                    <button
                        type="button"
                        onClick={() => setReloadKey((k) => k + 1)}
                        className="mt-3 text-sm font-bold text-red-700 underline dark:text-red-300"
                    >
                        Tentar de novo
                    </button>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                        <StatCard icon={<Users size={16} />} label="Respostas" value={loading ? '…' : stats.total} />
                        <StatCard icon={<Star size={16} />} label="Nota do curso (1–5)" value={formatAvg(stats.course)} />
                        <StatCard icon={<GraduationCap size={16} />} label="Nota do formador (1–5)" value={formatAvg(stats.instructor)} />
                        <StatCard
                            icon={<Repeat size={16} />}
                            label="Voltaria a inscrever-se"
                            value={stats.returnRate === null ? '—' : `${stats.returnRate}%`}
                        />
                    </div>

                    {!loading && responses.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center dark:border-white/10 dark:bg-white/[0.02]">
                            <ClipboardCheck className="mx-auto mb-3 text-gray-400" size={38} />
                            <p className="font-bold text-gray-700 dark:text-gray-200">Ainda sem respostas</p>
                            <p className="mt-1 text-sm text-gray-500">
                                Envie o link <span className="font-mono text-gray-700 dark:text-gray-300">{publicUrl}</span> no grupo da turma.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                            {scaleQuestions.map((q) => (
                                <ScaleCard key={q.id} question={q} responses={responses} />
                            ))}
                            {multiQuestions.map((q) => (
                                <MultiCard key={q.id} question={q} responses={responses} />
                            ))}

                            <Panel
                                className="xl:col-span-2"
                                title="Caixa de sugestões"
                                subtitle={`${suggestions.length} sugest${suggestions.length === 1 ? 'ão' : 'ões'}`}
                            >
                                {suggestions.length === 0 ? (
                                    <p className="px-5 py-4 text-sm text-gray-500">Nenhuma sugestão escrita até agora.</p>
                                ) : (
                                    <ul className="divide-y divide-gray-100 dark:divide-white/[0.06]">
                                        {suggestions.map((r) => (
                                            <li key={r.id} className="flex gap-3 px-5 py-4">
                                                <MessageSquareQuote size={16} className="mt-0.5 shrink-0 text-gray-400" />
                                                <div>
                                                    <p className="whitespace-pre-line text-sm text-gray-800 dark:text-gray-200">
                                                        {r.answers.suggestions as string}
                                                    </p>
                                                    <p className="mt-1.5 text-xs text-gray-400">
                                                        {r.name || 'Anónimo'} · {formatDate(r.created_at)}
                                                    </p>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </Panel>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

function ScaleCard({ question, responses }: { question: ScaleQuestion; responses: SurveyResponse[] }) {
    const counts = question.options.map((_, i) => responses.filter((r) => r.answers[question.id] === i + 1).length);
    const answered = counts.reduce((a, b) => a + b, 0);

    return (
        <Panel
            title={question.title}
            subtitle={SECTION_LABELS[question.section]}
            badge={`Média ${formatAvg(average(responses, question.id))}`}
        >
            <div className="px-5 py-4">
                <DistributionBars
                    rows={question.options.map((label, i) => ({ label: `${i + 1} · ${label}`, count: counts[i] })).reverse()}
                    total={answered}
                />
            </div>
        </Panel>
    );
}

function MultiCard({ question, responses }: { question: MultiQuestion; responses: SurveyResponse[] }) {
    const rows = question.options
        .map((label) => ({
            label,
            count: responses.filter((r) => (r.answers[question.id] as string[] | undefined)?.includes(label)).length,
        }))
        .sort((a, b) => b.count - a.count);

    return (
        <Panel title={question.title} subtitle={`${SECTION_LABELS[question.section]} · várias escolhas por aluno`}>
            <div className="px-5 py-4">
                <DistributionBars rows={rows} total={responses.length} />
            </div>
        </Panel>
    );
}

/** Single-series horizontal bars: share of respondents per option (count + % as text). */
function DistributionBars({ rows, total }: { rows: { label: string; count: number }[]; total: number }) {
    return (
        <ul className="space-y-3">
            {rows.map(({ label, count }) => {
                const pct = total ? Math.round((count / total) * 100) : 0;
                return (
                    <li key={label} title={`${label}: ${count} resposta(s) · ${pct}%`}>
                        <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
                            <span className="truncate font-medium text-gray-700 dark:text-gray-300">{label}</span>
                            <span className="shrink-0 tabular-nums text-gray-500 dark:text-gray-400">
                                {count} · {pct}%
                            </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-white/[0.06]">
                            <div
                                className="h-full rounded-full bg-wtech-gold transition-[width] duration-500"
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}

function downloadCsv(survey: Survey, responses: SurveyResponse[]) {
    const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = ['Data', 'Nome', ...survey.questions.map((q) => q.title)];
    const rows = responses.map((r) => [
        new Date(r.created_at).toLocaleString('pt-BR'),
        r.name ?? '',
        ...survey.questions.map((q) => {
            const v = r.answers[q.id];
            if (q.type === 'scale' && typeof v === 'number') return `${v} - ${q.options[v - 1]}`;
            return Array.isArray(v) ? v.join('; ') : (v ?? '');
        }),
    ]);
    const csv = [header, ...rows].map((row) => row.map(escape).join(';')).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `avaliacoes-${survey.slug}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

export default SurveyResultsView;
