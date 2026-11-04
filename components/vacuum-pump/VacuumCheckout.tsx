import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronLeft, Copy, Lock, ShieldCheck, X } from 'lucide-react';
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
    onClose: () => void;
    onOfferChanged: () => void;
}

type Step = 1 | 2 | 3;
type Screen = 'form' | 'pix' | 'review';

const Field: React.FC<{ label: string; error?: string; children: React.ReactNode; className?: string }> = ({ label, error, children, className }) => (
    <label className={`block ${className || ''}`}>
        <span className="vp-field-label">{label}</span>
        {children}
        {error && <span role="alert" className="mt-1 block text-sm vp-red">{error}</span>}
    </label>
);

const VacuumCheckout: React.FC<Props> = ({ offer, now, onClose, onOfferChanged }) => {
    const navigate = useNavigate();
    const [step, setStep] = useState<Step>(1);
    const [screen, setScreen] = useState<Screen>('form');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const [checkoutId, setCheckoutId] = useState<string | null>(null);
    const [contact, setContact] = useState({ name: '', phone: '', email: '' });
    const [doc, setDoc] = useState('');
    const [address, setAddress] = useState({ cep: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '' });
    const [bumps, setBumps] = useState<string[]>([]);
    const [pix, setPix] = useState<VacuumPix | null>(null);
    const [copied, setCopied] = useState(false);
    const [brickState, setBrickState] = useState<'idle' | 'loading' | 'ready' | 'failed'>('idle');
    const [quote, setQuote] = useState<VacuumShippingQuote | null>(null);
    const [shippingCode, setShippingCode] = useState<string | null>(null);
    const [quoteNonce, setQuoteNonce] = useState(0);

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
        firstField.current?.focus();
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = previous;
            window.removeEventListener('keydown', onKey);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const goToThanks = useCallback(
        (id: string) => navigate(`/maquina-de-vacuo/obrigado?c=${encodeURIComponent(id)}`),
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

    const lookupCep = async (value: string) => {
        const cep = value.replace(/\D/g, '');
        if (cep.length !== 8) return;
        try {
            const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const data = await res.json();
            if (data && !data.erro) {
                setAddress((prev) => ({
                    ...prev,
                    street: data.logradouro || prev.street,
                    neighborhood: data.bairro || prev.neighborhood,
                    city: data.localidade || prev.city,
                    state: data.uf || prev.state,
                }));
            }
        } catch {
            /* CEP fora do ar: o cliente preenche à mão */
        }
    };

    const submitAddress = async (event: React.FormEvent) => {
        event.preventDefault();
        const errors: Record<string, string> = {};
        if (!documentType(doc)) errors.doc = 'CPF ou CNPJ inválido.';
        if (address.cep.replace(/\D/g, '').length !== 8) errors.cep = 'CEP inválido.';
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

    // Frete: cotado ao chegar no pagamento e de novo se os adicionais mudarem o peso.
    useEffect(() => {
        if (step !== 3) return;
        let cancelled = false;
        vacuumApi
            .shipping({ cep: address.cep, bumps })
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
    }, [step, address.cep, bumps, quoteNonce]);

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
                                theme: 'dark',
                                customVariables: { baseColor: '#e60000', buttonTextColor: '#ffffff', formBackgroundColor: '#17171b', borderRadiusMedium: '2px', borderRadiusLarge: '2px' },
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

    return (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/85 md:p-6" role="dialog" aria-modal="true" aria-label="Finalizar compra da Vacuum Pump">
            <div className="vp-root relative mx-auto min-h-full w-full max-w-[1020px] md:min-h-0">
                <div className="flex items-center justify-between gap-3 border-b border-white/15 bg-[var(--vp-plate)] px-4 py-3 md:px-6">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                        <Lock size={16} aria-hidden /> Compra segura com Mercado Pago
                    </div>
                    <button type="button" onClick={onClose} aria-label="Fechar" className="grid h-11 w-11 place-items-center rounded-sm hover:bg-white/10">
                        <X size={22} aria-hidden />
                    </button>
                </div>

                <div className="grid md:grid-cols-[1fr_340px]">
                    <div className="order-2 p-4 md:order-1 md:p-7">
                        {screen === 'form' && (
                            <ol className="mb-6 flex items-center gap-2 vp-label" aria-label="Etapas">
                                {['Contato', 'Entrega', 'Pagamento'].map((label, index) => {
                                    const n = (index + 1) as Step;
                                    return (
                                        <li key={label} aria-current={step === n ? 'step' : undefined} className={`flex flex-1 items-center gap-2 border-b-2 pb-2 ${step >= n ? 'border-[var(--vp-red)] text-white' : 'border-white/15 vp-muted'}`}>
                                            <span className="vp-num">{n}</span> <span className="truncate">{label}</span>
                                        </li>
                                    );
                                })}
                            </ol>
                        )}

                        {error && (
                            <div role="alert" className="mb-5 border-l-4 border-[var(--vp-red)] bg-[#2a0d0e] p-3 text-sm">
                                <p>{error}</p>
                                <a href={sellerLink} target="_blank" rel="noreferrer" className="mt-1 inline-block font-semibold underline">
                                    Sem limite no cartão? Um vendedor pode dividir em mais de um cartão.
                                </a>
                            </div>
                        )}

                        {screen === 'form' && step === 1 && (
                            <form onSubmit={submitContact} noValidate className="space-y-4">
                                <h2 className="vp-display text-4xl">Para quem é a máquina?</h2>
                                <Field label="Nome completo" error={fieldErrors.name}>
                                    <input ref={firstField} className="vp-input" autoComplete="name" value={contact.name} aria-invalid={!!fieldErrors.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} />
                                </Field>
                                <Field label="WhatsApp com DDD" error={fieldErrors.phone}>
                                    <input className="vp-input vp-num" inputMode="tel" autoComplete="tel-national" placeholder="(11) 99999-9999" value={contact.phone} aria-invalid={!!fieldErrors.phone} onChange={(e) => setContact({ ...contact, phone: maskPhone(e.target.value) })} />
                                </Field>
                                <Field label="E-mail" error={fieldErrors.email}>
                                    <input className="vp-input" type="email" inputMode="email" autoComplete="email" value={contact.email} aria-invalid={!!fieldErrors.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
                                </Field>
                                <button type="submit" className="vp-btn w-full" disabled={busy}>{busy ? 'Salvando…' : 'Continuar para a entrega'}</button>
                                <p className="text-xs vp-muted">Usamos estes dados para o pedido e para falar com você sobre esta compra pelo WhatsApp e e-mail. Veja a <a className="underline" href="/privacidade" target="_blank" rel="noreferrer">política de privacidade</a>.</p>
                            </form>
                        )}

                        {screen === 'form' && step === 2 && (
                            <form onSubmit={submitAddress} noValidate className="space-y-4">
                                <h2 className="vp-display text-4xl">Para onde vai?</h2>
                                <Field label="CPF ou CNPJ (para a nota fiscal)" error={fieldErrors.doc}>
                                    <input className="vp-input vp-num" inputMode="numeric" autoFocus value={doc} aria-invalid={!!fieldErrors.doc} onChange={(e) => setDoc(maskDocument(e.target.value))} />
                                </Field>
                                <div className="grid grid-cols-6 gap-3">
                                    <Field label="CEP" error={fieldErrors.cep} className="col-span-3">
                                        <input className="vp-input vp-num" inputMode="numeric" autoComplete="postal-code" value={address.cep} aria-invalid={!!fieldErrors.cep} onChange={(e) => { const cep = maskCep(e.target.value); setAddress({ ...address, cep }); void lookupCep(cep); }} />
                                    </Field>
                                    <Field label="UF" error={fieldErrors.state} className="col-span-3">
                                        <input className="vp-input uppercase" maxLength={2} autoComplete="address-level1" value={address.state} aria-invalid={!!fieldErrors.state} onChange={(e) => setAddress({ ...address, state: e.target.value.toUpperCase() })} />
                                    </Field>
                                    <Field label="Rua" error={fieldErrors.street} className="col-span-6">
                                        <input className="vp-input" autoComplete="address-line1" value={address.street} aria-invalid={!!fieldErrors.street} onChange={(e) => setAddress({ ...address, street: e.target.value })} />
                                    </Field>
                                    <Field label="Número" error={fieldErrors.number} className="col-span-2">
                                        <input className="vp-input" value={address.number} aria-invalid={!!fieldErrors.number} onChange={(e) => setAddress({ ...address, number: e.target.value })} />
                                    </Field>
                                    <Field label="Complemento" className="col-span-4">
                                        <input className="vp-input" autoComplete="address-line2" value={address.complement} onChange={(e) => setAddress({ ...address, complement: e.target.value })} />
                                    </Field>
                                    <Field label="Bairro" className="col-span-3">
                                        <input className="vp-input" value={address.neighborhood} onChange={(e) => setAddress({ ...address, neighborhood: e.target.value })} />
                                    </Field>
                                    <Field label="Cidade" error={fieldErrors.city} className="col-span-3">
                                        <input className="vp-input" autoComplete="address-level2" value={address.city} aria-invalid={!!fieldErrors.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
                                    </Field>
                                </div>
                                <p className="text-sm vp-muted">{offer.shipping_note}</p>
                                <div className="flex gap-3">
                                    <button type="button" className="vp-btn vp-btn-ghost" onClick={() => setStep(1)} aria-label="Voltar para contato"><ChevronLeft size={20} aria-hidden /></button>
                                    <button type="submit" className="vp-btn flex-1" disabled={busy}>{busy ? 'Salvando…' : 'Continuar para o pagamento'}</button>
                                </div>
                            </form>
                        )}

                        {screen === 'form' && step === 3 && (
                            <div>
                                <div className="mb-3 flex items-center gap-3">
                                    <button type="button" className="vp-btn vp-btn-ghost !min-h-[44px] !px-3" onClick={() => setStep(2)} aria-label="Voltar para entrega"><ChevronLeft size={20} aria-hidden /></button>
                                    <h2 className="vp-display text-4xl">Aproveite e leve junto</h2>
                                </div>
                                <div className="mb-6 space-y-3">
                                    {offer.bumps.map((bump) => {
                                        const selected = bumps.includes(bump.id);
                                        return (
                                            <label key={bump.id} className={`vp-plate block cursor-pointer ${selected ? 'vp-plate-red' : ''}`}>
                                                <span className="flex gap-3 p-4">
                                                    <input type="checkbox" className="peer sr-only" checked={selected} onChange={() => toggleBump(bump.id)} />
                                                    <span aria-hidden className={`mt-1 grid h-7 w-7 shrink-0 place-items-center border-2 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-white ${selected ? 'border-[var(--vp-red)] bg-[var(--vp-red)]' : 'border-white/50'}`}>
                                                        {selected && <Check size={18} strokeWidth={3} />}
                                                    </span>
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block font-bold leading-snug">{bump.name}</span>
                                                        <span className="mt-0.5 block text-sm vp-muted">{bump.tagline}</span>
                                                        <span className="mt-2 flex flex-wrap items-baseline gap-x-2">
                                                            <span className="vp-display vp-num text-2xl text-white">+ {formatBRL(bump.installment_value)} <span className="text-base">na parcela</span></span>
                                                            <span className="text-sm vp-muted vp-num">
                                                                {bump.anchor ? <><s>{formatBRL(bump.anchor)}</s> por </> : null}{formatBRL(bump.price)}
                                                            </span>
                                                        </span>
                                                        {bump.anchor && <span className="mt-1 block text-xs font-semibold vp-red">Esse preço é só comprando junto com a máquina.</span>}
                                                    </span>
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                                <h3 className="vp-label mb-3">Entrega</h3>
                                <div className="mb-6 text-sm">
                                    {!quote && <p role="status" className="vp-muted">Calculando o frete para o seu CEP…</p>}
                                    {quote?.mode === 'free' && (
                                        <p className="flex items-center gap-2 font-semibold"><Check size={18} className="shrink-0" aria-hidden /> Frete grátis para o estado de São Paulo</p>
                                    )}
                                    {quote?.mode === 'combine' && (
                                        <p className="vp-muted">Frete a combinar: nossa equipe fala com você no WhatsApp logo após a compra.</p>
                                    )}
                                    {quote?.mode === 'quoted' && (
                                        <div className="space-y-2" role="radiogroup" aria-label="Forma de envio">
                                            {quote.options.map((option) => (
                                                <label key={option.code} className={`flex cursor-pointer items-center justify-between gap-3 border p-3 ${option.code === shippingCode ? 'border-[var(--vp-red)]' : 'border-white/15'}`}>
                                                    <span className="flex items-center gap-3">
                                                        <input type="radio" name="vp-shipping" className="h-5 w-5 accent-[var(--vp-red)]" checked={option.code === shippingCode} onChange={() => setShippingCode(option.code)} />
                                                        <span><b>{option.name}</b>{option.days > 0 && <span className="vp-muted"> · {option.days} {option.days === 1 ? 'dia útil' : 'dias úteis'} depois do envio</span>}</span>
                                                    </span>
                                                    <span className="vp-num font-semibold shrink-0">{formatBRL(option.price)}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <h3 className="vp-label mb-3">Pagamento</h3>
                                {!offer.mp_public_key || brickState === 'failed' ? (
                                    <div className="border border-white/15 p-4 text-sm">
                                        <p className="mb-3">O pagamento online não abriu agora. Um vendedor conclui sua compra nessas mesmas condições.</p>
                                        <a className="vp-btn w-full" href={sellerLink} target="_blank" rel="noreferrer">Chamar um vendedor</a>
                                    </div>
                                ) : (
                                    <>
                                        {brickState === 'loading' && <p className="text-sm vp-muted" role="status">Abrindo o pagamento seguro…</p>}
                                        <div id={BRICK_CONTAINER} />
                                    </>
                                )}
                            </div>
                        )}

                        {screen === 'pix' && pix && (
                            <div className="text-center">
                                <h2 className="vp-display text-4xl">Pague o Pix para garantir</h2>
                                <p className="mt-2 text-sm vp-muted" role="status">
                                    {pixLeft && pixLeft.total > 0
                                        ? `O código vale por mais ${pixLeft.minutes} min ${String(pixLeft.seconds).padStart(2, '0')} s. Esta tela confirma sozinha quando o pagamento cair.`
                                        : 'Este código venceu.'}
                                </p>
                                {pix.qr_code_base64 && (
                                    <img src={`data:image/png;base64,${pix.qr_code_base64}`} alt="QR Code do Pix" width={260} height={260} className="mx-auto my-5 bg-white p-2" />
                                )}
                                {pix.qr_code && (
                                    <>
                                        <textarea readOnly value={pix.qr_code} rows={3} aria-label="Código Pix copia e cola" className="vp-input !h-auto p-3 text-xs" />
                                        <button type="button" className="vp-btn mt-3 w-full" onClick={copyPix}>
                                            {copied ? <><Check size={20} aria-hidden /> Código copiado</> : <><Copy size={20} aria-hidden /> Copiar código Pix</>}
                                        </button>
                                    </>
                                )}
                            </div>
                        )}

                        {screen === 'review' && (
                            <div className="py-6 text-center" role="status">
                                <h2 className="vp-display text-4xl">Pagamento em análise</h2>
                                <p className="mx-auto mt-3 max-w-md vp-muted">O Mercado Pago está confirmando seu pagamento. Pode levar alguns minutos. Esta tela atualiza sozinha e você também recebe a confirmação por e-mail.</p>
                            </div>
                        )}
                    </div>

                    <aside className="order-1 border-b border-white/15 bg-[var(--vp-plate)] p-4 md:order-2 md:border-b-0 md:border-l md:p-6">
                        <h2 className="vp-label mb-3 vp-muted">Seu pedido</h2>
                        <ul className="space-y-2 text-sm">
                            {cart.items.map((item) => (
                                <li key={item.id} className="flex justify-between gap-3">
                                    <span>{item.name}</span>
                                    <span className="vp-num shrink-0">{formatBRL(item.price)}</span>
                                </li>
                            ))}
                            {step === 3 && quote && (
                                <li className="flex justify-between gap-3">
                                    <span>Frete{selectedOption ? ` (${selectedOption.name})` : ''}</span>
                                    <span className="vp-num shrink-0">{selectedOption ? formatBRL(selectedOption.price) : quote.mode === 'free' ? 'Grátis' : 'A combinar'}</span>
                                </li>
                            )}
                        </ul>
                        <div className="mt-4 border-t border-white/15 pt-4">
                            <div className="vp-label vp-muted">{offer.installments}x sem juros de</div>
                            <div className="vp-display vp-num text-5xl md:text-6xl">{formatBRL(cart.installment_value)}</div>
                            <div className="mt-1 text-sm vp-muted vp-num">Total {formatBRL(cart.total)} no cartão ou no Pix</div>
                        </div>
                        {ending && ending.total > 0 && (
                            <p className="mt-4 hidden text-sm font-semibold md:block vp-num" role="timer">
                                <span className="vp-red">Preço sobe em {ending.days}d {String(ending.hours).padStart(2, '0')}h {String(ending.minutes).padStart(2, '0')}m {String(ending.seconds).padStart(2, '0')}s</span>
                            </p>
                        )}
                        <ul className="mt-4 hidden space-y-2 text-sm vp-muted md:block">
                            <li className="flex gap-2"><ShieldCheck size={18} className="shrink-0" aria-hidden /> Garantia de {offer.warranty_months} meses</li>
                            <li className="flex gap-2"><Check size={18} className="shrink-0" aria-hidden /> {offer.delivery_text}</li>
                        </ul>
                    </aside>
                </div>
            </div>
        </div>
    );
};

export default VacuumCheckout;
