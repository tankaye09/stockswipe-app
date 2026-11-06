-- Plain-English breakdowns written by Claude in the daily sync (jobs/sync/breakdown.ts).
-- Empty until written; breakdown_at says when. The app shows only stocks that
-- have one, or every stock in a market where none is written yet.
alter table public.stocks
  add column if not exists what_they_do text not null default '',
  add column if not exists how_they_make_money text not null default '',
  add column if not exists why_people_watch text not null default '',
  add column if not exists risks_to_know text not null default '',
  add column if not exists breakdown_at timestamptz;
