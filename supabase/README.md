# Stock database setup

The app's real stock data lives in a Supabase (hosted Postgres) project. The daily job in `jobs/sync` writes to it and
the app reads from it. Setup takes about 10 minutes and the free plan is enough for testing.

## 1. Create the project

1. Sign up at [supabase.com](https://supabase.com) and create a project. Pick the **Singapore** region and save the
   database password somewhere safe.
2. Open **SQL Editor** and run each file in `migrations/` in name order (paste the whole file, then **Run**). The first
   creates the `stocks` and `daily_prices` tables and makes them read-only for the app; the second gives the app and
   the sync job access to them.

## 2. Add the keys

From **Project Settings → API**, you need three values:

| Value              | Where it goes                                                                | Secret?                                                                       |
| ------------------ | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Project URL        | GitHub secret `SUPABASE_URL`, and `EXPO_PUBLIC_SUPABASE_URL` in `.env` / EAS | No                                                                            |
| `anon` public key  | `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `.env` / EAS                              | No, it can only read                                                          |
| `service_role` key | GitHub secret `SUPABASE_SERVICE_ROLE_KEY` only                               | **Yes.** It can write and delete. Never put it in the app, `.env` or the repo |

GitHub secrets: repo **Settings → Secrets and variables → Actions → New repository secret**.

## 3. Fill the database

Run **Actions → Sync stock data → Run workflow** with market `all`. The first run loads every stock with its price and
fetches profiles and price history for 600 stocks per market. For a faster start, raise both limits to 2000 for the
first few runs. After that it runs on its own: US at 7am SGT (Tue to Sat) and SGX at 7pm SGT (Mon to Fri).

To run it from your own computer instead (for example if Yahoo blocks GitHub's servers):

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run sync -- US
```

## 4. Turn on live data in the app

In `.env` (or the EAS build profile) set:

```
EXPO_PUBLIC_DATA_SOURCE=live
EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

The feed only shows stocks that have a price and a sector, so it grows as profiles fill in.

## 5. Live data on your phone without a computer

Add the anon key as a third GitHub secret, `SUPABASE_ANON_KEY`. PR previews (`preview.yml`) and the `main` update
published after every merge (`update-main.yml`) then use live data. Open them in the Swipe development build: scan the
QR code on the PR or in the "Update main" run summary, or in the app's launcher go to Extensions and pick the `main`
branch.

## 6. Plain-English breakdowns written by Claude

Without this step, real stocks only show the company's own description. To have Claude write the "What they do", "How
they make money", "Why people watch" and "Risks to know" sections:

1. Run `migrations/20261106000000_breakdowns.sql` in the SQL Editor **before** merging the app change that reads these
   columns (the app and the job both expect them).
2. Create an API key at [platform.claude.com](https://platform.claude.com) → **API keys**, add some credit under
   **Billing**, and save the key as the GitHub secret `ANTHROPIC_API_KEY`. It stays in GitHub only, never in the app.
3. The daily sync then writes up to 300 breakdowns a run, biggest companies first, and saves them. Each stock is
   written once. Raise `breakdown_limit` on a manual run to go faster.

The model defaults to Claude Opus 5.5 (`jobs/sync/breakdown.ts`). To use another one, add the repository **variable**
(not secret) `SYNC_BREAKDOWN_MODEL`, for example `claude-haiku-5-5`, which costs far less. While a market has any
written breakdowns, the feed only shows its stocks that have one.

## Notes

- **Licensing:** Yahoo, Nasdaq and SGX data are fine for private testing, not for a public store release. Switch the
  job to a licensed vendor before launch.
- **Free plan limits:** 500 MB of database (about a year of prices for every stock fits) and the project pauses after a
  week with no activity. The daily sync should count as activity; if the project pauses, restore it from the dashboard. Move to Pro (US$25/month) before real users.
