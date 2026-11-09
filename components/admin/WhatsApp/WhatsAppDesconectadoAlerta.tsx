import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, Smartphone, X } from 'lucide-react';
import { evolutionMyAttendantConnect, evolutionMyAttendantStatus } from '../../../lib/evolutionStaff';

/**
 * Aviso urgente para o vendedor cujo WhatsApp de atendimento caiu.
 *
 * Confere o número ligado ao usuário logado (SITE_WaAtendentes.user_id) ao abrir
 * o painel, a cada 3 minutos e quando a aba volta ao foco. Desconectado, abre um
 * pop-up que gera o QR Code na hora, acompanha a leitura e fecha sozinho quando
 * o número volta. Quem não tem número de atendimento nunca vê o aviso.
 */

const CHECAGEM_MS = 3 * 60 * 1000;
const ACOMPANHAR_MS = 3000;
const RENOVAR_QR_MS = 40 * 1000;
const ADIAR_MS = 10 * 60 * 1000;
const CHAVE_ADIAR = 'wtech_wa_alerta_adiado_ate';

type Fase = 'aviso' | 'gerando' | 'qr' | 'conectado' | 'erro';

const ESTADOS_DESCONECTADOS = new Set(['disconnected', 'connecting']);

function lerAdiamento(): number {
    try {
        return Number(sessionStorage.getItem(CHAVE_ADIAR) || 0);
    } catch {
        return 0;
    }
}

function gravarAdiamento(ate: number) {
    try {
        sessionStorage.setItem(CHAVE_ADIAR, String(ate));
    } catch {
        // Sem armazenamento, o aviso volta na próxima checagem.
    }
}

function imagemQr(qr: string): string {
    return qr.startsWith('data:') ? qr : `data:image/png;base64,${qr}`;
}

const WhatsAppDesconectadoAlerta: React.FC = () => {
    const [aberto, setAberto] = useState(false);
    const [fase, setFase] = useState<Fase>('aviso');
    const [qr, setQr] = useState<string | null>(null);
    const [erro, setErro] = useState('');
    const abertoRef = useRef(false);
    const qrGeradoEm = useRef(0);

    abertoRef.current = aberto;

    const checar = useCallback(async () => {
        if (abertoRef.current) return;
        if (Date.now() < lerAdiamento()) return;
        try {
            const { state } = await evolutionMyAttendantStatus();
            if (ESTADOS_DESCONECTADOS.has(state)) {
                setFase('aviso');
                setQr(null);
                setErro('');
                setAberto(true);
            }
        } catch {
            // Falha da checagem não vira alarme: o aviso só aparece com o estado confirmado.
        }
    }, []);

    useEffect(() => {
        checar();
        const intervalo = window.setInterval(checar, CHECAGEM_MS);
        const aoFocar = () => { if (document.visibilityState === 'visible') checar(); };
        document.addEventListener('visibilitychange', aoFocar);
        return () => {
            window.clearInterval(intervalo);
            document.removeEventListener('visibilitychange', aoFocar);
        };
    }, [checar]);

    const gerarQr = useCallback(async () => {
        setFase('gerando');
        setErro('');
        try {
            const resultado = await evolutionMyAttendantConnect();
            if (resultado.state === 'open') {
                setFase('conectado');
                return;
            }
            if (!resultado.qr) throw new Error('sem_qr');
            setQr(imagemQr(resultado.qr));
            qrGeradoEm.current = Date.now();
            setFase('qr');
        } catch {
            setErro('Não foi possível gerar o QR Code agora. Tente de novo em instantes.');
            setFase('erro');
        }
    }, []);

    // Com o QR na tela: confere a leitura a cada 3 s e troca o código antes de expirar.
    useEffect(() => {
        if (!aberto || fase !== 'qr') return;
        let ativo = true;
        const timer = window.setInterval(async () => {
            try {
                const { state } = await evolutionMyAttendantStatus();
                if (!ativo) return;
                if (state === 'open') {
                    setFase('conectado');
                    return;
                }
            } catch {
                // Uma falha isolada não interrompe o acompanhamento.
            }
            if (ativo && Date.now() - qrGeradoEm.current > RENOVAR_QR_MS) gerarQr();
        }, ACOMPANHAR_MS);
        return () => { ativo = false; window.clearInterval(timer); };
    }, [aberto, fase, gerarQr]);

    useEffect(() => {
        if (fase !== 'conectado') return;
        const timer = window.setTimeout(() => setAberto(false), 2500);
        return () => window.clearTimeout(timer);
    }, [fase]);

    const adiar = () => {
        gravarAdiamento(Date.now() + ADIAR_MS);
        setAberto(false);
    };

    return (
        <AnimatePresence>
            {aberto && (
                <motion.div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    role="alertdialog"
                    aria-modal="true"
                    aria-labelledby="wa-alerta-titulo"
                >
                    <motion.div
                        className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-zinc-900"
                        initial={{ scale: 0.92, y: 16 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                    >
                        {fase !== 'conectado' && (
                            <button
                                type="button"
                                onClick={adiar}
                                className="absolute right-3 top-3 rounded-full p-1.5 text-white/80 hover:bg-white/20 hover:text-white"
                                aria-label="Lembrar daqui a 10 minutos"
                            >
                                <X size={18} />
                            </button>
                        )}

                        {fase === 'conectado' ? (
                            <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
                                <CheckCircle2 size={56} className="text-emerald-500" />
                                <p className="text-lg font-black text-gray-900 dark:text-white">WhatsApp conectado</p>
                                <p className="text-sm text-gray-600 dark:text-zinc-400">
                                    Suas conversas voltaram a entrar no sistema.
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center gap-3 bg-red-600 py-4 pl-5 pr-12 text-white">
                                    <AlertTriangle size={28} className="shrink-0 animate-pulse" />
                                    <div>
                                        <p id="wa-alerta-titulo" className="text-sm font-black uppercase tracking-wide">
                                            Urgente: seu WhatsApp está desconectado
                                        </p>
                                        <p className="text-xs text-red-100">
                                            Conecte agora para não perder conversas com clientes.
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-4 px-5 py-5">
                                    {(fase === 'aviso' || fase === 'erro') && (
                                        <>
                                            <p className="text-sm text-gray-700 dark:text-zinc-300">
                                                Enquanto o número estiver desconectado, as conversas com os clientes não ficam
                                                registradas no painel e as mensagens automáticas por ele não saem.
                                            </p>
                                            {erro && (
                                                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
                                                    {erro}
                                                </p>
                                            )}
                                            <button
                                                type="button"
                                                onClick={gerarQr}
                                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black uppercase tracking-wide text-white hover:bg-emerald-700"
                                            >
                                                <Smartphone size={18} />
                                                {fase === 'erro' ? 'Tentar de novo' : 'Conectar agora'}
                                            </button>
                                        </>
                                    )}

                                    {fase === 'gerando' && (
                                        <div className="flex flex-col items-center gap-3 py-8 text-sm text-gray-600 dark:text-zinc-400">
                                            <Loader2 size={32} className="animate-spin text-emerald-600" />
                                            Gerando o QR Code…
                                        </div>
                                    )}

                                    {fase === 'qr' && qr && (
                                        <>
                                            <div className="flex justify-center">
                                                <img
                                                    src={qr}
                                                    alt="QR Code para conectar o WhatsApp"
                                                    className="h-60 w-60 rounded-lg border-4 border-white bg-white shadow"
                                                />
                                            </div>
                                            <ol className="list-decimal space-y-1 pl-5 text-sm text-gray-700 dark:text-zinc-300">
                                                <li>Abra o WhatsApp no celular do atendimento.</li>
                                                <li>Toque em <b>Configurações</b> (ou nos três pontos) e em <b>Dispositivos conectados</b>.</li>
                                                <li>Toque em <b>Conectar dispositivo</b> e aponte a câmera para este código.</li>
                                            </ol>
                                            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-zinc-500">
                                                <span className="flex items-center gap-1.5">
                                                    <Loader2 size={12} className="animate-spin" /> Aguardando a leitura…
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={gerarQr}
                                                    className="flex items-center gap-1 font-bold text-emerald-700 hover:underline dark:text-emerald-400"
                                                >
                                                    <RefreshCw size={12} /> Gerar outro
                                                </button>
                                            </div>
                                        </>
                                    )}

                                    <button
                                        type="button"
                                        onClick={adiar}
                                        className="w-full text-center text-xs text-gray-500 hover:underline dark:text-zinc-500"
                                    >
                                        Lembrar daqui a 10 minutos
                                    </button>
                                </div>
                            </>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default WhatsAppDesconectadoAlerta;
