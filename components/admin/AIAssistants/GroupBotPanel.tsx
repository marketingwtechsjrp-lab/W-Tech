import React, { useEffect, useState } from 'react';
import { Bot, Loader2, RefreshCw, Send, Webhook, MessageSquareText, History } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { upsertSiteConfig } from '../../../lib/siteConfig';
import { publicApiUrl } from '../../../lib/publicUrl';
import { useAuth } from '../../../context/AuthContext';
import {
    AI_AGENT_BY_ID,
    CFG_GROUP_BOT_ENABLED,
    CFG_GROUP_BOT_GROUP_JID,
    CFG_GROUP_BOT_GROUP_NAME,
    CFG_GROUP_BOT_INSTANCE,
    CFG_GROUP_WEBHOOK_TOKEN,
    type AIAgentId,
} from '../../../lib/aiAgentDefaults';

/**
 * Configuração do bot de perguntas do grupo (Assistentes de IA):
 * toggle, escolha do grupo (Evolution), registro do webhook, sandbox de
 * pergunta e histórico das respostas (SITE_AIGroupLog).
 */

interface GroupOption {
    jid: string;
    subject: string;
}

interface LogRow {
    id: string;
    sender_name: string | null;
    question: string | null;
    agent: string | null;
    answer: string | null;
    created_at: string;
}

const cfgKeys = [
    CFG_GROUP_BOT_ENABLED, CFG_GROUP_BOT_GROUP_JID, CFG_GROUP_BOT_GROUP_NAME,
    CFG_GROUP_BOT_INSTANCE, CFG_GROUP_WEBHOOK_TOKEN,
    'evolution_api_url', 'evolution_api_key',
    'wa_report_group_jid', 'wa_report_group_name',
    'wa_instance_report', 'automation_whatsapp_instance', 'evolution_instance_name',
];

const GroupBotPanel: React.FC = () => {
    const { user } = useAuth();
    const [cfg, setCfg] = useState<Record<string, string>>({});
    const [loaded, setLoaded] = useState(false);
    const [saving, setSaving] = useState(false);
    const [groups, setGroups] = useState<GroupOption[]>([]);
    const [loadingGroups, setLoadingGroups] = useState(false);
    const [registering, setRegistering] = useState(false);
    const [webhookOk, setWebhookOk] = useState<string | null>(null);
    const [question, setQuestion] = useState('');
    const [asking, setAsking] = useState(false);
    const [sandboxReply, setSandboxReply] = useState<{ agent: string; answer: string | null } | null>(null);
    const [logs, setLogs] = useState<LogRow[]>([]);

    const enabled = cfg[CFG_GROUP_BOT_ENABLED] === 'true';
    const groupJid = cfg[CFG_GROUP_BOT_GROUP_JID] || cfg['wa_report_group_jid'] || '';
    const groupName = cfg[CFG_GROUP_BOT_GROUP_NAME] || cfg['wa_report_group_name'] || '';
    const instance =
        cfg[CFG_GROUP_BOT_INSTANCE] || cfg['wa_instance_report'] || cfg['automation_whatsapp_instance'] || cfg['evolution_instance_name'] || '';

    useEffect(() => {
        supabase
            .from('SITE_Config')
            .select('key, value')
            .in('key', cfgKeys)
            .then(({ data }) => {
                const map: Record<string, string> = {};
                (data || []).forEach((c: any) => (map[c.key] = c.value));
                setCfg(map);
                setLoaded(true);
            });
        refreshLogs();
    }, []);

    const refreshLogs = async () => {
        const { data, error } = await supabase
            .from('SITE_AIGroupLog')
            .select('id, sender_name, question, agent, answer, created_at')
            .order('created_at', { ascending: false })
            .limit(20);
        if (!error && data) setLogs(data as LogRow[]);
    };

    const saveCfg = async (updates: Record<string, string>) => {
        setSaving(true);
        try {
            // RPC SECURITY DEFINER: upsert direto na tabela é barrado pela policy
            // de leitura quando a chave é secreta (ex.: ai_group_webhook_token).
            const refused = await upsertSiteConfig(Object.entries(updates).map(([key, value]) => ({ key, value })));
            // Só reflete na tela o que realmente foi gravado — senão o painel
            // mostraria como salvo um valor que o servidor recusou.
            const saved = Object.entries(updates).filter(([key]) => !refused.includes(key));
            setCfg((prev) => ({ ...prev, ...Object.fromEntries(saved) }));
            if (refused.length) {
                alert(`Estas chaves só podem ser definidas no servidor e não foram gravadas:\n${refused.join(', ')}`);
            }
        } catch (e: any) {
            alert('Erro ao salvar configuração: ' + e.message);
        } finally {
            setSaving(false);
        }
    };

    /** Lista os grupos da instância (mesmo padrão do relatório em Integrações). */
    const loadGroups = async () => {
        const serverUrl = (cfg['evolution_api_url'] || '').trim().replace(/\/$/, '');
        const apiKey = (cfg['evolution_api_key'] || '').trim();
        if (!serverUrl || !apiKey) return alert('Configure a Evolution API (Server URL e API Key) em Admin → Integrações primeiro.');
        if (!instance) return alert('Configure a instância do relatório/automação em Admin → Integrações primeiro.');
        setLoadingGroups(true);
        try {
            const response = await fetch(
                `${serverUrl}/group/fetchAllGroups/${encodeURIComponent(instance)}?getParticipants=false`,
                { headers: { apikey: apiKey } }
            );
            const data = await response.json();
            const raw = Array.isArray(data) ? data : Array.isArray(data?.groups) ? data.groups : [];
            const list = raw
                .map((g: any) => ({ jid: g.id || g.jid || '', subject: g.subject || g.name || g.id || 'Grupo sem nome' }))
                .filter((g: GroupOption) => g.jid);
            setGroups(list);
            if (list.length === 0) alert(`Nenhum grupo encontrado na instância "${instance}". O número conectado precisa participar do grupo.`);
        } catch (e: any) {
            alert('Erro ao listar grupos: ' + e.message);
        } finally {
            setLoadingGroups(false);
        }
    };

    /** Registra o webhook da Evolution apontando para o sistema (v2 com fallback v1). */
    const registerWebhook = async () => {
        const serverUrl = (cfg['evolution_api_url'] || '').trim().replace(/\/$/, '');
        const apiKey = (cfg['evolution_api_key'] || '').trim();
        if (!serverUrl || !apiKey) return alert('Configure a Evolution API em Admin → Integrações primeiro.');
        if (!instance) return alert('Configure a instância antes de registrar o webhook.');

        setRegistering(true);
        setWebhookOk(null);
        try {
            let token = (cfg[CFG_GROUP_WEBHOOK_TOKEN] || '').trim();
            if (!token) {
                token = crypto.randomUUID();
                await saveCfg({ [CFG_GROUP_WEBHOOK_TOKEN]: token });
            }
            // Domínio canônico, nunca a origem do navegador: site.w-techbrasil.com.br
            // responde 308 e webhook não segue redirect — a entrega falharia calada.
            const url = publicApiUrl(`/api/whatsapp-cloud-webhook?source=evolution&token=${token}`);

            // Evolution v2
            let res = await fetch(`${serverUrl}/webhook/set/${encodeURIComponent(instance)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', apikey: apiKey },
                body: JSON.stringify({
                    webhook: { enabled: true, url, events: ['MESSAGES_UPSERT'], webhookByEvents: false, base64: false },
                }),
            });
            if (!res.ok) {
                // Fallback shape v1
                res = await fetch(`${serverUrl}/webhook/set/${encodeURIComponent(instance)}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', apikey: apiKey },
                    body: JSON.stringify({ enabled: true, url, events: ['MESSAGES_UPSERT'], webhook_by_events: false }),
                });
            }
            if (!res.ok) {
                const body = await res.text().catch(() => '');
                throw new Error(`Evolution ${res.status}: ${body.slice(0, 160)}`);
            }
            setWebhookOk(url);
        } catch (e: any) {
            alert('Falha ao registrar webhook: ' + e.message);
        } finally {
            setRegistering(false);
        }
    };

    /** Sandbox: pergunta → persona certa + resposta, sem enviar no grupo. */
    const askSandbox = async () => {
        const q = question.trim();
        if (!q) return;
        setAsking(true);
        setSandboxReply(null);
        try {
            const res = await fetch('/api/notify-students', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-wtech-user-id': user?.id || '' },
                body: JSON.stringify({ action: 'ai-group-ask', question: q }),
            });
            const data = await res.json();
            if (res.ok && data.ok !== false) {
                setSandboxReply({ agent: data.agent, answer: data.answer });
                refreshLogs();
            } else {
                alert('Falha: ' + (data.error || `HTTP ${res.status}`));
            }
        } catch (e: any) {
            alert('Erro: ' + e.message);
        } finally {
            setAsking(false);
        }
    };

    const agentLabel = (id: string | null) => {
        if (!id || id === 'silencio') return '🤫 Silêncio';
        const meta = AI_AGENT_BY_ID[id as AIAgentId];
        return meta ? `${meta.emoji} ${meta.name}` : id;
    };

    if (!loaded) {
        return (
            <div className="bg-[var(--admin-surface-1)] border border-[var(--admin-border)] rounded-2xl p-5 flex items-center gap-2 text-[var(--admin-text-secondary)]">
                <Loader2 className="animate-spin" size={16} /> Carregando bot do grupo...
            </div>
        );
    }

    return (
        <div className="bg-[var(--admin-surface-1)] border border-[var(--admin-border)] rounded-2xl p-5 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Bot className="text-wtech-gold" size={20} />
                    <h3 className="text-lg font-black text-[var(--admin-text-primary)]">Bot do Grupo (perguntas & respostas)</h3>
                </div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                    <span className="text-xs font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider">
                        {enabled ? 'Ativado' : 'Desativado'}
                    </span>
                    <button
                        onClick={() => saveCfg({ [CFG_GROUP_BOT_ENABLED]: String(!enabled) })}
                        disabled={saving}
                        className={
                            'relative w-11 h-6 rounded-full transition-colors ' +
                            (enabled ? 'bg-wtech-gold' : 'bg-gray-400/40')
                        }
                    >
                        <span
                            className={
                                'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ' +
                                (enabled ? 'left-[22px]' : 'left-0.5')
                            }
                        />
                    </button>
                </label>
            </div>
            <p className="text-sm text-[var(--admin-text-secondary)] -mt-2">
                Toda pergunta feita no grupo é respondida na hora pela IA do setor certo (Rita → financeiro, Bia → atendimento, Léo → inscrições, Sofia → geral), consultando o banco de dados ao vivo.
            </p>

            {/* Grupo + Webhook */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl p-4 space-y-3">
                    <div className="text-xs font-bold uppercase tracking-wider text-[var(--admin-text-secondary)]">Grupo que o bot escuta</div>
                    <div className="text-sm font-bold text-[var(--admin-text-primary)] truncate">
                        {groupName || groupJid || 'Nenhum grupo configurado'}
                    </div>
                    {groupJid && <div className="text-[10px] font-mono text-[var(--admin-text-secondary)] truncate">{groupJid}</div>}
                    <button
                        onClick={loadGroups}
                        disabled={loadingGroups}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--admin-border)] text-xs font-bold text-[var(--admin-text-primary)] hover:bg-[var(--admin-surface-1)] transition-colors disabled:opacity-50"
                    >
                        {loadingGroups ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                        Listar grupos da instância
                    </button>
                    {groups.length > 0 && (
                        <select
                            value={groupJid}
                            onChange={(e) => {
                                const g = groups.find((x) => x.jid === e.target.value);
                                if (g) saveCfg({ [CFG_GROUP_BOT_GROUP_JID]: g.jid, [CFG_GROUP_BOT_GROUP_NAME]: g.subject });
                            }}
                            className="w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-1)] text-sm text-[var(--admin-text-primary)] p-2"
                        >
                            <option value="">Escolha o grupo…</option>
                            {groups.map((g) => (
                                <option key={g.jid} value={g.jid}>{g.subject}</option>
                            ))}
                        </select>
                    )}
                    <div className="text-[10px] text-[var(--admin-text-secondary)]">
                        Instância: <span className="font-mono">{instance || '— configure em Integrações'}</span> · padrão = grupo do relatório diário.
                    </div>
                </div>

                <div className="bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl p-4 space-y-3">
                    <div className="text-xs font-bold uppercase tracking-wider text-[var(--admin-text-secondary)]">Webhook (recebe as mensagens)</div>
                    <p className="text-xs text-[var(--admin-text-secondary)]">
                        Registra na Evolution API o endereço para onde as mensagens do grupo são entregues. Rode uma vez (e de novo se trocar de instância).
                    </p>
                    <button
                        onClick={registerWebhook}
                        disabled={registering}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-wtech-gold to-yellow-600 text-black text-xs font-bold shadow hover:scale-105 transition-transform disabled:opacity-50"
                    >
                        {registering ? <Loader2 size={14} className="animate-spin" /> : <Webhook size={14} />}
                        Ativar webhook no WhatsApp
                    </button>
                    {webhookOk && (
                        <div className="text-[10px] text-emerald-500 font-mono break-all">✓ Webhook registrado: {webhookOk}</div>
                    )}
                </div>
            </div>

            {/* Sandbox */}
            <div className="bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl p-4 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] flex items-center gap-2">
                    <MessageSquareText size={14} className="text-wtech-gold" /> Teste uma pergunta (não envia no grupo)
                </div>
                <div className="flex gap-2">
                    <input
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') askSandbox(); }}
                        placeholder='Ex.: "Qual o desconto total aplicado no curso de Belo Horizonte?"'
                        className="flex-1 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-1)] text-sm text-[var(--admin-text-primary)] px-3 py-2 focus:outline-none focus:border-wtech-gold"
                    />
                    <button
                        onClick={askSandbox}
                        disabled={asking || !question.trim()}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-wtech-gold to-yellow-600 text-black text-sm font-bold shadow hover:scale-105 transition-transform disabled:opacity-50"
                    >
                        {asking ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        Perguntar
                    </button>
                </div>
                {sandboxReply && (
                    <div className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-3">
                        <div className="text-xs font-bold text-wtech-gold mb-1">{agentLabel(sandboxReply.agent)}</div>
                        <div className="text-sm text-[var(--admin-text-primary)] whitespace-pre-wrap">
                            {sandboxReply.answer || 'O bot decidiu ficar em silêncio (mensagem não parece uma pergunta de negócio).'}
                        </div>
                    </div>
                )}
            </div>

            {/* Histórico */}
            <div className="bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] mb-3 flex items-center gap-2">
                    <History size={14} className="text-wtech-gold" /> Últimas respostas no grupo
                </div>
                {logs.length === 0 ? (
                    <p className="text-sm text-[var(--admin-text-secondary)]">Nenhuma pergunta respondida ainda.</p>
                ) : (
                    <div className="space-y-3">
                        {logs.map((l) => (
                            <div key={l.id} className="border-t border-[var(--admin-border)] pt-2 first:border-t-0 first:pt-0">
                                <div className="text-xs text-[var(--admin-text-secondary)]">
                                    <span className="font-bold text-[var(--admin-text-primary)]">{l.sender_name || 'Alguém'}:</span>{' '}
                                    {l.question}
                                </div>
                                <div className="text-sm text-[var(--admin-text-primary)] mt-1">
                                    <span className="font-bold text-wtech-gold">{agentLabel(l.agent)}:</span>{' '}
                                    {l.answer || <span className="italic text-[var(--admin-text-secondary)]">sem resposta</span>}
                                </div>
                                <div className="text-[10px] text-[var(--admin-text-secondary)] mt-0.5">
                                    {new Date(l.created_at).toLocaleString('pt-BR')}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default GroupBotPanel;
