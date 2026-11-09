-- Only authenticated administrators can permanently delete rejected narrative drafts.
create policy narrative_runs_admin_delete_rejected on public.narrative_runs
for delete to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' and status = 'rejected');
