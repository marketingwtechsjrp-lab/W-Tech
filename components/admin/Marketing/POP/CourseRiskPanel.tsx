import React, { useEffect, useRef, useState } from 'react';
import { GraduationCap, CalendarDays, MapPin, Users, Loader2, WifiOff } from 'lucide-react';
import {
    marketingApi, formatDate,
    COURSE_ALERT_DEFAULTS,
    type CourseOccupancy,
} from '../../../../lib/popMarketing';
import type { PopNotify } from './PopMarketingView';

/**
 * 🎓 Turmas em risco (POP 8.4) — bloco do Painel ao Vivo que consome
 * GET /api/marketing/course-occupancy e destaca só as turmas at_risk
 * (poucos inscritos perto da data). Polling próprio de 60s para não
 * pesar no polling de 10s do painel.
 */

interface CourseRiskPanelProps {
    notify: PopNotify;
}

const POLL_INTERVAL_MS = 60_000;

const CourseRiskPanel = ({ notify }: CourseRiskPanelProps) => {
    const [courses, setCourses] = useState<CourseOccupancy[]>([]);
    const [settings, setSettings] = useState<{ days: number; min_pct: number }>({ ...COURSE_ALERT_DEFAULTS });
    const [isLoading, setIsLoading] = useState(true);
    const [isOffline, setIsOffline] = useState(false);
    const errorNotified = useRef(false);

    const fetchOccupancy = async (showSpinner: boolean) => {
        if (showSpinner) setIsLoading(true);
        try {
            const data = await marketingApi.courseOccupancy();
            // Só as turmas em risco interessam neste bloco
            setCourses((data.courses || []).filter(c => c.at_risk));
            if (data.settings) setSettings(data.settings);
            setIsOffline(false);
            errorNotified.current = false;
        } catch (err) {
            console.error('Erro ao carregar ocupação de turmas:', err);
            setCourses([]);
            setIsOffline(true);
            // Toast único — os ciclos seguintes degradam em silêncio
            if (!errorNotified.current) {
                errorNotified.current = true;
                notify('info', 'Ocupação de turmas indisponível no momento.');
            }
        } finally {
            if (showSpinner) setIsLoading(false);
        }
    };

    // Polling de 60s com cleanup (padrão do projeto)
    useEffect(() => {
        fetchOccupancy(true);
        const id = setInterval(() => fetchOccupancy(false), POLL_INTERVAL_MS);
        return () => clearInterval(id);
    }, []);

    return (
        <div className="bg-[var(--admin-surface-1)] rounded-2xl border border-[var(--admin-border)] shadow-sm p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="font-black text-[var(--admin-text-primary)] flex items-center gap-2">
                    <span aria-hidden>🎓</span> Turmas em risco
                </h4>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--admin-text-tertiary)]">
                    Próximos {settings.days} dias · abaixo de {settings.min_pct}% de ocupação
                </span>
            </div>

            {isLoading ? (
                <div className="py-8 text-center text-[var(--admin-text-tertiary)]">
                    <Loader2 size={22} className="mx-auto animate-spin mb-1.5" />
                    <p className="text-xs font-medium">Verificando ocupação das turmas…</p>
                </div>
            ) : isOffline ? (
                <div className="py-8 text-center text-[var(--admin-text-tertiary)]">
                    <WifiOff size={26} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-medium">Sem conexão com o servidor de ocupação.</p>
                </div>
            ) : courses.length === 0 ? (
                <div className="py-8 text-center text-[var(--admin-text-secondary)]">
                    <GraduationCap size={32} className="mx-auto mb-2 opacity-20" />
                    <p className="text-sm font-bold">Nenhuma turma em risco 🎉</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {courses.map(course => (
                        <div
                            key={course.id}
                            className="bg-[var(--admin-surface-2)] rounded-xl border border-red-200 dark:border-red-900/50 p-4 flex items-start justify-between gap-3"
                        >
                            <div className="min-w-0">
                                <p className="text-sm font-bold text-[var(--admin-text-primary)] leading-snug line-clamp-2">
                                    {course.title}
                                </p>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs font-medium text-[var(--admin-text-tertiary)]">
                                    <span className="flex items-center gap-1"><CalendarDays size={11} /> {formatDate(course.date)}</span>
                                    {course.location && <span className="flex items-center gap-1"><MapPin size={11} /> {course.location}</span>}
                                </div>
                                <p className="text-xs font-bold text-[var(--admin-text-secondary)] mt-1.5 flex items-center gap-1">
                                    <Users size={11} />
                                    {course.enrolled}/{course.capacity} inscritos
                                    {course.assumed_capacity && (
                                        <span className="text-[9px] font-medium text-[var(--admin-text-tertiary)]" title="Turma sem número de vagas cadastrado — capacidade assumida">
                                            (estimado)
                                        </span>
                                    )}
                                </p>
                            </div>
                            {/* Ocupação em vermelho — é o alerta do bloco */}
                            <span className="shrink-0 text-lg font-black text-red-600 dark:text-red-400">
                                {Math.round(course.pct)}%
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CourseRiskPanel;
