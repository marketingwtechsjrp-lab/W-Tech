-- ═══════════════════════════════════════════════════════════════
-- POP MARKETING — Notificações WhatsApp em tempo real (Evolution API)
-- v2 — Aplicar no Supabase da VPS (wtechdb):  psql -f pop_whatsapp_notifications.sql
--
-- O que faz:
--   1. Pedido criado no POP (SITE_CampaignRequests)  → mensagem no grupo do setor
--   2. Card movido no Kanban (mudança de status)     → mensagem no grupo + privado do solicitante
--
-- Credenciais: lidas de SITE_Config (evolution_api_url / evolution_api_key),
-- as mesmas salvas em Admin → Integrações. Nenhum segredo neste arquivo/tabela.
-- Config por setor em SITE_PopNotifyConfig (grupo, instância, liga/desliga) —
-- exposta ao admin (RLS permissiva, padrão do projeto) para o seletor de grupos da UI.
-- ═══════════════════════════════════════════════════════════════

-- 1. Tabela de configuração por setor (sem segredos) — re-executável sem perder dados
create table if not exists public."SITE_PopNotifyConfig" (
    id               uuid primary key default gen_random_uuid(),
    sector           text not null unique,            -- 'Marketing', 'Comercial', ...
    group_jid        text,                            -- grupo WhatsApp destino (...@g.us)
    group_name       text,                            -- nome do grupo (exibição na UI)
    private_number   text,                            -- número avulso opcional (ex.: gestor)
    instance_name    text not null default 'w-tech-marketing',
    notify_requester boolean not null default true,   -- avisa o solicitante no privado
    enabled          boolean not null default false,
    updated_at       timestamptz default now()
);

-- Instância padrão dos avisos do POP: celular do Marketing (centralizador de instâncias)
alter table public."SITE_PopNotifyConfig" alter column instance_name set default 'w-tech-marketing';

-- Grupo de aprovação (toggle próprio): avisa quando o pedido entra em Aprovação
-- e quando sai com decisão (Aprovado/Reprovado)
alter table public."SITE_PopNotifyConfig" add column if not exists approval_group_jid  text;
alter table public."SITE_PopNotifyConfig" add column if not exists approval_group_name text;
alter table public."SITE_PopNotifyConfig" add column if not exists approval_enabled    boolean not null default false;

alter table public."SITE_PopNotifyConfig" enable row level security;
drop policy if exists "pop_notify_config_all" on public."SITE_PopNotifyConfig";
create policy "pop_notify_config_all" on public."SITE_PopNotifyConfig"
    for all using (true) with check (true); -- RLS permissiva (padrão do projeto)
grant select, insert, update, delete on public."SITE_PopNotifyConfig" to anon, authenticated, service_role;

-- 2. Envio via Evolution API (pg_net = assíncrono, não trava a transação do app)
create or replace function public.pop_wa_send(
    p_url text, p_key text, p_instance text, p_dest text, p_msg text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    if coalesce(trim(p_dest), '') = '' then
        return;
    end if;
    perform net.http_post(
        url     := rtrim(p_url, '/') || '/message/sendText/' || p_instance,
        headers := jsonb_build_object('Content-Type', 'application/json', 'apikey', p_key),
        body    := jsonb_build_object('number', p_dest, 'text', p_msg)
    );
exception when others then
    -- nunca derrubar a operação do POP por falha de notificação
    raise warning 'pop_wa_send falhou para %: %', p_dest, sqlerrm;
end;
$$;

-- 3. Emojis e rótulos das colunas do Kanban
create or replace function public.pop_status_emoji(s text) returns text
language sql immutable as $$
    select case s
        when 'Recebido'     then '📥'
        when 'Triagem'      then '🔎'
        when 'Planejamento' then '🗓️'
        when 'Producao'     then '🛠️'
        when 'Aprovacao'    then '⏳'
        when 'Aprovado'     then '✅'
        when 'Publicado'    then '🚀'
        when 'Concluido'    then '🏁'
        when 'Reprovado'    then '❌'
        when 'Cancelado'    then '🚫'
        else 'ℹ️'
    end
$$;

create or replace function public.pop_status_label(s text) returns text
language sql immutable as $$
    select case s
        when 'Producao'  then 'Produção'
        when 'Aprovacao' then 'Aprovação'
        when 'Concluido' then 'Concluído'
        else coalesce(s, '—')
    end
$$;

-- 4. Trigger: novo pedido + movimentação do Kanban
create or replace function public.pop_notify_whatsapp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    cfg   public."SITE_PopNotifyConfig";
    v_url text;
    v_key text;
    msg   text;
    amsg  text;
    priv  text;
begin
    -- v1: o board pop_marketing pertence ao setor Marketing.
    -- Quando houver boards de outros setores, buscar pelo setor do board.
    select * into cfg
      from public."SITE_PopNotifyConfig"
     where sector = 'Marketing' and enabled
     limit 1;
    if not found then
        return new;
    end if;

    select value into v_url from public."SITE_Config" where key = 'evolution_api_url';
    select value into v_key from public."SITE_Config" where key = 'evolution_api_key';
    if coalesce(trim(v_url), '') = '' or coalesce(trim(v_key), '') = '' then
        return new; -- Evolution não configurada em Admin → Integrações
    end if;

    if tg_op = 'INSERT' then
        msg := '🆕 *POP Marketing — Novo pedido*' || e'\n\n'
            || '📋 *' || coalesce(new.title, '(sem título)') || '*' || e'\n'
            || '👤 Solicitante: ' || coalesce(new.requester_name, '—')
            || ' (' || coalesce(new.requester_sector, '—') || ')' || e'\n'
            || '🎯 Objetivo: ' || coalesce(nullif(new.objective, ''), '—') || e'\n'
            || '⚡ Prioridade: ' || coalesce(new.priority, '—') || e'\n'
            || '📅 Prazo desejado: ' || coalesce(to_char(new.desired_date, 'DD/MM/YYYY'), '—') || e'\n'
            || '🔖 Status: ' || pop_status_emoji(new.status) || ' ' || pop_status_label(new.status);
    elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
        msg := '🔄 *POP Marketing — Pedido atualizado*' || e'\n\n'
            || '📋 *' || coalesce(new.title, '(sem título)') || '*' || e'\n'
            || pop_status_emoji(old.status) || ' ' || pop_status_label(old.status)
            || '  ➜  '
            || pop_status_emoji(new.status) || ' *' || pop_status_label(new.status) || '*' || e'\n'
            || '👤 Solicitante: ' || coalesce(new.requester_name, '—');
    else
        return new; -- update sem mudança de status: silêncio
    end if;

    -- grupo do setor + número avulso configurado
    perform public.pop_wa_send(v_url, v_key, cfg.instance_name, cfg.group_jid, msg);
    perform public.pop_wa_send(v_url, v_key, cfg.instance_name, cfg.private_number, msg);

    -- privado do solicitante: contato do pedido ou, se vazio, telefone do cadastro (SITE_Users)
    if cfg.notify_requester then
        priv := regexp_replace(coalesce(new.requester_contact, ''), '\D', '', 'g');
        if length(priv) < 10 and new.created_by is not null then
            select regexp_replace(coalesce(u.phone, ''), '\D', '', 'g') into priv
              from public."SITE_Users" u
             where u.id::text = new.created_by
             limit 1;
            priv := coalesce(priv, '');
        end if;
        if length(priv) between 10 and 11 then
            priv := '55' || priv; -- DDD sem código do país → assume Brasil
        end if;
        if length(priv) >= 12 then
            perform public.pop_wa_send(v_url, v_key, cfg.instance_name, priv, msg);
        end if;
    end if;

    -- grupo de aprovação (toggle approval_enabled): entrada em Aprovação e decisão final
    if cfg.approval_enabled
       and coalesce(trim(cfg.approval_group_jid), '') <> ''
       and tg_op = 'UPDATE' and new.status is distinct from old.status then
        if new.status = 'Aprovacao' then
            amsg := '⏳ *Aprovação pendente — POP Marketing*' || e'\n\n'
                 || '📋 *' || coalesce(new.title, '(sem título)') || '*' || e'\n'
                 || '👤 Solicitante: ' || coalesce(new.requester_name, '—')
                 || ' (' || coalesce(new.requester_sector, '—') || ')' || e'\n'
                 || '⚡ Prioridade: ' || coalesce(new.priority, '—') || e'\n'
                 || '📅 Prazo desejado: ' || coalesce(to_char(new.desired_date, 'DD/MM/YYYY'), '—') || e'\n\n'
                 || 'Avalie no painel: aprovar ou reprovar.';
            perform public.pop_wa_send(v_url, v_key, cfg.instance_name, cfg.approval_group_jid, amsg);
        elsif new.status in ('Aprovado', 'Reprovado') then
            amsg := pop_status_emoji(new.status) || ' *Pedido ' || lower(pop_status_label(new.status))
                 || ' — POP Marketing*' || e'\n\n'
                 || '📋 *' || coalesce(new.title, '(sem título)') || '*' || e'\n'
                 || '👤 Solicitante: ' || coalesce(new.requester_name, '—');
            perform public.pop_wa_send(v_url, v_key, cfg.instance_name, cfg.approval_group_jid, amsg);
        end if;
    end if;

    return new;
end;
$$;

drop trigger if exists trg_pop_notify_ins on public."SITE_CampaignRequests";
create trigger trg_pop_notify_ins
    after insert on public."SITE_CampaignRequests"
    for each row execute function public.pop_notify_whatsapp();

drop trigger if exists trg_pop_notify_upd on public."SITE_CampaignRequests";
create trigger trg_pop_notify_upd
    after update on public."SITE_CampaignRequests"
    for each row execute function public.pop_notify_whatsapp();

-- 5. Setor inicial (desativado até escolher o grupo no seletor da UI)
insert into public."SITE_PopNotifyConfig" (sector)
values ('Marketing')
on conflict (sector) do nothing;
