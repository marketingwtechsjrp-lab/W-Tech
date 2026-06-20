import React, { useState, useEffect } from 'react';
import { Bot, UserCheck, Clock, MessageSquare, CheckCircle2, Loader2, Smile, Frown, Meh, AlertTriangle, Sparkles, Tag } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { generateContent } from '../../../lib/ai';

interface ConvRow {
  id: string;
  profile_name: string | null;
  wa_id: string;
  status: string | null;
  ai_summary: string | null;
  ai_sentiment: string | null;
  ai_topics: string[] | null;
  ai_priority: string | null;
  ai_suggested_action: string | null;
}

const SENTIMENT = {
  positivo: { Icon: Smile, cls: 'text-emerald-500 bg-emerald-500/10', label: 'Positivo' },
  neutro: { Icon: Meh, cls: 'text-gray-500 bg-gray-500/10', label: 'Neutro' },
  negativo: { Icon: Frown, cls: 'text-red-500 bg-red-500/10', label: 'Negativo' },
} as const;

const AIAnalyticsView: React.FC = () => {
  const [convs, setConvs] = useState<ConvRow[] | null>(null);
  const [msgCounts, setMsgCounts] = useState<Record<string, number>>({});
  const [execSummary, setExecSummary] = useState<string | null>(null);
  const [execLoading, setExecLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const [c, m] = await Promise.all([
        supabase.from('SITE_WhatsAppCloudConversations')
          .select('id, profile_name, wa_id, status, ai_summary, ai_sentiment, ai_topics, ai_priority, ai_suggested_action')
          .order('updated_at', { ascending: false }),
        supabase.from('SITE_WhatsAppCloudMessages').select('sent_by'),
      ]);
      setConvs((c.data || []) as ConvRow[]);
      const counts: Record<string, number> = {};
      (m.data || []).forEach((x: any) => { counts[x.sent_by] = (counts[x.sent_by] || 0) + 1; });
      setMsgCounts(counts);
    })();
  }, []);

  if (!convs) {
    return <div className="flex items-center justify-center py-20 text-[var(--admin-text-tertiary)]"><Loader2 className="animate-spin mr-2" /> Carregando relatórios...</div>;
  }

  const aiSent = msgCounts['ai'] || 0;
  const humanSent = msgCounts['human'] || 0;
  const totalReplies = aiSent + humanSent;
  const aiShare = totalReplies > 0 ? Math.round((aiSent / totalReplies) * 100) : 0;

  const byStatus = (s: string) => convs.filter((c) => (c.status || 'bot') === s).length;
  const bySentiment = (s: string) => convs.filter((c) => c.ai_sentiment === s).length;
  const byPriority = (p: string) => convs.filter((c) => c.ai_priority === p).length;
  const analyzed = convs.filter((c) => c.ai_summary);
  const needAttention = convs.filter((c) => c.ai_priority === 'alta' || c.status === 'pendente');

  // Top tópicos
  const topicMap: Record<string, number> = {};
  convs.forEach((c) => (c.ai_topics || []).forEach((t) => { const k = t.trim(); if (k) topicMap[k] = (topicMap[k] || 0) + 1; }));
  const topTopics = Object.entries(topicMap).sort((a, b) => b[1] - a[1]).slice(0, 8);

  const cards = [
    { label: 'Conversas', value: convs.length, Icon: MessageSquare, cls: 'text-sky-500 bg-sky-500/10' },
    { label: 'Respondidas pela IA', value: aiSent, Icon: Bot, cls: 'text-violet-500 bg-violet-500/10' },
    { label: 'Respostas humanas', value: humanSent, Icon: UserCheck, cls: 'text-emerald-500 bg-emerald-500/10' },
    { label: 'Precisam de atenção', value: needAttention.length, Icon: AlertTriangle, cls: 'text-amber-500 bg-amber-500/10' },
  ];

  const genExecutive = async () => {
    setExecLoading(true);
    setExecSummary(null);
    try {
      const stats = {
        conversas: convs.length,
        respondidas_ia: aiSent,
        respondidas_humano: humanSent,
        deflexao_ia_pct: aiShare,
        sentimento: { positivo: bySentiment('positivo'), neutro: bySentiment('neutro'), negativo: bySentiment('negativo') },
        prioridade: { alta: byPriority('alta'), media: byPriority('media'), baixa: byPriority('baixa') },
        status: { bot: byStatus('bot'), pendente: byStatus('pendente'), humano: byStatus('humano'), encerrado: byStatus('encerrado') },
        top_topicos: topTopics.map(([t, n]) => `${t} (${n})`),
        resumos: analyzed.slice(0, 30).map((c) => c.ai_summary),
      };
      const out = await generateContent(
        JSON.stringify(stats, null, 2),
        'Você é um gerente de atendimento. Com base nestas métricas e resumos de conversas de WhatsApp, escreva um RELATÓRIO EXECUTIVO em português do Brasil: principais temas, sentimento geral, gargalos, oportunidades de venda e 3 a 5 recomendações práticas. Use texto corrido com tópicos curtos, sem markdown pesado.'
      );
      setExecSummary(out);
    } catch (e: any) {
      setExecSummary('Erro ao gerar relatório: ' + (e?.message || 'verifique as chaves de IA em Configurações.'));
    } finally {
      setExecLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Cards principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-[var(--admin-surface-1)] border border-[var(--admin-border)] rounded-2xl p-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${c.cls}`}><c.Icon size={20} /></div>
            <p className="text-2xl font-black text-[var(--admin-text-primary)]">{c.value}</p>
            <p className="text-xs text-[var(--admin-text-secondary)]">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Deflexão + sentimento + prioridade */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[var(--admin-surface-1)] border border-[var(--admin-border)] rounded-2xl p-5">
          <h4 className="text-sm font-bold text-[var(--admin-text-primary)] mb-3 flex items-center gap-2"><CheckCircle2 size={15} /> Resolução pela IA</h4>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-3 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
              <div className="h-full bg-violet-500" style={{ width: `${aiShare}%` }} />
            </div>
            <span className="text-sm font-bold text-[var(--admin-text-primary)] shrink-0">{aiShare}%</span>
          </div>
          <p className="text-xs text-[var(--admin-text-tertiary)] mt-2">{aiSent} de {totalReplies} respostas enviadas.</p>
        </div>

        <div className="bg-[var(--admin-surface-1)] border border-[var(--admin-border)] rounded-2xl p-5">
          <h4 className="text-sm font-bold text-[var(--admin-text-primary)] mb-3">Sentimento</h4>
          <div className="space-y-2">
            {(['positivo', 'neutro', 'negativo'] as const).map((s) => {
              const cfg = SENTIMENT[s];
              return (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${cfg.cls}`}><cfg.Icon size={15} /></div>
                  <span className="text-sm text-[var(--admin-text-secondary)] flex-1">{cfg.label}</span>
                  <span className="text-sm font-bold text-[var(--admin-text-primary)]">{bySentiment(s)}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-[var(--admin-surface-1)] border border-[var(--admin-border)] rounded-2xl p-5">
          <h4 className="text-sm font-bold text-[var(--admin-text-primary)] mb-3">Prioridade</h4>
          <div className="space-y-2">
            {[['alta', 'text-red-500'], ['media', 'text-amber-500'], ['baixa', 'text-emerald-500']].map(([p, cls]) => (
              <div key={p} className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${cls.replace('text-', 'bg-')}`} />
                <span className="text-sm text-[var(--admin-text-secondary)] flex-1 capitalize">{p}</span>
                <span className="text-sm font-bold text-[var(--admin-text-primary)]">{byPriority(p)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top tópicos */}
      {topTopics.length > 0 && (
        <div className="bg-[var(--admin-surface-1)] border border-[var(--admin-border)] rounded-2xl p-5">
          <h4 className="text-sm font-bold text-[var(--admin-text-primary)] mb-3 flex items-center gap-2"><Tag size={15} /> Principais tópicos</h4>
          <div className="flex flex-wrap gap-2">
            {topTopics.map(([t, n]) => (
              <span key={t} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--admin-surface-3)] text-[var(--admin-text-secondary)]">
                {t} <span className="opacity-60">({n})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Resumo executivo (IA) */}
      <div className="bg-[var(--admin-surface-1)] border border-[var(--admin-border)] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-bold text-[var(--admin-text-primary)] flex items-center gap-2"><Sparkles size={15} /> Relatório executivo (IA)</h4>
          <button onClick={genExecutive} disabled={execLoading}
            className="bg-violet-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 disabled:opacity-50">
            {execLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Gerar
          </button>
        </div>
        {execSummary
          ? <div className="text-sm text-[var(--admin-text-secondary)] whitespace-pre-wrap leading-relaxed">{execSummary}</div>
          : <p className="text-xs text-[var(--admin-text-tertiary)]">Gera uma análise do período com temas, sentimento, gargalos e recomendações.</p>}
      </div>

      {/* Conversas que precisam de atenção */}
      {needAttention.length > 0 && (
        <div className="bg-[var(--admin-surface-1)] border border-amber-500/30 rounded-2xl p-5">
          <h4 className="text-sm font-bold text-[var(--admin-text-primary)] mb-3 flex items-center gap-2"><AlertTriangle size={15} className="text-amber-500" /> Precisam de atenção ({needAttention.length})</h4>
          <div className="space-y-2">
            {needAttention.slice(0, 10).map((c) => (
              <div key={c.id} className="border border-[var(--admin-border)] rounded-lg p-3 bg-[var(--admin-surface-2)]">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-sm font-bold text-[var(--admin-text-primary)] truncate">{c.profile_name || c.wa_id}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {c.ai_priority && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 capitalize">{c.ai_priority}</span>}
                    {c.status && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-500/15 text-gray-500 capitalize">{c.status}</span>}
                  </div>
                </div>
                {c.ai_summary && <p className="text-xs text-[var(--admin-text-secondary)]">{c.ai_summary}</p>}
                {c.ai_suggested_action && <p className="text-[11px] text-violet-500 mt-1">→ {c.ai_suggested_action}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resumos por conversa */}
      {analyzed.length > 0 && (
        <div className="bg-[var(--admin-surface-1)] border border-[var(--admin-border)] rounded-2xl p-5">
          <h4 className="text-sm font-bold text-[var(--admin-text-primary)] mb-3">Conversas analisadas ({analyzed.length})</h4>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {analyzed.slice(0, 50).map((c) => {
              const sent = c.ai_sentiment && (SENTIMENT as any)[c.ai_sentiment];
              return (
                <div key={c.id} className="flex items-start gap-3 border-b border-[var(--admin-border)] pb-2">
                  {sent && <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${sent.cls}`}><sent.Icon size={14} /></div>}
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[var(--admin-text-primary)] truncate">{c.profile_name || c.wa_id}</p>
                    <p className="text-xs text-[var(--admin-text-secondary)]">{c.ai_summary}</p>
                    {c.ai_topics && c.ai_topics.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {c.ai_topics.slice(0, 4).map((t, i) => <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--admin-surface-3)] text-[var(--admin-text-tertiary)]">{t}</span>)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Status */}
      <div className="bg-[var(--admin-surface-1)] border border-[var(--admin-border)] rounded-2xl p-5">
        <h4 className="text-sm font-bold text-[var(--admin-text-primary)] mb-3">Conversas por status</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {['bot', 'pendente', 'humano', 'encerrado'].map((s) => (
            <div key={s} className="border border-[var(--admin-border)] rounded-lg p-3 bg-[var(--admin-surface-2)] text-center">
              <p className="text-xl font-black text-[var(--admin-text-primary)]">{byStatus(s)}</p>
              <p className="text-[11px] text-[var(--admin-text-secondary)] capitalize">{s === 'bot' ? 'IA' : s}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AIAnalyticsView;
