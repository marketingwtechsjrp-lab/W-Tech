import path from 'node:path';
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
import glossary from '../api/_glossary.js';
import jobs from '../api/jobs.js';
import launchCourseCampaign from '../api/launch-course-campaign.js';
import mercadopagoBalanceLink from '../api/mercadopago-balance-link.js';
import mercadopagoCheckout from '../api/mercadopago-checkout.js';
import mercadopagoWebhook from '../api/mercadopago-webhook.js';
import notifyStudents from '../api/notify-students.js';
import whatsappCloudSend from '../api/whatsapp-cloud-send.js';
import whatsappCloudWebhook from '../api/whatsapp-cloud-webhook.js';
import whatsappSend from '../api/whatsapp-send.js';

// ── Edge Functions do Supabase portadas para Express (Deno → Node) ───────────
import kiwifyWebhook from './edge/kiwify-webhook.js';
import stripeWebhook from './edge/stripe-webhook.js';
import getKiwifyAffiliates from './edge/get-kiwify-affiliates.js';
import waAtendentesWebhook from './edge/wa-atendentes-webhook.js';

// ── Aprovações de Marketing (router Express nativo — precisa de multipart) ───
import { approvalsRouter } from './approvals.js';
// ── POP de Marketing Fase 2 (compartilhamentos + alerta de ocupação) ─────────
import { marketingRouter } from './marketing.js';

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

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Rotas /api (mesmos paths da Vercel) ──────────────────────────────────────
const rotasApi: Record<string, VercelStyleHandler> = {
  'asaas-payment-link': asaasPaymentLink,
  'checkout-recovery': checkoutRecovery,
  'create-stripe-checkout': createStripeCheckout,
  'glossary': glossary,
  'jobs': jobs,
  'launch-course-campaign': launchCourseCampaign,
  'mercadopago-balance-link': mercadopagoBalanceLink,
  'mercadopago-checkout': mercadopagoCheckout,
  'mercadopago-webhook': mercadopagoWebhook,
  'notify-students': notifyStudents,
  'whatsapp-cloud-send': whatsappCloudSend,
  'whatsapp-cloud-webhook': whatsappCloudWebhook,
  'whatsapp-send': whatsappSend,
  // Edge Functions portadas (antes em <supabase>/functions/v1/<nome>)
  'kiwify-webhook': kiwifyWebhook,
  'get-kiwify-affiliates': getKiwifyAffiliates,
  'wa-atendentes-webhook': waAtendentesWebhook,
};

for (const [nome, handler] of Object.entries(rotasApi)) {
  app.all(`/api/${nome}`, adapt(handler));
}

// ── Aprovações de Marketing ──────────────────────────────────────────────────
// Router nativo (subrotas + upload multipart via multer). Auth pelo mesmo
// padrão interino das rotas admin (x-wtech-user-id — ver api/_auth.ts).
// A decisão via WhatsApp NÃO tem rota própria: chega pelo webhook público
// /api/wa-atendentes-webhook e é roteada pelo remoteJid do grupo.
app.use('/api/approvals', approvalsRouter);

// ── POP de Marketing Fase 2 ──────────────────────────────────────────────────
// /share e /course-occupancy usam a auth staff; /course-alerts/scan usa o
// guard de cron (Bearer CRON_SECRET) — por isso a auth fica POR ROTA no router.
app.use('/api/marketing', marketingRouter);

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
const indexHtml = path.join(distDir, 'index.html');

app.use(express.static(distDir));

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
