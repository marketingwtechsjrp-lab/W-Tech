import { createHmac } from 'node:crypto';

/**
 * Passe da equipe para o banco: JWT curto que o PostgREST aceita.
 *
 * O painel /admin fala com o Supabase direto do navegador. Sem isto ele usa a
 * chave anônima, a mesma de qualquer visitante, e o banco não tem como separar
 * o gerente logado de um estranho (SEGURANCA_RLS_PENDENTE.md §2). Resultado:
 * nenhuma tabela que o painel usa podia fechar para `anon`.
 *
 * O servidor já valida a sessão httpOnly; aqui ele assina, com o segredo JWT do
 * próprio Supabase (SUPABASE_JWT_SECRET = PGRST_JWT_SECRET do PostgREST), um
 * token `role: authenticated` de 15 minutos com `sub` = id em SITE_Users. Com o
 * painel nesse papel, a RLS fecha para `anon` o que só a equipe usa.
 *
 * Esta instância não tem GoTrue (nenhum cadastro público), então ninguém além
 * deste servidor consegue um token `authenticated`.
 */

export const STAFF_DB_TOKEN_TTL_SECONDS = 15 * 60;
const MIN_SECRET_LENGTH = 32;

export interface StaffDbToken {
  token: string;
  /** Validade em segundos a partir da emissão (o navegador conta pelo próprio relógio). */
  expiresIn: number;
}

export function signStaffDbToken(staffId: string, secret: string, nowMs = Date.now()): StaffDbToken {
  const iat = Math.floor(nowMs / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    role: 'authenticated',
    aud: 'authenticated',
    sub: staffId,
    iss: 'wtech-site',
    iat,
    exp: iat + STAFF_DB_TOKEN_TTL_SECONDS,
  })).toString('base64url');
  const signature = createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
  return { token: `${header}.${payload}.${signature}`, expiresIn: STAFF_DB_TOKEN_TTL_SECONDS };
}

/** null quando o segredo não está configurado: o painel segue com a chave anônima. */
export function issueStaffDbToken(staffId: string): StaffDbToken | null {
  const secret = process.env.SUPABASE_JWT_SECRET || '';
  if (secret.length < MIN_SECRET_LENGTH) return null;
  return signStaffDbToken(staffId, secret);
}
