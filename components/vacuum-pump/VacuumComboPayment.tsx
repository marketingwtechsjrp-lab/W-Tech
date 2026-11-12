import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, CreditCard, Lock, QrCode } from 'lucide-react';
import { COMBO_MAX_CARDS, COMBO_MIN_PART, checkComboPlan, comboPixDiscount, maxInstallmentsFor } from '../../lib/vacuumCombo';
import { documentType, formatBRL, roundCents, type VacuumCart } from '../../lib/vacuumOffer';
import { loadMercadoPagoSdk, type MercadoPagoBrick } from './mercadoPagoSdk';
import { vacuumApi, type VacuumOffer, type VacuumPix } from './vacuumApi';
import { trackCheckoutProblem } from './vacuumCheckoutTracking';

/**
 * Pagamento combinado: parte no Pix (opcional) e de 1 a 3 cartões. A pessoa monta a divisão,
 * digita um cartão por vez no formulário do Mercado Pago e só no último o servidor cobra.
 * Lá os cartões são reservados primeiro, e nada é cobrado pela metade (api/_vacuumCombo.ts).
 */

const COMBO_BRICK = 'vp-combo-brick';

interface Props {
    offer: VacuumOffer;
    cart: VacuumCart;
    contact: { name: string; email: string };
    doc: string;
    checkoutId: string | null;
    shippingCode: string | null;
    onPaid: () => void;
    onReview: () => void;
    onPix: (pix: VacuumPix, amount: number) => void;
    onFailed: (message: string, code?: string) => void;
    /** Total que a pessoa paga com a divisão atual (o Pix da parte tem desconto), ou null se a divisão não fecha. */
    onTotalChange: (total: number | null) => void;
}

interface TypedCard {
    formData: Record<string, unknown>;
    lastFour: string | null;
}

/** "1.234,56", "1234.56" ou "1234" viram número. */
function parseMoney(text: string): number {
    const clean = text.replace(/[^\d,.]/g, '');
    const normalized = clean.includes(',') ? clean.replace(/\./g, '').replace(',', '.') : clean;
    return roundCents(Number(normalized) || 0);
}

function moneyText(value: number): string {
    return value.toFixed(2).replace('.', ',');
}

/** Divide igualmente; o último cartão fica com os centavos que sobram. */
function evenSplit(remaining: number, count: number): string[] {
    const each = Math.floor((remaining / count) * 100) / 100;
    return Array.from({ length: count - 1 }, () => moneyText(each));
}

const VacuumComboPayment: React.FC<Props> = ({ offer, cart, contact, doc, checkoutId, shippingCode, onPaid, onReview, onPix, onFailed, onTotalChange }) => {
    const pct = offer.pix_discount_pct;
    const [usePix, setUsePix] = useState(false);
    const [pixText, setPixText] = useState(() => moneyText(Math.floor(cart.total / 2)));
    const [count, setCount] = useState(2);
    const [amountsText, setAmountsText] = useState<string[]>(() => evenSplit(cart.total, 2));
    const [chosen, setChosen] = useState<(number | null)[]>([null, null, null]);
    /** 'plan': montando a divisão; número: índice do cartão sendo digitado. */
    const [phase, setPhase] = useState<'plan' | number>('plan');
    const [typed, setTyped] = useState<TypedCard[]>([]);
    const [busy, setBusy] = useState(false);
    const [brickState, setBrickState] = useState<'loading' | 'ready' | 'failed'>('loading');

    const pixValue = usePix ? parseMoney(pixText) : 0;
    const cards = useMemo(() => {
        const fixed = amountsText.slice(0, count - 1).map(parseMoney);
        const last = roundCents(cart.total - pixValue - fixed.reduce((sum, value) => sum + value, 0));
        return [...fixed, last].map((amount, index) => {
            const max = maxInstallmentsFor(amount, offer.installments);
            return { amount, installments: Math.min(chosen[index] ?? max, max) };
        });
    }, [amountsText, count, cart.total, pixValue, chosen, offer.installments]);
    const minPart = offer.combo_min_part ?? COMBO_MIN_PART;
    const check = useMemo(() => checkComboPlan(cart, offer.installments, pixValue, cards, minPart), [cart, offer.installments, pixValue, cards, minPart]);
    const plan = check.plan;

    useEffect(() => {
        onTotalChange(plan ? plan.total : null);
    }, [plan, onTotalChange]);
    useEffect(() => () => onTotalChange(null), [onTotalChange]);

    // Carrinho mudou (adicional, frete, preço): a divisão recomeça, e cartões já digitados também.
    const resplit = (nextCount: number, nextPix: number) => {
        setAmountsText(evenSplit(Math.max(0, cart.total - nextPix), nextCount));
        setChosen([null, null, null]);
        setPhase('plan');
        setTyped([]);
    };
    const totalRef = useRef(cart.total);
    useEffect(() => {
        if (totalRef.current === cart.total) return;
        totalRef.current = cart.total;
        resplit(count, pixValue);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cart.total]);

    // O formulário do cartão chama de volta só uma vez por montagem: lê daqui o estado atual.
    const latest = useRef({ plan, typed, cart, checkoutId, shippingCode });
    latest.current = { plan, typed, cart, checkoutId, shippingCode };

    const submitAll = async (allCards: TypedCard[]) => {
        const { plan: currentPlan, cart: currentCart, checkoutId: id, shippingCode: code } = latest.current;
        if (!currentPlan || !id) {
            onFailed('Confira os valores da divisão e tente de novo.');
            return;
        }
        setBusy(true);
        try {
            const result = await vacuumApi.payCombo({
                checkout_id: id,
                bumps: currentCart.bump_ids,
                shipping_service: code,
                expected_total: currentPlan.total,
                attempt_key: crypto.randomUUID(),
                pix_value: currentPlan.pixValue,
                cards: currentPlan.cards.map((card, index) => ({ ...card, form_data: allCards[index].formData })),
            });
            if (result.stage === 'paid') return onPaid();
            if (result.stage === 'review') return onReview();
            if (result.stage === 'pix_pending' && result.pix) return onPix(result.pix, result.combo_pix_amount ?? currentPlan.pixCharge);
            // Recusado: os dados de cartão valem uma vez só, então todos são digitados de novo.
            setPhase('plan');
            setTyped([]);
            onFailed(result.message || result.error || 'O pagamento não foi aprovado. Nenhum valor foi cobrado.', result.code);
        } catch (err) {
            setPhase('plan');
            setTyped([]);
            onFailed('Não foi possível concluir agora. Nenhum valor foi cobrado. Tente de novo ou chame um vendedor.', err instanceof Error ? err.message : undefined);
        } finally {
            setBusy(false);
        }
    };

    const submitRef = useRef(submitAll);
    submitRef.current = submitAll;

    // Um formulário do Mercado Pago por vez, para o cartão da vez.
    useEffect(() => {
        if (typeof phase !== 'number' || !plan) return;
        const card = plan.cards[phase];
        const isLast = phase === plan.cards.length - 1;
        if (!offer.mp_public_key) {
            setBrickState('failed');
            return;
        }
        let cancelled = false;
        let brick: MercadoPagoBrick | null = null;
        setBrickState('loading');
        (async () => {
            try {
                await loadMercadoPagoSdk();
                if (cancelled || !window.MercadoPago) return;
                const docKind = documentType(doc);
                const mp = new window.MercadoPago(offer.mp_public_key as string, { locale: 'pt-BR' });
                brick = await mp.bricks().create('cardPayment', COMBO_BRICK, {
                    initialization: {
                        amount: card.amount,
                        payer: {
                            email: contact.email,
                            ...(docKind ? { identification: { type: docKind, number: doc.replace(/\D/g, '') } } : {}),
                        },
                    },
                    customization: {
                        visual: {
                            style: {
                                theme: 'default',
                                customVariables: { baseColor: '#e60000', buttonTextColor: '#ffffff', borderRadiusMedium: '2px', borderRadiusLarge: '2px' },
                            },
                            hideFormTitle: true,
                            texts: { formSubmit: isLast ? 'Pagar agora' : `Confirmar cartão ${phase + 1}` },
                        },
                        // A reserva do valor (capture: false) só vale no crédito. Parcelas vêm do nosso seletor.
                        paymentMethods: { maxInstallments: 1, types: { excluded: ['debit_card'] } },
                    },
                    callbacks: {
                        onReady: () => {
                            if (!cancelled) setBrickState('ready');
                        },
                        onError: (brickError: { cause?: unknown; message?: unknown } | undefined) => {
                            console.error('[Vacuum] Brick do pagamento combinado:', brickError);
                            trackCheckoutProblem('combo_brick_error', brickError?.cause ?? brickError?.message);
                        },
                        onSubmit: async (formData: Record<string, unknown>, additional?: { lastFourDigits?: string }) => {
                            const entry: TypedCard = { formData, lastFour: additional?.lastFourDigits ?? null };
                            const all = [...latest.current.typed.slice(0, phase), entry];
                            if (!isLast) {
                                setTyped(all);
                                setPhase(phase + 1);
                                return;
                            }
                            setTyped(all);
                            await submitRef.current(all);
                        },
                    },
                });
                if (cancelled) brick.unmount();
            } catch (err) {
                console.error('[Vacuum] Não foi possível abrir o cartão do pagamento combinado:', err);
                trackCheckoutProblem('combo_brick_failed', err instanceof Error ? err.message : undefined);
                if (!cancelled) setBrickState('failed');
            }
        })();
        return () => {
            cancelled = true;
            brick?.unmount();
        };
        // Recria só ao trocar de cartão: o plano fica travado enquanto os cartões são digitados.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase, offer.mp_public_key]);

    const editing = phase === 'plan';
    const pixDiscount = comboPixDiscount(cart, pixValue);

    if (typeof phase === 'number' && plan) {
        const card = plan.cards[phase];
        return (
            <div className="mt-4 space-y-3">
                <ol className="space-y-1.5 text-sm vp-num">
                    {plan.pixValue > 0 && (
                        <li className="flex items-center gap-2"><QrCode size={16} className="shrink-0" aria-hidden /> Pix: {formatBRL(plan.pixCharge)} <span className="vp-muted">(QR Code depois dos cartões)</span></li>
                    )}
                    {plan.cards.map((item, index) => (
                        <li key={index} className={`flex items-center gap-2 ${index === phase ? 'font-bold' : ''}`}>
                            {index < phase ? <Check size={16} className="shrink-0 vp-green" aria-hidden /> : <CreditCard size={16} className="shrink-0" aria-hidden />}
                            Cartão {index + 1}: {formatBRL(item.amount)} em {item.installments}x
                            {index < phase && typed[index]?.lastFour && <span className="vp-muted">· final {typed[index].lastFour}</span>}
                        </li>
                    ))}
                </ol>
                <p className="font-bold">Cartão {phase + 1} de {plan.cards.length}: {formatBRL(card.amount)} em {card.installments}x{card.installments > 1 ? ' sem juros' : ''}</p>
                {busy && <p className="text-sm font-semibold" role="status">Confirmando os pagamentos. Não feche esta tela…</p>}
                {brickState === 'loading' && !busy && <p className="text-sm vp-muted" role="status">Abrindo o pagamento seguro…</p>}
                {brickState === 'failed' && <p className="text-sm vp-red" role="alert">O formulário do cartão não abriu. Volte e tente de novo, ou chame um vendedor.</p>}
                <div key={phase} id={COMBO_BRICK} className={busy ? 'pointer-events-none opacity-60' : ''} />
                <p className="flex items-start gap-2 text-xs vp-muted"><Lock size={14} className="mt-0.5 shrink-0 vp-green" aria-hidden /> Os cartões só são cobrados quando todas as partes forem aprovadas. Se uma falhar, nada fica cobrado.</p>
                {!busy && (
                    <button type="button" className="vp-link text-sm" onClick={() => { setPhase('plan'); setTyped([]); }}>
                        Voltar e mudar a divisão
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="mt-4 space-y-4">
            <label className={`vp-option ${usePix ? 'vp-option-on' : ''}`}>
                <input
                    type="checkbox"
                    className="h-5 w-5 accent-[var(--vp-red)]"
                    checked={usePix}
                    onChange={(event) => {
                        const next = event.target.checked;
                        setUsePix(next);
                        const nextCount = next ? Math.max(1, count - 1) : Math.max(2, count);
                        setCount(nextCount);
                        resplit(nextCount, next ? parseMoney(pixText) : 0);
                    }}
                    data-track="vacuum_combo_pix"
                    data-track-category="Vacuum Pump"
                />
                <QrCode size={20} className="shrink-0" aria-hidden />
                <span className="flex-1"><b>Pagar uma parte no Pix</b>{pct > 0 && <span className="block text-sm vp-muted">Sem desconto: os {pct}% valem só com o pedido inteiro no Pix</span>}</span>
            </label>

            {usePix && (
                <label className="block max-w-[320px]">
                    <span className="vp-field-label">Quanto do pedido no Pix? (R$)</span>
                    <input
                        className="vp-input vp-num"
                        inputMode="decimal"
                        value={pixText}
                        onChange={(event) => setPixText(event.target.value)}
                        onBlur={() => resplit(count, pixValue)}
                    />
                    {pixValue > 0 && <span className="mt-1 block text-sm vp-num">Você paga <b>{formatBRL(roundCents(pixValue - pixDiscount))}</b> no Pix{pixDiscount > 0 && <span className="vp-green"> (economiza {formatBRL(pixDiscount)})</span>}</span>}
                </label>
            )}

            <div>
                <span className="vp-field-label">Quantos cartões?</span>
                <div className="flex gap-2" role="radiogroup" aria-label="Quantos cartões">
                    {Array.from({ length: COMBO_MAX_CARDS }, (_, index) => index + 1)
                        .filter((option) => usePix || option >= 2)
                        .map((option) => (
                            <label key={option} className={`vp-option flex-1 justify-center ${count === option ? 'vp-option-on' : ''}`}>
                                <input
                                    type="radio"
                                    name="vp-combo-count"
                                    className="sr-only"
                                    checked={count === option}
                                    onChange={() => {
                                        setCount(option);
                                        resplit(option, pixValue);
                                    }}
                                />
                                <b>{option}</b>
                            </label>
                        ))}
                </div>
            </div>

            <div className="space-y-3">
                {cards.map((card, index) => {
                    const isLast = index === cards.length - 1;
                    const max = maxInstallmentsFor(card.amount, offer.installments);
                    return (
                        <fieldset key={index} className="grid gap-2 border border-[var(--vp-line)] p-3 sm:grid-cols-2">
                            <legend className="px-1 text-sm font-bold">Cartão {index + 1}</legend>
                            <label className="block">
                                <span className="vp-field-label">Valor (R$)</span>
                                {isLast ? (
                                    <input className="vp-input vp-num bg-[var(--vp-plate-2)]" readOnly value={moneyText(Math.max(0, card.amount))} aria-describedby={`vp-combo-rest-${index}`} />
                                ) : (
                                    <input
                                        className="vp-input vp-num"
                                        inputMode="decimal"
                                        value={amountsText[index] ?? ''}
                                        onChange={(event) => setAmountsText(amountsText.map((text, position) => (position === index ? event.target.value : text)))}
                                    />
                                )}
                                {isLast && <span id={`vp-combo-rest-${index}`} className="mt-1 block text-xs vp-muted">O que falta para fechar o pedido</span>}
                            </label>
                            <label className="block">
                                <span className="vp-field-label">Parcelas</span>
                                <select
                                    className="vp-input vp-num"
                                    value={card.installments}
                                    onChange={(event) => setChosen(chosen.map((value, position) => (position === index ? Number(event.target.value) : value)))}
                                >
                                    {Array.from({ length: max }, (_, option) => max - option).map((option) => (
                                        <option key={option} value={option}>
                                            {option === 1 ? `1x de ${formatBRL(card.amount)}` : `${option}x de ${formatBRL(roundCents(card.amount / option))} sem juros`}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </fieldset>
                    );
                })}
            </div>

            {check.error ? (
                <p className="text-sm vp-red" role="alert">{check.error}</p>
            ) : (
                plan && <p className="text-sm vp-num">Total: <b>{formatBRL(plan.total)}</b>{plan.pixDiscount > 0 && <span className="vp-green"> (com {formatBRL(plan.pixDiscount)} de desconto no Pix)</span>}</p>
            )}
            <p className="text-xs vp-muted">Cada parte precisa ser de pelo menos {formatBRL(minPart)}. Só cartão de crédito.</p>

            <button
                type="button"
                className="vp-btn w-full"
                disabled={!plan || !editing || !checkoutId}
                onClick={() => {
                    setTyped([]);
                    setPhase(0);
                }}
                data-track="vacuum_combo_start"
                data-track-category="Vacuum Pump"
            >
                Continuar: digitar {cards.length === 1 ? 'o cartão' : `os ${cards.length} cartões`}
            </button>
        </div>
    );
};

export default VacuumComboPayment;
