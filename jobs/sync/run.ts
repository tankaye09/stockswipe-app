// One sync run for one market:
//   1. download the ticker list (Nasdaq or SGX)
//   2. quote every ticker on Yahoo in batches (price, move, stats)
//   3. fetch company profiles (sector, industry, description) for a few hundred
//      stocks that have none or an old one
//   4. backfill a year of daily closes for a few hundred new stocks
//   5. have Claude write plain-English breakdowns for a few hundred stocks
//   6. save stocks and today's closes, drop delisted stocks and old prices
// Profiles and backfills are capped per run so Yahoo doesn't rate limit us;
// the whole list fills in over a few daily runs.
import type { Market } from '../../src/data/types';
import type { PriceRow, StockRow } from '../../src/data/live/rows';
import { applyBreakdown, needsBreakdown, writeBreakdowns, type BreakdownWriter } from './breakdown';
import { LIST_URLS, MIN_LISTINGS, PARSERS, type Listing } from './lists';
import type { StockStore } from './store';
import { capBucket, cardText, mapSector, round, tagThemes, tradingDay } from './transform';
import type { MarketSource, Quote } from './yahoo';

export interface SyncDeps {
  fetchJson(url: string): Promise<unknown>;
  source: MarketSource;
  store: StockStore;
  log(message: string): void;
  now(): Date;
  pause(ms: number): Promise<void>;
  /** Writes breakdowns; left out when there is no Anthropic key. */
  writer?: BreakdownWriter;
}

export interface SyncOptions {
  /** Company profiles fetched per run. */
  profileLimit: number;
  /** Stocks whose year of history is backfilled per run. */
  backfillLimit: number;
  /** Breakdowns written per run. */
  breakdownLimit: number;
}

export interface SyncResult {
  market: Market;
  listed: number;
  quoted: number;
  profiled: number;
  backfilled: number;
  written: number;
  saved: number;
  prices: number;
  removed: number;
}

export const QUOTE_BATCH = 200;
export const PROFILE_MAX_AGE_DAYS = 30;
export const HISTORY_DAYS = 370;
export const KEEP_PRICES_DAYS = 400;
/** Gap between one-by-one Yahoo calls, about 4 a second. */
export const CALL_GAP_MS = 250;
/** This many failures in a row means Yahoo is rate limiting us; stop that step for this run. */
export const MAX_FAILS_IN_A_ROW = 20;

const DAY_MS = 86_400_000;
const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const SHARE_TYPES = new Set(['EQUITY']);

/** A new row for a listing we have not seen before. */
export function newRow(l: Listing, nowIso: string): StockRow {
  return {
    id: `${l.market}:${l.symbol}`,
    market: l.market,
    symbol: l.symbol,
    yahoo_symbol: l.yahooSymbol,
    name: l.name,
    currency: l.market === 'US' ? 'USD' : 'SGD',
    sector: l.sector,
    industry: l.industry,
    themes: [],
    cap_bucket: 'small',
    price: null,
    change_pct: 0,
    market_cap: 0,
    pe_ratio: null,
    dividend_yield: null,
    week52_high: null,
    week52_low: null,
    next_earnings: null,
    one_liner: '',
    summary: '',
    description: '',
    what_they_do: '',
    how_they_make_money: '',
    why_people_watch: '',
    risks_to_know: '',
    breakdown_at: null,
    quote_date: null,
    profile_updated_at: null,
    history_backfilled_at: null,
    updated_at: nowIso,
  };
}

/** Copies a Yahoo quote onto a row. */
export function applyQuote(row: StockRow, q: Quote, now: Date): StockRow {
  const today = tradingDay(now, row.market);
  const next = q.earnings.map((d) => tradingDay(d, row.market)).filter((d) => d >= today);
  const dividend = q.dividendYield != null && q.dividendYield > 0 ? round(q.dividendYield, 2) : null;
  return {
    ...row,
    // Yahoo's long name is cleaner than the list's ("Apple Inc." not "Apple Inc. Common Stock").
    name: q.name ?? row.name,
    currency: q.currency === 'USD' || q.currency === 'SGD' ? q.currency : row.currency,
    price: q.price,
    change_pct: round(q.changePct ?? 0, 2),
    market_cap: q.marketCap ?? row.market_cap,
    pe_ratio: q.pe != null && q.pe > 0 ? round(q.pe, 2) : null,
    dividend_yield: dividend,
    week52_high: q.high52,
    week52_low: q.low52,
    next_earnings: next.sort()[0] ?? null,
    quote_date: q.time ? tradingDay(q.time, row.market) : today,
  };
}

/** Recomputes the rule-based fields (themes, size, card text) from the rest of the row. */
export function derive(row: StockRow, usdPerSgd: number): StockRow {
  const capUsd = row.currency === 'SGD' ? row.market_cap * usdPerSgd : row.market_cap;
  const { oneLiner, summary } = cardText(row.name, row.industry, row.market, row.description);
  return {
    ...row,
    cap_bucket: capBucket(capUsd),
    themes: tagThemes({
      sector: row.sector,
      industry: row.industry,
      description: row.description,
      dividendYield: row.dividend_yield,
    }),
    // Claude's one-liner, once written, beats the first sentence of the description.
    one_liner: row.breakdown_at ? row.one_liner : oneLiner,
    summary,
  };
}

/** Stocks that most need a profile: never fetched first, then the oldest. */
export function needsProfile(rows: StockRow[], now: Date, limit: number): StockRow[] {
  const cutoff = now.getTime() - PROFILE_MAX_AGE_DAYS * DAY_MS;
  return rows
    .filter((r) => !r.profile_updated_at || Date.parse(r.profile_updated_at) < cutoff)
    .sort((a, b) => (a.profile_updated_at ?? '').localeCompare(b.profile_updated_at ?? ''))
    .slice(0, limit);
}

/** Runs `task` on each item one at a time, stopping early if Yahoo keeps failing. */
async function oneByOne<T>(
  items: T[],
  task: (item: T) => Promise<void>,
  deps: SyncDeps,
  label: string,
): Promise<number> {
  let done = 0;
  let failsInARow = 0;
  for (const item of items) {
    try {
      await task(item);
      done += 1;
      failsInARow = 0;
    } catch (e) {
      failsInARow += 1;
      if (failsInARow >= MAX_FAILS_IN_A_ROW) {
        deps.log(`${label}: ${failsInARow} failures in a row (${String(e)}), stopping until the next run`);
        break;
      }
    }
    await deps.pause(CALL_GAP_MS);
  }
  return done;
}

export async function syncMarket(market: Market, deps: SyncDeps, opts: SyncOptions): Promise<SyncResult> {
  const now = deps.now();
  const nowIso = now.toISOString();

  // 1. Ticker list. A short list means a broken download: stop before deleting anything.
  const listings = PARSERS[market](await deps.fetchJson(LIST_URLS[market]));
  if (listings.length < MIN_LISTINGS[market])
    throw new Error(`${market} list has only ${listings.length} stocks (expected ${MIN_LISTINGS[market]}+)`);
  const existing = new Map((await deps.store.listStocks(market)).map((r) => [r.id, r]));
  deps.log(`${market}: ${listings.length} listed, ${existing.size} in the database`);

  // 2. Quotes in batches. Only shares (not funds, warrants or certificates) are kept.
  const quotes = new Map<string, Quote>();
  for (let i = 0; i < listings.length; i += QUOTE_BATCH) {
    const batch = listings.slice(i, i + QUOTE_BATCH).map((l) => l.yahooSymbol);
    try {
      for (const q of await deps.source.quotes(batch))
        if (SHARE_TYPES.has(q.quoteType) && q.price != null && q.price > 0) quotes.set(q.symbol, q);
    } catch (e) {
      deps.log(`${market}: quote batch ${i / QUOTE_BATCH + 1} failed: ${String(e)}`);
    }
  }
  let usdPerSgd = 0.75;
  if (market === 'SGX') {
    const [fx] = await deps.source.quotes(['SGDUSD=X']).catch(() => []);
    if (fx?.price) usdPerSgd = fx.price;
  }

  // Rows to save: every listing with a share quote today. A listing Yahoo didn't
  // quote this time keeps its saved row untouched.
  const rows = new Map<string, StockRow>();
  for (const l of listings) {
    const q = quotes.get(l.yahooSymbol);
    if (!q) continue;
    const id = `${l.market}:${l.symbol}`;
    const base = existing.get(id) ?? newRow(l, nowIso);
    rows.set(id, applyQuote({ ...base, sector: base.sector ?? l.sector, updated_at: nowIso }, q, now));
  }

  // 3. Company profiles.
  const profiled = await oneByOne(
    needsProfile([...rows.values()], now, opts.profileLimit),
    async (row) => {
      const p = await deps.source.profile(row.yahoo_symbol);
      rows.set(row.id, {
        ...row,
        sector: mapSector(p?.sector) ?? row.sector,
        industry: p?.industry ?? row.industry,
        description: p?.description || row.description,
        profile_updated_at: nowIso,
      });
    },
    deps,
    `${market} profiles`,
  );

  // 4. A year of history for stocks that don't have it yet.
  const prices: PriceRow[] = [];
  const from = new Date(now.getTime() - HISTORY_DAYS * DAY_MS);
  const backfilled = await oneByOne(
    [...rows.values()].filter((r) => !r.history_backfilled_at).slice(0, opts.backfillLimit),
    async (row) => {
      const bars = await deps.source.history(row.yahoo_symbol, from);
      for (const b of bars)
        prices.push({ stock_id: row.id, date: tradingDay(b.date, market), close: round(b.close, 4) });
      rows.set(row.id, { ...row, history_backfilled_at: nowIso });
    },
    deps,
    `${market} history`,
  );

  // 5. Breakdowns, for stocks that have a description by now.
  const written = deps.writer
    ? await writeBreakdowns(
        needsBreakdown([...rows.values()], opts.breakdownLimit),
        deps.writer,
        (row, b) => rows.set(row.id, applyBreakdown(rows.get(row.id)!, b, nowIso)),
        deps.log,
      )
    : 0;

  // 6. Save. Today's close goes in for every quoted stock; it replaces a
  // backfilled bar for the same day.
  const saved = [...rows.values()].map((r) => derive(r, usdPerSgd));
  // Every saved row was built from a quote above, so it has a price and a quote date.
  for (const r of saved) prices.push({ stock_id: r.id, date: r.quote_date!, close: r.price! });
  const uniquePrices = [...new Map(prices.map((p) => [`${p.stock_id}|${p.date}`, p])).values()];
  await deps.store.upsertStocks(saved);
  await deps.store.upsertPrices(uniquePrices);

  const listed = new Set(listings.map((l) => `${l.market}:${l.symbol}`));
  const removed = [...existing.keys()].filter((id) => !listed.has(id));
  if (removed.length) await deps.store.deleteStocks(removed);
  await deps.store.deletePricesBefore(isoDay(new Date(now.getTime() - KEEP_PRICES_DAYS * DAY_MS)));

  const result: SyncResult = {
    market,
    listed: listings.length,
    quoted: quotes.size,
    profiled,
    backfilled,
    written,
    saved: saved.length,
    prices: uniquePrices.length,
    removed: removed.length,
  };
  deps.log(`${market}: ${JSON.stringify(result)}`);
  return result;
}
