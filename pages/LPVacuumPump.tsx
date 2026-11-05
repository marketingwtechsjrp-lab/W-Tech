import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Check, ChevronDown, CreditCard, Lock, MessageCircle, Play, Plus, QrCode, RotateCcw, ShieldCheck, Truck, X, Zap } from 'lucide-react';
import SEO from '../components/SEO';
import VacuumCheckout from '../components/vacuum-pump/VacuumCheckout';
import VacuumExperience3D from '../components/vacuum-pump/VacuumExperience3D';
import { VacuumARButton } from '../components/vacuum-pump/VacuumARButton';
import VacuumVideo, { type VacuumVideoHandle } from '../components/vacuum-pump/VacuumVideo';
import { ComboImage, VACUUM_DETAILS, VACUUM_IMAGES, VACUUM_VIDEO } from '../components/vacuum-pump/vacuumMedia';
import { VP_CSS } from '../components/vacuum-pump/vacuumStyles';
import {
    dateLabel,
    maskCep,
    maskPhone,
    timeParts,
    useVacuumOffer,
    useVacuumPageChrome,
    vacuumApi,
    whatsappLink,
    type VacuumOffer,
    type VacuumShippingQuote,
} from '../components/vacuum-pump/vacuumApi';
import { pushLead } from '../lib/dataLayer';
import { getLeadTrackingFields } from '../lib/tracking';
import { PUBLIC_BASE_URL } from '../lib/publicUrl';
import { VACUUM_ITEM_NAME, brlParts, computeVacuumCart, formatBRL, normalizeBrPhone, vacuumEndTimeLabel, vacuumUrgencyLabel } from '../lib/vacuumOffer';

const EXIT_KEY = 'vp_exit_shown';

const GALLERY = [
    { id: 'front', label: 'Frente', src: VACUUM_IMAGES.front, srcSm: VACUUM_IMAGES.frontSm, alt: 'Foto da Vacuum Pump Standard W-Tech de frente, com manômetro, seletor de pressão e vácuo e visor de nível aceso' },
    { id: 'rear', label: 'Traseira', src: VACUUM_IMAGES.rear, srcSm: VACUUM_IMAGES.rearSm, alt: 'Foto da traseira da Vacuum Pump Standard, com cooler, filtro externo e tomada' },
    { id: 'side-air', label: 'Lateral com o medidor de ar', src: VACUUM_IMAGES.sideAir, srcSm: VACUUM_IMAGES.sideAirSm, alt: 'Foto da lateral da Vacuum Pump Standard com o medidor de entrada de ar' },
    { id: 'side-vent', label: 'Lateral com a grade', src: VACUUM_IMAGES.sideVent, srcSm: VACUUM_IMAGES.sideVentSm, alt: 'Foto da outra lateral da Vacuum Pump Standard, com a grade de ventilação' },
    { id: 'inside', label: 'Por dentro', src: VACUUM_IMAGES.inside, srcSm: VACUUM_IMAGES.insideSm, alt: 'Modelo 3D da Vacuum Pump Standard sem a tampa, mostrando a bomba e o pulmão' },
] as const;

const SPECS: [string, string][] = [
    ['Voltagem', '220 V'],
    ['Bomba', 'Vácuo de pistão'],
    ['Pressão negativa', '14 PSI'],
    ['Pressão positiva', '70 PSI'],
    ['Reservatório de óleo', '2 litros'],
    ['Pulmão de alta pressão', 'Usinado, com corpo anodizado'],
    ['Medidor de pressão', 'Com glicerina, lê pressão positiva e vácuo'],
    ['Medidor de entrada de ar', 'Na lateral da máquina'],
    ['Filtragem', 'Externa'],
    ['Arrefecimento', 'Por cooler'],
    ['Fonte', '12 V'],
    ['Peso', '15 kg'],
];

const STEPS = [
    { title: 'Monte o amortecedor', text: 'Amortecedor montado, ainda sem óleo.' },
    { title: 'Conecte na máquina', text: 'Use o bico ou adaptador certo para aquele amortecedor.' },
    { title: 'Puxe o vácuo', text: 'Acompanhe no manômetro. O ar sai de dentro do conjunto.' },
    { title: 'Óleo sem bolha', text: 'O óleo entra sem ar e o amortecedor segue para o teste.' },
];

const Timer: React.FC<{ target: string; now: number }> = ({ target, now }) => {
    const { days, hours, minutes, seconds } = timeParts(target, now);
    const parts: [number, string][] = [[days, 'dias'], [hours, 'horas'], [minutes, 'min'], [seconds, 'seg']];
    return (
        <div className="flex gap-1.5" role="timer" aria-label={`${days} dias, ${hours} horas e ${minutes} minutos`}>
            {parts.map(([value, label]) => (
                <div key={label} className="vp-dark min-w-[3.1rem] px-1.5 py-1 text-center">
                    <div className="vp-display vp-num text-2xl !leading-none">{String(value).padStart(2, '0')}</div>
                    <div className="mt-0.5 text-[.62rem] vp-muted">{label}</div>
                </div>
            ))}
        </div>
    );
};

/** Conta do zero até o valor quando entra na tela. O número final já está no HTML, para quem não vê a animação. */
const CountUp: React.FC<{ value: number }> = ({ value }) => {
    const ref = useRef<HTMLSpanElement>(null);
    useEffect(() => {
        const node = ref.current;
        if (!node || typeof IntersectionObserver === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        let raf = 0;
        const observer = new IntersectionObserver(([entry]) => {
            if (!entry.isIntersecting) return;
            observer.disconnect();
            const start = performance.now();
            const step = (time: number) => {
                const t = Math.min(1, (time - start) / 900);
                node.textContent = String(Math.round(value * (1 - (1 - t) ** 3)));
                if (t < 1) raf = requestAnimationFrame(step);
            };
            raf = requestAnimationFrame(step);
        });
        observer.observe(node);
        return () => {
            observer.disconnect();
            cancelAnimationFrame(raf);
        };
    }, [value]);
    return <span ref={ref}>{value}</span>;
};

/** Frete antes do carrinho, como nas grandes lojas: quem é de longe quer saber logo. */
const ShippingCalc: React.FC<{ offer: VacuumOffer; cep: string; onCep: (value: string) => void }> = ({ offer, cep, onCep }) => {
    const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle');
    const [quote, setQuote] = useState<VacuumShippingQuote | null>(null);

    const calculate = async (event: React.FormEvent) => {
        event.preventDefault();
        if (cep.replace(/\D/g, '').length !== 8) return;
        setState('loading');
        const result = await vacuumApi.shipping({ cep, bumps: [] }).catch(() => null);
        setQuote(result?.mode ? { mode: result.mode, options: result.options || [] } : { mode: 'combine', options: [] });
        setState('done');
    };

    return (
        <div>
            <form onSubmit={calculate} className="flex items-end gap-2">
                <label className="block flex-1">
                    <span className="vp-field-label !flex items-center gap-1.5"><Truck size={16} aria-hidden /> Calcule o frete</span>
                    <input className="vp-input vp-num" inputMode="numeric" autoComplete="postal-code" placeholder="00000-000" value={cep} onChange={(e) => onCep(maskCep(e.target.value))} />
                </label>
                <button type="submit" className="vp-btn vp-btn-ghost !min-h-[50px] !px-4 !text-base" disabled={state === 'loading'}>{state === 'loading' ? '…' : 'Calcular'}</button>
            </form>
            {state === 'done' && quote && (
                <div className="mt-2 text-sm" role="status">
                    {quote.mode === 'free' && <p className="font-semibold vp-green">Frete grátis para o estado de São Paulo.</p>}
                    {quote.mode === 'combine' && <p className="vp-muted">Para o seu CEP, o frete é combinado no WhatsApp logo após a compra.</p>}
                    {quote.mode === 'quoted' && quote.options.map((option) => (
                        <p key={option.code} className="flex justify-between gap-3"><span>{option.name}</span><b className="vp-num">{formatBRL(option.price)}</b></p>
                    ))}
                </div>
            )}
            <p className="mt-2 text-sm"><b>{offer.delivery_text}</b></p>
        </div>
    );
};

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
                <Check className="mt-0.5 shrink-0 vp-green" size={20} aria-hidden />
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
            <button type="submit" className={`vp-btn self-end !min-h-[50px] !text-lg ${compact ? 'w-full' : ''}`} disabled={state === 'sending'} data-track="vacuum_lead_form" data-track-category="Vacuum Pump">
                {state === 'sending' ? 'Enviando…' : source === 'waitlist' ? 'Me avise' : 'Quero que me chamem'}
            </button>
            {error && <p role="alert" className="text-sm vp-red sm:col-span-3">{error}</p>}
            <p className="text-xs vp-muted sm:col-span-3">Só usamos seu contato para falar sobre esta oferta. <a className="underline" href="/privacidade" target="_blank" rel="noreferrer">Privacidade</a>.</p>
        </form>
    );
};

/** O que é cada acessório e o que a pessoa ganha com ele, em vez de só listar o que vem na caixa. */
const ACCESSORY_INFO: Record<string, { what: string; gains: string[]; videoAt?: number }> = {
    borbulhador: {
        what: 'Câmara transparente em acrílico cristal e alumínio anodizado, que deixa à vista o ar saindo do óleo.',
        gains: [
            'O cliente vê o ar saindo do óleo, na frente dele.',
            'O fluxo desacelera e as microbolhas se juntam no alto da câmara, onde são purgadas.',
            'Acrílico com 92% de transmissão de luz, para acompanhar tudo.',
        ],
        videoAt: 42,
    },
    kit_adaptador: {
        what: 'Conjunto de adaptadores com engate rápido, para ligar a máquina em amortecedores de medidas diferentes.',
        gains: [
            'Serve em reservatório de nitro de 48, 52 e 54 mm.',
            'Adaptadores em inox 304 com seis roscas: M4x0,7, M5x0,8, M6x1, M8x1,25, M10x0,9 e M10x1.',
            'Engate rápido para conectar e soltar sem perder tempo entre um serviço e outro.',
        ],
    },
};

const ComboCard: React.FC<{ offer: VacuumOffer; bumps: VacuumOffer['bumps']; title: string; onBuy: (bumpIds: string[]) => void; onWatch?: (at: number) => void }> = ({ offer, bumps, title, onBuy, onWatch }) => {
    const ids = bumps.map((bump) => bump.id);
    const cart = computeVacuumCart(offer, ids);
    const before = (offer.compare_at ?? offer.price) + bumps.reduce((sum, bump) => sum + (bump.anchor ?? bump.price), 0);
    const saving = before - cart.total;
    const single = bumps.length === 1 ? ACCESSORY_INFO[bumps[0].id] : undefined;

    return (
        <article className="vp-plate flex flex-col p-3 sm:p-4">
            <ComboImage items={bumps} />
            <h3 className="mt-3 font-bold leading-snug">{title}</h3>
            {bumps.length === 1 ? (
                <>
                    <p className="mt-1 text-sm vp-muted">{single?.what ?? bumps[0].tagline}</p>
                    <p className="mt-2.5 text-sm font-bold">O que você ganha</p>
                    <ul className="mt-1 space-y-1 text-sm">
                        {(single?.gains ?? bumps[0].details ?? []).map((line) => (
                            <li key={line} className="flex gap-1.5"><Check className="mt-0.5 shrink-0 vp-green" size={15} aria-hidden /><span>{line}</span></li>
                        ))}
                    </ul>
                    {single?.videoAt !== undefined && onWatch && (
                        <button type="button" className="mt-2 inline-flex items-center gap-1.5 self-start text-sm font-semibold underline underline-offset-2" onClick={() => onWatch(single.videoAt as number)} data-track={`vacuum_watch_${bumps[0].id}`} data-track-category="Vacuum Pump">
                            <Play size={14} fill="currentColor" aria-hidden /> Ver funcionando no vídeo
                        </button>
                    )}
                </>
            ) : (
                <ul className="mt-1 space-y-2 text-sm">
                    {bumps.map((bump) => (
                        <li key={bump.id}><b>{bump.name}</b><span className="block vp-muted">{ACCESSORY_INFO[bump.id]?.what ?? bump.tagline}</span></li>
                    ))}
                </ul>
            )}
            <div className="mt-auto pt-3 vp-num">
                {saving > 0 && <p className="text-xs vp-muted">De <s>{formatBRL(before)}</s> por</p>}
                <p className="vp-display vp-red"><span className="mr-1 text-2xl">{offer.installments}x de</span> <span className="text-5xl">{formatBRL(cart.installment_value)}</span></p>
                <p className="mt-0.5 text-sm"><span className="font-semibold vp-green">sem juros</span> ou {formatBRL(cart.total)} à vista</p>
                {saving > 0 && <p className="vp-save mt-1.5 text-xs">Você economiza {formatBRL(saving)}</p>}
                <button type="button" className="vp-btn mt-3 w-full !min-h-[48px] !text-lg" onClick={() => onBuy(ids)} data-track={`vacuum_add_${ids.join('_')}`} data-track-category="Vacuum Pump">
                    <Plus size={18} aria-hidden /> Comprar junto
                </button>
            </div>
        </article>
    );
};

const LPVacuumPump: React.FC = () => {
    const { offer, now, refresh } = useVacuumOffer();
    const [checkoutOpen, setCheckoutOpen] = useState(false);
    const [checkoutBumps, setCheckoutBumps] = useState<string[]>([]);
    const [exitOpen, setExitOpen] = useState(false);
    const [servicePrice, setServicePrice] = useState(350);
    const [showSticky, setShowSticky] = useState(false);
    const [photo, setPhoto] = useState<(typeof GALLERY)[number]['id']>('front');
    const [cep, setCep] = useState('');
    const heroCta = useRef<HTMLDivElement>(null);
    const formRef = useRef<HTMLElement>(null);
    const experienceRef = useRef<HTMLElement>(null);
    const videoHandle = useRef<VacuumVideoHandle>(null);
    const rootRef = useRef<HTMLDivElement>(null);
    const checkoutOpenRef = useRef(false);
    checkoutOpenRef.current = checkoutOpen;

    const installment = brlParts(offer.installment_value);
    const presale = offer.phase === 'presale';
    const soon = offer.phase === 'soon';
    const discounted = presale || soon;
    const timerTarget = soon ? offer.starts_at : offer.ends_at;
    const servicesToPay = Math.ceil(offer.installment_value / servicePrice);
    const saving = offer.compare_at ? offer.compare_at - offer.price : 0;
    const offPercent = offer.compare_at ? Math.round((saving / offer.compare_at) * 100) : 0;
    const currentPhoto = GALLERY.find((item) => item.id === photo) ?? GALLERY[0];

    useVacuumPageChrome();

    // O código QR do computador abre a página direto no bloco 3D.
    useEffect(() => {
        if (window.location.hash !== '#maquina-3d') return;
        const timer = window.setTimeout(() => experienceRef.current?.scrollIntoView({ block: 'start' }), 400);
        return () => window.clearTimeout(timer);
    }, []);

    useEffect(() => {
        const node = heroCta.current;
        if (!node) return;
        // Olha a posição a cada rolagem: um salto por link passa pelo botão sem ele "entrar" na tela.
        let frame = 0;
        const update = () => {
            frame = 0;
            setShowSticky(node.getBoundingClientRect().bottom < 0);
        };
        const onScroll = () => {
            if (!frame) frame = window.requestAnimationFrame(update);
        };
        update();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', onScroll);
            if (frame) window.cancelAnimationFrame(frame);
        };
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

    const openCheckout = useCallback((bumps: string[] = []) => {
        if (soon) {
            formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }
        setExitOpen(false);
        setCheckoutBumps(bumps);
        setCheckoutOpen(true);
    }, [soon]);

    // Blocos entram aos poucos na rolagem. Sem o observador, aparecem de uma vez.
    useEffect(() => {
        const root = rootRef.current;
        if (!root) return;
        const blocks = Array.from(root.querySelectorAll('[data-reveal]'));
        if (typeof IntersectionObserver === 'undefined') {
            blocks.forEach((block) => block.classList.add('vp-in'));
            return;
        }
        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (!entry.isIntersecting) continue;
                    entry.target.classList.add('vp-in');
                    observer.unobserve(entry.target);
                }
            },
            { rootMargin: '0px 0px -8% 0px' }
        );
        blocks.forEach((block) => observer.observe(block));
        return () => observer.disconnect();
    }, []);

    const zoomPhoto = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
        const img = event.currentTarget.querySelector('img');
        if (!img || !window.matchMedia('(hover: hover)').matches) return;
        const box = event.currentTarget.getBoundingClientRect();
        img.style.transformOrigin = `${((event.clientX - box.left) / box.width) * 100}% ${((event.clientY - box.top) / box.height) * 100}%`;
        img.style.transform = 'scale(2)';
    }, []);

    const resetZoom = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
        const img = event.currentTarget.querySelector('img');
        if (img) img.style.transform = '';
    }, []);

    const statusBar = soon
        ? `A pré-venda abre em ${dateLabel(offer.starts_at)}`
        : presale
            ? vacuumUrgencyLabel(offer.ends_at, now)
            : offer.end_reason === 'sold_out' ? 'Estoque da pré-venda esgotado' : 'Pré-venda encerrada';

    const parts = timeParts(timerTarget, now);
    const whatsappHelp = whatsappLink(offer.whatsapp, 'Oi! Tenho uma dúvida sobre a Vacuum Pump Standard da Black Friday.');

    return (
        <div ref={rootRef} className="vp-root min-h-screen">
            <style>{VP_CSS}</style>
            <SEO
                title={discounted ? `Vacuum Pump W-Tech: ${offer.installments}x de ${formatBRL(offer.installment_value)} sem juros` : 'Vacuum Pump Standard W-Tech'}
                description={`Máquina de vácuo W-Tech para amortecedores. Black Friday: ${offer.installments}x de ${formatBRL(offer.installment_value)} sem juros (${formatBRL(offer.price)} à vista), só na pré-venda de 7 dias.`}
                image={`${PUBLIC_BASE_URL}/og/maquina-de-vacuo.jpg`}
                url={`${PUBLIC_BASE_URL}/maquina-de-vacuo`}
                type="product"
                noindex
            />

            {/* Barra da loja, com o prazo sempre à vista */}
            <div className="vp-dark sticky top-0 z-40">
                <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-3 px-4 py-2">
                    <img src="/logo-wtech-branca.webp" alt="W-Tech" className="h-7 w-auto shrink-0" />
                    <p className="hidden items-center gap-1.5 text-sm font-semibold sm:flex"><Lock size={15} aria-hidden /> Compra segura</p>
                    {offer.phase !== 'regular' ? (
                        <p className="flex items-center gap-2 text-sm" role="timer">
                            <span className="hidden vp-muted md:inline">{statusBar}</span>
                            <span className="vp-display vp-num text-xl !leading-none">{parts.days > 0 && `${parts.days}d `}{String(parts.hours).padStart(2, '0')}:{String(parts.minutes).padStart(2, '0')}:{String(parts.seconds).padStart(2, '0')}</span>
                        </p>
                    ) : (
                        <span className="text-sm vp-muted">{statusBar}</span>
                    )}
                </div>
            </div>
            {discounted && (
                <div className="bg-[var(--vp-red)] px-4 py-1.5 text-center text-white">
                    <span className="vp-display text-lg tracking-wide">Black Friday W-Tech</span>
                    <span className="ml-2 hidden text-sm sm:inline">Pré-venda de lançamento, de {dateLabel(offer.starts_at)} a {dateLabel(offer.ends_at)}</span>
                </div>
            )}

            {/* Produto e preço */}
            <main className="mx-auto grid max-w-[1180px] gap-3 px-3 pb-8 pt-3 sm:px-4 lg:grid-cols-[1.08fr_.92fr] lg:items-start lg:gap-6 lg:pt-6">
                <section className="vp-plate p-2.5 sm:p-4" aria-label="Fotos do produto">
                    <div className="relative">
                        {offer.compare_at && <span className="vp-off absolute left-2 top-2 z-10 !text-base">-{offPercent}%</span>}
                        {currentPhoto.id === 'inside' && <span className="vp-off absolute right-2 top-2 z-10 !bg-[var(--vp-ink)]">Modelo 3D</span>}
                        <div className="vp-zoom aspect-[5/4] w-full" onMouseMove={zoomPhoto} onMouseLeave={resetZoom}>
                            <img
                                key={currentPhoto.id}
                                src={currentPhoto.src}
                                srcSet={`${currentPhoto.srcSm} 640w, ${currentPhoto.src} 1300w`}
                                sizes="(min-width: 1024px) 600px, 92vw"
                                width={1300}
                                height={1040}
                                alt={currentPhoto.alt}
                                className="h-full w-full object-contain"
                                fetchPriority={currentPhoto.id === 'front' ? 'high' : undefined}
                            />
                        </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 sm:gap-2">
                        {GALLERY.map((item) => (
                            <button key={item.id} type="button" className="vp-thumb" aria-pressed={photo === item.id} aria-label={`Ver ${item.label}`} onClick={() => setPhoto(item.id)}>
                                <img src={item.srcSm} alt="" width={60} height={48} loading="lazy" />
                            </button>
                        ))}
                        <button type="button" className="vp-thumb" aria-label="Assistir ao vídeo" onClick={() => videoHandle.current?.watch()} data-track="vacuum_video_thumb" data-track-category="Vacuum Pump">
                            <img src={VACUUM_VIDEO.poster} alt="" width={50} height={28} loading="lazy" className="opacity-60" />
                            <span className="absolute inset-0 grid place-items-center"><span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--vp-red)] text-white"><Play size={14} fill="currentColor" aria-hidden /></span></span>
                        </button>
                        <button type="button" className="vp-thumb" aria-label="Ver a máquina em 3D" onClick={() => experienceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} data-track="vacuum_3d_thumb" data-track-category="Vacuum Pump">
                            <span className="grid place-items-center text-[.7rem] font-bold leading-tight"><Box size={24} aria-hidden /> 3D</span>
                        </button>
                    </div>
                    <p className="mt-2 text-xs vp-muted">Fotos reais da máquina. Acessórios vendidos separadamente.</p>
                    <div className="mt-3">
                        <VacuumARButton placement="hero" />
                    </div>
                </section>

                <section className="vp-plate p-4 sm:p-6" aria-label="Preço e compra">
                    <p className="vp-label vp-muted">Lançamento W-Tech</p>
                    <h1 className="vp-display mt-1 text-[clamp(2.05rem,9.3vw,3.2rem)]">Vacuum Pump Standard</h1>
                    <p className="mt-1 text-sm vp-muted sm:text-base">Máquina de vácuo para amortecedores. O ar sai antes do óleo entrar, e o seu cliente vê isso acontecer.</p>

                    <div className="mt-4 border-t border-[var(--vp-line)] pt-4">
                        {offer.compare_at && (
                            <p className="flex items-center gap-2 text-sm vp-num">
                                <span className="vp-muted">De <s>{formatBRL(offer.compare_at)}</s> por</span>
                                <span className="vp-off">{offPercent}% OFF</span>
                            </p>
                        )}
                        {/* A parcela é o número em destaque; o total à vista fica sempre legível logo abaixo. */}
                        <div className="mt-2 flex flex-wrap items-baseline gap-x-2.5">
                            <span className="vp-display vp-price-x">{offer.installments}x de</span>
                            <div className="vp-display vp-num vp-price-now"><small>R$</small> {installment.integer}<small>,{installment.cents}</small></div>
                        </div>

                        <div className="mt-2.5 space-y-1.5">
                            <p className="vp-pay-line text-lg"><CreditCard className="mt-1 shrink-0" size={20} aria-hidden /><span><b className="vp-green">Sem juros</b> no cartão</span></p>
                            <p className="vp-pay-line text-sm"><QrCode className="mt-0.5 shrink-0" size={18} aria-hidden /><span className="vp-num">ou <b>{formatBRL(offer.price)}</b> à vista no Pix, com aprovação na hora</span></p>
                        </div>
                        {saving > 0 && <p className="vp-save vp-num mt-2.5 text-sm">Você economiza {formatBRL(saving)}</p>}
                    </div>

                    {offer.phase !== 'regular' && (
                        <div className="mt-4 space-y-3 border-t border-[var(--vp-line)] pt-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-sm font-semibold">{soon ? 'A pré-venda abre em' : 'Esse preço acaba em'}</p>
                                <Timer target={timerTarget} now={now} />
                            </div>
                            {!soon && <p className="text-xs vp-muted vp-num">Depois, {offer.installments}x de {formatBRL(offer.regular_installment_value)}.</p>}
                            <p className="text-sm font-semibold vp-num">Promoção válida até {dateLabel(offer.ends_at)}, às {vacuumEndTimeLabel(offer.ends_at)}, ou enquanto durar o estoque.</p>
                        </div>
                    )}

                    <div ref={heroCta} className="mt-4 space-y-2">
                        <button type="button" className="vp-btn w-full" onClick={() => openCheckout()} data-track="vacuum_cta_hero" data-track-category="Vacuum Pump">{soon ? 'Me avise quando abrir' : 'Comprar agora'}</button>
                        <a className="vp-btn vp-btn-ghost w-full !text-lg" href={whatsappHelp} target="_blank" rel="noreferrer" data-track="vacuum_whatsapp_hero" data-track-category="Vacuum Pump"><MessageCircle size={18} aria-hidden /> Falar com um especialista</a>
                    </div>

                    <div className="mt-4 border-t border-[var(--vp-line)] pt-4">
                        <ShippingCalc offer={offer} cep={cep} onCep={setCep} />
                    </div>

                    <ul className="mt-4 grid gap-2 border-t border-[var(--vp-line)] pt-4 text-sm sm:grid-cols-2">
                        <li className="flex items-center gap-2"><Lock size={16} className="shrink-0 vp-green" aria-hidden /> Pagamento pelo Mercado Pago</li>
                        <li className="flex items-center gap-2"><ShieldCheck size={16} className="shrink-0 vp-green" aria-hidden /> Garantia de {offer.warranty_months} meses</li>
                        <li className="flex items-center gap-2"><RotateCcw size={16} className="shrink-0 vp-green" aria-hidden /> 7 dias para desistir</li>
                        <li className="flex items-center gap-2"><Zap size={16} className="shrink-0 vp-green" aria-hidden /> Máquina 220 V</li>
                    </ul>
                </section>
            </main>

            {/* A máquina em números */}
            <section className="vp-dark px-4 py-7" aria-label="Principais números da máquina">
                <dl className="mx-auto grid max-w-[1180px] grid-cols-3 gap-x-3 gap-y-5 text-center lg:grid-cols-6">
                    {[
                        { value: 14, unit: 'PSI', label: 'de pressão negativa' },
                        { value: 70, unit: 'PSI', label: 'de pressão positiva' },
                        { value: 2, unit: 'litros', label: 'de reservatório' },
                        { value: 220, unit: 'V', label: 'de voltagem' },
                        { value: 15, unit: 'kg', label: 'de peso' },
                        { value: offer.warranty_months, unit: 'meses', label: 'de garantia' },
                    ].map((item) => (
                        <div key={item.label}>
                            <dd className="vp-display vp-num text-5xl sm:text-6xl"><CountUp value={item.value} /><span className="ml-1 text-xl vp-red sm:text-2xl">{item.unit}</span></dd>
                            <dt className="mt-1 text-xs vp-muted sm:text-sm">{item.label}</dt>
                        </div>
                    ))}
                </dl>
            </section>

            {/* Vídeo: toca sozinho ao chegar na tela. Um link em video_url substitui este vídeo. */}
            <section className="scroll-mt-14 px-3 py-10 sm:px-4" aria-labelledby="vp-video">
                <div className="mx-auto max-w-[960px]" data-reveal>
                    <h2 id="vp-video" className="vp-display text-3xl sm:text-5xl">Veja como funciona</h2>
                    <p className="mb-4 mt-1 text-sm vp-muted">Da pergunta da bancada até o que vem na compra.</p>
                    {offer.video_url ? (
                        <div className="vp-video-box">
                            <div className="vp-video-frame">
                                <iframe className="h-full w-full" src={offer.video_url} title="Vacuum Pump Standard em funcionamento" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                            </div>
                        </div>
                    ) : (
                        <VacuumVideo ref={videoHandle} hidden={checkoutOpen} ctaLabel={soon ? 'Me avise quando abrir' : 'Comprar agora'} onBuy={openCheckout} />
                    )}
                    <p className="mt-2 text-xs vp-muted">Imagens ilustrativas. Acessórios vendidos separadamente.</p>
                </div>
            </section>

            {/* Compre junto */}
            <section className="px-4 pb-8" aria-labelledby="vp-junto">
                <div className="mx-auto max-w-[1180px]">
                    <h2 id="vp-junto" className="vp-display text-3xl sm:text-4xl">Compre junto</h2>
                    <p className="mt-1 text-sm vp-muted">A máquina com os acessórios, na mesma parcela e sem juros. Acessórios vendidos separadamente.</p>
                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                        {offer.bumps.map((bump) => (
                            <ComboCard key={bump.id} offer={offer} bumps={[bump]} title={`Máquina + ${bump.name}`} onBuy={openCheckout} onWatch={offer.video_url ? undefined : (at) => videoHandle.current?.watch(at)} />
                        ))}
                        {offer.bumps.length > 1 && <ComboCard offer={offer} bumps={offer.bumps} title="Máquina + os dois acessórios" onBuy={openCheckout} />}
                    </div>
                </div>
            </section>

            {/* Foto de ponta a ponta */}
            <section className="vp-dark vp-band" aria-labelledby="vp-band">
                <picture>
                    <source media="(max-width: 767px)" srcSet={VACUUM_IMAGES.bandMobile} width={1080} height={1350} />
                    <img src={VACUUM_IMAGES.band} alt="Vacuum Pump Standard com o visor de nível aceso" width={2400} height={1000} loading="lazy" className="vp-band-img" />
                </picture>
                <div className="vp-band-text mx-auto max-w-[1180px] px-4" data-reveal>
                    <h2 id="vp-band" className="vp-display text-5xl sm:text-6xl lg:text-7xl">O ar sai antes<br />do óleo <span className="vp-red">entrar.</span></h2>
                    <p className="mt-3 max-w-md text-lg">E o seu cliente vê isso acontecer, no painel, na frente dele.</p>
                    <button type="button" className="vp-btn mt-5" onClick={() => openCheckout()} data-track="vacuum_cta_band" data-track-category="Vacuum Pump">{soon ? 'Me avise quando abrir' : `Comprar por ${offer.installments}x de ${formatBRL(offer.installment_value).replace(',00', '')}`}</button>
                </div>
            </section>

            {/* Closes */}
            <section className="px-4 py-10" aria-labelledby="vp-detalhes">
                <div className="mx-auto max-w-[1180px]">
                    <h2 id="vp-detalhes" className="vp-display text-4xl sm:text-5xl" data-reveal>Cada detalhe à vista</h2>
                    <div className="vp-tiles mt-4">
                        {VACUUM_DETAILS.map((tile) => (
                            <figure key={tile.title} className={`vp-tile ${tile.tall ? 'vp-tile-tall' : ''}`} data-reveal>
                                <img src={tile.src} alt={tile.title} width={860} height={640} loading="lazy" />
                                <figcaption>
                                    <b>{tile.title}</b>
                                    <span>{tile.text}</span>
                                </figcaption>
                            </figure>
                        ))}
                    </div>
                </div>
            </section>

            {/* A máquina em 3D */}
            <section ref={experienceRef} id="maquina-3d" className="scroll-mt-14 border-t border-[var(--vp-line)] bg-white px-4 py-10">
                <div className="mx-auto max-w-[1180px]">
                    <h2 className="vp-display text-4xl sm:text-5xl">Conheça a máquina por dentro</h2>
                    <p className="mb-5 mt-1 vp-muted">Arraste para girar. Toque em uma peça para ir até ela.</p>
                    <VacuumExperience3D />
                    <p className="mt-3 text-xs vp-muted">Modelo 3D feito a partir do projeto da máquina. Cores e detalhes podem variar.</p>
                </div>
            </section>

            {/* Ficha técnica e o que vem */}
            <section className="border-t border-[var(--vp-line)] px-4 py-10">
                <div className="mx-auto grid max-w-[1180px] gap-8 lg:grid-cols-[1.25fr_.75fr]">
                    <div>
                        <h2 className="vp-display text-4xl">Ficha técnica</h2>
                        <dl className="mt-3 grid border-t border-[var(--vp-line)] sm:grid-cols-2 sm:gap-x-8">
                            {SPECS.map(([label, value]) => (
                                <div key={label} className="flex items-baseline justify-between gap-5 border-b border-[var(--vp-line)] py-2.5 text-sm">
                                    <dt className="vp-muted">{label}</dt>
                                    <dd className="text-right font-semibold vp-num">{value}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                    <div>
                        <h2 className="vp-display text-4xl">Na sua compra</h2>
                        <ul className="mt-3 space-y-3 text-sm">
                            {[
                                ['Vacuum Pump Standard', 'Fabricação W-Tech.'],
                                ['Vídeo de treinamento', 'Conexão dos bicos, montagem, teste e o ponto certo do vácuo.'],
                                ['Manual da máquina', 'Para consultar na bancada.'],
                                [`Garantia de ${offer.warranty_months} meses`, 'Direto com o fabricante.'],
                                ['Suporte técnico W-Tech', 'Dúvida de uso? Chama a gente no WhatsApp.'],
                            ].map(([title, text]) => (
                                <li key={title} className="flex gap-2.5">
                                    <Check className="mt-0.5 shrink-0 vp-green" size={18} aria-hidden />
                                    <div><b>{title}</b><p className="vp-muted">{text}</p></div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </section>

            {/* Bancada e conta */}
            <section className="border-t border-[var(--vp-line)] bg-white px-4 py-10">
                <div className="mx-auto grid max-w-[1180px] gap-8 lg:grid-cols-2 lg:items-center">
                    <div>
                        <h2 className="vp-display text-4xl sm:text-5xl">Na sua bancada</h2>
                        <ol className="mt-4 space-y-3">
                            {STEPS.map((step, i) => (
                                <li key={step.title} className="flex gap-3">
                                    <span className="vp-display vp-red vp-num w-6 shrink-0 text-3xl">{i + 1}</span>
                                    <div><h3 className="font-bold">{step.title}</h3><p className="text-sm vp-muted">{step.text}</p></div>
                                </li>
                            ))}
                        </ol>
                    </div>
                    <div className="vp-plate vp-plate-alt p-5 sm:p-6">
                        <h2 className="vp-display text-3xl sm:text-4xl">Quantos serviços pagam a parcela?</h2>
                        <label className="mt-4 block">
                            <span className="text-sm font-semibold">Quanto você cobra por serviço de amortecedor?</span>
                            <span className="vp-display vp-num mt-1 block text-4xl">{formatBRL(servicePrice).replace(',00', '')}</span>
                            <input type="range" className="vp-range mt-3" min={150} max={1000} step={10} value={servicePrice} onChange={(e) => setServicePrice(Number(e.target.value))} />
                        </label>
                        <div className="mt-4 flex items-center gap-3 border-t border-[var(--vp-line)] pt-4">
                            <div className="vp-display vp-num text-6xl vp-red">{servicesToPay}</div>
                            <p className="font-semibold">{servicesToPay === 1 ? 'serviço por mês paga' : 'serviços por mês pagam'} a parcela de {formatBRL(offer.installment_value)}.</p>
                        </div>
                        <p className="mt-2 text-xs vp-muted">Simulação com o valor que você escolheu. Não considera os custos da sua oficina.</p>
                    </div>
                </div>
            </section>

            {/* Oferta final */}
            <section className="vp-dark px-4 py-10">
                <div className="mx-auto max-w-[900px] text-center">
                    {discounted ? (
                        <>
                            <div className="vp-label vp-offer-kick">Super promoção Black Friday</div>
                            <h2 className="mt-2">
                                <span className="vp-display vp-num vp-offer-de">De <s>{formatBRL(offer.regular_price).replace(',00', '')}</s></span>
                                <span className="vp-display vp-offer-x">por {offer.installments}x de</span>
                                <span className="vp-display vp-num vp-offer-por">{formatBRL(offer.installment_value).replace(',00', '')}</span>
                            </h2>
                            <p className="vp-display vp-offer-mes">por mês, sem juros</p>
                            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                                <span className="vp-display vp-num vp-offer-chip">Ou {formatBRL(offer.price).replace(',00', '')} no Pix</span>
                                <span className="vp-display vp-num vp-offer-chip vp-offer-chip-eco">{formatBRL(offer.regular_price - offer.price).replace(',00', '')} a menos</span>
                            </div>
                            <p className="mt-4 text-sm vp-muted vp-num">Depois da pré-venda: {offer.installments}x de {formatBRL(offer.regular_installment_value).replace(',00', '')} ({formatBRL(offer.regular_price).replace(',00', '')}).</p>
                            <p className="mt-1 text-sm font-semibold vp-num">Promoção válida até {dateLabel(offer.ends_at)}, às {vacuumEndTimeLabel(offer.ends_at)}, ou enquanto durar o estoque.</p>
                        </>
                    ) : (
                        <h2 className="vp-display text-5xl sm:text-6xl">{offer.installments}x de {formatBRL(offer.installment_value).replace(',00', '')} sem juros</h2>
                    )}
                    <button type="button" className="vp-btn mt-5 w-full sm:w-auto" onClick={() => openCheckout()} data-track="vacuum_cta_final" data-track-category="Vacuum Pump">{soon ? 'Me avise quando abrir' : 'Comprar agora'}</button>
                </div>
            </section>

            {/* Perguntas */}
            <section className="px-4 py-10">
                <div className="mx-auto max-w-[800px]">
                    <h2 className="vp-display text-4xl">Perguntas frequentes</h2>
                    <div className="mt-3 divide-y divide-[var(--vp-line)] border-y border-[var(--vp-line)]">
                        {[
                            ['É mesmo 10x sem juros?', `Sim. No cartão de crédito, em até ${offer.installments}x de ${formatBRL(offer.installment_value)}, sem juros. O total é ${formatBRL(offer.price)}.`],
                            ['Posso pagar no Pix?', `Pode. No Pix o valor é ${formatBRL(offer.price)} à vista, e a confirmação sai na hora.`],
                            ['O cartão não tem limite para tudo. E agora?', 'Chame um vendedor no WhatsApp: ele divide sua compra em mais de um cartão, nas mesmas condições da pré-venda.'],
                            ['Qual é a voltagem da máquina?', 'A Vacuum Pump Standard funciona em 220 V. Confira a tomada da sua oficina antes de comprar.'],
                            ['Quando recebo?', `${offer.delivery_text}. ${offer.shipping_note}`],
                            ['E se o prazo ou o estoque acabar?', `A condição de pré-venda encerra e o preço vai para ${formatBRL(offer.regular_price)}, ainda em ${offer.installments}x sem juros (${formatBRL(offer.regular_installment_value)} por mês).`],
                            ['O que vem junto com a máquina?', `Manual, vídeo de treinamento, garantia de ${offer.warranty_months} meses e suporte técnico. A câmara borbulhadora e o kit adaptador são vendidos separadamente, e você pode incluir no carrinho.`],
                            ['Posso desistir da compra?', 'Sim. Em compra pela internet, você tem até 7 dias depois de receber para desistir (art. 49 do Código de Defesa do Consumidor). Veja nossa política de cancelamento.'],
                        ].map(([question, answer]) => (
                            <details key={question} className="vp-faq group">
                                <summary className="flex items-center justify-between gap-4 py-3.5 font-semibold">
                                    {question}
                                    <ChevronDown className="vp-faq-icon shrink-0" size={20} aria-hidden />
                                </summary>
                                <p className="pb-3.5 text-sm vp-muted">{answer}</p>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            {/* Captura para o vendedor */}
            <section ref={formRef} className="px-4 pb-10">
                <div className="vp-plate mx-auto max-w-[900px] p-5 sm:p-6">
                    <h2 className="vp-display text-3xl sm:text-4xl">{soon ? 'Seja avisado quando abrir' : 'Ainda não vai fechar?'}</h2>
                    <p className="mb-4 mt-1 text-sm vp-muted">{soon ? 'Deixe seu WhatsApp. A pré-venda abre, a gente te chama.' : 'Deixe seu WhatsApp e um especialista W-Tech te chama para tirar as dúvidas.'}</p>
                    <LeadForm offer={offer} />
                </div>
            </section>

            <footer className={`vp-dark px-4 py-7 text-sm ${showSticky ? 'pb-28 md:pb-7' : ''}`}>
                <div className="mx-auto flex max-w-[1180px] flex-wrap items-start justify-between gap-4">
                    <div className="max-w-2xl">
                        <img src="/logo-wtech-branca.webp" alt="W-Tech" className="h-7 w-auto" loading="lazy" />
                        {offer.legal_line && <p className="mt-2 text-xs vp-muted">{offer.legal_line}</p>}
                        <p className="mt-1 text-xs vp-muted">Imagens do modelo 3D e do vídeo são ilustrativas.{discounted && ` Condições válidas até ${dateLabel(offer.ends_at)} ou enquanto durar o estoque.`}</p>
                    </div>
                    <nav className="flex gap-4" aria-label="Documentos">
                        <a className="underline" href="/termos" target="_blank" rel="noreferrer">Termos</a>
                        <a className="underline" href="/privacidade" target="_blank" rel="noreferrer">Privacidade</a>
                        <a className="underline" href="/cancelamento" target="_blank" rel="noreferrer">Cancelamento</a>
                    </nav>
                </div>
            </footer>

            {/* Compra fixa no celular */}
            {showSticky && !checkoutOpen && (
                <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-[var(--vp-line)] bg-white p-3 md:hidden">
                    <div className="min-w-0 flex-1 vp-num leading-tight">
                        {offer.compare_at && <s className="text-xs vp-muted">{formatBRL(offer.compare_at)}</s>}
                        <div className="vp-display vp-red"><span className="mr-0.5 text-base">{offer.installments}x de</span> <span className="text-2xl">{formatBRL(offer.installment_value)}</span></div>
                        <div className="text-xs">sem juros ou {formatBRL(offer.price)}</div>
                    </div>
                    <button type="button" className="vp-btn !min-h-[52px] flex-1 !px-3 !text-lg" onClick={() => openCheckout()} data-track="vacuum_cta_sticky" data-track-category="Vacuum Pump">{soon ? 'Me avise' : 'Comprar'}</button>
                </div>
            )}

            {exitOpen && (
                <div className="fixed inset-0 z-[90] grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Deixe seu WhatsApp">
                    <div className="vp-plate relative w-full max-w-md p-6">
                        <button type="button" className="absolute right-3 top-3 grid h-10 w-10 place-items-center hover:bg-black/5" onClick={() => setExitOpen(false)} aria-label="Fechar"><X size={20} aria-hidden /></button>
                        <h2 className="vp-display pr-8 text-4xl">{soon ? 'Quer ser avisado?' : 'Antes de sair'}</h2>
                        <p className="mb-4 mt-2 text-sm vp-muted">
                            {presale ? `${vacuumUrgencyLabel(offer.ends_at, now)}: a parcela sobe de ${formatBRL(offer.installment_value)} para ${formatBRL(offer.regular_installment_value)}. Deixe seu WhatsApp e um especialista te chama.` : 'Deixe seu WhatsApp e a gente te chama.'}
                        </p>
                        <LeadForm offer={offer} compact onDone={() => window.setTimeout(() => setExitOpen(false), 2500)} />
                    </div>
                </div>
            )}

            {checkoutOpen && <VacuumCheckout offer={offer} now={now} initialBumps={checkoutBumps} initialCep={cep} onClose={() => setCheckoutOpen(false)} onOfferChanged={refresh} />}
        </div>
    );
};

export default LPVacuumPump;
