-- ═══════════════════════════════════════════════════════════════
-- GESTOR POP — cobranças de SLA, escalação, digest e watchdog (pg_cron + pg_net)
-- Complementa pop_whatsapp_notifications.sql. Re-executável sem perder dados.
--   • Varredura diária (dias úteis 08:30 BRT): vencendo ≤2d, estourados, parados 5d+
--   • Escalação: estourado 3d+ → número avulso do setor, dia sim dia não
--   • Aviso único ao solicitante no 1º dia de atraso
--   • Digest de segunda 08:00 BRT por setor
--   • Watchdog horário da instância central (alerta pelo chip reserva)
-- Liga/desliga por setor: SITE_PopNotifyConfig.sla_alerts_enabled
-- ═══════════════════════════════════════════════════════════════

alter table public."SITE_PopNotifyConfig" add column if not exists sla_alerts_enabled boolean not null default true;

-- Estado/dedupe interno (RLS sem policies = invisível ao PostgREST)
create table if not exists public."SITE_PopAlertState" (
    kind    text not null,
    ref     text not null,
    sent_on date not null default current_date,
    meta    jsonb default '{}'::jsonb,
    primary key (kind, ref)
);
alter table public."SITE_PopAlertState" enable row level security;

-- Prazo efetivo: o que vencer primeiro entre SLA interno e data desejada (18h)
create or replace function public.pop_effective_due(r public."SITE_CampaignRequests") returns timestamptz
language sql stable as $$
    select least(
        coalesce(r.sla_due_at, 'infinity'::timestamptz),
        coalesce((r.desired_date::timestamp + interval '18 hours') at time zone 'America/Sao_Paulo', 'infinity'::timestamptz)
    )
$$;

-- ── Varredura diária ─────────────────────────────────────────────
create or replace function public.pop_sla_sweep() returns void
language plpgsql security definer set search_path = public as $$
declare
    cfg   record;
    v_url text; v_key text;
    r     record;
    sec_due text; sec_over text; sec_stale text;
    msg   text; due timestamptz; late int; priv text;
begin
    select value into v_url from "SITE_Config" where key = 'evolution_api_url';
    select value into v_key from "SITE_Config" where key = 'evolution_api_key';
    if coalesce(trim(v_url),'') = '' or coalesce(trim(v_key),'') = '' then return; end if;

    for cfg in select * from "SITE_PopNotifyConfig" where enabled and sla_alerts_enabled loop
        -- idempotência: 1 varredura por setor por dia
        if exists (select 1 from "SITE_PopAlertState" where kind='daily_sweep' and ref=cfg.sector and sent_on=current_date) then
            continue;
        end if;

        sec_due := ''; sec_over := ''; sec_stale := '';

        for r in
            select * from "SITE_CampaignRequests"
             where coalesce(target_sector,'Marketing') = cfg.sector
               and status in ('Recebido','Triagem','Planejamento','Producao','Aprovacao','Aprovado','Publicado')
        loop
            due := pop_effective_due(r);
            if due = 'infinity'::timestamptz then
                due := null;
            end if;

            if due is not null and due < now() then
                late := greatest(1, ceil(extract(epoch from now() - due) / 86400))::int;
                sec_over := sec_over || '• *' || r.title || '* — ' || late || 'd de atraso ('
                    || pop_status_label(r.status) || ') · ' || coalesce(r.requester_name,'—') || e'\n';

                -- 1º dia de atraso: aviso único ao solicitante
                if not exists (select 1 from "SITE_PopAlertState" where kind='overdue_first' and ref=r.id::text) then
                    insert into "SITE_PopAlertState"(kind, ref) values ('overdue_first', r.id::text) on conflict do nothing;
                    priv := regexp_replace(coalesce(r.requester_contact,''), '\D', '', 'g');
                    if length(priv) < 10 and r.created_by is not null then
                        select regexp_replace(coalesce(u.phone,''), '\D','','g') into priv from "SITE_Users" u where u.id::text = r.created_by limit 1;
                        priv := coalesce(priv,'');
                    end if;
                    if length(priv) between 10 and 11 then priv := '55' || priv; end if;
                    if length(priv) >= 12 then
                        perform pop_wa_send(v_url, v_key, cfg.instance_name, priv,
                            '🔔 *POP ' || pop_sector_label(cfg.sector) || '*' || e'\n\n'
                            || 'Seu pedido *' || r.title || '* passou do prazo e está sendo tratado com prioridade pelo setor.');
                    end if;
                end if;

                -- escalação: 3d+ de atraso, dia sim dia não, para o número avulso
                if late >= 3 and coalesce(trim(cfg.private_number),'') <> '' then
                    if not exists (
                        select 1 from "SITE_PopAlertState"
                         where kind='escalation' and ref=r.id::text and sent_on > current_date - 2
                    ) then
                        insert into "SITE_PopAlertState"(kind, ref, sent_on) values ('escalation', r.id::text, current_date)
                            on conflict (kind, ref) do update set sent_on = current_date;
                        perform pop_wa_send(v_url, v_key, cfg.instance_name, cfg.private_number,
                            '📢 *Escalação — POP ' || pop_sector_label(cfg.sector) || '*' || e'\n\n'
                            || '📋 *' || r.title || '*' || e'\n'
                            || '🔥 Estourado há ' || late || ' dias · parado em ' || pop_status_label(r.status) || e'\n'
                            || '👤 Solicitante: ' || coalesce(r.requester_name,'—') || e'\n\n'
                            || 'Precisa de decisão do gestor.');
                    end if;
                end if;

            elsif due is not null and due < now() + interval '2 days' then
                sec_due := sec_due || '• *' || r.title || '* — vence '
                    || to_char(due at time zone 'America/Sao_Paulo', 'DD/MM') || ' ('
                    || pop_status_label(r.status) || ')' || e'\n';

            elsif coalesce(r.updated_at, r.created_at) < now() - interval '5 days' then
                sec_stale := sec_stale || '• *' || r.title || '* — sem movimento há '
                    || ceil(extract(epoch from now() - coalesce(r.updated_at, r.created_at)) / 86400)::int
                    || 'd (' || pop_status_label(r.status) || ')' || e'\n';
            end if;
        end loop;

        if sec_due <> '' or sec_over <> '' or sec_stale <> '' then
            msg := '🤖 *Gestor POP ' || pop_sector_label(cfg.sector) || ' — cobrança diária*' || e'\n';
            if sec_over  <> '' then msg := msg || e'\n🔥 *Estourados:*\n'        || sec_over;  end if;
            if sec_due   <> '' then msg := msg || e'\n⚠️ *Vencendo (2 dias):*\n' || sec_due;   end if;
            if sec_stale <> '' then msg := msg || e'\n🛑 *Parados (5d+):*\n'     || sec_stale; end if;
            perform pop_wa_send(v_url, v_key, cfg.instance_name, cfg.group_jid, msg);
        end if;

        insert into "SITE_PopAlertState"(kind, ref, sent_on) values ('daily_sweep', cfg.sector, current_date)
            on conflict (kind, ref) do update set sent_on = current_date;
    end loop;

    -- cobrança de aprovações esquecidas (itens Enviado há 24h+), 1x/dia por item
    for r in
        select ai.*, c.approval_group_jid, c.instance_name as inst
          from "SITE_ApprovalItems" ai
          left join "SITE_CampaignRequests" cr on cr.id = ai.request_id
          join "SITE_PopNotifyConfig" c on c.sector = coalesce(cr.target_sector,'Marketing')
         where ai.status = 'Enviado' and ai.sent_at < now() - interval '24 hours'
           and c.enabled and c.sla_alerts_enabled and c.approval_enabled
           and coalesce(trim(c.approval_group_jid),'') <> ''
    loop
        if not exists (select 1 from "SITE_PopAlertState" where kind='approval_nudge' and ref=r.id::text and sent_on=current_date) then
            insert into "SITE_PopAlertState"(kind, ref, sent_on) values ('approval_nudge', r.id::text, current_date)
                on conflict (kind, ref) do update set sent_on = current_date;
            perform pop_wa_send(v_url, v_key, r.inst, r.approval_group_jid,
                '⏳ *Aprovação aguardando há ' || ceil(extract(epoch from now() - r.sent_at)/3600)::int || 'h*' || e'\n\n'
                || '📋 Item #' || r.id || ' — *' || r.title || '*' || e'\n'
                || 'Responda a peça no grupo (aprovar / reprovar) ou decida no painel.');
        end if;
    end loop;
end $$;

-- ── Digest de segunda-feira ──────────────────────────────────────
create or replace function public.pop_weekly_digest() returns void
language plpgsql security definer set search_path = public as $$
declare
    cfg record; v_url text; v_key text; msg text; r record; total int;
begin
    select value into v_url from "SITE_Config" where key = 'evolution_api_url';
    select value into v_key from "SITE_Config" where key = 'evolution_api_key';
    if coalesce(trim(v_url),'') = '' or coalesce(trim(v_key),'') = '' then return; end if;

    for cfg in select * from "SITE_PopNotifyConfig" where enabled and sla_alerts_enabled loop
        select count(*) into total from "SITE_CampaignRequests"
         where coalesce(target_sector,'Marketing') = cfg.sector
           and status in ('Recebido','Triagem','Planejamento','Producao','Aprovacao','Aprovado','Publicado');
        msg := '🤖 *Gestor POP ' || pop_sector_label(cfg.sector) || ' — resumo da semana*' || e'\n\n'
            || '📂 Pedidos em andamento: *' || total || '*' || e'\n';
        for r in
            select status, count(*) n from "SITE_CampaignRequests"
             where coalesce(target_sector,'Marketing') = cfg.sector
               and status in ('Recebido','Triagem','Planejamento','Producao','Aprovacao','Aprovado','Publicado')
             group by status order by min(array_position(
                array['Recebido','Triagem','Planejamento','Producao','Aprovacao','Aprovado','Publicado'], status))
        loop
            msg := msg || pop_status_emoji(r.status) || ' ' || pop_status_label(r.status) || ': ' || r.n || e'\n';
        end loop;
        select count(*) into total from "SITE_CampaignRequests" c
         where coalesce(c.target_sector,'Marketing') = cfg.sector
           and c.status in ('Recebido','Triagem','Planejamento','Producao','Aprovacao','Aprovado','Publicado')
           and pop_effective_due(c) < now();
        msg := msg || e'\n🔥 Estourados: *' || total || '*';
        perform pop_wa_send(v_url, v_key, cfg.instance_name, cfg.group_jid, msg);
    end loop;
end $$;

-- ── Watchdog da instância central ────────────────────────────────
-- A cada hora: confere a resposta da checagem anterior; se a instância não
-- estiver "open", alerta o número avulso do Marketing pelo chip reserva.
create or replace function public.pop_instance_watchdog() returns void
language plpgsql security definer set search_path = public as $$
declare
    v_url text; v_key text; st record; resp record; state text; fallback text := 'w-tech-atendente-1';
    inst text; alert_to text; req_id bigint;
begin
    select value into v_url from "SITE_Config" where key = 'evolution_api_url';
    select value into v_key from "SITE_Config" where key = 'evolution_api_key';
    if coalesce(trim(v_url),'') = '' or coalesce(trim(v_key),'') = '' then return; end if;

    select instance_name, private_number into inst, alert_to
      from "SITE_PopNotifyConfig" where sector = 'Marketing' limit 1;
    inst := coalesce(inst, 'w-tech-marketing');

    -- 1. avalia a checagem anterior
    select * into st from "SITE_PopAlertState" where kind='watchdog' and ref=inst;
    if st.meta ? 'req_id' then
        select * into resp from net._http_response where id = (st.meta->>'req_id')::bigint;
        if found then
            state := coalesce(resp.content::jsonb->'instance'->>'state', 'erro');
            if (resp.status_code is distinct from 200 or state <> 'open') then
                if coalesce(trim(alert_to),'') <> '' and not exists (
                    select 1 from "SITE_PopAlertState" where kind='watchdog_alert' and ref=inst and sent_on=current_date
                ) then
                    insert into "SITE_PopAlertState"(kind, ref, sent_on) values ('watchdog_alert', inst, current_date)
                        on conflict (kind, ref) do update set sent_on = current_date;
                    perform pop_wa_send(v_url, v_key, fallback, alert_to,
                        '🩺 *Watchdog POP*' || e'\n\nA instância *' || inst || '* está *' || state
                        || '* — os avisos do POP podem estar mudos. Reconecte o QR em Admin → Integrações.');
                end if;
            end if;
        end if;
    end if;

    -- 2. agenda a próxima checagem
    req_id := net.http_get(
        url := rtrim(v_url,'/') || '/instance/connectionState/' || inst,
        headers := jsonb_build_object('apikey', v_key)
    );
    insert into "SITE_PopAlertState"(kind, ref, sent_on, meta)
        values ('watchdog', inst, current_date, jsonb_build_object('req_id', req_id))
        on conflict (kind, ref) do update set sent_on = current_date, meta = jsonb_build_object('req_id', req_id);
end $$;

-- ── Agendamentos (horários em UTC; Brasília = UTC-3) ─────────────
select cron.schedule('pop_sla_sweep',      '30 11 * * 1-5', $$select public.pop_sla_sweep()$$);      -- 08:30 BRT, dias úteis
select cron.schedule('pop_weekly_digest',  '0 11 * * 1',    $$select public.pop_weekly_digest()$$);  -- segunda 08:00 BRT
select cron.schedule('pop_watchdog',       '5 * * * *',     $$select public.pop_instance_watchdog()$$); -- de hora em hora
