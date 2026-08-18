/**
 * Caixinha de Pautas — camada de dados (tabela SITE_ContentInbox).
 *
 * Entrada rápida de pautas por qualquer pessoa da equipe pelo painel:
 * dúvidas ouvidas no balcão (→ "Dúvidas dos Seguidores"), ideias de post e
 * conhecimento técnico do Serginho (→ matéria-prima de compilados).
 * A IA lê os itens pendentes e os transforma em cards do calendário.
 */
import { contentPlannerRequest } from './contentPlannerApi';

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
    return contentPlannerRequest<InboxItem[]>('inbox');
};

/** Registra uma nova pauta na caixinha. */
export const addInboxItem = async (
    item: { kind: InboxKind; text: string; author?: string; product_ref?: string },
): Promise<InboxItem> => {
    return contentPlannerRequest<InboxItem>('inbox', {
        method: 'POST',
        body: item,
    });
};

/** Marca uma pauta como processada (virou card ou foi arquivada). */
export const markInboxProcessed = async (id: string): Promise<void> => {
    await contentPlannerRequest<InboxItem>('inbox', {
        method: 'PUT',
        body: { id },
    });
};

// ─── Grounding do catálogo real ──────────────────────────────────────────────

/**
 * Amostra do catálogo real (produtos com estoque) para os prompts de IA:
 * a "Peça do dia" e os compilados passam a citar itens que existem de
 * verdade na prateleira, em vez de peças genéricas.
 */
export const buildCatalogContext = async (): Promise<string> => {
    let data: { name: string; category: string | null; current_stock: number | null }[];
    try {
        data = await contentPlannerRequest<typeof data>('catalog');
    } catch {
        return '';
    }
    if (data.length === 0) return '';
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
