-- Stock data the app reads. Filled by the daily sync job (jobs/sync), which
-- writes with the service role key. The app only reads, with the public anon key.

create table public.stocks (
  id text primary key,                        -- 'US:AAPL', 'SGX:D05'
  market text not null check (market in ('US', 'SGX')),
  symbol text not null,
  yahoo_symbol text not null,                 -- 'AAPL', 'D05.SI', 'BRK-B'
  name text not null,
  currency text not null check (currency in ('USD', 'SGD')),
  sector text,                                -- null until known; the app skips these
  industry text,
  themes text[] not null default '{}',
  cap_bucket text not null default 'small' check (cap_bucket in ('mega', 'large', 'mid', 'small')),
  price numeric,                              -- null until the first quote; the app skips these
  change_pct numeric not null default 0,
  market_cap numeric not null default 0,      -- own currency
  pe_ratio numeric,
  dividend_yield numeric,                     -- percent, e.g. 2.1
  week52_high numeric,
  week52_low numeric,
  next_earnings date,
  one_liner text not null default '',         -- shown on cards
  summary text not null default '',           -- first few sentences, shown on cards
  description text not null default '',       -- full company description, detail screen only
  quote_date date,
  profile_updated_at timestamptz,
  history_backfilled_at timestamptz,
  updated_at timestamptz not null default now()
);

create index stocks_market_idx on public.stocks (market);

create table public.daily_prices (
  stock_id text not null references public.stocks (id) on delete cascade,
  date date not null,
  close numeric not null,
  primary key (stock_id, date)
);

-- Read-only for everyone else. The service role used by the sync job bypasses RLS.
alter table public.stocks enable row level security;
alter table public.daily_prices enable row level security;

create policy "Anyone can read stocks" on public.stocks for select to anon, authenticated using (true);
create policy "Anyone can read prices" on public.daily_prices for select to anon, authenticated using (true);

revoke insert, update, delete, truncate on public.stocks, public.daily_prices from anon, authenticated;
