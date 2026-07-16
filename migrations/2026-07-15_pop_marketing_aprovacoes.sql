-- POP-MKT-001 — Pedidos de Campanha, Aprovações e Painel ao Vivo
-- Fase 1: intake formal (8.1), workflow de aprovação (etapa 5) com WhatsApp, timeline de eventos

create table if not exists "SITE_CampaignRequests" (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  objective text,
  requester_name text not null,
  requester_sector text not null default 'Marketing',
  requester_contact text,
  target_audience text,
  delivery_type text,
  context_refs text,
  desired_date date,
  urgency_reason text,
  budget numeric,
  cost_center text,
  approver_name text,
  priority text not null default 'Media' check (priority in ('Baixa','Media','Alta')),
  status text not null default 'Recebido' check (status in
    ('Recebido','Triagem','Planejamento','Producao','Aprovacao','Aprovado','Publicado','Concluido','Reprovado','Cancelado')),
  sla_due_at timestamptz,
  completed_at timestamptz,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_campreq_status  on "SITE_CampaignRequests"(status);
create index if not exists idx_campreq_created on "SITE_CampaignRequests"(created_at desc);

-- id numérico curto de propósito: vira o "#123" citado no grupo do WhatsApp
create table if not exists "SITE_ApprovalItems" (
  id bigint generated always as identity primary key,
  request_id uuid references "SITE_CampaignRequests"(id) on delete set null,
  title text not null,
  description text,
  media jsonb not null default '[]'::jsonb,
  status text not null default 'Rascunho' check (status in ('Rascunho','Enviado','Aprovado','Reprovado','Ajustes')),
  wa_instance text,
  wa_group_jid text,
  wa_message_ids jsonb not null default '[]'::jsonb,
  sent_at timestamptz,
  decided_at timestamptz,
  decided_by text,
  decision_note text,
  version int not null default 1,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_approval_status  on "SITE_ApprovalItems"(status);
create index if not exists idx_approval_created on "SITE_ApprovalItems"(created_at desc);

create table if not exists "SITE_ApprovalEvents" (
  id bigint generated always as identity primary key,
  item_id bigint references "SITE_ApprovalItems"(id) on delete cascade,
  request_id uuid references "SITE_CampaignRequests"(id) on delete cascade,
  event text not null,
  actor text,
  payload jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_apprev_item on "SITE_ApprovalEvents"(item_id);
create index if not exists idx_apprev_req  on "SITE_ApprovalEvents"(request_id);

-- paridade de grants com o restante do schema (hardening fino fica no backlog global)
grant all on "SITE_CampaignRequests", "SITE_ApprovalItems", "SITE_ApprovalEvents"
  to anon, authenticated, service_role;
grant usage, select on all sequences in schema public to anon, authenticated, service_role;
