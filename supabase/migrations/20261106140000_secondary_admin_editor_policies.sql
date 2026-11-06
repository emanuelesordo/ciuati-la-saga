create policy secondary_admin_select on public.secondary_characters
for select to authenticated using (((select auth.jwt())->'app_metadata'->>'role')='admin');
create policy secondary_admin_update on public.secondary_characters
for update to authenticated
using (((select auth.jwt())->'app_metadata'->>'role')='admin')
with check (((select auth.jwt())->'app_metadata'->>'role')='admin');