create or replace function public.saga_save_generated_secondary_dossier(p_proposal_id uuid,p_description text)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_proposal public.narrative_inputs%rowtype; v_slug text; v_count int;
begin
 if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
 select * into v_proposal from public.narrative_inputs where id=p_proposal_id and kind='character_proposal';
 if not found then raise exception 'Proposal not found'; end if;
 if v_proposal.author_id<>(select auth.uid()) and coalesce((select auth.jwt())->'app_metadata'->>'role','')<>'admin' then
   raise exception 'Not authorized';
 end if;
 if p_description is null or length(trim(p_description))<50 or length(p_description)>4000 then
   raise exception 'Description length invalid';
 end if;
 update public.secondary_characters
   set description=trim(p_description)
 where is_published=false and slug like '%-'||left(p_proposal_id::text,8)
   and lower(display_name)=lower(trim(v_proposal.proposal->>'name'));
 get diagnostics v_count=row_count;
 return v_count=1;
end; $$;
revoke all on function public.saga_save_generated_secondary_dossier(uuid,text) from public,anon;
grant execute on function public.saga_save_generated_secondary_dossier(uuid,text) to authenticated;