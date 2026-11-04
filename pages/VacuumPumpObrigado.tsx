import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, MessageCircle } from 'lucide-react';
import SEO from '../components/SEO';
import { VP_CSS } from '../components/vacuum-pump/vacuumStyles';
import { useVacuumPageChrome, vacuumApi, whatsappLink, type VacuumPaymentResult } from '../components/vacuum-pump/vacuumApi';
import { pushPurchase } from '../lib/dataLayer';
import { VACUUM_ITEM_NAME, formatBRL } from '../lib/vacuumOffer';

const VacuumPumpObrigado: React.FC = () => {
    const [params] = useSearchParams();
    const checkoutId = params.get('c') || '';
    const [result, setResult] = useState<VacuumPaymentResult | null>(null);
    const [failed, setFailed] = useState(false);

    useVacuumPageChrome();

    useEffect(() => {
        if (!checkoutId) {
            setFailed(true);
            return;
        }
        let stop = false;
        let timer: number | undefined;
        const load = async () => {
            const data = await vacuumApi.status(checkoutId).catch(() => null);
            if (stop) return;
            if (!data || data.httpStatus !== 200) {
                setFailed(true);
                return;
            }
            setResult(data);
            if (data.stage !== 'paid') timer = window.setTimeout(load, 5000);
        };
        load();
        return () => {
            stop = true;
            window.clearTimeout(timer);
        };
    }, [checkoutId]);

    useEffect(() => {
        // Idempotente por transaction_id: recarregar a página não conta a venda de novo.
        if (result?.stage === 'paid') {
            pushPurchase({
                funnel: 'vacuum_pump_bf',
                item_name: VACUUM_ITEM_NAME,
                value: Number(result.amount) || 0,
                currency: 'BRL',
                transaction_id: result.order_number || checkoutId,
                provider: 'mercadopago',
            });
        }
    }, [result, checkoutId]);

    const paid = result?.stage === 'paid';

    return (
        <div className="vp-root vp-grid-bg min-h-screen px-4 py-12">
            <style>{VP_CSS}</style>
            <SEO title="Pedido da Vacuum Pump" noindex />
            <main className="mx-auto max-w-[680px]">
                {failed && (
                    <div className="vp-plate p-6">
                        <h1 className="vp-display text-5xl">Pedido não encontrado</h1>
                        <p className="mt-3 vp-muted">Se você já pagou, fique tranquilo: a confirmação chega por e-mail. Se precisar, fale com a gente no WhatsApp.</p>
                    </div>
                )}

                {!failed && !result && <p role="status" className="vp-muted">Consultando seu pedido…</p>}

                {result && !paid && (
                    <div className="vp-plate p-6" role="status">
                        <h1 className="vp-display text-5xl">Confirmando seu pagamento</h1>
                        <p className="mt-3 vp-muted">Assim que o Mercado Pago confirmar, esta página atualiza sozinha e você recebe a confirmação por e-mail.</p>
                    </div>
                )}

                {result && paid && (
                    <>
                        <div className="flex h-14 w-14 items-center justify-center bg-[var(--vp-red)]"><Check size={32} strokeWidth={3} aria-hidden /></div>
                        <h1 className="vp-display mt-5 text-6xl sm:text-7xl">Máquina garantida{result.first_name ? `, ${result.first_name}` : ''}!</h1>
                        {result.order_number && <p className="mt-3 text-lg">Pedido <b className="vp-num">{result.order_number}</b>. A confirmação também foi para o seu e-mail.</p>}

                        <div className="vp-plate mt-7 p-6">
                            <ul className="space-y-2">
                                {(result.items || []).map((item) => (
                                    <li key={item.id} className="flex justify-between gap-3">
                                        <span>{item.name}</span><span className="vp-num shrink-0">{formatBRL(item.price)}</span>
                                    </li>
                                ))}
                                {result.shipping && (
                                    <li className="flex justify-between gap-3">
                                        <span>{result.shipping.name}</span>
                                        <span className="vp-num shrink-0">{result.shipping.cost > 0 ? formatBRL(result.shipping.cost) : result.shipping.method === 'gratis_sp' ? 'Grátis' : 'A combinar'}</span>
                                    </li>
                                )}
                            </ul>
                            <div className="mt-3 flex justify-between border-t border-white/15 pt-3 font-bold">
                                <span>Total{result.installments && result.installments > 1 ? ` em ${result.installments}x sem juros` : ''}</span>
                                <span className="vp-num">{formatBRL(Number(result.amount) || 0)}</span>
                            </div>
                        </div>

                        <h2 className="vp-display mt-9 text-4xl">O que acontece agora</h2>
                        <ol className="mt-4 space-y-4">
                            <li className="flex gap-3"><span className="vp-display vp-red text-3xl">1</span><div><b>Sua máquina entra em produção.</b><p className="vp-muted">{result.delivery_text}.</p></div></li>
                            <li className="flex gap-3"><span className="vp-display vp-red text-3xl">2</span><div><b>Enviamos e avisamos você.</b><p className="vp-muted">{result.shipping?.method === 'a_combinar' ? 'Nossa equipe fala com você no WhatsApp para combinar o frete.' : 'O código de rastreio vai para o seu e-mail quando a máquina for postada.'}</p></div></li>
                            <li className="flex gap-3"><span className="vp-display vp-red text-3xl">3</span><div><b>Junto com a máquina, o treinamento.</b><p className="vp-muted">Manual e vídeo para você começar a usar sem dúvida. Se precisar, nosso suporte técnico atende no WhatsApp.</p></div></li>
                        </ol>

                        {result.whatsapp && (
                            <a className="vp-btn mt-8 w-full" href={whatsappLink(result.whatsapp, `Oi! Comprei a Vacuum Pump Standard, pedido ${result.order_number || ''}. Quero combinar a entrega.`)} target="_blank" rel="noreferrer">
                                <MessageCircle size={20} aria-hidden /> Falar com a W-Tech no WhatsApp
                            </a>
                        )}
                    </>
                )}
            </main>
        </div>
    );
};

export default VacuumPumpObrigado;
