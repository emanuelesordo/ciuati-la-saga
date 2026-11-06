drop policy if exists narrative_inputs_author_insert on public.narrative_inputs;
create policy narrative_inputs_author_insert on public.narrative_inputs
for insert to authenticated with check (
 author_id = (select auth.uid()) and status='pending'
 and (
   ((select auth.jwt())->'app_metadata'->>'role')='admin'
   or exists (
     select 1 from public.characters c
     where c.slug=((select auth.jwt())->'app_metadata'->>'character_slug')
       and c.is_published=true
   )
 )
 and (
   character_id is null
   or exists (
     select 1 from public.characters c
     where c.id=character_id and (
       c.owner_id=(select auth.uid())
       or c.slug=((select auth.jwt())->'app_metadata'->>'character_slug')
     )
   )
 )
 and (kind<>'ideology' or target_character_id in (select id from public.characters))
);