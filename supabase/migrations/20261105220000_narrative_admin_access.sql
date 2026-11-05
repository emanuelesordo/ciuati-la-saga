-- Admin-only narrative data access with authenticated JWT; no service key needed.
grant select, insert on public.narrative_runs to authenticated;
create policy narrative_runs_admin_select on public.narrative_runs for select to authenticated using ((auth.jwt()->'app_metadata'->>'role')='admin');
create policy narrative_runs_admin_insert on public.narrative_runs for insert to authenticated with check ((auth.jwt()->'app_metadata'->>'role')='admin' and requested_by=(select auth.uid()));
grant select on public.saga_lore, public.saga_memory_facts to authenticated;
create policy saga_lore_admin_narrator_read on public.saga_lore for select to authenticated using ((auth.jwt()->'app_metadata'->>'role')='admin');
create policy saga_memory_admin_narrator_read on public.saga_memory_facts for select to authenticated using ((auth.jwt()->'app_metadata'->>'role')='admin');