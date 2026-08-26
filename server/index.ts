import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';

// ── Handlers Vercel existentes (formato export default handler(req, res)) ────
// Os paths /api/<nome> ficam IDÊNTICOS aos da Vercel — há webhooks externos
// (Meta, Mercado Pago, Kiwify, GitHub Actions) apontando para eles.
// Arquivos api/_*.ts são helpers compartilhados (convenção Vercel) — não viram rota.
import asaasPaymentLink from '../api/asaas-payment-link.js';
import checkoutRecovery from '../api/checkout-recovery.js';
import createStripeCheckout from '../api/create-stripe-checkout.js';
import contentPlanner from '../api/content-planner.js';
import glossary from '../api/_glossary.js';
import jobs from '../api/jobs.js';
import launchCourseCampaign from '../api/launch-course-campaign.js';
import managerChat from '../api/manager-chat.js';
import mercadopagoBalanceLink from '../api/mercadopago-balance-link.js';
import mercadopagoCheckout from '../api/mercadopago-checkout.js';
import mercadopagoWebhook from '../api/mercadopago-webhook.js';
import notifyStudents from '../api/notify-students.js';
import whatsappCloudSend from '../api/whatsapp-cloud-send.js';
import whatsappCloudWebhook from '../api/whatsapp-cloud-webhook.js';
import whatsappSend from '../api/whatsapp-send.js';
import vslProgress from '../api/vsl-progress.js';
import { getRequestClientIp, lookupCountryByIp } from '../api/_geoip.js';

// ── Edge Functions do Supabase portadas para Express (Deno → Node) ───────────
import kiwifyWebhook from './edge/kiwify-webhook.js';
import hotmartWebhook from './edge/hotmart-webhook.js';
import stripeWebhook from './edge/stripe-webhook.js';
import getKiwifyAffiliates from './edge/get-kiwify-affiliates.js';
import waAtendentesWebhook from './edge/wa-atendentes-webhook.js';

// ── Aprovações de Marketing (router Express nativo — precisa de multipart) ───
import { approvalsRouter } from './approvals.js';
// ── POP de Marketing Fase 2 (compartilhamentos + alerta de ocupação) ─────────
import { marketingRouter } from './marketing.js';
// ── Identidade e sessão do painel admin (cookie httpOnly — ver api/_auth.ts) ─
import { staffAuthRouter } from './staffAuth.js';
import { isLoopbackHostname } from '../api/_auth.js';
import { countryToLandingLanguage } from '../lib/geoLanguage.js';

/**
 * Gate de startup — só em produção. Falha ANTES de `app.listen()` se a config
 * de segurança estiver ausente/malformada, pra nunca subir um deploy "200 OK"
 * com todas as mutações batendo 403 (STAFF_TRUSTED_ORIGINS vazia) ou o
 * boundary S2S aberto/quebrado (SITE_API_SECRET/CRON_SECRET ausentes ou
 * curtos demais pra servir de segredo HMAC). Mensagens citam só o NOME da
 * env que falhou, nunca o valor (nem de STAFF_TRUSTED_ORIGINS, que não é
 * segredo mas não precisa aparecer em log de erro de boot).
 */
function validateProductionConfig(): void {
  if (process.env.NODE_ENV !== 'production') return;

  const problems: string[] = [];

  const originsRaw = String(process.env.STAFF_TRUSTED_ORIGINS || '').trim();
  if (!originsRaw) {
    problems.push('STAFF_TRUSTED_ORIGINS ausente ou vazia');
  } else {
    const origins = originsRaw.split(',').map((s) => s.trim()).filter(Boolean);
    for (const origin of origins) {
      let valid = true;
      try {
        const u = new URL(origin);
        if (u.protocol !== 'https:') valid = false;
        // Mesmo helper de loopback usado por normalizeOriginEntry
        // (api/_auth.ts) — nunca divergir entre o gate de startup e a
        // normalização em runtime.
        if (isLoopbackHostname(u.hostname)) valid = false;
        if (u.pathname !== '/' && u.pathname !== '') valid = false;
        if (u.search || u.hash) valid = false;
      } catch {
        valid = false;
      }
      if (!valid) problems.push('STAFF_TRUSTED_ORIGINS contém uma entrada inválida (precisa ser URL https explícita, sem localhost, sem path/query)');
    }
  }

  for (const name of ['SITE_API_SECRET', 'CRON_SECRET']) {
    const value = process.env[name] || '';
    if (!value) problems.push(`${name} ausente`);
    else if (value.length < 32) problems.push(`${name} curto demais (mínimo 32 caracteres)`);
  }

  if (problems.length > 0) {
    console.error('[startup] Configuração de produção inválida — servidor NÃO vai subir:');
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
}
validateProductionConfig();

const app = express();
app.disable('x-powered-by');

// CSP DESLIGADO de propósito: o index.html injeta scripts inline do GTM/Stape
// (tracking — LEI 10). Um CSP restritivo quebraria a atribuição de campanhas.
app.use(helmet({
  contentSecurityPolicy: false,
  // 'no-referrer' (default do helmet) quebra embeds do YouTube (erro 153) —
  // o player exige Referer. Mesmo valor que a Vercel usava.
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

type VercelStyleHandler = (req: Request, res: Response) => unknown | Promise<unknown>;


/**
 * Adaptador Vercel → Express. Os handlers usam apenas req.method/headers/query/body
 * e res.status().json(), que o Express já fornece (req.body via express.json).
 * O wrapper só garante que exceção/rejeição não derruba o processo.
 */
function adapt(handler: VercelStyleHandler) {
  return async (req: Request, res: Response) => {
    try {
      await handler(req, res);
    } catch (e: any) {
      console.error(`[api] Erro não tratado em ${req.path}:`, e);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };
}

// Stripe valida a assinatura HMAC sobre o corpo RAW → express.raw() SÓ nesta
// rota, registrada ANTES do express.json() para o body chegar como Buffer.
app.all('/api/stripe-webhook', express.raw({ type: () => true }), adapt(stripeWebhook));

// `verify` captura os bytes crus do body ANTES do parse — o boundary S2S
// (api/_s2s.ts) precisa do buffer exato pra recomputar SHA256(rawBody) na
// assinatura HMAC; sem isso, uma reserialização do JSON já parseado poderia
// divergir do que o ERP assinou (ordem de chaves, espaços, etc.) e toda
// assinatura válida falharia. Não muda nada pras rotas que não usam S2S —
// `req.body` continua populado normalmente por este mesmo middleware.
app.use(express.json({
  limit: '10mb',
  verify: (req: any, _res, buf: Buffer) => { req.rawBody = buf; },
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Rotas /api (mesmos paths da Vercel) ──────────────────────────────────────
app.get('/api/geo-language', async (req: Request, res: Response) => {
  const rawCountry = req.get('cf-ipcountry')
    || req.get('x-vercel-ip-country')
    || req.get('x-country-code')
    || '';
  const headerCountry = rawCountry.split(',')[0].trim().toUpperCase();
  const clientIp = headerCountry ? null : getRequestClientIp(req);
  const ipCountry = clientIp ? await lookupCountryByIp(clientIp) : null;
  const country = headerCountry || ipCountry || '';
  const acceptLanguage = req.get('accept-language')?.toLowerCase() || '';
  const language = country
    ? countryToLandingLanguage(country)
    : acceptLanguage.startsWith('pt-br')
      ? 'pt-BR'
      : acceptLanguage.startsWith('pt')
        ? 'pt-PT'
        : acceptLanguage.startsWith('es')
          ? 'es'
          : 'en';

  res.set('Cache-Control', 'private, no-store');
  res.json({
    country: country || null,
    language,
    source: headerCountry ? 'edge' : ipCountry ? 'ip' : 'browser',
  });
});

const rotasApi: Record<string, VercelStyleHandler> = {
  'asaas-payment-link': asaasPaymentLink,
  'checkout-recovery': checkoutRecovery,
  'create-stripe-checkout': createStripeCheckout,
  'content-planner': contentPlanner,
  'glossary': glossary,
  'jobs': jobs,
  'launch-course-campaign': launchCourseCampaign,
  'manager-chat': managerChat,
  'mercadopago-balance-link': mercadopagoBalanceLink,
  'mercadopago-checkout': mercadopagoCheckout,
  'mercadopago-webhook': mercadopagoWebhook,
  'notify-students': notifyStudents,
  'whatsapp-cloud-send': whatsappCloudSend,
  'whatsapp-cloud-webhook': whatsappCloudWebhook,
  'whatsapp-send': whatsappSend,
  'vsl-progress': vslProgress,
  // Edge Functions portadas (antes em <supabase>/functions/v1/<nome>)
  'kiwify-webhook': kiwifyWebhook,
  'hotmart-webhook': hotmartWebhook,
  'get-kiwify-affiliates': getKiwifyAffiliates,
  'wa-atendentes-webhook': waAtendentesWebhook,
};

for (const [nome, handler] of Object.entries(rotasApi)) {
  app.all(`/api/${nome}`, adapt(handler));
}

// ── Aprovações de Marketing ──────────────────────────────────────────────────
// Router nativo (subrotas + upload multipart via multer). Auth pela sessão de
// staff httpOnly (cookie + digest — ver api/_auth.ts).
// A decisão via WhatsApp NÃO tem rota própria: chega pelo webhook público
// /api/wa-atendentes-webhook e é roteada pelo remoteJid do grupo.
app.use('/api/approvals', approvalsRouter);

// ── POP de Marketing Fase 2 ──────────────────────────────────────────────────
// /share e /course-occupancy usam a auth staff; /course-alerts/scan usa o
// guard de cron (Bearer CRON_SECRET) — por isso a auth fica POR ROTA no router.
app.use('/api/marketing', marketingRouter);

// ── Identidade/sessão do painel admin (login, /me, logout, CRUD de equipe) ───
app.use('/api/staff', staffAuthRouter);

// ── Rewrites herdados do vercel.json (URLs antigas continuam funcionando) ────
// /api/<task> → /api/jobs?task=<task>
const tarefasJobs = ['process-email-flows', 'balance-reminders', 'process-campaigns', 'send-test-email'];
for (const task of tarefasJobs) {
  app.all(`/api/${task}`, adapt((req, res) => {
    // defineProperty porque req.query é getter-only no protótipo do Express.
    Object.defineProperty(req, 'query', {
      value: { ...req.query, task },
      writable: true,
      configurable: true,
    });
    return jobs(req, res);
  }));
}

// Rota /api desconhecida → 404 JSON (não pode cair no fallback da SPA e devolver HTML)
app.use('/api', (_req: Request, res: Response) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// ── SPA estática (build do Vite em dist/) ────────────────────────────────────
// Nomes próprios (sem __dirname) para não colidir com o banner CJS do esbuild.
const dirAtual = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(dirAtual, '..', 'dist');
// dist/index.html passa a ser a HOME prerenderizada. Servi-la como fallback faria
// toda rota desconhecida devolver o conteúdo da home (H1 e canonical errados, soft 404
// com conteúdo alheio). O prerender guarda a casca original em app-shell.html
// justamente para o fallback ter algo neutro para entregar.
const appShell = path.join(distDir, 'app-shell.html');
const indexHtml = existsSync(appShell) ? appShell : path.join(distDir, 'index.html');

// `redirect: false` evita o 301 de /cursos para /cursos/ que o express.static faz ao
// encontrar o diretório do prerender — um salto a mais em toda URL do sitemap.
app.use(express.static(distDir, { index: false, redirect: false }));

// ── HTML prerenderizado (scripts/prerender.mjs) ─────────────────────────────
// Tem que vir ANTES do fallback: dist/<rota>/index.html contém o DOM já renderizado,
// com H1, texto e links. É o que os crawlers de assistentes de IA — que não executam
// JavaScript — conseguem ler. Sem isto, toda rota devolve a casca vazia de 6,7 KB.
// Se a rota não foi prerenderizada, cai no fallback normal e a SPA renderiza no cliente.
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();

  const safePath = path.normalize(decodeURIComponent(req.path)).replace(/^(\.\.[/\\])+/, '');
  const candidate = path.join(distDir, safePath, 'index.html');

  // Guarda contra path traversal: o arquivo resolvido tem que estar dentro de dist/.
  if (!candidate.startsWith(distDir + path.sep)) return next();
  if (!existsSync(candidate)) return next();

  res.sendFile(candidate, (err) => {
    if (err) next(err);
  });
});

// Fallback SPA: qualquer GET não-/api devolve o index.html (BrowserRouter).
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  res.sendFile(indexHtml, (err) => {
    if (err) next(err);
  });
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`[server] W-Tech no ar em http://0.0.0.0:${port} (SPA: ${distDir})`);
});
