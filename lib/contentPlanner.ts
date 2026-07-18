/**
 * Planejador de Conteúdo — camada de dados do Marketing Hub → aba "Planejador".
 *
 * Calendário de posts das redes sociais (tabela SITE_ContentPosts na VPS).
 * Cada card segue o padrão editorial da equipe: CONTEÚDO, OBJETIVO,
 * EDITORIAL/TEMA (quadro), FORMATO, roteiro, legenda e status de produção.
 *
 * Padrão semanal (reunião de marketing de 17/07/2026):
 *   dom/ter/qui = produto · seg/qua/sex = dicas/diversos · sáb = reciclagem/corrida
 */
import { supabase } from './supabaseClient';

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type ContentPostStatus =
    | 'nao_iniciado'
    | 'gravado'
    | 'publicado'
    | 'nao_realizado'
    | 'excluido';

export type ContentPostFormat = 'video' | 'stories' | 'carrossel' | 'estatico';

export type ContentPostCategory =
    | 'ENDOMARKETING'
    | 'PAUTA FRIA'
    | 'PAUTA QUENTE'
    | 'REAL TIME';

export type ContentNetwork = 'INSTA' | 'FACE' | 'TIKTOK' | 'YB' | 'WHATS';

export interface ContentPost {
    id: string;
    title: string;
    post_date: string;            // YYYY-MM-DD
    status: ContentPostStatus;
    category: ContentPostCategory;
    format: ContentPostFormat;
    networks: ContentNetwork[];
    content: string | null;
    objective: string | null;
    editorial: string | null;
    script: string | null;
    caption: string | null;
    hashtags: string | null;
    reference: string | null;
    obs: string | null;
    paid_traffic: boolean;
    created_at: string;
    updated_at: string;
}

/** Campos editáveis de um card (criação/edição). */
export type ContentPostInput = Omit<ContentPost, 'id' | 'created_at' | 'updated_at'> & {
    id?: string;
};

// ─── Constantes de UI ────────────────────────────────────────────────────────

export const STATUS_OPTIONS: { value: ContentPostStatus; label: string }[] = [
    { value: 'nao_iniciado', label: 'Não iniciado' },
    { value: 'gravado', label: 'Gravado' },
    { value: 'publicado', label: 'Publicado' },
    { value: 'nao_realizado', label: 'Não realizado' },
    { value: 'excluido', label: 'Excluído' },
];

export const FORMAT_OPTIONS: { value: ContentPostFormat; label: string; emoji: string }[] = [
    { value: 'video', label: 'Reels/Vídeo', emoji: '🎦' },
    { value: 'stories', label: 'Stories', emoji: '⏳' },
    { value: 'carrossel', label: 'Carrossel', emoji: '📚' },
    { value: 'estatico', label: 'Post estático', emoji: '📃' },
];

export const CATEGORY_OPTIONS: { value: ContentPostCategory; label: string }[] = [
    { value: 'ENDOMARKETING', label: 'Endomarketing (produto/parceiras)' },
    { value: 'PAUTA FRIA', label: 'Pauta fria (dicas/quadros)' },
    { value: 'PAUTA QUENTE', label: 'Pauta quente' },
    { value: 'REAL TIME', label: 'Real time (corrida/atualidades)' },
];

export const NETWORK_OPTIONS: { value: ContentNetwork; label: string }[] = [
    { value: 'INSTA', label: 'Instagram' },
    { value: 'TIKTOK', label: 'TikTok' },
    { value: 'FACE', label: 'Facebook' },
    { value: 'YB', label: 'YouTube' },
    { value: 'WHATS', label: 'WhatsApp' },
];

/** Quadros semanais do editorial (máx. 1x por semana cada, rotacionando). */
export const EDITORIAL_QUADROS = [
    'Erros comuns, mas fatais',
    'Peça do dia — Problemas com…',
    'Dúvidas dos seguidores',
    'Dica do dia',
    'Erro de principiante',
    'Mitos sobre suspensões',
    'Pensa rápido! (quiz stories)',
    'Ferramenta para: suspensão',
    'Parceiros W-Tech',
    'Giro de corrida',
    'Datas comemorativas',
];

/** Dica do padrão semanal por dia (0 = domingo … 6 = sábado). */
export const WEEKDAY_HINTS: string[] = [
    'Produto',            // dom
    'Dica / diverso',     // seg
    'Produto',            // ter
    'Dica / diverso',     // qua
    'Produto',            // qui
    'Dica / diverso',     // sex
    'Reciclagem / corrida', // sáb
];

// ─── CRUD ────────────────────────────────────────────────────────────────────

/** Busca os posts planejados dentro do intervalo [startDate, endDate] (YYYY-MM-DD). */
export const fetchContentPosts = async (
    startDate: string,
    endDate: string,
): Promise<ContentPost[]> => {
    const { data, error } = await supabase
        .from('SITE_ContentPosts')
        .select('*')
        .gte('post_date', startDate)
        .lte('post_date', endDate)
        .order('post_date', { ascending: true })
        .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []) as ContentPost[];
};

/** Cria ou atualiza um card do planejador. */
export const saveContentPost = async (input: ContentPostInput): Promise<ContentPost> => {
    const { id, ...fields } = input;
    const payload = { ...fields, updated_at: new Date().toISOString() };
    const query = id
        ? supabase.from('SITE_ContentPosts').update(payload).eq('id', id)
        : supabase.from('SITE_ContentPosts').insert(payload);
    const { data, error } = await query.select().single();
    if (error) throw error;
    return data as ContentPost;
};

/** Remove um card do planejador. */
export const deleteContentPost = async (id: string): Promise<void> => {
    const { error } = await supabase.from('SITE_ContentPosts').delete().eq('id', id);
    if (error) throw error;
};
