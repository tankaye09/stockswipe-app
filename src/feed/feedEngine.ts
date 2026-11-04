// Rule-based feed. Each batch of 10 cards is about 4 from the user's interests,
// 3 in the news, and 3 wildcards, and every card carries a plain reason for
// being shown. No scoring of "good" or "bad" stocks: this is discovery, not advice.
import {
  stockId,
  type CapBucket,
  type Market,
  type Sector,
  type StockId,
  type StockSummary,
  type Theme,
} from '../data/types';
import { THEME_LABELS } from './themes';

export const BATCH_SIZE = 10;
export const MIX = { liked: 4, news: 3, wildcard: 3 } as const;
/** Order of buckets inside one batch, so similar cards don't bunch up. */
const PATTERN: Bucket[] = [
  'liked',
  'news',
  'liked',
  'wildcard',
  'liked',
  'news',
  'wildcard',
  'liked',
  'news',
  'wildcard',
];

export type Bucket = keyof typeof MIX;

export interface FeedFilters {
  sectors: Sector[]; // empty = any
  caps: CapBucket[]; // empty = any
  themes: Theme[]; // empty = any
  earningsWithinDays: number | null; // null = don't filter
}

export const NO_FILTERS: FeedFilters = { sectors: [], caps: [], themes: [], earningsWithinDays: null };

export interface FeedInput {
  universe: StockSummary[];
  markets: Market[];
  interests: Theme[];
  /** Stocks the user saved, used to learn liked sectors. */
  saved: StockSummary[];
  /** Stocks already shown recently, skipped where possible. */
  seen: Set<StockId>;
  filters: FeedFilters;
  /** Inject for tests. Defaults to Math.random. */
  random?: () => number;
  /** Inject for tests. Defaults to now. */
  today?: Date;
}

export interface FeedItem {
  id: StockId;
  stock: StockSummary;
  bucket: Bucket;
  /** Why this card appeared, shown on the card. */
  reason: string;
}

const NEWS_MOVE_PCT = 3;

const daysUntil = (iso: string, today: Date) =>
  Math.round((new Date(iso + 'T00:00:00').getTime() - new Date(today.toDateString()).getTime()) / 86400000);

export function passesFilters(s: StockSummary, f: FeedFilters, markets: Market[], today: Date): boolean {
  if (!markets.includes(s.market)) return false;
  if (f.sectors.length && !f.sectors.includes(s.sector)) return false;
  if (f.caps.length && !f.caps.includes(s.capBucket)) return false;
  if (f.themes.length && !s.themes.some((t) => f.themes.includes(t))) return false;
  if (f.earningsWithinDays != null) {
    const e = s.stats.nextEarnings;
    if (!e) return false;
    const d = daysUntil(e, today);
    if (d < 0 || d > f.earningsWithinDays) return false;
  }
  return true;
}

function likedReason(s: StockSummary, interests: Theme[], savedSectors: Map<Sector, string>): string | null {
  const theme = s.themes.find((t) => interests.includes(t));
  if (theme) return `Because you picked ${THEME_LABELS[theme]}`;
  const savedSymbol = savedSectors.get(s.sector);
  if (savedSymbol) return `Because you saved ${savedSymbol} (${s.sector})`;
  return null;
}

function newsReason(s: StockSummary): string | null {
  if (s.news.length) return `In the news: ${s.news[0].headline}`;
  if (Math.abs(s.changePct) >= NEWS_MOVE_PCT)
    return `Moving today: ${s.changePct > 0 ? '+' : ''}${s.changePct.toFixed(1)}%`;
  return null;
}

function shuffle<T>(arr: T[], random: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Builds the next batch of up to 10 cards. */
export function buildBatch(input: FeedInput): FeedItem[] {
  const random = input.random ?? Math.random;
  const today = input.today ?? new Date();
  const savedSectors = new Map<Sector, string>();
  for (const s of input.saved) if (!savedSectors.has(s.sector)) savedSectors.set(s.sector, s.symbol);

  const eligible = input.universe.filter((s) => passesFilters(s, input.filters, input.markets, today));
  // Prefer unseen stocks; once everything has been seen, start again.
  const unseen = eligible.filter((s) => !input.seen.has(stockId(s)));
  const pool = shuffle(unseen.length ? unseen : eligible, random);

  const used = new Set<StockId>();
  const take = (bucket: Bucket): FeedItem | null => {
    for (const s of pool) {
      const id = stockId(s);
      if (used.has(id)) continue;
      let reason: string | null = null;
      if (bucket === 'liked') reason = likedReason(s, input.interests, savedSectors);
      else if (bucket === 'news') reason = newsReason(s);
      else if (!likedReason(s, input.interests, savedSectors)) reason = `Something different: ${s.sector}`;
      if (reason) {
        used.add(id);
        return { id, stock: s, bucket, reason };
      }
    }
    return null;
  };
  // When a bucket runs dry, take any remaining stock with the best reason it has.
  const takeAny = (): FeedItem | null => {
    const s = pool.find((p) => !used.has(stockId(p)));
    if (!s) return null;
    const id = stockId(s);
    used.add(id);
    const liked = likedReason(s, input.interests, savedSectors);
    if (liked) return { id, stock: s, bucket: 'liked', reason: liked };
    const news = newsReason(s);
    if (news) return { id, stock: s, bucket: 'news', reason: news };
    return { id, stock: s, bucket: 'wildcard', reason: `Something different: ${s.sector}` };
  };

  const batch: FeedItem[] = [];
  for (const bucket of PATTERN) {
    const item = take(bucket) ?? takeAny();
    if (item) batch.push(item);
  }
  return batch;
}
