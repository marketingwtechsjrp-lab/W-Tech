-- Fila de follow-up do WhatsApp (SITE_Automacao_Fila) — curso online (Kiwify).
-- ANTES: URL, apikey e instância ('wtech-suporte-curso') fixas no corpo da função.
-- AGORA: tudo lido de SITE_Config, com a MESMA ordem de prioridade da edge
-- function kiwify-webhook:
--   wa_instance_curso_online → automation_whatsapp_instance → evolution_instance_name
-- Assim a troca de instância no painel (Admin → Integrações) vale para o
-- envio imediato (webhook) E para o follow-up de escassez (+15min, este cron).

CREATE OR REPLACE FUNCTION public.processar_fila_whatsapp()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  r RECORD;
  v_url text;
  v_key text;
  v_instance text;
BEGIN
  SELECT TRIM(TRAILING '/' FROM COALESCE(TRIM(value), '')) INTO v_url
    FROM public."SITE_Config" WHERE key = 'evolution_api_url';
  SELECT COALESCE(TRIM(value), '') INTO v_key
    FROM public."SITE_Config" WHERE key = 'evolution_api_key';
  SELECT COALESCE(
    NULLIF(TRIM((SELECT value FROM public."SITE_Config" WHERE key = 'wa_instance_curso_online')), ''),
    NULLIF(TRIM((SELECT value FROM public."SITE_Config" WHERE key = 'automation_whatsapp_instance')), ''),
    NULLIF(TRIM((SELECT value FROM public."SITE_Config" WHERE key = 'evolution_instance_name')), '')
  ) INTO v_instance;

  IF COALESCE(v_url, '') = '' OR COALESCE(v_key, '') = '' OR COALESCE(v_instance, '') = '' THEN
    RAISE WARNING 'processar_fila_whatsapp: config Evolution incompleta em SITE_Config — nada enviado';
    RETURN;
  END IF;

  FOR r IN
    SELECT * FROM public."SITE_Automacao_Fila"
    WHERE processed = false AND send_at <= now()
  LOOP
    -- Disparar via pg_net (HTTP POST direto do banco)
    PERFORM net.http_post(
      url := v_url || '/message/sendMedia/' || v_instance,
      headers := jsonb_build_object('Content-Type', 'application/json', 'apikey', v_key),
      body := jsonb_build_object(
        'number', r.phone,
        'mediatype', 'video',
        'media', r.video_url,
        'caption', r.caption,
        'delay', 1200
      )
    );

    -- Marcar como processado para não enviar de novo
    UPDATE public."SITE_Automacao_Fila" SET processed = true WHERE id = r.id;
  END LOOP;
END;
$function$;
