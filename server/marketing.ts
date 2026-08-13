import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireStaffPermissionMiddleware, requireSameOriginMiddleware, getServiceClient } from '../api/_auth.js';
import { requireStaffOrS2SPermission } from '../api/_s2s.js';
import { isCronAuthorized, denyCron } from '../api/_cron.js';
import {
  DEFAULT_COURSE_ALERT_DAYS,
  DEFAULT_COURSE_ALERT_MIN_PCT,
  loadApprovalSettings,
  loadEvolutionBase,
  logApprovalEvent,
  sendApprovalText,
} from './approvalsCore.js';
import {
  type CampaignRequestLite,
  type CampaignResultRow,
  type MeetingNoteRow,
  type TrafficPlanItemRow,
  type TrafficPlanRow,
  COURSE_ALERT_DEDUPE_DAYS,
  buildCampaignResultMessage,
  buildCourseAlertMessage,
  buildMeetingNoteMessage,
  buildTrafficPlanMessage,
  daysSinceDateOnly,
  getCourseOccupancy,
  loadCourseAlertState,
  normalizeRequesterPhone,
  saveCourseAlertState,
} from './marketingCore.js';

/**
 * Rotas /api/marketing — Fase 2 do POP de Marketing.
 *
 *  - POST /share                 (staff) compartilha reunião/resultado/plano no WhatsApp
 *  - GET  /course-occupancy      (staff) ocupação das turmas na janela do alerta
 *  - POST /course-alerts/scan    (cron)  varre turmas em risco e alerta o grupo do time
 *
 * Staff = mesma sessão httpOnly + permissão `manage_marketing` das rotas de
 * aprovação (ver api/_auth.ts).
 * Cron  = Bearer CRON_SECRET (mesmo guard de /api/checkout-recovery — ver api/_cron.ts).
 */

type ShareType = 'meeting_note' | 'campaign_result' | 'traffic_plan';
const SHARE_TYPES: ShareType[] = ['meeting_note', 'campaign_result', 'traffic_plan'];

// ─── Helpers (mesmo padrão de server/approvals.ts) ───────────────────────────

/** Sessão de staff + permissão de administrar o módulo de marketing. */
const requireManageMarketing = requireStaffPermissionMiddleware('manage_marketing');

/** Wrapper: rejeição de handler async não pode derrubar o processo. */
function h(fn: (req: Request, res: Response) => Promise<unknown>) {
  return async (req: Request, res: Response) => {
    try {
      await fn(req, res);
    } catch (e: any) {
      console.error(`[marketing] Erro não tratado em ${req.method} ${req.originalUrl}:`, e);
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

export const marketingRouter = Router();
// SEM requireManageMarketing no router inteiro: /course-alerts/scan usa auth de cron.
// Gate CSRF fail-closed nas mutações staff (mesmo motivo de approvals.ts) —
// /course-alerts/scan (cron) não depende de cookie, então não precisa dele,
// mas passar por aqui não o afeta (POST cron não é same-origin nem precisa ser).
// S2S (x-wtech-svc) só pula o gate em /share — a ÚNICA rota deste router que
// aceita chamada S2S (ver requireStaffOrS2SPermission ali). Restringir por
// path evita que um header x-wtech-svc arbitrário (mesmo com assinatura
// inválida, que só é verificada DENTRO do handler de /share) remova o gate
// CSRF de QUALQUER outra rota do router — /course-occupancy continua staff-
// only via cookie, então um GET sem CSRF nela já não seria state-changing,
// mas o princípio é não deixar o bypass vazar pra rotas que não o esperam.
marketingRouter.use((req, res, next) => {
  if (req.path === '/course-alerts/scan') return next();
  if (req.path === '/share' && req.headers?.['x-wtech-svc']) return next();
  return requireSameOriginMiddleware(req, res, next);
});

// ─── POST /api/marketing/share — envia registro formatado ao WhatsApp ───────
// body: { type: 'meeting_note'|'campaign_result'|'traffic_plan', id,
//         target?: 'team'|'requester', request_id?, actor? }
// Aceita staff (cookie httpOnly) OU S2S assinado do ERP (x-wtech-svc + HMAC —
// ver api/_s2s.ts), ambos exigindo `manage_marketing`.
marketingRouter.post('/share', h(async (req, res) => {
  const staffOrActor = await requireStaffOrS2SPermission(req, res, 'manage_marketing');
  if (!staffOrActor) return;

  const supabase = requireSupabase(res);
  if (!supabase) return;

  const type = String(req.body?.type || '') as ShareType;
  const id = String(req.body?.id || '').trim();
  const target: 'team' | 'requester' = req.body?.target === 'requester' ? 'requester' : 'team';
  // Autoria SEMPRE do ator autenticado (sessão de staff ou ator S2S
  // rehidratado) — nunca de req.body.actor, que qualquer chamador pode
  // forjar pra assinar a auditoria com outro nome.
  const actor = staffOrActor.email || staffOrActor.name || staffOrActor.id;

  if (!SHARE_TYPES.includes(type)) {
    return res.status(400).json({ error: 'invalid_type', message: "type deve ser 'meeting_note', 'campaign_result' ou 'traffic_plan'." });
  }
  if (!id) return res.status(400).json({ error: 'id_required' });
  if (target === 'requester' && type !== 'campaign_result') {
    return res.status(400).json({ error: 'invalid_target', message: "target 'requester' só vale para campaign_result." });
  }

  // Sem instância configurada não há por onde enviar (mesma regra da Fase 1).
  const settings = await loadApprovalSettings(supabase);
  if (!settings?.instance) return res.status(409).json({ error: 'settings_missing' });
  const evo = await loadEvolutionBase(supabase);
  if (!evo) return res.status(409).json({ error: 'settings_missing', detail: 'evolution' });

  // ── Carrega o registro e monta a mensagem ──────────────────────────────────
  let text = '';
  // Tabela + coluna-chave para marcar shared_at após o envio.
  let sharedTable: string | null = null;
  let sharedKeyColumn = 'id';
  // Evento de auditoria (só gravado quando há request_id vinculado).
  let requestId: string | null = String(req.body?.request_id || '').trim() || null;
  let eventName = '';
  let requesterPhone: string | null = null;

  if (type === 'meeting_note') {
    const { data, error } = await supabase
      .from('SITE_MeetingNotes')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'not_found' });
    text = buildMeetingNoteMessage(data as MeetingNoteRow);
    sharedTable = 'SITE_MeetingNotes';
    eventName = 'reuniao_compartilhada';
  } else if (type === 'campaign_result') {
    // id = request_id (PK de SITE_CampaignResults aponta para o pedido).
    const { data: result, error: resultError } = await supabase
      .from('SITE_CampaignResults')
      .select('*')
      .eq('request_id', id)
      .maybeSingle();
    if (resultError) return res.status(500).json({ error: resultError.message });
    if (!result) return res.status(404).json({ error: 'not_found' });

    const { data: request, error: requestError } = await supabase
      .from('SITE_CampaignRequests')
      .select('id, title, requester_contact, expected_result')
      .eq('id', id)
      .maybeSingle();
    if (requestError) return res.status(500).json({ error: requestError.message });
    if (!request) return res.status(404).json({ error: 'request_not_found' });

    text = buildCampaignResultMessage(request as CampaignRequestLite, result as CampaignResultRow);
    sharedTable = 'SITE_CampaignResults';
    sharedKeyColumn = 'request_id';
    requestId = id;
    eventName = 'relatorio_compartilhado';
    requesterPhone = normalizeRequesterPhone((request as CampaignRequestLite).requester_contact);
  } else {
    const { data: plan, error: planError } = await supabase
      .from('SITE_TrafficPlans')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (planError) return res.status(500).json({ error: planError.message });
    if (!plan) return res.status(404).json({ error: 'not_found' });

    const { data: items, error: itemsError } = await supabase
      .from('SITE_TrafficPlanItems')
      .select('*')
      .eq('plan_id', id)
      .order('sort', { ascending: true })
      .limit(200);
    if (itemsError) return res.status(500).json({ error: itemsError.message });

    text = buildTrafficPlanMessage(plan as TrafficPlanRow, (items || []) as TrafficPlanItemRow[]);
    sharedTable = 'SITE_TrafficPlans';
    eventName = 'planejamento_compartilhado';
  }

  // ── Destino ────────────────────────────────────────────────────────────────
  let to: string;
  if (target === 'requester') {
    if (!requesterPhone) return res.status(409).json({ error: 'requester_contact_missing' });
    to = requesterPhone;
  } else {
    if (!settings.team_group_jid) return res.status(409).json({ error: 'team_group_missing' });
    to = settings.team_group_jid;
  }

  // ── Envio + shared_at + evento ─────────────────────────────────────────────
  const sent = await sendApprovalText(evo, settings.instance, to, text);
  if (!sent) return res.status(502).json({ error: 'send_failed' });

  if (sharedTable) {
    // Best-effort: a mensagem já saiu — falha aqui não pode virar erro (um
    // retry do cliente reenviaria a mesma mensagem ao grupo).
    const { error: sharedError } = await supabase
      .from(sharedTable)
      .update({ shared_at: new Date().toISOString() })
      .eq(sharedKeyColumn, id);
    if (sharedError) {
      console.error(`[marketing] Enviado, mas falhou marcar shared_at em ${sharedTable}:`, sharedError.message);
    }
  }

  if (requestId) {
    await logApprovalEvent(supabase, {
      request_id: requestId,
      event: eventName,
      actor,
      payload: { type, target, to },
    });
  }

  return res.status(200).json({ ok: true });
}));

// ─── GET /api/marketing/course-occupancy — painel de ocupação (staff) ───────
marketingRouter.get('/course-occupancy', requireManageMarketing, h(async (req, res) => {
  const supabase = requireSupabase(res);
  if (!supabase) return;

  const settings = await loadApprovalSettings(supabase);
  const days = settings?.course_alert_days ?? DEFAULT_COURSE_ALERT_DAYS;
  const minPct = settings?.course_alert_min_pct ?? DEFAULT_COURSE_ALERT_MIN_PCT;

  const courses = await getCourseOccupancy(supabase, { days, minPct });
  return res.status(200).json({ courses, settings: { days, min_pct: minPct } });
}));

// ─── POST /api/marketing/course-alerts/scan — varredura (cron) ──────────────
// Protegida por Bearer CRON_SECRET (mesmo guard das demais rotas de
// automação — ver api/_cron.ts). O agendamento em si é responsabilidade externa.
marketingRouter.post('/course-alerts/scan', h(async (req, res) => {
  if (!isCronAuthorized(req)) return denyCron(res);

  const supabase = requireSupabase(res);
  if (!supabase) return;

  const settings = await loadApprovalSettings(supabase);
  // Sem grupo do time não há para onde alertar — não é erro (cron segue verde).
  if (!settings?.team_group_jid) {
    return res.status(200).json({ ok: false, reason: 'team_group_missing' });
  }
  const evo = await loadEvolutionBase(supabase);
  if (!evo) return res.status(200).json({ ok: false, reason: 'evolution_missing' });

  const days = settings.course_alert_days ?? DEFAULT_COURSE_ALERT_DAYS;
  const minPct = settings.course_alert_min_pct ?? DEFAULT_COURSE_ALERT_MIN_PCT;

  const courses = await getCourseOccupancy(supabase, { days, minPct });
  const emRisco = courses.filter(c => c.at_risk);

  const state = await loadCourseAlertState(supabase);
  const hoje = new Date().toISOString().slice(0, 10);
  let alerted = 0;
  let skipped = 0;
  let failed = 0;
  let stateChanged = false;

  for (const curso of emRisco) {
    // Dedupe: mesma turma não alerta de novo dentro da janela de 7 dias.
    if (daysSinceDateOnly(state[curso.id]) < COURSE_ALERT_DEDUPE_DAYS) {
      skipped++;
      continue;
    }
    const sent = await sendApprovalText(
      evo, settings.instance, settings.team_group_jid, buildCourseAlertMessage(curso),
    );
    if (sent) {
      state[curso.id] = hoje;
      stateChanged = true;
      alerted++;
    } else {
      // Falha de envio NÃO grava dedupe — a próxima varredura tenta de novo.
      failed++;
    }
  }

  // Limpeza: entradas antigas (turma já passou há muito) saem do estado.
  for (const [courseId, lastAlert] of Object.entries(state)) {
    if (daysSinceDateOnly(lastAlert) > 60) {
      delete state[courseId];
      stateChanged = true;
    }
  }
  if (stateChanged) await saveCourseAlertState(supabase, state);

  return res.status(200).json({ scanned: courses.length, alerted, skipped, failed });
}));
