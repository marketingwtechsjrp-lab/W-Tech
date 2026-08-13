import { timingSafeEqual } from 'node:crypto';

/**
 * Guarda de autorização para endpoints de automação/cron.
 *
 * Exige SEMPRE `Authorization: Bearer <CRON_SECRET>` — não há mais atalho
 * por header `x-vercel-cron`. Esse header é de fato injetado pela Vercel e
 * removido de chamadas externas *quando a função roda atrás do roteamento
 * nativo da Vercel* — mas este mesmo código também roda como Express puro
 * (server/index.ts, atrás de um proxy reverso tipo Traefik em VPS), onde
 * nada garante que esse header seja removido de uma requisição externa: um
 * cliente arbitrário pode simplesmente mandar `x-vercel-cron: 1` e passar
 * batido. Por isso o guard não pode depender dele em nenhum ambiente — só o
 * segredo compartilhado (CRON_SECRET) autentica. Isso também é o mecanismo
 * nativo e documentado da Vercel: com `CRON_SECRET` configurado no projeto,
 * a própria Vercel manda `Authorization: Bearer $CRON_SECRET` nos disparos
 * agendados — nenhuma funcionalidade se perde.
 *
 * Fail-closed: sem CRON_SECRET configurado, ou mais curto que
 * CRON_SECRET_MIN_LENGTH, TODA chamada é negada (nunca cai pra aceitar sem
 * segredo). Comparação em tempo constante — nunca `===` direto num segredo.
 *
 * SEM `.trim()` no valor de `CRON_SECRET` — mesmo padrão do HMAC S2S
 * (SITE_API_SECRET em api/_s2s.ts): o segredo é comparado byte a byte tal
 * como configurado. O lado ERP (`lerSegredo`) deliberadamente não faz trim e
 * manda o CRON_SECRET exato; se este lado trimasse e o valor configurado
 * tivesse espaço nas pontas, a comparação divergiria silenciosamente.
 */
const CRON_SECRET_MIN_LENGTH = 32;

function constantTimeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  try {
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export function isCronAuthorized(req: any): boolean {
  const secret = process.env.CRON_SECRET || '';
  if (secret.length < CRON_SECRET_MIN_LENGTH) return false;

  const auth = String(req.headers?.['authorization'] || '');
  return constantTimeEqual(auth, `Bearer ${secret}`);
}

/** Resposta padrão de bloqueio para chamadas não autorizadas de automação. */
export function denyCron(res: any) {
  return res.status(401).json({ ok: false, error: 'Não autorizado' });
}
