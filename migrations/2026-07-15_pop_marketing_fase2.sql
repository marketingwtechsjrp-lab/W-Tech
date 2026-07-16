-- POP-MKT-001 — Fase 2: Planejamento de Tráfego (8.6), Reuniões (8.7),
-- Pós-Campanha (8.8) e base p/ alerta de ocupação de turmas (8.4)

create table if not exists "SITE_TrafficPlans" (
  id uuid primary key default gen_random_uuid(),
  month date not null unique,                    -- primeiro dia do mês
  status text not null default 'Rascunho' check (status in ('Rascunho','Publicado')),
  notes text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists "SITE_TrafficPlanItems" (
  id bigint generated always as identity primary key,
  plan_id uuid not null references "SITE_TrafficPlans"(id) on delete cascade,
  ad_name text not null,
  campaign_name text,
  channel text not null default 'Meta' check (channel in ('Meta','Google','TikTok','Outro')),
  audience text,
  region text,
  budget numeric not null default 0,
  expected_result text,
  actual_result text,                            -- preenchido no fechamento do mês
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_tpi_plan on "SITE_TrafficPlanItems"(plan_id);

create table if not exists "SITE_MeetingNotes" (
  id uuid primary key default gen_random_uuid(),
  meeting_date date not null default current_date,
  with_whom text not null default 'Diretoria',   -- Diretoria | Gerencia Comercial | Outro
  participants text,
  summary text not null,
  decisions text,                                -- decisões / novos prazos / responsáveis
  shared_at timestamptz,                         -- quando foi compartilhado com o time
  created_by text,
  created_at timestamptz not null default now()
);
create index if not exists idx_meeting_date on "SITE_MeetingNotes"(meeting_date desc);

create table if not exists "SITE_CampaignResults" (
  request_id uuid primary key references "SITE_CampaignRequests"(id) on delete cascade,
  invested numeric,
  leads int,
  sales int,
  revenue numeric,
  reach bigint,
  metrics jsonb not null default '{}'::jsonb,    -- canais extras (organico/pago/email…)
  compared_to_goal text,                          -- resultado vs meta do pedido
  learnings text,                                 -- aprendizados p/ próxima campanha
  shared_at timestamptz,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- meta definida no pedido (8.8 compara resultado contra ela)
alter table "SITE_CampaignRequests" add column if not exists expected_result text;

grant all on "SITE_TrafficPlans","SITE_TrafficPlanItems","SITE_MeetingNotes","SITE_CampaignResults"
  to anon, authenticated, service_role;
grant usage, select on all sequences in schema public to anon, authenticated, service_role;
