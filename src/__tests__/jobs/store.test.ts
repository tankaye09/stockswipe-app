import { supabaseStore } from '../../../jobs/sync/store';
import type { StockRow } from '../../data/live/rows';

type Call = { url: string; init: RequestInit };

function fakeFetch(responses: { status?: number; body?: unknown }[] = []) {
  const calls: Call[] = [];
  const fn = jest.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const r = responses.shift() ?? {};
    const status = r.status ?? 200;
    return {
      ok: status < 400,
      status,
      json: async () => r.body ?? [],
      text: async () => JSON.stringify(r.body ?? ''),
    };
  });
  return { fn: fn as unknown as typeof fetch, calls };
}

const row = (id: string) => ({ id }) as StockRow;

describe('supabaseStore', () => {
  it('pages through stocks with the service key', async () => {
    const full = Array.from({ length: 1000 }, (_, i) => row(`US:S${i}`));
    const { fn, calls } = fakeFetch([{ body: full }, { body: [row('US:LAST')] }]);
    const store = supabaseStore('https://db.example.co/', 'service-key', fn);
    const rows = await store.listStocks('US');
    expect(rows).toHaveLength(1001);
    expect(calls[0].url).toBe('https://db.example.co/rest/v1/stocks?select=*&market=eq.US&order=id');
    expect(calls[0].init.headers).toMatchObject({
      apikey: 'service-key',
      Authorization: 'Bearer service-key',
      Range: '0-999',
    });
    expect((calls[1].init.headers as Record<string, string>).Range).toBe('1000-1999');
  });

  it('upserts in chunks and merges duplicates', async () => {
    const { fn, calls } = fakeFetch();
    const store = supabaseStore('https://db.example.co', 'k', fn);
    await store.upsertStocks(Array.from({ length: 501 }, (_, i) => row(`US:S${i}`)));
    await store.upsertPrices([{ stock_id: 'US:A', date: '2026-11-04', close: 1 }]);
    expect(calls.map((c) => [c.init.method, c.url])).toEqual([
      ['POST', 'https://db.example.co/rest/v1/stocks'],
      ['POST', 'https://db.example.co/rest/v1/stocks'],
      ['POST', 'https://db.example.co/rest/v1/daily_prices'],
    ]);
    expect(JSON.parse(calls[0].init.body as string)).toHaveLength(500);
    expect(calls[0].init.headers).toMatchObject({ Prefer: 'resolution=merge-duplicates,return=minimal' });
  });

  it('deletes stocks by quoted id and old prices by date', async () => {
    const { fn, calls } = fakeFetch();
    const store = supabaseStore('https://db.example.co', 'k', fn);
    await store.deleteStocks(['SGX:D05', 'US:OLD']);
    await store.deletePricesBefore('2025-10-01');
    expect(calls[0].init.method).toBe('DELETE');
    expect(decodeURIComponent(calls[0].url)).toBe('https://db.example.co/rest/v1/stocks?id=in.("SGX:D05","US:OLD")');
    expect(calls[0].init.body).toBeUndefined();
    expect(calls[1].url).toBe('https://db.example.co/rest/v1/daily_prices?date=lt.2025-10-01');
  });

  it('reports a failed request', async () => {
    const { fn } = fakeFetch([{ status: 401, body: { message: 'bad key' } }]);
    await expect(supabaseStore('https://db.example.co', 'k', fn).upsertPrices([])).resolves.toBeUndefined();
    await expect(supabaseStore('https://db.example.co', 'k', fn).deletePricesBefore('2025-01-01')).rejects.toThrow(
      'Supabase DELETE daily_prices failed (401): {"message":"bad key"}',
    );
  });
});
