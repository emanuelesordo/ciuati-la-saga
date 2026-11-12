insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('narrator-dialogues','narrator-dialogues',false,15000000,array['application/json'])
on conflict (id) do update set public=false,file_size_limit=15000000,allowed_mime_types=array['application/json'];
create policy "Narrator archive admin read" on storage.objects for select to authenticated using (bucket_id='narrator-dialogues' and name='dialogues.json' and (select auth.jwt()->'app_metadata'->>'role')='admin');
create policy "Narrator archive admin insert" on storage.objects for insert to authenticated with check (bucket_id='narrator-dialogues' and name='dialogues.json' and (select auth.jwt()->'app_metadata'->>'role')='admin');
create policy "Narrator archive admin update" on storage.objects for update to authenticated using (bucket_id='narrator-dialogues' and name='dialogues.json' and (select auth.jwt()->'app_metadata'->>'role')='admin') with check (bucket_id='narrator-dialogues' and name='dialogues.json' and (select auth.jwt()->'app_metadata'->>'role')='admin');
create policy "Narrator archive admin delete" on storage.objects for delete to authenticated using (bucket_id='narrator-dialogues' and name='dialogues.json' and (select auth.jwt()->'app_metadata'->>'role')='admin');
