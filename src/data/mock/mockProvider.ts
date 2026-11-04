import type { MarketDataProvider } from '../provider';
import { stockId, type ChartRange, type Market, type PricePoint, type StockId } from '../types';
import { SAMPLE_STOCKS } from './stocks';

const RANGE_DAYS: Record<ChartRange, number> = { '1M': 22, '6M': 126, '1Y': 252 };

/** Small deterministic random generator so each stock's chart is stable. */
function seededRandom(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Random walk that ends exactly at today's price. */
function makeHistory(id: string, lastPrice: number, days: number): PricePoint[] {
  const rand = seededRandom(id);
  const steps: number[] = [];
  for (let i = 0; i < 252; i++) steps.push((rand() - 0.48) * 0.04);
  const used = steps.slice(-days);
  const points: PricePoint[] = [];
  let price = lastPrice;
  const date = new Date();
  for (let i = used.length - 1; i >= 0; i--) {
    points.unshift({ date: date.toISOString().slice(0, 10), close: +price.toFixed(2) });
    price = price / (1 + used[i]);
    date.setDate(date.getDate() - (date.getDay() === 1 ? 3 : 1));
  }
  return points;
}

const byId = new Map(SAMPLE_STOCKS.map((s) => [stockId(s), s]));

const delay = <T>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 60));

export const mockProvider: MarketDataProvider = {
  markets: ['US', 'SGX'],
  listUniverse: (markets: Market[]) => delay(SAMPLE_STOCKS.filter((s) => markets.includes(s.market))),
  getStock: (id: StockId) => delay(byId.get(id) ?? null),
  getHistory: (id: StockId, range: ChartRange) => {
    const s = byId.get(id);
    return delay(s ? makeHistory(id, s.price, RANGE_DAYS[range]) : []);
  },
  getQuotes: (ids: StockId[]) => {
    const out: Record<string, { price: number; changePct: number }> = {};
    for (const id of ids) {
      const s = byId.get(id);
      if (s) out[id] = { price: s.price, changePct: s.changePct };
    }
    return delay(out);
  },
};
