-- Motore narrante: bozze e contributi. Nessuna pubblicazione automatica.
create table if not exists public.narrative_inputs (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references auth.users(id) on delete set null,
  character_id uuid references public.characters(id) on delete set null,
  content text not null check (char_length(content) between 10 and 6000),
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  created_at timestamptz not null default now()
);
create table if not exists public.narrative_runs (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid references auth.users(id) on delete set null,
  input_id uuid references public.narrative_inputs(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','approved','rejected')),
  title text not null,
  summary text not null,
  body text not null,
  model_name text not null,
  continuity_notes jsonb not null default '[]'::jsonb,
  context_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists narrative_runs_created_at_idx on public.narrative_runs(created_at desc);
create index if not exists narrative_inputs_status_idx on public.narrative_inputs(status);
alter table public.narrative_inputs enable row level security;
alter table public.narrative_runs enable row level security;
revoke all on public.narrative_inputs from anon,authenticated;
revoke all on public.narrative_runs from anon,authenticated;
grant select,insert,update,delete on public.narrative_inputs to service_role;
grant select,insert,update,delete on public.narrative_runs to service_role;
-- All access is mediated by server endpoints that verify admin privileges.
