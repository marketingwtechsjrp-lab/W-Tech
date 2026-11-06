-- Só o gerente confirma pagamento da Vacuum Pump (decisão do dono em 06/11/2026).
--
-- O vendedor lança pelo servidor, que grava a venda como aguardando. Por isso o passe da equipe
-- também não pode criar venda da campanha direto no banco, nem trazer uma venda de fora para ela.

drop trigger if exists site_vacuum_sale_guard on "SITE_Sales";
drop trigger if exists site_vacuum_sale_guard_insert on "SITE_Sales";
drop trigger if exists site_vacuum_sale_guard_update on "SITE_Sales";
drop trigger if exists site_vacuum_sale_guard_delete on "SITE_Sales";

create trigger site_vacuum_sale_guard_insert
  before insert on "SITE_Sales"
  for each row
  when (new.campaign = 'vacuum_pump_bf_2026')
  execute function public.site_vacuum_sale_guard();

create trigger site_vacuum_sale_guard_update
  before update on "SITE_Sales"
  for each row
  when (old.campaign = 'vacuum_pump_bf_2026' or new.campaign = 'vacuum_pump_bf_2026')
  execute function public.site_vacuum_sale_guard();

create trigger site_vacuum_sale_guard_delete
  before delete on "SITE_Sales"
  for each row
  when (old.campaign = 'vacuum_pump_bf_2026')
  execute function public.site_vacuum_sale_guard();
