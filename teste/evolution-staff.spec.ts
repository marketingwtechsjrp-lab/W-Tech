import { expect, test } from '@playwright/test';
import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import {
  evolutionStaffRouter,
  extractInstanceInfoState,
  extractPhone,
  isValidEvolutionInstance,
} from '../server/evolutionStaff.js';

test.describe('Boundary seguro da Evolution — validadores', () => {
  test('aceita somente nomes simples de instância', () => {
    expect(isValidEvolutionInstance('w-tech-atendente-1')).toBe(true);
    expect(isValidEvolutionInstance('NoemiMarketing')).toBe(true);
    expect(isValidEvolutionInstance('curso_online.01')).toBe(true);

    expect(isValidEvolutionInstance('')).toBe(false);
    expect(isValidEvolutionInstance('../segredo')).toBe(false);
    expect(isValidEvolutionInstance('curso online')).toBe(false);
    expect(isValidEvolutionInstance('a'.repeat(65))).toBe(false);
  });

  test('nunca usa a primeira instância quando a Evolution ignora o filtro', () => {
    const upstream = [
      { instance: { instanceName: 'outra-instancia', owner: '5511999990000@s.whatsapp.net', state: 'open' } },
      { instance: { instanceName: 'instancia-certa', owner: '351912345678@s.whatsapp.net', state: 'close' } },
    ];
    expect(extractPhone(upstream, 'instancia-inexistente')).toBeNull();
    expect(extractInstanceInfoState(upstream, 'instancia-inexistente')).toBe('unknown');
    expect(extractPhone(upstream, 'instancia-certa')).toBe('351912345678');
    expect(extractInstanceInfoState(upstream, 'instancia-certa')).toBe('disconnected');
  });
});

test.describe('Boundary seguro da Evolution — autenticação HTTP', () => {
  let server: Server;
  let baseUrl = '';
  let previousNodeEnv: string | undefined;
  let previousTrustedOrigins: string | undefined;
  let previousServiceRoleKey: string | undefined;

  test.beforeAll(async () => {
    previousNodeEnv = process.env.NODE_ENV;
    previousTrustedOrigins = process.env.STAFF_TRUSTED_ORIGINS;
    previousServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    process.env.NODE_ENV = 'test';
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const app = express();
    app.use(express.json());
    app.use('/api/staff/evolution', evolutionStaffRouter);
    server = await new Promise<Server>((resolve) => {
      const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
    });
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
    process.env.STAFF_TRUSTED_ORIGINS = baseUrl;
  });

  test.afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousTrustedOrigins === undefined) delete process.env.STAFF_TRUSTED_ORIGINS;
    else process.env.STAFF_TRUSTED_ORIGINS = previousTrustedOrigins;
    if (previousServiceRoleKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previousServiceRoleKey;
  });

  test('cookie forjado não permite listar nem operar instâncias', async () => {
    const response = await fetch(`${baseUrl}/api/staff/evolution`, {
      method: 'POST',
      headers: {
        Cookie: 'wtech_staff_session=forged-plausible-token-0000000000',
        Origin: baseUrl,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'list_linked_instances', scope: 'admin' }),
    });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(body.success).toBe(false);
    expect(body.instances).toBeUndefined();
    expect(body.apiKey).toBeUndefined();
  });

  test('origem externa é bloqueada antes da sessão', async () => {
    const response = await fetch(`${baseUrl}/api/staff/evolution`, {
      method: 'POST',
      headers: {
        Cookie: 'wtech_staff_session=forged-plausible-token-0000000000',
        Origin: 'https://attacker.example',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'status', scope: 'self' }),
    });

    expect(response.status).toBe(403);
  });
});
