import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, CheckCircle2, ChevronDown, Copy, CreditCard, Lock, Plus, RotateCcw, ShieldCheck, ShoppingCart, Timer, Truck, User, X } from 'lucide-react';
import { pushBeginCheckout, pushLead } from '../../lib/dataLayer';
import { getLeadTrackingFields } from '../../lib/tracking';
import {
    VACUUM_ITEM_NAME,
    computeVacuumCart,
    documentType,
    formatBRL,
    isValidEmail,
    normalizeBrPhone,
} from '../../lib/vacuumOffer';
import {
    maskCep,
    maskDocument,
    maskPhone,
    timeParts,
    vacuumApi,
    whatsappLink,
    type VacuumOffer,
    type VacuumPix,
    type VacuumShippingQuote,
} from './vacuumApi';
import { ComboImage, VACUUM_IMAGES } from './vacuumMedia';

declare global {
    interface Window {
        MercadoPago?: new (publicKey: string, options?: { locale: string }) => {
            bricks: () => {
                create: (type: 'payment', containerId: string, settings: unknown) => Promise<{ unmount: () => void; update?: (data: { amount: number }) => boolean }>;
            };
        };
    }
}

const STORAGE_KEY = 'vp_checkout_contact';
const BRICK_CONTAINER = 'vp-payment-brick';
const FUNNEL = 'vacuum_pump_bf' as const;
const FORM_CONTACT = 'vp-form-dados';
const FORM_DELIVERY = 'vp-form-entrega';

function loadMercadoPagoSdk(): Promise<void> {
    if (window.MercadoPago) return Promise.resolve();
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://sdk.mercadopago.com/js/v2';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Falha ao carregar o Mercado Pago.'));
        document.head.appendChild(script);
    });
}

interface Props {
    offer: VacuumOffer;
    now: number;
    initialBumps?: string[];
    initialCep?: string;
    onClose: () => void;
    onOfferChanged: () => void;
}

/** A ordem é a do menor esforço: escolher, deixar o contato e só então endereço e pagamento. */
type Step = 0 | 1 | 2 | 3;
type Screen = 'form' | 'pix' | 'review';

const STEPS = [
    { label: 'Carrinho', Icon: ShoppingCart },
    { label: 'Seus dados', Icon: User },
    { label: 'Entrega', Icon: Truck },
    { label: 'Pagamento', Icon: CreditCard },
    { label: 'Concluir', Icon: CheckCircle2 },
];

const Field: React.FC<{ label: string; error?: string; children: React.ReactNode; className?: string }> = ({ label, error, children, className }) => (
    <label className={`block ${className || ''}`}>
        <span className="vp-field-label">{label}</span>
        {children}
        {error && <span role="alert" className="mt-1 block text-sm vp-red">{error}</span>}
    </label>
);

function pixTimeLeft(parts: ReturnType<typeof timeParts>): string {
    const hours = parts.days * 24 + parts.hours;
    return hours > 0 ? `${hours} h ${parts.minutes} min` : `${parts.minutes} min ${String(parts.seconds).padStart(2, '0')} s`;
}

const VacuumCheckout: React.FC<Props> = ({ offer, now, initialBumps = [], initialCep = '', onClose, onOfferChanged }) => {
    const navigate = useNavigate();
    const [step, setStep] = useState<Step>(0);
    const [screen, setScreen] = useState<Screen>('form');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [summaryOpen, setSummaryOpen] = useState(false);

    const [checkoutId, setCheckoutId] = useState<string | null>(null);
    const [contact, setContact] = useState({ name: '', phone: '', email: '' });
    const [doc, setDoc] = useState('');
    const [address, setAddress] = useState({ cep: initialCep, street: '', number: '', complement: '', neighborhood: '', city: '', state: '' });
    const [bumps, setBumps] = useState<string[]>(initialBumps);
    const [pix, setPix] = useState<VacuumPix | null>(null);
    const [copied, setCopied] = useState(false);
    const [brickState, setBrickState] = useState<'idle' | 'loading' | 'ready' | 'failed'>('idle');
    const [quote, setQuote] = useState<VacuumShippingQuote | null>(null);
    const [shippingCode, setShippingCode] = useState<string | null>(null);
    const [quoteNonce, setQuoteNonce] = useState(0);

    const cepDigits = address.cep.replace(/\D/g, '');
    const selectedOption = quote?.mode === 'quoted' ? quote.options.find((item) => item.code === shippingCode) : undefined;
    const cart = useMemo(() => computeVacuumCart(offer, bumps, selectedOption?.price ?? 0), [offer, bumps, selectedOption?.price]);
    const cartRef = useRef(cart);
    cartRef.current = cart;
    const shippingCodeRef = useRef<string | null>(null);
    shippingCodeRef.current = selectedOption?.code ?? null;
    const checkoutIdRef = useRef<string | null>(null);
    checkoutIdRef.current = checkoutId;
    const brickRef = useRef<{ unmount: () => void; update?: (data: { amount: number }) => boolean } | null>(null);
    const firstField = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const closeCheckout = useCallback(() => {
        // O carrinho é uma tela cheia: o Voltar do celular precisa fechar ele, não sair da página.
        if ((window.history.state as { vpCheckout?: boolean } | null)?.vpCheckout) window.history.back();
        else onClose();
    }, [onClose]);

    // Volta para o mesmo checkout se a pessoa fechar e abrir de novo. Cartão e CPF nunca são guardados.
    useEffect(() => {
        try {
            const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
            if (saved?.contact) setContact(saved.contact);
            if (saved?.checkoutId) setCheckoutId(saved.checkoutId);
        } catch {
            /* sessão bloqueada: segue com o formulário vazio */
        }
        pushBeginCheckout({ funnel: FUNNEL, item_name: VACUUM_ITEM_NAME, value: offer.price, currency: 'BRL', provider: 'mercadopago' });
        window.history.pushState({ ...window.history.state, vpCheckout: true }, '');
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') closeCheckout();
        };
        const onPop = () => onClose();
        window.addEventListener('keydown', onKey);
        window.addEventListener('popstate', onPop);
        return () => {
            document.body.style.overflow = previous;
            window.removeEventListener('keydown', onKey);
            window.removeEventListener('popstate', onPop);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Cada etapa começa do topo, e o nome já vem pronto para digitar.
    useEffect(() => {
        scrollRef.current?.scrollTo({ top: 0 });
        setFieldErrors({});
        if (step === 1 && !contact.name) firstField.current?.focus();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step, screen]);

    const goToThanks = useCallback(
        (id: string) => navigate(`/maquina-de-vacuo/obrigado?c=${encodeURIComponent(id)}`, { replace: true }),
        [navigate]
    );

    const submitContact = async (event: React.FormEvent) => {
        event.preventDefault();
        const errors: Record<string, string> = {};
        if (contact.name.trim().split(/\s+/).length < 2) errors.name = 'Informe nome e sobrenome.';
        if (!normalizeBrPhone(contact.phone)) errors.phone = 'WhatsApp com DDD, por favor.';
        if (!isValidEmail(contact.email)) errors.email = 'Confira o e-mail.';
        setFieldErrors(errors);
        if (Object.keys(errors).length) return;

        setBusy(true);
        setError(null);
        try {
            const result = await vacuumApi.lead({ ...contact, source: 'checkout', tracking: getLeadTrackingFields() as Record<string, string> });
            if (!result.checkout_id) throw new Error(result.error || 'Não foi possível continuar.');
            setCheckoutId(result.checkout_id);
            try {
                sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ contact, checkoutId: result.checkout_id }));
            } catch {
                /* sem storage: só não lembra na próxima abertura */
            }
            // Os adicionais foram escolhidos no carrinho, antes de existir o checkout: o vendedor precisa vê-los.
            if (bumps.length) void vacuumApi.save({ checkout_id: result.checkout_id, bumps }).catch(() => undefined);
            pushLead({
                funnel: FUNNEL,
                item_name: VACUUM_ITEM_NAME,
                method: 'checkout',
                lead_id: result.lead_id,
                value: offer.price,
                currency: 'BRL',
                user: { name: contact.name, email: contact.email, phone: contact.phone },
            });
            setStep(2);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Não foi possível continuar.');
        } finally {
            setBusy(false);
        }
    };

    // CEP completo preenche o endereço, venha ele da página, do carrinho ou da entrega.
    useEffect(() => {
        if (cepDigits.length !== 8) return;
        let cancelled = false;
        fetch(`https://viacep.com.br/ws/${cepDigits}/json/`)
            .then((res) => res.json())
            .then((data) => {
                if (cancelled || !data || data.erro) return;
                setAddress((prev) => ({
                    ...prev,
                    street: data.logradouro || prev.street,
                    neighborhood: data.bairro || prev.neighborhood,
                    city: data.localidade || prev.city,
                    state: data.uf || prev.state,
                }));
            })
            .catch(() => {
                /* CEP fora do ar: o cliente preenche à mão */
            });
        return () => {
            cancelled = true;
        };
    }, [cepDigits]);

    const submitAddress = async (event: React.FormEvent) => {
        event.preventDefault();
        const errors: Record<string, string> = {};
        if (!documentType(doc)) errors.doc = 'CPF ou CNPJ inválido.';
        if (cepDigits.length !== 8) errors.cep = 'CEP inválido.';
        if (!address.street.trim()) errors.street = 'Informe a rua.';
        if (!address.number.trim()) errors.number = 'Informe o número.';
        if (!address.city.trim()) errors.city = 'Informe a cidade.';
        if (address.state.trim().length !== 2) errors.state = 'UF com 2 letras.';
        setFieldErrors(errors);
        if (Object.keys(errors).length || !checkoutId) return;

        setBusy(true);
        setError(null);
        const saved = await vacuumApi.save({ checkout_id: checkoutId, stage: 'payment', document: doc, address }).catch(() => null);
        setBusy(false);
        if (!saved?.ok) {
            setError(saved?.error || 'Não foi possível salvar. Tente de novo.');
            return;
        }
        setStep(3);
    };

    const toggleBump = (id: string) => {
        setBumps((prev) => {
            const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
            if (checkoutId) void vacuumApi.save({ checkout_id: checkoutId, bumps: next }).catch(() => undefined);
            return next;
        });
    };

    const handlePaySubmit = useCallback(
        async (formData: unknown) => {
            const id = checkoutIdRef.current;
            if (!id) throw new Error('Checkout não encontrado.');
            setError(null);
            const current = cartRef.current;
            const result = await vacuumApi.pay({
                checkout_id: id,
                bumps: current.bump_ids,
                shipping_service: shippingCodeRef.current,
                expected_total: current.total,
                attempt_key: crypto.randomUUID(),
                form_data: formData,
            });

            if (result.stage === 'paid') {
                goToThanks(id);
                return;
            }
            if (result.stage === 'pix_pending' && result.pix) {
                setPix(result.pix);
                setScreen('pix');
                return;
            }
            if (result.stage === 'review') {
                setScreen('review');
                return;
            }
            if (result.code === 'price_changed') {
                onOfferChanged();
                setQuoteNonce((value) => value + 1);
            }
            setError(result.message || result.error || 'O pagamento não foi aprovado. Tente de novo ou chame um vendedor.');
            throw new Error('rejected');
        },
        [goToThanks, onOfferChanged]
    );

    // Frete: cotado assim que o CEP fecha, em qualquer etapa, e de novo se os adicionais mudarem o peso.
    useEffect(() => {
        if (cepDigits.length !== 8) {
            setQuote(null);
            setShippingCode(null);
            return;
        }
        let cancelled = false;
        vacuumApi
            .shipping({ cep: cepDigits, bumps })
            .then((result) => {
                if (cancelled) return;
                const next: VacuumShippingQuote = result.mode ? { mode: result.mode, options: result.options || [] } : { mode: 'combine', options: [] };
                setQuote(next);
                // Mantém a escolha da pessoa; sem escolha válida, entra a opção mais barata.
                setShippingCode((current) =>
                    next.mode !== 'quoted' ? null : next.options.some((item) => item.code === current) ? current : next.options[0].code
                );
            })
            .catch(() => {
                if (!cancelled) {
                    setQuote({ mode: 'combine', options: [] });
                    setShippingCode(null);
                }
            });
        return () => {
            cancelled = true;
        };
    }, [cepDigits, bumps, quoteNonce]);

    // Payment Brick: o cartão é digitado nos campos do Mercado Pago, nunca passa pelo nosso servidor.
    // Só abre com o frete resolvido, para o total já nascer certo.
    const showBrick = step === 3 && screen === 'form' && quote !== null;
    useEffect(() => {
        if (!showBrick || !offer.mp_public_key) return;
        let cancelled = false;
        setBrickState('loading');
        (async () => {
            try {
                await loadMercadoPagoSdk();
                if (cancelled || !window.MercadoPago) return;
                const [firstName, ...rest] = contact.name.trim().split(/\s+/);
                const docKind = documentType(doc);
                const mp = new window.MercadoPago(offer.mp_public_key as string, { locale: 'pt-BR' });
                const controller = await mp.bricks().create('payment', BRICK_CONTAINER, {
                    initialization: {
                        amount: cartRef.current.total,
                        payer: {
                            email: contact.email,
                            firstName,
                            lastName: rest.join(' '),
                            entityType: docKind === 'CNPJ' ? 'association' : 'individual',
                            ...(docKind ? { identification: { type: docKind, number: doc.replace(/\D/g, '') } } : {}),
                        },
                    },
                    customization: {
                        visual: {
                            style: {
                                theme: 'default',
                                customVariables: { baseColor: '#e60000', buttonTextColor: '#ffffff', borderRadiusMedium: '2px', borderRadiusLarge: '2px' },
                            },
                        },
                        paymentMethods: { creditCard: 'all', bankTransfer: 'all', maxInstallments: offer.installments },
                    },
                    callbacks: {
                        onReady: () => !cancelled && setBrickState('ready'),
                        onError: (brickError: unknown) => console.error('[Vacuum] Brick:', brickError),
                        onSubmit: ({ formData }: { formData: unknown }) => handlePaySubmit(formData),
                    },
                });
                if (cancelled) {
                    controller.unmount();
                    return;
                }
                brickRef.current = controller;
            } catch (err) {
                console.error('[Vacuum] Não foi possível abrir o pagamento:', err);
                if (!cancelled) setBrickState('failed');
            }
        })();
        return () => {
            cancelled = true;
            brickRef.current?.unmount();
            brickRef.current = null;
        };
        // O total entra pelo update abaixo: recriar o Brick apagaria o cartão já digitado.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showBrick, offer.mp_public_key]);

    useEffect(() => {
        brickRef.current?.update?.({ amount: cart.total });
    }, [cart.total]);

    // Pix e análise: acompanha até confirmar. A consulta também cobre webhook atrasado.
    useEffect(() => {
        if (screen === 'form' || !checkoutId) return;
        const timer = window.setInterval(async () => {
            const status = await vacuumApi.status(checkoutId).catch(() => null);
            if (!status) return;
            if (status.stage === 'paid') {
                window.clearInterval(timer);
                goToThanks(checkoutId);
            } else if (status.stage === 'rejected' || status.stage === 'expired') {
                window.clearInterval(timer);
                setScreen('form');
                setError(status.stage === 'expired' ? 'O Pix venceu. Gere um novo código para garantir sua máquina.' : status.message || 'O pagamento não foi aprovado.');
            }
        }, 5000);
        return () => window.clearInterval(timer);
    }, [screen, checkoutId, goToThanks]);

    const copyPix = async () => {
        if (!pix?.qr_code) return;
        try {
            await navigator.clipboard.writeText(pix.qr_code);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2500);
        } catch {
            /* navegador sem permissão: o código continua visível para copiar à mão */
        }
    };

    const sellerLink = whatsappLink(
        offer.whatsapp,
        `Oi! Estou comprando a Vacuum Pump Standard na Black Friday e preciso de ajuda para concluir o pagamento.`
    );
    const ending = offer.phase === 'presale' ? timeParts(offer.ends_at, now) : null;
    const pixLeft = pix?.expires_at ? timeParts(pix.expires_at, now) : null;
    const currentStep = screen === 'form' ? step : STEPS.length - 1;

    const selectedBumps = offer.bumps.filter((bump) => bumps.includes(bump.id));
    const machineSaving = offer.compare_at ? offer.compare_at - offer.price : 0;
    const bumpSaving = selectedBumps.reduce((sum, bump) => sum + (bump.anchor ? bump.anchor - bump.price : 0), 0);
    const saving = machineSaving + bumpSaving;

    const shippingLabel = selectedOption
        ? formatBRL(selectedOption.price)
        : quote?.mode === 'free'
            ? 'Grátis'
            : quote?.mode === 'combine'
                ? 'A combinar'
                : cepDigits.length === 8
                    ? 'Calculando…'
                    : 'Informe o CEP';

    const goBack = () => {
        setError(null);
        if (step === 0) closeCheckout();
        else setStep((step - 1) as Step);
    };

    const primaryAction = (className = '') => {
        if (screen !== 'form') return null;
        const shared = { className: `vp-btn w-full ${className}`, disabled: busy };
        if (step === 0) return <button type="button" {...shared} onClick={() => setStep(1)} data-track="vacuum_cart_continue" data-track-category="Vacuum Pump">Continuar</button>;
        if (step === 1) return <button type="submit" form={FORM_CONTACT} {...shared}>{busy ? 'Salvando…' : 'Continuar para a entrega'}</button>;
        if (step === 2) return <button type="submit" form={FORM_DELIVERY} {...shared}>{busy ? 'Salvando…' : 'Continuar para o pagamento'}</button>;
        return null;
    };

    const shippingOptions = (
        <div className="space-y-2 text-sm" role="radiogroup" aria-label="Forma de envio">
            {!quote && cepDigits.length === 8 && <p role="status" className="vp-muted">Calculando o frete para o seu CEP…</p>}
            {quote?.mode === 'free' && (
                <div className="vp-option vp-option-on">
                    <Check size={18} className="shrink-0 vp-green" aria-hidden />
                    <span className="flex-1"><b>Frete grátis</b> <span className="vp-muted">para o estado de São Paulo</span></span>
                    <b className="vp-green">Grátis</b>
                </div>
            )}
            {quote?.mode === 'combine' && (
                <div className="vp-option vp-option-on">
                    <Truck size={18} className="shrink-0" aria-hidden />
                    <span className="flex-1"><b>Frete a combinar</b> <span className="vp-muted">no WhatsApp, logo após a compra</span></span>
                </div>
            )}
            {quote?.mode === 'quoted' && quote.options.map((option) => (
                <label key={option.code} className={`vp-option ${option.code === shippingCode ? 'vp-option-on' : ''}`}>
                    <input type="radio" name="vp-shipping" className="h-5 w-5 accent-[var(--vp-red)]" checked={option.code === shippingCode} onChange={() => setShippingCode(option.code)} />
                    <span className="flex-1"><b>{option.name}</b>{option.days > 0 && <span className="vp-muted"> · {option.days} {option.days === 1 ? 'dia útil' : 'dias úteis'} depois do envio</span>}</span>
                    <b className="vp-num">{formatBRL(option.price)}</b>
                </label>
            ))}
            {quote && <p className="text-sm"><b>{offer.delivery_text}</b></p>}
        </div>
    );

    return (
        <div ref={scrollRef} className="vp-root fixed inset-0 z-[100] overflow-y-auto" role="dialog" aria-modal="true" aria-label="Carrinho da Vacuum Pump">
            <header className="vp-dark sticky top-0 z-20">
                <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-3 px-4 py-2">
                    <img src="/logo-wtech-branca.webp" alt="W-Tech" className="h-7 w-auto" />
                    <p className="flex items-center gap-1.5 text-sm font-semibold"><Lock size={15} aria-hidden /> <span className="hidden sm:inline">Compra segura com Mercado Pago</span><span className="sm:hidden">Compra segura</span></p>
                    <button type="button" onClick={closeCheckout} aria-label="Fechar o carrinho" className="grid h-10 w-10 place-items-center hover:bg-white/10"><X size={21} aria-hidden /></button>
                </div>
                <ol className="vp-steps mx-auto max-w-[1120px] overflow-hidden px-3 pb-2.5" aria-label="Etapas da compra">
                    {STEPS.map(({ label, Icon }, index) => {
                        const done = index < currentStep;
                        const on = index === currentStep;
                        const canReturn = done && screen === 'form';
                        return (
                            <React.Fragment key={label}>
                                {index > 0 && <li aria-hidden className={`vp-step-line ${index <= currentStep ? 'vp-step-line-on' : ''}`} />}
                                <li aria-current={on ? 'step' : undefined}>
                                    <button
                                        type="button"
                                        className={`vp-step ${on ? 'vp-step-on' : ''} ${done ? 'vp-step-done' : ''}`}
                                        disabled={!canReturn}
                                        onClick={() => canReturn && setStep(index as Step)}
                                    >
                                        <span className="vp-step-dot">{done ? <Check size={15} strokeWidth={3} aria-hidden /> : <Icon size={15} aria-hidden />}</span>
                                        <span className={on ? '' : 'hidden md:inline'}>{label}</span>
                                    </button>
                                </li>
                            </React.Fragment>
                        );
                    })}
                </ol>
            </header>

            <div className={`mx-auto grid max-w-[1120px] gap-4 px-3 py-4 sm:px-4 lg:grid-cols-[1fr_370px] lg:items-start ${screen === 'form' && step < 3 ? 'pb-32 lg:pb-8' : 'pb-8'}`}>
                {/* Resumo: fixo no computador, recolhido no celular */}
                <aside className="lg:sticky lg:top-[108px] lg:order-2">
                    <div className="vp-plate p-4 sm:p-5">
                        <button type="button" className="flex w-full items-center justify-between gap-3 text-left lg:hidden" aria-expanded={summaryOpen} onClick={() => setSummaryOpen(!summaryOpen)}>
                            <span className="font-bold">Resumo do pedido</span>
                            <span className="flex items-center gap-2 vp-num font-bold">{offer.installments}x de {formatBRL(cart.installment_value)} <ChevronDown size={18} className={summaryOpen ? 'rotate-180' : ''} aria-hidden /></span>
                        </button>
                        <h2 className="hidden font-bold lg:block">Resumo do pedido</h2>
                        <div className={`${summaryOpen ? 'mt-3 block' : 'hidden'} lg:mt-3 lg:block`}>
                            <div className="flex items-center gap-3 border-b border-[var(--vp-line)] pb-3">
                                <img src={VACUUM_IMAGES.square} alt="" width={56} height={56} className="h-14 w-14 shrink-0 object-contain" />
                                <p className="text-sm font-semibold leading-snug">{VACUUM_ITEM_NAME}<br /><span className="font-normal vp-muted">{offer.delivery_text}</span></p>
                            </div>
                            <dl className="mt-3 space-y-1.5 text-sm vp-num">
                                <div className="flex justify-between gap-3"><dt className="vp-muted">Produto</dt><dd>{formatBRL(offer.compare_at ?? offer.price)}</dd></div>
                                {machineSaving > 0 && <div className="flex justify-between gap-3 vp-green"><dt>Desconto Black Friday</dt><dd className="font-semibold">- {formatBRL(machineSaving)}</dd></div>}
                                {selectedBumps.map((bump) => (
                                    <div key={bump.id} className="flex justify-between gap-3">
                                        <dt className="min-w-0 vp-muted">{bump.name} <button type="button" className="vp-link text-xs" onClick={() => toggleBump(bump.id)} aria-label={`Remover ${bump.name}`}>remover</button></dt>
                                        <dd className="shrink-0">{formatBRL(bump.price)}</dd>
                                    </div>
                                ))}
                                <div className="flex justify-between gap-3"><dt className="vp-muted">Frete</dt><dd className={quote?.mode === 'free' ? 'font-semibold vp-green' : ''}>{shippingLabel}</dd></div>
                            </dl>
                        </div>
                        <div className="mt-3 border-t border-[var(--vp-line)] pt-3 vp-num">
                            <p className="vp-display text-right vp-red"><span className="mr-1 text-xl">{offer.installments}x de</span> <span className="text-4xl">{formatBRL(cart.installment_value)}</span></p>
                            <p className="text-right text-sm font-semibold vp-green">sem juros</p>
                            <div className="mt-1.5 flex items-baseline justify-between gap-3 text-sm">
                                <span className="font-bold">Total à vista</span>
                                <span className="text-right">
                                    {saving > 0 && <s className="mr-2 text-xs vp-muted">{formatBRL(cart.total + saving)}</s>}
                                    <b>{formatBRL(cart.total)}</b>
                                </span>
                            </div>
                            {saving > 0 && <p className="mt-1 text-right text-sm font-semibold vp-green">Você economiza {formatBRL(saving)}</p>}
                            {ending && ending.total > 0 && (
                                <p className="mt-2 flex items-center justify-end gap-1.5 text-xs font-semibold vp-red" role="timer"><Timer size={14} aria-hidden /> Preço sobe em {ending.days}d {String(ending.hours).padStart(2, '0')}h {String(ending.minutes).padStart(2, '0')}m {String(ending.seconds).padStart(2, '0')}s</p>
                            )}
                        </div>
                        <div className="mt-4 hidden space-y-2 lg:block">
                            {primaryAction()}
                            {screen === 'form' && <button type="button" className="vp-link block w-full text-center text-sm" onClick={goBack}>{step === 0 ? 'Voltar para a página' : 'Voltar'}</button>}
                        </div>
                        <ul className="mt-4 hidden space-y-1.5 border-t border-[var(--vp-line)] pt-3 text-xs vp-muted lg:block">
                            <li className="flex items-center gap-2"><Lock size={14} className="shrink-0 vp-green" aria-hidden /> Pagamento processado pelo Mercado Pago</li>
                            <li className="flex items-center gap-2"><ShieldCheck size={14} className="shrink-0 vp-green" aria-hidden /> Garantia de {offer.warranty_months} meses direto com o fabricante</li>
                            <li className="flex items-center gap-2"><RotateCcw size={14} className="shrink-0 vp-green" aria-hidden /> 7 dias para desistir depois de receber</li>
                        </ul>
                    </div>
                </aside>

                <main className="min-w-0 space-y-4 lg:order-1">
                    {error && (
                        <div role="alert" className="border-l-4 border-[var(--vp-red)] bg-[#fff1f0] p-3 text-sm">
                            <p>{error}</p>
                            <a href={sellerLink} target="_blank" rel="noreferrer" className="mt-1 inline-block font-semibold underline">
                                Sem limite no cartão? Um vendedor pode dividir em mais de um cartão.
                            </a>
                        </div>
                    )}

                    {screen === 'form' && step === 0 && (
                        <>
                            <section className="vp-plate p-4 sm:p-5">
                                <h1 className="vp-display text-3xl">Seu carrinho</h1>
                                <div className="mt-3 flex gap-3 sm:gap-4">
                                    <div className="grid h-24 w-24 shrink-0 place-items-center bg-[var(--vp-plate-2)] sm:h-32 sm:w-32">
                                        <img src={VACUUM_IMAGES.square} alt="Vacuum Pump Standard" width={128} height={128} className="h-full w-full object-contain" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        {offer.compare_at && <span className="vp-off">Black Friday</span>}
                                        <h2 className="mt-1 font-bold leading-snug sm:text-lg">{VACUUM_ITEM_NAME}</h2>
                                        <p className="text-sm vp-muted">Máquina de vácuo · 220 V · 1 unidade</p>
                                        <p className="text-sm vp-muted">Vendido e entregue por W-Tech Brasil</p>
                                        <div className="mt-2 vp-num">
                                            {offer.compare_at && <s className="block text-xs vp-muted">{formatBRL(offer.compare_at)}</s>}
                                            <p className="vp-display vp-red"><span className="mr-1 text-lg">{offer.installments}x de</span> <span className="text-4xl">{formatBRL(offer.installment_value)}</span></p>
                                            <p className="text-sm"><span className="font-semibold vp-green">sem juros</span> ou {formatBRL(offer.price)} à vista</p>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section className="vp-plate p-4 sm:p-5" aria-labelledby="vp-bumps">
                                <h2 id="vp-bumps" className="vp-display text-3xl">Aproveite e leve junto</h2>
                                <p className="text-sm vp-muted">Toque para adicionar. Entra na mesma parcela, sem juros.</p>
                                <div className="mt-3 space-y-2.5">
                                    {offer.bumps.map((bump) => {
                                        const selected = bumps.includes(bump.id);
                                        return (
                                            <label key={bump.id} className={`vp-bump ${selected ? 'vp-bump-on' : ''}`}>
                                                <input type="checkbox" className="sr-only" checked={selected} onChange={() => toggleBump(bump.id)} data-track={`vacuum_bump_${bump.id}`} data-track-category="Vacuum Pump" />
                                                <ComboImage items={[bump]} small />
                                                <span className="min-w-0">
                                                    <span className="block font-bold leading-snug">{bump.name}</span>
                                                    <span className="mt-0.5 block text-sm vp-muted">{bump.tagline}</span>
                                                    <span className="mt-2 flex flex-wrap items-center justify-between gap-2">
                                                        <span className="vp-num">
                                                            <b className="block text-lg leading-tight vp-red">+ {offer.installments}x de {formatBRL(bump.installment_value)}</b>
                                                            <span className="block text-xs">
                                                                ou {bump.anchor && <s className="vp-muted">{formatBRL(bump.anchor)}</s>} {formatBRL(bump.price)} à vista
                                                            </span>
                                                        </span>
                                                        <span className="vp-bump-toggle">
                                                            {selected ? <><Check size={15} strokeWidth={3} aria-hidden /> Adicionado</> : <><Plus size={15} strokeWidth={3} aria-hidden /> Adicionar</>}
                                                        </span>
                                                    </span>
                                                    {bump.anchor && <span className="mt-1 block text-xs font-semibold vp-green">Esse preço é só comprando junto com a máquina.</span>}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </section>

                            <section className="vp-plate p-4 sm:p-5">
                                <h2 className="flex items-center gap-2 font-bold"><Truck size={18} aria-hidden /> Calcule o frete</h2>
                                <label className="mt-2 block max-w-[220px]">
                                    <span className="sr-only">CEP</span>
                                    <input className="vp-input vp-num" inputMode="numeric" autoComplete="postal-code" placeholder="00000-000" value={address.cep} onChange={(e) => setAddress({ ...address, cep: maskCep(e.target.value) })} />
                                </label>
                                <div className="mt-2">{shippingOptions}</div>
                            </section>
                        </>
                    )}

                    {screen === 'form' && step === 1 && (
                        <form id={FORM_CONTACT} onSubmit={submitContact} noValidate className="vp-plate space-y-4 p-4 sm:p-5">
                            <div>
                                <h1 className="vp-display text-3xl">Seus dados</h1>
                                <p className="text-sm vp-muted">Para o pedido e para falar com você sobre a entrega.</p>
                            </div>
                            <Field label="Nome completo" error={fieldErrors.name}>
                                <input ref={firstField} className="vp-input" autoComplete="name" value={contact.name} aria-invalid={!!fieldErrors.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} />
                            </Field>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field label="WhatsApp com DDD" error={fieldErrors.phone}>
                                    <input className="vp-input vp-num" inputMode="tel" autoComplete="tel-national" placeholder="(11) 99999-9999" value={contact.phone} aria-invalid={!!fieldErrors.phone} onChange={(e) => setContact({ ...contact, phone: maskPhone(e.target.value) })} />
                                </Field>
                                <Field label="E-mail" error={fieldErrors.email}>
                                    <input className="vp-input" type="email" inputMode="email" autoComplete="email" value={contact.email} aria-invalid={!!fieldErrors.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
                                </Field>
                            </div>
                            <p className="text-xs vp-muted">Usamos estes dados para o pedido e para falar com você sobre esta compra pelo WhatsApp e e-mail. Veja a <a className="underline" href="/privacidade" target="_blank" rel="noreferrer">política de privacidade</a>.</p>
                        </form>
                    )}

                    {screen === 'form' && step === 2 && (
                        <form id={FORM_DELIVERY} onSubmit={submitAddress} noValidate className="space-y-4">
                            <section className="vp-plate p-4 sm:p-5">
                                <h1 className="vp-display text-3xl">Endereço de entrega</h1>
                                <div className="mt-3 grid grid-cols-6 gap-3">
                                    <Field label="CEP" error={fieldErrors.cep} className="col-span-3 sm:col-span-2">
                                        <input className="vp-input vp-num" inputMode="numeric" autoComplete="postal-code" autoFocus={!address.cep} value={address.cep} aria-invalid={!!fieldErrors.cep} onChange={(e) => setAddress({ ...address, cep: maskCep(e.target.value) })} />
                                    </Field>
                                    <Field label="UF" error={fieldErrors.state} className="col-span-3 sm:col-span-1">
                                        <input className="vp-input uppercase" maxLength={2} autoComplete="address-level1" value={address.state} aria-invalid={!!fieldErrors.state} onChange={(e) => setAddress({ ...address, state: e.target.value.toUpperCase() })} />
                                    </Field>
                                    <Field label="Cidade" error={fieldErrors.city} className="col-span-6 sm:col-span-3">
                                        <input className="vp-input" autoComplete="address-level2" value={address.city} aria-invalid={!!fieldErrors.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
                                    </Field>
                                    <Field label="Rua" error={fieldErrors.street} className="col-span-6 sm:col-span-4">
                                        <input className="vp-input" autoComplete="address-line1" value={address.street} aria-invalid={!!fieldErrors.street} onChange={(e) => setAddress({ ...address, street: e.target.value })} />
                                    </Field>
                                    <Field label="Número" error={fieldErrors.number} className="col-span-2">
                                        <input className="vp-input" value={address.number} aria-invalid={!!fieldErrors.number} onChange={(e) => setAddress({ ...address, number: e.target.value })} />
                                    </Field>
                                    <Field label="Complemento" className="col-span-4 sm:col-span-3">
                                        <input className="vp-input" autoComplete="address-line2" value={address.complement} onChange={(e) => setAddress({ ...address, complement: e.target.value })} />
                                    </Field>
                                    <Field label="Bairro" className="col-span-6 sm:col-span-3">
                                        <input className="vp-input" value={address.neighborhood} onChange={(e) => setAddress({ ...address, neighborhood: e.target.value })} />
                                    </Field>
                                </div>
                            </section>
                            <section className="vp-plate p-4 sm:p-5">
                                <h2 className="mb-2 font-bold">Forma de entrega</h2>
                                {cepDigits.length === 8 ? shippingOptions : <p className="text-sm vp-muted">Informe o CEP para ver as opções.</p>}
                            </section>
                            <section className="vp-plate p-4 sm:p-5">
                                <h2 className="mb-2 font-bold">Nota fiscal</h2>
                                <Field label="CPF ou CNPJ" error={fieldErrors.doc} className="max-w-[280px]">
                                    <input className="vp-input vp-num" inputMode="numeric" value={doc} aria-invalid={!!fieldErrors.doc} onChange={(e) => setDoc(maskDocument(e.target.value))} />
                                </Field>
                            </section>
                        </form>
                    )}

                    {screen === 'form' && step === 3 && (
                        <>
                            <section className="vp-plate grid gap-4 p-4 text-sm sm:grid-cols-2 sm:p-5">
                                <div>
                                    <p className="flex justify-between gap-3 font-bold">Seus dados <button type="button" className="vp-link font-normal" onClick={() => setStep(1)}>Alterar</button></p>
                                    <p className="mt-1 vp-muted">{contact.name}<br />{contact.phone}<br />{contact.email}</p>
                                </div>
                                <div>
                                    <p className="flex justify-between gap-3 font-bold">Entrega <button type="button" className="vp-link font-normal" onClick={() => setStep(2)}>Alterar</button></p>
                                    <p className="mt-1 vp-muted">{address.street}, {address.number}{address.complement ? ` · ${address.complement}` : ''}<br />{address.city}/{address.state} · CEP {address.cep}<br /><b className="text-[var(--vp-text)]">{offer.delivery_text}</b></p>
                                </div>
                            </section>
                            <section className="vp-plate p-4 sm:p-5">
                                <h1 className="vp-display text-3xl">Forma de pagamento</h1>
                                <p className="mb-3 text-sm vp-muted">Cartão em até {offer.installments}x sem juros, ou Pix com aprovação na hora.</p>
                                {!offer.mp_public_key || brickState === 'failed' ? (
                                    <div className="border border-[var(--vp-line)] p-4 text-sm">
                                        <p className="mb-3">O pagamento online não abriu agora. Um vendedor conclui sua compra nessas mesmas condições.</p>
                                        <a className="vp-btn w-full" href={sellerLink} target="_blank" rel="noreferrer">Chamar um vendedor</a>
                                    </div>
                                ) : (
                                    <>
                                        {(brickState === 'loading' || !quote) && <p className="text-sm vp-muted" role="status">Abrindo o pagamento seguro…</p>}
                                        <div id={BRICK_CONTAINER} />
                                    </>
                                )}
                                <p className="mt-3 text-xs vp-muted">Ao pagar, você concorda com os <a className="underline" href="/termos" target="_blank" rel="noreferrer">Termos</a> e a <a className="underline" href="/privacidade" target="_blank" rel="noreferrer">Política de privacidade</a>. Os dados do cartão são digitados direto no Mercado Pago.</p>
                            </section>
                            <button type="button" className="vp-link text-sm lg:hidden" onClick={goBack}>Voltar</button>
                        </>
                    )}

                    {screen === 'pix' && pix && (
                        <section className="vp-plate p-4 sm:p-6">
                            <div className="text-center">
                                <CheckCircle2 size={40} className="mx-auto vp-green" aria-hidden />
                                <h1 className="vp-display mt-2 text-4xl">Pedido feito. Agora é só pagar o Pix.</h1>
                            </div>
                            <div className="mt-5 grid items-center gap-5 sm:grid-cols-[260px_1fr]">
                                {pix.qr_code_base64 && (
                                    <img src={`data:image/png;base64,${pix.qr_code_base64}`} alt="QR Code do Pix" width={260} height={260} className="mx-auto border border-[var(--vp-line)] bg-white p-2" />
                                )}
                                <div className="space-y-3">
                                    <p className="flex items-start gap-2 bg-[#fff1f0] p-3 text-sm font-semibold vp-red" role="status">
                                        <Timer size={18} className="shrink-0" aria-hidden />
                                        {pixLeft && pixLeft.total > 0 ? `O código vale por mais ${pixTimeLeft(pixLeft)}. Esta tela confirma sozinha quando o pagamento cair.` : 'Este código venceu.'}
                                    </p>
                                    <p className="text-sm vp-muted">Abra o aplicativo do seu banco, escaneie o QR Code ou copie o código abaixo.</p>
                                    {pix.qr_code && (
                                        <>
                                            <textarea readOnly value={pix.qr_code} rows={3} aria-label="Código Pix copia e cola" className="vp-input !h-auto p-3 text-xs" />
                                            <button type="button" className="vp-btn w-full" onClick={copyPix}>
                                                {copied ? <><Check size={20} aria-hidden /> Código copiado</> : <><Copy size={20} aria-hidden /> Copiar código Pix</>}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </section>
                    )}

                    {screen === 'review' && (
                        <section className="vp-plate p-6 text-center" role="status">
                            <h1 className="vp-display text-4xl">Pagamento em análise</h1>
                            <p className="mx-auto mt-3 max-w-md vp-muted">O Mercado Pago está confirmando seu pagamento. Pode levar alguns minutos. Esta tela atualiza sozinha e você também recebe a confirmação por e-mail.</p>
                        </section>
                    )}

                    {offer.legal_line && <p className="px-1 text-xs vp-muted">{offer.legal_line}</p>}
                </main>
            </div>

            {/* Continuar sempre à mão no celular */}
            {screen === 'form' && step < 3 && (
                <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--vp-line)] bg-white p-3 lg:hidden">
                    <div className="mb-2 flex items-baseline justify-between gap-3 vp-num">
                        <button type="button" className="vp-link text-sm" onClick={goBack}>Voltar</button>
                        <span className="text-right text-sm"><b className="text-base vp-red">{offer.installments}x de {formatBRL(cart.installment_value)}</b> ou {formatBRL(cart.total)}</span>
                    </div>
                    {primaryAction('!min-h-[52px]')}
                </div>
            )}
        </div>
    );
};

export default VacuumCheckout;
