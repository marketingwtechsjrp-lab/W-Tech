import React from 'react';
import { Zap, CheckCircle2, ShieldCheck, Lock, CreditCard, Timer, BadgeCheck, Award, FileCheck2, Users } from 'lucide-react';

interface CheckoutOfferCardProps {
    coursePrice: number;
    depositPrice?: number;
    theme?: 'dark' | 'light';
    maxInstallments?: number;
}

const fmt = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;
const fmtShort = (v: number) =>
    Number.isInteger(v) ? `R$ ${v.toFixed(0)}` : fmt(v);

/**
 * Card de oferta exibido nas LPs quando o checkout automatizado (Mercado Pago)
 * está habilitado para o curso. Empilhamento de valor: parcela como número-herói,
 * preço cheio como âncora, sinal de entrada destacado como caminho rápido para
 * reservar a vaga, pilha de benefícios e selos de confiança.
 */
const CheckoutOfferCard: React.FC<CheckoutOfferCardProps> = ({
    coursePrice,
    depositPrice = 0,
    theme = 'dark',
    maxInstallments = 10
}) => {
    if (!coursePrice || coursePrice <= 0) return null;

    const installmentValue = coursePrice / maxInstallments;
    const hasDeposit = depositPrice > 0;
    const remaining = Math.max(0, coursePrice - depositPrice);
    const isDark = theme === 'dark';

    const c = {
        cardBg: isDark
            ? 'bg-gradient-to-b from-zinc-900 via-zinc-950 to-black border-wtech-gold/40'
            : 'bg-gradient-to-b from-white via-amber-50/30 to-amber-50/60 border-wtech-gold/40',
        textMain: isDark ? 'text-white' : 'text-zinc-950',
        textSub: isDark ? 'text-gray-400' : 'text-zinc-500',
        textBody: isDark ? 'text-gray-300' : 'text-zinc-700',
        divider: isDark ? 'border-white/10' : 'border-amber-200/60',
        stackBg: isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white/80 border-amber-200/50',
        depositBg: isDark
            ? 'bg-gradient-to-br from-wtech-gold/15 to-yellow-900/10 border-wtech-gold/50'
            : 'bg-gradient-to-br from-yellow-100/90 to-amber-100/70 border-wtech-gold/60',
        pillBg: isDark ? 'bg-white/5 border-white/10 text-gray-300' : 'bg-white border-gray-200 text-zinc-600',
        anchorStrike: isDark ? 'text-gray-500' : 'text-gray-400',
        glowRing: isDark ? 'ring-1 ring-wtech-gold/20' : 'ring-1 ring-wtech-gold/25'
    };

    // Pilha de valor: cada item reforça um ganho concreto da inscrição imediata
    const stack = [
        { icon: BadgeCheck, text: <><strong>Matrícula confirmada na hora</strong> — sem fila, sem esperar atendente</> },
        { icon: FileCheck2, text: <>Comprovante de pagamento + confirmação de inscrição <strong>enviados automaticamente</strong></> },
        { icon: Users, text: <><strong>Vaga reservada no seu nome</strong> — turmas presenciais com poucas vagas</> },
        { icon: Award, text: <>Certificação oficial <strong>W-Tech Brasil</strong> ao concluir o curso</> }
    ];

    return (
        <div className={`relative border rounded-3xl overflow-hidden shadow-2xl ${c.cardBg} ${c.glowRing}`}>
            {/* Faixa topo — urgência */}
            <div className="bg-gradient-to-r from-wtech-gold via-yellow-400 to-wtech-gold text-black text-center py-2.5 px-4">
                <p className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-1.5">
                    <Zap size={12} strokeWidth={3} className="shrink-0" />
                    Inscrição imediata · Vagas limitadas
                </p>
            </div>

            <div className="p-5 md:p-6 space-y-5">
                {/* ===== Bloco de preço: parcela como herói, preço cheio como âncora ===== */}
                <div className="text-center">
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${c.textSub}`}>
                        Investimento no curso
                    </p>

                    {/* Âncora: valor cheio */}
                    <p className={`text-sm font-bold ${c.textBody}`}>
                        <span className={c.textSub}>Valor total:</span>{' '}
                        <span className={`font-black ${c.textMain}`}>{fmt(coursePrice)}</span>
                        <span className={`text-xs ${c.textSub}`}> à vista no PIX</span>
                    </p>

                    {/* Herói: parcelamento */}
                    <div className="mt-2 flex items-end justify-center gap-1.5">
                        <span className={`text-base font-black self-center ${c.textSub}`}>ou</span>
                        <span className="text-wtech-gold text-2xl md:text-3xl font-black self-center">{maxInstallments}x</span>
                        <span className={`text-[13px] font-bold self-center ${c.textSub}`}>de</span>
                        <span className={`text-4xl md:text-5xl font-black tracking-tight leading-none ${c.textMain}`}>
                            {fmt(installmentValue)}
                        </span>
                    </div>
                    <p className={`mt-1.5 text-xs font-bold ${c.textSub}`}>
                        no cartão de crédito, direto no checkout
                    </p>

                    <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider ${c.pillBg}`}>
                            <CreditCard size={10} /> Cartão até {maxInstallments}x
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider ${c.pillBg}`}>
                            ⚡ PIX aprovação imediata
                        </span>
                    </div>
                </div>

                {/* ===== Sinal de entrada: caminho mais fácil para garantir a vaga ===== */}
                {hasDeposit && (
                    <>
                        <div className={`flex items-center gap-3 ${c.textSub}`}>
                            <div className={`flex-1 border-t ${c.divider}`}></div>
                            <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                                ou garanta sua vaga hoje
                            </span>
                            <div className={`flex-1 border-t ${c.divider}`}></div>
                        </div>

                        <div className={`relative border-2 rounded-2xl p-4 ${c.depositBg}`}>
                            <span className="absolute -top-2.5 left-4 bg-wtech-gold text-black text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shadow">
                                Mais escolhido
                            </span>
                            <div className="flex items-start gap-3 pt-1">
                                <div className="w-10 h-10 rounded-xl bg-wtech-gold text-black flex items-center justify-center shrink-0 shadow-md shadow-yellow-900/20">
                                    <Timer size={20} strokeWidth={2.5} />
                                </div>
                                <div className="flex-1">
                                    <p className={`text-sm font-black leading-tight ${c.textMain}`}>
                                        Reserve sua vaga com apenas{' '}
                                        <span className="text-wtech-gold text-lg">{fmtShort(depositPrice)}</span>
                                    </p>
                                    <p className={`text-xs mt-1.5 leading-relaxed ${c.textBody}`}>
                                        Pague o <strong>sinal de entrada</strong> agora e sua matrícula é registrada
                                        na hora, com a vaga <strong>bloqueada no seu nome</strong>. O restante
                                        {remaining > 0 ? ` (${fmt(remaining)})` : ''} pode ser pago até uma semana antes do início do curso, direto com nossa equipe — inclusive parcelado.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* ===== Empilhamento de valor ===== */}
                <div className={`border rounded-2xl p-4 ${c.stackBg}`}>
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${c.textSub}`}>
                        O que você garante ao se inscrever agora
                    </p>
                    <ul className="space-y-2.5">
                        {stack.map((item, i) => (
                            <li key={i} className={`flex items-start gap-2.5 text-xs font-medium leading-snug ${c.textBody}`}>
                                <item.icon size={15} className="text-wtech-gold shrink-0 mt-0.5" strokeWidth={2.5} />
                                <span>{item.text}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* ===== Rodapé de segurança ===== */}
                <div className={`border-t pt-3.5 space-y-1.5 ${c.divider}`}>
                    <p className={`text-[10px] font-bold leading-relaxed flex items-start gap-1.5 ${c.textSub}`}>
                        <Lock size={11} className="shrink-0 mt-0.5 text-green-500" />
                        Ao confirmar seus dados abaixo, você será direcionado para o ambiente seguro do
                        Mercado Pago para concluir o pagamento.
                    </p>
                    <p className={`text-[10px] font-bold flex items-center gap-1.5 ${c.textSub}`}>
                        <ShieldCheck size={11} className="shrink-0 text-green-500" />
                        Compra protegida · Site oficial W-Tech Brasil
                    </p>
                    <p className={`text-[10px] font-bold flex items-center gap-1.5 ${c.textSub}`}>
                        <CheckCircle2 size={11} className="shrink-0 text-green-500" />
                        Pagamento aprovado = matrícula automática, sem espera
                    </p>
                </div>
            </div>
        </div>
    );
};

export default CheckoutOfferCard;
