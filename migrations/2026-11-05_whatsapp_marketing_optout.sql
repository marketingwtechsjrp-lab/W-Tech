-- Pedido de saída das mensagens de marketing no número oficial.
-- Fica na conversa porque nem todo destinatário tem ficha em SITE_Leads.
alter table "SITE_WhatsAppCloudConversations"
  add column if not exists marketing_optout_at timestamptz;
