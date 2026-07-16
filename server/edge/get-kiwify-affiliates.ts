import { createClient } from '@supabase/supabase-js';
import type { Request, Response } from 'express';

/**
 * Rota Express — Lista afiliados da Kiwify (portada da Supabase Edge Function
 * `supabase/functions/get-kiwify-affiliates`). URL: /api/get-kiwify-affiliates
 *
 * Agora a SPA chama por caminho relativo (mesma origem), então o CORS vira
 * irrelevante no fluxo normal — mas a lógica original de refletir a Origin
 * permitida foi mantida para chamadas cross-origin legítimas (ex.: staging).
 */

function resolveCors(req: Request) {
  const origin = String(req.headers.origin || '');
  const allowed =
    /^https:\/\/([a-z0-9-]+\.)*w-techbrasil\.com\.br$/i.test(origin) ||
    /^http:\/\/localhost(:\d+)?$/i.test(origin);
  return {
    'Access-Control-Allow-Origin': allowed ? origin : 'https://site.w-techbrasil.com.br',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  };
}

export default async function getKiwifyAffiliatesHandler(req: Request, res: Response) {
  const corsHeaders = resolveCors(req);

  if (req.method === 'OPTIONS') {
    return res.set(corsHeaders).status(200).send('ok');
  }

  try {
    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_ENV_MISSING');
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch credentials from SITE_Config
    const { data: configs, error: configError } = await supabase
      .from('SITE_Config')
      .select('key, value')
      .in('key', ['kiwify_client_id', 'kiwify_client_secret', 'kiwify_account_id']);

    if (configError) throw configError;

    const configMap = (configs || []).reduce((acc: any, cfg: any) => ({ ...acc, [cfg.key]: cfg.value }), {});
    const client_id = configMap['kiwify_client_id'];
    const client_secret = configMap['kiwify_client_secret'];
    const account_id = configMap['kiwify_account_id'];

    if (!client_id || !client_secret || !account_id) {
      return res.set(corsHeaders).status(200).json({
        success: false,
        message: 'Kiwify credentials not configured',
        affiliates: []
      });
    }

    // Get OAuth access token
    const tokenResponse = await fetch('https://public-api.kiwify.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id,
        client_secret,
      }),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error('[get-kiwify-affiliates] OAuth token error:', errText);
      throw new Error('KIWIFY_TOKEN_FAILED');
    }

    const tokenData = await tokenResponse.json() as any;
    const accessToken = tokenData.access_token;

    // Fetch affiliates from Kiwify
    const affiliatesResponse = await fetch('https://public-api.kiwify.com/v1/affiliates', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'x-kiwify-account-id': account_id,
      },
    });

    if (!affiliatesResponse.ok) {
      const errText = await affiliatesResponse.text();
      console.error('[get-kiwify-affiliates] Affiliates fetch error:', errText);
      throw new Error('KIWIFY_AFFILIATES_FAILED');
    }

    const affiliatesData = await affiliatesResponse.json() as any;

    return res.set(corsHeaders).status(200).json({
      success: true,
      affiliates: affiliatesData.data || affiliatesData
    });

  } catch (err: any) {
    console.error("Error in get-kiwify-affiliates:", err);
    // Não devolve o detalhe do erro (podia carregar resposta bruta da Kiwify).
    return res.set(corsHeaders).status(500).json({ success: false, error: 'Falha ao consultar afiliados.' });
  }
}
