-- Forcefully create the bucket
insert into storage.buckets (id, name, public) 
values ('site-assets', 'site-assets', true) 
on conflict (id) do nothing;

-- Create ultra-permissive policies with unique names to avoid conflicts with previous failed attempts
-- We allow INSERT for anyone (authenticated or not) for now to unblock the upload. 
-- You can restrict this later if needed.

create policy "site_assets_insert_policy_v2" 
on storage.objects for insert 
with check ( bucket_id = 'site-assets' );

create policy "site_assets_select_policy_v2" 
on storage.objects for select 
using ( bucket_id = 'site-assets' );

create policy "site_assets_update_policy_v2" 
on storage.objects for update 
using ( bucket_id = 'site-assets' );

create policy "site_assets_delete_policy_v2" 
on storage.objects for delete 
using ( bucket_id = 'site-assets' );
