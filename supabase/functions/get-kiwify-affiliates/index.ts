import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

/**
 * CORS restrito ao domínio próprio (antes era '*', o que deixava qualquer site
 * chamar esta função pelo navegador). Reflete a Origin apenas se for o domínio
 * w-techbrasil ou localhost de desenvolvimento; caso contrário nega o CORS.
 */
function resolveCors(req: Request) {
  const origin = req.headers.get('origin') || '';
  const allowed =
    /^https:\/\/([a-z0-9-]+\.)*w-techbrasil\.com\.br$/i.test(origin) ||
    /^http:\/\/localhost(:\d+)?$/i.test(origin);
  return {
    'Access-Control-Allow-Origin': allowed ? origin : 'https://site.w-techbrasil.com.br',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  };
}

serve(async (req) => {
  const corsHeaders = resolveCors(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
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
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Kiwify credentials not configured', 
        affiliates: [] 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
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

    const tokenData = await tokenResponse.json();
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

    const affiliatesData = await affiliatesResponse.json();
    
    return new Response(JSON.stringify({ 
      success: true, 
      affiliates: affiliatesData.data || affiliatesData 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (err: any) {
    console.error("Error in get-kiwify-affiliates edge function:", err);
    // Não devolve o detalhe do erro (podia carregar resposta bruta da Kiwify).
    return new Response(JSON.stringify({ success: false, error: 'Falha ao consultar afiliados.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
})
