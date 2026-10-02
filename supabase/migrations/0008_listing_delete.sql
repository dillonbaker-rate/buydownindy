-- Agents can delete their own listings.
drop policy if exists listings_delete_own on public.listings;
create policy listings_delete_own on public.listings for delete using (agent_id = auth.uid());
