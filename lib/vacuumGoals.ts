/**
 * Metas do painel de vendas ao vivo da Vacuum Pump. Ficam em SITE_Config
 * (`vacuum_pump_goals`) e são editadas no próprio painel.
 */

export const VACUUM_GOALS_KEY = 'vacuum_pump_goals';

export interface VacuumGoals {
    /** Meta de máquinas da campanha. */
    machines: number;
    /** Meta máxima, normalmente o estoque da pré-venda. */
    stretch: number;
    /** Meta de faturamento da campanha, em reais. */
    revenue: number;
    /** Meta de máquinas por dia. */
    daily: number;
}

/** Reunião de lançamento: meta de 30 a 50 máquinas, a R$ 7.990 cada. */
export const VACUUM_DEFAULT_GOALS: VacuumGoals = { machines: 30, stretch: 50, revenue: 239_700, daily: 5 };

const positive = (value: unknown, fallback: number, max: number): number => {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 && number <= max ? number : fallback;
};

/** Valor inválido cai no padrão; a meta máxima nunca fica abaixo da meta. */
export function normalizeVacuumGoals(raw: unknown): VacuumGoals {
    const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
    const d = VACUUM_DEFAULT_GOALS;
    const machines = Math.floor(positive(source.machines, d.machines, 100_000));
    const stretch = Math.floor(positive(source.stretch, d.stretch, 100_000));
    return {
        machines,
        stretch: Math.max(machines, stretch),
        revenue: Math.round(positive(source.revenue, d.revenue, 1_000_000_000)),
        daily: Math.floor(positive(source.daily, d.daily, 100_000)),
    };
}

export function parseVacuumGoals(value: string | null | undefined): VacuumGoals {
    if (!value) return { ...VACUUM_DEFAULT_GOALS };
    try {
        return normalizeVacuumGoals(JSON.parse(value));
    } catch {
        return { ...VACUUM_DEFAULT_GOALS };
    }
}
