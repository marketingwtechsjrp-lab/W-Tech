/**
 * Passe da equipe no navegador (ver api/_dbToken.ts).
 *
 * No painel (/admin) o cliente Supabase troca a chave anônima por um JWT curto
 * emitido por GET /api/staff/db-token, que só responde para sessão de staff
 * válida. Fora do painel, ou sem sessão, devolve null e o supabase-js usa a
 * chave anônima de sempre: o visitante não faz request nenhum a mais.
 */

const RENEW_MARGIN_MS = 60_000;
const NO_SESSION_BACKOFF_MS = 30_000;

interface Deps {
  fetch: (input: string, init?: RequestInit) => Promise<Response>;
  now: () => number;
  inAdminArea: () => boolean;
}

export function createStaffDbTokenSource({ fetch, now, inAdminArea }: Deps) {
  let current: { token: string; localExpiry: number } | null = null;
  let noSessionUntil = 0;
  let inFlight: Promise<string | null> | null = null;
  // Login/logout no meio de um pedido: a resposta velha não pode gravar estado.
  let generation = 0;

  async function request(gen: number): Promise<string | null> {
    try {
      const res = await fetch('/api/staff/db-token', { credentials: 'same-origin', cache: 'no-store' });
      const data = res.ok ? await res.json().catch(() => null) : null;
      if (gen !== generation) return null;
      if (typeof data?.token !== 'string' || typeof data?.expiresIn !== 'number') {
        // Sem sessão (401) ou passe desligado no servidor (503): segue anônimo e
        // não pergunta de novo a cada consulta.
        current = null;
        noSessionUntil = now() + NO_SESSION_BACKOFF_MS;
        return null;
      }
      // Validade contada pelo relógio deste navegador, não pelo do servidor.
      current = { token: data.token, localExpiry: now() + data.expiresIn * 1000 };
      return current.token;
    } catch {
      return null;
    }
  }

  async function getToken(): Promise<string | null> {
    if (!inAdminArea()) return null;
    if (current && current.localExpiry - now() > RENEW_MARGIN_MS) return current.token;
    if (now() < noSessionUntil) return null;
    if (!inFlight) {
      const pending = request(generation).finally(() => {
        if (inFlight === pending) inFlight = null;
      });
      inFlight = pending;
    }
    return inFlight;
  }

  /** Login troca quem está no painel: descarta o passe, a espera e o pedido em curso. */
  function reset(): void {
    generation += 1;
    current = null;
    noSessionUntil = 0;
    inFlight = null;
  }

  return { getToken, reset };
}
