// The shape of the `stocks` and `daily_prices` tables (supabase/migrations), and
// how a row becomes the StockSummary the app shows. The sync job in jobs/sync
// writes these rows; SupabaseProvider reads them.
import type { CapBucket, Currency, Market, Sector, StockSummary, Theme } from '../types';
import { ALL_SECTORS, ALL_THEMES } from '../../feed/themes';

export interface StockRow {
  id: string;
  market: Market;
  symbol: string;
  yahoo_symbol: string;
  name: string;
  currency: Currency;
  sector: Sector | null;
  industry: string | null;
  themes: Theme[];
  cap_bucket: CapBucket;
  price: number | null;
  change_pct: number;
  market_cap: number;
  pe_ratio: number | null;
  dividend_yield: number | null;
  week52_high: number | null;
  week52_low: number | null;
  next_earnings: string | null;
  one_liner: string;
  summary: string;
  description: string;
  quote_date: string | null;
  profile_updated_at: string | null;
  history_backfilled_at: string | null;
  updated_at: string;
}

export interface PriceRow {
  stock_id: string;
  date: string;
  close: number;
}

/** Columns a feed card needs. The long description is left out to keep the list small. */
export const CARD_COLUMNS = [
  'id',
  'market',
  'symbol',
  'name',
  'currency',
  'sector',
  'themes',
  'cap_bucket',
  'price',
  'change_pct',
  'market_cap',
  'pe_ratio',
  'dividend_yield',
  'week52_high',
  'week52_low',
  'next_earnings',
  'one_liner',
  'summary',
] as const;

export type CardRow = Pick<StockRow, (typeof CARD_COLUMNS)[number]> & Partial<Pick<StockRow, 'description'>>;

/**
 * The REST API root for a Supabase project. Accepts the project URL with or
 * without the `/rest/v1` path, since the dashboard shows both.
 */
export const restRoot = (projectUrl: string) =>
  `${projectUrl
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/rest\/v1$/, '')}/rest/v1`;

const num = (v: unknown): number | null => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));

/**
 * Turns a database row into what the app shows. Real stocks only have the
 * company's own description so far, so the other breakdown parts stay empty
 * and the screens hide them.
 */
export function rowToSummary(row: CardRow): StockSummary {
  const price = num(row.price) ?? 0;
  return {
    symbol: row.symbol,
    market: row.market,
    currency: row.currency,
    name: row.name,
    sector: row.sector && ALL_SECTORS.includes(row.sector) ? row.sector : 'Industrials',
    themes: (row.themes ?? []).filter((t) => ALL_THEMES.includes(t)),
    capBucket: row.cap_bucket,
    price,
    changePct: num(row.change_pct) ?? 0,
    stats: {
      marketCap: num(row.market_cap) ?? 0,
      peRatio: num(row.pe_ratio),
      dividendYield: num(row.dividend_yield),
      week52High: num(row.week52_high) ?? price,
      week52Low: num(row.week52_low) ?? price,
      nextEarnings: row.next_earnings ?? null,
    },
    breakdown: {
      oneLiner: row.one_liner,
      whatTheyDo: row.description || row.summary,
      howTheyMakeMoney: '',
      whyPeopleWatch: '',
      risksToKnow: '',
    },
    news: [],
  };
}
