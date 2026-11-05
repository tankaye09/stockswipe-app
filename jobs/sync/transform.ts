// Pure rules that turn raw list, Yahoo and profile data into stock rows.
// Everything here is rule-based and explainable, like the feed.
import type { CapBucket, Market, Sector, Theme } from '../../src/data/types';

/** Sector names from Nasdaq and Yahoo, mapped onto the app's eight sectors. */
const SECTORS: Record<string, Sector> = {
  technology: 'Technology',
  telecommunications: 'Communication',
  'communication services': 'Communication',
  'health care': 'Healthcare',
  healthcare: 'Healthcare',
  finance: 'Financials',
  'financial services': 'Financials',
  'real estate': 'Real Estate',
  'consumer discretionary': 'Consumer',
  'consumer staples': 'Consumer',
  'consumer cyclical': 'Consumer',
  'consumer defensive': 'Consumer',
  industrials: 'Industrials',
  'basic materials': 'Industrials',
  energy: 'Energy',
  utilities: 'Energy',
};

export const mapSector = (raw: string | null | undefined): Sector | null =>
  SECTORS[(raw ?? '').trim().toLowerCase()] ?? null;

/** Size bucket from market cap in US dollars, matching the filter labels in src/feed/themes.ts. */
export function capBucket(marketCapUsd: number): CapBucket {
  if (marketCapUsd >= 200e9) return 'mega';
  if (marketCapUsd >= 10e9) return 'large';
  if (marketCapUsd >= 2e9) return 'mid';
  return 'small';
}

export interface ThemeInput {
  sector: Sector | null;
  industry: string | null;
  description: string;
  dividendYield: number | null;
}

/** Yield (percent) at which a stock is tagged as a dividend stock. */
export const DIVIDEND_THEME_YIELD = 3;

/** Interest tags from industry, description keywords and dividend yield. */
export function tagThemes({ sector, industry, description, dividendYield }: ThemeInput): Theme[] {
  const ind = (industry ?? '').toLowerCase();
  const desc = description.toLowerCase();
  const rules: [Theme, boolean][] = [
    ['ai', /artificial intelligence|machine learning|generative ai/.test(desc)],
    ['semiconductors', /semiconductor/.test(ind)],
    ['gaming', /electronic gaming|gambling|casino/.test(ind) || /video game/.test(desc)],
    ['coffee-food', /restaurant|food|beverage|confection|grocery|farm products/.test(ind)],
    ['clean-energy', /solar|renewable/.test(ind) || /renewable energy/.test(desc)],
    ['ev', /electric vehicle/.test(desc)],
    ['banking', /bank|credit services/.test(ind)],
    ['travel', /airline|travel|lodging|resort|hotel|cruise|airport/.test(ind)],
    ['health', sector === 'Healthcare'],
    ['shopping', /retail|department store|apparel|luxury|discount store|home improvement/.test(ind)],
    ['streaming', /streaming/.test(desc)],
    ['property', sector === 'Real Estate' || /reit/.test(ind)],
    ['dividends', (dividendYield ?? 0) >= DIVIDEND_THEME_YIELD],
  ];
  return rules.filter(([, hit]) => hit).map(([t]) => t);
}

const ABBREVIATION = /\b(Inc|Ltd|Co|Corp|Bhd|Pte|plc|No|St|Mr|Dr|Jr|S\.A|N\.V|U\.S|L\.P|Ltda)\.$/i;

/** Splits a description into sentences without breaking at 'Inc.' or 'Ltd.'. */
export function sentences(text: string): string[] {
  const parts = text.trim().split(/(?<=[.!?])\s+(?=[A-Z0-9"“])/);
  const out: string[] = [];
  for (const p of parts.filter(Boolean)) {
    if (out.length && ABBREVIATION.test(out[out.length - 1])) out[out.length - 1] += ` ${p}`;
    else out.push(p);
  }
  return out;
}

/** Cuts text at a word boundary and adds an ellipsis when it is too long. */
export function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > max / 2 ? cut.slice(0, space) : cut).replace(/[\s,;:.]+$/, '')}…`;
}

export const ONE_LINER_MAX = 160;
export const SUMMARY_MAX = 320;

/**
 * Card text from the company's own description: the first sentence as the
 * one-liner and the next few as the summary. Without a description, a plain
 * line naming the industry.
 */
export function cardText(
  name: string,
  industry: string | null,
  market: Market,
  description: string,
): { oneLiner: string; summary: string } {
  const [first, ...rest] = sentences(description);
  if (!first) {
    const where = market === 'US' ? 'a US-listed company' : 'listed on SGX';
    return {
      oneLiner: industry ? `${name} is in the ${industry.toLowerCase()} business, ${where}.` : `${name} is ${where}.`,
      summary: '',
    };
  }
  let summary = '';
  for (const s of rest) {
    if (summary && (summary + ' ' + s).length > SUMMARY_MAX) break;
    summary = summary ? `${summary} ${s}` : s;
  }
  return { oneLiner: clip(first, ONE_LINER_MAX), summary: clip(summary, SUMMARY_MAX) };
}

const ZONES: Record<Market, string> = { US: 'America/New_York', SGX: 'Asia/Singapore' };

/** The trading day of a moment on that market's own calendar, e.g. '2026-11-04'. */
export const tradingDay = (when: Date, market: Market) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONES[market],
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(when);

/** Yahoo sends dates as Date objects, epoch seconds or ISO strings depending on the call. */
export function toDate(v: unknown): Date | null {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (typeof v === 'number' && Number.isFinite(v)) return new Date(v < 1e12 ? v * 1000 : v);
  if (typeof v === 'string' && v) {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/** A finite number, or null. */
export const finite = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Rounds to a few decimals so stored values stay tidy. */
export const round = (v: number, places = 4) => Math.round(v * 10 ** places) / 10 ** places;
