-- Aggiunge fatti concreti e ruoli al catalogo dei contributi.
alter table public.narrative_inputs drop constraint if exists narrative_inputs_kind_check;
alter table public.narrative_inputs add constraint narrative_inputs_kind_check check (kind in ('ideology','perception','relationship','skill','weakness','fact','story','character_proposal'));
comment on column public.narrative_inputs.kind is 'fact = ruolo, occupazione, incarico, abitudine o fatto concreto attribuito a un soggetto; distinto da percezione e abilita.';
