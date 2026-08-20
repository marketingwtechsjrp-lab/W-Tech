import { denyAuth, getServiceClient, requireStaffSession, setNoStoreHeaders } from './_auth.js';
import { resolveCountry } from './_geoip.js';

/**
 * Retenção da VSL — /api/vsl-progress
 *
 * POST (público, chamado pelo próprio player): grava até onde a sessão assistiu.
 *   O player manda batidas periódicas e uma final via `navigator.sendBeacon`
 *   quando a aba fecha, então este handler precisa ser barato e tolerante:
 *   payload malformado responde 204 em vez de 4xx, porque beacon não tem quem
 *   leia o erro e um retry só geraria ruído.
 *
 * GET (sessão de staff): devolve a curva de retenção agregada para o painel.
 *
 * A tabela é service_role only — o navegador nunca fala direto com ela.
 */

const MAX_TEXT = 120;

const texto = (valor: unknown): string | null => {
    if (typeof valor !== 'string') return null;
    const limpo = valor.trim();
    return limpo ? limpo.slice(0, MAX_TEXT) : null;
};

const numero = (valor: unknown): number | null => {
    const n = typeof valor === 'number' ? valor : Number(valor);
    return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
};

/** Segundos de conteúdo assistido que liberam a inscrição (espelha a VSL). */
const UNLOCK_AFTER_SECONDS = 90;

async function registrarProgresso(req: any, res: any) {
    const supabase = getServiceClient();
    if (!supabase) return res.status(204).end();

    // sendBeacon manda text/plain; o Express pode entregar string crua.
    let corpo = req.body;
    if (typeof corpo === 'string') {
        try { corpo = JSON.parse(corpo); } catch { return res.status(204).end(); }
    }
    if (!corpo || typeof corpo !== 'object') return res.status(204).end();

    const visitorId = texto(corpo.visitor_id);
    const sessionId = texto(corpo.session_id);
    const videoId = texto(corpo.video_id);
    const page = texto(corpo.page);
    const maxWatched = numero(corpo.max_watched_seconds);

    if (!visitorId || !sessionId || !videoId || !page || maxWatched === null) {
        return res.status(204).end();
    }

    const duration = numero(corpo.duration_seconds);
    const ratio = duration && duration > 0
        ? Math.min(1, Math.round((maxWatched / duration) * 10000) / 10000)
        : null;

    const linha = {
        visitor_id: visitorId,
        session_id: sessionId,
        video_id: videoId,
        page,
        theme: texto(corpo.theme),
        language: texto(corpo.language),
        country: null as string | null,
        duration_seconds: duration,
        max_watched_seconds: maxWatched,
        last_position_seconds: numero(corpo.last_position_seconds),
        watched_ratio: ratio,
        completed: ratio !== null && ratio >= 0.98,
        reached_unlock: maxWatched >= UNLOCK_AFTER_SECONDS,
        quiz_profile: texto(corpo.quiz_profile),
        utm_source: texto(corpo.utm_source),
        utm_medium: texto(corpo.utm_medium),
        utm_campaign: texto(corpo.utm_campaign),
        utm_content: texto(corpo.utm_content),
        updated_at: new Date().toISOString(),
    };

    // A sessão só avança: uma batida atrasada não pode reduzir o ponto máximo já
    // registrado, senão o abandono apareceria antes do que de fato aconteceu.
    const { data: atual } = await supabase
        .from('SITE_VSLProgress')
        .select('max_watched_seconds, country')
        .eq('visitor_id', visitorId)
        .eq('session_id', sessionId)
        .eq('video_id', videoId)
        .maybeSingle();

    // Atrás do Traefik não há header de país, então a resolução é por IP e custa
    // uma chamada externa. A sessão já resolvida reaproveita o valor: sem isso,
    // cada batida de 5s repetiria a consulta.
    linha.country = atual?.country || await resolveCountry(req);

    if (atual && Number(atual.max_watched_seconds) > maxWatched) {
        linha.max_watched_seconds = Number(atual.max_watched_seconds);
        linha.watched_ratio = duration && duration > 0
            ? Math.min(1, Math.round((linha.max_watched_seconds / duration) * 10000) / 10000)
            : null;
        linha.completed = linha.watched_ratio !== null && linha.watched_ratio >= 0.98;
        linha.reached_unlock = linha.max_watched_seconds >= UNLOCK_AFTER_SECONDS;
    }

    await supabase
        .from('SITE_VSLProgress')
        .upsert([linha], { onConflict: 'visitor_id,session_id,video_id' });

    return res.status(204).end();
}

async function lerRelatorio(req: any, res: any) {
    const sessao = await requireStaffSession(req);
    if (!sessao) return denyAuth(res);

    const supabase = getServiceClient();
    if (!supabase) return res.status(503).json({ error: 'supabase_indisponivel' });

    const dias = Math.min(365, Math.max(1, Number(req.query?.dias) || 30));
    const desde = new Date(Date.now() - dias * 86400_000).toISOString();

    // Busca o período inteiro e filtra em memória: o seletor de página do painel
    // precisa listar TODAS as páginas com sessões, inclusive quando o usuário já
    // escolheu uma. Filtrar no banco esconderia as outras opções.
    const { data, error } = await supabase
        .from('SITE_VSLProgress')
        .select('video_id, page, theme, watched_ratio, max_watched_seconds, duration_seconds, completed, reached_unlock, utm_source, created_at')
        .gte('created_at', desde)
        .limit(50_000);
    if (error) return res.status(500).json({ error: error.message });

    const todas = data || [];

    const paginasDisponiveis = Object.entries(
        todas.reduce<Record<string, number>>((acc, s) => {
            acc[s.page] = (acc[s.page] || 0) + 1;
            return acc;
        }, {}),
    ).map(([pagina, sessoesDaPagina]) => ({ pagina, sessoes: sessoesDaPagina }))
        .sort((a, b) => b.sessoes - a.sessoes);

    const video = texto(req.query?.video);
    const pagina = texto(req.query?.page);
    const sessoes = todas.filter((s) => (
        (!video || s.video_id === video) && (!pagina || s.page === pagina)
    ));
    const total = sessoes.length;

    // Curva de retenção em faixas de 5%: quantas sessões chegaram a cada ponto.
    const faixas = Array.from({ length: 21 }, (_, i) => i * 5);
    const retencao = faixas.map((pct) => {
        const chegaram = sessoes.filter((s) => (Number(s.watched_ratio) || 0) * 100 >= pct).length;
        return {
            percentual: pct,
            sessoes: chegaram,
            taxa: total ? Math.round((chegaram / total) * 1000) / 10 : 0,
        };
    });

    // O maior tombo entre faixas consecutivas é onde o público desiste.
    let maiorQueda = { de: 0, para: 5, perdidas: 0 };
    for (let i = 1; i < retencao.length; i += 1) {
        const perdidas = retencao[i - 1].sessoes - retencao[i].sessoes;
        if (perdidas > maiorQueda.perdidas) {
            maiorQueda = { de: retencao[i - 1].percentual, para: retencao[i].percentual, perdidas };
        }
    }

    const somaAssistida = sessoes.reduce((acc, s) => acc + (Number(s.max_watched_seconds) || 0), 0);
    const duracao = Number(sessoes.find((s) => s.duration_seconds)?.duration_seconds) || 0;

    setNoStoreHeaders(res);
    return res.status(200).json({
        periodo_dias: dias,
        duracao_segundos: duracao,
        total_sessoes: total,
        media_assistida_segundos: total ? Math.round(somaAssistida / total) : 0,
        media_assistida_percentual: total && duracao
            ? Math.round((somaAssistida / total / duracao) * 1000) / 10
            : 0,
        concluiram: sessoes.filter((s) => s.completed).length,
        liberaram_inscricao: sessoes.filter((s) => s.reached_unlock).length,
        retencao,
        maior_queda: maiorQueda,
        pagina_selecionada: pagina,
        paginas_disponiveis: paginasDisponiveis,
        videos: [...new Set(sessoes.map((s) => s.video_id))],
        total_geral: todas.length,
    });
}

export default async function handler(req: any, res: any) {
    if (req.method === 'POST') return registrarProgresso(req, res);
    if (req.method === 'GET') return lerRelatorio(req, res);
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'metodo_nao_permitido' });
}
