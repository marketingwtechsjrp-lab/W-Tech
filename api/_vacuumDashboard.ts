import { VACUUM_CAMPAIGN } from '../lib/vacuumOffer.js';
import { VACUUM_GOALS_KEY, normalizeVacuumGoals, parseVacuumGoals } from '../lib/vacuumGoals.js';
import { isPermissionGranted, requireStaffPermission } from './_auth.js';
import { loadVacuumOffer } from './_vacuumPump.js';

/**
 * Painel de vendas ao vivo: só a equipe com permissão lê. Várias telas podem ficar
 * abertas ao mesmo tempo, então o resultado fica 3 s em memória e o banco não sente.
 */

const CACHE_MS = 3_000;
const cache = new Map<string, { at: number; data: unknown; goals: unknown }>();

function startOfTodaySP(now: number): string {
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date(now));
    return `${day}T00:00:00-03:00`;
}

export async function handleVacuumDashboard(supabase: any, req: any, res: any) {
    const staff = await requireStaffPermission(req, res, 'campaign_live_view');
    if (!staff) return;

    const range = req.query?.range === 'today' ? 'today' : 'campaign';
    const now = Date.now();
    const { config, state } = await loadVacuumOffer(supabase);

    let cached = cache.get(range);
    if (!cached || now - cached.at > CACHE_MS) {
        const today = startOfTodaySP(now);
        const [dashboard, goals] = await Promise.all([
            supabase.rpc('site_vacuum_dashboard', {
                p_campaign: VACUUM_CAMPAIGN,
                p_from: range === 'today' ? today : config.starts_at,
                p_to: new Date(now + 60_000).toISOString(),
                p_sales_from: range === 'today' ? today : null,
            }),
            supabase.from('SITE_Config').select('value').eq('key', VACUUM_GOALS_KEY).maybeSingle(),
        ]);
        if (dashboard.error) {
            console.error('[Vacuum] Falha ao montar o painel:', dashboard.error.message);
            return res.status(500).json({ error: 'Não foi possível carregar o painel agora.' });
        }
        cached = { at: now, data: dashboard.data, goals: parseVacuumGoals(goals.data?.value) };
        cache.set(range, cached);
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
        now,
        range,
        can_manage: isPermissionGranted(staff.permissions, 'campaign_live_manage'),
        goals: cached.goals,
        offline_sales: config.sold_offset,
        offer: {
            phase: state.phase,
            starts_at: state.starts_at,
            ends_at: state.ends_at,
            price: state.price,
            installment_value: state.installment_value,
            installments: state.installments,
            lot_size: state.lot_size,
            remaining: state.remaining,
        },
        data: cached.data,
    });
}

export async function handleVacuumGoals(supabase: any, req: any, res: any) {
    const staff = await requireStaffPermission(req, res, 'campaign_live_manage');
    if (!staff) return;

    const goals = normalizeVacuumGoals(req.body);
    const { error } = await supabase
        .from('SITE_Config')
        .upsert({ key: VACUUM_GOALS_KEY, value: JSON.stringify(goals) }, { onConflict: 'key' });
    if (error) {
        console.error('[Vacuum] Falha ao salvar as metas:', error.message);
        return res.status(500).json({ error: 'Não foi possível salvar as metas.' });
    }
    cache.clear();
    return res.status(200).json({ ok: true, goals });
}
