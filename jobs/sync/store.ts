// Writes stock rows to Supabase through its REST API (PostgREST) with the
// service role key. That key can write, so it lives only in GitHub secrets
// and is never in the app or the repo.
import type { Market } from '../../src/data/types';
import type { PriceRow, StockRow } from '../../src/data/live/rows';

export interface StockStore {
  listStocks(market: Market): Promise<StockRow[]>;
  upsertStocks(rows: StockRow[]): Promise<void>;
  upsertPrices(rows: PriceRow[]): Promise<void>;
  deleteStocks(ids: string[]): Promise<void>;
  deletePricesBefore(date: string): Promise<void>;
}

const PAGE = 1000;
const WRITE_CHUNK = 500;
const DELETE_CHUNK = 100;

const chunks = <T>(list: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, (i + 1) * size));

export function supabaseStore(baseUrl: string, serviceKey: string, fetchFn: typeof fetch = fetch): StockStore {
  const root = `${baseUrl.replace(/\/+$/, '')}/rest/v1`;
  const auth = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };

  async function call(method: string, path: string, init: { body?: unknown; headers?: Record<string, string> } = {}) {
    const res = await fetchFn(`${root}/${path}`, {
      method,
      headers: { ...auth, 'Content-Type': 'application/json', ...init.headers },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
    if (!res.ok)
      throw new Error(`Supabase ${method} ${path.split('?')[0]} failed (${res.status}): ${await res.text()}`);
    return res;
  }

  const upsert = async (table: string, rows: object[]) => {
    for (const part of chunks(rows, WRITE_CHUNK))
      await call('POST', table, { body: part, headers: { Prefer: 'resolution=merge-duplicates,return=minimal' } });
  };

  return {
    async listStocks(market) {
      const out: StockRow[] = [];
      for (let from = 0; ; from += PAGE) {
        const res = await call('GET', `stocks?select=*&market=eq.${market}&order=id`, {
          headers: { Range: `${from}-${from + PAGE - 1}` },
        });
        const page = (await res.json()) as StockRow[];
        out.push(...page);
        if (page.length < PAGE) return out;
      }
    },
    upsertStocks: (rows) => upsert('stocks', rows),
    upsertPrices: (rows) => upsert('daily_prices', rows),
    async deleteStocks(ids) {
      for (const part of chunks(ids, DELETE_CHUNK)) {
        const list = encodeURIComponent(part.map((id) => `"${id}"`).join(','));
        await call('DELETE', `stocks?id=in.(${list})`);
      }
    },
    async deletePricesBefore(date) {
      await call('DELETE', `daily_prices?date=lt.${date}`);
    },
  };
}
