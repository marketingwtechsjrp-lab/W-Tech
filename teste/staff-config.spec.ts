import { expect, test } from '@playwright/test';
import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import {
  GLOBAL_SITE_CONFIG_KEYS,
  AI_GROUP_SITE_CONFIG_KEYS,
  staffConfigRouter,
} from '../server/staffConfig.js';

test.describe('Configuração administrativa server-side', () => {
  test('allowlists não transformam os endpoints em gravação genérica', () => {
    expect(GLOBAL_SITE_CONFIG_KEYS.has('evolution_api_key')).toBe(false);
    expect(GLOBAL_SITE_CONFIG_KEYS.has('hotmart_webhook_token')).toBe(false);
    expect(GLOBAL_SITE_CONFIG_KEYS.has('chave_inventada')).toBe(false);
    expect(AI_GROUP_SITE_CONFIG_KEYS.has('ai_group_webhook_token')).toBe(false);
    expect(AI_GROUP_SITE_CONFIG_KEYS.has('ai_group_bot_instance')).toBe(false);
    expect(AI_GROUP_SITE_CONFIG_KEYS.has('evolution_api_key')).toBe(false);
  });

  test('cookie forjado não grava configuração', async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    const previousTrustedOrigins = process.env.STAFF_TRUSTED_ORIGINS;
    const previousServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.NODE_ENV = 'test';
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const app = express();
    app.use(express.json());
    app.use('/api/staff/config', staffConfigRouter);
    const server = await new Promise<Server>((resolve) => {
      const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
    });
    const address = server.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${address.port}`;
    process.env.STAFF_TRUSTED_ORIGINS = baseUrl;

    try {
      const response = await fetch(`${baseUrl}/api/staff/config/global`, {
        method: 'PUT',
        headers: {
          Cookie: 'wtech_staff_session=forged-plausible-token-0000000000',
          Origin: baseUrl,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ entries: [{ key: 'evolution_managed_instances', value: '[]' }] }),
      });
      const body = await response.json();
      expect(response.status).toBe(401);
      expect(body.success).toBe(false);
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
      });
      if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousNodeEnv;
      if (previousTrustedOrigins === undefined) delete process.env.STAFF_TRUSTED_ORIGINS;
      else process.env.STAFF_TRUSTED_ORIGINS = previousTrustedOrigins;
      if (previousServiceRoleKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      else process.env.SUPABASE_SERVICE_ROLE_KEY = previousServiceRoleKey;
    }
  });
});
