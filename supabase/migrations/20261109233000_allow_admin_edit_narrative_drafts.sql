-- Allow authenticated administrators to edit proposed episodes while still drafts.
-- Published/approved/rejected runs remain immutable through this policy.
grant update (title, summary, body) on public.narrative_runs to authenticated;

create policy narrative_runs_admin_update_draft_content
on public.narrative_runs
for update to authenticated
using (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  and status = 'draft'
)
with check (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  and status = 'draft'
);
