-- Persist editable editorial outlines; only authenticated administrators may read or edit them.
create table if not exists public.saga_editorial_plan (
  episode_id text primary key check (episode_id ~ '^s[0-9]+e[0-9]{2}$'),
  title text not null check (char_length(trim(title)) between 3 and 180),
  focus text not null check (char_length(trim(focus)) between 20 and 3000),
  updated_at timestamptz not null default now()
);

alter table public.saga_editorial_plan enable row level security;
revoke all on public.saga_editorial_plan from anon, authenticated;
grant select, insert, update on public.saga_editorial_plan to authenticated;

create policy saga_editorial_plan_admin_read
on public.saga_editorial_plan for select to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy saga_editorial_plan_admin_insert
on public.saga_editorial_plan for insert to authenticated
with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy saga_editorial_plan_admin_update
on public.saga_editorial_plan for update to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
