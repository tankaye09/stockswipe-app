// Checks saved state before the app uses it. Storage can hold anything: an old
// app version's shape, a half-written file, or values someone edited on a
// rooted or jailbroken phone. A bad value is dropped and its default is used,
// so one broken field can never crash the app on every launch.
import { BROKERS } from '../broker/brokers';
import type { Market, StockId } from '../data/types';
import { CAP_LABELS, ALL_SECTORS, ALL_THEMES } from '../feed/themes';
import { cleanLimits } from './rules';
import type { AppState, PaperTrade, Position } from './types';

type Saved = Partial<Omit<AppState, 'hydrated'>>;

const MARKETS: readonly Market[] = ['US', 'SGX'];
const SIDES = ['buy', 'sell', 'short', 'cover'] as const;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
/** e.g. "US:AAPL", "SGX:D05", "US:BRK.B". */
const STOCK_ID = /^(US|SGX):[A-Z0-9.-]{1,12}$/;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isDate = (v: unknown): v is string => typeof v === 'string' && ISO_DATE.test(v);
const oneOf =
  <T>(allowed: readonly T[]) =>
  (v: unknown): v is T =>
    allowed.includes(v as T);
const listOf =
  <T>(item: (v: unknown) => v is T, max = 1000) =>
  (v: unknown): v is T[] =>
    Array.isArray(v) && v.length <= max && v.every(item);

export const isStockId = (v: unknown): v is StockId => typeof v === 'string' && STOCK_ID.test(v);

const isPosition = (v: unknown): v is Position => isObj(v) && isStockId(v.id) && isNum(v.qty) && isNum(v.avgPrice);
const isTrade = (v: unknown): v is PaperTrade =>
  isObj(v) && isStockId(v.id) && oneOf(SIDES)(v.side) && isNum(v.qty) && isNum(v.price) && typeof v.at === 'string';

/** Limits are null, or an object holding only valid limit values. */
const isLimits = (v: unknown) =>
  v === null || (isObj(v) && Object.keys(v).length === Object.keys(cleanLimits(v)).length);

const CHECKS: { [K in keyof Saved]-?: (v: unknown) => boolean } = {
  onboarded: (v) => typeof v === 'boolean',
  firstOpen: isDate,
  interests: listOf(oneOf(ALL_THEMES)),
  markets: (v) => listOf(oneOf(MARKETS))(v) && v.length > 0,
  filters: (v) =>
    isObj(v) &&
    listOf(oneOf(ALL_SECTORS))(v.sectors) &&
    listOf(oneOf(Object.keys(CAP_LABELS)))(v.caps) &&
    listOf(oneOf(ALL_THEMES))(v.themes) &&
    (v.earningsWithinDays === null || isNum(v.earningsWithinDays)),
  swipeMode: oneOf(['save', 'trade']),
  broker: (v) => v === null || oneOf(BROKERS.map((b) => b.id))(v),
  watchlist: listOf(isStockId),
  seen: listOf(isStockId),
  swipesToday: (v) => isObj(v) && isDate(v.date) && isNum(v.count) && v.count >= 0,
  premium: (v) => typeof v === 'boolean',
  remoteLimits: isLimits,
  limitOverride: isLimits,
  paper: (v) => isObj(v) && isNum(v.cashUsd) && listOf(isPosition)(v.positions) && listOf(isTrade)(v.trades),
};

/** Parses saved JSON and keeps only the fields that have the right shape. */
export function parseSavedState(raw: string | null): Saved {
  if (!raw) return {};
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!isObj(data)) return {};
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(CHECKS) as (keyof Saved)[]) {
    if (key in data && CHECKS[key](data[key])) out[key] = data[key];
  }
  return out as Saved;
}

/** Reads a stock id from a route param, e.g. a deep link. Returns null when it isn't a valid id. */
export function parseStockIdParam(param: unknown): StockId | null {
  if (typeof param !== 'string') return null;
  let id: string;
  try {
    id = decodeURIComponent(param);
  } catch {
    return null; // Malformed escape such as "%E0%A4".
  }
  return isStockId(id) ? id : null;
}
