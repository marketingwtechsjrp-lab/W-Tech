import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { isKnownUser, denyAuth, getServiceClient } from '../api/_auth.js';
import {
  type ApprovalDecision,
  type ApprovalItem,
  type ApprovalMedia,
  DEFAULT_COURSE_ALERT_DAYS,
  DEFAULT_COURSE_ALERT_MIN_PCT,
  clampInt,
  decideItem,
  ensureWebhookToken,
  fetchInstanceGroups,
  loadApprovalSettings,
  loadEvolutionBase,
  logApprovalEvent,
  registerApprovalWebhookIfNeeded,
  saveApprovalSettings,
  sendItemMedia,
} from './approvalsCore.js';

/**
 * Rotas /api/approvals — módulo de Aprovações de Marketing.
 *
 * Todas as rotas exigem usuário conhecido (header x-wtech-user-id, mesmo
 * padrão interino das demais rotas admin — ver api/_auth.ts). A decisão via
 * WhatsApp NÃO passa por aqui: chega pelo webhook público já existente
 * (/api/wa-atendentes-webhook) e é roteada em server/approvalsCore.ts.
 */

const BUCKET = 'aprovacoes';
const MAX_FILES = 10;
const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB por arquivo (vídeos de reels)

// Upload em memória: os arquivos vão direto pro Storage, sem tocar em disco.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { files: MAX_FILES, fileSize: MAX_FILE_SIZE },
});

/** Shape mínimo dos arquivos do multer (evita depender do augment global). */
interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Autorização interina: header x-wtech-user-id precisa existir em SITE_Users. */
async function requireUser(req: Request, res: Response, next: NextFunction) {
  if (!(await isKnownUser(req))) return denyAuth(res);
  next();
}

/** Wrapper: rejeição de handler async não pode derrubar o processo. */
function h(fn: (req: Request, res: Response) => Promise<unknown>) {
  return async (req: Request, res: Response) => {
    try {
      await fn(req, res);
    } catch (e: any) {
      console.error(`[approvals] Erro não tratado em ${req.method} ${req.originalUrl}:`, e);
      if (!res.headersSent) res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/** Cliente service-role; 503 se as envs do Supabase não estiverem presentes. */
function requireSupabase(res: Response) {
  const supabase = getServiceClient();
  if (!supabase) {
    res.status(503).json({ error: 'supabase_unavailable' });
    return null;
  }
  return supabase;
}

/** 'image' | 'video' | 'document' a partir do mimetype. */
function mediaTypeFromMime(mime: string): ApprovalMedia['type'] {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  return 'document';
}

/**
 * O busboy (multer) decodifica o filename do multipart como latin1, mas os
 * navegadores enviam UTF-8 → "Ação" vira "AÃ§Ã£o". Reinterpreta os bytes;
 * se o resultado tiver caractere inválido (era latin1 mesmo), mantém o original.
 */
function fixFileNameEncoding(name: string): string {
  try {
    const utf8 = Buffer.from(name, 'latin1').toString('utf8');
    return utf8.includes('�') ? name : utf8;
  } catch {
    return name;
  }
}

/** Nome de arquivo seguro para o path do Storage (sem acentos/espaços). */
function sanitizeFileName(name: string): string {
  const base = (name || 'arquivo').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const clean = base.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-{2,}/g, '-').replace(/^-|-$/g, '');
  return (clean || 'arquivo').slice(0, 120);
}

/** Normaliza o array de mídias vindo do body (só entradas com URL válida). */
function parseMediaArray(raw: unknown): ApprovalMedia[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m: any) => m && typeof m.url === 'string' && m.url.trim())
    .map((m: any) => ({
      url: String(m.url).trim(),
      type: m.type === 'video' || m.type === 'document' ? m.type : 'image',
      name: m.name ? String(m.name) : undefined,
      size: Number.isFinite(Number(m.size)) ? Number(m.size) : undefined,
    }));
}

/** Origem pública do request (atrás do proxy da VPS) — para a URL do webhook. */
function publicOrigin(req: Request): string {
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || 'site.w-techbrasil.com.br')
    .split(',')[0].trim();
  return `${proto}://${host}`;
}

export const approvalsRouter = Router();
approvalsRouter.use(requireUser);

// ─── POST /api/approvals/upload — sobe mídias para o Storage ────────────────
// multipart/form-data, campo "files" (até 10 arquivos de 200MB).
approvalsRouter.post('/upload', upload.array('files', MAX_FILES), h(async (req, res) => {
  const supabase = requireSupabase(res);
  if (!supabase) return;

  const files = ((req as unknown as { files?: UploadedFile[] }).files) || [];
  if (!files.length) {
    return res.status(400).json({ error: 'no_files', message: 'Envie ao menos um arquivo no campo "files".' });
  }

  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, '0');

  const out: ApprovalMedia[] = [];
  for (const f of files) {
    const nomeOriginal = fixFileNameEncoding(f.originalname);
    const path = `${yyyy}/${mm}/${randomUUID()}-${sanitizeFileName(nomeOriginal)}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, f.buffer, { contentType: f.mimetype || 'application/octet-stream', upsert: false });
    if (error) {
      console.error('[approvals] Falha no upload para o Storage:', error.message);
      return res.status(500).json({ error: 'upload_failed', detail: `${nomeOriginal}: ${error.message}` });
    }
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
    out.push({
      url: pub.publicUrl,
      type: mediaTypeFromMime(f.mimetype || ''),
      name: nomeOriginal,
      size: f.size,
    });
  }

  return res.status(200).json({ files: out });
}));

// ─── GET /api/approvals/settings — configuração atual ───────────────────────
// Fase 2: devolve também o grupo do time e os parâmetros do alerta de ocupação
// (defaults quando ainda não configurados) — retrocompatível.
approvalsRouter.get('/settings', h(async (req, res) => {
  const supabase = requireSupabase(res);
  if (!supabase) return;

  const settings = await loadApprovalSettings(supabase);
  return res.status(200).json({
    configured: Boolean(settings?.instance && settings?.group_jid),
    instance: settings?.instance || null,
    group_jid: settings?.group_jid || null,
    group_name: settings?.group_name || null,
    team_group_jid: settings?.team_group_jid || null,
    team_group_name: settings?.team_group_name || null,
    course_alert_days: settings?.course_alert_days ?? DEFAULT_COURSE_ALERT_DAYS,
    course_alert_min_pct: settings?.course_alert_min_pct ?? DEFAULT_COURSE_ALERT_MIN_PCT,
  });
}));

// ─── POST /api/approvals/settings — salva instância + grupo e registra webhook
// Fase 2: aceita opcionalmente team_group_jid/team_group_name e os parâmetros
// do alerta de turmas. Campo AUSENTE no body preserva o valor já salvo (um
// cliente antigo que só manda instance/group_jid não apaga a config nova);
// string vazia limpa o campo explicitamente.
approvalsRouter.post('/settings', h(async (req, res) => {
  const supabase = requireSupabase(res);
  if (!supabase) return;

  const instance = String(req.body?.instance || '').trim();
  const groupJid = String(req.body?.group_jid || '').trim();
  const groupName = String(req.body?.group_name || '').trim() || null;
  if (!instance || !groupJid) {
    return res.status(400).json({ error: 'invalid_settings', message: 'instance e group_jid são obrigatórios.' });
  }

  const atual = await loadApprovalSettings(supabase);
  const teamGroupJid = req.body?.team_group_jid !== undefined
    ? (String(req.body.team_group_jid || '').trim() || null)
    : (atual?.team_group_jid ?? null);
  const teamGroupName = req.body?.team_group_name !== undefined
    ? (String(req.body.team_group_name || '').trim() || null)
    : (atual?.team_group_name ?? null);
  const courseAlertDays = req.body?.course_alert_days !== undefined
    ? clampInt(req.body.course_alert_days, 1, 365, DEFAULT_COURSE_ALERT_DAYS)
    : (atual?.course_alert_days ?? DEFAULT_COURSE_ALERT_DAYS);
  const courseAlertMinPct = req.body?.course_alert_min_pct !== undefined
    ? clampInt(req.body.course_alert_min_pct, 0, 100, DEFAULT_COURSE_ALERT_MIN_PCT)
    : (atual?.course_alert_min_pct ?? DEFAULT_COURSE_ALERT_MIN_PCT);

  await saveApprovalSettings(supabase, {
    instance,
    group_jid: groupJid,
    group_name: groupName,
    team_group_jid: teamGroupJid,
    team_group_name: teamGroupName,
    course_alert_days: courseAlertDays,
    course_alert_min_pct: courseAlertMinPct,
  });

  // Registro do webhook na instância (conservador: nunca substitui webhook
  // existente — ver regras em registerApprovalWebhookIfNeeded).
  const evo = await loadEvolutionBase(supabase);
  if (!evo) {
    return res.status(200).json({
      ok: true,
      webhook: 'skipped_no_evolution',
      warning: 'Evolution API não configurada (Admin → Integrações); webhook não registrado.',
    });
  }

  const token = await ensureWebhookToken(supabase);
  const reg = await registerApprovalWebhookIfNeeded(evo, instance, publicOrigin(req), token);
  const warning =
    reg.status === 'existing_other'
      ? `A instância já tem webhook apontando para outro sistema (${reg.existingUrl}). ` +
        'As decisões via WhatsApp só funcionam se o webhook apontar para /api/wa-atendentes-webhook.'
      : reg.status === 'error'
        ? reg.error
        : undefined;

  return res.status(200).json({ ok: true, webhook: reg.status, ...(warning ? { warning } : {}) });
}));

// ─── GET /api/approvals/groups?instance=X — grupos da instância ─────────────
approvalsRouter.get('/groups', h(async (req, res) => {
  const supabase = requireSupabase(res);
  if (!supabase) return;

  const settings = await loadApprovalSettings(supabase);
  const instance = String(req.query.instance || settings?.instance || '').trim();
  if (!instance) {
    return res.status(400).json({ error: 'instance_required', message: 'Informe ?instance=<nome da instância>.' });
  }

  const evo = await loadEvolutionBase(supabase);
  if (!evo) return res.status(409).json({ error: 'settings_missing', detail: 'evolution' });

  const groups = await fetchInstanceGroups(evo, instance);
  return res.status(200).json({ groups });
}));

// ─── GET /api/approvals?status=&limit=50 — lista de itens ───────────────────
approvalsRouter.get('/', h(async (req, res) => {
  const supabase = requireSupabase(res);
  if (!supabase) return;

  const status = String(req.query.status || '').trim();
  const limitRaw = Number(req.query.limit);
  const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 50, 1), 200);

  let query = supabase
    .from('SITE_ApprovalItems')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ items: data || [] });
}));

// ─── POST /api/approvals — cria item e envia ao grupo ────────────────────────
approvalsRouter.post('/', h(async (req, res) => {
  const supabase = requireSupabase(res);
  if (!supabase) return;

  const title = String(req.body?.title || '').trim();
  const description = String(req.body?.description || '').trim() || null;
  const media = parseMediaArray(req.body?.media);
  const requestId = String(req.body?.request_id || '').trim() || null;
  const createdBy = String(req.body?.created_by || '').trim() || 'sistema';

  if (!title) return res.status(400).json({ error: 'title_required' });
  if (!media.length) return res.status(400).json({ error: 'media_required' });

  // Sem grupo configurado não há para onde enviar — falha ANTES de inserir.
  const settings = await loadApprovalSettings(supabase);
  if (!settings) return res.status(409).json({ error: 'settings_missing' });
  const evo = await loadEvolutionBase(supabase);
  if (!evo) return res.status(409).json({ error: 'settings_missing', detail: 'evolution' });

  // 1. Insere como Rascunho (a tabela não tem created_by — fica no evento).
  const { data: inserted, error: insertError } = await supabase
    .from('SITE_ApprovalItems')
    .insert({ title, description, media, status: 'Rascunho', request_id: requestId, version: 1 })
    .select()
    .single();
  if (insertError || !inserted) {
    return res.status(500).json({ error: insertError?.message || 'insert_failed' });
  }
  const item = inserted as ApprovalItem;

  await logApprovalEvent(supabase, {
    item_id: item.id,
    request_id: requestId,
    event: 'criado',
    actor: createdBy,
    payload: { title, media_count: media.length },
  });

  // 2. Envia as mídias ao grupo (1ª com a legenda "📋 APROVAÇÃO #id …").
  const { sentCount, messageIds } = await sendItemMedia(
    evo, settings.instance, settings.group_jid, { id: item.id, title, description }, media, 1,
  );

  if (sentCount === 0) {
    await logApprovalEvent(supabase, {
      item_id: item.id,
      request_id: requestId,
      event: 'erro_envio',
      actor: createdBy,
      payload: { media_count: media.length },
    });
    return res.status(502).json({ error: 'send_failed', item });
  }

  // 3. Marca como Enviado com os dados do envio.
  const { data: updated, error: updateError } = await supabase
    .from('SITE_ApprovalItems')
    .update({
      status: 'Enviado',
      wa_instance: settings.instance,
      wa_group_jid: settings.group_jid,
      wa_message_ids: messageIds,
      sent_at: new Date().toISOString(),
    })
    .eq('id', item.id)
    .select()
    .single();
  if (updateError) console.error('[approvals] Item enviado mas falhou o update:', updateError.message);

  await logApprovalEvent(supabase, {
    item_id: item.id,
    request_id: requestId,
    event: 'enviado_whatsapp',
    actor: createdBy,
    payload: { message_ids: messageIds, sent_count: sentCount, group_jid: settings.group_jid },
  });

  // 4. Pedido vinculado entra em "Aprovacao".
  if (requestId) {
    const { error: reqError } = await supabase
      .from('SITE_CampaignRequests')
      .update({ status: 'Aprovacao' })
      .eq('id', requestId);
    if (reqError) {
      console.error('[approvals] Falha ao mover pedido para Aprovacao:', reqError.message);
    } else {
      await logApprovalEvent(supabase, {
        item_id: item.id,
        request_id: requestId,
        event: 'pedido_status',
        actor: createdBy,
        payload: { status: 'Aprovacao' },
      });
    }
  }

  return res.status(200).json({ item: updated || { ...item, status: 'Enviado', wa_message_ids: messageIds } });
}));

// ─── Rotas por item ──────────────────────────────────────────────────────────

/** Busca o item por id numérico; responde 400/404 e retorna null nos erros. */
async function findItem(supabase: NonNullable<ReturnType<typeof getServiceClient>>, req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'invalid_id' });
    return null;
  }
  const { data, error } = await supabase
    .from('SITE_ApprovalItems')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    res.status(500).json({ error: error.message });
    return null;
  }
  if (!data) {
    res.status(404).json({ error: 'not_found' });
    return null;
  }
  return data as ApprovalItem;
}

// ─── GET /api/approvals/:id/events — histórico do item (asc) ────────────────
approvalsRouter.get('/:id/events', h(async (req, res) => {
  const supabase = requireSupabase(res);
  if (!supabase) return;

  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'invalid_id' });

  const { data, error } = await supabase
    .from('SITE_ApprovalEvents')
    .select('*')
    .eq('item_id', id);
  if (error) return res.status(500).json({ error: error.message });

  // Ordena em memória (asc) — não depende do nome exato da coluna de data.
  const events = (data || []).sort((a: any, b: any) => {
    const ta = new Date(a.created_at || 0).getTime();
    const tb = new Date(b.created_at || 0).getTime();
    return ta - tb || Number(a.id || 0) - Number(b.id || 0);
  });
  return res.status(200).json({ events });
}));

// ─── POST /api/approvals/:id/decide — decisão pelo painel ───────────────────
approvalsRouter.post('/:id/decide', h(async (req, res) => {
  const supabase = requireSupabase(res);
  if (!supabase) return;

  const item = await findItem(supabase, req, res);
  if (!item) return;

  const decision = String(req.body?.decision || '') as ApprovalDecision;
  if (!['Aprovado', 'Reprovado', 'Ajustes'].includes(decision)) {
    return res.status(400).json({ error: 'invalid_decision', message: "decision deve ser 'Aprovado', 'Reprovado' ou 'Ajustes'." });
  }
  const note = String(req.body?.note || '').trim() || null;
  const actor = String(req.body?.actor || '').trim() || 'admin';

  const result = await decideItem(supabase, item, { decision, note, actor, via: 'sistema' });
  if (!result.ok) return res.status(500).json({ error: result.error || 'decide_failed' });
  return res.status(200).json({ item: result.item });
}));

// ─── POST /api/approvals/:id/resend — reenvia as mídias (nova versão) ───────
approvalsRouter.post('/:id/resend', h(async (req, res) => {
  const supabase = requireSupabase(res);
  if (!supabase) return;

  const item = await findItem(supabase, req, res);
  if (!item) return;

  const media = parseMediaArray(item.media);
  if (!media.length) return res.status(400).json({ error: 'media_required' });

  const settings = await loadApprovalSettings(supabase);
  if (!settings) return res.status(409).json({ error: 'settings_missing' });
  const evo = await loadEvolutionBase(supabase);
  if (!evo) return res.status(409).json({ error: 'settings_missing', detail: 'evolution' });

  const actor = String(req.body?.actor || '').trim() || 'admin';
  const version = (Number(item.version) || 1) + 1;

  const { sentCount, messageIds } = await sendItemMedia(
    evo, settings.instance, settings.group_jid,
    { id: item.id, title: item.title, description: item.description }, media, version,
  );
  if (sentCount === 0) {
    await logApprovalEvent(supabase, {
      item_id: item.id,
      request_id: item.request_id,
      event: 'erro_envio',
      actor,
      payload: { version },
    });
    return res.status(502).json({ error: 'send_failed' });
  }

  // Volta a Enviado com a nova versão; decisão anterior é zerada.
  const { data: updated, error: updateError } = await supabase
    .from('SITE_ApprovalItems')
    .update({
      status: 'Enviado',
      version,
      wa_instance: settings.instance,
      wa_group_jid: settings.group_jid,
      wa_message_ids: messageIds,
      sent_at: new Date().toISOString(),
      decided_at: null,
      decided_by: null,
      decision_note: null,
    })
    .eq('id', item.id)
    .select()
    .single();
  if (updateError) return res.status(500).json({ error: updateError.message });

  await logApprovalEvent(supabase, {
    item_id: item.id,
    request_id: item.request_id,
    event: 'reenviado',
    actor,
    payload: { version, message_ids: messageIds, sent_count: sentCount },
  });

  return res.status(200).json({ item: updated });
}));

// ─── Erros do multer (arquivo grande demais / campo errado) → 400 limpo ─────
approvalsRouter.use((err: any, _req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: 'upload_invalid', detail: err.code });
  }
  next(err);
});
