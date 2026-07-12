import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, Users, MessageCircle, Image as ImageIcon, Mic, Video, FileText, MapPin, Contact2, SmilePlus, BarChart2, Paperclip } from 'lucide-react';
import { supabase } from '../../../../lib/supabaseClient';
import { WaAtendente, WaChatResumo, WaMensagem, listChats, listMessages } from '../../../../lib/waAtendentes';

/**
 * Monitor de conversas dos atendentes (leitura pura).
 * Novas mensagens chegam ao vivo via Supabase Realtime (INSERTs do webhook),
 * com polling de segurança a cada 20s.
 */

interface Props {
    atendentes: WaAtendente[];
}

const POLL_MS = 20_000;

const TIPO_META: Record<string, { label: string; Icon: React.ElementType }> = {
    image: { label: 'Imagem', Icon: ImageIcon },
    audio: { label: 'Áudio', Icon: Mic },
    video: { label: 'Vídeo', Icon: Video },
    document: { label: 'Documento', Icon: FileText },
    sticker: { label: 'Figurinha', Icon: SmilePlus },
    location: { label: 'Localização', Icon: MapPin },
    contact: { label: 'Contato', Icon: Contact2 },
    reaction: { label: 'Reação', Icon: SmilePlus },
    poll: { label: 'Enquete', Icon: BarChart2 },
    other: { label: 'Mensagem', Icon: Paperclip },
};

const fmtHora = (iso: string) =>
    new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

const fmtDia = (iso: string) =>
    new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

const nomeChat = (chat: WaChatResumo) =>
    chat.chat_name || (chat.chat_jid.endsWith('@g.us') ? 'Grupo' : `+${chat.chat_jid.split('@')[0]}`);

const AtendentesMonitor: React.FC<Props> = ({ atendentes }) => {
    const [atendenteId, setAtendenteId] = useState<string>('');
    const [chats, setChats] = useState<WaChatResumo[]>([]);
    const [chatJid, setChatJid] = useState<string>('');
    const [mensagens, setMensagens] = useState<WaMensagem[]>([]);
    const [busca, setBusca] = useState('');
    const [carregandoChats, setCarregandoChats] = useState(false);
    const fimRef = useRef<HTMLDivElement>(null);
    const chatJidRef = useRef(chatJid);
    chatJidRef.current = chatJid;

    const conectados = useMemo(
        () => atendentes.filter(a => a.instance_name),
        [atendentes]
    );

    useEffect(() => {
        if (!atendenteId && conectados.length) setAtendenteId(conectados[0].id);
    }, [conectados, atendenteId]);

    const carregarChats = useCallback(async (id: string) => {
        setCarregandoChats(true);
        const lista = await listChats(id);
        setChats(lista);
        setCarregandoChats(false);
    }, []);

    const carregarMensagens = useCallback(async (id: string, jid: string) => {
        const msgs = await listMessages(id, jid);
        setMensagens(msgs);
    }, []);

    // Troca de atendente: recarrega conversas e limpa a thread.
    useEffect(() => {
        if (!atendenteId) return;
        setChatJid('');
        setMensagens([]);
        carregarChats(atendenteId);
    }, [atendenteId, carregarChats]);

    // Abertura de conversa.
    useEffect(() => {
        if (!atendenteId || !chatJid) return;
        carregarMensagens(atendenteId, chatJid);
    }, [atendenteId, chatJid, carregarMensagens]);

    // Realtime: INSERTs do webhook para o atendente selecionado.
    useEffect(() => {
        if (!atendenteId) return;
        const channel = supabase
            .channel(`wa-atd-monitor-${atendenteId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'SITE_WaAtendenteMensagens',
                filter: `atendente_id=eq.${atendenteId}`,
            }, (payload: any) => {
                const nova = payload?.new as WaMensagem | undefined;
                if (!nova) return;
                if (nova.chat_jid === chatJidRef.current) {
                    setMensagens(prev => prev.some(m => m.id === nova.id) ? prev : [...prev, nova]);
                }
                carregarChats(atendenteId);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [atendenteId, carregarChats]);

    // Polling de segurança (caso o realtime caia).
    useEffect(() => {
        if (!atendenteId) return;
        const timer = window.setInterval(() => {
            carregarChats(atendenteId);
            if (chatJidRef.current) carregarMensagens(atendenteId, chatJidRef.current);
        }, POLL_MS);
        return () => window.clearInterval(timer);
    }, [atendenteId, carregarChats, carregarMensagens]);

    useEffect(() => {
        fimRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [mensagens.length]);

    const chatsFiltrados = useMemo(() => {
        const q = busca.trim().toLowerCase();
        if (!q) return chats;
        return chats.filter(c =>
            nomeChat(c).toLowerCase().includes(q) || c.chat_jid.includes(q));
    }, [chats, busca]);

    const chatAtivo = chats.find(c => c.chat_jid === chatJid);
    const atendenteAtivo = atendentes.find(a => a.id === atendenteId);

    if (!conectados.length) {
        return (
            <div className="p-8 text-center text-sm text-[var(--admin-text-secondary)] bg-[var(--admin-surface-1)] border border-[var(--admin-border)] rounded-xl">
                <Users className="mx-auto mb-2 opacity-50" size={24} />
                Nenhum atendente configurado ainda. Conecte um WhatsApp na aba <b>Conexões</b>.
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Seletor de atendente */}
            <div className="flex items-center gap-2 flex-wrap">
                {conectados.map(a => (
                    <button
                        key={a.id}
                        onClick={() => setAtendenteId(a.id)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                            atendenteId === a.id
                                ? 'bg-[#25D366] text-white'
                                : 'bg-[var(--admin-surface-2)] text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface-3)]'
                        }`}
                    >
                        <span className={`w-2 h-2 rounded-full ${a.status === 'open' ? 'bg-green-300' : 'bg-red-400'}`} />
                        {a.nome || `Atendente ${a.slot}`}
                    </button>
                ))}
            </div>

            <div className="flex h-[600px] bg-[var(--admin-surface-1)] border border-[var(--admin-border)] rounded-xl overflow-hidden">
                {/* Lista de conversas */}
                <div className="w-72 shrink-0 border-r border-[var(--admin-border)] flex flex-col">
                    <div className="p-2 border-b border-[var(--admin-border)]">
                        <div className="relative">
                            <Search size={13} className="absolute left-2.5 top-2.5 text-[var(--admin-text-tertiary)]" />
                            <input
                                value={busca}
                                onChange={e => setBusca(e.target.value)}
                                placeholder="Buscar conversa…"
                                className="w-full bg-[var(--admin-surface-2)] rounded-lg pl-8 pr-2 py-2 text-xs text-[var(--admin-text-primary)] outline-none"
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {carregandoChats && !chats.length && (
                            <p className="p-4 text-xs text-[var(--admin-text-tertiary)]">Carregando…</p>
                        )}
                        {!carregandoChats && !chatsFiltrados.length && (
                            <p className="p-4 text-xs text-[var(--admin-text-tertiary)]">
                                Nenhuma conversa sincronizada ainda. As mensagens aparecem aqui assim que forem enviadas/recebidas no WhatsApp conectado.
                            </p>
                        )}
                        {chatsFiltrados.map(chat => {
                            const meta = chat.last_tipo !== 'text' ? TIPO_META[chat.last_tipo] || TIPO_META.other : null;
                            return (
                                <button
                                    key={chat.chat_jid}
                                    onClick={() => setChatJid(chat.chat_jid)}
                                    className={`w-full text-left px-3 py-2.5 border-b border-[var(--admin-border)]/50 hover:bg-[var(--admin-surface-2)] transition-colors ${
                                        chatJid === chat.chat_jid ? 'bg-[var(--admin-surface-2)]' : ''
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-xs font-bold text-[var(--admin-text-primary)] truncate">{nomeChat(chat)}</p>
                                        <span className="text-[9px] text-[var(--admin-text-tertiary)] whitespace-nowrap">{fmtHora(chat.last_ts)}</span>
                                    </div>
                                    <p className="text-[11px] text-[var(--admin-text-secondary)] truncate mt-0.5">
                                        {chat.last_from_me ? '→ ' : ''}
                                        {meta ? <span className="inline-flex items-center gap-1"><meta.Icon size={10} /> {chat.last_body || meta.label}</span> : (chat.last_body || '')}
                                    </p>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Thread */}
                <div className="flex-1 flex flex-col min-w-0">
                    {!chatJid ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-[var(--admin-text-tertiary)] text-sm gap-2">
                            <MessageCircle size={28} className="opacity-40" />
                            Selecione uma conversa para acompanhar
                        </div>
                    ) : (
                        <>
                            <div className="px-4 py-3 border-b border-[var(--admin-border)] flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-bold text-[var(--admin-text-primary)]">{chatAtivo ? nomeChat(chatAtivo) : chatJid}</p>
                                    <p className="text-[10px] text-[var(--admin-text-tertiary)]">
                                        {atendenteAtivo?.nome} · {chatAtivo?.msg_count ?? mensagens.length} mensagens · somente leitura
                                    </p>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-1.5 bg-[var(--admin-surface-2)]/40">
                                {mensagens.map((m, i) => {
                                    const meta = m.tipo !== 'text' ? TIPO_META[m.tipo] || TIPO_META.other : null;
                                    const diaAnterior = i > 0 ? fmtDia(mensagens[i - 1].timestamp) : null;
                                    const dia = fmtDia(m.timestamp);
                                    return (
                                        <React.Fragment key={m.id}>
                                            {dia !== diaAnterior && (
                                                <div className="text-center my-2">
                                                    <span className="text-[9px] font-bold uppercase tracking-wide px-2 py-1 rounded-full bg-[var(--admin-surface-3)] text-[var(--admin-text-tertiary)]">{dia}</span>
                                                </div>
                                            )}
                                            <div className={`flex ${m.from_me ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[70%] rounded-2xl px-3 py-2 text-xs leading-relaxed shadow-sm ${
                                                    m.from_me
                                                        ? 'bg-[#d9fdd3] text-gray-900 rounded-br-sm'
                                                        : 'bg-white text-gray-900 rounded-bl-sm border border-gray-100'
                                                }`}>
                                                    {m.participant && m.chat_jid.endsWith('@g.us') && !m.from_me && (
                                                        <p className="text-[9px] font-bold text-[#1faa52] mb-0.5">+{m.participant.split('@')[0]}</p>
                                                    )}
                                                    {meta && (
                                                        <p className="flex items-center gap-1 font-bold text-gray-500 text-[10px] uppercase mb-0.5">
                                                            <meta.Icon size={11} /> {meta.label}
                                                        </p>
                                                    )}
                                                    {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                                                    <p className="text-[9px] text-gray-400 text-right mt-1">{fmtHora(m.timestamp)}</p>
                                                </div>
                                            </div>
                                        </React.Fragment>
                                    );
                                })}
                                <div ref={fimRef} />
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AtendentesMonitor;
