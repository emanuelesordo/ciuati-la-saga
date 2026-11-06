-- Riconosce prospettive ideologiche anche da parte degli altri membri autenticati.
-- Il contributo conserva l'autore e deve riguardare un personaggio esistente.
alter policy narrative_inputs_author_insert on public.narrative_inputs
with check (
  author_id = (select auth.uid())
  and status = 'pending'
  and (character_id is null or character_id in
       (select id from public.characters where owner_id = (select auth.uid())))
  and (kind <> 'ideology' or target_character_id in
       (select id from public.characters))
);