/**
 * Caixinha de Pautas — camada de dados (tabela SITE_ContentInbox).
 *
 * Entrada rápida de pautas por qualquer pessoa da equipe pelo painel:
 * dúvidas ouvidas no balcão (→ "Dúvidas dos Seguidores"), ideias de post e
 * conhecimento técnico do Serginho (→ matéria-prima de compilados).
 * A IA lê os itens pendentes e os transforma em cards do calendário.
 */
import { supabase } from './supabaseClient';

export type InboxKind = 'duvida' | 'ideia' | 'conhecimento';

export interface InboxItem {
    id: string;
    kind: InboxKind;
    text: string;
    author: string | null;
    product_ref: string | null;
    processed: boolean;
    created_at: string;
}

export const INBOX_KIND_META: Record<InboxKind, { label: string; emoji: string }> = {
    duvida: { label: 'Dúvida ouvida', emoji: '❓' },
    ideia: { label: 'Ideia de post', emoji: '💡' },
    conhecimento: { label: 'Conhecimento técnico', emoji: '🔧' },
};

/** Busca os itens pendentes (não processados), mais antigos primeiro. */
export const fetchPendingInbox = async (): Promise<InboxItem[]> => {
    const { data, error } = await supabase
        .from('SITE_ContentInbox')
        .select('*')
        .eq('processed', false)
        .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []) as InboxItem[];
};

/** Registra uma nova pauta na caixinha. */
export const addInboxItem = async (
    item: { kind: InboxKind; text: string; author?: string; product_ref?: string },
): Promise<InboxItem> => {
    const { data, error } = await supabase
        .from('SITE_ContentInbox')
        .insert({
            kind: item.kind,
            text: item.text.trim(),
            author: item.author?.trim() || null,
            product_ref: item.product_ref?.trim() || null,
        })
        .select()
        .single();
    if (error) throw error;
    return data as InboxItem;
};

/** Marca uma pauta como processada (virou card ou foi arquivada). */
export const markInboxProcessed = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from('SITE_ContentInbox')
        .update({ processed: true })
        .eq('id', id);
    if (error) throw error;
};

// ─── Grounding do catálogo real ──────────────────────────────────────────────

/**
 * Amostra do catálogo real (produtos com estoque) para os prompts de IA:
 * a "Peça do dia" e os compilados passam a citar itens que existem de
 * verdade na prateleira, em vez de peças genéricas.
 */
export const buildCatalogContext = async (): Promise<string> => {
    const { data, error } = await supabase
        .from('SITE_Products')
        .select('name, category, current_stock')
        .gt('current_stock', 0)
        .order('updated_at', { ascending: false })
        .limit(70);
    if (error || !data || data.length === 0) return '';
    const byCategory: Record<string, string[]> = {};
    for (const p of data as { name: string; category: string | null }[]) {
        const cat = (p.category || 'Outros').split(',')[0].trim();
        (byCategory[cat] ||= []).push(p.name);
    }
    const lines = Object.entries(byCategory)
        .map(([cat, names]) => `- ${cat}: ${names.slice(0, 12).join(' · ')}`)
        .join('\n');
    return `CATÁLOGO REAL EM ESTOQUE (use APENAS estes itens em posts de produto/"Peça do dia" — cite o nome exato; nunca invente peça):
${lines}`;
};
