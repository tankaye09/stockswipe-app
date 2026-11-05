// Ticker lists for each market, the same sources the QF screener uses
// (tankaye09/QF universe.py): the Nasdaq screener for all US listings and the
// SGX securities feed for Singapore.
import type { Market, Sector } from '../../src/data/types';
import { mapSector } from './transform';

export interface Listing {
  market: Market;
  /** Symbol shown in the app, e.g. 'BRK.B' or 'D05'. */
  symbol: string;
  /** Symbol Yahoo Finance knows, e.g. 'BRK-B' or 'D05.SI'. */
  yahooSymbol: string;
  name: string;
  sector: Sector | null;
  industry: string | null;
}

export const LIST_URLS: Record<Market, string> = {
  US: 'https://api.nasdaq.com/api/screener/stocks?tableonly=true&limit=25&download=true',
  SGX: 'https://api.sgx.com/securities/v1.1?excludetypes=bonds&params=nc%2Cn%2Ccn%2Ctype',
};

/**
 * A good download is never anywhere near this small (about 7,000 US and 1,280
 * SGX rows before filtering, Aug 2026). A smaller list means a broken download,
 * and the job stops rather than deleting stocks.
 */
export const MIN_LISTINGS: Record<Market, number> = { US: 4000, SGX: 300 };

// Warrants, rights, units, preferred shares and notes are not company shares.
const NOT_SHARES = /\b(warrants?|rights?|units?|preferred|preference|notes due|debentures?)\b/i;
const NAME_SUFFIX =
  /\s+(?:Class [A-Z] )?(?:Common Stock|Common Shares?|Ordinary Shares?|American Depositary Shares?|Subordinate Voting Shares?|Shares of Beneficial Interest)\b.*$/i;

/** 'Apple Inc. Common Stock' -> 'Apple Inc.' */
export const cleanName = (name: string) => name.replace(NAME_SUFFIX, '').trim();

const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/** Nasdaq screener JSON -> US company shares. */
export function parseNasdaq(json: unknown): Listing[] {
  const rows = (json as { data?: { rows?: unknown } })?.data?.rows;
  if (!Array.isArray(rows)) throw new Error('Nasdaq list: no data.rows in the response');
  const out: Listing[] = [];
  for (const r of rows as Record<string, unknown>[]) {
    const raw = text(r.symbol).toUpperCase();
    const name = text(r.name);
    const industry = text(r.industry);
    // Plain tickers and share classes like BRK/B; skips test issues and odd codes.
    if (!/^[A-Z]{1,5}(\/[A-Z])?$/.test(raw) || !name) continue;
    if (NOT_SHARES.test(name) || industry === 'Blank Checks') continue;
    out.push({
      market: 'US',
      symbol: raw.replace('/', '.'),
      yahooSymbol: raw.replace('/', '-'),
      name: cleanName(name),
      sector: mapSector(text(r.sector)),
      industry: industry || null,
    });
  }
  return out;
}

// SGX lists warrants and daily leverage certificates alongside shares.
const SGX_SKIP_TYPES = /warrant|dlc|leverage|structured|bond|etf|certificate/i;

/** SGX securities JSON -> SGX listings. Yahoo's quote type later drops anything that isn't a share. */
export function parseSgx(json: unknown): Listing[] {
  const rows = (json as { data?: { prices?: unknown } })?.data?.prices;
  if (!Array.isArray(rows)) throw new Error('SGX list: no data.prices in the response');
  const out: Listing[] = [];
  for (const r of rows as Record<string, unknown>[]) {
    const code = text(r.nc).toUpperCase();
    const name = text(r.n);
    if (!code || !name || SGX_SKIP_TYPES.test(text(r.type))) continue;
    out.push({ market: 'SGX', symbol: code, yahooSymbol: `${code}.SI`, name, sector: null, industry: null });
  }
  return out;
}

export const PARSERS: Record<Market, (json: unknown) => Listing[]> = { US: parseNasdaq, SGX: parseSgx };
