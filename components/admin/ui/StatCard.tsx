import React from 'react';
import { type LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';

type Accent = 'gold' | 'success' | 'danger' | 'info' | 'warning' | 'neutral';

const ACCENT: Record<Accent, { fg: string; bg: string }> = {
    gold: { fg: 'var(--admin-accent-gold)', bg: 'var(--admin-accent-gold-muted)' },
    success: { fg: 'var(--admin-success)', bg: 'var(--admin-success-muted)' },
    danger: { fg: 'var(--admin-danger)', bg: 'var(--admin-danger-muted)' },
    info: { fg: 'var(--admin-info)', bg: 'var(--admin-info-muted)' },
    warning: { fg: 'var(--admin-warning)', bg: 'var(--admin-warning-muted)' },
    neutral: { fg: 'var(--admin-text-secondary)', bg: 'var(--admin-surface-2)' },
};

interface StatCardProps {
    label: string;
    value: React.ReactNode;
    icon?: LucideIcon;
    accent?: Accent;
    /** Variação percentual/absoluta (ex.: "+12%"). */
    delta?: { value: string; positive?: boolean };
    hint?: string;
    onClick?: () => void;
}

/** Card de KPI clean/empresarial — usado no Dashboard e topos de seção. */
export const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, accent = 'neutral', delta, hint, onClick }) => {
    const c = ACCENT[accent];
    const Wrapper: any = onClick ? 'button' : 'div';
    return (
        <Wrapper
            onClick={onClick}
            className={
                'text-left bg-[var(--admin-surface-1)] border border-[var(--admin-border)] rounded-2xl p-4 md:p-5 ' +
                'transition-all ' + (onClick ? 'hover:border-[var(--admin-text-tertiary)] hover:shadow-sm active:scale-[0.99] cursor-pointer' : '')
            }
        >
            <div className="flex items-start justify-between gap-2 mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)] leading-tight">
                    {label}
                </span>
                {Icon && (
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: c.bg, color: c.fg }}>
                        <Icon size={16} />
                    </div>
                )}
            </div>
            <div className="flex items-end justify-between gap-2">
                <div className="text-2xl md:text-[28px] font-black tracking-tight text-[var(--admin-text-primary)] leading-none tabular-nums">
                    {value}
                </div>
                {delta && (
                    <span
                        className="flex items-center gap-0.5 text-xs font-bold shrink-0"
                        style={{ color: delta.positive === false ? 'var(--admin-danger)' : 'var(--admin-success)' }}
                    >
                        {delta.positive === false ? <ArrowDownRight size={13} /> : <ArrowUpRight size={13} />}
                        {delta.value}
                    </span>
                )}
            </div>
            {hint && <p className="text-[11px] text-[var(--admin-text-tertiary)] mt-2 leading-tight">{hint}</p>}
        </Wrapper>
    );
};

export default StatCard;
