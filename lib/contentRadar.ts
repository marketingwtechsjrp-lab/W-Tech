/**
 * Radar de Pauta — camada de dados (tabela SITE_ContentRadar).
 *
 * A varredura semanal (rotina de segunda de manhã) grava aqui o que a social
 * media pesquisava manualmente: corridas do fim de semana com participação
 * dos pilotos patrocinados, movimento de concorrentes/marcas e ideias de post
 * prontas calibradas pelas métricas reais. A aba Planejador exibe o radar da
 * semana e transforma ideias em cards do calendário com 1 clique.
 */
import { supabase } from './supabaseClient';

export type RadarKind = 'corrida' | 'concorrente' | 'ideia';

export interface RadarItem {
    id: string;
    radar_week: string;          // YYYY-MM-DD (segunda-feira da semana)
    kind: RadarKind;
    title: string;
    summary: string | null;
    event_date: string | null;   // corridas: data da prova
    source: string | null;
    has_pilots: boolean;
    suggested_format: string | null;
    used: boolean;
    created_at: string;
}

/** Busca os itens do radar das últimas N semanas, mais recentes primeiro. */
export const fetchRadarItems = async (weeksBack = 2): Promise<RadarItem[]> => {
    const since = new Date();
    since.setDate(since.getDate() - weeksBack * 7);
    const iso = `${since.getFullYear()}-${String(since.getMonth() + 1).padStart(2, '0')}-${String(since.getDate()).padStart(2, '0')}`;
    const { data, error } = await supabase
        .from('SITE_ContentRadar')
        .select('*')
        .gte('radar_week', iso)
        .order('radar_week', { ascending: false })
        .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []) as RadarItem[];
};

/** Marca um item do radar como aproveitado (virou card no calendário). */
export const markRadarUsed = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from('SITE_ContentRadar')
        .update({ used: true })
        .eq('id', id);
    if (error) throw error;
};
