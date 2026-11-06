-- Automatically create an unpublished dossier when a Ciuato proposes a new secondary character.
-- Publication remains an editorial decision; the proposal text never becomes public automatically.
create or replace function public.saga_create_secondary_draft()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  character_name text;
  draft_slug text;
  draft_description text;
begin
  if new.kind <> 'character_proposal' then return new; end if;
  character_name := left(trim(coalesce(new.proposal->>'name','')),120);
  if character_name = '' then return new; end if;
  if exists(select 1 from public.secondary_characters
      where lower(display_name)=lower(character_name)) then return new; end if;
  draft_slug := trim(both '-' from regexp_replace(lower(character_name),'[^a-z0-9]+','-','g'));
  if draft_slug = '' then draft_slug := 'personaggio'; end if;
  draft_slug := left(draft_slug,70)||'-'||left(new.id::text,8);
  draft_description := left(concat_ws(' · ',
    nullif(trim(coalesce(new.proposal->>'traits','')),''),
    nullif(trim(coalesce(new.proposal->>'origin','')),''),
    nullif(trim(coalesce(new.proposal->>'role','')),'')),1800);
  insert into public.secondary_characters(slug,display_name,description,narrative_role,is_published)
  values(draft_slug,character_name,draft_description,'supporto',false);
  return new;
end;
$$;
drop trigger if exists saga_create_secondary_draft on public.narrative_inputs;
create trigger saga_create_secondary_draft
after insert on public.narrative_inputs
for each row execute function public.saga_create_secondary_draft();
revoke all on function public.saga_create_secondary_draft() from public,anon,authenticated;

-- Only a linked member of the Cerchia or an administrator can submit contributions.
drop policy if exists narrative_inputs_author_insert on public.narrative_inputs;
create policy narrative_inputs_author_insert on public.narrative_inputs
for insert to authenticated
with check (
  author_id=(select auth.uid())
  and status='pending'
  and (
    ((select auth.jwt())->'app_metadata'->>'role')='admin'
    or exists(select 1 from public.characters c where c.owner_id=(select auth.uid()))
  )
  and (character_id is null or character_id in
    (select c.id from public.characters c where c.owner_id=(select auth.uid())))
  and (kind <> 'ideology' or target_character_id in (select c.id from public.characters c))
);