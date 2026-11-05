// Yahoo Finance through the yahoo-finance2 package, the Node equivalent of
// QF's yfinance. Results are read loosely (validation off) and normalised here,
// so a field Yahoo renames becomes a missing value, not a crashed job.
import { finite, toDate } from './transform';

export interface Quote {
  symbol: string;
  quoteType: string;
  name: string | null;
  currency: string | null;
  price: number | null;
  changePct: number | null;
  marketCap: number | null;
  pe: number | null;
  /** Percent, e.g. 0.45 for 0.45%. */
  dividendYield: number | null;
  high52: number | null;
  low52: number | null;
  /** Last or next earnings dates Yahoo knows about. */
  earnings: Date[];
  time: Date | null;
}

export interface Profile {
  sector: string | null;
  industry: string | null;
  description: string;
}

export interface Bar {
  date: Date;
  close: number;
}

/** What the sync job needs from a price source. */
export interface MarketSource {
  quotes(symbols: string[]): Promise<Quote[]>;
  profile(symbol: string): Promise<Profile | null>;
  history(symbol: string, from: Date): Promise<Bar[]>;
}

/** The parts of a yahoo-finance2 instance this file uses. */
export interface YahooLike {
  quote(symbols: string[], options: object, moduleOptions: object): Promise<unknown>;
  quoteSummary(symbol: string, options: object, moduleOptions: object): Promise<unknown>;
  chart(symbol: string, options: object, moduleOptions: object): Promise<unknown>;
}

const LOOSE = { validateResult: false };
const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);

export function normalizeQuote(raw: unknown): Quote | null {
  const q = raw as Record<string, unknown> | null;
  const symbol = str(q?.symbol);
  if (!q || !symbol) return null;
  return {
    symbol,
    quoteType: str(q.quoteType) ?? 'NONE',
    name: str(q.longName) ?? str(q.shortName),
    currency: str(q.currency),
    price: finite(q.regularMarketPrice),
    changePct: finite(q.regularMarketChangePercent),
    marketCap: finite(q.marketCap),
    pe: finite(q.trailingPE),
    dividendYield: finite(q.dividendYield),
    high52: finite(q.fiftyTwoWeekHigh),
    low52: finite(q.fiftyTwoWeekLow),
    earnings: [q.earningsTimestamp, q.earningsTimestampStart, q.earningsTimestampEnd]
      .map(toDate)
      .filter((d): d is Date => d !== null),
    time: toDate(q.regularMarketTime),
  };
}

export function yahooSource(yf: YahooLike): MarketSource {
  return {
    async quotes(symbols) {
      const raw = await yf.quote(symbols, { return: 'array' }, LOOSE);
      return (Array.isArray(raw) ? raw : []).map(normalizeQuote).filter((q): q is Quote => q !== null);
    },

    async profile(symbol) {
      const raw = (await yf.quoteSummary(symbol, { modules: ['assetProfile'] }, LOOSE)) as {
        assetProfile?: Record<string, unknown>;
      } | null;
      const p = raw?.assetProfile;
      if (!p) return null;
      return { sector: str(p.sector), industry: str(p.industry), description: str(p.longBusinessSummary) ?? '' };
    },

    async history(symbol, from) {
      const raw = (await yf.chart(symbol, { period1: from, interval: '1d' }, LOOSE)) as { quotes?: unknown } | null;
      const bars = Array.isArray(raw?.quotes) ? (raw.quotes as Record<string, unknown>[]) : [];
      const out: Bar[] = [];
      for (const b of bars) {
        const date = toDate(b.date);
        const close = finite(b.close);
        if (date && close != null && close > 0) out.push({ date, close });
      }
      return out;
    },
  };
}
