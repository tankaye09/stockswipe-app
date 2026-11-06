// Entry point for the daily sync: `npx tsx jobs/sync/main.ts US` (or SGX, or all).
// Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (GitHub secrets in CI).
// With ANTHROPIC_API_KEY set it also writes stock breakdowns with Claude.
import Anthropic from '@anthropic-ai/sdk';
import YahooFinance from 'yahoo-finance2';
import type { Market } from '../../src/data/types';
import { claudeWriter, DEFAULT_MODEL } from './breakdown';
import { syncMarket, type SyncDeps, type SyncResult } from './run';
import { supabaseStore } from './store';
import { yahooSource, type YahooLike } from './yahoo';

// api.nasdaq.com rejects requests without a browser-like agent (same as QF).
export const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';

const count = (raw: string | undefined, fallback: number) => {
  const n = Number(raw);
  return raw && Number.isInteger(n) && n >= 0 ? n : fallback;
};

export function marketsFrom(arg: string | undefined): Market[] {
  const a = (arg ?? 'all').toUpperCase();
  if (a === 'ALL') return ['US', 'SGX'];
  if (a === 'US' || a === 'SGX') return [a];
  throw new Error(`Unknown market "${arg}". Use US, SGX or all.`);
}

export async function fetchJson(url: string, fetchFn: typeof fetch = fetch): Promise<unknown> {
  const res = await fetchFn(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`GET ${url} failed (${res.status})`);
  return res.json();
}

export async function main(
  argv: string[],
  env: Record<string, string | undefined>,
  makeYahoo: () => Promise<YahooLike>,
  log: (m: string) => void = console.log,
): Promise<SyncResult[]> {
  const markets = marketsFrom(argv[0]);
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');

  const deps: SyncDeps = {
    fetchJson: (u) => fetchJson(u),
    source: yahooSource(await makeYahoo()),
    store: supabaseStore(url, key),
    log,
    now: () => new Date(),
    pause: (ms) => new Promise((r) => setTimeout(r, ms)),
    writer: env.ANTHROPIC_API_KEY
      ? claudeWriter(new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }), env.SYNC_BREAKDOWN_MODEL || DEFAULT_MODEL)
      : undefined,
  };
  const opts = {
    profileLimit: count(env.SYNC_PROFILE_LIMIT, 600),
    backfillLimit: count(env.SYNC_BACKFILL_LIMIT, 600),
    breakdownLimit: count(env.SYNC_BREAKDOWN_LIMIT, 300),
  };
  const results: SyncResult[] = [];
  for (const m of markets) results.push(await syncMarket(m, deps, opts));
  return results;
}

/** The real Yahoo client. Tests pass a fake instead. */
export async function loadYahoo(): Promise<YahooLike> {
  return new YahooFinance({ suppressNotices: ['yahooSurvey'] }) as unknown as YahooLike;
}

/* istanbul ignore next -- runs only from the command line */
if (require.main === module) {
  main(process.argv.slice(2), process.env, loadYahoo).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
