-- Uma página por modelo do catálogo de molas (29/09/2026).
--
-- A calculadora de /molas só mostra a mola depois de escolher modelo e peso, então
-- robô de busca e de IA nunca via o catálogo. Cada modelo ganha /molas/<model_slug>
-- com a tabela inteira em HTML (pages/SpringModel.tsx).
--
-- model_slug usa a mesma regra de slugDoModelo() em lib/springModels.ts: marca e
-- modelo, tudo que não é letra ou número vira hífen, em minúsculas.
alter table public."SITE_SpringRecommendations"
  add column if not exists model_slug text
  generated always as (btrim(lower(regexp_replace(brand || ' ' || model, '[^A-Za-z0-9]+', '-', 'g')), '-')) stored;

create index if not exists "SITE_SpringRecommendations_model_slug_idx"
  on public."SITE_SpringRecommendations" (model_slug);

-- Lista de modelos para o índice de /molas, o sitemap e os "outros anos" da página
-- (sem baixar as 10 mil linhas do catálogo). security_invoker: vale a RLS da tabela.
create or replace view public."SITE_SpringModels" with (security_invoker = true) as
  select brand, model, model_slug
  from public."SITE_SpringRecommendations"
  group by brand, model, model_slug;

grant select on public."SITE_SpringModels" to anon, authenticated, service_role;
