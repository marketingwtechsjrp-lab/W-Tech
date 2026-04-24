import React, { useState, useEffect, useRef } from 'react';
import { 
    Send, 
    Bot, 
    User, 
    RefreshCcw, 
    Terminal, 
    Zap,
    Sparkles,
    Trash2
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000/api';

const MetaAIChat = ({ slug }: { slug: string | null }) => {
    const [messages, setMessages] = useState<any[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [showLogs, setShowLogs] = useState(true);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const logIntervalRef = useRef<any>(null);

    useEffect(() => {
        if (slug) fetchHistory();
        return () => stopLogPolling();
    }, [slug]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, logs]);

    const fetchHistory = async () => {
        try {
            const response = await fetch(`${API_BASE}/chat/history`);
            const data = await response.json();
            if (data && data.history) {
                setMessages(data.history);
            } else {
                setMessages([]);
                if (data.error) console.error("History Error:", data.error);
            }
        } catch (error) {
            console.error("Error fetching chat history:", error);
        }
    };

    const startLogPolling = () => {
        stopLogPolling();
        logIntervalRef.current = setInterval(async () => {
            try {
                const response = await fetch(`${API_BASE}/chat/logs`);
                const data = await response.json();
                if (data.logs && data.logs.length > 0) {
                    setLogs(data.logs);
                }
            } catch (err) {
                console.error("Log error:", err);
            }
        }, 1000);
    };

    const stopLogPolling = () => {
        if (logIntervalRef.current) {
            clearInterval(logIntervalRef.current);
            logIntervalRef.current = null;
        }
    };

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || loading || !slug) return;

        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setLoading(true);
        setLogs([]);
        startLogPolling();

        try {
            const response = await fetch(`${API_BASE}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMsg })
            });
            const data = await response.json();
            if (data.response) {
                setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
            } else if (data.error) {
                setMessages(prev => [...prev, { role: 'assistant', content: `Erro: ${data.error}` }]);
            }
        } catch (error) {
            setMessages(prev => [...prev, { role: 'assistant', content: 'Falha crítica na comunicação com a IA.' }]);
        } finally {
            setLoading(false);
            stopLogPolling();
        }
    };

    const handleReset = async () => {
        if (!confirm('Deseja realmente limpar o histórico da conversa?')) return;
        try {
            await fetch(`${API_BASE}/chat/reset`, { method: 'POST' });
            setMessages([]);
            setLogs([]);
        } catch (error) {
            console.error(error);
        }
    };

    const handleAutoOptimize = async () => {
        if (!confirm('Vou analisar sua conta e sugerir melhorias automáticas. Continuar?')) return;
        setLoading(true);
        setLogs(["Iniciando rotina de auto-otimização..."]);
        startLogPolling();
        
        try {
            const response = await fetch(`${API_BASE}/meta/auto_optimize`, { method: 'POST' });
            const data = await response.json();
            if (data.report) {
                setMessages(prev => [...prev, { role: 'assistant', content: data.report }]);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            stopLogPolling();
        }
    };

    return (
        <div className="flex flex-col lg:flex-row h-full">
            {/* Chat Flow */}
            <div className="flex-1 flex flex-col min-h-[500px] border-r border-[var(--admin-border)] bg-white dark:bg-transparent">
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                            <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-full text-blue-600 animate-pulse">
                                <Bot size={64} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-[var(--admin-text-primary)]">Olá, Sou seu Gestor Meta AI</h3>
                                <p className="text-gray-500 text-sm max-w-sm mt-2">
                                    Posso analisar suas campanhas, sugerir orçamentos, criar novos anúncios ou otimizar seu ROAS. O que faremos hoje?
                                </p>
                            </div>
                            <div className="flex flex-wrap justify-center gap-2 mt-4">
                                <button 
                                    onClick={() => setInput("Como está o desempenho das minhas campanhas?")}
                                    className="px-4 py-2 bg-[var(--admin-surface-3)] hover:bg-gray-200 dark:hover:bg-[#333] rounded-full text-xs font-bold transition-all text-[var(--admin-text-secondary)]"
                                >
                                    📊 Ver Performance
                                </button>
                                <button 
                                    onClick={() => setInput("Sugira melhorias nos meus criativos.")}
                                    className="px-4 py-2 bg-[var(--admin-surface-3)] hover:bg-gray-200 dark:hover:bg-[#333] rounded-full text-xs font-bold transition-all text-[var(--admin-text-secondary)]"
                                >
                                    🎨 Melhorar Criativos
                                </button>
                                <button 
                                    onClick={() => setInput("Analise o CTR da campanha atual.")}
                                    className="px-4 py-2 bg-[var(--admin-surface-3)] hover:bg-gray-200 dark:hover:bg-[#333] rounded-full text-xs font-bold transition-all text-[var(--admin-text-secondary)]"
                                >
                                    🔍 Analisar CTR
                                </button>
                            </div>
                        </div>
                    )}

                    {messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                <div className={`p-2 rounded-xl shrink-0 h-fit ${msg.role === 'user' ? 'bg-black text-white' : 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'}`}>
                                    {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
                                </div>
                                <div className={`p-4 rounded-3xl ${msg.role === 'user' ? 'bg-gray-800 text-white rounded-tr-none' : 'bg-[var(--admin-surface-1)] text-gray-800 shadow-sm border border-[var(--admin-border)] rounded-tl-none font-medium'}`}>
                                    <div className="whitespace-pre-wrap text-sm leading-relaxed prose dark:prose-invert max-w-none">
                                        {msg.content}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    {loading && (
                        <div className="flex justify-start">
                            <div className="flex gap-3">
                                <div className="p-2 rounded-xl bg-blue-600 text-white animate-pulse">
                                    <Bot size={18} />
                                </div>
                                <div className="p-4 bg-[var(--admin-surface-1)] rounded-3xl rounded-tl-none border border-[var(--admin-border)] flex items-center gap-2">
                                    <div className="flex gap-1">
                                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                    </div>
                                    <span className="text-xs font-bold text-gray-400">AGENTE PROCESSANDO...</span>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-6 bg-[var(--admin-surface-1)] border-t border-[var(--admin-border)]">
                    <form onSubmit={handleSendMessage} className="relative group">
                        <input 
                            type="text" 
                            disabled={loading}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={loading ? "Aguardando agente..." : "Pergunte algo sobre sua conta Meta..."}
                            className="w-full bg-[var(--admin-surface-2)] border-2 border-[var(--admin-border)] rounded-2xl px-6 py-4 pr-16 text-sm font-medium focus:border-blue-500 focus:ring-0 transition-all disabled:opacity-50"
                        />
                        <button 
                            type="submit"
                            disabled={loading || !input.trim()}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 disabled:grayscale"
                        >
                            <Send size={18} />
                        </button>
                    </form>
                    <div className="flex justify-between items-center mt-4">
                        <div className="flex gap-3">
                            <button 
                                onClick={handleAutoOptimize}
                                disabled={loading}
                                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-black hover:bg-indigo-100 transition-all transition-colors disabled:opacity-50"
                            >
                                <Zap size={14} /> AUTO-OTIMIZAR
                            </button>
                            <button 
                                onClick={handleReset}
                                disabled={loading}
                                className="flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-xs font-black hover:bg-red-100 transition-all transition-colors disabled:opacity-50"
                            >
                                <Trash2 size={14} /> RESETAR CHAT
                            </button>
                        </div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                            Powered by Meta Traffic AI Engine v21
                        </p>
                    </div>
                </div>
            </div>

            {/* Side Logs */}
            <div className={`w-full lg:w-80 bg-[var(--admin-surface-2)] overflow-hidden transition-all duration-300 ${showLogs ? 'h-auto' : 'h-12 lg:w-12'}`}>
                <div className="flex items-center justify-between p-3 bg-[var(--admin-surface-3)] border-b border-gray-200 ">
                    <span className="text-[10px] font-black text-gray-500 flex items-center gap-2">
                        <Terminal size={12} /> LOGS DE EXECUÇÃO
                    </span>
                    <button onClick={() => setShowLogs(!showLogs)} className="text-gray-400 hover:text-gray-900">
                        <Zap size={12} fill={showLogs ? 'currentColor' : 'none'} />
                    </button>
                </div>
                {showLogs && (
                    <div className="p-4 font-mono text-[11px] h-[300px] lg:h-full overflow-y-auto custom-scrollbar space-y-2">
                        {logs.length === 0 ? (
                            <div className="text-gray-500 opacity-40 italic">Aguardando atividade do agente...</div>
                        ) : (
                            logs.map((log, i) => (
                                <div key={i} className="flex gap-2 text-[var(--admin-text-secondary)] border-l-2 border-blue-500/30 pl-2 py-0.5">
                                    <span className="text-blue-500 shrink-0 font-black">❯</span>
                                    {log}
                                </div>
                            ))
                        )}
                        <div ref={chatEndRef} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default MetaAIChat;
