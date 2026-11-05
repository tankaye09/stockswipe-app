# Stock database setup

The app's real stock data lives in a Supabase (hosted Postgres) project. The daily job in `jobs/sync` writes to it and
the app reads from it. Setup takes about 10 minutes and the free plan is enough for testing.

## 1. Create the project

1. Sign up at [supabase.com](https://supabase.com) and create a project. Pick the **Singapore** region and save the
   database password somewhere safe.
2. Open **SQL Editor**, paste the whole of `migrations/20261105000000_stocks.sql` and run it. This creates the `stocks`
   and `daily_prices` tables and makes them read-only for the app.

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

## Notes

- **Licensing:** Yahoo, Nasdaq and SGX data are fine for private testing, not for a public store release. Switch the
  job to a licensed vendor before launch.
- **Free plan limits:** 500 MB of database (about a year of prices for every stock fits) and the project pauses after a
  week with no activity. The daily sync should count as activity; if the project pauses, restore it from the dashboard. Move to Pro (US$25/month) before real users.
