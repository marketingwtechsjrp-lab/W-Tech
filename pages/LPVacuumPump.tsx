import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Lock, MessageCircle, Plus, ShieldCheck, Wrench, X } from 'lucide-react';
import SEO from '../components/SEO';
import VacuumCheckout from '../components/vacuum-pump/VacuumCheckout';
import { VP_CSS } from '../components/vacuum-pump/vacuumStyles';
import {
    dateLabel,
    maskPhone,
    weekdayLabel,
    timeParts,
    useVacuumOffer,
    useVacuumPageChrome,
    vacuumApi,
    whatsappLink,
    type VacuumOffer,
} from '../components/vacuum-pump/vacuumApi';
import { pushLead } from '../lib/dataLayer';
import { getLeadTrackingFields } from '../lib/tracking';
import { PUBLIC_BASE_URL } from '../lib/publicUrl';
import { VACUUM_ITEM_NAME, brlParts, formatBRL, normalizeBrPhone, vacuumEndTimeLabel, vacuumUrgencyLabel } from '../lib/vacuumOffer';

const EXIT_KEY = 'vp_exit_shown';

function ctaLabel(offer: VacuumOffer): string {
    if (offer.phase === 'soon') return 'Me avise quando abrir';
    const parcela = formatBRL(offer.installment_value).replace(',00', '');
    return offer.phase === 'presale' ? `Garantir por ${offer.installments}x de ${parcela}` : `Comprar por ${offer.installments}x de ${parcela}`;
}

const Countdown: React.FC<{ target: string; now: number }> = ({ target, now }) => {
    const { days, hours, minutes, seconds } = timeParts(target, now);
    const parts: [number, string][] = [[days, 'dias'], [hours, 'horas'], [minutes, 'min'], [seconds, 'seg']];
    return (
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2" role="timer" aria-label={`${days} dias, ${hours} horas e ${minutes} minutos`}>
            {parts.map(([value, label]) => (
                <div key={label} className="vp-plate vp-plate-alt [--vp-cut:8px] py-2 text-center">
                    <div className="vp-display vp-num text-4xl sm:text-5xl">{String(value).padStart(2, '0')}</div>
                    <div className="vp-label !text-[.68rem] vp-muted">{label}</div>
                </div>
            ))}
        </div>
    );
};

/** O mesmo visor MAX/MIN do painel da máquina, mostrando o lote real. */
const LotTube: React.FC<{ remaining: number; total: number }> = ({ remaining, total }) => {
    const level = total > 0 ? Math.min(100, (remaining / total) * 100) : 0;
    return (
        <div className="flex items-stretch gap-3" role="img" aria-label={`Restam ${remaining} de ${total} máquinas no lote`}>
            <div className="vp-tube h-44 sm:h-56">
                <div className="vp-tube-fill" style={{ height: `${level}%` }} />
            </div>
            <div className="flex flex-col justify-between py-1">
                <span className="vp-label !text-[.7rem] vp-muted">Max</span>
                <div>
                    <div className="vp-display vp-num text-6xl">{remaining}</div>
                    <div className="text-sm font-semibold leading-tight">de {total} máquinas<br />neste lote</div>
                </div>
                <span className="vp-label !text-[.7rem] vp-muted">Min</span>
            </div>
        </div>
    );
};

/** Ilustração até chegar a foto real: não vamos publicar imagem fingindo ser o produto. */
const BubbleChamber: React.FC = () => (
    <div className="relative mx-auto h-56 w-40" role="img" aria-label="Ilustração da câmara borbulhadora">
        <svg viewBox="0 0 160 224" className="absolute inset-0 h-full w-full" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
            <rect x="38" y="4" width="84" height="16" />
            <path d="M46 20h68v188a12 12 0 0 1-12 12H58a12 12 0 0 1-12-12z" />
            <path d="M46 92h68" stroke="#e60000" />
            <path d="M80 4V-8M12 44h34M12 44V20" stroke="#e60000" />
            <path d="M120 200h26M120 180h14" opacity=".45" />
        </svg>
        {[{ l: '38%', s: 12, d: '0s' }, { l: '52%', s: 8, d: '.8s' }, { l: '60%', s: 14, d: '1.6s' }, { l: '44%', s: 7, d: '2.2s' }, { l: '56%', s: 10, d: '2.9s' }].map((b) => (
            <span key={b.d} className="vp-bubble" style={{ left: b.l, width: b.s, height: b.s, animationDelay: b.d }} />
        ))}
    </div>
);

const LeadForm: React.FC<{ offer: VacuumOffer; onDone?: () => void; compact?: boolean }> = ({ offer, onDone, compact }) => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
    const [error, setError] = useState<string | null>(null);
    const source = offer.phase === 'soon' ? 'waitlist' : 'contact';

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (name.trim().length < 2) return setError('Informe seu nome.');
        if (!normalizeBrPhone(phone)) return setError('Informe o WhatsApp com DDD.');
        setState('sending');
        setError(null);
        const result = await vacuumApi.lead({ name, phone, source, tracking: getLeadTrackingFields() as Record<string, string> }).catch(() => null);
        if (!result?.checkout_id) {
            setState('idle');
            return setError(result?.error || 'Não foi possível enviar. Tente de novo.');
        }
        pushLead({ funnel: 'vacuum_pump_bf', item_name: VACUUM_ITEM_NAME, method: 'form', lead_id: result.lead_id, user: { name, phone } });
        setState('done');
        onDone?.();
    };

    if (state === 'done') {
        return (
            <p role="status" className="flex items-start gap-2 font-semibold">
                <Check className="mt-0.5 shrink-0" size={20} aria-hidden />
                {source === 'waitlist' ? 'Pronto. Avisamos você no WhatsApp quando a pré-venda abrir.' : 'Pronto. Um especialista W-Tech vai te chamar no WhatsApp.'}
            </p>
        );
    }

    return (
        <form onSubmit={submit} noValidate className={compact ? 'space-y-3' : 'grid gap-3 sm:grid-cols-[1fr_1fr_auto]'}>
            <label className="block">
                <span className="vp-field-label">Nome</span>
                <input className="vp-input" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="block">
                <span className="vp-field-label">WhatsApp com DDD</span>
                <input className="vp-input vp-num" inputMode="tel" autoComplete="tel-national" placeholder="(11) 99999-9999" value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} />
            </label>
            <button type="submit" className={`vp-btn self-end ${compact ? 'w-full' : ''}`} disabled={state === 'sending'} data-track="vacuum_lead_form" data-track-category="Vacuum Pump">
                {state === 'sending' ? 'Enviando…' : source === 'waitlist' ? 'Me avise' : 'Quero que me chamem'}
            </button>
            {error && <p role="alert" className="text-sm vp-red sm:col-span-3">{error}</p>}
            <p className="text-xs vp-muted sm:col-span-3">Só usamos seu contato para falar sobre esta oferta. <a className="underline" href="/privacidade" target="_blank" rel="noreferrer">Privacidade</a>.</p>
        </form>
    );
};

const FEATURES = [
    { n: 1, top: '18.7%', left: '79%', title: 'Manovacuômetro no painel', text: 'Leitura em mmHg e inHg na frente da máquina. Você e o cliente veem o vácuo acontecer.' },
    { n: 2, top: '50%', left: '79%', title: 'Seletor pressão e vácuo', text: 'Um comando só para trocar a função, com ajuste de estabilização logo acima.' },
    { n: 3, top: '57%', left: '12%', title: 'Visor de nível MAX/MIN', text: 'Acompanhe o nível pelo visor, sem abrir o gabinete.' },
];

const STEPS = [
    { title: 'Monte o amortecedor', text: 'Amortecedor montado, ainda sem óleo.' },
    { title: 'Conecte na máquina', text: 'Use o bico ou adaptador certo para aquele amortecedor.' },
    { title: 'Puxe o vácuo', text: 'Acompanhe no manômetro. O ar sai de dentro do conjunto.' },
    { title: 'Óleo sem bolha', text: 'O óleo entra sem ar e o amortecedor segue para o teste.' },
];

const LPVacuumPump: React.FC = () => {
    const { offer, now, refresh } = useVacuumOffer();
    const [checkoutOpen, setCheckoutOpen] = useState(false);
    const [exitOpen, setExitOpen] = useState(false);
    const [servicePrice, setServicePrice] = useState(350);
    const [showSticky, setShowSticky] = useState(false);
    const heroCta = useRef<HTMLDivElement>(null);
    const formRef = useRef<HTMLElement>(null);
    const checkoutOpenRef = useRef(false);
    checkoutOpenRef.current = checkoutOpen;

    const parcela = brlParts(offer.installment_value);
    const presale = offer.phase === 'presale';
    const soon = offer.phase === 'soon';
    const discounted = presale || soon;
    const timerTarget = soon ? offer.starts_at : offer.ends_at;
    const servicesToPay = Math.ceil(offer.installment_value / servicePrice);
    const parcelaGap = offer.regular_installment_value - offer.installment_value;

    useVacuumPageChrome();

    useEffect(() => {
        const node = heroCta.current;
        if (!node || typeof IntersectionObserver === 'undefined') return;
        const observer = new IntersectionObserver(([entry]) => setShowSticky(!entry.isIntersecting && entry.boundingClientRect.top < 0));
        observer.observe(node);
        return () => observer.disconnect();
    }, []);

    // Saída no desktop: última chance de pegar o WhatsApp de quem não vai comprar agora.
    useEffect(() => {
        const onLeave = (event: MouseEvent) => {
            if (event.clientY > 0 || checkoutOpenRef.current) return;
            try {
                if (sessionStorage.getItem(EXIT_KEY)) return;
                sessionStorage.setItem(EXIT_KEY, '1');
            } catch {
                /* sem storage: pode reaparecer, sem problema */
            }
            setExitOpen(true);
        };
        document.documentElement.addEventListener('mouseleave', onLeave);
        return () => document.documentElement.removeEventListener('mouseleave', onLeave);
    }, []);

    const openCheckout = useCallback(() => {
        if (soon) {
            formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }
        setExitOpen(false);
        setCheckoutOpen(true);
    }, [soon]);

    const statusBar = soon
        ? `A pré-venda abre em ${dateLabel(offer.starts_at)}`
        : presale
            ? vacuumUrgencyLabel(offer.ends_at, now)
            : offer.end_reason === 'sold_out' ? 'Lote da pré-venda esgotado' : 'Pré-venda encerrada';

    const parts = timeParts(timerTarget, now);

    return (
        <div className="vp-root min-h-screen">
            <style>{VP_CSS}</style>
            <SEO
                title={discounted ? `Vacuum Pump W-Tech: ${offer.installments}x de ${formatBRL(offer.installment_value)} sem juros` : 'Vacuum Pump Standard W-Tech'}
                description={`Máquina de vácuo W-Tech para amortecedores. Black Friday: de ${formatBRL(offer.regular_price)} por ${formatBRL(offer.price)} em ${offer.installments}x sem juros, só na pré-venda de 7 dias.`}
                image={`${PUBLIC_BASE_URL}/og/maquina-de-vacuo.jpg`}
                url={`${PUBLIC_BASE_URL}/maquina-de-vacuo`}
                type="product"
                noindex
            />

            {/* Barra de urgência */}
            <div className="sticky top-0 z-40 border-b border-white/15 bg-black/95 backdrop-blur">
                <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-3 px-4 py-2 text-sm">
                    <span className="vp-label !text-[.74rem] truncate"><span className="vp-red">●</span> {statusBar}</span>
                    {!(offer.phase === 'regular') && (
                        <span className="vp-display vp-num shrink-0 text-xl !leading-none" role="timer">
                            {parts.days > 0 && `${parts.days}d `}{String(parts.hours).padStart(2, '0')}:{String(parts.minutes).padStart(2, '0')}:{String(parts.seconds).padStart(2, '0')}
                        </span>
                    )}
                </div>
            </div>

            <div className="vp-ticker py-1.5" aria-hidden>
                <div className="vp-ticker-track vp-display text-lg tracking-wide">
                    {Array.from({ length: 2 }).map((_, group) => (
                        <span key={group} className="inline-flex">
                            {Array.from({ length: 8 }).map((__, i) => (
                                <span key={i} className="px-5">{discounted ? 'Black Friday W-Tech' : 'Vacuum Pump Standard'} <span className="px-3 opacity-60">///</span> {offer.installments}x sem juros <span className="px-3 opacity-60">///</span> {discounted ? 'Lançamento e pré-venda' : 'Fabricação W-Tech'} <span className="px-3 opacity-60">///</span></span>
                            ))}
                        </span>
                    ))}
                </div>
            </div>

            {/* Hero */}
            <header className="vp-grid-bg relative overflow-hidden">
                <div className="mx-auto grid max-w-[1180px] gap-8 px-4 pb-10 pt-8 lg:grid-cols-[1.08fr_.92fr] lg:gap-6 lg:pb-16 lg:pt-12">
                    <div>
                        <div className="mb-4 flex flex-wrap items-center gap-2">
                            {discounted && <span className="vp-display bg-[var(--vp-red)] px-3 py-1 text-2xl">Black Friday</span>}
                            <span className="vp-label border border-white/30 px-3 py-[.42rem]">{discounted ? 'Lançamento e pré-venda' : 'Lançamento W-Tech'}</span>
                        </div>
                        <h1 className="vp-display text-[clamp(3.6rem,10.5vw,7rem)]">
                            Vacuum Pump <span className="vp-red">Standard</span>
                        </h1>
                        <p className="mt-3 max-w-xl text-lg vp-muted">A máquina de vácuo W-Tech. O ar sai do amortecedor antes do óleo entrar, e o seu cliente vê isso acontecer.</p>

                        <div className="mt-6">
                            <div className="vp-display text-[clamp(2rem,5vw,2.8rem)]">{offer.installments}x de</div>
                            <div className="flex items-start gap-1 vp-display vp-num">
                                <span className="mt-2 text-[clamp(2rem,5vw,3rem)]">R$</span>
                                <span className="text-[clamp(7.5rem,23vw,12.5rem)] !leading-[.82]">{parcela.integer}</span>
                                <span className="mt-2 text-[clamp(2rem,5vw,3rem)]">,{parcela.cents}</span>
                            </div>
                            <div className="vp-display mt-2 inline-block bg-white px-3 py-1 text-3xl text-black">Sem juros</div>
                            <p className="mt-3 text-base vp-num">
                                {offer.compare_at
                                    ? <>De <s className="vp-muted">{formatBRL(offer.compare_at)}</s> por <b>{formatBRL(offer.price)}</b> no cartão ou no Pix.</>
                                    : <>Total de <b>{formatBRL(offer.price)}</b> no cartão ou no Pix.</>}
                            </p>
                        </div>

                        <div ref={heroCta} className="mt-5">
                            <button type="button" className="vp-btn w-full sm:w-auto" onClick={openCheckout} data-track="vacuum_cta_hero" data-track-category="Vacuum Pump">{ctaLabel(offer)}</button>
                            <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm vp-muted">
                                <span className="inline-flex items-center gap-1.5"><Lock size={15} aria-hidden /> Pagamento pelo Mercado Pago</span>
                                <span className="inline-flex items-center gap-1.5"><ShieldCheck size={15} aria-hidden /> Garantia de {offer.warranty_months} meses</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-5">
                        <div className="relative mx-auto w-full max-w-[520px]">
                            <div aria-hidden className="absolute inset-[6%] rounded-full bg-[var(--vp-red)] opacity-25 blur-[80px]" />
                            <img
                                src="/images/vacuum-pump/machine.webp"
                                srcSet="/images/vacuum-pump/machine-sm.webp 620w, /images/vacuum-pump/machine.webp 1100w"
                                sizes="(min-width: 1024px) 520px, 92vw"
                                width={1100}
                                height={1187}
                                alt="Painel da Vacuum Pump Standard W-Tech com manovacuômetro, seletor de pressão e vácuo e visor de nível"
                                className="relative h-auto w-full drop-shadow-[0_30px_40px_rgba(0,0,0,.65)]"
                                fetchPriority="high"
                            />
                        </div>
                        <p className="text-center text-xs vp-muted">Imagem ilustrativa. Acessórios vendidos separadamente.</p>
                    </div>
                </div>

                {/* Prazo e lote */}
                {!(offer.phase === 'regular') && (
                    <div className="mx-auto max-w-[1180px] px-4 pb-12">
                        <div className="vp-plate p-4 sm:p-6">
                            <div className="grid items-center gap-6 md:grid-cols-[1fr_auto]">
                                <div>
                                    <p className="vp-display mb-3 text-3xl sm:text-4xl">
                                        {soon ? 'A pré-venda abre em' : <>Esse preço acaba em</>}
                                    </p>
                                    <Countdown target={timerTarget} now={now} />
                                    <p className="mt-3 text-sm vp-muted vp-num">
                                        {soon
                                            ? `Abre em ${dateLabel(offer.starts_at)} e fica aberta até ${dateLabel(offer.ends_at)}, às ${vacuumEndTimeLabel(offer.ends_at)}.`
                                            : `Zerou, o preço sobe sozinho para ${offer.installments}x de ${formatBRL(offer.regular_installment_value)}.`}
                                    </p>
                                </div>
                                <LotTube remaining={offer.remaining} total={offer.lot_size} />
                            </div>
                        </div>
                    </div>
                )}
            </header>

            {/* O que é esta pré-venda */}
            <section className="border-y border-white/10 bg-[var(--vp-plate)] px-4 py-14 lg:py-20">
                <div className="mx-auto max-w-[1180px]">
                    <p className="vp-label vp-red">Como funciona</p>
                    <h2 className="vp-display mt-2 max-w-3xl text-5xl sm:text-6xl">{discounted ? 'Quem compra nestes 7 dias paga menos. Depois, não.' : 'A pré-venda terminou. A máquina continua.'}</h2>
                    <p className="mt-4 max-w-2xl text-lg vp-muted">
                        {discounted
                            ? 'Esta é a pré-venda de lançamento da nossa máquina de vácuo. O cronômetro e o contador desta página são reais: o prazo é o da campanha, e o lote só desce quando alguém paga.'
                            : `Hoje a condição é ${offer.installments}x de ${formatBRL(offer.installment_value)}, sem juros, com entrega sob encomenda.`}
                    </p>
                    <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {(discounted
                            ? [
                                { k: '7 dias', t: `De ${dateLabel(offer.starts_at)} a ${dateLabel(offer.ends_at)}`, d: `De ${weekdayLabel(offer.starts_at)} a ${weekdayLabel(offer.ends_at)}. Termina às ${vacuumEndTimeLabel(offer.ends_at)} do último dia.` },
                                { k: `${offer.installments}x sem juros`, t: `${formatBRL(offer.installment_value)} por mês`, d: `De ${formatBRL(offer.regular_price)} por ${formatBRL(offer.price)}.` },
                                { k: `${offer.lot_size} máquinas`, t: 'Lote da pré-venda', d: 'Acabou o lote, a pré-venda encerra antes do prazo.' },
                                { k: 'Entrega', t: offer.delivery_text, d: 'Produção feita para quem comprou neste lote.' },
                            ]
                            : [
                                { k: `${offer.installments}x sem juros`, t: `${formatBRL(offer.installment_value)} por mês`, d: `Total de ${formatBRL(offer.price)}.` },
                                { k: 'Entrega', t: offer.delivery_text, d: 'Produzida para o seu pedido.' },
                                { k: 'Garantia', t: `${offer.warranty_months} meses`, d: 'Direto com o fabricante.' },
                                { k: 'Suporte', t: 'Técnico W-Tech', d: 'Dúvida de uso? Chama a gente no WhatsApp.' },
                            ]
                        ).map((rule, i) => (
                            <div key={rule.k} className="vp-plate vp-plate-alt p-5">
                                <div className="vp-label vp-muted vp-num">0{i + 1}</div>
                                <div className="vp-display mt-3 text-4xl">{rule.k}</div>
                                <div className="mt-2 font-semibold">{rule.t}</div>
                                <p className="mt-1 text-sm vp-muted">{rule.d}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* VSL */}
            {offer.video_url && (
                <section className="px-4 py-14 lg:py-20">
                    <div className="mx-auto max-w-[960px]">
                        <p className="vp-label vp-red">Veja funcionando</p>
                        <h2 className="vp-display mt-2 text-5xl">A máquina em ação</h2>
                        <div className="vp-plate mt-6 aspect-video p-1">
                            <iframe className="h-full w-full" src={offer.video_url} title="Vacuum Pump Standard em funcionamento" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                        </div>
                    </div>
                </section>
            )}

            {/* A máquina */}
            <section className="px-4 py-14 lg:py-20">
                <div className="mx-auto grid max-w-[1180px] items-center gap-10 lg:grid-cols-2">
                    <div className="relative mx-auto w-full max-w-[520px]">
                        <img src="/images/vacuum-pump/machine-sm.webp" width={620} height={669} loading="lazy" alt="Vacuum Pump Standard com os comandos numerados" className="h-auto w-full" />
                        {FEATURES.map((feature) => (
                            <span key={feature.n} className="vp-marker" style={{ top: feature.top, left: feature.left }} aria-hidden>{feature.n}</span>
                        ))}
                    </div>
                    <div>
                        <p className="vp-label vp-red">O que você vê no painel</p>
                        <h2 className="vp-display mt-2 text-5xl sm:text-6xl">Tudo na frente. Nada escondido.</h2>
                        <ol className="mt-6 space-y-5">
                            {FEATURES.map((feature) => (
                                <li key={feature.n} className="flex gap-4">
                                    <span className="vp-display grid h-10 w-10 shrink-0 place-items-center bg-[var(--vp-red)] text-2xl">{feature.n}</span>
                                    <div>
                                        <h3 className="text-lg font-bold">{feature.title}</h3>
                                        <p className="vp-muted">{feature.text}</p>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </div>
                </div>
            </section>

            {/* Passo a passo */}
            <section className="vp-grid-bg border-y border-white/10 px-4 py-14 lg:py-20">
                <div className="mx-auto max-w-[1180px]">
                    <p className="vp-label vp-red">Na sua bancada</p>
                    <h2 className="vp-display mt-2 max-w-3xl text-5xl sm:text-6xl">Amortecedor sem ar. E o cliente vendo.</h2>
                    <ol className="mt-8 grid gap-6 border-t border-white/20 pt-6 sm:grid-cols-2 lg:grid-cols-4">
                        {STEPS.map((step, i) => (
                            <li key={step.title}>
                                <span className="vp-display vp-red vp-num text-6xl">{i + 1}</span>
                                <h3 className="mt-2 text-lg font-bold">{step.title}</h3>
                                <p className="vp-muted">{step.text}</p>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            {/* A parcela */}
            <section className="px-4 py-14 lg:py-20">
                <div className="mx-auto grid max-w-[1180px] items-center gap-10 lg:grid-cols-2">
                    <div>
                        <p className="vp-label vp-red">Faça a conta</p>
                        <h2 className="vp-display mt-2 text-5xl sm:text-6xl">Quantos serviços pagam a parcela?</h2>
                        <p className="mt-4 text-lg vp-muted">Ferramenta de ponta muda o que você pode cobrar. Quem vê o processo entende por que o seu serviço custa mais. Filma, posta, e a oficina passa a vender isso.</p>
                    </div>
                    <div className="vp-plate p-6">
                        <label className="block">
                            <span className="font-semibold">Quanto você cobra por serviço de amortecedor?</span>
                            <span className="vp-display vp-num mt-2 block text-5xl">{formatBRL(servicePrice).replace(',00', '')}</span>
                            <input type="range" className="vp-range mt-4" min={150} max={1000} step={10} value={servicePrice} onChange={(e) => setServicePrice(Number(e.target.value))} />
                        </label>
                        <div className="mt-6 border-t border-white/15 pt-5">
                            <div className="vp-display vp-num text-[5.5rem] vp-red">{servicesToPay}</div>
                            <p className="text-lg font-semibold">{servicesToPay === 1 ? 'serviço por mês paga' : 'serviços por mês pagam'} a parcela de {formatBRL(offer.installment_value)}.</p>
                            <p className="mt-2 text-xs vp-muted">Simulação com o valor que você escolheu. Não considera os custos da sua oficina.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* O que vem + acessórios */}
            <section className="border-t border-white/10 bg-[var(--vp-plate)] px-4 py-14 lg:py-20">
                <div className="mx-auto max-w-[1180px]">
                    <p className="vp-label vp-red">Na sua compra</p>
                    <h2 className="vp-display mt-2 text-5xl sm:text-6xl">Você não fica sozinho com a máquina.</h2>
                    <ul className="mt-8 grid gap-x-8 gap-y-4 sm:grid-cols-2">
                        {[
                            ['Vacuum Pump Standard', 'Fabricação W-Tech.'],
                            ['Vídeo de treinamento', 'Conexão dos bicos, montagem, teste e o ponto certo do vácuo.'],
                            ['Manual da máquina', 'Para consultar na bancada.'],
                            [`Garantia de ${offer.warranty_months} meses`, 'Direto com o fabricante.'],
                            ['Suporte técnico W-Tech', 'Dúvida de uso? Chama a gente no WhatsApp.'],
                        ].map(([title, text]) => (
                            <li key={title} className="flex gap-3">
                                <Check className="mt-1 shrink-0 vp-red" size={20} aria-hidden />
                                <div><b>{title}</b><p className="text-sm vp-muted">{text}</p></div>
                            </li>
                        ))}
                    </ul>

                    <h3 className="vp-display mt-14 text-4xl sm:text-5xl">Aproveite e leve junto</h3>
                    <p className="mt-2 vp-muted">Acessórios vendidos separadamente. Você escolhe no checkout e entra na mesma parcela.</p>
                    <div className="mt-6 grid gap-4 lg:grid-cols-2">
                        {offer.bumps.map((bump) => (
                            <article key={bump.id} className="vp-plate vp-plate-alt grid items-center gap-4 p-5 sm:grid-cols-[170px_1fr]">
                                {bump.image
                                    ? <img src={bump.image} alt={bump.name} width={800} height={530} loading="lazy" className="mx-auto h-auto w-full max-w-[220px]" />
                                    : <BubbleChamber />}
                                <div>
                                    <h4 className="text-xl font-bold">{bump.name}</h4>
                                    <p className="mt-1 text-sm vp-muted">{bump.tagline}</p>
                                    <p className="vp-display vp-num mt-3 text-3xl"><Plus className="-mt-1 mr-1 inline" size={22} aria-hidden />{formatBRL(bump.installment_value)} <span className="text-lg">na parcela</span></p>
                                    <p className="text-sm vp-muted vp-num">
                                        {bump.anchor ? <><s>{formatBRL(bump.anchor)}</s> por {formatBRL(bump.price)} comprando junto com a máquina</> : <>{formatBRL(bump.price)}</>}
                                    </p>
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            {/* Oferta final */}
            <section className="vp-grid-bg px-4 py-14 lg:py-20">
                <div className="mx-auto max-w-[900px] text-center">
                    {discounted ? (
                        <>
                            <h2 className="vp-display text-6xl sm:text-7xl">{formatBRL(parcelaGap).replace(',00', '')} a menos por parcela</h2>
                            <p className="mt-3 text-lg vp-muted">É a diferença entre comprar agora e depois da pré-venda.</p>
                            <div className="mt-8 grid gap-3 text-left sm:grid-cols-2">
                                <div className="vp-plate vp-plate-red p-6">
                                    <div className="vp-label vp-red">Na pré-venda</div>
                                    <div className="vp-display vp-num mt-2 text-6xl">{offer.installments}x {formatBRL(offer.installment_value).replace(',00', '')}</div>
                                    <div className="mt-1 vp-num">Total {formatBRL(offer.price)} · sem juros</div>
                                </div>
                                <div className="vp-plate p-6">
                                    <div className="vp-label vp-muted">Depois da pré-venda</div>
                                    <div className="vp-display vp-num mt-2 text-6xl vp-muted">{offer.installments}x {formatBRL(offer.regular_installment_value).replace(',00', '')}</div>
                                    <div className="mt-1 vp-muted vp-num">Total {formatBRL(offer.regular_price)} · sem juros</div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <h2 className="vp-display text-6xl sm:text-7xl">{offer.installments}x de {formatBRL(offer.installment_value).replace(',00', '')} sem juros</h2>
                    )}
                    <button type="button" className="vp-btn mt-8 w-full sm:w-auto" onClick={openCheckout} data-track="vacuum_cta_final" data-track-category="Vacuum Pump">{ctaLabel(offer)}</button>
                    <p className="mt-3 text-sm vp-muted">{offer.delivery_text}. {offer.shipping_note}</p>
                </div>
            </section>

            {/* Perguntas */}
            <section className="border-t border-white/10 bg-[var(--vp-plate)] px-4 py-14 lg:py-20">
                <div className="mx-auto max-w-[800px]">
                    <h2 className="vp-display text-5xl">Perguntas frequentes</h2>
                    <div className="mt-6 divide-y divide-white/15 border-y border-white/15">
                        {[
                            ['É mesmo 10x sem juros?', `Sim. No cartão de crédito, em até ${offer.installments}x de ${formatBRL(offer.installment_value)}, sem juros. O total é ${formatBRL(offer.price)}.`],
                            ['Posso pagar no Pix?', `Pode. No Pix o valor é ${formatBRL(offer.price)} à vista, e a confirmação sai na hora.`],
                            ['O cartão não tem limite para tudo. E agora?', 'Chame um vendedor no WhatsApp: ele divide sua compra em mais de um cartão, nas mesmas condições da pré-venda.'],
                            ['Quando recebo?', `${offer.delivery_text}. ${offer.shipping_note}`],
                            ['E se o prazo ou o lote acabar?', `A condição de pré-venda encerra e o preço vai para ${formatBRL(offer.regular_price)}, ainda em ${offer.installments}x sem juros (${formatBRL(offer.regular_installment_value)} por mês).`],
                            ['O que vem junto com a máquina?', `Manual, vídeo de treinamento, garantia de ${offer.warranty_months} meses e suporte técnico. A câmara borbulhadora e o kit adaptador são vendidos separadamente, e você pode incluir no checkout.`],
                            ['Posso desistir da compra?', 'Sim. Em compra pela internet, você tem até 7 dias depois de receber para desistir (art. 49 do Código de Defesa do Consumidor). Veja nossa política de cancelamento.'],
                        ].map(([question, answer]) => (
                            <details key={question} className="vp-faq group">
                                <summary className="flex items-center justify-between gap-4 py-4 text-lg font-semibold">
                                    {question}
                                    <ChevronDown className="vp-faq-icon shrink-0 group-open:rotate-180" size={22} aria-hidden />
                                </summary>
                                <p className="pb-4 vp-muted">{answer}</p>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            {/* Captura para o vendedor */}
            <section ref={formRef} className="px-4 py-14 lg:py-20">
                <div className="vp-plate mx-auto max-w-[900px] p-6 sm:p-8">
                    <h2 className="vp-display text-4xl sm:text-5xl">{soon ? 'Seja avisado quando abrir' : 'Ainda não vai fechar?'}</h2>
                    <p className="mb-5 mt-2 vp-muted">{soon ? 'Deixe seu WhatsApp. A pré-venda abre, a gente te chama.' : 'Deixe seu WhatsApp e um especialista W-Tech te chama para tirar as dúvidas.'}</p>
                    <LeadForm offer={offer} />
                    <a className="mt-5 inline-flex items-center gap-2 text-sm font-semibold underline" href={whatsappLink(offer.whatsapp, 'Oi! Tenho uma dúvida sobre a Vacuum Pump Standard da Black Friday.')} target="_blank" rel="noreferrer" data-track="vacuum_whatsapp" data-track-category="Vacuum Pump">
                        <MessageCircle size={17} aria-hidden /> Prefere chamar agora? Fale no WhatsApp
                    </a>
                </div>
            </section>

            <footer className={`border-t border-white/10 px-4 py-8 text-sm vp-muted ${showSticky ? 'pb-28 md:pb-8' : ''}`}>
                <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-4">
                    <div>
                        <p className="flex items-center gap-2 font-semibold text-white"><Wrench size={16} aria-hidden /> W-Tech Brasil</p>
                        {offer.legal_line && <p className="mt-1 text-xs">{offer.legal_line}</p>}
                        <p className="mt-1 text-xs">Imagens ilustrativas.{discounted && ` Condições válidas até ${dateLabel(offer.ends_at)} ou enquanto durar o lote da pré-venda.`}</p>
                    </div>
                    <nav className="flex gap-4" aria-label="Documentos">
                        <a className="underline" href="/termos" target="_blank" rel="noreferrer">Termos</a>
                        <a className="underline" href="/privacidade" target="_blank" rel="noreferrer">Privacidade</a>
                        <a className="underline" href="/cancelamento" target="_blank" rel="noreferrer">Cancelamento</a>
                    </nav>
                </div>
            </footer>

            {/* CTA fixo no celular */}
            {showSticky && !checkoutOpen && (
                <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/15 bg-black/95 p-3 backdrop-blur md:hidden">
                    <button type="button" className="vp-btn w-full" onClick={openCheckout} data-track="vacuum_cta_sticky" data-track-category="Vacuum Pump">{ctaLabel(offer)}</button>
                </div>
            )}

            {exitOpen && (
                <div className="fixed inset-0 z-[90] grid place-items-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-label="Deixe seu WhatsApp">
                    <div className="vp-plate relative w-full max-w-md p-6">
                        <button type="button" className="absolute right-3 top-3 grid h-10 w-10 place-items-center hover:bg-white/10" onClick={() => setExitOpen(false)} aria-label="Fechar"><X size={20} aria-hidden /></button>
                        <h2 className="vp-display pr-8 text-4xl">{soon ? 'Quer ser avisado?' : 'Antes de sair'}</h2>
                        <p className="mb-4 mt-2 text-sm vp-muted">
                            {presale ? `${vacuumUrgencyLabel(offer.ends_at, now)}: a parcela sobe de ${formatBRL(offer.installment_value)} para ${formatBRL(offer.regular_installment_value)}. Deixe seu WhatsApp e um especialista te chama.` : 'Deixe seu WhatsApp e a gente te chama.'}
                        </p>
                        <LeadForm offer={offer} compact onDone={() => window.setTimeout(() => setExitOpen(false), 2500)} />
                    </div>
                </div>
            )}

            {checkoutOpen && <VacuumCheckout offer={offer} now={now} onClose={() => setCheckoutOpen(false)} onOfferChanged={refresh} />}
        </div>
    );
};

export default LPVacuumPump;
