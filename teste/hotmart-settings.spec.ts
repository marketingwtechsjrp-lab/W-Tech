import { test, expect } from '@playwright/test';
import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import {
  hotmartSettingsRouter,
  isAllowedEvolutionApiUrl,
  isValidEvolutionApiUrl,
  isValidHotmartCheckoutUrl,
  isValidHotmartProductId,
  isValidWhatsAppInstance,
} from '../server/hotmartSettings.js';

test.describe('Configuração segura da Hotmart — validadores', () => {
  test('checkout aceita somente HTTPS nos hosts oficiais pay/go da Hotmart', () => {
    expect(isValidHotmartCheckoutUrl('https://pay.hotmart.com/A123456')).toBe(true);
    expect(isValidHotmartCheckoutUrl('https://pay.hotmart.com/A123456?checkoutMode=10')).toBe(true);
    expect(isValidHotmartCheckoutUrl('https://go.hotmart.com/A123456')).toBe(true);
    expect(isValidHotmartCheckoutUrl('')).toBe(true);

    expect(isValidHotmartCheckoutUrl('http://pay.hotmart.com/A123456')).toBe(false);
    expect(isValidHotmartCheckoutUrl('https://pay.hotmart.com.evil.example/A123456')).toBe(false);
    expect(isValidHotmartCheckoutUrl('https://evil.example/A123456')).toBe(false);
    expect(isValidHotmartCheckoutUrl('https://pay.hotmart.com/')).toBe(false);
    expect(isValidHotmartCheckoutUrl('https://pay.hotmart.com/A123456#fragmento')).toBe(false);
    expect(isValidHotmartCheckoutUrl('não-é-url')).toBe(false);
  });

  test('productId aceita ID numérico positivo e rejeita texto/sinais', () => {
    expect(isValidHotmartProductId('8355309')).toBe(true);
    expect(isValidHotmartProductId('1')).toBe(true);
    expect(isValidHotmartProductId('')).toBe(true);

    expect(isValidHotmartProductId('08355309')).toBe(false);
    expect(isValidHotmartProductId('835x5309')).toBe(false);
    expect(isValidHotmartProductId('-8355309')).toBe(false);
    expect(isValidHotmartProductId('8'.repeat(21))).toBe(false);
  });

  test('transporte WhatsApp aceita somente URL HTTPS e instância simples', () => {
    expect(isValidEvolutionApiUrl('https://evolution.w-techbrasil.com.br')).toBe(true);
    expect(isValidEvolutionApiUrl('')).toBe(true);
    expect(isValidEvolutionApiUrl('http://evolution.example.com')).toBe(false);
    expect(isValidEvolutionApiUrl('https://user:secret@evolution.example.com')).toBe(false);
    expect(isValidEvolutionApiUrl('https://evolution.example.com:8443')).toBe(false);
    expect(isValidEvolutionApiUrl('https://evolution.example.com?apikey=vazada')).toBe(false);

    expect(isValidWhatsAppInstance('curso-online_01')).toBe(true);
    expect(isValidWhatsAppInstance('')).toBe(true);
    expect(isValidWhatsAppInstance('curso online')).toBe(false);
    expect(isValidWhatsAppInstance('../curso')).toBe(false);
  });

  test('origem Evolution fica presa ao host atual ou à allowlist do servidor', () => {
    const current = 'https://evolution.w-techbrasil.com.br/api';
    expect(isAllowedEvolutionApiUrl(
      'https://evolution.w-techbrasil.com.br/v2',
      current,
    )).toBe(true);
    expect(isAllowedEvolutionApiUrl(
      'https://attacker.example/api',
      current,
    )).toBe(false);
    expect(isAllowedEvolutionApiUrl(
      'https://evolution-backup.w-techbrasil.com.br',
      current,
      '',
      'https://evolution-backup.w-techbrasil.com.br,https://evolution-third.w-techbrasil.com.br',
    )).toBe(true);
    expect(isAllowedEvolutionApiUrl(
      'https://from-env.w-techbrasil.com.br',
      '',
      'https://from-env.w-techbrasil.com.br/api',
    )).toBe(true);
  });
});

test.describe('Configuração segura da Hotmart — autenticação HTTP', () => {
  let server: Server;
  let baseUrl = '';
  let previousNodeEnv: string | undefined;
  let previousTrustedOrigins: string | undefined;
  let previousServiceRoleKey: string | undefined;

  test.beforeAll(async () => {
    previousNodeEnv = process.env.NODE_ENV;
    previousTrustedOrigins = process.env.STAFF_TRUSTED_ORIGINS;
    previousServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // O teste nunca consulta o banco: a autenticação deve negar o cookie
    // forjado antes de chegar aos handlers de leitura/gravação.
    process.env.NODE_ENV = 'test';
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const app = express();
    app.use(express.json());
    app.use('/api/staff/hotmart-settings', hotmartSettingsRouter);

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

  test('GET com cookie forjado retorna 401 e não expõe configuração', async () => {
    const response = await fetch(`${baseUrl}/api/staff/hotmart-settings`, {
      headers: { Cookie: 'wtech_staff_session=forged-plausible-token-0000000000' },
    });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(body.checkoutUrl).toBeUndefined();
    expect(body.productId).toBeUndefined();
    expect(body.webhookToken).toBeUndefined();
    expect(body.clientSecret).toBeUndefined();
  });

  test('PUT same-origin com cookie forjado retorna 401 antes de gravar', async () => {
    const response = await fetch(`${baseUrl}/api/staff/hotmart-settings`, {
      method: 'PUT',
      headers: {
        Cookie: 'wtech_staff_session=forged-plausible-token-0000000000',
        Origin: baseUrl,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        checkoutUrl: 'https://pay.hotmart.com/A123456',
        productId: '8355309',
        webhookToken: 'nao-deve-ser-gravado',
      }),
    });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error).toBe('Não autorizado');
  });
});
