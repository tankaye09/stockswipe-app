// Core data shapes. Everything the app shows comes through these types, so a
// real market data provider only has to fill them in.

/** Markets the app can show. US is live first; SGX is wired up with sample data. */
export type Market = 'US' | 'SGX';

export type Currency = 'USD' | 'SGD';

export type Sector =
  'Technology' | 'Consumer' | 'Financials' | 'Healthcare' | 'Energy' | 'Industrials' | 'Communication' | 'Real Estate';

/** Interests a user picks at onboarding. Stocks are tagged with the same ids. */
export type Theme =
  | 'ai'
  | 'gaming'
  | 'coffee-food'
  | 'clean-energy'
  | 'ev'
  | 'banking'
  | 'travel'
  | 'health'
  | 'shopping'
  | 'streaming'
  | 'semiconductors'
  | 'property'
  | 'dividends';

export type CapBucket = 'mega' | 'large' | 'mid' | 'small';

export interface PricePoint {
  /** ISO date, e.g. 2026-11-03 */
  date: string;
  close: number;
}

export type ChartRange = '1M' | '6M' | '1Y';

export interface KeyStats {
  /** Market capitalisation in the stock's own currency. */
  marketCap: number;
  peRatio: number | null;
  dividendYield: number | null; // percent, e.g. 2.1
  week52High: number;
  week52Low: number;
  /** Next earnings date (ISO), if known. */
  nextEarnings: string | null;
}

/** Plain-English explainer. Describes, never recommends. */
export interface Breakdown {
  oneLiner: string;
  whatTheyDo: string;
  howTheyMakeMoney: string;
  whyPeopleWatch: string;
  risksToKnow: string;
}

export interface NewsItem {
  headline: string;
  source: string;
  /** ISO date */
  date: string;
}

/** Light card data used by the feed. */
export interface StockSummary {
  symbol: string;
  market: Market;
  currency: Currency;
  name: string;
  sector: Sector;
  themes: Theme[];
  capBucket: CapBucket;
  price: number;
  changePct: number; // today's move, percent
  stats: KeyStats;
  breakdown: Breakdown;
  news: NewsItem[];
}

/** Stable id across markets, e.g. "US:AAPL" or "SGX:D05". */
export type StockId = `${Market}:${string}`;

export const stockId = (s: { market: Market; symbol: string }): StockId => `${s.market}:${s.symbol}`;

export const parseStockId = (id: string): { market: Market; symbol: string } => {
  const [market, symbol] = id.split(':');
  return { market: market as Market, symbol };
};
