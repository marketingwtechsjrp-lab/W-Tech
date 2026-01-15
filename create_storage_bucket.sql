-- Create the bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('site-assets', 'site-assets', true)
on conflict (id) do nothing;

-- Safely drop existing policies for this bucket if they exist to avoid conflicts
-- We wrap in a DO block to handle cases where policies might not exist or be owned by others
do $$
begin
  drop policy if exists "Public Access" on storage.objects;
  drop policy if exists "Authenticated Upload" on storage.objects;
  drop policy if exists "Authenticated Update" on storage.objects;
  drop policy if exists "Authenticated Delete" on storage.objects;
exception
  when others then
    raise notice 'Could not drop policies, skipping...';
end $$;

-- Create policies (These usually require 'postgres' or 'service_role' privileges, 
-- but in Supabase SQL Editor this should work for the project owner)

-- 1. Allow Public Read Access
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'site-assets' );

-- 2. Allow Authenticated Users to Upload
create policy "Authenticated Upload"
  on storage.objects for insert
  with check ( bucket_id = 'site-assets' and auth.role() = 'authenticated' );

-- 3. Allow Authenticated Users to Update
create policy "Authenticated Update"
  on storage.objects for update
  using ( bucket_id = 'site-assets' and auth.role() = 'authenticated' );

-- 4. Allow Authenticated Users to Delete
create policy "Authenticated Delete"
  on storage.objects for delete
  using ( bucket_id = 'site-assets' and auth.role() = 'authenticated' );
