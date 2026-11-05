// Reads real stock data from our Supabase database through its REST API, with
// the public read-only key. The daily sync job (jobs/sync) fills the tables.
import type { MarketDataProvider } from '../provider';
import type { ChartRange, Market, PricePoint, StockId } from '../types';
import { CARD_COLUMNS, rowToSummary, type CardRow, type PriceRow } from './rows';

/** The REST API returns at most this many rows per request. */
export const PAGE_SIZE = 1000;

const RANGE_DAYS: Record<ChartRange, number> = { '1M': 31, '6M': 183, '1Y': 366 };

/** A quoted value for a PostgREST `in.(...)` list. Ids contain ':' so they must be quoted. */
const quoted = (v: string) => `"${v.replace(/"/g, '')}"`;

export function createSupabaseProvider(
  baseUrl: string,
  anonKey: string,
  fetchFn: typeof fetch = (...args) => fetch(...args),
  today: () => Date = () => new Date(),
): MarketDataProvider {
  const root = `${baseUrl.replace(/\/+$/, '')}/rest/v1`;
  const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };

  async function get<T>(path: string, range?: [number, number]): Promise<T[]> {
    const res = await fetchFn(`${root}/${path}`, {
      headers: range ? { ...headers, Range: `${range[0]}-${range[1]}` } : headers,
    });
    if (!res.ok) throw new Error(`Stock data request failed (${res.status})`);
    return (await res.json()) as T[];
  }

  async function getAll<T>(path: string): Promise<T[]> {
    const out: T[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      const page = await get<T>(path, [from, from + PAGE_SIZE - 1]);
      out.push(...page);
      if (page.length < PAGE_SIZE) return out;
    }
  }

  return {
    markets: ['US', 'SGX'],

    async listUniverse(markets: Market[]) {
      if (!markets.length) return [];
      const rows = await getAll<CardRow>(
        `stocks?select=${CARD_COLUMNS.join(',')}&market=in.(${markets.join(',')})` +
          '&price=not.is.null&sector=not.is.null&order=id',
      );
      return rows.map(rowToSummary);
    },

    async getStock(id: StockId) {
      const [row] = await get<CardRow>(`stocks?select=*&id=eq.${encodeURIComponent(id)}`);
      return row && row.price != null ? rowToSummary(row) : null;
    },

    async getHistory(id: StockId, range: ChartRange): Promise<PricePoint[]> {
      const from = today();
      from.setDate(from.getDate() - RANGE_DAYS[range]);
      const rows = await get<PriceRow>(
        `daily_prices?select=date,close&stock_id=eq.${encodeURIComponent(id)}` +
          `&date=gte.${from.toISOString().slice(0, 10)}&order=date.asc`,
      );
      return rows.map((r) => ({ date: r.date, close: Number(r.close) }));
    },

    async getQuotes(ids: StockId[]) {
      if (!ids.length) return {};
      const list = encodeURIComponent(ids.map(quoted).join(','));
      const rows = await get<{ id: string; price: number | null; change_pct: number }>(
        `stocks?select=id,price,change_pct&id=in.(${list})`,
      );
      const out: Record<string, { price: number; changePct: number }> = {};
      for (const r of rows)
        if (r.price != null) out[r.id] = { price: Number(r.price), changePct: Number(r.change_pct) };
      return out;
    },
  };
}
