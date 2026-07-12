import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Smartphone, QrCode, RefreshCw, Trash2, Unplug, MessageCircle, Bot, Loader2, Clock } from 'lucide-react';
import {
    WaAtendente, listAtendentes, updateAtendente, defaultInstanceName,
    createAtendenteInstance, connectAtendenteInstance, getAtendenteConnectionState,
    fetchAtendentePhone, logoutAtendenteInstance, deleteAtendenteInstance,
} from '../../../../lib/waAtendentes';
import AtendentesMonitor from './AtendentesMonitor';
import AtendentesRelatorios from './AtendentesRelatorios';

/**
 * Configurações → Atendentes WhatsApp.
 * Conecta o WhatsApp de até 5 atendentes (uma instância Evolution por atendente),
 * espelha todas as mensagens (webhook wa-atendentes-webhook) e gera relatórios
 * de qualidade de atendimento com a IA — que NUNCA responde no WhatsApp.
 */

type Tab = 'conexoes' | 'monitor' | 'relatorios';

const STATUS_LABEL: Record<string, string> = {
    open: 'Conectado',
    connecting: 'Conectando…',
    disconnected: 'Desconectado',
    error: 'Erro',
};

const statusBadgeClass = (status: string) =>
    status === 'open' ? 'bg-green-100 text-green-700' :
    status === 'connecting' ? 'bg-yellow-100 text-yellow-700' :
    status === 'error' ? 'bg-gray-200 text-gray-600' :
    'bg-red-100 text-red-700';

const fmtDataHora = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : null;

const AtendentesWhatsApp: React.FC = () => {
    const [tab, setTab] = useState<Tab>('conexoes');
    const [atendentes, setAtendentes] = useState<WaAtendente[]>([]);
    const [carregou, setCarregou] = useState(false);
    const [nomes, setNomes] = useState<Record<string, string>>({});
    const [busySlot, setBusySlot] = useState<number | null>(null);
    const [qrPorSlot, setQrPorSlot] = useState<Record<number, string>>({});
    const pollRef = useRef<number | null>(null);

    const carregar = useCallback(async () => {
        const lista = await listAtendentes();
        setAtendentes(lista);
        setNomes(prev => {
            const next = { ...prev };
            lista.forEach(a => { if (next[a.id] === undefined) next[a.id] = a.nome; });
            return next;
        });
        setCarregou(true);
        return lista;
    }, []);

    useEffect(() => { carregar(); }, [carregar]);

    /** Confere o estado real na Evolution e persiste no banco. */
    const sincronizarStatus = useCallback(async (atendente: WaAtendente): Promise<string> => {
        if (!atendente.instance_name) return 'disconnected';
        const state = await getAtendenteConnectionState(atendente.instance_name);
        const status = state === 'open' ? 'open' : state === 'connecting' ? 'connecting' : state === 'error' ? 'error' : 'disconnected';
        const patch: any = { status };
        if (status === 'open' && !atendente.phone) {
            const phone = await fetchAtendentePhone(atendente.instance_name);
            if (phone) patch.phone = phone;
        }
        await updateAtendente(atendente.id, patch);
        setAtendentes(prev => prev.map(a => a.id === atendente.id ? { ...a, ...patch } : a));
        return status;
    }, []);

    // Enquanto houver QR na tela, checa a cada 5s se algum foi escaneado.
    useEffect(() => {
        const slots = Object.keys(qrPorSlot).map(Number);
        if (!slots.length) return;

        pollRef.current = window.setInterval(async () => {
            for (const slot of slots) {
                const atendente = atendentes.find(a => a.slot === slot);
                if (!atendente) continue;
                const status = await sincronizarStatus(atendente);
                if (status === 'open') {
                    setQrPorSlot(prev => {
                        const next = { ...prev };
                        delete next[slot];
                        return next;
                    });
                }
            }
        }, 5000);

        return () => { if (pollRef.current) window.clearInterval(pollRef.current); };
    }, [qrPorSlot, atendentes, sincronizarStatus]);

    const handleSalvarNome = async (atendente: WaAtendente) => {
        const nome = (nomes[atendente.id] ?? '').trim();
        if (!nome || nome === atendente.nome) return;
        await updateAtendente(atendente.id, { nome });
        setAtendentes(prev => prev.map(a => a.id === atendente.id ? { ...a, nome } : a));
    };

    const handleConectar = async (atendente: WaAtendente) => {
        const instance = atendente.instance_name || defaultInstanceName(atendente.slot);
        setBusySlot(atendente.slot);
        try {
            const created = await createAtendenteInstance(instance);
            if (!created.ok) return alert(created.error);

            if (!atendente.instance_name) {
                await updateAtendente(atendente.id, { instance_name: instance, status: 'connecting' });
            } else {
                await updateAtendente(atendente.id, { status: 'connecting' });
            }

            let qr = created.qr;
            if (!qr) {
                const conn = await connectAtendenteInstance(instance);
                if (!conn.ok) return alert(conn.error);
                if (conn.state === 'open') {
                    alert('Este atendente já está conectado!');
                    await carregar().then(lista => {
                        const atual = lista.find(a => a.id === atendente.id);
                        if (atual) sincronizarStatus(atual);
                    });
                    return;
                }
                qr = conn.qr || null;
            }

            if (qr) {
                setQrPorSlot(prev => ({ ...prev, [atendente.slot]: qr as string }));
                setAtendentes(prev => prev.map(a => a.id === atendente.id ? { ...a, instance_name: instance, status: 'connecting' } : a));
            } else {
                alert('Não foi possível obter o QR Code. Tente novamente.');
            }
        } finally {
            setBusySlot(null);
        }
    };

    const handleDesconectar = async (atendente: WaAtendente) => {
        if (!atendente.instance_name) return;
        if (!confirm(`Desconectar o WhatsApp de "${atendente.nome}"? As mensagens param de sincronizar até reconectar (o histórico já espelhado permanece).`)) return;
        setBusySlot(atendente.slot);
        try {
            const res = await logoutAtendenteInstance(atendente.instance_name);
            if (!res.ok) return alert('Erro ao desconectar: ' + res.error);
            await updateAtendente(atendente.id, { status: 'disconnected', phone: null });
            setQrPorSlot(prev => { const next = { ...prev }; delete next[atendente.slot]; return next; });
            setAtendentes(prev => prev.map(a => a.id === atendente.id ? { ...a, status: 'disconnected', phone: null } : a));
        } finally {
            setBusySlot(null);
        }
    };

    const handleApagarInstancia = async (atendente: WaAtendente) => {
        if (!atendente.instance_name) return;
        if (!confirm(`ATENÇÃO: isso APAGA a instância "${atendente.instance_name}" do servidor Evolution (o histórico de mensagens já espelhado permanece no sistema). Continuar?`)) return;
        setBusySlot(atendente.slot);
        try {
            const res = await deleteAtendenteInstance(atendente.instance_name);
            if (!res.ok) return alert('Erro ao apagar: ' + res.error);
            await updateAtendente(atendente.id, { status: 'disconnected', phone: null });
            setQrPorSlot(prev => { const next = { ...prev }; delete next[atendente.slot]; return next; });
            setAtendentes(prev => prev.map(a => a.id === atendente.id ? { ...a, status: 'disconnected', phone: null } : a));
        } finally {
            setBusySlot(null);
        }
    };

    const tabs: { id: Tab; label: string; Icon: React.ElementType }[] = [
        { id: 'conexoes', label: 'Conexões', Icon: Smartphone },
        { id: 'monitor', label: 'Conversas', Icon: MessageCircle },
        { id: 'relatorios', label: 'Relatórios IA', Icon: Bot },
    ];

    return (
        <div className="space-y-4">
            {/* Sub-abas */}
            <div className="flex items-center gap-1">
                {tabs.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                            tab === t.id
                                ? 'bg-[#25D366] text-white'
                                : 'bg-[var(--admin-surface-2)] text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface-3)]'
                        }`}
                    >
                        <t.Icon size={15} /> {t.label}
                    </button>
                ))}
            </div>

            {carregou && atendentes.length === 0 && (
                <div className="p-4 rounded-xl border border-yellow-300 bg-yellow-50 text-sm text-yellow-800">
                    As tabelas dos atendentes ainda não existem no banco. Rode a migração
                    <code className="mx-1 px-1 bg-yellow-100 rounded">migrations/create_wa_atendentes.sql</code>
                    no Supabase e recarregue esta página.
                </div>
            )}

            {tab === 'conexoes' && (
                <div className="space-y-4">
                    <p className="text-xs text-[var(--admin-text-tertiary)]">
                        Cada atendente conecta o WhatsApp da empresa escaneando o QR Code (WhatsApp → Aparelhos conectados).
                        Todas as mensagens enviadas e recebidas passam a ser sincronizadas automaticamente — a IA apenas analisa; nunca responde.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {atendentes.map(atendente => {
                            const busy = busySlot === atendente.slot;
                            const qr = qrPorSlot[atendente.slot];
                            const ultimaSync = fmtDataHora(atendente.last_event_at);
                            return (
                                <div key={atendente.id} className="bg-[var(--admin-surface-1)] border border-[var(--admin-border)] rounded-xl p-4 flex flex-col gap-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 flex-1">
                                            <div className="w-8 h-8 rounded-full bg-[#25D366]/15 text-[#1faa52] flex items-center justify-center font-black text-sm shrink-0">
                                                {atendente.slot}
                                            </div>
                                            <input
                                                className="min-w-[110px] flex-1 bg-transparent border border-transparent hover:border-[var(--admin-border)] focus:border-[var(--admin-border)] rounded px-2 py-1 text-sm font-bold text-[var(--admin-text-primary)] outline-none"
                                                value={nomes[atendente.id] ?? atendente.nome}
                                                onChange={e => setNomes(prev => ({ ...prev, [atendente.id]: e.target.value }))}
                                                onBlur={() => handleSalvarNome(atendente)}
                                                placeholder={`Atendente ${atendente.slot}`}
                                            />
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase whitespace-nowrap ${statusBadgeClass(atendente.status)}`}>
                                            {STATUS_LABEL[atendente.status] || atendente.status}
                                        </span>
                                    </div>

                                    <div className="text-[11px] text-[var(--admin-text-tertiary)] space-y-0.5">
                                        <p>Instância: <span className="font-mono">{atendente.instance_name || defaultInstanceName(atendente.slot)}</span></p>
                                        {atendente.phone && <p>Número: <span className="font-mono">+{atendente.phone}</span></p>}
                                        {ultimaSync && (
                                            <p className="flex items-center gap-1"><Clock size={11} /> Última mensagem sincronizada: {ultimaSync}</p>
                                        )}
                                    </div>

                                    {qr && (
                                        <div className="p-3 bg-white rounded-lg flex flex-col items-center border border-[var(--admin-border)]">
                                            <img src={qr} alt={`QR Code — ${atendente.nome}`} className="w-48 h-48" />
                                            <p className="text-[10px] text-gray-500 mt-1 text-center">
                                                WhatsApp → Aparelhos conectados → Conectar aparelho
                                            </p>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2 mt-auto">
                                        {atendente.status !== 'open' ? (
                                            <button
                                                onClick={() => handleConectar(atendente)}
                                                disabled={busy}
                                                className="flex-1 bg-[#25D366] hover:bg-[#1faa52] text-white px-3 py-2 rounded-lg text-xs font-black flex items-center justify-center gap-2 disabled:opacity-50"
                                            >
                                                {busy ? <Loader2 size={14} className="animate-spin" /> : <QrCode size={14} />}
                                                {qr ? 'Gerar novo QR' : 'Conectar (QR)'}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleDesconectar(atendente)}
                                                disabled={busy}
                                                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-xs font-black flex items-center justify-center gap-2 disabled:opacity-50"
                                            >
                                                {busy ? <Loader2 size={14} className="animate-spin" /> : <Unplug size={14} />}
                                                Desconectar
                                            </button>
                                        )}
                                        <button
                                            onClick={() => sincronizarStatus(atendente)}
                                            className="p-2 rounded-lg hover:bg-[var(--admin-surface-3)] text-[var(--admin-text-secondary)]"
                                            title="Atualizar status"
                                        >
                                            <RefreshCw size={14} />
                                        </button>
                                        {atendente.instance_name && (
                                            <button
                                                onClick={() => handleApagarInstancia(atendente)}
                                                className="p-2 rounded-lg hover:bg-red-50 text-red-500"
                                                title="Apagar instância do servidor"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {tab === 'monitor' && <AtendentesMonitor atendentes={atendentes} />}
            {tab === 'relatorios' && <AtendentesRelatorios atendentes={atendentes} />}
        </div>
    );
};

export default AtendentesWhatsApp;
