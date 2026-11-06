-- Venda da Vacuum Pump: vendedor não altera, só o gerente (pedido do dono em 06/11/2026).
--
-- A tela geral de Pedidos grava em SITE_Sales direto do navegador, com o passe da equipe, e a
-- política "Equipe gerencia vendas" libera tudo para `authenticated`. Por isso a trava fica aqui
-- e não só na tela. Servidor e webhooks usam service_role e não passam por ela.

-- Atendente continua lançando venda nova, mas perde editar, marcar como pago e cancelar.
update "SITE_Users"
   set permissions = (permissions - 'campaign_sales_manage') || '{"campaign_sales_launch": true}'::jsonb
 where permissions->>'campaign_sales_manage' = 'true'
   and role_id = (select id from "SITE_Roles" where name = 'Atendente');

create or replace function public.site_vacuum_sale_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_perms jsonb;
begin
  if auth.role() <> 'authenticated' then
    return coalesce(new, old);
  end if;

  -- Mesma conta de api/_auth.ts: a permissão do usuário vence a do papel.
  select coalesce(r.permissions, '{}'::jsonb) || coalesce(u.permissions, '{}'::jsonb)
    into v_perms
    from "SITE_Users" u
    left join "SITE_Roles" r on r.id = u.role_id
   where u.id = auth.uid()
     and u.status = 'Active';

  if v_perms->>'admin_access' = 'true' or v_perms->>'campaign_sales_manage' = 'true' then
    return coalesce(new, old);
  end if;

  raise exception 'Somente o gerente pode alterar vendas da promoção.' using errcode = '42501';
end;
$$;

drop trigger if exists site_vacuum_sale_guard on "SITE_Sales";
create trigger site_vacuum_sale_guard
  before update or delete on "SITE_Sales"
  for each row
  when (old.campaign = 'vacuum_pump_bf_2026')
  execute function public.site_vacuum_sale_guard();
