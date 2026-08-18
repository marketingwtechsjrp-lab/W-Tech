/**
 * Métricas reais do Instagram (@wtechbrasil) — tabela SITE_InstagramMetrics.
 *
 * Alimenta o "Radar do Instagram" na aba Planejador e calibra a geração de
 * conteúdo por IA com o desempenho real (alcance, engajamento, salvamentos,
 * compartilhamentos por post). Sincronizada semanalmente via Windsor.ai.
 */
import { contentPlannerRequest } from './contentPlannerApi';

export interface InstagramPostMetric {
    media_id: string;
    posted_at: string;
    media_type: string;          // REELS | IMAGE | CAROUSEL_ALBUM | VIDEO
    caption: string | null;
    permalink: string | null;
    reach: number | null;
    likes: number | null;
    comments: number | null;
    saved: number | null;
    shares: number | null;
    views: number | null;
    engagement: number | null;
    follows: number | null;
    synced_at: string;
}

/** Resumo por formato: médias que revelam o que funciona e o que flopa. */
export interface FormatSummary {
    media_type: string;
    posts: number;
    avg_reach: number;
    avg_engagement: number;
    /** Taxa de engajamento média (engajamento / alcance). */
    avg_er: number;
}

/** Busca as métricas dos últimos N dias, mais recentes primeiro. */
export const fetchInstagramMetrics = async (days = 90): Promise<InstagramPostMetric[]> => {
    return contentPlannerRequest<InstagramPostMetric[]>('instagram', { query: { days } });
};

/** Taxa de engajamento de um post (engajamento / alcance), em %. */
export const engagementRate = (m: InstagramPostMetric): number =>
    m.reach && m.engagement ? (m.engagement / m.reach) * 100 : 0;

/** Top N posts por engajamento absoluto. */
export const topByEngagement = (metrics: InstagramPostMetric[], n = 5): InstagramPostMetric[] =>
    [...metrics].sort((a, b) => (b.engagement || 0) - (a.engagement || 0)).slice(0, n);

/** Piores N posts por engajamento (com alcance > 0, para excluir dados vazios). */
export const bottomByEngagement = (metrics: InstagramPostMetric[], n = 3): InstagramPostMetric[] =>
    [...metrics].filter(m => (m.reach || 0) > 0)
        .sort((a, b) => (a.engagement || 0) - (b.engagement || 0)).slice(0, n);

/** Médias por formato (REELS × IMAGE × CAROUSEL_ALBUM). */
export const summarizeByFormat = (metrics: InstagramPostMetric[]): FormatSummary[] => {
    const groups: Record<string, InstagramPostMetric[]> = {};
    for (const m of metrics) (groups[m.media_type] ||= []).push(m);
    return Object.entries(groups).map(([media_type, posts]) => {
        const sum = (fn: (m: InstagramPostMetric) => number) =>
            posts.reduce((acc, m) => acc + fn(m), 0);
        const avg_reach = sum(m => m.reach || 0) / posts.length;
        const avg_engagement = sum(m => m.engagement || 0) / posts.length;
        return {
            media_type,
            posts: posts.length,
            avg_reach: Math.round(avg_reach),
            avg_engagement: Math.round(avg_engagement),
            avg_er: avg_reach > 0 ? (avg_engagement / avg_reach) * 100 : 0,
        };
    }).sort((a, b) => b.avg_engagement - a.avg_engagement);
};

/**
 * Bloco de contexto de desempenho real para os prompts de IA: top posts,
 * piores posts e médias por formato — a IA usa isso para priorizar temáticas
 * comprovadas e indicar candidatos a reciclagem (top posts com 3+ semanas).
 */
export const buildPerformanceContext = (metrics: InstagramPostMetric[]): string => {
    if (metrics.length === 0) return '';
    const fmt = (m: InstagramPostMetric) =>
        `- [${m.media_type}] "${(m.caption || 'sem legenda').slice(0, 90)}" (${m.posted_at.slice(0, 10)}): ` +
        `alcance ${m.reach ?? '?'}, engajamento ${m.engagement ?? '?'}, salvamentos ${m.saved ?? 0}, compartilhamentos ${m.shares ?? 0}`;
    const formats = summarizeByFormat(metrics)
        .map(f => `- ${f.media_type}: ${f.posts} posts, alcance médio ${f.avg_reach}, engajamento médio ${f.avg_engagement} (ER ${f.avg_er.toFixed(1)}%)`)
        .join('\n');
    return `DESEMPENHO REAL DO @wtechbrasil (últimos 90 dias — use para calibrar as sugestões):
Médias por formato:
${formats}

TOP posts (temáticas comprovadas — priorize ângulos parecidos e considere reciclagem dos com 3+ semanas):
${topByEngagement(metrics, 6).map(fmt).join('\n')}

PIORES posts (evite repetir este ângulo — produto em foto estática sem dor/contexto flopa):
${bottomByEngagement(metrics, 3).map(fmt).join('\n')}`;
};
