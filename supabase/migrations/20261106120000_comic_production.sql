-- Admin-only comics production; drafts and reference photos remain private.
create table if not exists public.comic_supporting_characters (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (length(slug) between 2 and 90),
  display_name text not null check (length(display_name) between 2 and 120),
  description text not null default '',
  portrait_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.narrative_comic_panels (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.narrative_runs(id) on delete cascade,
  panel_number integer not null check (panel_number between 1 and 36),
  source_hash text not null,
  scene text not null,
  caption text not null default '',
  dialogue jsonb not null default '[]'::jsonb,
  cast_names jsonb not null default '[]'::jsonb,
  mentions jsonb not null default '[]'::jsonb,
  image_path text,
  status text not null default 'pending'
    check (status in ('pending','ready','error')),
  error_message text,
  updated_at timestamptz not null default now(),
  unique(run_id,panel_number)
);
create index if not exists narrative_comic_panels_run_idx
  on public.narrative_comic_panels(run_id,panel_number);
alter table public.comic_supporting_characters enable row level security;
alter table public.narrative_comic_panels enable row level security;
grant select,insert,update,delete on public.comic_supporting_characters to authenticated;
grant select,insert,update,delete on public.narrative_comic_panels to authenticated;
create policy comic_support_admin on public.comic_supporting_characters
 for all to authenticated
 using (((select auth.jwt())->'app_metadata'->>'role')='admin')
 with check (((select auth.jwt())->'app_metadata'->>'role')='admin');
create policy comic_panels_admin on public.narrative_comic_panels
 for all to authenticated
 using (((select auth.jwt())->'app_metadata'->>'role')='admin')
 with check (((select auth.jwt())->'app_metadata'->>'role')='admin');
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('comic-drafts','comic-drafts',false,6291456,ARRAY['image/jpeg','image/png','image/webp'])
 on conflict (id) do nothing;
create policy comic_drafts_admin_select on storage.objects
 for select to authenticated
 using (bucket_id='comic-drafts' and ((select auth.jwt())->'app_metadata'->>'role')='admin');
create policy comic_drafts_admin_insert on storage.objects
 for insert to authenticated
 with check (bucket_id='comic-drafts' and ((select auth.jwt())->'app_metadata'->>'role')='admin');
create policy comic_drafts_admin_update on storage.objects
 for update to authenticated
 using (bucket_id='comic-drafts' and ((select auth.jwt())->'app_metadata'->>'role')='admin')
 with check (bucket_id='comic-drafts' and ((select auth.jwt())->'app_metadata'->>'role')='admin');
create policy comic_drafts_admin_delete on storage.objects
 for delete to authenticated
 using (bucket_id='comic-drafts' and ((select auth.jwt())->'app_metadata'->>'role')='admin');
