import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, Link2, Maximize, MessageCircle, Minimize, PartyPopper, Radio, ReceiptText, Settings2, Target, Volume2, VolumeX, X } from 'lucide-react';
import { Area, Bar, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { VACUUM_DEFAULT_GOALS, type VacuumGoals } from '../../../lib/vacuumGoals';
import { SaleSound, launchConfetti } from './vacuumLiveAlert';
import { VL_CSS, VL_FONTS_HREF } from './vacuumLiveStyles';

/**
 * Painel de vendas ao vivo da Vacuum Pump, feito para ficar em uma TV com o time de vendas.
 * Lê o servidor a cada poucos segundos e comemora cada venda nova com som e confete.
 */

const POLL_MS = 4_000;
const ALERT_MS = 9_000;
const STALE_MS = 15_000;
const API = '/api/vacuum-pump';

interface RecentSale {
    id: string;
    order_number: string | null;
    first_name: string;
    city: string | null;
    state: string | null;
    total: number;
    method: string | null;
    seller: string | null;
    created_at: string;
    position: number;
    items: string[];
}

interface DashboardData {
    visits: { views: number; visitors: number; sessions: number; mobile: number; desktop: number; active_5m: number; today_views: number; today_visitors: number };
    clicks: { total: number; buy: number; by_action: { action: string; clicks: number; visitors: number }[] };
    funnel: { visitors: number; buy_click: number; checkout: number; payment: number; paid: number };
    open: { pix_pending: number; pix_pending_value: number; review: number; rejected: number; in_cart: number; contact: number; waitlist: number };
    sales_total: { count: number; revenue: number; today_count: number; today_revenue: number };
    sales: {
        count: number;
        revenue: number;
        with_accessory: number;
        with_seller: number;
        by_method: { method: string; sales: number; revenue: number }[];
        by_item: { id: string; name: string; units: number; revenue: number }[];
        by_seller: { seller: string; sales: number; revenue: number }[];
    };
    recent: RecentSale[];
    hourly: { bucket: string; visitors: number; clicks: number; sales: number }[];
    sources: { source: string; visitors: number }[];
}

interface SellerSummary {
    name: string;
    link: string;
    signups: number;
    sales: number;
    revenue: number;
}

interface Payload {
    now: number;
    me: SellerSummary;
    range: 'campaign' | 'today';
    can_manage: boolean;
    goals: VacuumGoals;
    offline_sales: number;
    offer: { phase: string; starts_at: string; ends_at: string; price: number; installment_value: number; installments: number; lot_size: number; remaining: number };
    data: DashboardData;
}

interface Celebration {
    sale: RecentSale;
    test: boolean;
    title: string;
    big: boolean;
    machines: number;
}

const MACHINE_ITEM = 'vacuum_pump_standard';
const brl = (value: number, cents = false) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 }).format(value || 0);
const int = (value: number) => new Intl.NumberFormat('pt-BR').format(Math.round(value || 0));
const percent = (part: number, whole: number, digits = 1) => (whole > 0 ? `${((part / whole) * 100).toFixed(digits).replace('.', ',')}%` : '0%');
const pad = (value: number) => String(value).padStart(2, '0');

function actionLabel(action: string): string {
    const known: Record<string, string> = {
        vacuum_cta_hero: 'Comprar: topo da página',
        vacuum_cta_sticky: 'Comprar: barra do celular',
        vacuum_cta_band: 'Comprar: faixa da foto',
        vacuum_cta_final: 'Comprar: oferta final',
        vacuum_cta_video: 'Comprar: fim do vídeo',
        vacuum_whatsapp_hero: 'Falar com especialista',
        vacuum_3d_ar: 'Ver na bancada (RA)',
        vacuum_3d_thumb: 'Abrir o 3D',
        vacuum_3d_open: 'Ver por dentro',
        vacuum_3d_load: 'Carregar o 3D',
        vacuum_video_thumb: 'Abrir o vídeo',
    };
    if (known[action]) return known[action];
    if (action.startsWith('vacuum_add_')) return 'Compre junto';
    if (action.startsWith('vacuum_bump_')) return 'Acessório no carrinho';
    if (action.startsWith('vacuum_ar_')) return 'Ver na bancada (RA)';
    if (action.startsWith('vacuum_3d_')) return 'Peças no 3D';
    return action.replace(/^vacuum_/, '').replace(/_/g, ' ');
}

function sourceLabel(source: string): string {
    const known: Record<string, string> = {
        direto: 'Direto',
        ig: 'Instagram',
        instagram: 'Instagram',
        'l.instagram.com': 'Instagram',
        fb: 'Facebook',
        facebook: 'Facebook',
        'l.facebook.com': 'Facebook',
        'm.facebook.com': 'Facebook',
        whatsapp: 'WhatsApp',
        vendedor: 'Link de vendedor',
        wa: 'WhatsApp',
        google: 'Google',
        google_ads: 'Google Ads',
        'google.com': 'Google',
        'w-techbrasil.com.br': 'Site W-Tech',
    };
    return known[source] ?? source;
}

function useCountUp(value: number, duration = 900): number {
    const [shown, setShown] = useState(value);
    const from = useRef(value);
    useEffect(() => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || from.current === value) {
            from.current = value;
            setShown(value);
            return;
        }
        const start = performance.now();
        const origin = from.current;
        let raf = 0;
        const tick = (time: number) => {
            const t = Math.min(1, (time - start) / duration);
            const eased = 1 - (1 - t) ** 3;
            const current = origin + (value - origin) * eased;
            setShown(current);
            if (t < 1) raf = requestAnimationFrame(tick);
            else from.current = value;
        };
        raf = requestAnimationFrame(tick);
        return () => {
            cancelAnimationFrame(raf);
            from.current = value;
        };
    }, [value, duration]);
    return shown;
}

const Count: React.FC<{ value: number; format?: (value: number) => string }> = ({ value, format = int }) => <>{format(useCountUp(value))}</>;

function useCountdown(target: string | undefined, offset: number) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const id = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(id);
    }, []);
    const left = Math.max(0, (target ? Date.parse(target) : 0) - (now + offset));
    return {
        total: left,
        days: Math.floor(left / 86_400_000),
        hours: Math.floor(left / 3_600_000) % 24,
        minutes: Math.floor(left / 60_000) % 60,
        seconds: Math.floor(left / 1000) % 60,
    };
}

const BarRow: React.FC<{ label: string; value: string; share: number; tone?: 'red' | 'green' | 'amber' | 'mute' }> = ({ label, value, share, tone = 'red' }) => (
    <li className="vl-row">
        <div className="vl-row-text"><span>{label}</span><b>{value}</b></div>
        <div className="vl-row-track"><span className={`vl-row-fill vl-tone-${tone}`} style={{ width: `${Math.min(100, Math.max(share > 0 ? 1.5 : 0, share))}%` }} /></div>
    </li>
);

const GoalsModal: React.FC<{ goals: VacuumGoals; onClose: () => void; onSaved: () => void }> = ({ goals, onClose, onSaved }) => {
    const [form, setForm] = useState<VacuumGoals>(goals);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const field = (key: keyof VacuumGoals, label: string, hint: string) => (
        <label className="vl-field">
            <span>{label}</span>
            <input type="number" min={1} value={form[key]} onChange={(event) => setForm({ ...form, [key]: Number(event.target.value) })} />
            <small>{hint}</small>
        </label>
    );
    const save = async (event: React.FormEvent) => {
        event.preventDefault();
        setSaving(true);
        setError('');
        try {
            const response = await fetch(`${API}?action=dashboard_goals`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            if (!response.ok) throw new Error();
            onSaved();
        } catch {
            setError('Não foi possível salvar. Tente de novo.');
            setSaving(false);
        }
    };
    return (
        <div className="vl-modal" role="dialog" aria-modal="true" aria-label="Metas da campanha">
            <form className="vl-modal-card" onSubmit={save}>
                <button type="button" className="vl-icon vl-modal-close" onClick={onClose} aria-label="Fechar"><X size={20} aria-hidden /></button>
                <h2>Metas da campanha</h2>
                {field('machines', 'Meta de máquinas', 'O número que o time persegue.')}
                {field('stretch', 'Meta máxima de máquinas', 'Normalmente o estoque da pré-venda.')}
                {field('revenue', 'Meta de faturamento (R$)', 'Total da campanha.')}
                {field('daily', 'Meta de máquinas por dia', 'Vale para o placar de hoje.')}
                {error && <p className="vl-error" role="alert">{error}</p>}
                <button type="submit" className="vl-primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar metas'}</button>
            </form>
        </div>
    );
};

/** O link de quem está logado. Não aparece em tela cheia: a TV não precisa mostrar o link de ninguém. */
const SellerLink: React.FC<{ me: SellerSummary; offer: Payload['offer'] }> = ({ me, offer }) => {
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(me.link);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2500);
        } catch {
            /* navegador sem permissão: o link continua visível para copiar à mão */
        }
    };
    const message = `Oi! Segue o link da Vacuum Pump Standard W-Tech, em ${offer.installments}x de ${brl(offer.installment_value)} sem juros, na pré-venda da Black Friday: ${me.link}`;
    return (
        <section className="vl-card vl-mylink" aria-label="Meu link de venda">
            <div>
                <h2 className="vl-label"><Link2 size={16} aria-hidden /> Meu link de venda</h2>
                <p className="vl-sub">Mande este link para quem você atendeu por ligação. Quem se cadastrar e comprar por ele fica no seu nome.</p>
            </div>
            <div className="vl-mylink-box">
                <input readOnly value={me.link} aria-label="Link de venda" onFocus={(event) => event.target.select()} />
                <button type="button" className="vl-primary vl-mylink-btn" onClick={() => void copy()} data-track="vacuum_seller_link_copy" data-track-category="Vacuum Pump">
                    {copied ? <><Check size={18} aria-hidden /> Copiado</> : <><Copy size={18} aria-hidden /> Copiar link</>}
                </button>
                <a className="vl-icon vl-mylink-btn" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer" data-track="vacuum_seller_link_whatsapp" data-track-category="Vacuum Pump">
                    <MessageCircle size={18} aria-hidden /> Enviar no WhatsApp
                </a>
            </div>
            <ul className="vl-mylink-stats">
                <li><b>{int(me.signups)}</b> cadastros</li>
                <li><b>{int(me.sales)}</b> vendas</li>
                <li><b>{brl(me.revenue)}</b></li>
            </ul>
        </section>
    );
};

const SaleOverlay: React.FC<{ celebration: Celebration; goals: VacuumGoals; onClose: () => void }> = ({ celebration, goals, onClose }) => {
    const canvas = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        if (!canvas.current) return;
        return launchConfetti(canvas.current, celebration.big ? 7000 : 4500, celebration.big ? 420 : 240);
    }, [celebration]);
    const { sale, machines } = celebration;
    const left = goals.machines - machines;
    const place = [sale.city, sale.state].filter(Boolean).join(' / ');
    const extras = sale.items.filter((item) => !/vacuum pump/i.test(item));
    return (
        <div className={`vl-alert ${celebration.big ? 'vl-alert-big' : ''}`} role="alert" onClick={onClose}>
            <canvas ref={canvas} className="vl-alert-confetti" aria-hidden />
            <div className="vl-alert-body">
                {celebration.test && <span className="vl-alert-test">Teste do alerta</span>}
                <p className="vl-alert-kick">Máquina nº {sale.position}</p>
                <h2 className="vl-alert-title">{celebration.title}</h2>
                <p className="vl-alert-who">{sale.first_name}{place ? ` · ${place}` : ''}</p>
                <p className="vl-alert-value">{brl(sale.total, true)}</p>
                {extras.length > 0 && <p className="vl-alert-items">{extras.map((item) => <span key={item}>+ {item}</span>)}</p>}
                <p className="vl-alert-seller">{sale.seller ? `Vendedor: ${sale.seller}` : 'Compra direta online'}</p>
                <p className="vl-alert-goal">{left > 0 ? `Faltam ${left} para a meta de ${goals.machines}` : `Meta de ${goals.machines} batida. Rumo às ${goals.stretch}!`}</p>
            </div>
        </div>
    );
};

const VacuumLivePanel: React.FC<{ onOpenOrders?: () => void }> = ({ onOpenOrders }) => {
    const rootRef = useRef<HTMLDivElement>(null);
    const [payload, setPayload] = useState<Payload | null>(null);
    const [range, setRange] = useState<'campaign' | 'today' | null>(null);
    const [lastOk, setLastOk] = useState(0);
    const [clock, setClock] = useState(() => Date.now());
    const [denied, setDenied] = useState(false);
    const [soundWanted, setSoundWanted] = useState(true);
    const [soundReady, setSoundReady] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);
    const [goalsOpen, setGoalsOpen] = useState(false);
    const [celebration, setCelebration] = useState<Celebration | null>(null);
    const seen = useRef<Set<string> | null>(null);
    const queue = useRef<Celebration[]>([]);
    const showing = useRef(false);
    const soundRef = useRef<SaleSound | null>(null);
    const soundWantedRef = useRef(true);
    soundWantedRef.current = soundWanted;

    if (!soundRef.current && typeof window !== 'undefined') soundRef.current = new SaleSound();

    const showNext = useCallback(() => {
        const next = queue.current.shift();
        if (!next) {
            showing.current = false;
            setCelebration(null);
            return;
        }
        showing.current = true;
        setCelebration(next);
        if (soundWantedRef.current) soundRef.current?.play(next.big);
    }, []);

    const enqueue = useCallback((item: Celebration) => {
        queue.current.push(item);
        if (!showing.current) showNext();
    }, [showNext]);

    useEffect(() => {
        if (!celebration) return;
        const timer = window.setTimeout(showNext, celebration.big ? ALERT_MS + 4000 : ALERT_MS);
        return () => window.clearTimeout(timer);
    }, [celebration, showNext]);

    const load = useCallback(async () => {
        try {
            const query = range ? `&range=${range}` : '';
            const response = await fetch(`${API}?action=dashboard${query}`, { credentials: 'include', cache: 'no-store' });
            if (response.status === 401 || response.status === 403) {
                setDenied(true);
                return;
            }
            if (!response.ok) return;
            const next = (await response.json()) as Payload;
            setDenied(false);
            setLastOk(Date.now());
            setPayload(next);
            // Antes da abertura, o período da campanha ainda está zerado: começa mostrando hoje.
            if (!range) setRange(next.now < Date.parse(next.offer.starts_at) ? 'today' : 'campaign');

            const recent = [...next.data.recent].reverse();
            if (!seen.current) {
                seen.current = new Set(recent.map((sale) => sale.id));
                return;
            }
            for (const sale of recent) {
                if (seen.current.has(sale.id)) continue;
                seen.current.add(sale.id);
                const machines = sale.position + next.offline_sales;
                const hitGoal = machines === next.goals.machines;
                const hitStretch = machines === next.goals.stretch;
                enqueue({
                    sale,
                    test: false,
                    machines,
                    big: hitGoal || hitStretch,
                    title: hitStretch ? 'Meta máxima!' : hitGoal ? 'Meta batida!' : 'Venda!',
                });
            }
        } catch {
            // Sem rede: a tarja de conexão avisa e a próxima rodada tenta de novo.
        }
    }, [range, enqueue]);

    useEffect(() => {
        void load();
        const id = window.setInterval(() => void load(), POLL_MS);
        return () => window.clearInterval(id);
    }, [load]);

    useEffect(() => {
        const id = window.setInterval(() => setClock(Date.now()), 1000);
        return () => window.clearInterval(id);
    }, []);

    useEffect(() => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = VL_FONTS_HREF;
        document.head.appendChild(link);
        const onChange = () => setFullscreen(document.fullscreenElement === rootRef.current);
        document.addEventListener('fullscreenchange', onChange);
        return () => {
            link.remove();
            document.removeEventListener('fullscreenchange', onChange);
            soundRef.current?.dispose();
            soundRef.current = null;
        };
    }, []);

    // Qualquer clique na tela libera o som: o navegador não deixa tocar sem isso.
    useEffect(() => {
        const unlock = () => {
            soundRef.current?.unlock();
            setSoundReady(true);
        };
        const root = rootRef.current;
        root?.addEventListener('pointerdown', unlock);
        return () => root?.removeEventListener('pointerdown', unlock);
    }, []);

    // Em tela cheia a TV não pode apagar.
    useEffect(() => {
        if (!fullscreen || !('wakeLock' in navigator)) return;
        let lock: WakeLockSentinel | null = null;
        const request = () => {
            void navigator.wakeLock.request('screen').then((sentinel) => { lock = sentinel; }).catch(() => undefined);
        };
        request();
        const onVisible = () => {
            if (!document.hidden) request();
        };
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            document.removeEventListener('visibilitychange', onVisible);
            void lock?.release().catch(() => undefined);
        };
    }, [fullscreen]);

    const toggleFullscreen = () => {
        if (document.fullscreenElement) void document.exitFullscreen();
        else void rootRef.current?.requestFullscreen?.();
    };

    const testAlert = () => {
        soundRef.current?.unlock();
        setSoundReady(true);
        const machines = (payload?.data.sales_total.count ?? 0) + (payload?.offline_sales ?? 0) + 1;
        enqueue({
            test: true,
            machines,
            big: false,
            title: 'Venda!',
            sale: {
                id: `teste-${Date.now()}`,
                order_number: null,
                first_name: 'Cliente',
                city: 'São José do Rio Preto',
                state: 'SP',
                total: 8689,
                method: 'Mercado Pago - Pix',
                seller: null,
                created_at: new Date().toISOString(),
                position: machines,
                items: ['Vacuum Pump Standard W-Tech', 'Câmara Borbulhadora W-Tech'],
            },
        });
    };

    const offset = payload ? payload.now - lastOk : 0;
    const beforeStart = payload ? clock + offset < Date.parse(payload.offer.starts_at) : false;
    const countdown = useCountdown(beforeStart ? payload?.offer.starts_at : payload?.offer.ends_at, offset);
    const stale = lastOk > 0 && clock - lastOk > STALE_MS;

    const data = payload?.data;
    const goals = payload?.goals ?? VACUUM_DEFAULT_GOALS;

    const clickRows = useMemo(() => {
        const totals = new Map<string, number>();
        for (const row of data?.clicks.by_action ?? []) {
            const label = actionLabel(row.action);
            totals.set(label, (totals.get(label) ?? 0) + row.clicks);
        }
        return [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, fullscreen ? 5 : 7);
    }, [data, fullscreen]);

    const chartData = useMemo(
        () => (data?.hourly ?? []).map((row) => ({ ...row, hour: `${row.bucket.slice(11, 13)}h` })),
        [data]
    );

    if (denied) {
        return (
            <div className="vl-root vl-denied" ref={rootRef}>
                <style>{VL_CSS}</style>
                <p>Sua sessão expirou ou este usuário não tem acesso ao painel. Entre de novo para continuar.</p>
            </div>
        );
    }

    const machines = (data?.sales_total.count ?? 0) + (payload?.offline_sales ?? 0);
    const revenue = data?.sales_total.revenue ?? 0;
    const stretch = Math.max(goals.stretch, goals.machines, 1);
    const machineFill = Math.min(100, (machines / stretch) * 100);
    const goalMark = Math.min(100, (goals.machines / stretch) * 100);
    const revenueFill = Math.min(100, goals.revenue > 0 ? (revenue / goals.revenue) * 100 : 0);
    const todayCount = data?.sales_total.today_count ?? 0;
    const funnel = data?.funnel;
    const funnelTop = Math.max(funnel?.visitors ?? 0, 1);
    const salesInRange = data?.sales.count ?? 0;
    const accessories = (data?.sales.by_item ?? []).filter((item) => item.id !== MACHINE_ITEM);
    const topSource = Math.max(...(data?.sources ?? []).map((row) => row.visitors), 1);
    const topClick = Math.max(...clickRows.map((row) => row[1]), 1);
    const deviceTotal = (data?.visits.mobile ?? 0) + (data?.visits.desktop ?? 0);

    return (
        <div className={`vl-root ${fullscreen ? 'vl-full' : ''}`} ref={rootRef}>
            <style>{VL_CSS}</style>

            <header className="vl-head">
                <div className="vl-brand">
                    <span className="vl-logo">W-TECH</span>
                    <div>
                        <h1>Vendas ao vivo</h1>
                        <p>Vacuum Pump Standard · Black Friday</p>
                    </div>
                </div>
                <div className={`vl-live ${stale ? 'vl-live-off' : ''}`} role="status">
                    <Radio size={16} aria-hidden />
                    {!payload ? 'Conectando...' : stale ? `Sem conexão há ${Math.round((clock - lastOk) / 1000)} s` : 'Ao vivo'}
                </div>
                <div className="vl-actions">
                    <div className="vl-seg" role="group" aria-label="Período">
                        <button type="button" aria-pressed={range === 'campaign'} onClick={() => setRange('campaign')}>Campanha</button>
                        <button type="button" aria-pressed={range === 'today'} onClick={() => setRange('today')}>Hoje</button>
                    </div>
                    <button
                        type="button"
                        className={`vl-icon ${soundWanted && !soundReady ? 'vl-attention' : ''}`}
                        onClick={() => {
                            // O clique que liga o som não pode também desligá-lo.
                            if (soundReady || !soundWanted) setSoundWanted(!soundWanted);
                        }}
                        aria-pressed={soundWanted}
                    >
                        {soundWanted ? <Volume2 size={18} aria-hidden /> : <VolumeX size={18} aria-hidden />}
                        {soundWanted && !soundReady ? 'Ativar som' : soundWanted ? 'Som ligado' : 'Sem som'}
                    </button>
                    {onOpenOrders && !fullscreen && <button type="button" className="vl-icon" onClick={onOpenOrders}><ReceiptText size={18} aria-hidden /> Pedidos e lançamento</button>}
                    <button type="button" className="vl-icon" onClick={testAlert}><PartyPopper size={18} aria-hidden /> Testar alerta</button>
                    {payload?.can_manage && <button type="button" className="vl-icon" onClick={() => setGoalsOpen(true)}><Settings2 size={18} aria-hidden /> Metas</button>}
                    <button type="button" className="vl-icon" onClick={toggleFullscreen}>
                        {fullscreen ? <Minimize size={18} aria-hidden /> : <Maximize size={18} aria-hidden />} {fullscreen ? 'Sair' : 'Tela cheia'}
                    </button>
                </div>
            </header>

            {!fullscreen && payload?.me && <SellerLink me={payload.me} offer={payload.offer} />}

            <main className="vl-grid">
                <section className="vl-card vl-goal" aria-label="Máquinas vendidas">
                    <h2 className="vl-label"><Target size={16} aria-hidden /> Máquinas vendidas</h2>
                    <div className="vl-goal-count">
                        <b><Count value={machines} /></b>
                        <span>de {int(goals.machines)}</span>
                        <em>{percent(machines, goals.machines, 0)} da meta</em>
                    </div>
                    <div className="vl-track" role="progressbar" aria-valuenow={machines} aria-valuemin={0} aria-valuemax={stretch}>
                        <span className="vl-fill" style={{ width: `${machineFill}%` }} />
                        <i className="vl-mark" style={{ left: `${goalMark}%` }}><small>Meta {int(goals.machines)}</small></i>
                        <i className="vl-mark vl-mark-end"><small>Máx. {int(stretch)}</small></i>
                    </div>
                </section>

                <section className="vl-card vl-money" aria-label="Faturamento">
                    <h2 className="vl-label">Faturamento</h2>
                    <p className="vl-big vl-green"><Count value={revenue} format={(value) => brl(value)} /></p>
                    <div className="vl-mini-track"><span style={{ width: `${revenueFill}%` }} /></div>
                    <p className="vl-sub">Meta de {brl(goals.revenue)} · Ticket médio {brl((data?.sales_total.count ?? 0) > 0 ? revenue / (data?.sales_total.count ?? 1) : 0)}</p>
                </section>

                <section className="vl-card vl-today" aria-label="Vendas de hoje">
                    <h2 className="vl-label">Hoje</h2>
                    <p className="vl-big"><Count value={todayCount} /> <small>de {int(goals.daily)}</small></p>
                    <p className="vl-sub">{brl(data?.sales_total.today_revenue ?? 0)} em vendas · {int(data?.visits.today_visitors ?? 0)} visitantes</p>
                </section>

                <section className="vl-card vl-clock" aria-label={beforeStart ? 'Tempo até a abertura' : 'Tempo até o fim da pré-venda'}>
                    <h2 className="vl-label">{beforeStart ? 'Abre em' : 'Termina em'}</h2>
                    <p className="vl-timer">
                        {countdown.days > 0 && <span><b>{countdown.days}</b><small>d</small></span>}
                        <span><b>{pad(countdown.hours)}</b><small>h</small></span>
                        <span><b>{pad(countdown.minutes)}</b><small>m</small></span>
                        <span><b>{pad(countdown.seconds)}</b><small>s</small></span>
                    </p>
                    <p className="vl-sub">{int(payload?.offer.remaining ?? 0)} máquinas disponíveis na pré-venda</p>
                </section>

                <ul className="vl-kpis" aria-label="Números do período">
                    <li className="vl-kpi vl-kpi-live"><span>Na página agora</span><b><i className="vl-dot" aria-hidden /><Count value={data?.visits.active_5m ?? 0} /></b><small>ativos nos últimos 5 min</small></li>
                    <li className="vl-kpi"><span>Visitantes</span><b><Count value={data?.visits.visitors ?? 0} /></b><small>{int(data?.visits.views ?? 0)} visualizações</small></li>
                    <li className="vl-kpi"><span>Cliques em comprar</span><b><Count value={data?.clicks.buy ?? 0} /></b><small>{int(data?.clicks.total ?? 0)} cliques no total</small></li>
                    <li className="vl-kpi"><span>Carrinhos iniciados</span><b><Count value={funnel?.checkout ?? 0} /></b><small>deixaram nome e WhatsApp</small></li>
                    <li className="vl-kpi"><span>Vendas no período</span><b><Count value={salesInRange} /></b><small>{int(salesInRange - (data?.sales.with_seller ?? 0))} direto no site · {int(data?.sales.with_seller ?? 0)} com vendedor</small></li>
                    <li className="vl-kpi"><span>Conversão</span><b>{percent(funnel?.paid ?? 0, funnel?.visitors ?? 0, 2)}</b><small>de visitante para venda</small></li>
                </ul>

                <section className="vl-card vl-chart" aria-label="Visitantes e vendas por hora">
                    <h2 className="vl-label">Últimas 24 horas</h2>
                    <div className="vl-legend"><span className="vl-key-red">Visitantes</span><span className="vl-key-green">Vendas</span></div>
                    <div className="vl-chart-box">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={chartData} margin={{ top: 8, right: 6, left: -18, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="vl-area" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#ff1a10" stopOpacity={0.55} />
                                        <stop offset="100%" stopColor="#ff1a10" stopOpacity={0.02} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid stroke="#25252d" vertical={false} />
                                <XAxis dataKey="hour" stroke="#7d7d89" tickLine={false} axisLine={false} interval={2} fontSize={13} />
                                <YAxis yAxisId="visits" stroke="#7d7d89" tickLine={false} axisLine={false} allowDecimals={false} fontSize={13} />
                                <YAxis yAxisId="sales" orientation="right" hide allowDecimals={false} domain={[0, (max: number) => Math.max(max * 3, 3)]} />
                                <Tooltip
                                    contentStyle={{ background: '#101014', border: '1px solid #33333d', borderRadius: 10, color: '#fff' }}
                                    labelStyle={{ color: '#b9b9c3' }}
                                    formatter={(value, name) => [value as number, name === 'visitors' ? 'Visitantes' : 'Vendas']}
                                />
                                <Area yAxisId="visits" type="monotone" dataKey="visitors" stroke="#ff1a10" strokeWidth={2.5} fill="url(#vl-area)" isAnimationActive={false} />
                                <Bar yAxisId="sales" dataKey="sales" fill="#25d07d" radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </section>

                <section className="vl-card vl-funnel" aria-label="Funil de vendas">
                    <h2 className="vl-label">Funil</h2>
                    <ul className="vl-rows">
                        <BarRow label="Visitantes" value={int(funnel?.visitors ?? 0)} share={100} tone="mute" />
                        <BarRow label="Clicaram em comprar" value={`${int(funnel?.buy_click ?? 0)} · ${percent(funnel?.buy_click ?? 0, funnel?.visitors ?? 0)}`} share={((funnel?.buy_click ?? 0) / funnelTop) * 100} tone="amber" />
                        <BarRow label="Iniciaram o carrinho" value={`${int(funnel?.checkout ?? 0)} · ${percent(funnel?.checkout ?? 0, funnel?.visitors ?? 0)}`} share={((funnel?.checkout ?? 0) / funnelTop) * 100} tone="amber" />
                        <BarRow label="Chegaram ao pagamento" value={`${int(funnel?.payment ?? 0)} · ${percent(funnel?.payment ?? 0, funnel?.visitors ?? 0)}`} share={((funnel?.payment ?? 0) / funnelTop) * 100} />
                        <BarRow label="Compraram" value={`${int(funnel?.paid ?? 0)} · ${percent(funnel?.paid ?? 0, funnel?.visitors ?? 0)}`} share={((funnel?.paid ?? 0) / funnelTop) * 100} tone="green" />
                    </ul>
                </section>

                <section className="vl-card vl-feed" aria-label="Últimas vendas">
                    <h2 className="vl-label">Últimas vendas</h2>
                    {data?.recent.length ? (
                        <ol className="vl-sales">
                            {data.recent.slice(0, fullscreen ? 5 : 7).map((sale) => (
                                <li key={sale.id} className="vl-sale">
                                    <span className="vl-sale-n">{sale.position}</span>
                                    <div className="vl-sale-who">
                                        <b>{sale.first_name}{sale.city ? ` · ${sale.city}${sale.state ? `/${sale.state}` : ''}` : ''}</b>
                                        <small>
                                            {new Date(sale.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}
                                            {sale.method ? ` · ${sale.method.replace('Mercado Pago - ', '')}` : ''}
                                            {sale.items.length > 1 ? ` · +${sale.items.length - 1} acessório${sale.items.length > 2 ? 's' : ''}` : ''}
                                            {` · ${sale.seller ?? 'Direto no site'}`}
                                        </small>
                                    </div>
                                    <b className="vl-sale-value">{brl(sale.total)}</b>
                                </li>
                            ))}
                        </ol>
                    ) : (
                        <p className="vl-empty">A primeira venda aparece aqui, com som e comemoração.</p>
                    )}
                </section>

                <section className="vl-card" aria-label="Acessórios vendidos">
                    <h2 className="vl-label">Kits e acessórios</h2>
                    <ul className="vl-tiles">
                        {accessories.length ? accessories.map((item) => (
                            <li key={item.id}><b>{int(item.units)}</b><span>{item.name}</span><small>{brl(item.revenue)}</small></li>
                        )) : (
                            <>
                                <li><b>0</b><span>Câmara Borbulhadora</span><small>{brl(0)}</small></li>
                                <li><b>0</b><span>Kit Adaptador</span><small>{brl(0)}</small></li>
                            </>
                        )}
                    </ul>
                    <p className="vl-sub">{percent(data?.sales.with_accessory ?? 0, salesInRange, 0)} das vendas levaram acessório</p>
                </section>

                <section className="vl-card" aria-label="Cliques por botão">
                    <h2 className="vl-label">Cliques</h2>
                    <ul className="vl-rows vl-rows-tight">
                        {clickRows.length ? clickRows.map(([label, clicks]) => (
                            <BarRow key={label} label={label} value={int(clicks)} share={(clicks / topClick) * 100} tone={/^Comprar|Compre junto/.test(label) ? 'red' : 'mute'} />
                        )) : <li className="vl-empty">Nenhum clique no período.</li>}
                    </ul>
                </section>

                <section className="vl-card" aria-label="Origem dos visitantes">
                    <h2 className="vl-label">Origem</h2>
                    <ul className="vl-rows vl-rows-tight">
                        {(data?.sources ?? []).slice(0, 5).map((row) => (
                            <BarRow key={row.source} label={sourceLabel(row.source)} value={int(row.visitors)} share={(row.visitors / topSource) * 100} tone="mute" />
                        ))}
                        {!data?.sources.length && <li className="vl-empty">Nenhuma visita no período.</li>}
                    </ul>
                    <p className="vl-sub">Celular {percent(data?.visits.mobile ?? 0, deviceTotal, 0)} · Computador {percent(data?.visits.desktop ?? 0, deviceTotal, 0)}</p>
                </section>

                <section className="vl-card vl-open" aria-label="Pagamentos e pessoas para chamar">
                    <h2 className="vl-label">Para o time agir</h2>
                    <ul className="vl-open-list">
                        <li><b>{int(data?.open.pix_pending ?? 0)}</b><span>Pix aguardando<small>{brl(data?.open.pix_pending_value ?? 0)}</small></span></li>
                        <li><b>{int(data?.open.rejected ?? 0)}</b><span>Cartão recusado</span></li>
                        <li><b>{int(data?.open.in_cart ?? 0)}</b><span>Pararam no carrinho</span></li>
                        <li><b>{int((data?.open.contact ?? 0) + (data?.open.waitlist ?? 0))}</b><span>Pediram contato ou aviso</span></li>
                    </ul>
                    {(data?.sales.by_method.length ?? 0) > 0 && (
                        <p className="vl-sub">
                            {data?.sales.by_method.map((row) => `${row.method.replace('Mercado Pago - ', '')}: ${int(row.sales)}`).join(' · ')}
                        </p>
                    )}
                </section>
            </main>

            {soundWanted && !soundReady && payload && (
                <button type="button" className="vl-sound-bar">
                    <Volume2 size={18} aria-hidden /> Clique aqui para ligar o som das vendas. O navegador só libera depois de um clique.
                </button>
            )}

            {goalsOpen && payload && (
                <GoalsModal
                    goals={goals}
                    onClose={() => setGoalsOpen(false)}
                    onSaved={() => {
                        setGoalsOpen(false);
                        void load();
                    }}
                />
            )}

            {celebration && <SaleOverlay celebration={celebration} goals={goals} onClose={showNext} />}
        </div>
    );
};

export default VacuumLivePanel;
