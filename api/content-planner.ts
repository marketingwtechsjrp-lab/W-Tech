import {
  getServiceClient,
  requireSameOrigin,
  requireStaffPermission,
  setNoStoreHeaders,
  UUID_RE,
} from './_auth.js';

const POST_SELECT = 'id,title,post_date,status,category,format,networks,content,objective,editorial,script,caption,hashtags,reference,obs,paid_traffic,ai_detail,created_at,updated_at';
const RADAR_SELECT = 'id,radar_week,kind,title,summary,event_date,source,has_pilots,suggested_format,used,created_at';
const INBOX_SELECT = 'id,kind,text,author,product_ref,processed,created_at';
const INSTAGRAM_SELECT = 'media_id,posted_at,media_type,caption,permalink,reach,likes,comments,saved,shares,views,engagement,follows,synced_at';

const STATUSES = new Set(['nao_iniciado', 'gravado', 'publicado', 'nao_realizado', 'excluido']);
const CATEGORIES = new Set(['ENDOMARKETING', 'PAUTA FRIA', 'PAUTA QUENTE', 'REAL TIME']);
const FORMATS = new Set(['video', 'stories', 'carrossel', 'estatico', 'youtube']);
const NETWORKS = new Set(['INSTA', 'FACE', 'TIKTOK', 'YB', 'WHATS']);
const INBOX_KINDS = new Set(['duvida', 'ideia', 'conhecimento']);

function queryValue(raw: unknown): string {
  return Array.isArray(raw) ? String(raw[0] ?? '') : String(raw ?? '');
}

function validDate(raw: unknown): raw is string {
  if (typeof raw !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return false;
  const [year, month, day] = raw.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
}

function boundedInt(raw: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(String(raw ?? ''), 10);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

function requiredText(raw: unknown, field: string, max: number): string {
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (!value) throw new Error(`${field} é obrigatório.`);
  if (value.length > max) throw new Error(`${field} excede ${max} caracteres.`);
  return value;
}

function nullableText(raw: unknown, field: string, max: number): string | null {
  if (raw === null || raw === undefined || raw === '') return null;
  if (typeof raw !== 'string') throw new Error(`${field} inválido.`);
  const value = raw.trim();
  if (value.length > max) throw new Error(`${field} excede ${max} caracteres.`);
  return value || null;
}

function enumValue(raw: unknown, values: Set<string>, field: string): string {
  if (typeof raw !== 'string' || !values.has(raw)) throw new Error(`${field} inválido.`);
  return raw;
}

function postPayload(raw: any) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Dados do post inválidos.');
  if (!validDate(raw.post_date)) throw new Error('Data do post inválida.');
  if (!Array.isArray(raw.networks) || raw.networks.length > NETWORKS.size) {
    throw new Error('Redes sociais inválidas.');
  }
  const networks = [...new Set(raw.networks.map(String))];
  if (networks.some((network) => !NETWORKS.has(network))) throw new Error('Redes sociais inválidas.');

  let aiDetail: Record<string, unknown> | null = null;
  if (raw.ai_detail !== null && raw.ai_detail !== undefined) {
    if (typeof raw.ai_detail !== 'object' || Array.isArray(raw.ai_detail)) {
      throw new Error('Detalhamento de IA inválido.');
    }
    if (JSON.stringify(raw.ai_detail).length > 250_000) throw new Error('Detalhamento de IA muito grande.');
    aiDetail = raw.ai_detail;
  }

  return {
    title: requiredText(raw.title, 'Título', 160),
    post_date: raw.post_date,
    status: enumValue(raw.status, STATUSES, 'Status'),
    category: enumValue(raw.category, CATEGORIES, 'Categoria'),
    format: enumValue(raw.format, FORMATS, 'Formato'),
    networks,
    content: nullableText(raw.content, 'Conteúdo', 30_000),
    objective: nullableText(raw.objective, 'Objetivo', 10_000),
    editorial: nullableText(raw.editorial, 'Editorial', 2_000),
    script: nullableText(raw.script, 'Roteiro', 60_000),
    caption: nullableText(raw.caption, 'Legenda', 60_000),
    hashtags: nullableText(raw.hashtags, 'Hashtags', 5_000),
    reference: nullableText(raw.reference, 'Referência', 10_000),
    obs: nullableText(raw.obs, 'Observações', 20_000),
    paid_traffic: raw.paid_traffic === true,
    ai_detail: aiDetail,
    updated_at: new Date().toISOString(),
  };
}

function dbFailure(res: any, operation: string, error: any) {
  console.error(`[content-planner] ${operation}:`, error?.code || '', error?.message || error);
  return res.status(500).json({ success: false, error: 'Não foi possível acessar o Planejador.' });
}

function badRequest(res: any, message: string) {
  return res.status(400).json({ success: false, error: message });
}

async function readResource(req: any, res: any, supabase: any, resource: string) {
  if (resource === 'posts') {
    const startDate = queryValue(req.query?.startDate);
    const endDate = queryValue(req.query?.endDate);
    if (!validDate(startDate) || !validDate(endDate) || startDate > endDate) {
      return badRequest(res, 'Intervalo de datas inválido.');
    }
    const intervalDays = (Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86_400_000;
    if (intervalDays > 370) return badRequest(res, 'O intervalo máximo é de 370 dias.');

    const { data, error } = await supabase
      .from('SITE_ContentPosts')
      .select(POST_SELECT)
      .gte('post_date', startDate)
      .lte('post_date', endDate)
      .order('post_date', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(1000);
    if (error) return dbFailure(res, 'listar posts', error);
    return res.status(200).json({ success: true, data: data || [] });
  }

  if (resource === 'radar') {
    const weeksBack = boundedInt(req.query?.weeksBack, 2, 1, 26);
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - weeksBack * 7);
    const sinceDate = since.toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('SITE_ContentRadar')
      .select(RADAR_SELECT)
      .gte('radar_week', sinceDate)
      .order('radar_week', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(500);
    if (error) return dbFailure(res, 'listar radar', error);
    return res.status(200).json({ success: true, data: data || [] });
  }

  if (resource === 'inbox') {
    const { data, error } = await supabase
      .from('SITE_ContentInbox')
      .select(INBOX_SELECT)
      .eq('processed', false)
      .order('created_at', { ascending: true })
      .limit(500);
    if (error) return dbFailure(res, 'listar caixinha', error);
    return res.status(200).json({ success: true, data: data || [] });
  }

  if (resource === 'instagram') {
    const days = boundedInt(req.query?.days, 90, 1, 365);
    const since = new Date(Date.now() - days * 86_400_000).toISOString();
    const { data, error } = await supabase
      .from('SITE_InstagramMetrics')
      .select(INSTAGRAM_SELECT)
      .gte('posted_at', since)
      .order('posted_at', { ascending: false })
      .limit(1000);
    if (error) return dbFailure(res, 'listar métricas do Instagram', error);
    return res.status(200).json({ success: true, data: data || [] });
  }

  if (resource === 'catalog') {
    const { data, error } = await supabase
      .from('SITE_Products')
      .select('name,category,current_stock,updated_at')
      .gt('current_stock', 0)
      .order('updated_at', { ascending: false })
      .limit(70);
    if (error) return dbFailure(res, 'listar catálogo do Planejador', error);
    return res.status(200).json({ success: true, data: data || [] });
  }

  return badRequest(res, 'Recurso inválido.');
}

async function mutateResource(req: any, res: any, supabase: any, resource: string) {
  const method = String(req.method || '').toUpperCase();

  if (resource === 'posts' && (method === 'POST' || method === 'PUT')) {
    let payload;
    try {
      payload = postPayload(req.body);
    } catch (error: any) {
      return badRequest(res, error?.message || 'Dados do post inválidos.');
    }

    if (method === 'PUT') {
      const id = String(req.body?.id || '');
      if (!UUID_RE.test(id)) return badRequest(res, 'Identificador do post inválido.');
      const { data, error } = await supabase
        .from('SITE_ContentPosts')
        .update(payload)
        .eq('id', id)
        .select(POST_SELECT)
        .maybeSingle();
      if (error) return dbFailure(res, 'atualizar post', error);
      if (!data) return res.status(404).json({ success: false, error: 'Post não encontrado.' });
      return res.status(200).json({ success: true, data });
    }

    const { data, error } = await supabase
      .from('SITE_ContentPosts')
      .insert(payload)
      .select(POST_SELECT)
      .single();
    if (error) return dbFailure(res, 'criar post', error);
    return res.status(201).json({ success: true, data });
  }

  if (resource === 'posts' && method === 'DELETE') {
    const id = queryValue(req.query?.id);
    if (!UUID_RE.test(id)) return badRequest(res, 'Identificador do post inválido.');
    const { data, error } = await supabase
      .from('SITE_ContentPosts')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();
    if (error) return dbFailure(res, 'excluir post', error);
    if (!data) return res.status(404).json({ success: false, error: 'Post não encontrado.' });
    return res.status(200).json({ success: true });
  }

  if (resource === 'inbox' && method === 'POST') {
    let payload;
    try {
      payload = {
        kind: enumValue(req.body?.kind, INBOX_KINDS, 'Tipo da pauta'),
        text: requiredText(req.body?.text, 'Pauta', 10_000),
        author: nullableText(req.body?.author, 'Autor', 300),
        product_ref: nullableText(req.body?.product_ref, 'Referência do produto', 1_000),
      };
    } catch (error: any) {
      return badRequest(res, error?.message || 'Dados da pauta inválidos.');
    }
    const { data, error } = await supabase
      .from('SITE_ContentInbox')
      .insert(payload)
      .select(INBOX_SELECT)
      .single();
    if (error) return dbFailure(res, 'adicionar pauta', error);
    return res.status(201).json({ success: true, data });
  }

  if ((resource === 'radar' || resource === 'inbox') && method === 'PUT') {
    const id = String(req.body?.id || '');
    if (!UUID_RE.test(id)) return badRequest(res, 'Identificador inválido.');
    const table = resource === 'radar' ? 'SITE_ContentRadar' : 'SITE_ContentInbox';
    const field = resource === 'radar' ? 'used' : 'processed';
    const select = resource === 'radar' ? RADAR_SELECT : INBOX_SELECT;
    const { data, error } = await supabase
      .from(table)
      .update({ [field]: true })
      .eq('id', id)
      .select(select)
      .maybeSingle();
    if (error) return dbFailure(res, `atualizar ${resource}`, error);
    if (!data) return res.status(404).json({ success: false, error: 'Item não encontrado.' });
    return res.status(200).json({ success: true, data });
  }

  res.setHeader('Allow', 'GET, POST, PUT, DELETE');
  return res.status(405).json({ success: false, error: 'Método não permitido para este recurso.' });
}

export default async function handler(req: any, res: any) {
  setNoStoreHeaders(res);
  const method = String(req.method || '').toUpperCase();
  if (!['GET', 'POST', 'PUT', 'DELETE'].includes(method)) {
    res.setHeader('Allow', 'GET, POST, PUT, DELETE');
    return res.status(405).json({ success: false, error: 'Método não permitido.' });
  }

  if (method !== 'GET' && !requireSameOrigin(req, res)) return;
  const staff = await requireStaffPermission(req, res, 'marketing_view');
  if (!staff) return;

  const supabase = getServiceClient();
  if (!supabase) return res.status(503).json({ success: false, error: 'Banco do Planejador indisponível.' });

  const resource = queryValue(req.query?.resource) || 'posts';
  return method === 'GET'
    ? readResource(req, res, supabase, resource)
    : mutateResource(req, res, supabase, resource);
}
