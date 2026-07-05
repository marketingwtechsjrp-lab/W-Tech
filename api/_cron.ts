/**
 * Guarda de autorização para endpoints de automação/cron.
 *
 * Aceita a requisição quando:
 *   1. É um disparo de cron da própria Vercel — header `x-vercel-cron`, que a
 *      Vercel injeta nas execuções agendadas e REMOVE de requisições externas
 *      (não é forjável de fora), OU
 *   2. Traz `Authorization: Bearer <CRON_SECRET>` — usado pelo GitHub Actions e
 *      por chamadas internas — quando `CRON_SECRET` está configurado.
 *
 * Consequência: os crons agendados seguem funcionando mesmo sem `CRON_SECRET`
 * (via `x-vercel-cron`), e chamadas públicas arbitrárias passam a receber 401.
 */
export function isCronAuthorized(req: any): boolean {
  // 1. Cron nativo da Vercel (header injetado pela plataforma)
  if (req.headers?.['x-vercel-cron']) return true;

  // 2. Bearer CRON_SECRET (GitHub Actions / chamada interna autorizada)
  const secret = (process.env.CRON_SECRET || '').trim();
  if (secret) {
    const auth = String(req.headers?.['authorization'] || '');
    if (auth === `Bearer ${secret}`) return true;
  }

  return false;
}

/** Resposta padrão de bloqueio para chamadas não autorizadas de automação. */
export function denyCron(res: any) {
  return res.status(401).json({ ok: false, error: 'Não autorizado' });
}
