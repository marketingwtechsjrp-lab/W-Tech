import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Check,
  CheckCircle2,
  Edit3,
  ExternalLink,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

type GlossaryTermRow = {
  id: string;
  term: string;
  slug: string;
  letter: string;
  niche: string | null;
  category: string | null;
  content: string;
  summary: string | null;
  seo_title: string | null;
  image: string | null;
  author: string;
  origin: 'MANUAL' | 'AI_GEMINI' | 'AI_OPENAI' | 'AI_OPENROUTER' | 'CSV_IMPORT';
  published: boolean;
  reviewed: boolean;
  views: number;
  created_at: string;
  updated_at: string;
};

type AIConfig = {
  provider: 'system' | 'gemini' | 'openai' | 'openrouter';
  model: string;
};

type Notice = { type: 'success' | 'error' | 'info'; text: string };

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const prefixes = ['Nenhum', 'O que é', 'Como funciona', 'Para que serve', 'Como escolher'];
const providers = [
  { value: 'system', label: 'Configuração do sistema' },
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'openrouter', label: 'OpenRouter' },
] as const;

function originLabel(origin: GlossaryTermRow['origin']) {
  if (origin === 'AI_GEMINI') return 'IA · Gemini';
  if (origin === 'AI_OPENAI') return 'IA · OpenAI';
  if (origin === 'AI_OPENROUTER') return 'IA · OpenRouter';
  if (origin === 'CSV_IMPORT') return 'CSV';
  return 'Manual';
}

const GlossaryManagerView: React.FC = () => {
  const { user } = useAuth();
  const [terms, setTerms] = useState<GlossaryTermRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [migrationRequired, setMigrationRequired] = useState(false);

  const [search, setSearch] = useState('');
  const [letterFilter, setLetterFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published'>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [niche, setNiche] = useState('suspensão de motocicletas off-road e on-road');
  const [generatorLetter, setGeneratorLetter] = useState('A');
  const [quantity, setQuantity] = useState(20);
  const [prefix, setPrefix] = useState('Nenhum');
  const [instructions, setInstructions] = useState('');
  const [manualTerm, setManualTerm] = useState('');
  const [ai, setAI] = useState<AIConfig>({ provider: 'system', model: '' });

  const [editor, setEditor] = useState<GlossaryTermRow | null>(null);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number; term: string } | null>(null);

  const request = useCallback(async (method: string, body?: Record<string, unknown>) => {
    const response = await fetch('/api/glossary', {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-wtech-user-id': user?.id || '',
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.error || 'Falha ao processar o glossário.') as Error & { code?: string };
      error.code = payload.code;
      throw error;
    }
    return payload;
  }, [user?.id]);

  const loadTerms = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const payload = await request('GET');
      setTerms(payload.terms || []);
      setMigrationRequired(false);
      if (payload.ai?.provider) {
        setAI((current) => ({
          provider: current.provider,
          model: current.model || payload.ai.model || '',
        }));
      }
    } catch (error: any) {
      setMigrationRequired(error.code === 'migration_required');
      setNotice({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  }, [request, user?.id]);

  useEffect(() => {
    loadTerms();
  }, [loadTerms]);

  const filtered = useMemo(() => terms.filter((term) => {
    if (letterFilter && term.letter !== letterFilter) return false;
    if (statusFilter === 'draft' && term.published) return false;
    if (statusFilter === 'published' && !term.published) return false;
    const normalized = search.trim().toLowerCase();
    if (!normalized) return true;
    return [term.term, term.niche, term.category, term.summary]
      .some((value) => String(value || '').toLowerCase().includes(normalized));
  }), [letterFilter, search, statusFilter, terms]);

  const publishedCount = terms.filter((term) => term.published).length;
  const pendingCount = terms.length - publishedCount;

  async function suggestTerms() {
    setBusy('suggest');
    setNotice(null);
    try {
      const payload = await request('POST', {
        action: 'suggest',
        niche,
        letter: generatorLetter,
        quantity,
        prefix,
        instructions,
        provider: ai.provider,
        model: ai.model || undefined,
      });
      setNotice({
        type: 'success',
        text: `${payload.suggested} sugestões processadas; ${payload.inserted} novos verbetes adicionados com ${payload.provider}.`,
      });
      setInstructions('');
      await loadTerms();
    } catch (error: any) {
      setNotice({ type: 'error', text: error.message });
    } finally {
      setBusy(null);
    }
  }

  async function addManual(event: React.FormEvent) {
    event.preventDefault();
    if (!manualTerm.trim()) return;
    setBusy('manual');
    try {
      await request('POST', { term: manualTerm.trim(), niche });
      setManualTerm('');
      setNotice({ type: 'success', text: 'Verbete adicionado como rascunho.' });
      await loadTerms();
    } catch (error: any) {
      setNotice({ type: 'error', text: error.message });
    } finally {
      setBusy(null);
    }
  }

  async function generateDefinition(term: GlossaryTermRow, quiet = false) {
    setBusy(`generate:${term.id}`);
    try {
      await request('POST', {
        action: 'generate',
        id: term.id,
        provider: ai.provider,
        model: ai.model || undefined,
      });
      if (!quiet) {
        setNotice({ type: 'success', text: `Definição de “${term.term}” gerada e publicada.` });
        await loadTerms();
      }
      return true;
    } catch (error: any) {
      if (!quiet) setNotice({ type: 'error', text: error.message });
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function generateSelected() {
    const selected = terms.filter((term) => selectedIds.includes(term.id) && !term.published);
    if (!selected.length) {
      setNotice({ type: 'info', text: 'Selecione ao menos um rascunho para gerar.' });
      return;
    }

    let success = 0;
    for (let index = 0; index < selected.length; index += 1) {
      const term = selected[index];
      setBulkProgress({ current: index + 1, total: selected.length, term: term.term });
      if (await generateDefinition(term, true)) success += 1;
    }
    setBulkProgress(null);
    setSelectedIds([]);
    setNotice({
      type: success === selected.length ? 'success' : 'info',
      text: `Geração em lote concluída: ${success} de ${selected.length} verbetes publicados.`,
    });
    await loadTerms();
  }

  async function saveEditor() {
    if (!editor) return;
    setBusy(`edit:${editor.id}`);
    try {
      await request('PATCH', {
        id: editor.id,
        term: editor.term,
        niche: editor.niche,
        category: editor.category,
        summary: editor.summary,
        seo_title: editor.seo_title,
        content: editor.content,
        published: editor.published,
        reviewed: editor.reviewed,
      });
      setEditor(null);
      setNotice({ type: 'success', text: 'Verbete salvo.' });
      await loadTerms();
    } catch (error: any) {
      setNotice({ type: 'error', text: error.message });
    } finally {
      setBusy(null);
    }
  }

  async function togglePublished(term: GlossaryTermRow) {
    if (!term.content && !term.published) {
      setNotice({ type: 'info', text: 'Gere ou escreva a definição antes de publicar.' });
      return;
    }
    setBusy(`publish:${term.id}`);
    try {
      await request('PATCH', { id: term.id, published: !term.published });
      await loadTerms();
    } catch (error: any) {
      setNotice({ type: 'error', text: error.message });
    } finally {
      setBusy(null);
    }
  }

  async function removeTerm(term: GlossaryTermRow) {
    if (!window.confirm(`Excluir o verbete “${term.term}”?`)) return;
    setBusy(`delete:${term.id}`);
    try {
      await request('DELETE', { id: term.id });
      setSelectedIds((current) => current.filter((id) => id !== term.id));
      setNotice({ type: 'success', text: 'Verbete excluído.' });
      await loadTerms();
    } catch (error: any) {
      setNotice({ type: 'error', text: error.message });
    } finally {
      setBusy(null);
    }
  }

  function toggleAll() {
    const ids = filtered.map((term) => term.id);
    const allSelected = ids.length > 0 && ids.every((id) => selectedIds.includes(id));
    setSelectedIds(allSelected
      ? selectedIds.filter((id) => !ids.includes(id))
      : Array.from(new Set([...selectedIds, ...ids])));
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-wtech-gold/15 text-wtech-gold flex items-center justify-center">
              <BookOpen size={22} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-[var(--admin-text-primary)]">Glossário Técnico</h3>
              <p className="text-sm text-[var(--admin-text-secondary)]">Crie, revise e publique verbetes técnicos com apoio da IA configurada no W-Tech.</p>
            </div>
          </div>
        </div>
        <a
          href="/glossario"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--admin-border)] text-sm font-bold text-[var(--admin-text-primary)] hover:border-wtech-gold"
        >
          <ExternalLink size={15} /> Ver glossário público
        </a>
      </div>

      {notice && (
        <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
          notice.type === 'error'
            ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950/20 dark:border-red-900'
            : notice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900'
              : 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/20 dark:border-blue-900'
        }`}>
          {notice.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span className="flex-1">{notice.text}</span>
          <button onClick={() => setNotice(null)} aria-label="Fechar aviso"><X size={16} /></button>
        </div>
      )}

      {migrationRequired && (
        <div className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50 p-5 dark:bg-amber-950/20">
          <h4 className="font-black text-amber-900 dark:text-amber-300">Migração necessária</h4>
          <p className="text-sm text-amber-800 dark:text-amber-400 mt-1">
            Execute <code>migrations/2026-07-28_add_glossary_generator.sql</code> no banco Supabase antes de usar o gerador.
          </p>
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { label: 'Total de verbetes', value: terms.length, color: 'text-[var(--admin-text-primary)]' },
          { label: 'Publicados', value: publishedCount, color: 'text-emerald-500' },
          { label: 'Aguardando conteúdo', value: pendingCount, color: 'text-amber-500' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-5">
            <p className="text-xs font-black uppercase tracking-wider text-[var(--admin-text-secondary)]">{stat.label}</p>
            <p className={`text-3xl font-black mt-2 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {bulkProgress && (
        <div className="rounded-2xl bg-black text-white p-4">
          <div className="flex justify-between gap-4 text-sm mb-3">
            <span className="flex items-center gap-2"><Loader2 size={15} className="animate-spin text-wtech-gold" /> Gerando “{bulkProgress.term}”</span>
            <strong>{bulkProgress.current}/{bulkProgress.total}</strong>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-wtech-gold transition-all" style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }} />
          </div>
        </div>
      )}

      <div className="grid xl:grid-cols-[360px_minmax(0,1fr)] gap-6 items-start">
        <div className="space-y-5">
          <section className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-1)] overflow-hidden">
            <div className="bg-black text-white px-5 py-4">
              <h4 className="font-black flex items-center gap-2"><Sparkles size={17} className="text-wtech-gold" /> Sugerir verbetes com IA</h4>
              <p className="text-xs text-gray-400 mt-1">A IA cria rascunhos; o conteúdo é gerado na etapa seguinte.</p>
            </div>
            <div className="p-5 space-y-4">
              <label className="block">
                <span className="block text-[10px] font-black uppercase tracking-wider text-[var(--admin-text-secondary)] mb-1.5">Nicho / contexto</span>
                <input value={niche} onChange={(event) => setNiche(event.target.value)} className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-3 py-2.5 text-sm" />
              </label>

              <div>
                <span className="block text-[10px] font-black uppercase tracking-wider text-[var(--admin-text-secondary)] mb-2">Letra inicial</span>
                <div className="grid grid-cols-7 gap-1">
                  {alphabet.map((item) => (
                    <button
                      key={item}
                      onClick={() => setGeneratorLetter(item)}
                      className={`h-8 rounded-lg text-xs font-black border transition-colors ${
                        generatorLetter === item
                          ? 'bg-wtech-red border-wtech-red text-white'
                          : 'border-[var(--admin-border)] text-[var(--admin-text-secondary)] hover:border-wtech-gold'
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label>
                  <span className="block text-[10px] font-black uppercase tracking-wider text-[var(--admin-text-secondary)] mb-1.5">Quantidade</span>
                  <input type="number" min={5} max={50} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-3 py-2.5 text-sm" />
                </label>
                <label>
                  <span className="block text-[10px] font-black uppercase tracking-wider text-[var(--admin-text-secondary)] mb-1.5">Estilo</span>
                  <select value={prefix} onChange={(event) => setPrefix(event.target.value)} className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-3 py-2.5 text-sm">
                    {prefixes.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="block text-[10px] font-black uppercase tracking-wider text-[var(--admin-text-secondary)] mb-1.5">Provider</span>
                <select
                  value={ai.provider}
                  onChange={(event) => setAI({ provider: event.target.value as AIConfig['provider'], model: '' })}
                  className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-3 py-2.5 text-sm"
                >
                  {providers.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
                <p className="text-[10px] text-[var(--admin-text-secondary)] mt-1.5">As chaves continuam centralizadas em Configurações → IA & Integrações.</p>
              </label>

              <label className="block">
                <span className="block text-[10px] font-black uppercase tracking-wider text-[var(--admin-text-secondary)] mb-1.5">Modelo (opcional)</span>
                <input value={ai.model} onChange={(event) => setAI({ ...ai, model: event.target.value })} placeholder="Usar modelo padrão configurado" className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-3 py-2.5 text-sm" />
              </label>

              <label className="block">
                <span className="block text-[10px] font-black uppercase tracking-wider text-[var(--admin-text-secondary)] mb-1.5">Instruções extras</span>
                <textarea value={instructions} onChange={(event) => setInstructions(event.target.value)} rows={3} placeholder="Ex.: priorizar diagnóstico de suspensão dianteira" className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-3 py-2.5 text-sm resize-none" />
              </label>

              <button
                onClick={suggestTerms}
                disabled={busy === 'suggest' || migrationRequired}
                className="w-full rounded-xl bg-wtech-red text-white py-3 font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {busy === 'suggest' ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                Gerar sugestões
              </button>
            </div>
          </section>

          <form onSubmit={addManual} className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-5">
            <h4 className="font-black text-[var(--admin-text-primary)] flex items-center gap-2 mb-3"><Plus size={16} className="text-wtech-gold" /> Cadastro manual</h4>
            <div className="flex gap-2">
              <input value={manualTerm} onChange={(event) => setManualTerm(event.target.value)} placeholder="Nome do termo…" className="min-w-0 flex-1 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-3 py-2.5 text-sm" />
              <button disabled={!manualTerm.trim() || busy === 'manual' || migrationRequired} className="h-11 w-11 rounded-xl bg-black text-white flex items-center justify-center disabled:opacity-50">
                {busy === 'manual' ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              </button>
            </div>
          </form>
        </div>

        <section className="space-y-4 min-w-0">
          <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-4 space-y-4">
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-3.5 text-gray-400" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar verbete, nicho ou categoria…" className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)] pl-9 pr-3 py-2.5 text-sm" />
              </div>
              <div className="flex rounded-xl border border-[var(--admin-border)] overflow-hidden">
                {([
                  ['all', 'Todos'],
                  ['draft', 'Rascunhos'],
                  ['published', 'Publicados'],
                ] as const).map(([value, label]) => (
                  <button key={value} onClick={() => setStatusFilter(value)} className={`px-3 py-2 text-xs font-black ${statusFilter === value ? 'bg-black text-white' : 'text-[var(--admin-text-secondary)]'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 border-t border-[var(--admin-border)] pt-3">
              <button onClick={() => setLetterFilter(null)} className={`h-7 px-2.5 rounded-lg text-[10px] font-black ${letterFilter === null ? 'bg-wtech-red text-white' : 'bg-[var(--admin-surface-2)] text-[var(--admin-text-secondary)]'}`}>TUDO</button>
              {alphabet.map((item) => {
                const count = terms.filter((term) => term.letter === item).length;
                if (!count) return null;
                return (
                  <button key={item} onClick={() => setLetterFilter(item)} className={`h-7 px-2 rounded-lg text-[10px] font-black ${letterFilter === item ? 'bg-wtech-red text-white' : 'bg-[var(--admin-surface-2)] text-[var(--admin-text-secondary)]'}`}>
                    {item} <span className="opacity-60">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedIds.length > 0 && (
            <div className="rounded-2xl border border-wtech-gold/30 bg-wtech-gold/5 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm font-bold text-[var(--admin-text-primary)]">{selectedIds.length} selecionados</span>
              <div className="flex gap-2">
                <button onClick={generateSelected} disabled={!!bulkProgress} className="rounded-lg bg-black text-white px-3 py-2 text-xs font-black flex items-center gap-2 disabled:opacity-50">
                  <Sparkles size={13} /> Gerar definições
                </button>
                <button onClick={() => setSelectedIds([])} className="rounded-lg border border-[var(--admin-border)] px-3 py-2 text-xs font-black">Limpar</button>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-1)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead className="bg-[var(--admin-surface-2)] text-[10px] uppercase tracking-wider text-[var(--admin-text-secondary)]">
                  <tr>
                    <th className="p-3 w-10"><input type="checkbox" checked={filtered.length > 0 && filtered.every((term) => selectedIds.includes(term.id))} onChange={toggleAll} /></th>
                    <th className="p-3 text-left">Verbete</th>
                    <th className="p-3 text-left">Origem</th>
                    <th className="p-3 text-left">Status</th>
                    <th className="p-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--admin-border)]">
                  {loading && (
                    <tr><td colSpan={5} className="p-12 text-center text-[var(--admin-text-secondary)]"><Loader2 className="animate-spin mx-auto mb-2" /> Carregando…</td></tr>
                  )}
                  {!loading && filtered.length === 0 && (
                    <tr><td colSpan={5} className="p-12 text-center text-[var(--admin-text-secondary)]"><BookOpen className="mx-auto mb-2 opacity-30" /> Nenhum verbete encontrado.</td></tr>
                  )}
                  {!loading && filtered.map((term) => (
                    <tr key={term.id} className="hover:bg-[var(--admin-surface-2)]/50">
                      <td className="p-3 text-center">
                        <input type="checkbox" checked={selectedIds.includes(term.id)} onChange={() => setSelectedIds((current) => current.includes(term.id) ? current.filter((id) => id !== term.id) : [...current, term.id])} />
                      </td>
                      <td className="p-3">
                        <div className="flex items-start gap-3">
                          <span className="h-8 w-8 shrink-0 rounded-lg bg-wtech-gold/15 text-wtech-gold flex items-center justify-center text-xs font-black">{term.letter}</span>
                          <div className="min-w-0">
                            <p className="font-black text-sm text-[var(--admin-text-primary)]">{term.term}</p>
                            <p className="text-xs text-[var(--admin-text-secondary)] truncate max-w-sm">{term.summary || term.niche || 'Sem definição gerada'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="rounded-lg border border-[var(--admin-border)] px-2 py-1 text-[10px] font-bold text-[var(--admin-text-secondary)]">{originLabel(term.origin)}</span>
                      </td>
                      <td className="p-3">
                        <button onClick={() => togglePublished(term)} disabled={busy === `publish:${term.id}`} className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-black border ${term.published ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                          {term.published ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
                          {term.published ? 'Publicado' : 'Rascunho'}
                        </button>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-1">
                          {!term.published && (
                            <button onClick={() => generateDefinition(term)} disabled={busy === `generate:${term.id}` || !!bulkProgress} title="Gerar definição" className="inline-flex items-center gap-1 rounded-lg bg-wtech-red/10 text-wtech-red px-2.5 py-1.5 text-xs font-black disabled:opacity-50">
                              {busy === `generate:${term.id}` ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} Gerar
                            </button>
                          )}
                          <button onClick={() => setEditor({ ...term })} title="Editar verbete" className="p-2 text-[var(--admin-text-secondary)] hover:text-wtech-gold"><Edit3 size={15} /></button>
                          {term.published && <a href={`/glossario/${term.slug}`} target="_blank" rel="noreferrer" title="Ver verbete" className="p-2 text-[var(--admin-text-secondary)] hover:text-wtech-gold"><ExternalLink size={15} /></a>}
                          <button onClick={() => removeTerm(term)} disabled={busy === `delete:${term.id}`} title="Excluir verbete" className="p-2 text-[var(--admin-text-secondary)] hover:text-red-500"><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-[var(--admin-border)] px-4 py-3 text-xs text-[var(--admin-text-secondary)]">{filtered.length} de {terms.length} verbetes</div>
          </div>
        </section>
      </div>

      {editor && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onMouseDown={(event) => event.target === event.currentTarget && setEditor(null)}>
          <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl bg-[var(--admin-surface-1)] border border-[var(--admin-border)] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-4 bg-[var(--admin-surface-1)] border-b border-[var(--admin-border)] px-5 py-4">
              <div>
                <h4 className="text-xl font-black text-[var(--admin-text-primary)]">Editar verbete</h4>
                <p className="text-xs text-[var(--admin-text-secondary)]">Revise o texto gerado antes de marcar como revisado.</p>
              </div>
              <button onClick={() => setEditor(null)} className="p-2"><X /></button>
            </div>
            <div className="p-5 md:p-7 space-y-5">
              <div className="grid md:grid-cols-2 gap-4">
                <label>
                  <span className="block text-xs font-black mb-1.5 text-[var(--admin-text-secondary)]">TERMO</span>
                  <input value={editor.term} onChange={(event) => setEditor({ ...editor, term: event.target.value })} className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-3 py-2.5" />
                </label>
                <label>
                  <span className="block text-xs font-black mb-1.5 text-[var(--admin-text-secondary)]">CATEGORIA</span>
                  <input value={editor.category || ''} onChange={(event) => setEditor({ ...editor, category: event.target.value })} className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-3 py-2.5" />
                </label>
              </div>
              <label className="block">
                <span className="block text-xs font-black mb-1.5 text-[var(--admin-text-secondary)]">NICHO / CONTEXTO</span>
                <input value={editor.niche || ''} onChange={(event) => setEditor({ ...editor, niche: event.target.value })} className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-3 py-2.5" />
              </label>
              <label className="block">
                <span className="flex justify-between text-xs font-black mb-1.5 text-[var(--admin-text-secondary)]"><span>TÍTULO SEO</span><span>{(editor.seo_title || '').length}/60</span></span>
                <input value={editor.seo_title || ''} onChange={(event) => setEditor({ ...editor, seo_title: event.target.value })} className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-3 py-2.5" />
              </label>
              <label className="block">
                <span className="flex justify-between text-xs font-black mb-1.5 text-[var(--admin-text-secondary)]"><span>RESUMO / META DESCRIPTION</span><span>{(editor.summary || '').length}/155</span></span>
                <textarea value={editor.summary || ''} onChange={(event) => setEditor({ ...editor, summary: event.target.value })} rows={3} className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-3 py-2.5 resize-none" />
              </label>
              <label className="block">
                <span className="block text-xs font-black mb-1.5 text-[var(--admin-text-secondary)]">CONTEÚDO HTML</span>
                <textarea value={editor.content || ''} onChange={(event) => setEditor({ ...editor, content: event.target.value })} rows={16} className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-3 py-3 font-mono text-sm" />
              </label>
              <div className="flex flex-wrap gap-5">
                <label className="flex items-center gap-2 text-sm font-bold text-[var(--admin-text-primary)]"><input type="checkbox" checked={editor.published} onChange={(event) => setEditor({ ...editor, published: event.target.checked })} /> Publicado</label>
                <label className="flex items-center gap-2 text-sm font-bold text-[var(--admin-text-primary)]"><input type="checkbox" checked={editor.reviewed} onChange={(event) => setEditor({ ...editor, reviewed: event.target.checked })} /> Revisado por humano</label>
              </div>
            </div>
            <div className="sticky bottom-0 flex justify-end gap-3 bg-[var(--admin-surface-1)] border-t border-[var(--admin-border)] px-5 py-4">
              <button onClick={() => setEditor(null)} className="px-4 py-2.5 rounded-xl border border-[var(--admin-border)] font-bold text-sm">Cancelar</button>
              <button onClick={saveEditor} disabled={busy === `edit:${editor.id}`} className="px-5 py-2.5 rounded-xl bg-black text-white font-black text-sm flex items-center gap-2 disabled:opacity-50">
                {busy === `edit:${editor.id}` ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Salvar verbete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GlossaryManagerView;
