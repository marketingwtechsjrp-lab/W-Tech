import {
  clientIp,
  getServiceClient,
  requireSameOrigin,
  requireStaffPermission,
  setNoStoreHeaders,
} from './_auth.js';
import { cleanRespondentName, findSurvey, validateSurveyAnswers } from '../lib/surveys.js';

/**
 * Avaliação de curso — /api/surveys?slug=<slug>
 *
 * POST (público, quiz em /avaliacao/<slug>): valida as respostas contra o questionário
 *   de lib/surveys.ts e grava em SITE_SurveyResponses.
 * GET (sessão de staff com courses_view): devolve as respostas para o painel.
 *
 * A tabela é service_role only — o navegador nunca fala direto com ela.
 */

const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX_PER_WINDOW = 20;
const MAX_RESPONSES = 2000;

// Um telemóvel partilhado pela turma manda várias avaliações seguidas, por isso o
// limite é folgado: só serve para travar um script batendo no endpoint.
const envios = new Map<string, { count: number; resetAt: number }>();

function excedeuLimite(ip: string): boolean {
  const agora = Date.now();
  if (envios.size > 5000) envios.clear();
  const atual = envios.get(ip);
  if (!atual || agora > atual.resetAt) {
    envios.set(ip, { count: 1, resetAt: agora + RATE_WINDOW_MS });
    return false;
  }
  atual.count += 1;
  return atual.count > RATE_MAX_PER_WINDOW;
}

async function gravarResposta(req: any, res: any) {
  if (!requireSameOrigin(req, res)) return;

  const survey = findSurvey(String(req.query?.slug || ''));
  if (!survey) return res.status(404).json({ error: 'Questionário não encontrado' });

  // Honeypot: gente de verdade nunca preenche este campo. Finge sucesso e descarta.
  if (req.body?.website) return res.status(201).json({ ok: true });

  if (excedeuLimite(clientIp(req))) {
    return res.status(429).json({ error: 'Muitas avaliações seguidas. Aguarde uns minutos.' });
  }

  const result = validateSurveyAnswers(survey, req.body?.answers);
  if ('error' in result) return res.status(400).json({ error: result.error });

  const supabase = getServiceClient();
  if (!supabase) return res.status(503).json({ error: 'Serviço indisponível. Tente novamente.' });

  const { error } = await supabase.from('SITE_SurveyResponses').insert({
    survey: survey.slug,
    course_id: survey.courseId,
    answers: result.answers,
    name: cleanRespondentName(req.body?.name),
  });
  if (error) {
    console.error('[surveys] Falha ao gravar avaliação:', { survey: survey.slug, error: error.message });
    return res.status(500).json({ error: 'Não foi possível guardar a sua avaliação' });
  }
  return res.status(201).json({ ok: true });
}

async function listarRespostas(req: any, res: any) {
  const staff = await requireStaffPermission(req, res, 'courses_view');
  if (!staff) return;

  const survey = findSurvey(String(req.query?.slug || ''));
  if (!survey) return res.status(404).json({ error: 'Questionário não encontrado' });

  const supabase = getServiceClient();
  if (!supabase) return res.status(503).json({ error: 'supabase_indisponivel' });

  const { data, error } = await supabase
    .from('SITE_SurveyResponses')
    .select('id, survey, answers, name, created_at')
    .eq('survey', survey.slug)
    .order('created_at', { ascending: false })
    .limit(MAX_RESPONSES);
  if (error) {
    console.error('[surveys] Falha ao ler avaliações:', { survey: survey.slug, error: error.message });
    return res.status(500).json({ error: 'Erro ao buscar avaliações' });
  }

  setNoStoreHeaders(res);
  return res.status(200).json(data || []);
}

export default async function handler(req: any, res: any) {
  if (req.method === 'POST') return gravarResposta(req, res);
  if (req.method === 'GET') return listarRespostas(req, res);
  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'metodo_nao_permitido' });
}
