-- Newer Supabase projects don't give the API roles access to new tables
-- automatically, so grant it explicitly. The app (anon) may only read; the
-- sync job (service_role) reads and writes.

grant usage on schema public to anon, authenticated, service_role;

grant select on public.stocks, public.daily_prices to anon, authenticated;
grant select, insert, update, delete on public.stocks, public.daily_prices to service_role;
